<?php
namespace App\Http\Controllers;

use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use RuntimeException;
use Symfony\Component\Process\Process;

// Runs a real `mysqldump` of the `sid_retail` database, scoped to a dedicated read-only
// credential (`sid_backup`: SELECT, LOCK TABLES, SHOW VIEW, TRIGGER, EVENT on sid_retail.*
// only — never the app's runtime `sid_app` user, never root, and not the sid_migrator DDL
// account either, since that has broader ALL-PRIVILEGES scope than a backup path needs; see
// BACKUP_DB_USERNAME/BACKUP_DB_PASSWORD in .env). Dumps are written under
// storage_path('app/backups'), which is outside the public webroot (nginx only serves
// api/public) and is not reachable by any route in this app.
final class SettingsBackupController
{
    private const KEEP = 10;

    public function __invoke(Request $request): JsonResponse
    {
        $createdAt = now();
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);

        $file = $dir . DIRECTORY_SEPARATOR . 'sid_retail_' . $createdAt->format('Ymd_His') . '.sql';
        $host = config('database.connections.mysql.host');
        $port = (string) config('database.connections.mysql.port');
        $username = config('sid.backup.username');
        $password = config('sid.backup.password');

        if (!$username || !$password) {
            throw new RuntimeException('BACKUP_DB_USERNAME/BACKUP_DB_PASSWORD belum dikonfigurasi.');
        }

        $process = new Process([
            'mysqldump', '-h', $host, '-P', $port, '-u', $username,
            '--single-transaction', '--quick', 'sid_retail',
        ], null, ['MYSQL_PWD' => $password]);
        $process->setTimeout(300);
        $process->run();

        if (!$process->isSuccessful()) {
            throw new RuntimeException('mysqldump gagal: ' . $process->getErrorOutput());
        }
        File::put($file, $process->getOutput());

        $this->pruneOldBackups($dir);

        AuditLogger::log('backup', 'Backup manual dijalankan: ' . basename($file), $request->user()?->nama ?? 'system');

        return response()->json(['createdAt' => $createdAt->toISOString()]);
    }

    private function pruneOldBackups(string $dir): void
    {
        $files = collect(File::files($dir))
            ->filter(fn ($f) => str_ends_with($f->getFilename(), '.sql'))
            ->sortByDesc(fn ($f) => $f->getMTime())
            ->values();

        $files->slice(self::KEEP)->each(fn ($f) => File::delete($f->getPathname()));
    }
}
