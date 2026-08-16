<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not legacy). Locked with SELECT ... FOR UPDATE inside SaleController's
    // transaction to hand out an atomic, per-day invoice sequence number.
    public function up(): void
    {
        Schema::create('app_invoice_counters', function (Blueprint $table) {
            $table->date('counter_date')->primary();
            $table->unsignedInteger('last_seq')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_invoice_counters');
    }
};
