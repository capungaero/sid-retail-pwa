from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone

import pymysql

from common import GENERATED, ensure_distinct_endpoints, normalize_value, quote, source_config, source_connection, target_config, text
from inventory import collect

AUDIT_DDL = """
CREATE TABLE IF NOT EXISTS `app_migration_batches` (
  `batch_id` CHAR(36) NOT NULL,
  `started_at` DATETIME(6) NOT NULL,
  `finished_at` DATETIME(6) NULL,
  `source_fingerprint` VARCHAR(255) NOT NULL,
  `status` ENUM('running','succeeded','failed') NOT NULL,
  `error_summary` VARCHAR(500) NULL,
  PRIMARY KEY (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `app_migration_table_results` (
  `batch_id` CHAR(36) NOT NULL,
  `table_name` VARCHAR(64) NOT NULL,
  `source_rows` BIGINT UNSIGNED NOT NULL,
  `target_rows` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('succeeded','failed') NOT NULL,
  `error_summary` VARCHAR(500) NULL,
  PRIMARY KEY (`batch_id`, `table_name`),
  CONSTRAINT `fk_migration_result_batch` FOREIGN KEY (`batch_id`) REFERENCES `app_migration_batches` (`batch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS `app_password_upgrades` (
  `legacy_identity` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `upgraded_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`legacy_identity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"""


def utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def bootstrap_audit(target) -> None:
    with target.cursor() as cur:
        for statement in AUDIT_DDL.split(";"):
            if statement.strip():
                cur.execute(statement)
    target.commit()


def insert_table(source, target, table: dict, batch_size: int) -> int:
    table_name = table["name"]
    source_columns = [c["name"] for c in table["columns"]]
    column_types = [c["type"] for c in table["columns"]]
    column_sql = ", ".join(quote(c) for c in source_columns)
    placeholders = ", ".join(["%s"] * len(source_columns))
    select_sql = f"SELECT {column_sql} FROM {quote(table_name)}"
    insert_sql = f"INSERT INTO {quote(table_name)} ({column_sql}) VALUES ({placeholders})"
    read = source.cursor()
    write = target.cursor()
    copied = 0
    try:
        read.execute(select_sql)
        while True:
            rows = read.fetchmany(batch_size)
            if not rows:
                break
            normalized = [tuple(normalize_value(value, column_types[index]) for index, value in enumerate(row)) for row in rows]
            write.executemany(insert_sql, normalized)
            copied += len(normalized)
        target.commit()
        return copied
    except Exception:
        target.rollback()
        raise
    finally:
        read.close()
        write.close()


def migrate(batch_size: int, inventory: dict) -> str:
    source_cfg = source_config()
    target_cfg = target_config()
    ensure_distinct_endpoints(source_cfg, target_cfg)
    source = source_connection()
    target = pymysql.connect(**target_cfg)
    batch_id = str(uuid.uuid4())
    fingerprint = f"{source_cfg['host']}:{source_cfg['port']}/{source_cfg['database']}|{inventory['source']['version']}"
    try:
        bootstrap_audit(target)
        with target.cursor() as cur:
            cur.execute("INSERT INTO app_migration_batches(batch_id, started_at, source_fingerprint, status) VALUES(%s,%s,%s,'running')", (batch_id, utcnow_naive(), fingerprint))
        target.commit()
        for table in inventory["tables"]:
            name = table["name"]
            try:
                with target.cursor() as cur:
                    cur.execute(f"DROP TABLE IF EXISTS {quote(name)}")
                    cur.execute(table["target_ddl"])
                target.commit()
                copied = insert_table(source, target, table, batch_size)
                with target.cursor() as cur:
                    cur.execute(f"SELECT COUNT(*) FROM {quote(name)}")
                    target_count = cur.fetchone()[0]
                    cur.execute("INSERT INTO app_migration_table_results VALUES(%s,%s,%s,%s,'succeeded',NULL)", (batch_id, name, table.get("row_count", copied), target_count))
                target.commit()
                if copied != target_count or table.get("row_count", copied) != target_count:
                    raise RuntimeError(f"row count mismatch for {name}")
                print(f"{name}: {target_count} rows")
            except Exception as exc:
                with target.cursor() as cur:
                    cur.execute("INSERT INTO app_migration_table_results VALUES(%s,%s,%s,0,'failed',%s) ON DUPLICATE KEY UPDATE status='failed', error_summary=VALUES(error_summary)", (batch_id, name, table.get("row_count", 0), str(exc)[:500]))
                    cur.execute("UPDATE app_migration_batches SET finished_at=%s,status='failed',error_summary=%s WHERE batch_id=%s", (utcnow_naive(), f"table {name}: {exc}"[:500], batch_id))
                target.commit()
                raise
        with target.cursor() as cur:
            cur.execute("UPDATE app_migration_batches SET finished_at=%s,status='succeeded' WHERE batch_id=%s", (utcnow_naive(), batch_id))
        target.commit()
        return batch_id
    finally:
        source.close()
        target.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Repeatable SID MySQL 4.1 to MariaDB migration")
    parser.add_argument("--apply", action="store_true", help="actually rebuild legacy tables in the configured target")
    parser.add_argument("--confirm-rebuild-target", action="store_true", help="required acknowledgement that target legacy tables will be replaced")
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()
    inventory_path = GENERATED / "schema_inventory.json"
    inventory = json.loads(inventory_path.read_text(encoding="utf-8")) if inventory_path.exists() else collect(True)
    ensure_distinct_endpoints(source_config(), target_config())
    summary = {"mode": "apply" if args.apply else "dry-run", "source": inventory["source"], "target": {"host": target_config()["host"], "port": target_config()["port"], "database": target_config()["database"]}, "tables": inventory["table_count"], "rows": sum(t.get("row_count", 0) for t in inventory["tables"]), "tables_without_pk": sum(not t["has_primary_key"] for t in inventory["tables"])}
    print(json.dumps(summary, indent=2))
    if not args.apply:
        print("DRY RUN ONLY: source was inventoried; target was not modified.")
        return
    if not args.confirm_rebuild_target:
        sys.exit("Refusing apply: add --confirm-rebuild-target")
    batch_id = migrate(args.batch_size, inventory)
    print(f"Migration batch succeeded: {batch_id}")


if __name__ == "__main__":
    main()

