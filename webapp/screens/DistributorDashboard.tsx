import React, { useState, useMemo } from 'react';
import { ScreenType, AppNotification, UserRole, StaffMember, Order, Product } from '../types';
import ProgressBar from '../components/ProgressBar';

interface DistributorDashboardProps {
  onNavigate: (screen: string) => void;
  t: (key: string) => string;
  notifications: AppNotification[];
  role: UserRole;
  staff?: StaffMember[];
  orders?: Order[];
  products?: Product[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onUpdateStaffStatus: (id: string, status: 'active' | 'offline') => void;
  stats: any;
}

const fmt  = (n: number) => n.toLocaleString('uz-UZ') + ' sum';
const fmtS = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString('uz-UZ');
};

const DistributorDashboard: React.FC<DistributorDashboardProps> = ({
  onNavigate, t, notifications, role, staff = [], orders = [], products = [],
  onUpdateStatus, onUpdateStaffStatus, stats
}) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const today = new Date().toISOString().split('T')[0];

  // ── Platform KPIs (owner view) ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const todayOrders  = orders.filter(o => o.date?.startsWith(today));
    const todayRev     = todayOrders.filter(o => o.status === 'completed').reduce((s,o) => s+o.total, 0);
    const pending      = orders.filter(o => o.status === 'pending').length;
    const inDelivery   = orders.filter(o => ['accepted','picked_up','delivered','ready','preparing'].includes(o.status)).length;
    const completed    = orders.filter(o => o.status === 'completed').length;
    const totalRev     = orders.filter(o => o.status === 'completed').reduce((s,o) => s+o.total, 0);
    const lowStock     = products.filter(p => p.stockLevel <= p.lowStockAlert && p.isActive).length;
    const clients      = [...new Set(orders.map(o => o.clientChatId || o.buyerName))].filter(Boolean).length;
    const fulfillRate  = orders.length ? Math.round((completed / orders.length) * 100) : 0;

    const bySupplier: Record<string, { orders: number; rev: number }> = {};
    orders.forEach(o => {
      if (!bySupplier[o.supplierName]) bySupplier[o.supplierName] = { orders: 0, rev: 0 };
      bySupplier[o.supplierName].orders++;
      if (o.status === 'completed') bySupplier[o.supplierName].rev += o.total;
    });

    const last7: { day: string; rev: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      last7.push({
        day: d.toLocaleDateString('en', { weekday: 'short' }),
        rev: orders.filter(o => o.date?.startsWith(k) && o.status === 'completed').reduce((s,o) => s+o.total, 0)
      });
    }
    return { todayRev, todayOrders: todayOrders.length, pending, inDelivery, completed, totalRev, lowStock, clients, fulfillRate, bySupplier, last7 };
  }, [orders, products, today]);

  const maxRev = Math.max(...kpis.last7.map(d => d.rev), 1);
  const recentOrders = [...orders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,5);

  const activeTask = orders.find(o => o.status === 'pending');

  const showFinancials     = role === 'manager' || role === 'distributor';
  const showTeamPerformance = role === 'manager' || role === 'distributor';

  return (
    <div className="flex flex-col space-y-6 animate-fadeIn pb-24 w-full max-w-full overflow-x-hidden">
      {/* ── Header ── */}
      <div className="relative pt-12 pb-8 px-5 bg-gradient-to-br from-slate-900 to-indigo-950 border-b border-indigo-500/20 rounded-b-[2.5rem] shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg -rotate-2">
              <span className="text-2xl font-black text-indigo-600">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">BlazeOrder</h1>
              <div className="flex items-center space-x-2 mt-0.5">
                <span className="text-[10px] font-black uppercase text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">OWNER</span>
                <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">LIVE</span>
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate('notifications')} className="relative w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/60">
            <i className="fa-solid fa-bell"></i>
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>}
          </button>
        </div>

        {/* Platform KPI cards */}
        {showFinancials && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total Revenue',    value: fmtS(kpis.totalRev) + ' sum', sub: 'all time',        color: 'text-white',       screen: 'analytics' },
              { label: "Today's Revenue",  value: fmtS(kpis.todayRev) + ' sum', sub: `${kpis.todayOrders} orders`, color: 'text-emerald-400', screen: 'analytics' },
              { label: 'Fulfillment Rate', value: kpis.fulfillRate + '%',        sub: `${kpis.completed} completed`, color: 'text-indigo-300', screen: 'orders' },
              { label: 'Total Clients',    value: String(kpis.clients),          sub: 'registered',     color: 'text-amber-300',   screen: 'orders' },
            ].map(card => (
              <button key={card.label} onClick={() => onNavigate(card.screen)}
                className="bg-slate-950/40 p-4 rounded-3xl border border-white/5 backdrop-blur-sm text-left hover:border-indigo-500/50 transition-all active:scale-95">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{card.label}</p>
                <p className={`text-lg font-black ${card.color} mt-1`}>{card.value}</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{card.sub}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Pending alert + 7-day chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-5">
        {/* Active task / pending orders */}
        {activeTask ? (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400">
                  <i className="fa-solid fa-bell animate-pulse"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-400 uppercase">{kpis.pending} Pending Order{kpis.pending !== 1 ? 's' : ''}</p>
                  <p className="text-xs font-bold text-slate-100">{activeTask.buyerName} · {activeTask.supplierName}</p>
                </div>
              </div>
              <button onClick={() => onNavigate('orders')} className="text-indigo-400 text-[10px] font-black uppercase">View All</button>
            </div>
            <ProgressBar status={activeTask.status} compact />
          </div>
        ) : (
          <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-3xl flex items-center space-x-4">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <p className="text-sm font-black text-emerald-400">All orders fulfilled</p>
              <p className="text-xs text-slate-500">No pending orders right now</p>
            </div>
          </div>
        )}

        {/* 7-day chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Revenue — Last 7 Days</p>
          <div className="flex items-end space-x-1.5 h-16">
            {kpis.last7.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full bg-indigo-600/80 rounded-t transition-all duration-500"
                  style={{ height: `${Math.max((d.rev / maxRev) * 52, d.rev > 0 ? 4 : 2)}px` }}></div>
                <p className="text-[7px] text-slate-600 font-black">{d.day}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Supplier breakdown ── */}
      {Object.keys(kpis.bySupplier).length > 0 && (
        <div className="px-5 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Suppliers</h4>
            <button onClick={() => onNavigate('suppliers')} className="text-indigo-400 text-[10px] font-black uppercase">Details</button>
          </div>
          <div className="space-y-2">
            {Object.entries(kpis.bySupplier).sort((a,b) => b[1].rev - a[1].rev).map(([name, data]) => (
              <div key={name} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-slate-200">{name}</p>
                  <p className="text-[10px] text-slate-500">{data.orders} orders</p>
                </div>
                <p className="font-black text-indigo-400">{fmtS(data.rev)} sum</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Low stock warning ── */}
      {kpis.lowStock > 0 && (
        <div className="px-5">
          <button onClick={() => onNavigate('products')}
            className="w-full bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center space-x-4 active:scale-95 transition-all">
            <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 shrink-0">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-rose-400">{kpis.lowStock} product{kpis.lowStock !== 1 ? 's' : ''} low on stock</p>
              <p className="text-[10px] text-slate-500">Tap to manage inventory</p>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-600 ml-auto"></i>
          </button>
        </div>
      )}

      {/* ── Recent orders ── */}
      <div className="px-5 space-y-3">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Orders</h4>
          <button onClick={() => onNavigate('orders')} className="text-indigo-400 text-[10px] font-black uppercase">See All</button>
        </div>
        {recentOrders.map(o => (
          <div key={o.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{o.buyerName || '—'}</p>
              <p className="text-[10px] text-slate-500 font-bold">{o.supplierName} · {o.id}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-sm font-black text-slate-100">{fmtS(o.total)} sum</p>
              <p className={`text-[10px] font-black uppercase ${
                o.status === 'completed' ? 'text-emerald-400' :
                o.status === 'pending'   ? 'text-amber-400'   :
                o.status === 'cancelled' ? 'text-rose-400'    : 'text-indigo-400'
              }`}>{o.status}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Team performance (if staff exist) ── */}
      {showTeamPerformance && staff.length > 0 && (
        <div className="px-5 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Team</h4>
            <button onClick={() => onNavigate('staff')} className="text-indigo-400 text-[10px] font-black uppercase">Manage</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {staff.slice(0,4).map(member => (
              <div key={member.id} className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 font-bold text-xs">
                    {member.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{member.name}</p>
                    <p className="text-[8px] text-slate-500 uppercase font-black">{member.role}</p>
                  </div>
                </div>
                <p className={`text-xs font-black ${member.status === 'active' ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {member.status === 'active' ? 'ON' : 'OFF'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Nav grid ── */}
      <div className="px-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { screen: 'orders',    icon: 'fa-bell-concierge', label: t('orders'),    color: 'text-indigo-400', badge: kpis.pending },
          { screen: 'suppliers', icon: 'fa-boxes-stacked',  label: 'Suppliers',    color: 'text-emerald-400' },
          { screen: 'products',  icon: 'fa-tag',            label: t('inventory'), color: 'text-amber-400',  badge: kpis.lowStock },
          { screen: 'analytics', icon: 'fa-chart-line',     label: t('stats'),     color: 'text-purple-400' },
        ].map(item => (
          <button key={item.screen} onClick={() => onNavigate(item.screen)}
            className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] flex flex-col items-center justify-center space-y-3 relative active:scale-95 transition-all">
            {item.badge && item.badge > 0 && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">{item.badge}</div>
            )}
            <i className={`fa-solid ${item.icon} text-xl ${item.color}`}></i>
            <span className="font-bold text-sm text-center">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DistributorDashboard;
