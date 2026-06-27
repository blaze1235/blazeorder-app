
export type UserRole = 'buyer' | 'manager' | 'fulfillment' | 'driver' | 'distributor';
export type StaffRole = 'owner' | 'manager' | 'fulfillment' | 'finance' | 'driver';
export type Language = 'en' | 'ru' | 'uz';

export type Permission = 
  | 'view_orders' | 'process_orders' | 'edit_products' | 'manage_inventory' 
  | 'view_financials' | 'manage_team' | 'manage_logistics' | 'request_payouts'
  | 'edit_prices' | 'assign_drivers';

export type ScreenType = 
  | 'home' | 'create-order' | 'product-list' | 'orders' | 'order-detail' | 'wallet' | 'profile' | 'order-review' | 'templates'
  | 'distributor-dashboard' | 'incoming-orders' | 'distributor-products' | 'distributor-wallet' 
  | 'distributor-logistics' | 'distributor-analytics' | 'distributor-team' | 'distributor-settings'
  | 'working-hours' | 'delivery-zones' | 'full-analytics'
  | 'cart' | 'notifications';

export interface WorkingHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  minOrder: number;
  fee: number;
  isActive: boolean;
  estTime: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  permissions: Permission[];
  status: 'active' | 'offline';
  lastActive: string;
  ordersHandled?: number;
  avgTime?: string;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  image: string;
  deliveryTime: string;
  isOpen: boolean;
  cutOffTime?: string;
  successRate: number;
  isVerified: boolean;
  complianceStatus: 'verified' | 'pending' | 'expired';
  workingHours: WorkingHours[];
  deliveryZones: DeliveryZone[];
  capacityLimit: number;
  currentOrderCount: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  description: string;
  category: string;
  supplierId: string;
  stockLevel: number;
  reservedStock: number;
  isActive: boolean;
  minOrderQty: number;
  maxOrderQty?: number;
  lowStockAlert: number;
  substituteId?: string;
  deliveryRestricted?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderTimeline {
  status: string;
  time: string;
  completed: boolean;
  author?: string;
  note?: string;
}

export interface Order {
  id: string;
  date: string;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'completed' | 'cancelled';
  declineReason?: string;
  cancelReason?: string;
  total: number;
  items: CartItem[];
  supplierName: string;
  buyerName?: string;
  buyerRating?: number;
  timeline: OrderTimeline[];
  isCreditPayment?: boolean;
  isPriority?: boolean;
  slaDeadline?: string; 
  deliveryMethod?: 'own-courier' | 'platform' | 'pickup';
  driverId?: string;
  driverName?: string;
  zoneId?: string;
  internalNotes?: string;
  sessionId?: string;
  clientChatId?: string;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'top-up' | 'order-payment' | 'credit-repayment' | 'payout' | 'earnings' | 'withdraw';
  status: 'completed' | 'pending';
  fee?: number;
  tax?: number;
}

export interface OrderTemplate {
  id: string;
  name: string;
  items: CartItem[];
  supplierId: string;
  supplierName: string;
}

// Fixed: added roleTarget property to interface to match usage in App.tsx line 131
export interface AppNotification {
  id: string;
  orderId?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  isRead: boolean;
  createdAt: string;
  roleTarget?: UserRole[];
}
