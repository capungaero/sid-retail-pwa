<?php
namespace App\Http\Controllers;

use App\Models\AppAuditLog;
use Illuminate\Http\JsonResponse;

final class AuditLogController
{
    public function __invoke(): JsonResponse
    {
        $rows = AppAuditLog::orderByDesc('created_at')->limit(200)->get();
        return response()->json($rows->map(fn (AppAuditLog $r) => [
            'id' => (string) $r->id, 'action' => $r->action, 'description' => $r->description,
            'actor' => $r->actor, 'createdAt' => (string) $r->created_at,
        ]));
    }
}
