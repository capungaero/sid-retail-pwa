from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import pymysql

ROOT = Path(__file__).resolve().parents[1]
GENERATED = ROOT / "generated"


def text(value: Any) -> Any:
    return value.decode("latin1") if isinstance(value, bytes) else value


def source_config() -> dict[str, Any]:
    return {
        "host": os.getenv("SID_SOURCE_HOST", "127.0.0.1"),
        "port": int(os.getenv("SID_SOURCE_PORT", "3306")),
        "user": os.getenv("SID_SOURCE_USER", "root"),
        "password": os.getenv("SID_SOURCE_PASSWORD", ""),
        "database": os.getenv("SID_SOURCE_DATABASE", "toko_1_3"),
        "charset": "latin1",
        "connect_timeout": 10,
    }


def target_config(with_database: bool = True) -> dict[str, Any]:
    cfg = {
        "host": os.getenv("SID_TARGET_HOST", "127.0.0.1"),
        "port": int(os.getenv("SID_TARGET_PORT", "3307")),
        "user": os.getenv("SID_TARGET_USER", "sid_migrator"),
        "password": os.getenv("SID_TARGET_PASSWORD", ""),
        "charset": "utf8mb4",
        "connect_timeout": 10,
        "autocommit": False,
    }
    if with_database:
        cfg["database"] = os.getenv("SID_TARGET_DATABASE", "sid_retail")
    return cfg


def ensure_distinct_endpoints(source: dict[str, Any], target: dict[str, Any]) -> None:
    source_key = (source["host"].lower(), source["port"], source.get("database", "").lower())
    target_key = (target["host"].lower(), target["port"], target.get("database", "").lower())
    if source_key == target_key:
        raise RuntimeError("REFUSED: source and target resolve to the same host, port, and database")


def source_connection():
    # This connection is intentionally used only by hard-coded SHOW/SELECT statements.
    return pymysql.connect(**source_config())


def quote(identifier: str) -> str:
    return "`" + identifier.replace("`", "``") + "`"


def widen_decimal(match: "re.Match[str]") -> str:
    # MySQL 4.1 stores DECIMAL leniently and does not enforce the declared
    # precision on INSERT; real rows on this source exceed their declared
    # width (e.g. barang.margin_toko DECIMAL(3,2) holds 84.79). MariaDB's
    # target column is created strict, so declared widths must be widened
    # defensively rather than trusted from the legacy DDL.
    keyword, precision, scale = match.group(1), int(match.group(2)), int(match.group(3))
    widened = min(65, max(precision, scale) + 15)
    return f"{keyword}({widened},{scale})"


def normalize_create_table(ddl: str, table: str, has_primary_key: bool) -> str:
    ddl = re.sub(r"\bENGINE\s*=\s*MyISAM\b", "ENGINE=InnoDB", ddl, flags=re.I)
    ddl = re.sub(r"\bTYPE\s*=\s*MyISAM\b", "ENGINE=InnoDB", ddl, flags=re.I)
    ddl = re.sub(r"DEFAULT CHARSET=latin1(?:\s+COLLATE=\w+)?", "DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", ddl, flags=re.I)
    ddl = re.sub(r"\bdefault\s+'0000-00-00(?: 00:00:00)?'", "DEFAULT NULL", ddl, flags=re.I)
    ddl = re.sub(r"\b(decimal|numeric)\((\d+),(\d+)\)", widen_decimal, ddl, flags=re.I)
    if not has_primary_key:
        opening = ddl.find("(\n")
        marker = ddl.rfind("\n)")
        if opening < 0 or marker < 0:
            raise ValueError(f"cannot add surrogate key to {table}")
        ddl = ddl[: opening + 2] + "  `app_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,\n" + ddl[opening + 2 :]
        marker = ddl.rfind("\n)")
        body = ddl[:marker].rstrip()
        if not body.endswith(","):
            body += ","
        ddl = body + "\n  PRIMARY KEY (`app_row_id`)" + ddl[marker:]
    return ddl


ZERO_DATE = re.compile(r"^0000-00-00(?: 00:00:00)?$")


def normalize_value(value: Any, column_type: str) -> Any:
    value = text(value)
    if isinstance(value, str) and ZERO_DATE.match(value) and any(x in column_type.lower() for x in ("date", "time", "timestamp")):
        return None
    # Keep True/False strings because the legacy application schema uses varchar(5).
    return value


def canonical(value: Any) -> str:
    value = text(value)
    if value is None:
        return "<NULL>"
    if isinstance(value, (datetime, date)):
        return value.isoformat(sep=" ")
    if isinstance(value, Decimal):
        return format(value, "f")
    return str(value)


def row_digest(values: tuple[Any, ...]) -> str:
    joined = "\x1f".join(canonical(v) for v in values)
    return hashlib.sha256(joined.encode("utf-8", errors="strict")).hexdigest()
