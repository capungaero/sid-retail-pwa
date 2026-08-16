<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Fixes a financial-correctness bug: itemhutang.kode_hutang / itempiutang.kode_piutang do
    // NOT reference hutang.kode / piutang.kode (verified empirically — they reference
    // pembelian.kode / penjualan.kode instead; itemhutang/itempiutang.kode is what actually
    // matches hutang.kode/piutang.kode, and itemhutang/itempiutang is invoice-composition data,
    // not a payment ledger). There is no legacy table with real payment/installment history for
    // hutang or piutang (mutasikas, pembayaran_angsuran, tabel_angsuran are all empty in
    // production). Per that finding, hutang.jumlah/piutang.jumlah are treated as fixed opening
    // balances as of migration, and only new payments made through this app are tracked, in
    // these new tables — see LegacyPayableRepository/LegacyReceivableRepository.
    public function up(): void
    {
        Schema::create('app_payable_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('payable_id', 25);
            $table->decimal('amount', 30, 2);
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('payable_id');
        });

        Schema::create('app_receivable_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('receivable_id', 25);
            $table->decimal('amount', 30, 2);
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('receivable_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_receivable_payments');
        Schema::dropIfExists('app_payable_payments');
    }
};
