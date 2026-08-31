<?php
namespace App\Http\Controllers;

use App\Models\AppUserSetting;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class AuthController
{
    // Two identity sources, tried in order: legacy `karyawan` first (the original, larger
    // roster), then app_user_settings (accounts created via Pengaturan > Pengguna). A username
    // that happens to exist in both is unlikely (different tables/creation flows) but karyawan
    // wins if it ever does — matches this app's existing behaviour before app_user_settings
    // could log in at all.
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['username' => 'required|string|max:40', 'password' => 'required|string']);

        $result = $this->loginLegacyEmployee($data['username'], $data['password'])
            ?? $this->loginAppUser($data['username'], $data['password']);

        if (!$result) {
            return response()->json(['message' => 'Username atau password salah.'], 401);
        }

        return response()->json($result);
    }

    // Legacy karyawan.password is MD5 (32 hex chars, verified against real sample data).
    // First successful legacy verification upgrades the identity to Argon2id in
    // app_password_upgrades, checked first on every later login (fast path, no MD5 needed).
    // But karyawan.password can still be changed by something outside this app (a legacy
    // back-office tool, a direct DB edit) — if that happens, the cached upgrade hash goes
    // stale and the account's real, current password stops working here with no way to
    // detect or recover short of manually deleting the row. So a cache miss falls back to a
    // fresh legacy check before giving up, and re-upgrades the cache if THAT succeeds —
    // whichever password is actually live in karyawan.password always works.
    private function loginLegacyEmployee(string $username, string $password): ?array
    {
        $table = config('sid.auth.table');
        $c = config('sid.auth.columns');

        $row = DB::table($table)->where($c['id'], $username)->first();
        if (!$row) return null;

        $upgraded = DB::table('app_password_upgrades')->where('legacy_identity', $username)->first();
        $verified = $upgraded && Hash::check($password, $upgraded->password_hash);
        if (!$verified) {
            $verified = hash_equals((string) $row->{$c['password']}, md5($password));
            if ($verified) {
                DB::table('app_password_upgrades')->updateOrInsert(
                    ['legacy_identity' => $username],
                    ['password_hash' => Hash::make($password), 'upgraded_at' => now()]
                );
            }
        }
        if (!$verified) return null;

        // Translate the employee's legacy karyawan.level into a Pengaturan role — see
        // config/sid.php's level_role_map comment for the ADM/MGG/KTR/KS reasoning.
        $levelMap = config('sid.auth.level_role_map', []);
        $defaultRole = config('sid.auth.default_role', 'kasir');
        $role = $levelMap[(string) $row->{$c['role']}] ?? $defaultRole;

        $permissions = $this->permissionsFor($role);
        $employee = Employee::find($username);
        $token = $employee->createToken('pos', $this->abilitiesForPermissions($permissions))->plainTextToken;

        return ['token' => $token, 'user' => ['id' => $row->{$c['id']}, 'name' => $row->{$c['name']}, 'role' => $row->{$c['role']}, 'permissions' => $permissions]];
    }

    private function loginAppUser(string $username, string $password): ?array
    {
        $user = AppUserSetting::where('username', $username)->where('active', true)->first();
        if (!$user || !$user->password_hash || !Hash::check($password, $user->password_hash)) return null;

        // Already a Pengaturan role key (kasir/supervisor/admin) — no level map needed here.
        $permissions = $this->permissionsFor($user->role);
        $token = $user->createToken('pos', $this->abilitiesForPermissions($permissions))->plainTextToken;

        return ['token' => $token, 'user' => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role, 'permissions' => $permissions]];
    }

    // The role's stored PermissionKey[] from Pengaturan > "Hak akses per peran" (app_role_
    // permissions). Returned to the frontend as part of the login response — not fetched
    // separately via GET /settings/role-permissions, because that route is itself gated
    // settings:read, which a kasir/supervisor token doesn't have: fetching a role's own
    // permissions to decide what to show them can't depend on a permission most roles don't
    // have, or the fetch 403s and the caller is left not knowing what it's even allowed to do.
    private function permissionsFor(string $role): array
    {
        if ($role === 'admin') {
            // Never let a misconfigured/emptied app_role_permissions row lock the admin
            // account out of its own settings screen — admin always gets everything.
            return array_keys(config('sid.auth.permission_abilities', []));
        }
        $permissions = DB::table('app_role_permissions')->where('role', $role)->value('permissions');
        return $permissions ? json_decode($permissions, true) : [];
    }

    // Role-permission enforcement: map the role's granted PermissionKey[] to the matching
    // Sanctum ability strings — instead of the fixed full-access list every login used to
    // receive regardless of role or the "Hak akses per peran" screen.
    private function abilitiesForPermissions(array $permissions): array
    {
        $abilityMap = config('sid.auth.permission_abilities', []);
        $abilities = [];
        foreach ($permissions as $key) {
            $abilities = array_merge($abilities, $abilityMap[$key] ?? []);
        }
        return array_values(array_unique($abilities));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'ok']);
    }
}
