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
  ], total: 120000, paid: 150000, change: 30000, createdAt: '2026-08-14T11:00:00.000Z' },
  // Generated 2026-08-15 .. 2026-08-28 so Dashboard/Reports/Riwayat have data through today.
  { id: 'sale-4', invoice: 'DEMO-00000004', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 4, price: 76000, discount: 0 }, { productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 4, price: 2200, discount: 0 }], total: 312800, paid: 312800, change: 0, createdAt: '2026-08-15T15:12:00.000Z' },
  { id: 'sale-5', invoice: 'DEMO-00000005', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 2, price: 2200, discount: 0 }], total: 4400, paid: 5000, change: 600, createdAt: '2026-08-15T14:11:00.000Z' },
  { id: 'sale-6', invoice: 'DEMO-00000006', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 4, price: 20000, discount: 0 }], total: 80000, paid: 80000, change: 0, createdAt: '2026-08-15T12:59:00.000Z' },
  { id: 'sale-7', invoice: 'DEMO-00000007', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 4, price: 76000, discount: 0 }, { productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 2, price: 3500, discount: 0 }], total: 311000, paid: 311000, change: 0, createdAt: '2026-08-16T11:45:00.000Z' },
  { id: 'sale-8', invoice: 'DEMO-00000008', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 2, price: 2200, discount: 0 }, { productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 4, price: 3500, discount: 0 }], total: 18400, paid: 18400, change: 0, createdAt: '2026-08-16T16:54:00.000Z' },
  { id: 'sale-9', invoice: 'DEMO-00000009', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 3, price: 76000, discount: 0 }, { productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 4, price: 20000, discount: 0 }], total: 308000, paid: 308000, change: 0, createdAt: '2026-08-17T17:38:00.000Z' },
  { id: 'sale-10', invoice: 'DEMO-00000010', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 2, price: 4200, discount: 0 }], total: 8400, paid: 8400, change: 0, createdAt: '2026-08-17T18:17:00.000Z' },
  { id: 'sale-11', invoice: 'DEMO-00000011', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 3, price: 2200, discount: 0 }], total: 6600, paid: 6600, change: 0, createdAt: '2026-08-17T18:52:00.000Z' },
  { id: 'sale-12', invoice: 'DEMO-00000012', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 2, price: 20000, discount: 0 }, { productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 2, price: 4200, discount: 0 }], total: 48400, paid: 48400, change: 0, createdAt: '2026-08-17T13:48:00.000Z' },
  { id: 'sale-13', invoice: 'DEMO-00000013', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 1, price: 3500, discount: 0 }], total: 3500, paid: 3500, change: 0, createdAt: '2026-08-18T12:21:00.000Z' },
  { id: 'sale-14', invoice: 'DEMO-00000014', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 1, price: 4200, discount: 0 }, { productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 2, price: 2200, discount: 400 }], total: 8200, paid: 8200, change: 0, createdAt: '2026-08-18T11:08:00.000Z' },
  { id: 'sale-15', invoice: 'DEMO-00000015', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 1, price: 76000, discount: 0 }, { productId: '1', productName: 'Air Mineral 600 ml', unit: 'Dus', qty: 4, price: 78000, discount: 0 }], total: 388000, paid: 390000, change: 2000, createdAt: '2026-08-18T11:18:00.000Z' },
  { id: 'sale-16', invoice: 'DEMO-00000016', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 3, price: 76000, discount: 0 }, { productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 2, price: 4200, discount: 800 }], total: 235600, paid: 235600, change: 0, createdAt: '2026-08-18T17:22:00.000Z' },
  { id: 'sale-17', invoice: 'DEMO-00000017', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 2, price: 3500, discount: 0 }], total: 7000, paid: 10000, change: 3000, createdAt: '2026-08-19T14:56:00.000Z' },
  { id: 'sale-18', invoice: 'DEMO-00000018', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Dus', qty: 4, price: 78000, discount: 0 }], total: 312000, paid: 312000, change: 0, createdAt: '2026-08-19T11:46:00.000Z' },
  { id: 'sale-19', invoice: 'DEMO-00000019', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 1, price: 20000, discount: 0 }], total: 20000, paid: 20000, change: 0, createdAt: '2026-08-20T15:44:00.000Z' },
  { id: 'sale-20', invoice: 'DEMO-00000020', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 2, price: 20000, discount: 0 }], total: 40000, paid: 40000, change: 0, createdAt: '2026-08-20T18:47:00.000Z' },
  { id: 'sale-21', invoice: 'DEMO-00000021', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 2, price: 3500, discount: 0 }, { productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 3, price: 2200, discount: 0 }], total: 13600, paid: 13600, change: 0, createdAt: '2026-08-20T11:52:00.000Z' },
  { id: 'sale-22', invoice: 'DEMO-00000022', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 2, price: 76000, discount: 0 }, { productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 3, price: 3500, discount: 0 }], total: 162500, paid: 162500, change: 0, createdAt: '2026-08-21T18:20:00.000Z' },
  { id: 'sale-23', invoice: 'DEMO-00000023', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 4, price: 2200, discount: 900 }], total: 7900, paid: 7900, change: 0, createdAt: '2026-08-21T14:41:00.000Z' },
  { id: 'sale-24', invoice: 'DEMO-00000024', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 3, price: 3500, discount: 0 }], total: 10500, paid: 10500, change: 0, createdAt: '2026-08-21T11:05:00.000Z' },
  { id: 'sale-25', invoice: 'DEMO-00000025', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 3, price: 4200, discount: 1300 }], total: 11300, paid: 11300, change: 0, createdAt: '2026-08-22T14:14:00.000Z' },
  { id: 'sale-26', invoice: 'DEMO-00000026', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 3, price: 20000, discount: 0 }], total: 60000, paid: 60000, change: 0, createdAt: '2026-08-22T13:33:00.000Z' },
  { id: 'sale-27', invoice: 'DEMO-00000027', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Dus', qty: 4, price: 78000, discount: 0 }, { productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 2, price: 4200, discount: 0 }], total: 320400, paid: 320400, change: 0, createdAt: '2026-08-22T13:30:00.000Z' },
  { id: 'sale-28', invoice: 'DEMO-00000028', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 4, price: 4200, discount: 0 }], total: 16800, paid: 16800, change: 0, createdAt: '2026-08-22T11:41:00.000Z' },
  { id: 'sale-29', invoice: 'DEMO-00000029', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 3, price: 2200, discount: 0 }], total: 6600, paid: 6600, change: 0, createdAt: '2026-08-23T11:19:00.000Z' },
  { id: 'sale-30', invoice: 'DEMO-00000030', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 3, price: 3500, discount: 1100 }], total: 9400, paid: 10000, change: 600, createdAt: '2026-08-23T12:01:00.000Z' },
  { id: 'sale-31', invoice: 'DEMO-00000031', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Dus', qty: 2, price: 78000, discount: 0 }, { productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 4, price: 4200, discount: 0 }], total: 172800, paid: 172800, change: 0, createdAt: '2026-08-24T16:06:00.000Z' },
  { id: 'sale-32', invoice: 'DEMO-00000032', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 1, price: 2200, discount: 200 }], total: 2000, paid: 2000, change: 0, createdAt: '2026-08-24T09:10:00.000Z' },
  { id: 'sale-33', invoice: 'DEMO-00000033', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 2, price: 3500, discount: 0 }], total: 7000, paid: 7000, change: 0, createdAt: '2026-08-24T14:08:00.000Z' },
  { id: 'sale-34', invoice: 'DEMO-00000034', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 3, price: 20000, discount: 6000 }], total: 54000, paid: 54000, change: 0, createdAt: '2026-08-24T18:56:00.000Z' },
  { id: 'sale-35', invoice: 'DEMO-00000035', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 1, price: 4200, discount: 0 }, { productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 3, price: 3500, discount: 0 }], total: 14700, paid: 14700, change: 0, createdAt: '2026-08-25T14:31:00.000Z' },
  { id: 'sale-36', invoice: 'DEMO-00000036', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 4, price: 3500, discount: 1400 }], total: 12600, paid: 12600, change: 0, createdAt: '2026-08-25T16:49:00.000Z' },
  { id: 'sale-37', invoice: 'DEMO-00000037', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '4', productName: 'Sabun Mandi 80 g', unit: 'Pcs', qty: 2, price: 4200, discount: 800 }], total: 7600, paid: 7600, change: 0, createdAt: '2026-08-25T15:03:00.000Z' },
  { id: 'sale-38', invoice: 'DEMO-00000038', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 1, price: 2200, discount: 0 }, { productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 3, price: 3500, discount: 0 }], total: 12700, paid: 15000, change: 2300, createdAt: '2026-08-25T16:14:00.000Z' },
  { id: 'sale-39', invoice: 'DEMO-00000039', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 2, price: 2200, discount: 0 }], total: 4400, paid: 4400, change: 0, createdAt: '2026-08-26T15:39:00.000Z' },
  { id: 'sale-40', invoice: 'DEMO-00000040', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 3, price: 2200, discount: 0 }, { productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 4, price: 76000, discount: 0 }], total: 310600, paid: 310600, change: 0, createdAt: '2026-08-26T17:43:00.000Z' },
  { id: 'sale-41', invoice: 'DEMO-00000041', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 2, price: 3500, discount: 0 }], total: 7000, paid: 7000, change: 0, createdAt: '2026-08-26T15:10:00.000Z' },
  { id: 'sale-42', invoice: 'DEMO-00000042', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Renceng', qty: 2, price: 20000, discount: 0 }, { productId: '2', productName: 'Mi Instan Goreng', unit: 'Pcs', qty: 3, price: 3500, discount: 1100 }], total: 49400, paid: 49400, change: 0, createdAt: '2026-08-27T15:13:00.000Z' },
  { id: 'sale-43', invoice: 'DEMO-00000043', customerId: 'c-2', customerName: 'Toko Berkah', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Dus', qty: 2, price: 78000, discount: 15600 }], total: 140400, paid: 140400, change: 0, createdAt: '2026-08-27T13:08:00.000Z' },
  { id: 'sale-44', invoice: 'DEMO-00000044', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 1, price: 3500, discount: 0 }, { productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 4, price: 76000, discount: 30400 }], total: 277100, paid: 277100, change: 0, createdAt: '2026-08-27T17:36:00.000Z' },
  { id: 'sale-45', invoice: 'DEMO-00000045', customerId: 'c-1', customerName: 'Siti Aminah', lines: [{ productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 2, price: 3500, discount: 700 }], total: 6300, paid: 10000, change: 3700, createdAt: '2026-08-28T12:41:00.000Z' },
  { id: 'sale-46', invoice: 'DEMO-00000046', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '3', productName: 'Kopi Sachet Original', unit: 'Sachet', qty: 3, price: 2200, discount: 0 }], total: 6600, paid: 6600, change: 0, createdAt: '2026-08-28T14:45:00.000Z' },
  { id: 'sale-47', invoice: 'DEMO-00000047', customerId: 'general', customerName: 'Pelanggan Umum', lines: [{ productId: '5', productName: 'Beras Premium 5 kg', unit: 'Karung', qty: 4, price: 76000, discount: 30400 }, { productId: '1', productName: 'Air Mineral 600 ml', unit: 'Botol', qty: 2, price: 3500, discount: 0 }], total: 280600, paid: 280600, change: 0, createdAt: '2026-08-28T13:02:00.000Z' }
];

