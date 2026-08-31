<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // "Dari kas pinjaman" kas keluar draws are loans against the PREVIOUS day's already-closed
    // sales (today's till hasn't been counted yet) - each draw books a debt here (for_date = the
    // day it draws against), shown as "Hutang pinjaman" in Keuangan and repayable like a payable.
    // Laporan > Penjualan & pembelian nets only the OUTSTANDING amount (amount - payments) against
    // for_date, so a repayment restores that day's Penjualan figure - see reports.ts's
    // loanOutstandingDrawnTotal. No legacy table backs this; both tables are app-only.
    public function up(): void
    {
        Schema::create('app_loan_payables', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('ledger_id', 25);
            $table->decimal('amount', 30, 2);
            $table->date('for_date');
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('ledger_id');
            $table->index('for_date');
        });

        Schema::create('app_loan_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('loan_id');
            $table->decimal('amount', 30, 2);
            $table->string('note', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('loan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_loan_payments');
        Schema::dropIfExists('app_loan_payables');
    }
};
