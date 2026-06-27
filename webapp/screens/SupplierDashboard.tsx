import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Order, Product } from '../types';
import { AccountProfile, SheetStaffMember, fetchStaff, addStaffMember, updateStaffStatus, removeStaffMember, updateProduct as apiUpdateProduct } from '../api';
import ProgressBar from '../components/ProgressBar';
import Drawer from '../components/Drawer';

interface SupplierDashboardProps {
  account: AccountProfile;
  orders: Order[];
  products: Product[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onUpdateProduct: (p: Product) => void;
  onLogout: () => void;
  t: (key: string) => string;
  apiOnline: boolean;
}

type SupplierRole = 'owner' | 'manager' | 'fulfillment' | 'driver';
type MainTab = 'overview' | 'orders' | 'inventory' | 'analytics' | 'staff';

const ROLE_COLORS: Record<string, string> = {
  owner: 'text-amber-400 bg-amber-500/10',
  manager: 'text-indigo-400 bg-indigo-500/10',
  fulfillment: 'text-emerald-400 bg-emerald-500/10',
  driver: 'text-blue-400 bg-blue-500/10',
};

const fmt  = (n: number) => n.toLocaleString('uz-UZ') + ' sum';
const fmtS = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M sum';
  if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'K sum';
  return n.toLocaleString('uz-UZ') + ' sum';
};

const statusLabel: Record<string,string> = {
  pending:'Pending', accepted:'Accepted', picked_up:'In Delivery',
  completed:'Completed', cancelled:'Cancelled',
};
const statusColor = (s: string) => ({
  pending:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  accepted:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  picked_up: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  cancelled: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}[s] || 'text-slate-400 bg-slate-500/10 border-slate-500/20');

// ── Trello column config ──────────────────────────────────────────────────────
const BOARD_COLS: { status: Order['status']; label: string; color: string; headerColor: string }[] = [
  { status: 'pending',   label: 'Pending',     color: 'border-amber-500/30',  headerColor: 'bg-amber-500/10 text-amber-400' },
  { status: 'accepted',  label: 'Accepted',    color: 'border-indigo-500/30', headerColor: 'bg-indigo-500/10 text-indigo-400' },
  { status: 'picked_up', label: 'In Delivery', color: 'border-blue-500/30',   headerColor: 'bg-blue-500/10 text-blue-400' },
  { status: 'completed', label: 'Completed',   color: 'border-emerald-500/30',headerColor: 'bg-emerald-500/10 text-emerald-400' },
];

