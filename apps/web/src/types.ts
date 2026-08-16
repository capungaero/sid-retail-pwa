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
export type PaymentPayload = { customerId: string; lines: { productId: string; unit: string; qty: number; price: number; discount: number }[]; paid: number; idempotencyKey: string };
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
export type CashLedgerEntry = { id: string; direction: CashDirection; amount: number; category: string; note?: string; balanceAfter: number; createdAt: string };

export type PayablePayment = { id: string; amount: number; note?: string; createdAt: string };
export type Payable = { id: string; supplierId: string; supplierName: string; reference: string; amount: number; payments: PayablePayment[]; createdAt: string; dueAt?: string };

export type ReceivablePayment = { id: string; amount: number; note?: string; createdAt: string };
export type Receivable = { id: string; customerId: string; customerName: string; reference: string; amount: number; payments: ReceivablePayment[]; createdAt: string; dueAt?: string };

export type InstrumentKind = 'card' | 'voucher' | 'giro';
export type InstrumentStatus = 'pending' | 'cleared' | 'bounced';
export type PaymentInstrument = { id: string; kind: InstrumentKind; reference: string; amount: number; status: InstrumentStatus; note?: string; createdAt: string; clearedAt?: string };

export type SaleLine = { productId: string; productName: string; unit: string; qty: number; price: number; discount: number };
export type SaleRecord = { id: string; invoice: string; customerId: string; customerName: string; lines: SaleLine[]; total: number; createdAt: string };

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

export type AuditAction = 'store-profile-update' | 'user-account-update' | 'printer-config-update' | 'backup' | 'sale' | 'purchase-order' | 'attendance' | 'test-print';
export type AuditLogEntry = { id: string; action: AuditAction; description: string; actor: string; createdAt: string };
