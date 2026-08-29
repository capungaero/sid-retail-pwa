<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // mutasikas (Keuangan > Buku kas) is a legacy table with no spare column and no ALTER
    // privilege from the app's runtime DB user - see config/sid.php's repurposing convention.
    // For "kas keluar" entries only, this records where the cash physically came from: taken
    // straight from that day's takings, or drawn against the overall sales cash pool as a loan
    // to be paid back later. Keyed by the ledger row's own id (mutasikas.kode).
    public function up(): void
    {
        Schema::create('app_cash_entry_funding', function (Blueprint $table) {
            $table->string('ledger_id', 32)->primary();
            $table->enum('funding_source', ['daily', 'loan']);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_cash_entry_funding');
    }
};
