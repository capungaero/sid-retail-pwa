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
        $token = $employee->createToken('pos', [
            'pos:read', 'pos:write', 'master:write',
            'inventory:read', 'inventory:write',
            'finance:read', 'finance:write',
            'hrd:read', 'hrd:write',
            'settings:read', 'settings:write',
        ])->plainTextToken;

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
