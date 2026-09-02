<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Tells the two kinds of hutang pinjaman apart:
    //  - 'draw'  : booked by a kas KELUAR "dari Saldo Akumulasi Toko" - spends the pool, links to a
    //              debt, but no longer nets Penjualan (see reports.ts).
    //  - 'inflow': booked by a kas MASUK "dari Saldo Akumulasi Toko" - realises accumulated profit
    //              into spendable cash and nets Penjualan by its OUTSTANDING amount, so repaying the
    //              debt (Pelunasan Pinjaman) restores Penjualan precisely, per loan.
    // Existing rows are all draws, so 'draw' is the default/backfill.
    public function up(): void
    {
        Schema::table('app_loan_payables', function (Blueprint $table) {
            $table->string('origin', 10)->default('draw')->after('ledger_id');
        });
    }

    public function down(): void
    {
        Schema::table('app_loan_payables', function (Blueprint $table) {
            $table->dropColumn('origin');
        });
    }
};
