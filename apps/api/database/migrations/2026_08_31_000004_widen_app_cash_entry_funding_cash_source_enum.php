<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Kas masuk's sumber dana picker now mirrors kas keluar's full vocabulary (see CashInSource) -
    // 'daily'/'loan' are plain descriptive tags here, no netting/debt logic attached.
    public function up(): void
    {
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY cash_source ENUM('daily','loan','cashier','petty','in_transit','bank') NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE app_cash_entry_funding MODIFY cash_source ENUM('cashier','petty','in_transit','bank') NULL");
    }
};
