import React from 'react';
import { Order, Product, StaffMember, UserRole } from '../types';

interface Stats {
  revenue: number;
  growth: number;
  avgDeliveryTime: number;
  avgAssemblyTime: number;
  inventoryHealth: number;
  totalCompleted: number;
}

interface Props {
  onBack: () => void;
  role: UserRole;
  products: Product[];
  stats: Stats;
  staff: StaffMember[];
  orders: Order[];
}

const AnalyticsCenter: React.FC<Props> = ({ onBack, products, stats, staff, orders }) => {
  const cancelled = orders.filter(o => o.status === 'cancelled').length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const fulfillmentRate = orders.length > 0 ? Math.round((stats.totalCompleted / orders.length) * 100) : 0;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const lowStockItems = products.filter(p => p.stockLevel <= p.lowStockAlert);

  const Stat = ({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="p-4 space-y-5 animate-fadeIn pb-24">
      <div className="flex items-center space-x-3">
        <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <h1 className="text-xl font-black">Analytics</h1>
      </div>

      {/* Revenue card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5">
        <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Total Revenue</p>
        <p className="text-4xl font-black">${stats.revenue.toFixed(2)}</p>
        <p className="text-indigo-200 text-sm mt-1"><i className="fa-solid fa-arrow-up mr-1"></i>{stats.growth}% growth</p>
      </div>

      {/* Order stats */}
      <div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Order Performance</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Completed" value={String(stats.totalCompleted)} color="text-emerald-400" />
          <Stat label="Pending" value={String(pending)} color="text-amber-400" />
          <Stat label="Cancelled" value={String(cancelled)} color="text-rose-400" />
          <Stat label="Fulfillment" value={`${fulfillmentRate}%`} color="text-indigo-400" />
        </div>
      </div>

      {/* Delivery stats */}
      <div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Speed</p>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Avg Delivery" value={`${stats.avgDeliveryTime}m`} />
          <Stat label="Avg Assembly" value={`${stats.avgAssemblyTime}m`} />
        </div>
      </div>

      {/* Team */}
      <div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Team</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between"><span className="text-slate-400 text-sm">Active Staff</span><span className="font-black text-indigo-400">{activeStaff}/{staff.length}</span></div>
          <div className="flex justify-between"><span className="text-slate-400 text-sm">Total Staff</span><span className="font-black">{staff.length}</span></div>
        </div>
      </div>

      {/* Inventory */}
      <div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Inventory</p>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">Health</span>
            <span className="font-black text-indigo-400">{stats.inventoryHealth}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${stats.inventoryHealth}%` }}></div>
          </div>
          {lowStockItems.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-black text-rose-400 mb-2"><i className="fa-solid fa-triangle-exclamation mr-1"></i>Low Stock Items</p>
              {lowStockItems.slice(0, 3).map(p => (
                <div key={p.id} className="flex justify-between py-1 text-sm">
                  <span className="text-slate-300 truncate flex-1 mr-2">{p.name}</span>
                  <span className="text-rose-400 font-black">{p.stockLevel} left</span>
                </div>
              ))}
              {lowStockItems.length > 3 && <p className="text-slate-500 text-xs">+{lowStockItems.length - 3} more</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCenter;
