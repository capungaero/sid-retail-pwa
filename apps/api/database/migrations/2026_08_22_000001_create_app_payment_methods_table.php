<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (not one of the 137 legacy tables). Legacy tracked WHICH cash/bank account
    // received the money via penjualan.kode_kas -> kas.kode, never a clean "payment method"
    // column. This is the configurable payment-method catalogue for the new app; each method
    // optionally maps back to a kas.kode (legacy_kas_code) so the legacy app stays compatible.
    public function up(): void
    {
        Schema::create('app_payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name', 100);
            $table->enum('type', ['cash', 'credit', 'transfer', 'qris', 'other']);
            $table->string('legacy_kas_code', 15)->nullable(); // optional map to kas.kode
            $table->boolean('active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed the 4 defaults idempotently. CASH maps to 'KT' (KAS TOKO) — the store's main
        // cash account in the kas table; the rest have no obvious legacy account, left null.
        $now = now();
        DB::table('app_payment_methods')->insertOrIgnore([
            ['code' => 'CASH', 'name' => 'Tunai', 'type' => 'cash', 'legacy_kas_code' => 'KT', 'active' => true, 'sort_order' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'CREDIT', 'name' => 'Kartu Kredit', 'type' => 'credit', 'legacy_kas_code' => null, 'active' => true, 'sort_order' => 2, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'TRANSFER', 'name' => 'Transfer', 'type' => 'transfer', 'legacy_kas_code' => null, 'active' => true, 'sort_order' => 3, 'created_at' => $now, 'updated_at' => $now],
            ['code' => 'QRIS', 'name' => 'QRIS', 'type' => 'qris', 'legacy_kas_code' => null, 'active' => true, 'sort_order' => 4, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // app_audit_log.action is a strict enum; extend it so PaymentMethodController can log
        // create/update/delete under a dedicated 'payment-method-update' action (mirrors the
        // AuditAction union on the frontend). app_audit_log is a new app_ table, not legacy.
        DB::statement("ALTER TABLE app_audit_log MODIFY action ENUM('store-profile-update','user-account-update','printer-config-update','backup','sale','purchase-order','attendance','test-print','payment-method-update') NOT NULL");
    }

    public function down(): void
    {
        DB::table('app_audit_log')->where('action', 'payment-method-update')->delete();
        DB::statement("ALTER TABLE app_audit_log MODIFY action ENUM('store-profile-update','user-account-update','printer-config-update','backup','sale','purchase-order','attendance','test-print') NOT NULL");
        Schema::dropIfExists('app_payment_methods');
    }
};
