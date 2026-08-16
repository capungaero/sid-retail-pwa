<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not one of the 137 legacy tables). No legacy equivalent exists for card/
    // voucher/giro payment instruments as a standalone trackable entity — pembelian's
    // visa/nomor_visa/nama_visa columns are for purchases, not this. See PaymentInstrumentController.
    public function up(): void
    {
        Schema::create('app_payment_instruments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kind', 16); // card | voucher | giro
            $table->string('reference', 64);
            $table->decimal('amount', 30, 2);
            $table->string('status', 16)->default('pending'); // pending | cleared | bounced
            $table->string('note', 255)->nullable();
            $table->dateTime('created_at', 6);
            $table->dateTime('cleared_at', 6)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_payment_instruments');
    }
};
