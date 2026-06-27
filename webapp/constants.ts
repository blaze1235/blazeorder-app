
import { Supplier, Product, Order, Transaction, OrderTemplate, StaffMember, DeliveryZone, WorkingHours } from './types';

export const MOCK_WORKING_HOURS: WorkingHours[] = [
  { day: 'Monday', open: '09:00', close: '21:00', isOpen: true },
  { day: 'Tuesday', open: '09:00', close: '21:00', isOpen: true },
  { day: 'Wednesday', open: '09:00', close: '21:00', isOpen: true },
  { day: 'Thursday', open: '09:00', close: '21:00', isOpen: true },
  { day: 'Friday', open: '09:00', close: '23:00', isOpen: true },
  { day: 'Saturday', open: '10:00', close: '22:00', isOpen: true },
  { day: 'Sunday', open: '10:00', close: '18:00', isOpen: true },
];

export const MOCK_ZONES: DeliveryZone[] = [
  { id: 'z1', name: 'Downtown Core', minOrder: 25, fee: 2, isActive: true, estTime: '20-30m' },
  { id: 'z2', name: 'West End', minOrder: 50, fee: 5, isActive: true, estTime: '45-60m' },
  { id: 'z3', name: 'Industrial Park', minOrder: 150, fee: 0, isActive: false, estTime: '2h' },
];

export const MOCK_STAFF: StaffMember[] = [
  { 
    id: 'u1', 
    name: 'Sarah Wilson', 
    role: 'owner', 
    permissions: ['view_orders', 'process_orders', 'edit_products', 'manage_inventory', 'view_financials', 'manage_team', 'manage_logistics', 'request_payouts'],
    status: 'active',
    lastActive: 'Just now',
    ordersHandled: 124,
    avgTime: '15m'
  },
  { 
    id: 'u2', 
    name: 'Mike Johnson', 
    role: 'manager', 
    permissions: ['view_orders', 'process_orders', 'edit_products', 'manage_inventory', 'manage_logistics', 'assign_drivers'],
    status: 'active',
    lastActive: '5m ago',
    ordersHandled: 85,
    avgTime: '18m'
  },
  { 
    id: 'u3', 
    name: 'Alex Chen', 
    role: 'fulfillment', 
    permissions: ['view_orders', 'process_orders', 'manage_inventory'],
    status: 'offline',
    lastActive: '2h ago',
    ordersHandled: 450,
    avgTime: '12m'
  },
  {
    id: 'u4',
    name: 'David Jones',
    role: 'driver',
    permissions: ['view_orders', 'process_orders', 'manage_logistics'],
    status: 'active',
    lastActive: '1m ago',
    ordersHandled: 65,
    avgTime: '24m'
  },
  {
    id: 'u5',
    name: 'Marco Rossi',
    role: 'driver',
    permissions: ['view_orders', 'process_orders', 'manage_logistics'],
    status: 'offline',
    lastActive: '1d ago',
    ordersHandled: 210,
    avgTime: '22m'
  }
];

export const SUPPLIERS: Supplier[] = [
  { 
    id: 's1', 
    name: 'Global Foods', 
    category: 'Grocery', 
    rating: 4.8, 
    image: 'https://picsum.photos/seed/food/200/200', 
    deliveryTime: '30-45 min',
    isOpen: true,
    cutOffTime: '17:30',
    successRate: 99.2,
    isVerified: true,
    complianceStatus: 'verified',
    workingHours: MOCK_WORKING_HOURS,
    deliveryZones: MOCK_ZONES,
    capacityLimit: 100,
    currentOrderCount: 42
  }
];

export const PRODUCTS: Product[] = [
  { 
    id: 'p1', 
    name: 'Organic Milk', 
    price: 4.50, 
    originalPrice: 4.80, 
    category: 'Dairy', 
    supplierId: 's1', 
    image: 'https://picsum.photos/seed/milk/300/300', 
    description: 'Fresh organic milk from local farms.', 
    stockLevel: 45,
    reservedStock: 5,
    isActive: true,
    minOrderQty: 1,
    lowStockAlert: 10
  },
  { 
    id: 'p2', 
    name: 'Avocado Box', 
    price: 12.00, 
    category: 'Grocery', 
    supplierId: 's1', 
    image: 'https://picsum.photos/seed/avocado/300/300', 
    description: 'Bulk ripened Hass avocados.',
    stockLevel: 12,
    reservedStock: 2,
    isActive: true,
    minOrderQty: 1,
    lowStockAlert: 5
  },
  { 
    id: 'p3', 
    name: 'USB-C Cable', 
    price: 15.00, 
    originalPrice: 12.00, 
    category: 'Electronics', 
    supplierId: 's2', 
    image: 'https://picsum.photos/seed/cable/300/300', 
    description: 'Fast charging braided cable.',
    stockLevel: 100,
    reservedStock: 0,
    isActive: true,
    minOrderQty: 5,
    lowStockAlert: 20
  }
];

export const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-5521', 
    date: '2023-11-20', 
    status: 'delivered', 
    total: 45.50, 
    supplierName: 'Global Foods', 
    buyerName: 'Downtown Bistro',
    items: [], 
    timeline: [
      { status: 'Order Placed', time: '10:30 AM', completed: true, author: 'System' },
      { status: 'Confirmed', time: '10:35 AM', completed: true, author: 'Sarah Wilson' },
      { status: 'Delivered', time: '11:15 AM', completed: true, author: 'Marco' }
    ],
    zoneId: 'z1',
    driverId: 'u4',
    driverName: 'David Jones'
  },
  {
    id: 'ORD-9882',
    date: '2023-11-24',
    status: 'pending',
    total: 120.00,
    supplierName: 'Global Foods',
    buyerName: 'West End Cafe',
    items: [],
    timeline: [
      { status: 'Order Placed', time: '02:00 PM', completed: true, author: 'Buyer' }
    ]
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TX-1', date: '2023-11-24', amount: 500, type: 'top-up', status: 'completed' }
];

export const MOCK_TEMPLATES: OrderTemplate[] = [
  { 
    id: 'tmp-1', 
    name: 'Weekly Dairy Restock', 
    supplierId: 's1', 
    supplierName: 'Global Foods',
    items: [ { ...PRODUCTS[0], quantity: 10 } ]
  }
];
