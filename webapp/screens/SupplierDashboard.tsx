import React, { useState } from 'react';
import { Order, Product, StaffMember } from '../types';
import { AccountProfile } from '../api';
import IncomingOrders from './IncomingOrders';
import ProductManagement from './ProductManagement';

interface Props {
  account: AccountProfile;
  orders: Order[];
  products: Product[];
  onUpdateStatus: (id: string, status: Order['status'], driver?: StaffMember, reason?: string) => void;
  onUpdateProduct: (p: Product) => void;
  onLogout: () => void;
  t: (k: string) => string;
  apiOnline: boolean;
}

type Tab = 'orders' | 'products' | 'settings';

const SupplierDashboard: React.FC<Props> = ({ account, orders, products, onUpdateStatus, onUpdateProduct, onLogout, t, apiOnline }) => {
  const [tab, setTab] = useState<Tab>('orders');

  const pending = orders.filter(o => o.status === 'pending').length;
  const today = orders.filter(o => o.date?.startsWith(new Date().toISOString().slice(0, 10))).length;
  const revenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stockLevel <= p.lowStockAlert).length;

  const tabs: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: 'orders', icon: 'fa-clipboard-list', label: 'Orders', badge: pending || undefined },
    { id: 'products', icon: 'fa-box', label: 'Products', badge: lowStock || undefined },
    { id: 'settings', icon: 'fa-gear', label: 'Settings' },
  ];

  const renderContent = () => {
    if (tab === 'orders') return (
      <IncomingOrders orders={orders} onUpdateStatus={onUpdateStatus} onViewDetails={() => {}} t={t} role="distributor" staff={[]} />
    );
    if (tab === 'products') return (
      <ProductManagement products={products} onUpdateProduct={onUpdateProduct}
        onAddProduct={async () => {}} role="distributor"
        suppliers={[account.linked_name]} />
    );
    return (
      <div className="p-4 space-y-6 animate-fadeIn pb-24">
        <h2 className="text-2xl font-black">Settings</h2>
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Today's Orders", value: String(today), color: 'text-indigo-400' },
            { label: 'Revenue', value: `$${revenue.toFixed(0)}`, color: 'text-emerald-400' },
            { label: 'Low Stock', value: String(lowStock), color: lowStock > 0 ? 'text-rose-400' : 'text-slate-400' },
            { label: 'Products', value: String(products.length), color: 'text-slate-300' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
              <p className={`font-black text-xl ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-[10px] font-bold uppercase">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Account info */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-store text-indigo-400 text-lg"></i>
            </div>
            <div>
              <p className="font-black">{account.linked_name}</p>
              <p className="text-slate-500 text-xs uppercase font-bold">{account.type} · {account.username}</p>
            </div>
          </div>
          <div className={`flex items-center space-x-2 text-xs font-bold ${apiOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
            <div className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
            <span>{apiOnline ? 'API Connected' : 'API Offline'}</span>
          </div>
        </div>
        <button onClick={onLogout} className="w-full bg-rose-500/10 border border-rose-500/20 py-4 rounded-2xl text-rose-400 font-black text-sm uppercase">
          <i className="fa-solid fa-right-from-bracket mr-2"></i>Sign Out
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-black text-lg">{account.linked_name}</h1>
          <p className="text-slate-400 text-xs">{pending > 0 ? `${pending} pending order${pending > 1 ? 's' : ''}` : 'All caught up'}</p>
        </div>
        <div className="w-9 h-9 bg-indigo-600/20 rounded-xl flex items-center justify-center">
          <span className="font-black text-indigo-400 text-sm">{account.linked_name.charAt(0)}</span>
        </div>
      </div>

      <main className="flex-1 overflow-hidden">{renderContent()}</main>

      {/* Bottom nav */}
      <nav className="flex border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl flex-shrink-0">
        {tabs.map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 space-y-1 relative transition-colors ${tab === item.id ? 'text-indigo-400' : 'text-slate-600'}`}>
            {item.badge && item.badge > 0 && (
              <div className="absolute top-1.5 right-1/4 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">{item.badge}</div>
            )}
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            <span className="text-[8px] font-black uppercase">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default SupplierDashboard;
