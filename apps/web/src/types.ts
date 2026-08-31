export type Unit = { name: string; multiplier: number; price: number };
export type Product = {
  id: string;
  code: string;
  barcode: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  cost: number;
  units: Unit[];
  active: boolean;
  photoUrl?: string;
};
export type Customer = { id: string; code: string; name: string; phone?: string; tier: 'retail' | 'member' | 'wholesale' };
export type CartLine = { product: Product; unit: Unit; qty: number; discount: number; note?: string };
export type HeldSale = { id: string; reference: string; customer: Customer; lines: CartLine[]; heldAt: string };
export type PaymentPayload = { customerId: string; lines: { productId: string; unit: string; qty: number; price: number; discount: number }[]; paid: number; idempotencyKey: string; paymentMethod: string; paymentRef?: string };

// "Tukar barang" — customer already paid, doesn't want the item, swaps it for a different one.
// The original sale is untouched; this creates a brand new sale for the replacement item.
export type ExchangePayload = {
  oldProductId: string; oldUnit: string; oldQty: number;
  newProductId: string; newUnit: string; newQty: number; newPrice: number; newDiscount?: number;
  reason?: string; paymentMethod: string; paymentRef?: string; idempotencyKey: string;
};
export type ExchangeResult = { newInvoice: string; oldInvoice: string; total: number; diff: number };

export type PaymentMethodType = 'cash' | 'credit' | 'transfer' | 'qris' | 'other';
export type PaymentMethod = { id: string; code: string; name: string; type: PaymentMethodType; legacyKasCode?: string | null; active: boolean; sortOrder: number };

export type DailyMethodRecap = { methodCode: string; methodName: string; count: number; amount: number };
export type DailyRecap = { date: string; totalRevenue: number; transactionCount: number; byMethod: DailyMethodRecap[] };
export type NavItem = { label: string; path: string; ready?: boolean };

export type Supplier = { id: string; code: string; name: string; phone?: string; address?: string };

export type POStatus = 'draft' | 'open' | 'received';
export type PurchaseLine = { productId: string; productName: string; unit: string; qty: number; cost: number; receivedQty: number };
export type PurchaseOrder = { id: string; reference: string; supplierId: string; status: POStatus; lines: PurchaseLine[]; createdAt: string; note?: string };

export type ReturnKind = 'purchase' | 'sales';
export type ReturnLine = { productId: string; productName: string; unit: string; qty: number; price: number };
export type ReturnDoc = { id: string; reference: string; kind: ReturnKind; refLabel: string; lines: ReturnLine[]; createdAt: string; reason: string };

export type StockMovementType = 'purchase-receipt' | 'purchase-return' | 'sales-return' | 'adjustment';
export type StockMovement = { id: string; productId: string; productName: string; type: StockMovementType; qty: number; reference: string; note?: string; createdAt: string };

export type CashDirection = 'in' | 'out';
// Only meaningful for direction 'out': where the cash physically came from. 'daily' and 'loan'
// both net against sales revenue in Laporan > Penjualan & pembelian only 'daily' asks which
// cashier it was drawn from. 'daily' nets against that SAME day's own revenue (reports.ts's
// dailyDrawnTotal). 'loan' instead books a LoanPayable debt (see types.LoanPayable) against the
// PREVIOUS day (the already-closed till, not today's still-open one) and nets only its
// outstanding balance there (loanOutstandingDrawnTotal) - so paying the loan back (Keuangan >
// Hutang pinjaman) restores that day's Penjualan figure. The rest (cashier/petty/in_transit/bank)
// are running-balance pool tags (see cashPoolBalance) - same vocabulary as CashInSource, just for
// money going the other way; a kas keluar tagged with one subtracts from that pool's own kas-masuk
// balance.
export type CashFundingSource = 'daily' | 'loan' | 'cashier' | 'petty' | 'in_transit' | 'bank';
// Only meaningful for direction 'in': which cash pool the money landed in. Mirrors
// CashFundingSource's full vocabulary - 'daily'/'loan' are plain descriptive tags here (no
// netting/debt logic attached the way they are for kas keluar), same as cashier/petty/in_transit/bank.
export type CashInSource = 'daily' | 'loan' | 'cashier' | 'petty' | 'in_transit' | 'bank';
export type CashLedgerEntry = { id: string; direction: CashDirection; amount: number; category: string; note?: string; fundingSource?: CashFundingSource; fundingCashierName?: string; cashSource?: CashInSource; balanceAfter: number; createdAt: string };

