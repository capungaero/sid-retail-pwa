<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table. Per database/legacy-migration/README.md: "Tabel karyawan hanya
    // memiliki jam masuk/keluar sebagai atribut master. Belum ada tabel kejadian
    // absensi harian yang layak untuk laporan HRD" — this is that daily attendance
    // event table. status is computed server-side (see AttendanceController), never
    // trusted from the client.
    public function up(): void
    {
        Schema::create('hr_attendance', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 40);
            $table->date('date');
            $table->time('check_in');
            $table->time('check_out')->nullable();
            $table->enum('status', ['hadir', 'telat', 'pulang-cepat']);
            $table->timestamps();
            $table->unique(['employee_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_attendance');
    }
};
