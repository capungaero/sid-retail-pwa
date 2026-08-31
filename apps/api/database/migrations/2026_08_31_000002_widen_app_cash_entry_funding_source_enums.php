<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Both directions' sumber dana pickers gained the same four physical-cash-pool tags (Kas
    // Kasir / Kas Kecil / Kas Dalam Perjalanan / Kas Bank) alongside kas keluar's existing
    // 'daily'/'loan'. Only 'daily' carries any special behaviour (cashier attribution + revenue
    // netting) - the rest are plain tags, so they're just more enum values on the same columns.
    public function up(): void
    {
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY funding_source ENUM('daily','loan','cashier','petty','in_transit','bank') NULL");
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY cash_source ENUM('cashier','petty','in_transit','bank') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY funding_source ENUM('daily','loan') NULL");
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY cash_source ENUM('petty','in_transit','bank') NULL");
    }
};
