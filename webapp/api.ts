const BASE_URL = "https://blazeorder-api-production.up.railway.app/api";

// ── In-memory cache to avoid hammering Sheets on every request ────────────────
const cache: Record<string, { data: any; ts: number }> = {};
const CACHE_TTL: Record<string, number> = {
  products:  60_000,   // 60s — products change infrequently
  suppliers: 120_000,  // 2min
  orders:    15_000,   // 15s — orders need to be fresher
  clients:   120_000,
  staff:     60_000,
  stats:     30_000,
};

async function apiFetch<T>(path: string, options?: RequestInit, cacheKey?: string): Promise<T> {
  if (cacheKey && !options) {
    const cached = cache[cacheKey];
    const ttl    = CACHE_TTL[cacheKey] || 30_000;
    if (cached && Date.now() - cached.ts < ttl) return cached.data as T;
  }
  const res  = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" }, ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API error");
  if (cacheKey && !options) cache[cacheKey] = { data: json.data, ts: Date.now() };
  return json.data as T;
}

export function invalidateCache(key: string) {
  delete cache[key];
}

// ── TYPES ─────────────────────────────────────────────────────────────────────
export interface ClientProfile {
  client_id: string; chat_id: string; name: string;
  institution: string; address: string; phone: string;
  registered: string; latitude: string; longitude: string;
}

export interface AccountProfile {
  account_id: string; type: 'supplier' | 'owner';
  linked_name: string; username: string; status: string;
}

export interface SheetStaffMember {
  id: string; name: string; role: string; status: 'active' | 'offline';
  lastActive: string; ordersHandled: number; avgTime: string;
  telegramId: string; permissions: string; supplierName: string;
}

export interface SupplierStats {
  name: string; totalOrders: number; completedOrders: number;
  cancelledOrders: number; fulfillmentRate: number; revenue: number;
  productCount: number; staffCount: number; lowStockCount: number;
  activeStaff: number;
}

export interface SheetProduct {
  id: string; name: string; price: number; unit: string;
  supplier: string; supplierId: string; category: string;
  available: boolean; isActive: boolean; description: string;
  image: string; stockLevel: number; reservedStock: number;
  minOrderQty: number; lowStockAlert: number; group_chat_id: string;
}

export interface SheetOrder {
  id: string; date: string; status: string; total: number;
  supplierName: string; buyerName: string; clientChatId: string;
  address: string; sessionId: string; latitude: string; longitude: string;
  paymentMethod: string; declineReason: string; driverName: string;
  items: Array<{ id: string; name: string; price: number; quantity: number; category?: string }>;
  timeline: Array<{ status: string; time: string; completed: boolean; author?: string }>;
}

export interface SheetClient {
  chat_id: string; name: string; institution: string;
  address: string; phone: string; registered: string;
  latitude: string; longitude: string;
}

