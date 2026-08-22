<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not one of the 137 legacy tables). One row per payment applied to a sale.
    // v1 writes exactly one row per sale (single payment method), but the schema deliberately
    // allows multiple rows per sale_id so split payment can be added later without a redo.
    // sale_id is the invoice value (penjualan.kode) — NOT a DB foreign key to legacy.
    // method_name is a denormalized snapshot so historical recaps stay stable even if a
    // payment method is later renamed or deleted from app_payment_methods.
    public function up(): void
    {
        Schema::create('app_sale_payments', function (Blueprint $table) {
            $table->id();
            $table->string('sale_id', 64);
            $table->string('method_code', 32);
            $table->string('method_name', 100);
            $table->decimal('amount', 30, 2);
            $table->string('reference', 64)->nullable();
            $table->dateTime('created_at', 6);
            $table->index('sale_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_sale_payments');
    }
};
