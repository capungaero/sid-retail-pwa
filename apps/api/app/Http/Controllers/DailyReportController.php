<?php
namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class DailyReportController
{
    // GET /reports/daily?date=yyyy-mm-dd (defaults to today). Per-payment-method revenue recap
    // for a single day. Joins that day's legacy `penjualan` rows to app_sale_payments (grouped
    // by method). Sales that predate this feature (no app_sale_payments row) are bucketed as
    // "Lainnya / tidak tercatat" so byMethod always reconciles with the day's raw sales sum —
    // totalRevenue is the actual sum of the day's sales, not just the recorded method rows.
    // A kas keluar (Keuangan) entry funded "dari transaksi harian" is also netted out of both
    // totalRevenue and the cash-type method's bucket, since that cash physically left today's
    // takings — see the funding-source block below. "Dari kas pinjaman" entries are NOT netted
    // here (they're drawn from the overall pool, not today's own sales).
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate(['date' => 'nullable|date_format:Y-m-d']);
        $date = $data['date'] ?? now()->toDateString();

        $saleTable = config('sid.sale.table'); $sc = config('sid.sale.columns');

        $sales = DB::table($saleTable)->whereDate($sc['date'], $date)
            ->get([$sc['id'] . ' as id', $sc['total'] . ' as total']);

        if ($sales->isEmpty()) {
            return response()->json(['date' => $date, 'totalRevenue' => 0.0, 'transactionCount' => 0, 'byMethod' => []]);
        }

        $saleIds = $sales->pluck('id')->all();

        // A Tukar barang exchange books its replacement as its own new invoice, so a raw row
        // count reads one customer visit as two transactions — exclude any of the day's sales
        // that are themselves the new-invoice side of an exchange (its origin already counts).
        $exchangeNewInvoices = DB::table('app_sale_exchanges')->whereIn('new_invoice', $saleIds)->pluck('new_invoice');
        $transactionCount = $sales->count() - $exchangeNewInvoices->unique()->count();

        // Lines this day's sales later gave up via Tukar barang — subtract so a returned line's
        // revenue isn't still counted here on top of the replacement item's own new invoice.
        $exchangedOutBySale = DB::table('app_sale_exchanges')->whereIn('old_invoice', $saleIds)
            ->selectRaw('old_invoice, SUM(old_line_value) as amount')->groupBy('old_invoice')->pluck('amount', 'old_invoice');
        $netTotal = fn ($sale) => (float) $sale->total - (float) ($exchangedOutBySale->get($sale->id) ?? 0);
        $totalRevenue = (float) $sales->sum($netTotal);

        // Payment rows for this day's sales, grouped by method (snapshot name).
        $payments = DB::table('app_sale_payments')
            ->whereIn('sale_id', $saleIds)
            ->selectRaw('method_code, method_name, COUNT(*) as cnt, SUM(amount) as amount')
            ->groupBy('method_code', 'method_name')
            ->get();

        $byMethod = $payments->map(fn ($p) => [
            'methodCode' => (string) $p->method_code,
            'methodName' => (string) $p->method_name,
            'count' => (int) $p->cnt,
            'amount' => (float) $p->amount,
        ])->values()->all();

        // Sales with no recorded payment row → bucket so the day still reconciles.
        $trackedSaleIds = DB::table('app_sale_payments')->whereIn('sale_id', $saleIds)
            ->distinct()->pluck('sale_id')->all();
        $trackedSet = array_flip($trackedSaleIds);
        $untracked = $sales->filter(fn ($s) => !isset($trackedSet[$s->id]));
        if ($untracked->isNotEmpty()) {
            $byMethod[] = [
                'methodCode' => '__untracked__',
                'methodName' => 'Lainnya / tidak tercatat',
                'count' => $untracked->count(),
                'amount' => (float) $untracked->sum($netTotal),
            ];
        }

        // Kas keluar entries whose sumber dana is "dari transaksi harian" are physically pulled
        // out of that day's own cash takings - net them out of the day's revenue and its cash
        // bucket, or Rekap harian keeps showing the full sale total as if nothing left the till.
        $cashTable = config('sid.cash_ledger.table'); $cc = config('sid.cash_ledger.columns');
        // Both a kas keluar funded 'daily' AND a kas masuk deposited from 'daily' leave today's
        // till. The deposit has no cashier_name (that column is set only on the daily-DRAW's paired
        // offset row, which is NOT a real withdrawal and must stay excluded here).
        $drawnFromDaily = (float) DB::table($cashTable)
            ->join('app_cash_entry_funding', "$cashTable.{$cc['id']}", '=', 'app_cash_entry_funding.ledger_id')
            ->where("$cashTable.{$cc['date']}", $date)
            ->where(function ($q) use ($cashTable, $cc) {
                $q->where(function ($q2) use ($cashTable, $cc) {
                    $q2->where("$cashTable.{$cc['direction']}", 'out')->where('app_cash_entry_funding.funding_source', 'daily');
                })->orWhere(function ($q2) use ($cashTable, $cc) {
                    $q2->where("$cashTable.{$cc['direction']}", 'in')->where('app_cash_entry_funding.cash_source', 'daily')->whereNull('app_cash_entry_funding.cashier_name');
                });
            })
            ->sum("$cashTable.{$cc['amount']}");
        if ($drawnFromDaily > 0) {
            $totalRevenue -= $drawnFromDaily;
            $cashMethod = DB::table('app_payment_methods')->where('type', 'cash')->first();
            if ($cashMethod) {
                $idx = null;
                foreach ($byMethod as $i => $m) { if ($m['methodCode'] === $cashMethod->code) { $idx = $i; break; } }
                if ($idx !== null) $byMethod[$idx]['amount'] -= $drawnFromDaily;
                else $byMethod[] = ['methodCode' => $cashMethod->code, 'methodName' => $cashMethod->name, 'count' => 0, 'amount' => -$drawnFromDaily];
            }
        }

        // Largest contribution first.
        usort($byMethod, fn ($a, $b) => $b['amount'] <=> $a['amount']);

        return response()->json([
            'date' => $date,
            'totalRevenue' => $totalRevenue,
            'transactionCount' => $transactionCount,
            'byMethod' => $byMethod,
        ]);
    }
}
