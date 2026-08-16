<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // New table (izin/sakit/cuti/lembur requests). No legacy equivalent found.
    public function up(): void
    {
        Schema::create('hr_leave_requests', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id', 40);
            $table->enum('type', ['izin', 'sakit', 'cuti', 'lembur']);
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('hours', 6, 2)->nullable();
            $table->string('reason', 255)->nullable();
            $table->enum('status', ['diajukan', 'disetujui', 'ditolak'])->default('diajukan');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_leave_requests');
    }
};
