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