// Configurable payment methods (Pengaturan > Metode pembayaran). Mirrors the 5 defaults the
// backend migration seeds. CASH maps to legacy kas account 'KT' (KAS TOKO). CASHBON (type
// 'debt') is a debt sale by definition — checkout treats it like underpaid Tunai without needing
// the "Pelanggan berhutang" checkbox.
export const demoPaymentMethods: PaymentMethod[] = [
  { id: '1', code: 'CASH', name: 'Tunai', type: 'cash', legacyKasCode: 'KT', active: true, sortOrder: 1 },
  { id: '2', code: 'CREDIT', name: 'Kartu Kredit', type: 'credit', legacyKasCode: null, active: true, sortOrder: 2 },
  { id: '3', code: 'TRANSFER', name: 'Transfer', type: 'transfer', legacyKasCode: null, active: true, sortOrder: 3 },
  { id: '4', code: 'QRIS', name: 'QRIS', type: 'qris', legacyKasCode: null, active: true, sortOrder: 4 },
  { id: '5', code: 'CASHBON', name: 'Cashbon', type: 'debt', legacyKasCode: null, active: true, sortOrder: 5 }
];

// One row per payment applied to a sale (denormalized method snapshot). Seeded for the three
// demo sales above so the daily recap has a per-method breakdown; completeSale() appends here.
export type DemoSalePayment = { saleId: string; methodCode: string; methodName: string; amount: number; reference?: string; createdAt: string };
export const demoSalePayments: DemoSalePayment[] = [
  { saleId: 'DEMO-00000001', methodCode: 'CASH', methodName: 'Tunai', amount: 27500, createdAt: '2026-08-11T09:15:00.000Z' },
  { saleId: 'DEMO-00000002', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 152000, reference: 'TRX-99881', createdAt: '2026-08-13T14:40:00.000Z' },
  { saleId: 'DEMO-00000003', methodCode: 'QRIS', methodName: 'QRIS', amount: 120000, reference: 'QR-002210', createdAt: '2026-08-14T11:00:00.000Z' },
  { saleId: 'DEMO-00000004', methodCode: 'CASH', methodName: 'Tunai', amount: 312800, createdAt: '2026-08-15T15:12:00.000Z' },
  { saleId: 'DEMO-00000005', methodCode: 'CASH', methodName: 'Tunai', amount: 4400, createdAt: '2026-08-15T14:11:00.000Z' },
  { saleId: 'DEMO-00000006', methodCode: 'CASH', methodName: 'Tunai', amount: 80000, createdAt: '2026-08-15T12:59:00.000Z' },
  { saleId: 'DEMO-00000007', methodCode: 'QRIS', methodName: 'QRIS', amount: 311000, createdAt: '2026-08-16T11:45:00.000Z' },
  { saleId: 'DEMO-00000008', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 18400, createdAt: '2026-08-16T16:54:00.000Z' },
  { saleId: 'DEMO-00000009', methodCode: 'QRIS', methodName: 'QRIS', amount: 308000, createdAt: '2026-08-17T17:38:00.000Z' },
  { saleId: 'DEMO-00000010', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 8400, createdAt: '2026-08-17T18:17:00.000Z' },
  { saleId: 'DEMO-00000011', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 6600, createdAt: '2026-08-17T18:52:00.000Z' },
  { saleId: 'DEMO-00000012', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 48400, createdAt: '2026-08-17T13:48:00.000Z' },
  { saleId: 'DEMO-00000013', methodCode: 'QRIS', methodName: 'QRIS', amount: 3500, createdAt: '2026-08-18T12:21:00.000Z' },
  { saleId: 'DEMO-00000014', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 8200, createdAt: '2026-08-18T11:08:00.000Z' },
  { saleId: 'DEMO-00000015', methodCode: 'CASH', methodName: 'Tunai', amount: 388000, createdAt: '2026-08-18T11:18:00.000Z' },
  { saleId: 'DEMO-00000016', methodCode: 'CASH', methodName: 'Tunai', amount: 235600, createdAt: '2026-08-18T17:22:00.000Z' },
  { saleId: 'DEMO-00000017', methodCode: 'CASH', methodName: 'Tunai', amount: 7000, createdAt: '2026-08-19T14:56:00.000Z' },
  { saleId: 'DEMO-00000018', methodCode: 'CASH', methodName: 'Tunai', amount: 312000, createdAt: '2026-08-19T11:46:00.000Z' },
  { saleId: 'DEMO-00000019', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 20000, createdAt: '2026-08-20T15:44:00.000Z' },
  { saleId: 'DEMO-00000020', methodCode: 'CASH', methodName: 'Tunai', amount: 40000, createdAt: '2026-08-20T18:47:00.000Z' },
  { saleId: 'DEMO-00000021', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 13600, createdAt: '2026-08-20T11:52:00.000Z' },
  { saleId: 'DEMO-00000022', methodCode: 'CASH', methodName: 'Tunai', amount: 162500, createdAt: '2026-08-21T18:20:00.000Z' },
  { saleId: 'DEMO-00000023', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 7900, createdAt: '2026-08-21T14:41:00.000Z' },
  { saleId: 'DEMO-00000024', methodCode: 'QRIS', methodName: 'QRIS', amount: 10500, createdAt: '2026-08-21T11:05:00.000Z' },
  { saleId: 'DEMO-00000025', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 11300, createdAt: '2026-08-22T14:14:00.000Z' },
  { saleId: 'DEMO-00000026', methodCode: 'CASH', methodName: 'Tunai', amount: 60000, createdAt: '2026-08-22T13:33:00.000Z' },
  { saleId: 'DEMO-00000027', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 320400, createdAt: '2026-08-22T13:30:00.000Z' },
  { saleId: 'DEMO-00000028', methodCode: 'CASH', methodName: 'Tunai', amount: 16800, createdAt: '2026-08-22T11:41:00.000Z' },
  { saleId: 'DEMO-00000029', methodCode: 'CASH', methodName: 'Tunai', amount: 6600, createdAt: '2026-08-23T11:19:00.000Z' },
  { saleId: 'DEMO-00000030', methodCode: 'CASH', methodName: 'Tunai', amount: 9400, createdAt: '2026-08-23T12:01:00.000Z' },
  { saleId: 'DEMO-00000031', methodCode: 'CASH', methodName: 'Tunai', amount: 172800, createdAt: '2026-08-24T16:06:00.000Z' },
  { saleId: 'DEMO-00000032', methodCode: 'QRIS', methodName: 'QRIS', amount: 2000, createdAt: '2026-08-24T09:10:00.000Z' },
  { saleId: 'DEMO-00000033', methodCode: 'QRIS', methodName: 'QRIS', amount: 7000, createdAt: '2026-08-24T14:08:00.000Z' },
  { saleId: 'DEMO-00000034', methodCode: 'QRIS', methodName: 'QRIS', amount: 54000, createdAt: '2026-08-24T18:56:00.000Z' },
  { saleId: 'DEMO-00000035', methodCode: 'QRIS', methodName: 'QRIS', amount: 14700, createdAt: '2026-08-25T14:31:00.000Z' },
  { saleId: 'DEMO-00000036', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 12600, createdAt: '2026-08-25T16:49:00.000Z' },
  { saleId: 'DEMO-00000037', methodCode: 'CASH', methodName: 'Tunai', amount: 7600, createdAt: '2026-08-25T15:03:00.000Z' },
  { saleId: 'DEMO-00000038', methodCode: 'CASH', methodName: 'Tunai', amount: 12700, createdAt: '2026-08-25T16:14:00.000Z' },
  { saleId: 'DEMO-00000039', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 4400, createdAt: '2026-08-26T15:39:00.000Z' },
  { saleId: 'DEMO-00000040', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 310600, createdAt: '2026-08-26T17:43:00.000Z' },
  { saleId: 'DEMO-00000041', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 7000, createdAt: '2026-08-26T15:10:00.000Z' },
  { saleId: 'DEMO-00000042', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 49400, createdAt: '2026-08-27T15:13:00.000Z' },
  { saleId: 'DEMO-00000043', methodCode: 'CREDIT', methodName: 'Kartu Kredit', amount: 140400, createdAt: '2026-08-27T13:08:00.000Z' },
  { saleId: 'DEMO-00000044', methodCode: 'CASH', methodName: 'Tunai', amount: 277100, createdAt: '2026-08-27T17:36:00.000Z' },
  { saleId: 'DEMO-00000045', methodCode: 'CASH', methodName: 'Tunai', amount: 6300, createdAt: '2026-08-28T12:41:00.000Z' },
  { saleId: 'DEMO-00000046', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 6600, createdAt: '2026-08-28T14:45:00.000Z' },
  { saleId: 'DEMO-00000047', methodCode: 'TRANSFER', methodName: 'Transfer', amount: 280600, createdAt: '2026-08-28T13:02:00.000Z' }
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