export type PayablePayment = { id: string; amount: number; note?: string; createdAt: string };
export type Payable = { id: string; supplierId: string; supplierName: string; reference: string; amount: number; payments: PayablePayment[]; createdAt: string; dueAt?: string };

export type LoanPayment = { id: string; amount: number; note?: string; createdAt: string };
// Booked whenever a kas keluar draws "dari kas pinjaman". forDate is the day it draws against -
// the day BEFORE the draw itself, since a loan pulls from the previous day's already-closed
// sales rather than today's still-open till (see reports.ts's loanOutstandingDrawnTotal, which
// nets only the outstanding amount - amount minus payments - against that date in Laporan).
export type LoanPayable = { id: string; ledgerId: string; amount: number; forDate: string; note?: string; payments: LoanPayment[]; createdAt: string };

export type ReceivablePayment = { id: string; amount: number; note?: string; createdAt: string };
export type Receivable = { id: string; customerId: string; customerName: string; reference: string; amount: number; payments: ReceivablePayment[]; createdAt: string; dueAt?: string };

export type InstrumentKind = 'card' | 'voucher' | 'giro';
export type InstrumentStatus = 'pending' | 'cleared' | 'bounced';
export type PaymentInstrument = { id: string; kind: InstrumentKind; reference: string; amount: number; status: InstrumentStatus; note?: string; createdAt: string; clearedAt?: string };

// stockBefore/stockAfter are a projection from CURRENT stock (stockAfter + qty), not a true
// historical snapshot — see SaleController::index()'s comment for the caveat.
export type SaleLine = { productId: string; productName: string; unit: string; qty: number; price: number; discount: number; stockBefore?: number; stockAfter?: number };
// Attached to the ORIGINAL sale for every line that was later swapped out via Tukar barang, so
// the untouched original invoice can still show a "sudah ditukar → faktur baru" note.
export type SaleExchangeInfo = { oldProductId: string; oldUnit: string; oldQty: number; oldLineValue: number; newInvoice: string; newProductName: string; newUnit: string; newQty: number; newLineValue: number };
export type SaleRecord = { id: string; invoice: string; customerId: string; customerName: string; cashierName?: string | null; methodName?: string | null; lines: SaleLine[]; total: number; paid: number; change: number; createdAt: string; exchanges?: SaleExchangeInfo[] };

export type Employee = { id: string; name: string; role: string };

export type ShiftDef = { id: string; name: string; start: string; end: string };
export type ShiftAssignment = { id: string; employeeId: string; employeeName: string; shiftId: string; date: string };

export type AttendanceStatus = 'hadir' | 'telat' | 'pulang-cepat';
export type AttendanceEntry = { id: string; employeeId: string; employeeName: string; date: string; checkIn: string; checkOut?: string; status: AttendanceStatus };

export type LeaveType = 'izin' | 'sakit' | 'cuti' | 'lembur';
export type LeaveStatus = 'diajukan' | 'disetujui' | 'ditolak';
export type LeaveRequest = { id: string; employeeId: string; employeeName: string; type: LeaveType; startDate: string; endDate: string; hours?: number; reason?: string; status: LeaveStatus; createdAt: string };

export type StoreProfile = { name: string; address: string; phone: string; taxId?: string; receiptHeader?: string; receiptFooter?: string };

export type UserRole = 'kasir' | 'supervisor' | 'admin';
export type PermissionKey = 'pos' | 'inventory' | 'finance' | 'reports' | 'hrd' | 'settings';
export type RolePermissions = Record<UserRole, PermissionKey[]>;
export type UserAccount = { id: string; name: string; username: string; role: UserRole; active: boolean };

export type PrinterConnectionType = 'usb' | 'network' | 'bluetooth';
export type PaperWidth = '58mm' | '80mm';
export type PrinterConfig = { name: string; connection: PrinterConnectionType; paperWidth: PaperWidth };

export type AuditAction = 'store-profile-update' | 'user-account-update' | 'printer-config-update' | 'backup' | 'sale' | 'purchase-order' | 'attendance' | 'test-print' | 'payment-method-update';
export type AuditLogEntry = { id: string; action: AuditAction; description: string; actor: string; createdAt: string };
