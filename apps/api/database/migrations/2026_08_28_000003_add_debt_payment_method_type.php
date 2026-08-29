<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Adds 'debt' as a payment method type and seeds "Cashbon" — a debt sale is now selectable
    // as its own payment method (implies isDebt, no more relying on underpaying Tunai + a
    // checkbox to record a piutang). Raw ALTER, not the schema builder — sid_app has no ALTER
    // privilege (see migration 2026_08_28_000001's deploy notes), so this file's SQL is run
    // directly as sid_migrator and exists here for history/review.
    public function up(): void
    {
        DB::statement("ALTER TABLE app_payment_methods MODIFY type ENUM('cash','credit','transfer','qris','debt','other') NOT NULL");
        $now = now();
        DB::table('app_payment_methods')->insertOrIgnore([
            'code' => 'CASHBON', 'name' => 'Cashbon', 'type' => 'debt', 'legacy_kas_code' => null,
            'active' => true, 'sort_order' => 5, 'created_at' => $now, 'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        DB::table('app_payment_methods')->where('code', 'CASHBON')->delete();
        DB::statement("ALTER TABLE app_payment_methods MODIFY type ENUM('cash','credit','transfer','qris','other') NOT NULL");
    }
};
