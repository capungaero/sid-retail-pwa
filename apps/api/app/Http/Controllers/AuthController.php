<?php
namespace App\Http\Controllers;

use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class AuthController
{
    // Legacy karyawan.password is MD5 (32 hex chars, verified against real sample data).
    // First successful legacy verification upgrades the identity to Argon2id in
    // app_password_upgrades; subsequent logins are checked there first and never
    // touch the legacy hash again.
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['username' => 'required|string|max:40', 'password' => 'required|string']);
        $table = config('sid.auth.table');
        $c = config('sid.auth.columns');

        $row = DB::table($table)->where($c['id'], $data['username'])->first();
        if (!$row) {
            return response()->json(['message' => 'Username atau password salah.'], 401);
        }

        $upgraded = DB::table('app_password_upgrades')->where('legacy_identity', $data['username'])->first();
        if ($upgraded) {
            $verified = Hash::check($data['password'], $upgraded->password_hash);
        } else {
            $verified = hash_equals((string) $row->{$c['password']}, md5($data['password']));
            if ($verified) {
                DB::table('app_password_upgrades')->updateOrInsert(
                    ['legacy_identity' => $data['username']],
                    ['password_hash' => Hash::make($data['password']), 'upgraded_at' => now()]
                );
            }
        }

        if (!$verified) {
            return response()->json(['message' => 'Username atau password salah.'], 401);
        }

        $employee = Employee::find($data['username']);

        // Role-permission enforcement: translate the employee's legacy karyawan.level into a
        // Pengaturan role, look up that role's stored PermissionKey[] in app_role_permissions,
        // and grant only the matching Sanctum abilities — instead of the fixed full-access list
        // every login used to receive regardless of role or the "Hak akses per peran" screen.
        $levelMap = config('sid.auth.level_role_map', []);
        $defaultRole = config('sid.auth.default_role', 'kasir');
        $role = $levelMap[(string) $row->{$c['role']}] ?? $defaultRole;

        $abilityMap = config('sid.auth.permission_abilities', []);
        if ($role === 'admin') {
            // Never let a misconfigured/emptied app_role_permissions row lock the admin
            // account out of its own settings screen — admin always gets everything.
            $abilities = array_values(array_unique(array_merge(...array_values($abilityMap))));
        } else {
            $permissions = DB::table('app_role_permissions')->where('role', $role)->value('permissions');
            $permissions = $permissions ? json_decode($permissions, true) : [];
            $abilities = [];
            foreach ($permissions as $key) {
                $abilities = array_merge($abilities, $abilityMap[$key] ?? []);
            }
            $abilities = array_values(array_unique($abilities));
        }

        $token = $employee->createToken('pos', $abilities)->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => ['id' => $row->{$c['id']}, 'name' => $row->{$c['name']}, 'role' => $row->{$c['role']}],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'ok']);
    }
}