// ── HEALTH ────────────────────────────────────────────────────────────────────
export async function checkApiHealth(): Promise<boolean> {
  try { const r = await fetch(`${BASE_URL}/health`); return (await r.json()).success === true; }
  catch { return false; }
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
export async function lookupClient(p: { chat_id?: string; phone?: string }): Promise<ClientProfile | null> {
  const q   = p.chat_id ? `chat_id=${encodeURIComponent(p.chat_id)}` : `phone=${encodeURIComponent(p.phone||"")}`;
  const res = await fetch(`${BASE_URL}/clients/lookup?${q}`);
  const j   = await res.json();
  if (!j.success) throw new Error(j.error);
  return j.data;
}

export interface RegisterPayload {
  name: string; institution: string; phone: string;
  address: string; chat_id?: string; latitude?: string; longitude?: string;
}
export async function registerClient(payload: RegisterPayload): Promise<ClientProfile> {
  const r = await fetch(`${BASE_URL}/clients/register`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || "Registration failed");
  return j.data;
}

export async function loginAccount(username: string, password: string): Promise<AccountProfile> {
  const r = await fetch(`${BASE_URL}/accounts/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || "Invalid credentials");
  return j.data;
}

// ── STAFF ──────────────────────────────────────────────────────────────────────
export async function fetchStaff(supplierName?: string): Promise<SheetStaffMember[]> {
  const q   = supplierName ? `?supplier_name=${encodeURIComponent(supplierName)}` : "";
  const key = `staff_${supplierName || 'all'}`;
  return apiFetch<SheetStaffMember[]>(`/staff${q}`, undefined, key);
}
export async function addStaffMember(member: Partial<SheetStaffMember> & { supplierName: string }): Promise<string> {
  const r = await fetch(`${BASE_URL}/staff`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(member),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error);
  invalidateCache(`staff_${member.supplierName}`);
  return j.staff_id;
}
export async function updateStaffStatus(staffId: string, status: 'active' | 'offline'): Promise<void> {
  await fetch(`${BASE_URL}/staff/${staffId}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
  });
}
export async function removeStaffMember(staffId: string): Promise<void> {
  await fetch(`${BASE_URL}/staff/${staffId}`, { method: "DELETE" });
}

// ── SUPPLIER STATS ─────────────────────────────────────────────────────────────
export async function fetchSupplierStats(): Promise<SupplierStats[]> {
  return apiFetch<SupplierStats[]>("/suppliers/stats", undefined, "stats");
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export async function fetchProducts(): Promise<SheetProduct[]> {
  return apiFetch<SheetProduct[]>("/products", undefined, "products");
}
export async function updateProduct(productId: string, changes: Partial<SheetProduct>): Promise<void> {
  await fetch(`${BASE_URL}/products/${productId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes),
  });
  invalidateCache("products");
}
export async function addProduct(product: Partial<SheetProduct> & { supplier: string }): Promise<string> {
  const r = await fetch(`${BASE_URL}/products`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product),
  });
  invalidateCache("products");
  return (await r.json()).product_id;
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
export async function fetchOrders(): Promise<SheetOrder[]> {
  return apiFetch<SheetOrder[]>("/orders", undefined, "orders");
}
export async function fetchOrdersBySupplier(supplierName: string): Promise<SheetOrder[]> {
  const key = `orders_${supplierName}`;
  return apiFetch<SheetOrder[]>(`/orders?supplier=${encodeURIComponent(supplierName)}`, undefined, key);
}

export interface PlaceOrderPayload {
  id: string; date: string; buyerName: string; clientChatId?: string;
  supplierName: string; total: number; address?: string;
  isCreditPayment: boolean; sessionId: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  latitude?: string; longitude?: string;
}
export async function placeOrder(order: PlaceOrderPayload): Promise<void> {
  const r = await fetch(`${BASE_URL}/orders`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(order),
  });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || "Failed to place order");
  invalidateCache("orders");
  invalidateCache(`orders_${order.supplierName}`);
}
export async function updateOrderStatus(orderId: string, status: string, driverName?: string, reason?: string): Promise<void> {
  await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, driverName, reason }),
  });
  invalidateCache("orders");
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
export async function fetchClients(): Promise<SheetClient[]> {
  return apiFetch<SheetClient[]>("/clients", undefined, "clients");
}

// ── SUPPLIERS (needed by CreateOrder.tsx) ─────────────────────────────────────
export interface SheetSupplier {
  id: string; name: string; category: string; categories: string[];
  group_chat_id: string; rating: number; image: string;
  deliveryTime: string; isOpen: boolean; successRate: number;
  isVerified: boolean; complianceStatus: 'verified' | 'pending' | 'expired';
  workingHours: []; deliveryZones: []; capacityLimit: number; currentOrderCount: number;
}

export async function fetchSuppliers(): Promise<SheetSupplier[]> {
  return apiFetch<SheetSupplier[]>("/suppliers", undefined, "suppliers");
}
