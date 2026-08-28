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
    // app_password_upgrades; subsequent logins are checked there first and never
    // touch the legacy hash again.
    private function loginLegacyEmployee(string $username, string $password): ?array
    {
        $table = config('sid.auth.table');
        $c = config('sid.auth.columns');

        $row = DB::table($table)->where($c['id'], $username)->first();
        if (!$row) return null;

        $upgraded = DB::table('app_password_upgrades')->where('legacy_identity', $username)->first();
        if ($upgraded) {
            $verified = Hash::check($password, $upgraded->password_hash);
        } else {
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

        $employee = Employee::find($username);
        $token = $employee->createToken('pos', $this->abilitiesFor($role))->plainTextToken;

        return ['token' => $token, 'user' => ['id' => $row->{$c['id']}, 'name' => $row->{$c['name']}, 'role' => $row->{$c['role']}]];
    }

    private function loginAppUser(string $username, string $password): ?array
    {
        $user = AppUserSetting::where('username', $username)->where('active', true)->first();
        if (!$user || !$user->password_hash || !Hash::check($password, $user->password_hash)) return null;

        // Already a Pengaturan role key (kasir/supervisor/admin) — no level map needed here.
        $token = $user->createToken('pos', $this->abilitiesFor($user->role))->plainTextToken;

        return ['token' => $token, 'user' => ['id' => $user->id, 'name' => $user->name, 'role' => $user->role]];
    }

    // Role-permission enforcement: look up the role's stored PermissionKey[] in
    // app_role_permissions and grant only the matching Sanctum abilities — instead of the fixed
    // full-access list every login used to receive regardless of role or the "Hak akses per
    // peran" screen.
    private function abilitiesFor(string $role): array
    {
        $abilityMap = config('sid.auth.permission_abilities', []);
        if ($role === 'admin') {
            // Never let a misconfigured/emptied app_role_permissions row lock the admin
            // account out of its own settings screen — admin always gets everything.
            return array_values(array_unique(array_merge(...array_values($abilityMap))));
        }
        $permissions = DB::table('app_role_permissions')->where('role', $role)->value('permissions');
        $permissions = $permissions ? json_decode($permissions, true) : [];
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
