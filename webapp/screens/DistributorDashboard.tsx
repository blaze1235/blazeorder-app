import React from 'react';
import { Order, Product, StaffMember, AppNotification, UserRole } from '../types';

interface Stats {
  revenue: number;
  growth: number;
  avgDeliveryTime: number;
  avgAssemblyTime: number;
  inventoryHealth: number;
  totalCompleted: number;
}

interface Props {
  onNavigate: (screen: string) => void;
  t: (k: string) => string;
  notifications: AppNotification[];
  role: UserRole;
  staff: StaffMember[];
  orders: Order[];
  products: Product[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onUpdateStaffStatus: (id: string, status: 'active' | 'offline') => void;
  stats: Stats;
}

const DistributorDashboard: React.FC<Props> = ({ onNavigate, notifications, staff, orders, products, stats }) => {
  const pending = orders.filter(o => o.status === 'pending').length;
  const active = orders.filter(o => ['accepted', 'picked_up'].includes(o.status)).length;
  const unread = notifications.filter(n => !n.isRead).length;
  const lowStock = products.filter(p => p.stockLevel <= p.lowStockAlert).length;
  const activeStaff = staff.filter(s => s.status === 'active').length;

  const tiles = [
    { label: 'Revenue', value: `$${stats.revenue.toFixed(0)}`, icon: 'fa-dollar-sign', color: 'text-emerald-400 bg-emerald-400/10', screen: 'analytics' },
    { label: 'Pending', value: String(pending), icon: 'fa-clock', color: 'text-amber-400 bg-amber-400/10', screen: 'orders' },
    { label: 'In Progress', value: String(active), icon: 'fa-truck', color: 'text-blue-400 bg-blue-400/10', screen: 'orders' },
    { label: 'Completed', value: String(stats.totalCompleted), icon: 'fa-circle-check', color: 'text-emerald-400 bg-emerald-400/10', screen: 'orders' },
    { label: 'Low Stock', value: String(lowStock), icon: 'fa-box', color: lowStock > 0 ? 'text-rose-400 bg-rose-400/10' : 'text-slate-400 bg-slate-800', screen: 'products' },
    { label: 'Active Staff', value: `${activeStaff}/${staff.length}`, icon: 'fa-user-group', color: 'text-indigo-400 bg-indigo-400/10', screen: 'staff' },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="p-4 space-y-6 animate-fadeIn pb-24">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black">Dashboard</h1>
          <p className="text-slate-400 text-sm">Operations Overview</p>
        </div>
        {unread > 0 && (
          <button onClick={() => onNavigate('notifications')} className="relative w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-bell text-slate-300"></i>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">{unread}</span>
          </button>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-2">
        {tiles.map(tile => (
          <button key={tile.label} onClick={() => onNavigate(tile.screen)} className="bg-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-3 text-left transition-all">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${tile.color}`}>
              <i className={`fa-solid ${tile.icon} text-xs`}></i>
            </div>
            <p className="font-black text-lg leading-tight">{tile.value}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase">{tile.label}</p>
          </button>
        ))}
      </div>

      {/* Inventory health */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
        <div className="flex justify-between items-center mb-2">
          <p className="font-bold text-sm">Inventory Health</p>
          <p className="font-black text-indigo-400">{stats.inventoryHealth}%</p>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${stats.inventoryHealth}%` }}></div>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Recent Orders</h2>
          <button onClick={() => onNavigate('orders')} className="text-indigo-400 text-xs font-black">View All</button>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-slate-600 text-sm text-center py-6">No orders yet</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(o => (
              <button key={o.id} onClick={() => onNavigate('orders')} className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3 text-left hover:border-indigo-500/30 transition-all">
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${o.status === 'pending' ? 'bg-amber-500' : o.status === 'completed' ? 'bg-emerald-500' : o.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{o.id}</p>
                  <p className="text-slate-500 text-xs">{o.buyerName || 'Unknown'} · {o.supplierName}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">${o.total.toFixed(2)}</p>
                  <p className="text-slate-500 text-xs capitalize">{o.status.replace('_', ' ')}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DistributorDashboard;
