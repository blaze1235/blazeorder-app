import React, { useState, useMemo } from 'react';
import { Order, Product } from '../types';
import { SupplierStats } from '../api';

interface OwnerSuppliersScreenProps {
  supplierStats: SupplierStats[];
  orders: Order[];
  products: Product[];
  loading: boolean;
}

const OwnerSuppliersScreen: React.FC<OwnerSuppliersScreenProps> = ({
  supplierStats, orders, products, loading
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedStats = useMemo(() =>
    supplierStats.find(s => s.name === selected), [selected, supplierStats]);

  const selectedOrders = useMemo(() =>
    orders.filter(o => o.supplierName.toLowerCase() === selected?.toLowerCase()),
    [orders, selected]);

  const selectedProducts = useMemo(() =>
    products.filter(p => p.supplierId.toLowerCase() === selected?.toLowerCase()),
    [products, selected]);

  const topProducts = useMemo(() => {
    const counts: Record<string, number> = {};
    selectedOrders.filter(o => o.status === 'completed')
      .forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name]||0) + i.quantity; }));
    return selectedProducts
      .map(p => ({ ...p, sold: counts[p.name]||0 }))
      .sort((a,b) => b.sold - a.sold).slice(0, 5);
  }, [selectedOrders, selectedProducts]);

  // Last 7 days order volume for selected supplier
  const weeklyVolume = useMemo(() =>
    Array.from({length:7}).map((_,i) => {
      const d = new Date(); d.setDate(d.getDate() - (6-i));
      const ds = d.toISOString().split('T')[0];
      return { day: d.getDate(), count: selectedOrders.filter(o => o.date.startsWith(ds)).length };
    }), [selectedOrders]);

  const maxVol = Math.max(...weeklyVolume.map(d => d.count), 1);

  const statusColor = (s: string) => ({
    pending:'text-amber-400 bg-amber-500/10', accepted:'text-indigo-400 bg-indigo-500/10',
    preparing:'text-blue-400 bg-blue-500/10', ready:'text-purple-400 bg-purple-500/10',
    completed:'text-emerald-400 bg-emerald-500/10', cancelled:'text-rose-400 bg-rose-500/10',
  }[s] || 'text-slate-400 bg-slate-500/10');

  // ── SUPPLIER DETAIL VIEW ──────────────────────────────────────────────────
  if (selected && selectedStats) return (
    <div className="animate-fadeIn pb-24">
      {/* Header */}
      <div className="pt-10 pb-6 px-6 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-b-[2.5rem] mb-6">
        <button onClick={() => setSelected(null)}
          className="flex items-center space-x-2 text-slate-400 text-sm mb-5">
          <i className="fa-solid fa-chevron-left text-xs"></i><span>All Suppliers</span>
        </button>
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-2xl font-black text-slate-800">{selected[0]}</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{selected}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${selectedStats.fulfillmentRate >= 80 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                {selectedStats.fulfillmentRate}% fulfillment
              </span>
              <span className="text-[9px] text-slate-500">{selectedStats.staffCount} staff · {selectedStats.productCount} products</span>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label:'Revenue',          value:`$${selectedStats.revenue.toFixed(0)}`,   color:'text-white' },
            { label:'Total Orders',     value: selectedStats.totalOrders,               color:'text-indigo-400' },
            { label:'Completed',        value: selectedStats.completedOrders,           color:'text-emerald-400' },
            { label:'Cancelled',        value: selectedStats.cancelledOrders,           color: selectedStats.cancelledOrders > 0 ? 'text-rose-400' : 'text-slate-500' },
          ].map(s => (
            <div key={s.label} className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Health indicators */}
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-2xl border text-center ${selectedStats.fulfillmentRate >= 80 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <i className={`fa-solid fa-bullseye text-xl mb-2 block ${selectedStats.fulfillmentRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}></i>
            <p className="text-[8px] font-black text-slate-500 uppercase">Fulfillment</p>
            <p className={`text-lg font-black ${selectedStats.fulfillmentRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{selectedStats.fulfillmentRate}%</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${selectedStats.lowStockCount === 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
            <i className={`fa-solid fa-boxes-stacked text-xl mb-2 block ${selectedStats.lowStockCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}></i>
            <p className="text-[8px] font-black text-slate-500 uppercase">Low Stock</p>
            <p className={`text-lg font-black ${selectedStats.lowStockCount === 0 ? 'text-slate-400' : 'text-rose-400'}`}>{selectedStats.lowStockCount}</p>
          </div>
          <div className={`p-4 rounded-2xl border text-center ${selectedStats.activeStaff > 0 ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-800 border-slate-700'}`}>
            <i className={`fa-solid fa-users text-xl mb-2 block ${selectedStats.activeStaff > 0 ? 'text-indigo-400' : 'text-slate-600'}`}></i>
            <p className="text-[8px] font-black text-slate-500 uppercase">Active Staff</p>
            <p className={`text-lg font-black ${selectedStats.activeStaff > 0 ? 'text-indigo-400' : 'text-slate-500'}`}>{selectedStats.activeStaff}</p>
          </div>
        </div>

        {/* Order volume chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[3rem] space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Order Volume — Last 7 Days</h3>
          <div className="h-28 flex items-end justify-between space-x-1">
            {weeklyVolume.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                <span className="text-[8px] text-indigo-400 font-black">{d.count > 0 ? d.count : ''}</span>
                <div className="w-full bg-indigo-600 rounded-t-lg transition-all"
                  style={{ height: `${(d.count/maxVol)*100}%`, minHeight: d.count > 0 ? '4px' : '0' }}></div>
                <span className="text-[8px] text-slate-600">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[3rem] space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Order Breakdown</h3>
          {(['pending','accepted','preparing','ready','completed','cancelled'] as const).map(s => {
            const count = selectedOrders.filter(o => o.status === s).length;
            const pct   = selectedStats.totalOrders ? Math.round(count/selectedStats.totalOrders*100) : 0;
            return (
              <div key={s} className="flex items-center space-x-3">
                <span className="text-[9px] font-black text-slate-500 uppercase w-20 shrink-0">{s}</span>
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{width:`${pct}%`}}></div>
                </div>
                <span className="text-xs font-black text-slate-300 w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Top products */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-[3rem] space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Top Products</h3>
          {topProducts.every(p => p.sold === 0)
            ? <p className="text-slate-600 text-xs text-center py-4">No completed orders yet</p>
            : topProducts.filter(p => p.sold > 0).map((p,i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-black text-indigo-400 text-xs">#{i+1}</div>
                  <div>
                    <p className="font-bold text-sm text-slate-200">{p.name}</p>
                    <p className="text-[9px] text-slate-500">Stock: {p.stockLevel} units</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-white text-sm">${(p.price*p.sold).toFixed(0)}</p>
                  <p className="text-[9px] text-slate-500 uppercase font-black">{p.sold} sold</p>
                </div>
              </div>
            ))}
        </div>

        {/* Recent orders */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Orders</h3>
          {selectedOrders.length === 0
            ? <p className="text-slate-600 text-xs text-center py-6">No orders yet</p>
            : selectedOrders.slice(0,5).map(order => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-100 text-sm">{order.buyerName}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase">{order.id} · {order.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-white">{(order.total).toLocaleString('uz-UZ') + ' sum'}</p>
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${statusColor(order.status)}`}>{order.status}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  // ── SUPPLIER LIST ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6 animate-fadeIn pb-24">
      <div>
        <h2 className="text-2xl font-black">Suppliers</h2>
        <p className="text-xs text-slate-500 mt-1">Platform-wide · All stats from Orders tab</p>
      </div>

      {/* Platform totals */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Total Revenue',    value:`$${supplierStats.reduce((s,r)=>s+r.revenue,0).toFixed(0)}`,    color:'text-white' },
          { label:'Total Orders',     value: supplierStats.reduce((s,r)=>s+r.totalOrders,0),                color:'text-indigo-400' },
          { label:'Active Suppliers', value: supplierStats.length,                                          color:'text-emerald-400' },
          { label:'Platform Fill',    value: (() => { const t=supplierStats.reduce((s,r)=>s+r.totalOrders,0); const c=supplierStats.reduce((s,r)=>s+r.completedOrders,0); return t>0?`${Math.round(c/t*100)}%`:'—'; })(), color:'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem]">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Supplier cards */}
      {loading
        ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
        : supplierStats.length === 0
          ? <div className="py-20 text-center opacity-30"><i className="fa-solid fa-boxes-stacked text-5xl mb-4 block"></i><p className="font-bold">No suppliers yet</p></div>
          : (
            <div className="space-y-4">
              {supplierStats.map(s => (
                <button key={s.name} onClick={() => setSelected(s.name)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-[2.5rem] text-left transition-all active:scale-[0.98] space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-xl font-black text-white">
                        {s.name[0]}
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-white">{s.name}</h3>
                        <p className="text-[10px] text-slate-500">{s.productCount} products · {s.staffCount} staff</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-white">${s.revenue.toFixed(0)}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black">revenue</p>
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black">Orders</p>
                      <p className="text-sm font-black text-white">{s.totalOrders}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black">Done</p>
                      <p className="text-sm font-black text-emerald-400">{s.completedOrders}</p>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-xl text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black">Fill %</p>
                      <p className={`text-sm font-black ${s.fulfillmentRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{s.fulfillmentRate}%</p>
                    </div>
                    <div className={`p-2 rounded-xl text-center ${s.lowStockCount > 0 ? 'bg-rose-500/10' : 'bg-slate-800'}`}>
                      <p className="text-[8px] text-slate-500 uppercase font-black">Low Stk</p>
                      <p className={`text-sm font-black ${s.lowStockCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{s.lowStockCount}</p>
                    </div>
                  </div>

                  {/* Fulfillment rate bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black text-slate-500">
                      <span className="uppercase">Fulfillment Rate</span>
                      <span className={s.fulfillmentRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{s.fulfillmentRate}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${s.fulfillmentRate >= 80 ? 'bg-emerald-600' : s.fulfillmentRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{width:`${s.fulfillmentRate}%`}}></div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <span className="text-[10px] text-indigo-400 font-black uppercase flex items-center gap-1">
                      View Details <i className="fa-solid fa-chevron-right text-[8px]"></i>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
    </div>
  );
};

export default OwnerSuppliersScreen;
