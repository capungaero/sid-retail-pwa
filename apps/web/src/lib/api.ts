import { demoAttendanceEntries, demoAuditLog, demoCashEntries, demoCustomers, demoEmployees, demoInstruments, demoLeaveRequests, demoPayables, demoPaymentMethods, demoPrinterConfig, demoProducts, demoPurchaseOrders, demoReceivables, demoRolePermissions, demoSalePayments, demoSalesLog, demoShiftAssignments, demoShiftDefs, demoStockMovements, demoStoreProfile, demoSuppliers, demoUserAccounts } from '../data';
import { applyReceipt, poStatusAfterReceipt, signedReturnQty } from './inventory';
import { canTransitionInstrument, capPayment, nextCashBalance, payableOutstanding, receivableOutstanding } from './finance';
import { computeAttendanceStatus, findScheduledShift } from './hrd';
import { buildDailyRecap } from './reports';
import { validateStoreProfile } from './settings';
import { openReceiptPreviewPopup } from './print';
import type { AttendanceEntry, AuditAction, AuditLogEntry, CashDirection, CashFundingSource, CashLedgerEntry, Customer, DailyRecap, Employee, ExchangePayload, ExchangeResult, InstrumentKind, InstrumentStatus, LeaveRequest, LeaveStatus, LeaveType, Payable, PaymentInstrument, PaymentMethod, PaymentMethodType, PaymentPayload, PermissionKey, PrinterConfig, Product, PurchaseOrder, Receivable, ReturnDoc, RolePermissions, SaleRecord, ShiftAssignment, ShiftDef, StockMovement, StoreProfile, Supplier, UserAccount, UserRole } from '../types';

const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '') as string | undefined;
export const isDemoMode = !baseUrl;

// Sanctum personal-access-token auth: AuthController returns a bearer token on login, so the
// SPA carries it itself rather than relying on statefulApi() cookie sessions (no CSRF-cookie
// bootstrap or same-site cookie setup exists for this deployment).
let authToken: string | null = (!isDemoMode && sessionStorage.getItem('sid-token')) || null;

export type AuthUser = { id: string; name: string; role: string; permissions: PermissionKey[] };

// api.ts is a plain module, not a React component, so it can't set React state itself when a
// request comes back 401 (session expired/revoked). App.tsx registers a handler here that clears
// its loggedIn state and sends the user back to the login screen.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  if (!baseUrl) throw new Error('API belum dikonfigurasi');
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? 'Username atau password salah.');
  }
  const data = await response.json() as { token: string; user: AuthUser };
  authToken = data.token;
  sessionStorage.setItem('sid-token', data.token);
  // Persisted alongside the token so the topbar can show the real logged-in user after a
  // navigation/reload, not just on the render that immediately follows the login POST.
  sessionStorage.setItem('sid-user', JSON.stringify(data.user));
  return data.user;
}

// Rehydrates the logged-in user from sessionStorage (survives navigation and reload, unlike
// component state). Returns null in demo mode or before any real login has happened.
export function getStoredUser(): AuthUser | null {
  if (isDemoMode) return null;
  const raw = sessionStorage.getItem('sid-user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export async function logout(): Promise<void> {
  authToken = null;
  sessionStorage.removeItem('sid-token');
  sessionStorage.removeItem('sid-user');
  if (!baseUrl) return;
  await request('/auth/logout', { method: 'POST' }).catch(() => undefined);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!baseUrl) throw new Error('API belum dikonfigurasi');
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json', 'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...init?.headers
    }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      authToken = null;
      sessionStorage.removeItem('sid-token');
      sessionStorage.removeItem('sid-user');
      onUnauthorized?.();
    }
    throw new Error(data?.message ?? `Permintaan gagal (${response.status})`);
  }
  return response.json();
}

export async function listProducts(query = ''): Promise<Product[]> {
  if (!baseUrl) {
    const q = query.trim().toLowerCase();
    return demoProducts.filter(p => !q || [p.name, p.code, p.barcode].some(value => value.toLowerCase().includes(q)));
  }
  return request(`/products?search=${encodeURIComponent(query)}`);
}

