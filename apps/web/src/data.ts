import type { AttendanceEntry, AuditLogEntry, CashLedgerEntry, Customer, Employee, LeaveRequest, Payable, PaymentInstrument, PaymentMethod, PrinterConfig, Product, PurchaseOrder, Receivable, RolePermissions, SaleRecord, ShiftAssignment, ShiftDef, StockMovement, StoreProfile, Supplier, UserAccount } from './types';

export const demoProducts: Product[] = [
  { id: '1', code: 'BRG-0001', barcode: '8991002101651', name: 'Air Mineral 600 ml', category: 'Minuman', stock: 84, minStock: 24, cost: 2100, active: true, units: [{ name: 'Botol', multiplier: 1, price: 3500 }, { name: 'Dus', multiplier: 24, price: 78000 }] },
  { id: '2', code: 'BRG-0002', barcode: '8998866200346', name: 'Mi Instan Goreng', category: 'Makanan', stock: 136, minStock: 40, cost: 2600, active: true, units: [{ name: 'Pcs', multiplier: 1, price: 3500 }, { name: 'Dus', multiplier: 40, price: 132000 }] },
  { id: '3', code: 'BRG-0003', barcode: '8996001600266', name: 'Kopi Sachet Original', category: 'Minuman', stock: 9, minStock: 20, cost: 1500, active: true, units: [{ name: 'Sachet', multiplier: 1, price: 2200 }, { name: 'Renceng', multiplier: 10, price: 20000 }] },
  { id: '4', code: 'BRG-0004', barcode: '8992775001025', name: 'Sabun Mandi 80 g', category: 'Perawatan', stock: 31, minStock: 12, cost: 2900, active: true, units: [{ name: 'Pcs', multiplier: 1, price: 4200 }] },
  { id: '5', code: 'BRG-0005', barcode: '8999999000015', name: 'Beras Premium 5 kg', category: 'Sembako', stock: 18, minStock: 10, cost: 69500, active: true, units: [{ name: 'Karung', multiplier: 1, price: 76000 }] }
];

export const demoCustomers: Customer[] = [
  { id: 'general', code: 'UMUM', name: 'Pelanggan Umum', tier: 'retail' },
  { id: 'c-1', code: 'PLG-001', name: 'Siti Aminah', phone: '081234567890', tier: 'member' },
  { id: 'c-2', code: 'PLG-002', name: 'Toko Berkah', phone: '081298765432', tier: 'wholesale' }
];

export const demoSuppliers: Supplier[] = [
  { id: 'sup-1', code: 'SUP-001', name: 'PT Sumber Makmur', phone: '021-5551234', address: 'Jl. Industri No. 12, Jakarta' },
  { id: 'sup-2', code: 'SUP-002', name: 'CV Tirta Jaya', phone: '021-5559876', address: 'Jl. Raya Bekasi No. 45' },
  { id: 'sup-3', code: 'SUP-003', name: 'UD Berkah Sembako', phone: '081211112222', address: 'Pasar Induk Blok C-9' }
];

export const demoPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1', reference: 'PO-0001', supplierId: 'sup-1', status: 'open', createdAt: '2026-08-10T09:00:00.000Z',
    lines: [
      { productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 20, cost: 19000, receivedQty: 0 },
      { productId: '1', productName: 'Air Mineral 600 ml', unit: 'Dus', qty: 10, cost: 75000, receivedQty: 5 }
    ]
  }
];

export const demoStockMovements: StockMovement[] = [
  { id: 'mv-1', productId: '2', productName: 'Mi Instan Goreng', type: 'purchase-receipt', qty: 40, reference: 'PO-0000', createdAt: '2026-08-01T08:30:00.000Z' },
  { id: 'mv-2', productId: '1', productName: 'Air Mineral 600 ml', type: 'purchase-receipt', qty: 60, reference: 'PO-0000', createdAt: '2026-08-01T08:35:00.000Z' },
  { id: 'mv-3', productId: '5', productName: 'Beras Premium 5 kg', type: 'adjustment', qty: -2, reference: 'ADJ-000012', note: 'Rusak — kemasan sobek', createdAt: '2026-08-05T14:10:00.000Z' },
  { id: 'mv-4', productId: '1', productName: 'Air Mineral 600 ml', type: 'purchase-receipt', qty: 120, reference: 'PO-0001', createdAt: '2026-08-12T10:05:00.000Z' }
];

