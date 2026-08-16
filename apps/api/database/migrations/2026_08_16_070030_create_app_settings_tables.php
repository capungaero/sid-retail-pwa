<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New tables for the Pengaturan (Settings) module — no legacy equivalents exist for any
    // of these (store profile, role-permission matrix, printer config, audit log). See the
    // app_user_settings comment below for the karyawan/UserAccount sourcing decision.
    public function up(): void
    {
        Schema::create('app_store_profile', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('address', 500);
            $table->string('phone', 20);
            $table->string('tax_id', 25)->nullable();
            $table->string('receipt_header', 255)->nullable();
            $table->string('receipt_footer', 255)->nullable();
            $table->timestamps();
        });

        // Deliberately NOT joined to legacy `karyawan`. The Pengaturan > Pengguna screen's
        // UserAccount contract (id/name/username/role/active — no password field) is fully
        // satisfied by this table alone. Keeping it standalone avoids writing settings-screen
        // rows into the table that backs real POS login, and keeps karyawan / Employee as the
        // sole source of truth for authentication (see AuthController). This table is purely
        // the admin-facing roster + role/active overlay for the Pengaturan screen.
        Schema::create('app_user_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->string('username', 50)->unique();
            $table->enum('role', ['kasir', 'supervisor', 'admin']);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('app_role_permissions', function (Blueprint $table) {
            $table->enum('role', ['kasir', 'supervisor', 'admin'])->primary();
            $table->json('permissions');
            $table->timestamps();
        });

        Schema::create('app_printer_config', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->enum('connection', ['usb', 'network', 'bluetooth']);
            $table->enum('paper_width', ['58mm', '80mm']);
            $table->timestamps();
        });

        Schema::create('app_audit_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('action', [
                'store-profile-update', 'user-account-update', 'printer-config-update',
                'backup', 'sale', 'purchase-order', 'attendance', 'test-print',
            ]);
            $table->string('description', 500);
            $table->string('actor', 100);
            $table->timestamp('created_at')->useCurrent();
            $table->index('created_at');
        });

        // Seed singleton rows + the full role set so the GET endpoints have sensible data
        // from the first request (store-profile and printer-config are true singletons;
        // role-permissions must always contain all three roles per the RolePermissions type).
        DB::table('app_store_profile')->insert([
            'name' => 'SID Retail', 'address' => 'Jl. Merdeka No. 1', 'phone' => '021-1234567',
            'tax_id' => null, 'receipt_header' => null, 'receipt_footer' => null,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('app_printer_config')->insert([
            'name' => 'Printer Kasir', 'connection' => 'usb', 'paper_width' => '58mm',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('app_role_permissions')->insert([
            ['role' => 'kasir', 'permissions' => json_encode(['pos']), 'created_at' => now(), 'updated_at' => now()],
            ['role' => 'supervisor', 'permissions' => json_encode(['pos', 'inventory', 'reports']), 'created_at' => now(), 'updated_at' => now()],
            ['role' => 'admin', 'permissions' => json_encode(['pos', 'inventory', 'finance', 'reports', 'hrd', 'settings']), 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('app_audit_log');
        Schema::dropIfExists('app_printer_config');
        Schema::dropIfExists('app_role_permissions');
        Schema::dropIfExists('app_user_settings');
        Schema::dropIfExists('app_store_profile');
    }
};
