<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Generic replay protection for mutating endpoints added this phase (stock-adjustments,
    // cash-entries, payable/receivable payments, returns, payment-instrument creation), keyed on
    // a client-supplied Idempotency-Key header — same purpose as app_idempotency_keys
    // (SaleController) but not tied to invoice/total, since these endpoints don't all produce an
    // invoice. See App\Support\Idempotency.
    public function up(): void
    {
        Schema::create('app_request_idempotency', function (Blueprint $table) {
            $table->char('idempotency_key', 36)->primary();
            $table->string('endpoint', 64);
            $table->json('response');
            $table->dateTime('created_at', 6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_request_idempotency');
    }
};
