<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table. employee_id stores legacy karyawan.kode as a plain string (no FK
    // into the legacy schema, consistent with app_password_upgrades.legacy_identity).
    public function up(): void
    {
        Schema::create('hr_shift_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 40);
            $table->foreignId('shift_id')->constrained('hr_shifts');
            $table->date('date');
            $table->timestamps();
            $table->unique(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_shift_assignments');
    }
};
