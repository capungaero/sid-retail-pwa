<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not legacy). Records a "tukar barang" (exchange) — a customer who already paid
    // decides not to keep an item and swaps it for a different one instead. The original sale
    // (penjualan/itempenjualan) is left untouched as the audit trail; an exchange is its own new
    // sale for the replacement item, with the returned item's stock restored (via the same
    // app_stock_movements 'sales-return' entry the Retur screen already writes) and this row
    // linking the two invoices together for the history UI.
    public function up(): void
    {
        Schema::create('app_sale_exchanges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('old_invoice', 32);
            $table->string('new_invoice', 32);
            $table->string('old_product_id', 32);
            $table->string('old_product_name', 150);
            $table->string('old_unit', 32);
            $table->decimal('old_qty', 14, 2);
            $table->decimal('old_line_value', 14, 2);
            $table->string('new_product_id', 32);
            $table->string('new_product_name', 150);
            $table->string('new_unit', 32);
            $table->decimal('new_qty', 14, 2);
            $table->decimal('new_line_value', 14, 2);
            // new_line_value - old_line_value. Positive = customer paid extra (collected via
            // app_sale_payments on the new invoice); negative = store owes change (handed back
            // in cash at the register, not separately ledgered — same as normal Kembalian).
            $table->decimal('diff_amount', 14, 2);
            $table->string('reason', 100)->nullable();
            $table->string('operator', 50)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('old_invoice');
            $table->index('new_invoice');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_sale_exchanges');
    }
};
