<?php
namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

final class ReportSummaryController
{
    // GET /reports/summary?from=yyyy-mm-dd&to=yyyy-mm-dd — DailyReportController generalized to
    // a date range, built for the HQ dashboard so it never has to pull raw /sales pages just to
    // chart a period. Everything is aggregated in SQL (GROUP BY per day), and the three netting
    // rules are IDENTICAL to the daily report's, so summary?from=X&to=X must equal daily?date=X:
    //  (a) a Tukar-barang replacement invoice doesn't count as its own transaction;
    //  (b) lines a day's sales later gave up via exchange are subtracted from that day's revenue;
    //  (c) kas keluar funded "dari transaksi harian" is netted out of that day's revenue and the
    //      cash method's bucket.
    public function __invoke(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => 'required|date_format:Y-m-d',
            'to' => 'required|date_format:Y-m-d|after_or_equal:from',
        ]);
        $from = $data['from']; $to = $data['to'];
        if ((new \DateTimeImmutable($from))->diff(new \DateTimeImmutable($to))->days > 366) {
            return response()->json(['message' => 'Rentang maksimal 1 tahun.'], 422);
        }

        $saleTable = config('sid.sale.table'); $sc = config('sid.sale.columns');
        $dateCol = $sc['date']; $idCol = $sc['id']; $totalCol = $sc['total'];

        $salesPerDay = DB::table($saleTable)
            ->whereBetween($dateCol, [$from, $to])
            ->selectRaw("$dateCol as d, COUNT(*) as cnt, COALESCE(SUM($totalCol), 0) as total")
            ->groupBy('d')->orderBy('d')->get();

        // (a) replacement invoices per day — subtracted from the raw row count.
        $exchangeNewPerDay = DB::table('app_sale_exchanges as x')
            ->join("$saleTable as s", "s.$idCol", '=', 'x.new_invoice')
            ->whereBetween("s.$dateCol", [$from, $to])
            ->selectRaw("s.$dateCol as d, COUNT(DISTINCT x.new_invoice) as cnt")
            ->groupBy('d')->pluck('cnt', 'd');

        // (b) value each day's sales later gave up via exchange.
        $exchangedOutPerDay = DB::table('app_sale_exchanges as x')
            ->join("$saleTable as s", "s.$idCol", '=', 'x.old_invoice')
            ->whereBetween("s.$dateCol", [$from, $to])
            ->selectRaw("s.$dateCol as d, COALESCE(SUM(x.old_line_value), 0) as amount")
            ->groupBy('d')->pluck('amount', 'd');

        // (c) per-day "dari transaksi harian" draws.
        $cashTable = config('sid.cash_ledger.table'); $cc = config('sid.cash_ledger.columns');
        $drawnPerDay = DB::table($cashTable)
            ->join('app_cash_entry_funding', "$cashTable.{$cc['id']}", '=', 'app_cash_entry_funding.ledger_id')
            ->whereBetween("$cashTable.{$cc['date']}", [$from, $to])
            ->where("$cashTable.{$cc['direction']}", 'out')
            ->where('app_cash_entry_funding.funding_source', 'daily')
            ->selectRaw("$cashTable.{$cc['date']} as d, COALESCE(SUM($cashTable.{$cc['amount']}), 0) as amount")
            ->groupBy('d')->pluck('amount', 'd');

        $days = []; $totalRevenue = 0.0; $transactionCount = 0; $totalDrawn = 0.0;
        foreach ($salesPerDay as $row) {
            $day = (string) $row->d;
            $drawn = (float) ($drawnPerDay->get($day) ?? 0);
            $netRevenue = (float) $row->total - (float) ($exchangedOutPerDay->get($day) ?? 0) - $drawn;
            $count = (int) $row->cnt - (int) ($exchangeNewPerDay->get($day) ?? 0);
            $days[] = ['date' => $day, 'netRevenue' => $netRevenue, 'transactionCount' => $count, 'drawnFromDaily' => $drawn];
            $totalRevenue += $netRevenue; $transactionCount += $count; $totalDrawn += $drawn;
        }
        // A day with draws but no sales still moved cash — keep the period total honest and show
        // the day as a negative-revenue row rather than dropping it.
        foreach ($drawnPerDay as $day => $amount) {
            if (collect($days)->contains(fn ($d) => $d['date'] === (string) $day)) continue;
            $days[] = ['date' => (string) $day, 'netRevenue' => -(float) $amount, 'transactionCount' => 0, 'drawnFromDaily' => (float) $amount];
            $totalRevenue -= (float) $amount; $totalDrawn += (float) $amount;
        }
        usort($days, fn ($a, $b) => strcmp($a['date'], $b['date']));

        // Payment mix across the whole range, method_name snapshotted at checkout time.
        $payments = DB::table('app_sale_payments as pay')
            ->join("$saleTable as s", "s.$idCol", '=', 'pay.sale_id')
            ->whereBetween("s.$dateCol", [$from, $to])
            ->selectRaw('pay.method_code, pay.method_name, COUNT(*) as cnt, COALESCE(SUM(pay.amount), 0) as amount')
            ->groupBy('pay.method_code', 'pay.method_name')
            ->get();
        $byMethod = $payments->map(fn ($p) => [
            'methodCode' => (string) $p->method_code,
            'methodName' => (string) $p->method_name,
            'count' => (int) $p->cnt,
            'amount' => (float) $p->amount,
        ])->values()->all();

        // Sales with no payment row (pre-feature legacy data) — bucketed so byMethod reconciles
        // with the period total, net of anything those sales later exchanged away.
        $untracked = DB::table("$saleTable as s")
            ->leftJoin('app_sale_payments as pay', 'pay.sale_id', '=', "s.$idCol")
            ->whereNull('pay.id')
            ->whereBetween("s.$dateCol", [$from, $to])
            ->selectRaw("COUNT(DISTINCT s.$idCol) as cnt, COALESCE(SUM(s.$totalCol), 0) as total")
            ->first();
        if ($untracked && (int) $untracked->cnt > 0) {
            $untrackedExchanged = (float) DB::table('app_sale_exchanges as x')
                ->join("$saleTable as s", "s.$idCol", '=', 'x.old_invoice')
                ->leftJoin('app_sale_payments as pay', 'pay.sale_id', '=', "s.$idCol")
                ->whereNull('pay.id')
                ->whereBetween("s.$dateCol", [$from, $to])
                ->sum('x.old_line_value');
            $byMethod[] = [
                'methodCode' => '__untracked__',
                'methodName' => 'Lainnya / tidak tercatat',
                'count' => (int) $untracked->cnt,
                'amount' => (float) $untracked->total - $untrackedExchanged,
            ];
        }

        if ($totalDrawn > 0) {
            $cashMethod = DB::table('app_payment_methods')->where('type', 'cash')->first();
            if ($cashMethod) {
                $idx = null;
                foreach ($byMethod as $i => $m) { if ($m['methodCode'] === $cashMethod->code) { $idx = $i; break; } }
                if ($idx !== null) $byMethod[$idx]['amount'] -= $totalDrawn;
                else $byMethod[] = ['methodCode' => $cashMethod->code, 'methodName' => $cashMethod->name, 'count' => 0, 'amount' => -$totalDrawn];
            }
        }
        usort($byMethod, fn ($a, $b) => $b['amount'] <=> $a['amount']);

        return response()->json([
            'from' => $from,
            'to' => $to,
            'days' => $days,
            'byMethod' => $byMethod,
            'totalRevenue' => $totalRevenue,
            'transactionCount' => $transactionCount,
        ]);
    }
}