// Chronological (oldest first) so each entry's balanceAfter follows from the one before it.
export const demoCashEntries: CashLedgerEntry[] = [
  { id: 'kas-1', direction: 'in', amount: 2000000, category: 'Modal awal kas', balanceAfter: 2000000, createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'kas-2', direction: 'out', amount: 150000, category: 'Beli galon air minum', balanceAfter: 1850000, createdAt: '2026-08-03T10:00:00.000Z' },
  { id: 'kas-3', direction: 'in', amount: 300000, category: 'Setoran kasir tambahan', balanceAfter: 2150000, createdAt: '2026-08-10T09:00:00.000Z' },
  { id: 'kas-4', direction: 'out', amount: 75000, category: 'Beli alat tulis toko', note: 'Nota kasbon karyawan', balanceAfter: 2075000, createdAt: '2026-08-12T15:20:00.000Z' }
];

// Payable derived from the partially received PO-0001 (5 of 10 dus Air Mineral already received from sup-1).
export const demoPayables: Payable[] = [
  { id: 'hut-1', supplierId: 'sup-1', supplierName: 'PT Sumber Makmur', reference: 'PO-0001', amount: 375000, payments: [{ id: 'bayar-1', amount: 100000, createdAt: '2026-08-13T11:00:00.000Z' }], createdAt: '2026-08-12T10:05:00.000Z' },
  { id: 'hut-2', supplierId: 'sup-2', supplierName: 'CV Tirta Jaya', reference: 'PO-0002', amount: 500000, payments: [], createdAt: '2026-08-14T09:00:00.000Z' }
];

export const demoReceivables: Receivable[] = [
  { id: 'piu-1', customerId: 'c-1', customerName: 'Siti Aminah', reference: 'INV-1001', amount: 150000, payments: [{ id: 'tagih-1', amount: 50000, createdAt: '2026-08-11T16:00:00.000Z' }], createdAt: '2026-08-09T13:00:00.000Z' },
  { id: 'piu-2', customerId: 'c-2', customerName: 'Toko Berkah', reference: 'INV-1002', amount: 900000, payments: [], createdAt: '2026-08-14T10:30:00.000Z' }
];

// Completed sales, chronological (oldest first). completeSale() in lib/api.ts unshifts new demo sales onto the front.
export const demoSalesLog: SaleRecord[] = [
  { id: 'sale-1', invoice: 'DEMO-00000001', customerId: 'general', customerName: 'Pelanggan Umum', lines: [
    { productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 3, price: 3500, discount: 0 },
    { productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 5, price: 3500, discount: 500 }
  ], total: 27500, paid: 30000, change: 2500, createdAt: '2026-08-11T09:15:00.000Z' },
  { id: 'sale-2', invoice: 'DEMO-00000002', customerId: 'c-1', customerName: 'Siti Aminah', lines: [
    { productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 2, price: 76000, discount: 0 }
  ], total: 152000, paid: 152000, change: 0, createdAt: '2026-08-13T14:40:00.000Z' },
  { id: 'sale-3', invoice: 'DEMO-00000003', customerId: 'c-2', customerName: 'Toko Berkah', lines: [
    { productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 4, price: 20000, discount: 2000 },
    { productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 10, price: 4200, discount: 0 }
  ], total: 120000, paid: 150000, change: 30000, createdAt: '2026-08-14T11:00:00.000Z' }
];

// Configurable payment methods (Pengaturan > Metode pembayaran). Mirrors the 4 defaults the
// backend migration seeds. CASH maps to legacy kas account 'KT' (KAS TOKO).
export const demoPaymentMethods: PaymentMethod[] = [
  { id: '1', code: 'CASH', name: 'Tunai', type: 'cash', legacyKasCode: 'KT', active: true, sortOrder: 1 },
  { id: '2', code: 'CREDIT', name: 'Kartu Kredit', type: 'credit', legacyKasCode: null, active: true, sortOrder: 2 },
  { id: '3', code: 'TRANSFER', name: 'Transfer', type: 'transfer', legacyKasCode: null, active: true, sortOrder: 3 },
  { id: '4', code: 'QRIS', name: 'QRIS', type: 'qris', legacyKasCode: null, active: true, sortOrder: 4 }
];

