<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Inter-branch transfers (HQ dashboard) write the same unified stock-movement feed as
    // receipts/returns/adjustments: 'transfer-out' (negative qty, source branch) and
    // 'transfer-in' (positive qty, destination branch). MariaDB can't widen an ENUM through the
    // schema builder — raw MODIFY, same pattern as the cash-entry funding-source widening.
    public function up(): void
    {
        DB::statement("ALTER TABLE app_stock_movements MODIFY type ENUM('purchase-receipt','purchase-return','sales-return','adjustment','transfer-out','transfer-in') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE app_stock_movements MODIFY type ENUM('purchase-receipt','purchase-return','sales-return','adjustment') NOT NULL");
    }
};
