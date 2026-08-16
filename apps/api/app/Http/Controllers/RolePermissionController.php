<?php
namespace App\Http\Controllers;

use App\Models\AppRolePermission;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class RolePermissionController
{
    private const ROLES = ['kasir', 'supervisor', 'admin'];
    private const KEYS = ['pos', 'inventory', 'finance', 'reports', 'hrd', 'settings'];

    public function show(): JsonResponse
    { return response()->json($this->present()); }

    public function update(Request $request): JsonResponse
    {
        $rules = [];
        foreach (self::ROLES as $role) {
            $rules[$role] = 'required|array';
            $rules["$role.*"] = 'in:' . implode(',', self::KEYS);
        }
        $data = $request->validate($rules);
        foreach (self::ROLES as $role) {
            AppRolePermission::updateOrCreate(['role' => $role], ['permissions' => array_values(array_unique($data[$role]))]);
        }
        AuditLogger::log('user-account-update', 'Hak akses per peran diperbarui.', $request->user()?->nama ?? 'system');
        return response()->json($this->present());
    }

    private function present(): array
    {
        $rows = AppRolePermission::all()->keyBy('role');
        $out = [];
        foreach (self::ROLES as $role) $out[$role] = $rows[$role]->permissions ?? [];
        return $out;
    }
}
