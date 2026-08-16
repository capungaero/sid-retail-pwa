<?php
namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

// Writes to app_audit_log (see migration 2026_08_16_070030). Called inline by every mutating
// Pengaturan endpoint to satisfy the "Audit edit, hapus, retur, pembatalan, dan cetak ulang"
// requirement. Best-effort, not wrapped in the caller's DB transaction.
final class AuditLogger
{
    public static function log(string $action, string $description, string $actor = 'system'): void
    {
        DB::table('app_audit_log')->insert([
            'id' => (string) Str::uuid(), 'action' => $action, 'description' => $description,
            'actor' => $actor, 'created_at' => now(),
        ]);
    }
}
