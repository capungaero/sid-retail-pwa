# SID Retail legacy database migration

This package copies the legacy `toko_1_3` database from MySQL 4.1/MyISAM/latin1 to a separate MariaDB 11/InnoDB/utf8mb4 database. Source access is read-only by design: the scripts contain only `SHOW` and `SELECT` statements for the source connection. For cutover, create a dedicated source account with only `SELECT` and `SHOW VIEW`; do not use `root`.

No row data or credentials are committed. `generated/schema_inventory.json`, `generated/target_schema.sql`, and `generated/source_baseline.json` contain schema and aggregate/count evidence only.

## Guarantees and transformations

- Refuses to run when source and target host, port, and database are identical.
- Dry-run is the default. Applying requires both `--apply` and `--confirm-rebuild-target`.
- Rebuilds only the 137 named legacy tables in the target. Migration audit and password-upgrade metadata survive reruns.
- Converts MyISAM to InnoDB and latin1 to utf8mb4.
- Decodes source bytes as latin1 and sends Unicode to the target.
- Converts zero `DATE`/`DATETIME` values to `NULL`. The inventory confirms these legacy date columns are nullable.
- Adds `app_row_id BIGINT` only to legacy tables with no primary key. All original columns and names remain unchanged.
- Preserves legacy `True`/`False` varchar values for interface compatibility.
- Copies legacy password fields unchanged and never logs their values. The application must verify a legacy hash once, store an Argon2id hash in `app_password_upgrades`, and stop using the old hash for that identity.
- Preserves source indexes. Foreign keys are intentionally not promoted automatically because MyISAM contains no authoritative relation metadata.
- Records each run and each table result in `app_migration_batches` and `app_migration_table_results`.
- Validation compares every table count plus sales, purchases, item quantities, stock, inventory valuation, cash, debt, receivables, and profit aggregates. Any copy mismatch exits non-zero.

## Local target setup

1. Copy `.env.example` to `.env` outside version control and set strong target passwords. Source credentials should preferably be supplied in the process environment.
2. Start MariaDB: `docker compose --env-file .env up -d`.
3. Install the Python dependency: `python -m pip install -r requirements.txt`.
4. Refresh read-only evidence: `python scripts/inventory.py` then `python scripts/source_baseline.py`.
5. Preview: `python scripts/migrate.py`.
6. Copy into a disposable target: `python scripts/migrate.py --apply --confirm-rebuild-target`.
7. Reconcile: `python scripts/validate.py`. Do not accept or cut over unless it exits 0 and `generated/validation_report.json` has no mismatches.

The target port defaults to 3307 to prevent accidental collision with the legacy service on 3306. Application runtime credentials should be a separate least-privilege account, not `root` and not the migration account.

## Cutover

1. Back up the source and prove restore on another machine.
2. Run inventory, baseline, migration, and validation against staging.
3. Resolve any orphan report before adding foreign keys. A non-zero orphan count may faithfully match the source, but is not safe for an FK.
4. Schedule downtime. Stop the legacy application so the source becomes quiescent.
5. Refresh the inventory/baseline, rebuild the target, and run validation again.
6. Archive the validation report and migration batch ID.
7. Point the API at `sid_retail` using a least-privilege account, smoke-test login, barcode sale, stock, cash, debt/receivable, and thermal receipt, then open access.

## Rollback

If validation or smoke tests fail, stop the PWA/API, keep the target for diagnosis, and restart the unchanged legacy application against the unchanged source. Never reverse-sync target writes into MySQL 4.1. If the PWA has accepted live writes, export those transaction identifiers for manual reconciliation before rollback. The rollback decision point must occur before disposing of the final source backup.

## Current evidence and limitations

The checked-in baseline was collected through read-only queries against MySQL 4.1.7 on localhost. No MariaDB or Docker runtime was installed on the workstation at the time, so an actual target copy and source/target validation remain pending. The generated target DDL is therefore reproducible but not yet runtime-proven on that workstation.

