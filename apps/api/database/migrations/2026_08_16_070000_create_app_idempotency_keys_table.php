<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not one of the 137 legacy tables). Keyed on the client-supplied
    // UUID so a replayed POST /api/sales returns the original result instead of
    // re-executing — see SaleController.
    public function up(): void
    {
        Schema::create('app_idempotency_keys', function (Blueprint $table) {
            $table->char('idempotency_key', 36)->primary();
            $table->string('invoice', 25);
            $table->decimal('total', 30, 2);
            $table->dateTime('created_at', 6);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_idempotency_keys');
    }
};