const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  account, orders, products, onUpdateStatus, onUpdateProduct, onLogout, t, apiOnline
}) => {
  const supplierName = account.linked_name;
  const [activeRole, setActiveRole]       = useState<SupplierRole>('owner');
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [tab, setTab]                     = useState<MainTab>('overview');
  const [staff, setStaff]                 = useState<SheetStaffMember[]>([]);
  const [staffLoading, setStaffLoading]   = useState(false);
  const [showAddStaff, setShowAddStaff]   = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<SheetStaffMember | null>(null);
  const [newStaffName, setNewStaffName]   = useState('');
  const [newStaffRole, setNewStaffRole]   = useState<'manager'|'fulfillment'|'driver'>('fulfillment');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editProduct, setEditProduct]     = useState<Product | null>(null);
  const [stockAdj, setStockAdj]           = useState(0);
  const [newPrice, setNewPrice]           = useState('');
  const [newName, setNewName]             = useState('');
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadStaff = useCallback(async () => {
    setStaffLoading(true);
    try { setStaff(await fetchStaff(supplierName)); }
    catch (e) { console.error(e); }
    finally { setStaffLoading(false); }
  }, [supplierName]);

  useEffect(() => { if (tab === 'staff') loadStaff(); }, [tab, loadStaff]);

  const completed       = useMemo(() => orders.filter(o => o.status === 'completed'), [orders]);
  const revenue         = useMemo(() => completed.reduce((s,o) => s+o.total, 0), [completed]);
  const active          = useMemo(() => orders.filter(o => !['completed','cancelled'].includes(o.status)), [orders]);
  const today           = useMemo(() => {
    const d = new Date().toISOString().split('T')[0];
    return orders.filter(o => o.date?.startsWith(d));
  }, [orders]);
  const lowStock        = useMemo(() => products.filter(p => p.stockLevel <= p.lowStockAlert && p.isActive), [products]);
  const fulfillRate     = orders.length ? Math.round(completed.length / orders.length * 100) : 0;
  const todayRevenue    = today.filter(o=>o.status==='completed').reduce((s,o)=>s+o.total,0);

  const topProducts = useMemo(() => {
    const counts: Record<string,number> = {};
    completed.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name]||0)+i.quantity; }));
    return products.map(p => ({...p, sold: counts[p.name]||0})).sort((a,b)=>b.sold-a.sold).slice(0,5);
  }, [completed, products]);

  const last7 = useMemo(() => Array.from({length:7}).map((_,i) => {
    const d = new Date(); d.setDate(d.getDate()-(6-i));
    const k = d.toISOString().split('T')[0];
    return {
      day: d.toLocaleDateString('en',{weekday:'short'}),
      rev: orders.filter(o=>o.date?.startsWith(k)&&o.status==='completed').reduce((s,o)=>s+o.total,0),
      count: orders.filter(o=>o.date?.startsWith(k)).length,
    };
  }), [orders]);
  const maxRev = Math.max(...last7.map(d=>d.rev),1);

  // ── Role-gated tabs ────────────────────────────────────────────────────────
  const allowedTabs = useMemo((): MainTab[] => {
    if (activeRole === 'owner' || activeRole === 'manager') return ['overview','orders','inventory','analytics','staff'];
    if (activeRole === 'fulfillment') return ['overview','orders','inventory'];
    if (activeRole === 'driver')      return ['overview','orders'];
    return ['overview'];
  }, [activeRole]);

  useEffect(() => { if (!allowedTabs.includes(tab)) setTab('overview'); }, [activeRole]);

  // ── Actions per role (4-step) ──────────────────────────────────────────────
  const getActions = (order: Order) => {
    const btn = (label: string, next: Order['status'], cls: string) => (
      <button key={label}
        onClick={e => { e.stopPropagation(); onUpdateStatus(order.id, next); setSelectedOrder(null); }}
        className={`flex-1 py-3 rounded-xl text-[10px] font-black text-white uppercase active:scale-95 transition-all ${cls}`}>
        {label}
      </button>
    );
    if (activeRole === 'owner' || activeRole === 'manager') {
      if (order.status === 'pending')   return [btn('Accept','accepted','bg-emerald-600'), btn('Decline','cancelled','bg-slate-700 !text-rose-400')];
      if (order.status === 'accepted')  return [btn('Mark In Delivery','picked_up','bg-blue-600')];
      if (order.status === 'picked_up') return [btn('Mark Completed','completed','bg-emerald-600')];
    }
    if (activeRole === 'fulfillment') {
      if (order.status === 'accepted')  return [btn('Start Assembly','picked_up','bg-indigo-600')];
    }
    if (activeRole === 'driver') {
      if (order.status === 'accepted')  return [btn('Confirm Pick Up','picked_up','bg-indigo-600')];
      if (order.status === 'picked_up') return [btn('Confirm Delivery','completed','bg-emerald-600')];
    }
    return [];
  };

  const handleSaveProduct = () => {
    if (!editProduct) return;
    const updated = {
      ...editProduct,
      name: newName || editProduct.name,
      stockLevel: editProduct.stockLevel + stockAdj,
      price: parseFloat(newPrice) || editProduct.price,
    };
    onUpdateProduct(updated);
    setEditProduct(null);
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim()) return;
    try { await addStaffMember({ name: newStaffName, role: newStaffRole, supplierName }); await loadStaff(); setShowAddStaff(false); setNewStaffName(''); }
    catch (e) { console.error(e); }
  };

  const handleRemoveStaff = async (id: string) => {
    if (!window.confirm('Remove this staff member?')) return;
    try { await removeStaffMember(id); await loadStaff(); setSelectedStaff(null); }
    catch (e) { console.error(e); }
  };

  const handleToggleStaffStatus = async (m: SheetStaffMember) => {
    const next = m.status === 'active' ? 'offline' : 'active';
    try { await updateStaffStatus(m.id, next); setStaff(prev => prev.map(s => s.id===m.id ? {...s,status:next} : s)); }
    catch (e) { console.error(e); }
  };

  // ── NAV config ─────────────────────────────────────────────────────────────
  const navItems = [
    { id:'overview'   as MainTab, icon:'fa-gauge',         label:'Overview',   badge: 0 },
    { id:'orders'     as MainTab, icon:'fa-table-columns', label:'Orders',     badge: orders.filter(o=>o.status==='pending').length },
    { id:'inventory'  as MainTab, icon:'fa-boxes-stacked', label:'Inventory',  badge: lowStock.length },
    { id:'analytics'  as MainTab, icon:'fa-chart-line',    label:'Analytics',  badge: 0 },
    { id:'staff'      as MainTab, icon:'fa-user-group',    label:'Staff',      badge: 0 },
  ].filter(n => allowedTabs.includes(n.id));

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-0 animate-fadeIn">
      {/* Header */}
      <div className="pt-10 pb-6 px-6 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 rounded-b-[2.5rem] mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-xl font-black text-emerald-600">{supplierName[0]}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{supplierName}</h1>
              <button onClick={() => setShowRoleSwitcher(true)}
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border mt-0.5 flex items-center gap-1 ${ROLE_COLORS[activeRole]} border-current/30`}>
                {activeRole} <i className="fa-solid fa-chevron-down text-[8px]"></i>
              </button>
            </div>
          </div>
          <button onClick={onLogout} className="text-slate-500 hover:text-slate-300 p-2 transition-colors">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Today's Orders", value: today.length,    color:'text-white',        click: ()=>setTab('orders') },
            { label: 'Active',         value: active.length,   color:'text-amber-400',    click: ()=>setTab('orders') },
            { label: "Today's Revenue",value: fmtS(todayRevenue), color:'text-emerald-400', click: ()=>setTab('analytics') },
            { label: 'Fulfillment',    value: fulfillRate+'%', color: fulfillRate>=80?'text-emerald-400':'text-rose-400', click: ()=>setTab('analytics') },
          ].map(s => (
            <button key={s.label} onClick={s.click}
              className="bg-slate-950/40 p-4 rounded-2xl border border-white/5 text-left hover:border-emerald-500/40 transition-all active:scale-95">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
              <p className={`text-xl font-black ${s.color} mt-1`}>{s.value}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-5 pb-24">
        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <button onClick={() => setTab('inventory')}
            className="w-full bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-left flex items-center space-x-3 active:scale-95 transition-all">
            <i className="fa-solid fa-triangle-exclamation text-amber-400"></i>
            <p className="text-xs text-amber-400 font-bold flex-1">{lowStock.length} product{lowStock.length>1?'s':''} running low — tap to manage</p>
            <i className="fa-solid fa-chevron-right text-amber-600 text-xs"></i>
          </button>
        )}

        {/* Team widget */}
        {staff.length > 0 && (activeRole === 'owner' || activeRole === 'manager') && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Team Availability</h3>
              <button onClick={() => setTab('staff')} className="text-emerald-400 text-[10px] font-black uppercase">Manage</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {staff.map(m => (
                <div key={m.id} className={`p-3 rounded-2xl border flex items-center space-x-2 ${m.status==='active'?'bg-emerald-500/5 border-emerald-500/20':'bg-slate-900 border-slate-800'}`}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${m.status==='active'?'bg-emerald-400':'bg-slate-600'}`}></div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{m.name}</p>
                    <p className={`text-[9px] font-black uppercase ${ROLE_COLORS[m.role]?.split(' ')[0]}`}>{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live active orders */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Orders ({active.length})</h3>
            <button onClick={() => setTab('orders')} className="text-emerald-400 text-[10px] font-black uppercase">Board View</button>
          </div>
          {active.length === 0
            ? <div className="py-10 text-center opacity-30"><i className="fa-solid fa-inbox text-4xl mb-3 block"></i><p className="font-bold text-sm">No active orders</p></div>
            : active.slice(0,3).map(order => (
              <div key={order.id} onClick={() => setSelectedOrder(order)}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 cursor-pointer hover:border-emerald-500/40 transition-all">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-100">{order.buyerName}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{order.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400 text-sm">{fmtS(order.total)}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${statusColor(order.status)}`}>
                      {statusLabel[order.status] || order.status}
                    </span>
                  </div>
                </div>
                <ProgressBar status={order.status} compact />
                <div className="flex space-x-2">{getActions(order)}</div>
              </div>
            ))}
        </div>

        {/* 7-day mini chart */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Revenue — Last 7 Days</p>
          <div className="flex items-end space-x-1.5 h-16">
            {last7.map((d,i) => (
              <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full bg-emerald-600/80 rounded-t transition-all duration-500"
                  style={{height:`${Math.max((d.rev/maxRev)*52, d.rev>0?4:2)}px`}}></div>
                <p className="text-[7px] text-slate-600 font-black">{d.day}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: ORDERS — Trello board (owner/manager) or list (other roles)
  // ─────────────────────────────────────────────────────────────────────────
  const renderOrders = () => {
    const isBoardView = activeRole === 'owner' || activeRole === 'manager';

    // Role-filtered orders
    const roleOrders = (() => {
      if (activeRole === 'fulfillment') return orders.filter(o => ['accepted','picked_up'].includes(o.status));
      if (activeRole === 'driver')      return orders.filter(o => ['accepted','picked_up'].includes(o.status));
      return orders;
    })();

    const sorted = [...roleOrders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (isBoardView) {
      // ── TRELLO BOARD ─────────────────────────────────────────────────────
      return (
        <div className="animate-fadeIn h-full">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-2xl font-black">Orders Board</h2>
            <p className="text-xs text-slate-500 mt-0.5">{orders.length} total · {active.length} active</p>
          </div>
          {/* Horizontal scroll board */}
          <div className="flex space-x-3 overflow-x-auto px-5 pb-32 pt-2 scrollbar-hide" style={{minHeight:'calc(100vh - 200px)'}}>
            {BOARD_COLS.map(col => {
              const colOrders = sorted.filter(o => o.status === col.status);
              return (
                <div key={col.status} className={`shrink-0 w-72 rounded-3xl border ${col.color} bg-slate-900/50 flex flex-col`} style={{maxHeight:'calc(100vh - 220px)'}}>
                  {/* Column header */}
                  <div className={`px-4 py-3 rounded-t-3xl flex items-center justify-between ${col.headerColor} border-b border-current/10`}>
                    <span className="text-xs font-black uppercase tracking-wider">{col.label}</span>
                    <span className="w-6 h-6 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-black">{colOrders.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
                    {colOrders.length === 0
                      ? <div className="py-8 text-center opacity-20"><i className="fa-solid fa-inbox text-2xl mb-2 block"></i><p className="text-xs font-bold">Empty</p></div>
                      : colOrders.map(order => (
                        <div key={order.id} onClick={() => setSelectedOrder(order)}
                          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 cursor-pointer hover:border-slate-600 active:scale-[0.98] transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-slate-100">{order.buyerName}</p>
                              <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5">{order.id}</p>
                            </div>
                            <p className="text-sm font-black text-emerald-400">{fmtS(order.total)}</p>
                          </div>
                          {order.items.length > 0 && (
                            <div className="space-y-0.5">
                              {order.items.slice(0,2).map((item,i) => (
                                <p key={i} className="text-[10px] text-slate-400">{item.quantity}× {item.name}</p>
                              ))}
                              {order.items.length > 2 && <p className="text-[10px] text-slate-600">+{order.items.length-2} more</p>}
                            </div>
                          )}
                          <p className="text-[9px] text-slate-600">{new Date(order.date).toLocaleDateString('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                          <div className="flex space-x-1.5">{getActions(order)}</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // ── LIST VIEW for fulfillment / driver ────────────────────────────────
    return (
      <div className="p-5 space-y-4 animate-fadeIn pb-32">
        <h2 className="text-2xl font-black">{activeRole === 'fulfillment' ? 'Assembly Queue' : 'Delivery Queue'}</h2>
        {sorted.length === 0
          ? <div className="py-20 text-center opacity-30"><i className="fa-solid fa-clipboard-list text-5xl mb-4 block"></i><p className="font-bold">No orders in queue</p></div>
          : sorted.map(order => (
            <div key={order.id} onClick={() => setSelectedOrder(order)}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 cursor-pointer hover:border-emerald-500/40 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-100">{order.buyerName}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-black">{order.id} · {order.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-400 text-sm">{fmtS(order.total)}</p>
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${statusColor(order.status)}`}>
                    {statusLabel[order.status] || order.status}
                  </span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                {order.items.map((item,i) => (
                  <p key={i} className="text-[11px] font-bold text-slate-300">{item.quantity}× <span className="text-indigo-400">{item.name}</span></p>
                ))}
              </div>
              <ProgressBar status={order.status} compact />
              <div className="flex space-x-2">{getActions(order)}</div>
            </div>
          ))}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: INVENTORY
  // ─────────────────────────────────────────────────────────────────────────
  const renderInventory = () => (
    <div className="p-5 space-y-4 animate-fadeIn pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black">Inventory</h2>
          <p className="text-xs text-slate-500 mt-0.5">{products.length} products · {lowStock.length} low stock</p>
        </div>
      </div>
      {lowStock.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center space-x-3">
          <i className="fa-solid fa-triangle-exclamation text-amber-400"></i>
          <p className="text-xs text-amber-400 font-bold">{lowStock.length} product{lowStock.length>1?'s':''} low on stock</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {products.map(p => {
          const isLow = p.stockLevel <= p.lowStockAlert && p.isActive;
          const isOut = p.stockLevel === 0;
          return (
            <div key={p.id} className={`border p-4 rounded-3xl flex items-center space-x-4 transition-all
              ${isOut ? 'bg-rose-500/5 border-rose-500/30' : isLow ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
              {p.image
                ? <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shrink-0" alt="" />
                : <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0"><i className="fa-solid fa-box"></i></div>
              }
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-100 truncate">{p.name}</h4>
                <p className="text-xs font-black text-emerald-400">{fmt(p.price)} <span className="text-slate-600 font-normal">· {p.category}</span></p>
                <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                  <span className={`text-sm font-black ${isOut?'text-rose-400':isLow?'text-amber-400':'text-slate-100'}`}>{p.stockLevel}</span>
                  <span className="text-[8px] font-black text-slate-500 uppercase">in stock</span>
                  {isOut  && <span className="px-2 py-0.5 bg-rose-500/20 rounded-full text-[8px] font-black text-rose-500 uppercase">Out</span>}
                  {isLow && !isOut && <span className="px-2 py-0.5 bg-amber-500/20 rounded-full text-[8px] font-black text-amber-500 uppercase animate-pulse">Low</span>}
                  {!p.isActive && <span className="px-2 py-0.5 bg-slate-500/20 rounded-full text-[8px] font-black text-slate-500 uppercase">Inactive</span>}
                </div>
              </div>
              <button onClick={() => { setEditProduct(p); setStockAdj(0); setNewPrice(p.price.toString()); setNewName(p.name); }}
                className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-600 transition-all shrink-0">
                <i className="fa-solid fa-pen text-xs"></i>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────
  const renderAnalytics = () => (
    <div className="p-5 space-y-5 animate-fadeIn pb-24">
      <h2 className="text-2xl font-black">Analytics</h2>

      {/* Revenue hero */}
      <div className="bg-gradient-to-br from-emerald-900 to-slate-900 border border-emerald-500/20 p-6 rounded-3xl">
        <p className="text-emerald-300 text-[10px] font-black uppercase tracking-widest mb-1">Total Revenue</p>
        <p className="text-3xl font-black text-white">{fmt(revenue)}</p>
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-emerald-500/20">
          <div>
            <p className="text-[9px] font-black text-emerald-300 uppercase">Today</p>
            <p className="text-lg font-black text-white">{fmtS(todayRevenue)}</p>
          </div>
          <div>
            <p className="text-[9px] font-black text-emerald-300 uppercase">Fulfillment</p>
            <p className={`text-lg font-black ${fulfillRate>=80?'text-emerald-400':'text-rose-400'}`}>{fulfillRate}%</p>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Completed Orders', value: completed.length, color:'text-emerald-400' },
          { label:'Products',         value: products.length,  color:'text-indigo-400' },
          { label:'Active Staff',     value: staff.filter(s=>s.status==='active').length, color:'text-amber-400' },
          { label:'Low Stock Items',  value: lowStock.length,  color: lowStock.length>0?'text-rose-400':'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* 7-day chart */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Revenue — Last 7 Days</p>
        <div className="flex items-end space-x-2 h-24">
          {last7.map((d,i) => (
            <div key={i} className="flex-1 flex flex-col items-center space-y-1">
              <p className="text-[8px] text-slate-500 font-black">{d.rev>0?fmtS(d.rev):''}</p>
              <div className="w-full bg-emerald-600/80 rounded-t transition-all duration-500"
                style={{height:`${Math.max((d.rev/maxRev)*64, d.rev>0?4:2)}px`}}></div>
              <p className="text-[8px] text-slate-600 font-black">{d.day}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top Products</h3>
        {topProducts.every(p=>p.sold===0)
          ? <p className="text-slate-600 text-xs text-center py-4">No completed orders yet</p>
          : topProducts.filter(p=>p.sold>0).map((p,i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-black text-emerald-400 text-xs">#{i+1}</div>
                <span className="font-bold text-sm text-slate-200">{p.name}</span>
              </div>
              <div className="text-right">
                <p className="font-black text-sm text-white">{fmtS(p.price*p.sold)}</p>
                <p className="text-[9px] text-slate-500 uppercase font-black">{p.sold} sold</p>
              </div>
            </div>
          ))}
      </div>

      {/* Status breakdown */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Breakdown</h3>
        {(['pending','accepted','picked_up','completed','cancelled'] as const).map(s => {
          const count = orders.filter(o=>o.status===s).length;
          const pct   = orders.length ? Math.round(count/orders.length*100) : 0;
          return (
            <div key={s} className="flex items-center space-x-3">
              <span className="text-[9px] font-black text-slate-500 uppercase w-24 shrink-0">{statusLabel[s]||s}</span>
              <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${s==='completed'?'bg-emerald-600':s==='cancelled'?'bg-rose-600':'bg-indigo-600'}`} style={{width:`${pct}%`}}></div>
              </div>
              <span className="text-xs font-black text-slate-300 w-6 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAB: STAFF
  // ─────────────────────────────────────────────────────────────────────────
  const renderStaff = () => (
    <div className="p-5 space-y-5 animate-fadeIn pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black">Staff</h2>
          <p className="text-xs text-slate-500">{supplierName} · {staff.filter(s=>s.status==='active').length} online</p>
        </div>
        <button onClick={() => setShowAddStaff(true)}
          className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-90 transition-all">
          <i className="fa-solid fa-plus text-lg"></i>
        </button>
      </div>
      {staffLoading
        ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
        : staff.length === 0
          ? <div className="py-20 text-center opacity-30"><i className="fa-solid fa-users text-5xl mb-4 block"></i><p className="font-bold">No staff yet — add your team</p></div>
          : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {staff.map(member => (
                <button key={member.id} onClick={() => setSelectedStaff(member)}
                  className="bg-slate-900/50 border border-slate-800 p-5 rounded-[2.5rem] flex items-center justify-between hover:border-emerald-500/50 transition-all active:scale-[0.98]">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${ROLE_COLORS[member.role]||'text-slate-400 bg-slate-700'}`}>
                      {member.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-100">{member.name}</h4>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${ROLE_COLORS[member.role]||''}`}>{member.role}</span>
                        <span className={`text-[9px] font-bold ${member.status==='active'?'text-emerald-500':'text-slate-600'}`}>• {member.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-300">{member.ordersHandled}</p>
                    <p className="text-[8px] text-slate-600 uppercase">handled</p>
                  </div>
                </button>
              ))}
            </div>
      }
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP SIDEBAR + MOBILE BOTTOM NAV
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">

      {/* ── DESKTOP sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-slate-900 border-r border-slate-800 h-full">
        {/* Sidebar header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
              <span className="text-lg font-black text-emerald-600">{supplierName[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{supplierName}</p>
              <button onClick={() => setShowRoleSwitcher(true)}
                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 flex items-center gap-1 ${ROLE_COLORS[activeRole]} border border-current/20`}>
                {activeRole} <i className="fa-solid fa-chevron-down text-[7px]"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all relative text-left
                ${tab===item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              {item.badge > 0 && (
                <span className="absolute top-2 right-3 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">{item.badge}</span>
              )}
              <i className={`fa-solid ${item.icon} text-sm`}></i>
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-slate-800">
          <button onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-all">
            <i className="fa-solid fa-right-from-bracket text-sm"></i>
            <span className="font-bold text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto scrollbar-hide pb-24 lg:pb-0">
        {tab === 'overview'   && renderOverview()}
        {tab === 'orders'     && renderOrders()}
        {tab === 'inventory'  && renderInventory()}
        {tab === 'analytics'  && renderAnalytics()}
        {tab === 'staff'      && renderStaff()}
      </main>

      {/* ── MOBILE bottom nav ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 flex z-40">
        {navItems.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 space-y-1 relative transition-all ${tab===item.id?'text-emerald-400':'text-slate-600'}`}>
            {item.badge > 0 && (
              <div className="absolute top-1.5 right-1/4 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">{item.badge}</div>
            )}
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── DRAWERS ── */}

      {/* Role switcher */}
      <Drawer isOpen={showRoleSwitcher} onClose={() => setShowRoleSwitcher(false)} title="Switch Role">
        <div className="space-y-3 pb-6">
          <p className="text-xs text-slate-500 text-center mb-4">Preview what your staff sees</p>
          {(['owner','manager','fulfillment','driver'] as SupplierRole[]).map(r => (
            <button key={r} onClick={() => { setActiveRole(r); setShowRoleSwitcher(false); }}
              className={`w-full p-5 rounded-3xl flex justify-between items-center transition-all ${activeRole===r?'bg-emerald-600 text-white shadow-lg':'bg-slate-800 text-slate-300'}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeRole===r?'bg-white/20':'bg-slate-700'}`}>
                  <i className={`fa-solid ${r==='owner'?'fa-crown':r==='manager'?'fa-user-tie':r==='fulfillment'?'fa-box-open':'fa-truck-fast'} text-xs`}></i>
                </div>
                <div className="text-left">
                  <p className="font-bold capitalize">{r}</p>
                  <p className="text-[10px] opacity-60">{r==='owner'?'Full access':r==='manager'?'Orders + team':r==='fulfillment'?'Assembly + stock':'Delivery only'}</p>
                </div>
              </div>
              {activeRole===r && <i className="fa-solid fa-check"></i>}
            </button>
          ))}
        </div>
      </Drawer>

      {/* Order detail */}
      <Drawer isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={selectedOrder?.id}>
        {selectedOrder && (
          <div className="space-y-4 pb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">{selectedOrder.buyerName}</p>
                <p className="text-xs text-slate-500">{selectedOrder.date}</p>
              </div>
              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border ${statusColor(selectedOrder.status)}`}>
                {statusLabel[selectedOrder.status]||selectedOrder.status}
              </span>
            </div>
            <ProgressBar status={selectedOrder.status} />
            <div className="space-y-2">
              {selectedOrder.items.map((item,i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-slate-400">{item.quantity}× {item.name}</span>
                  <span className="font-bold">{fmt(item.price*item.quantity)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-800 flex justify-between font-black">
                <span>Total</span>
                <span className="text-emerald-400">{fmt(selectedOrder.total)}</span>
              </div>
            </div>
            {selectedOrder.address && <p className="text-xs text-slate-500"><i className="fa-solid fa-location-dot mr-2 text-indigo-400"></i>{selectedOrder.address}</p>}
            <div className="flex space-x-2 pt-2">{getActions(selectedOrder)}</div>
          </div>
        )}
      </Drawer>

      {/* Edit product */}
      <Drawer isOpen={!!editProduct} onClose={() => setEditProduct(null)} title={editProduct?.name}>
        {editProduct && (
          <div className="space-y-5 pb-6">
            <div className="flex items-center space-x-4">
              {editProduct.image
                ? <img src={editProduct.image} className="w-16 h-16 rounded-2xl object-cover shrink-0" alt="" />
                : <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0"><i className="fa-solid fa-box text-xl"></i></div>
              }
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Current stock: {editProduct.stockLevel}</p>
                <p className="text-sm font-black text-emerald-400">{fmt(editProduct.price)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Name</label>
              <input type="text" value={newName} onChange={e=>setNewName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-emerald-500 outline-none" />
            </div>
            <div className="flex flex-col items-center space-y-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock Adjustment</p>
              <div className="flex items-center space-x-4">
                <button onClick={()=>setStockAdj(p=>p-1)} className="w-14 h-14 bg-slate-800 rounded-2xl text-2xl font-black hover:bg-rose-500/20 transition-colors">−</button>
                <input
                  type="number"
                  value={stockAdj === 0 ? '' : stockAdj}
                  placeholder="0"
                  onChange={e => setStockAdj(isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value))}
                  className={`w-20 text-center bg-slate-800 border rounded-2xl text-2xl font-black py-3 outline-none
                    ${stockAdj>0?'text-emerald-400 border-emerald-500':stockAdj<0?'text-rose-400 border-rose-500':'text-white border-slate-700'}`}
                />
                <button onClick={()=>setStockAdj(p=>p+1)} className="w-14 h-14 bg-slate-800 rounded-2xl text-2xl font-black text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors">+</button>
              </div>
              <p className="text-sm text-slate-500">New total: <span className="font-black text-white">{editProduct.stockLevel+stockAdj}</span></p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price (sum)</label>
              <input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-xl font-black text-white focus:border-emerald-500 outline-none" />
            </div>
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl">
              <div><p className="text-sm font-bold">Active</p><p className="text-[10px] text-slate-500">Visible to buyers</p></div>
              <button onClick={()=>setEditProduct(p=>p?{...p,isActive:!p.isActive}:p)}
                className={`w-12 h-6 rounded-full relative transition-colors ${editProduct.isActive?'bg-emerald-600':'bg-slate-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editProduct.isActive?'right-1':'left-1'}`}></div>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={()=>setEditProduct(null)} className="bg-slate-800 py-4 rounded-2xl text-xs font-black text-slate-400 uppercase">Cancel</button>
              <button onClick={handleSaveProduct} className="bg-emerald-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl">Save & Sync</button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Staff detail */}
      <Drawer isOpen={!!selectedStaff} onClose={()=>setSelectedStaff(null)} title={selectedStaff?.name}>
        {selectedStaff && (
          <div className="space-y-5 pb-6">
            <div className="flex flex-col items-center space-y-2">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl ${ROLE_COLORS[selectedStaff.role]||''}`}>
                {selectedStaff.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
              </div>
              <p className="text-xs text-slate-500">Last active: {selectedStaff.lastActive || 'Never'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-slate-800 p-4 rounded-2xl"><p className="text-[8px] text-slate-500 uppercase font-black">Orders</p><p className="text-lg font-black">{selectedStaff.ordersHandled}</p></div>
              <div className="bg-slate-800 p-4 rounded-2xl"><p className="text-[8px] text-slate-500 uppercase font-black">Avg Time</p><p className="text-lg font-black text-emerald-400">{selectedStaff.avgTime}</p></div>
            </div>
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl">
              <div><p className="text-sm font-bold">Available</p><p className={`text-xs font-black ${selectedStaff.status==='active'?'text-emerald-400':'text-slate-500'}`}>{selectedStaff.status}</p></div>
              <button onClick={()=>handleToggleStaffStatus(selectedStaff)}
                className={`w-12 h-6 rounded-full relative transition-colors ${selectedStaff.status==='active'?'bg-emerald-600':'bg-slate-700'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedStaff.status==='active'?'right-1':'left-1'}`}></div>
              </button>
            </div>
            <button onClick={()=>handleRemoveStaff(selectedStaff.id)}
              className="w-full bg-rose-500/10 border border-rose-500/20 py-4 rounded-2xl text-xs font-black text-rose-400 uppercase">
              Remove Access
            </button>
          </div>
        )}
      </Drawer>

      {/* Add staff */}
      <Drawer isOpen={showAddStaff} onClose={()=>setShowAddStaff(false)} title="Add Staff Member">
        <div className="space-y-5 pb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
            <input type="text" value={newStaffName} onChange={e=>setNewStaffName(e.target.value)} placeholder="Ex: Ahmed Karimov"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-emerald-500 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {(['manager','fulfillment','driver'] as const).map(r => (
                <button key={r} onClick={()=>setNewStaffRole(r)}
                  className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${newStaffRole===r?'bg-emerald-600 text-white shadow-lg':'bg-slate-800 text-slate-400'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleAddStaff} disabled={!newStaffName.trim()}
            className="w-full bg-emerald-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl disabled:opacity-40">
            Add to Team
          </button>
        </div>
      </Drawer>
    </div>
  );
};

export default SupplierDashboard;
