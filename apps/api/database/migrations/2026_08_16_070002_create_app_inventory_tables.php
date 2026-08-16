<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New tables (not legacy).
    // - app_stock_movements: unified audit trail for the Persediaan module. Purchase receipts,
    //   stock corrections (koreksi) and stock adjustments all write to their own legacy tables,
    //   which have incompatible shapes; this table gives GET /stock-movements one consistent feed.
    // - app_return_documents / app_return_lines: the legacy DB has return_pembelian / return_penjualan,
    //   but return_pembelian has no header table (each row is a single item, not a multi-line
    //   document) so it can't cleanly represent ReturnDoc { lines: ReturnLine[] } for purchase
    //   returns. Using one new pair for both return kinds keeps purchase/sales returns symmetric.
    public function up(): void
    {
        Schema::create('app_stock_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('product_id', 25);
            $table->string('product_name', 50);
            $table->enum('type', ['purchase-receipt', 'purchase-return', 'sales-return', 'adjustment']);
            $table->decimal('qty', 30, 2);
            $table->string('reference', 25);
            $table->string('note')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index('product_id');
        });

        Schema::create('app_return_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference', 25)->unique();
            $table->enum('kind', ['purchase', 'sales']);
            $table->string('ref_label', 100);
            $table->string('reason');
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('app_return_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('return_document_id');
            $table->string('product_id', 25);
            $table->string('product_name', 50);
            $table->string('unit', 25);
            $table->decimal('qty', 30, 2);
            $table->decimal('price', 30, 2);
            $table->foreign('return_document_id')->references('id')->on('app_return_documents')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_return_lines');
        Schema::dropIfExists('app_return_documents');
        Schema::dropIfExists('app_stock_movements');
    }
};
