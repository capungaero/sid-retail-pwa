<?php
namespace App\Http\Controllers;

use App\Models\AppUserSetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

final class UserAccountController
{
    public function index(): JsonResponse
    { return response()->json(AppUserSetting::orderBy('name')->get()->map(fn (AppUserSetting $u) => $this->present($u))); }

    public function store(Request $request): JsonResponse
    { return $this->persist($request, null); }
    public function update(Request $request, string $id): JsonResponse
    { return $this->persist($request, $id); }

    private function persist(Request $request, ?string $id): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'username' => ['required', 'string', 'max:50', Rule::unique('app_user_settings', 'username')->ignore($id)],
            'role' => 'required|in:kasir,supervisor,admin',
            'active' => 'required|boolean',
        ]);
        $user = $id ? AppUserSetting::findOrFail($id) : new AppUserSetting(['id' => (string) Str::uuid()]);
        $isNew = !$user->exists;
        $user->fill($data)->save();
        $desc = $isNew
            ? "Pengguna baru ditambahkan: {$user->name} ({$user->role})."
            : "Pengguna diperbarui: {$user->name} ({$user->role}).";
        AuditLogger::log('user-account-update', $desc, $request->user()?->nama ?? 'system');
        return response()->json($this->present($user));
    }

    private function present(AppUserSetting $u): array
    { return ['id' => (string) $u->id, 'name' => $u->name, 'username' => $u->username, 'role' => $u->role, 'active' => (bool) $u->active]; }
}
