// `new Date().toISOString()` always converts to UTC first. For a cashier physically in WIB
// (UTC+7), that silently shifts "today" back a day for the first ~7 hours of every local day —
// a sale made at 05:00 WIB gets server-recorded under today's WIB date, but toISOString()-based
// "today" on the client still reads yesterday's UTC date until 07:00 WIB rolls it over. Riwayat
// hari ini, Ringkasan, Rekap harian, and the kasir cash-source picker all filter "today's sales"
// against this key, so during that window a just-made sale looked like it hadn't shown up at
// all on the device that made it - and then reappeared once someone reopened the app after 07:00
// WIB, reading as "it only shows on other devices". These use the browser's own local calendar
// date instead, matching the cashier's actual wall clock.
export function todayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
