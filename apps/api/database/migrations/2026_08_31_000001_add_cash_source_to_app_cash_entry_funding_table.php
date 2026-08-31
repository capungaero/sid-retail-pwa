<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // A "kas masuk" entry now also gets a row here, tagging which cash pool the money landed in
    // (Kas Kecil / Kas Dalam Perjalanan / Kas Bank) - symmetric with the "kas keluar" funding
    // source/cashier already recorded. funding_source was NOT NULL because only 'out' entries
    // ever got a row before; it must go nullable so an 'in' row (cash_source set, funding_source
    // null) and an 'out' row (funding_source set, cash_source null) can share the same table.
    public function up(): void
    {
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY funding_source ENUM('daily','loan') NULL");
        DB::statement("ALTER TABLE app_cash_entry_funding ADD COLUMN cash_source ENUM('petty','in_transit','bank') NULL AFTER cashier_name");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE app_cash_entry_funding DROP COLUMN cash_source');
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY funding_source ENUM('daily','loan') NOT NULL");
    }
};