export async function listCustomers(query = ''): Promise<Customer[]> {
  if (!baseUrl) return demoCustomers.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  return request(`/customers?search=${encodeURIComponent(query)}`);
}

export async function saveProduct(product: Product): Promise<Product> {
  if (!baseUrl) {
    const index = demoProducts.findIndex(p => p.id === product.id);
    if (index >= 0) demoProducts[index] = product; else demoProducts.push(product);
    return product;
  }
  return request(`/products${product.id ? `/${product.id}` : ''}`, { method: product.id ? 'PUT' : 'POST', body: JSON.stringify(product) });
}

// Uploads an already client-side-compressed photo for a product. Demo mode has no real
// backend to persist to, so it just hands back a local object URL (nothing written to
// demoProducts' backing store beyond the in-memory preview the caller already applied).
export async function uploadProductPhoto(productId: string, file: Blob): Promise<{ photoUrl: string }> {
  if (!baseUrl) {
    return { photoUrl: URL.createObjectURL(file) };
  }
  const form = new FormData();
  form.append('photo', file, 'photo.jpg');
  const response = await fetch(`${baseUrl}/products/${productId}/photo`, {
    method: 'POST',
    headers: { Accept: 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    body: form
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Unggah foto gagal (${response.status})`);
  }
  return response.json();
}

export async function completeSale(payload: PaymentPayload): Promise<{ invoice: string; total: number }> {
  if (!baseUrl) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const invoice = `DEMO-${Date.now().toString().slice(-8)}`;
    const total = payload.lines.reduce((sum, line) => sum + line.qty * line.price - line.discount, 0);
    const customer = demoCustomers.find(c => c.id === payload.customerId);
    const method = demoPaymentMethods.find(m => m.code === payload.paymentMethod);
    demoSalePayments.push({ saleId: invoice, methodCode: method?.code ?? payload.paymentMethod, methodName: method?.name ?? payload.paymentMethod, amount: total, reference: payload.paymentRef, createdAt: new Date().toISOString() });
    demoSalesLog.unshift({
      id: crypto.randomUUID(),
      invoice,
      customerId: payload.customerId,
      customerName: customer?.name ?? 'Pelanggan Umum',
      lines: payload.lines.map(line => ({ productId: line.productId, productName: demoProducts.find(p => p.id === line.productId)?.name ?? line.productId, unit: line.unit, qty: line.qty, price: line.price, discount: line.discount })),
      total,
      paid: payload.paid,
      change: Math.max(0, payload.paid - total),
      createdAt: new Date().toISOString()
    });
    return { invoice, total };
  }
  return request('/sales', { method: 'POST', headers: { 'Idempotency-Key': payload.idempotencyKey }, body: JSON.stringify(payload) });
}

export async function exchangeSale(oldInvoice: string, payload: ExchangePayload): Promise<ExchangeResult> {
  if (!baseUrl) {
    await new Promise(resolve => setTimeout(resolve, 250));
    const oldSale = demoSalesLog.find(s => s.invoice === oldInvoice);
    if (!oldSale) throw new Error('Transaksi asli tidak ditemukan.');
    const oldLine = oldSale.lines.find(l => l.productId === payload.oldProductId && l.unit === payload.oldUnit);
    if (!oldLine) throw new Error('Barang tidak ditemukan di transaksi ini.');
    if (payload.oldQty > oldLine.qty) throw new Error('Jumlah tukar melebihi jumlah yang dibeli.');
    const oldUnitNet = (oldLine.qty * oldLine.price - oldLine.discount) / oldLine.qty;
    const oldLineValue = Math.round(oldUnitNet * payload.oldQty * 100) / 100;

    const oldProduct = demoProducts.find(p => p.id === payload.oldProductId);
    if (oldProduct) oldProduct.stock += payload.oldQty;
    const newProduct = demoProducts.find(p => p.id === payload.newProductId);
    if (!newProduct) throw new Error('Barang pengganti tidak ditemukan.');
    if (newProduct.stock < payload.newQty) throw new Error(`Stok ${newProduct.name} tidak cukup.`);
    newProduct.stock -= payload.newQty;

    const newDiscount = payload.newDiscount ?? 0;
    const newLineValue = Math.round((payload.newQty * payload.newPrice - newDiscount) * 100) / 100;
    const diff = Math.round((newLineValue - oldLineValue) * 100) / 100;
    const method = demoPaymentMethods.find(m => m.code === payload.paymentMethod);
    const newInvoice = `DEMO-${Date.now().toString().slice(-8)}`;

    // amount is the SIGNED diff (never clamped to 0) — negative when kembalian is handed back, so
    // a per-method cash sum nets out correctly instead of overstating what the store actually kept.
    demoSalePayments.push({ saleId: newInvoice, methodCode: method?.code ?? payload.paymentMethod, methodName: method?.name ?? payload.paymentMethod, amount: diff, reference: payload.paymentRef, createdAt: new Date().toISOString() });
    demoSalesLog.unshift({
      id: crypto.randomUUID(), invoice: newInvoice, customerId: oldSale.customerId, customerName: oldSale.customerName,
      lines: [{ productId: payload.newProductId, productName: newProduct.name, unit: payload.newUnit, qty: payload.newQty, price: payload.newPrice, discount: newDiscount }],
      total: newLineValue, paid: newLineValue, change: 0, createdAt: new Date().toISOString(),
    });
    demoStockMovements.push({ id: crypto.randomUUID(), productId: payload.oldProductId, productName: oldProduct?.name ?? payload.oldProductId, type: 'sales-return', qty: payload.oldQty, reference: oldInvoice, note: payload.reason || `Tukar ke ${newProduct.name}`, createdAt: new Date().toISOString() });
    oldSale.exchanges = [...(oldSale.exchanges ?? []), { oldProductId: payload.oldProductId, oldUnit: payload.oldUnit, oldQty: payload.oldQty, oldLineValue, newInvoice, newProductName: newProduct.name }];

    return { newInvoice, oldInvoice, total: newLineValue, diff };
  }
  return request(`/sales/${oldInvoice}/exchange`, { method: 'POST', headers: { 'Idempotency-Key': payload.idempotencyKey }, body: JSON.stringify(payload) });
}

export async function listSales(): Promise<SaleRecord[]> {
  if (!baseUrl) {
    // Enriched from current demoProducts stock, same projection SaleController::index() does.
    return demoSalesLog.map(sale => ({
      ...sale,
      cashierName: sale.customerId === 'general' ? 'Kasir Demo' : 'Admin Toko',
      methodName: demoSalePayments.find(p => p.saleId === sale.invoice)?.methodName,
      exchanges: sale.exchanges,
      lines: sale.lines.map(line => {
        const stockAfter = demoProducts.find(p => p.id === line.productId)?.stock ?? 0;
        return { ...line, stockAfter, stockBefore: stockAfter + line.qty };
      }),
    }));
  }
  return request('/sales');
}

// Active payment methods for checkout (cashier-facing, gated pos:read on the API).
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  if (!baseUrl) return demoPaymentMethods.filter(m => m.active).sort((a, b) => a.sortOrder - b.sortOrder);
  return request('/payment-methods');
}

// All payment methods incl. inactive — for the Pengaturan admin screen (gated settings:read).
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  if (!baseUrl) return [...demoPaymentMethods].sort((a, b) => a.sortOrder - b.sortOrder);
  return request('/settings/payment-methods');
}

export async function savePaymentMethod(input: { id?: string; code: string; name: string; type: PaymentMethodType; legacyKasCode?: string | null; active: boolean; sortOrder: number }): Promise<PaymentMethod> {
  if (!baseUrl) {
    const code = input.code.trim().toUpperCase();
    if (!code) throw new Error('Kode metode wajib diisi.');
    if (!input.name.trim()) throw new Error('Nama metode wajib diisi.');
    const clash = demoPaymentMethods.find(m => m.code === code && m.id !== input.id);
    if (clash) throw new Error('Kode metode sudah dipakai.');
    if (input.id) {
      const method = demoPaymentMethods.find(m => m.id === input.id);
      if (!method) throw new Error('Metode pembayaran tidak ditemukan');
      Object.assign(method, { code, name: input.name, type: input.type, legacyKasCode: input.legacyKasCode || null, active: input.active, sortOrder: input.sortOrder });
      logAudit('payment-method-update', `Metode pembayaran diperbarui: ${method.name} (${method.code}).`);
      return method;
    }
    const method: PaymentMethod = { id: crypto.randomUUID(), code, name: input.name, type: input.type, legacyKasCode: input.legacyKasCode || null, active: input.active, sortOrder: input.sortOrder };
    demoPaymentMethods.push(method);
    logAudit('payment-method-update', `Metode pembayaran ditambahkan: ${method.name} (${method.code}).`);
    return method;
  }
  return request(`/settings/payment-methods${input.id ? `/${input.id}` : ''}`, { method: input.id ? 'PUT' : 'POST', body: JSON.stringify(input) });
}

export async function deletePaymentMethod(id: string): Promise<void> {
  if (!baseUrl) {
    const index = demoPaymentMethods.findIndex(m => m.id === id);
    if (index < 0) throw new Error('Metode pembayaran tidak ditemukan');
    const [removed] = demoPaymentMethods.splice(index, 1);
    logAudit('payment-method-update', `Metode pembayaran dihapus: ${removed.name} (${removed.code}).`);
    return;
  }
  await request(`/settings/payment-methods/${id}`, { method: 'DELETE' });
}

// Per-payment-method revenue recap for one day (defaults to today).
export async function getDailyRecap(date?: string): Promise<DailyRecap> {
  const day = date ?? new Date().toISOString().slice(0, 10);
  if (!baseUrl) return buildDailyRecap(day, demoSalesLog, demoSalePayments);
  return request(`/reports/daily?date=${encodeURIComponent(day)}`);
}

export async function listSuppliers(query = ''): Promise<Supplier[]> {
  if (!baseUrl) {
    const q = query.trim().toLowerCase();
    return demoSuppliers.filter(s => !q || [s.name, s.code].some(value => value.toLowerCase().includes(q)));
  }
  return request(`/suppliers?search=${encodeURIComponent(query)}`);
}

export async function listPurchaseOrders(query = ''): Promise<PurchaseOrder[]> {
  if (!baseUrl) {
    const q = query.trim().toLowerCase();
    return demoPurchaseOrders.filter(po => !q || po.reference.toLowerCase().includes(q));
  }
  return request(`/purchase-orders?search=${encodeURIComponent(query)}`);
}

// po.id is empty for a brand-new PO: the legacy 'kode' primary key is assigned server-side
// (PurchaseOrderController::nextCode) so it stays consistent with the pre-existing 'R21-DDMMYY###'
// rows instead of adopting a client-generated value. It's only ever non-empty here when saving
// an update to a PO that a prior save already gave a real server-assigned id.
export async function savePurchaseOrder(po: PurchaseOrder, idempotencyKey = crypto.randomUUID()): Promise<PurchaseOrder> {
  if (!baseUrl) {
    const id = po.id || crypto.randomUUID();
    const saved = { ...po, id };
    const index = demoPurchaseOrders.findIndex(p => p.id === id);
    if (index >= 0) demoPurchaseOrders[index] = saved; else demoPurchaseOrders.push(saved);
    return saved;
  }
  return request(`/purchase-orders${po.id ? `/${po.id}` : ''}`, { method: po.id ? 'PUT' : 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(po) });
}

export async function receiveGoods(poId: string, lines: { productId: string; qty: number }[], idempotencyKey = crypto.randomUUID()): Promise<PurchaseOrder> {
  if (!baseUrl) {
    const po = demoPurchaseOrders.find(p => p.id === poId);
    if (!po) throw new Error('PO tidak ditemukan');
    po.lines = applyReceipt(po.lines, lines);
    po.status = poStatusAfterReceipt(po.lines);
    lines.filter(line => line.qty > 0).forEach(line => {
      const product = demoProducts.find(p => p.id === line.productId);
      const poLine = po.lines.find(l => l.productId === line.productId);
      if (product) product.stock += line.qty;
      demoStockMovements.unshift({ id: crypto.randomUUID(), productId: line.productId, productName: product?.name ?? poLine?.productName ?? '', type: 'purchase-receipt', qty: line.qty, reference: po.reference, createdAt: new Date().toISOString() });
    });
    return po;
  }
  return request(`/purchase-orders/${poId}/receive`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ lines }) });
}

export async function saveReturn(doc: ReturnDoc): Promise<ReturnDoc> {
  if (!baseUrl) {
    doc.lines.forEach(line => {
      const signedQty = signedReturnQty(doc.kind, line.qty);
      const product = demoProducts.find(p => p.id === line.productId);
      if (product) product.stock += signedQty;
      demoStockMovements.unshift({ id: crypto.randomUUID(), productId: line.productId, productName: line.productName, type: doc.kind === 'purchase' ? 'purchase-return' : 'sales-return', qty: signedQty, reference: doc.reference, note: doc.reason, createdAt: doc.createdAt });
    });
    return doc;
  }
  return request('/returns', { method: 'POST', headers: { 'Idempotency-Key': doc.id }, body: JSON.stringify(doc) });
}

export async function listStockMovements(productId = ''): Promise<StockMovement[]> {
  if (!baseUrl) return productId ? demoStockMovements.filter(m => m.productId === productId) : demoStockMovements;
  return request(`/stock-movements${productId ? `?productId=${productId}` : ''}`);
}

export async function adjustStock(input: { productId: string; qty: number; reason: string; note?: string }, idempotencyKey = crypto.randomUUID()): Promise<StockMovement> {
  if (!baseUrl) {
    const product = demoProducts.find(p => p.id === input.productId);
    if (!product) throw new Error('Barang tidak ditemukan');
    product.stock += input.qty;
    const movement: StockMovement = { id: crypto.randomUUID(), productId: product.id, productName: product.name, type: 'adjustment', qty: input.qty, reference: `ADJ-${Date.now().toString().slice(-6)}`, note: input.note ? `${input.reason} — ${input.note}` : input.reason, createdAt: new Date().toISOString() };
    demoStockMovements.unshift(movement);
    return movement;
  }
  return request('/stock-adjustments', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) });
}

export async function listCashEntries(): Promise<CashLedgerEntry[]> {
  if (!baseUrl) return demoCashEntries;
  return request('/finance/cash-entries');
}

export async function addCashEntry(input: { direction: CashDirection; amount: number; category: string; note?: string; fundingSource?: CashFundingSource }, idempotencyKey = crypto.randomUUID()): Promise<CashLedgerEntry> {
  if (!baseUrl) {
    const previousBalance = demoCashEntries.at(-1)?.balanceAfter ?? 0;
    const entry: CashLedgerEntry = { id: crypto.randomUUID(), direction: input.direction, amount: input.amount, category: input.category, note: input.note, fundingSource: input.direction === 'out' ? input.fundingSource : undefined, balanceAfter: nextCashBalance(previousBalance, input.direction, input.amount), createdAt: new Date().toISOString() };
    demoCashEntries.push(entry);
    return entry;
  }
  return request('/finance/cash-entries', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) });
}

export async function listPayables(): Promise<Payable[]> {
  if (!baseUrl) return demoPayables;
  return request('/finance/payables');
}

export async function addPayablePayment(payableId: string, amount: number, note?: string, idempotencyKey = crypto.randomUUID()): Promise<Payable> {
  if (!baseUrl) {
    const payable = demoPayables.find(p => p.id === payableId);
    if (!payable) throw new Error('Hutang tidak ditemukan');
    const capped = capPayment(payableOutstanding(payable), amount);
    if (capped <= 0) throw new Error('Jumlah pembayaran tidak valid');
    payable.payments.push({ id: crypto.randomUUID(), amount: capped, note, createdAt: new Date().toISOString() });
    return payable;
  }
  return request(`/finance/payables/${payableId}/payments`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ amount, note }) });
}

export async function listReceivables(): Promise<Receivable[]> {
  if (!baseUrl) return demoReceivables;
  return request('/finance/receivables');
}

export async function createReceivable(customerId: string, amount: number, note?: string, idempotencyKey = crypto.randomUUID()): Promise<Receivable> {
  if (!baseUrl) {
    const customer = demoCustomers.find(c => c.id === customerId);
    if (!customer) throw new Error('Pelanggan tidak ditemukan');
    const receivable: Receivable = { id: crypto.randomUUID(), customerId, customerName: customer.name, reference: `MAN-${Date.now().toString().slice(-8)}`, amount, payments: [], createdAt: new Date().toISOString() };
    demoReceivables.push(receivable);
    return receivable;
  }
  return request('/finance/receivables', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ customerId, amount, note }) });
}

export async function addReceivablePayment(receivableId: string, amount: number, note?: string, idempotencyKey = crypto.randomUUID()): Promise<Receivable> {
  if (!baseUrl) {
    const receivable = demoReceivables.find(r => r.id === receivableId);
    if (!receivable) throw new Error('Piutang tidak ditemukan');
    const capped = capPayment(receivableOutstanding(receivable), amount);
    if (capped <= 0) throw new Error('Jumlah pembayaran tidak valid');
    receivable.payments.push({ id: crypto.randomUUID(), amount: capped, note, createdAt: new Date().toISOString() });
    return receivable;
  }
  return request(`/finance/receivables/${receivableId}/payments`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify({ amount, note }) });
}

export async function listInstruments(): Promise<PaymentInstrument[]> {
  if (!baseUrl) return demoInstruments;
  return request('/finance/instruments');
}

export async function addInstrument(input: { kind: InstrumentKind; reference: string; amount: number; note?: string }, idempotencyKey = crypto.randomUUID()): Promise<PaymentInstrument> {
  if (!baseUrl) {
    const instrument: PaymentInstrument = { id: crypto.randomUUID(), kind: input.kind, reference: input.reference, amount: input.amount, note: input.note, status: 'pending', createdAt: new Date().toISOString() };
    demoInstruments.unshift(instrument);
    return instrument;
  }
  return request('/finance/instruments', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input) });
}

export async function updateInstrumentStatus(instrumentId: string, status: InstrumentStatus): Promise<PaymentInstrument> {
  if (!baseUrl) {
    const instrument = demoInstruments.find(i => i.id === instrumentId);
    if (!instrument) throw new Error('Instrumen tidak ditemukan');
    if (!canTransitionInstrument(instrument.status, status)) throw new Error('Perubahan status tidak diizinkan');
    instrument.status = status;
    if (status === 'cleared') instrument.clearedAt = new Date().toISOString();
    return instrument;
  }
  return request(`/finance/instruments/${instrumentId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

export async function listEmployees(query = ''): Promise<Employee[]> {
  if (!baseUrl) {
    const q = query.trim().toLowerCase();
    return demoEmployees.filter(e => !q || [e.name, e.role].some(value => value.toLowerCase().includes(q)));
  }
  return request(`/hrd/employees?search=${encodeURIComponent(query)}`);
}

export async function listShiftDefs(): Promise<ShiftDef[]> {
  if (!baseUrl) return demoShiftDefs;
  return request('/hrd/shifts');
}

export async function listShiftAssignments(): Promise<ShiftAssignment[]> {
  if (!baseUrl) return demoShiftAssignments;
  return request('/hrd/shift-assignments');
}

export async function saveShiftAssignment(input: { employeeId: string; shiftId: string; date: string }): Promise<ShiftAssignment> {
  if (!baseUrl) {
    const employee = demoEmployees.find(e => e.id === input.employeeId);
    if (!employee) throw new Error('Karyawan tidak ditemukan');
    const assignment: ShiftAssignment = { id: crypto.randomUUID(), employeeId: input.employeeId, employeeName: employee.name, shiftId: input.shiftId, date: input.date };
    demoShiftAssignments.push(assignment);
    return assignment;
  }
  return request('/hrd/shift-assignments', { method: 'POST', body: JSON.stringify(input) });
}

export async function listAttendanceEntries(): Promise<AttendanceEntry[]> {
  if (!baseUrl) return demoAttendanceEntries;
  return request('/hrd/attendance');
}

export async function saveAttendanceEntry(input: { employeeId: string; date: string; checkIn: string; checkOut?: string }): Promise<AttendanceEntry> {
  if (!baseUrl) {
    const employee = demoEmployees.find(e => e.id === input.employeeId);
    if (!employee) throw new Error('Karyawan tidak ditemukan');
    const shift = findScheduledShift(demoShiftAssignments, demoShiftDefs, input.employeeId, input.date);
    const entry: AttendanceEntry = { id: crypto.randomUUID(), employeeId: input.employeeId, employeeName: employee.name, date: input.date, checkIn: input.checkIn, checkOut: input.checkOut, status: computeAttendanceStatus(input.checkIn, input.checkOut, shift) };
    demoAttendanceEntries.push(entry);
    return entry;
  }
  return request('/hrd/attendance', { method: 'POST', body: JSON.stringify(input) });
}

export async function listLeaveRequests(): Promise<LeaveRequest[]> {
  if (!baseUrl) return demoLeaveRequests;
  return request('/hrd/leave-requests');
}

export async function saveLeaveRequest(input: { employeeId: string; type: LeaveType; startDate: string; endDate: string; hours?: number; reason?: string }): Promise<LeaveRequest> {
  if (!baseUrl) {
    const employee = demoEmployees.find(e => e.id === input.employeeId);
    if (!employee) throw new Error('Karyawan tidak ditemukan');
    const leaveRequest: LeaveRequest = { id: crypto.randomUUID(), employeeId: input.employeeId, employeeName: employee.name, type: input.type, startDate: input.startDate, endDate: input.endDate, hours: input.hours, reason: input.reason, status: 'diajukan', createdAt: new Date().toISOString() };
    demoLeaveRequests.unshift(leaveRequest);
    return leaveRequest;
  }
  return request('/hrd/leave-requests', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateLeaveRequestStatus(leaveId: string, status: LeaveStatus): Promise<LeaveRequest> {
  if (!baseUrl) {
    const leave = demoLeaveRequests.find(l => l.id === leaveId);
    if (!leave) throw new Error('Pengajuan tidak ditemukan');
    leave.status = status;
    return leave;
  }
  return request(`/hrd/leave-requests/${leaveId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

// Records an entry in the in-memory demo audit log (settings changes, backups, test prints).
// Kept minimal by design — existing modules' api.ts functions are not retrofitted to log here.
function logAudit(action: AuditAction, description: string, actor = 'Kasir Demo') {
  demoAuditLog.unshift({ id: crypto.randomUUID(), action, description, actor, createdAt: new Date().toISOString() });
}

export async function getStoreProfile(): Promise<StoreProfile> {
  if (!baseUrl) return demoStoreProfile;
  return request('/settings/store-profile');
}

export async function saveStoreProfile(profile: StoreProfile): Promise<StoreProfile> {
  if (!baseUrl) {
    const errors = validateStoreProfile(profile);
    if (errors.length) throw new Error(errors[0]);
    Object.assign(demoStoreProfile, profile);
    logAudit('store-profile-update', `Profil toko & struk diperbarui: ${profile.name}`);
    return demoStoreProfile;
  }
  return request('/settings/store-profile', { method: 'PUT', body: JSON.stringify(profile) });
}

export async function listUserAccounts(): Promise<UserAccount[]> {
  if (!baseUrl) return demoUserAccounts;
  return request('/settings/users');
}

export async function saveUserAccount(input: { id?: string; name: string; username: string; role: UserRole; active: boolean; password?: string }): Promise<UserAccount> {
  if (!baseUrl) {
    if (!input.name.trim() || !input.username.trim()) throw new Error('Nama dan username wajib diisi.');
    if (!input.id && (!input.password || input.password.length < 6)) throw new Error('Password minimal 6 karakter.');
    if (input.id) {
      const account = demoUserAccounts.find(u => u.id === input.id);
      if (!account) throw new Error('Pengguna tidak ditemukan');
      Object.assign(account, { name: input.name, username: input.username, role: input.role, active: input.active });
      logAudit('user-account-update', `Pengguna diperbarui: ${account.name} (${account.role}).`);
      return account;
    }
    const account: UserAccount = { id: crypto.randomUUID(), name: input.name, username: input.username, role: input.role, active: input.active };
    demoUserAccounts.push(account);
    logAudit('user-account-update', `Pengguna baru ditambahkan: ${account.name} (${account.role}).`);
    return account;
  }
  return request(`/settings/users${input.id ? `/${input.id}` : ''}`, { method: input.id ? 'PUT' : 'POST', body: JSON.stringify(input) });
}

export async function getRolePermissions(): Promise<RolePermissions> {
  if (!baseUrl) return demoRolePermissions;
  return request('/settings/role-permissions');
}

export async function saveRolePermissions(permissions: RolePermissions): Promise<RolePermissions> {
  if (!baseUrl) {
    Object.assign(demoRolePermissions, permissions);
    logAudit('user-account-update', 'Hak akses per peran diperbarui.');
    return demoRolePermissions;
  }
  return request('/settings/role-permissions', { method: 'PUT', body: JSON.stringify(permissions) });
}

export async function getPrinterConfig(): Promise<PrinterConfig> {
  if (!baseUrl) return demoPrinterConfig;
  return request('/settings/printer');
}

export async function savePrinterConfig(config: PrinterConfig): Promise<PrinterConfig> {
  if (!baseUrl) {
    if (!config.name.trim()) throw new Error('Nama printer wajib diisi.');
    Object.assign(demoPrinterConfig, config);
    logAudit('printer-config-update', `Konfigurasi printer diperbarui: ${config.name} (${config.connection.toUpperCase()}, ${config.paperWidth}).`);
    return demoPrinterConfig;
  }
  return request('/settings/printer', { method: 'PUT', body: JSON.stringify(config) });
}

// Simulates a thermal test print by routing a sample receipt through the real print.ts preview
// flow (popup print dialog in demo mode) — no hardware is contacted.
export async function testPrint(): Promise<void> {
  if (!baseUrl) {
    openReceiptPreviewPopup({ invoice: 'TES-CETAK', customer: demoCustomers[0], lines: [], paid: 0, total: 0 }, demoStoreProfile, demoPrinterConfig.paperWidth);
    logAudit('test-print', `Tes cetak dikirim ke printer "${demoPrinterConfig.name}".`);
    return;
  }
  await request('/settings/printer/test-print', { method: 'POST' });
}

export async function listAuditLog(): Promise<AuditLogEntry[]> {
  if (!baseUrl) return demoAuditLog;
  return request('/settings/audit-log');
}

// Simulated no-op backup — demo mode never writes to a real database.
export async function backupNow(): Promise<{ createdAt: string }> {
  if (!baseUrl) {
    const createdAt = new Date().toISOString();
    logAudit('backup', 'Backup manual disimulasikan (mode demo, tidak menulis ke database).');
    return { createdAt };
  }
  return request('/settings/backup', { method: 'POST' });
}