// One row per payment applied to a sale (denormalized method snapshot). Seeded for the three
// demo sales above so the daily recap has a per-method breakdown; completeSale() appends here.
export type DemoSalePayment = { saleId: string; methodCode: string; methodName: string; amount: number; reference?: string; createdAt: string };
export const demoSalePayments: DemoSalePayment[] = [
  { saleId: 'DEMO-00000001', methodCode: 'CASH', methodName: 'Tunai', amount: 27500, createdAt: '2026-08-11T09:15:00.000Z' },
  { saleId: 'DEMO-00000002', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 152000, reference: 'TRX-99881', createdAt: '2026-08-13T14:40:00.000Z' },
  { saleId: 'DEMO-00000003', methodCode: 'QRIS', methodName: 'QRIS', amount: 120000, reference: 'QR-002210', createdAt: '2026-08-14T11:00:00.000Z' }
];

export const demoInstruments: PaymentInstrument[] = [
  { id: 'ins-1', kind: 'card', reference: 'EDC-778812', amount: 235000, status: 'cleared', createdAt: '2026-08-10T12:00:00.000Z', clearedAt: '2026-08-10T12:00:05.000Z' },
  { id: 'ins-2', kind: 'voucher', reference: 'VCR-004521', amount: 50000, status: 'pending', createdAt: '2026-08-13T09:30:00.000Z' },
  { id: 'ins-3', kind: 'giro', reference: 'GRO-002210', amount: 1200000, status: 'pending', note: 'Giro mundur, jatuh tempo 30 hari', createdAt: '2026-08-14T14:00:00.000Z' }
];

export const demoEmployees: Employee[] = [
  { id: 'emp-1', name: 'Budi Santoso', role: 'Kasir' },
  { id: 'emp-2', name: 'Siti Rahma', role: 'Pramuniaga' },
  { id: 'emp-3', name: 'Andi Wijaya', role: 'Gudang' },
  { id: 'emp-4', name: 'Dewi Lestari', role: 'Kasir' },
  { id: 'emp-5', name: 'Rudi Hartono', role: 'Supervisor' }
];

export const demoShiftDefs: ShiftDef[] = [
  { id: 'shift-pagi', name: 'Pagi', start: '07:00', end: '15:00' },
  { id: 'shift-siang', name: 'Siang', start: '15:00', end: '22:00' },
  { id: 'shift-malam', name: 'Malam', start: '22:00', end: '06:00' }
];

export const demoShiftAssignments: ShiftAssignment[] = [
  { id: 'sa-1', employeeId: 'emp-1', employeeName: 'Budi Santoso', shiftId: 'shift-pagi', date: '2026-08-10' },
  { id: 'sa-2', employeeId: 'emp-2', employeeName: 'Siti Rahma', shiftId: 'shift-siang', date: '2026-08-10' },
  { id: 'sa-3', employeeId: 'emp-1', employeeName: 'Budi Santoso', shiftId: 'shift-pagi', date: '2026-08-11' },
  { id: 'sa-4', employeeId: 'emp-3', employeeName: 'Andi Wijaya', shiftId: 'shift-malam', date: '2026-08-11' },
  { id: 'sa-5', employeeId: 'emp-4', employeeName: 'Dewi Lestari', shiftId: 'shift-siang', date: '2026-08-12' },
  { id: 'sa-6', employeeId: 'emp-1', employeeName: 'Budi Santoso', shiftId: 'shift-pagi', date: '2026-08-12' }
];

