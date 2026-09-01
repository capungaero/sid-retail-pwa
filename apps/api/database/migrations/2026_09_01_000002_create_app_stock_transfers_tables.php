<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // One inter-branch transfer lives as TWO documents in TWO databases sharing a reference:
    // direction 'out' (status 'sent') in the source branch's DB, direction 'in' (status
    // 'received') in the destination's. Each branch only ever writes its own side; HQ
    // orchestrates the pair and reconciles by diffing out-docs without a matching in-doc.
    // unique(reference, direction) is the second idempotency layer (besides Idempotency-Key):
    // a retried leg can never book twice on the same side.
    public function up(): void
    {
        Schema::create('app_stock_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference', 30);
            $table->enum('direction', ['out', 'in']);
            $table->string('counterpart_branch_code', 20);
            $table->string('counterpart_branch_name', 50);
            $table->enum('status', ['sent', 'received']);
            $table->string('note')->nullable();
            $table->string('operator', 40)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->unique(['reference', 'direction']);
        });

        Schema::create('app_stock_transfer_lines', function (Blueprint $table) {
            $table->id();
            $table->uuid('transfer_id');
            $table->string('product_id', 25);
            $table->string('product_name', 50);
            $table->string('unit', 25);
            $table->decimal('qty', 30, 2);
            $table->foreign('transfer_id')->references('id')->on('app_stock_transfers')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_stock_transfer_lines');
        Schema::dropIfExists('app_stock_transfers');
    }
};
