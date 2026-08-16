<?php
namespace App\Http\Controllers;

use App\Models\AppPrinterConfig;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PrinterConfigController
{
    public function show(): JsonResponse
    { return response()->json($this->present(AppPrinterConfig::firstOrFail())); }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'connection' => 'required|in:usb,network,bluetooth',
            'paperWidth' => 'required|in:58mm,80mm',
        ]);
        $config = AppPrinterConfig::firstOrFail();
        $config->update(['name' => $data['name'], 'connection' => $data['connection'], 'paper_width' => $data['paperWidth']]);
        AuditLogger::log('printer-config-update', "Konfigurasi printer diperbarui: {$config->name} (" . strtoupper($config->connection) . ", {$config->paper_width}).", $request->user()?->nama ?? 'system');
        return response()->json($this->present($config));
    }

    // No real hardware access from the API — the actual print bridge is local to the cashier
    // machine. This just records the audit trail entry for a requested test print.
    public function testPrint(Request $request): JsonResponse
    {
        $config = AppPrinterConfig::firstOrFail();
        AuditLogger::log('test-print', "Tes cetak dikirim ke printer \"{$config->name}\".", $request->user()?->nama ?? 'system');
        return response()->json(['message' => 'ok']);
    }

    private function present(AppPrinterConfig $p): array
    { return ['name' => $p->name, 'connection' => $p->connection, 'paperWidth' => $p->paper_width]; }
}