// Statuses below are pre-computed with lib/hrd.ts's computeAttendanceStatus against the shift
// assignments above (Pagi 07:00-15:00, Siang 15:00-22:00), so keep both in sync if either changes.
export const demoAttendanceEntries: AttendanceEntry[] = [
  { id: 'att-1', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-08-10', checkIn: '06:55', checkOut: '15:05', status: 'hadir' },
  { id: 'att-2', employeeId: 'emp-2', employeeName: 'Siti Rahma', date: '2026-08-10', checkIn: '15:00', checkOut: '22:00', status: 'hadir' },
  { id: 'att-3', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-08-11', checkIn: '07:20', checkOut: '15:00', status: 'telat' },
  { id: 'att-4', employeeId: 'emp-3', employeeName: 'Andi Wijaya', date: '2026-08-11', checkIn: '22:20', checkOut: '06:00', status: 'telat' },
  { id: 'att-5', employeeId: 'emp-1', employeeName: 'Budi Santoso', date: '2026-08-12', checkIn: '06:58', checkOut: '14:30', status: 'pulang-cepat' },
  { id: 'att-6', employeeId: 'emp-4', employeeName: 'Dewi Lestari', date: '2026-08-12', checkIn: '14:50', checkOut: '22:00', status: 'hadir' },
  { id: 'att-7', employeeId: 'emp-5', employeeName: 'Rudi Hartono', date: '2026-08-10', checkIn: '08:00', checkOut: '17:00', status: 'hadir' }
];

export const demoLeaveRequests: LeaveRequest[] = [
  { id: 'leave-1', employeeId: 'emp-2', employeeName: 'Siti Rahma', type: 'sakit', startDate: '2026-08-05', endDate: '2026-08-06', reason: 'Demam', status: 'disetujui', createdAt: '2026-08-04T09:00:00.000Z' },
  { id: 'leave-2', employeeId: 'emp-3', employeeName: 'Andi Wijaya', type: 'cuti', startDate: '2026-08-20', endDate: '2026-08-22', reason: 'Acara keluarga', status: 'diajukan', createdAt: '2026-08-14T10:00:00.000Z' },
  { id: 'leave-3', employeeId: 'emp-1', employeeName: 'Budi Santoso', type: 'izin', startDate: '2026-08-09', endDate: '2026-08-09', reason: 'Keperluan pribadi', status: 'ditolak', createdAt: '2026-08-08T08:00:00.000Z' },
  { id: 'leave-4', employeeId: 'emp-4', employeeName: 'Dewi Lestari', type: 'lembur', startDate: '2026-08-12', endDate: '2026-08-12', hours: 3, reason: 'Stock opname', status: 'disetujui', createdAt: '2026-08-12T20:00:00.000Z' }
];

export const demoStoreProfile: StoreProfile = {
  name: (import.meta.env.VITE_STORE_NAME as string | undefined) || 'SID Retail',
  address: 'Jl. Melati Raya No. 8, Bandung',
  phone: '022-4567890',
  taxId: '01.234.567.8-912.000',
  receiptHeader: 'Terima kasih telah berbelanja',
  receiptFooter: 'Barang yang sudah dibeli tidak dapat ditukar'
};

// Roles are illustrative of the demo cast (Budi/Rudi from HRD play kasir & supervisor here);
// this is a settings-only user list, not tied to HRD employee records.
export const demoUserAccounts: UserAccount[] = [
  { id: 'usr-1', name: 'Budi Santoso', username: 'budi.kasir', role: 'kasir', active: true },
  { id: 'usr-2', name: 'Rudi Hartono', username: 'rudi.spv', role: 'supervisor', active: true },
  { id: 'usr-3', name: 'Admin Toko', username: 'admin', role: 'admin', active: true }
];

// View-only demo RBAC: which sections each role may open. Not enforced as real authorization.
export const demoRolePermissions: RolePermissions = {
  kasir: ['pos'],
  supervisor: ['pos', 'inventory', 'finance', 'reports', 'hrd'],
  admin: ['pos', 'inventory', 'finance', 'reports', 'hrd', 'settings']
};

export const demoPrinterConfig: PrinterConfig = { name: 'EPSON TM-T82', connection: 'usb', paperWidth: '58mm' };

// Chronological (oldest first). api.ts's logAudit() unshifts new demo entries onto the front.
export const demoAuditLog: AuditLogEntry[] = [
  { id: 'audit-1', action: 'printer-config-update', description: 'Konfigurasi printer awal disetel: EPSON TM-T82 (USB, 58mm).', actor: 'Admin Toko', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'audit-2', action: 'sale', description: 'Transaksi DEMO-00000003 tersimpan.', actor: 'Kasir Demo', createdAt: '2026-08-14T11:00:00.000Z' }
];
