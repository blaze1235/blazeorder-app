import React from 'react';
import { Order, OrderTemplate, AppNotification } from '../types';

interface Props {
  onCreateOrder: () => void;
  onViewOrders: () => void;
  onViewWallet: () => void;
  onReorder: (o: Order) => void;
  onApplyTemplate: (t: OrderTemplate) => void;
  lastOrder: Order | undefined;
  templates: OrderTemplate[];
  balance: number;
  orders: Order[];
  t: (k: string) => string;
  notifications: AppNotification[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  currentUserId?: string;
}

const statusColor: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-400/10',
  accepted: 'text-blue-400 bg-blue-400/10',
  picked_up: 'text-purple-400 bg-purple-400/10',
  completed: 'text-emerald-400 bg-emerald-400/10',
  cancelled: 'text-rose-400 bg-rose-400/10',
};

const Home: React.FC<Props> = ({ onCreateOrder, onViewOrders, onViewWallet, onReorder, onApplyTemplate, lastOrder, templates, balance, orders }) => {
  const recent = orders.slice(0, 3);
  const pending = orders.filter(o => o.status === 'pending' || o.status === 'accepted').length;

  return (
    <div className="p-4 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-black">BlazeOrder</h1>
          <p className="text-slate-400 text-sm">Smart ordering platform</p>
        </div>
        <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-bolt text-indigo-400"></i>
        </div>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-5">
        <p className="text-indigo-200 text-xs font-black uppercase tracking-wider mb-1">Balance</p>
        <p className="text-3xl font-black text-white">${balance.toFixed(2)}</p>
        <div className="flex space-x-2 mt-4">
          <button onClick={onViewWallet} className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur py-2.5 rounded-xl text-white text-xs font-black uppercase transition-all">
            <i className="fa-solid fa-wallet mr-1.5"></i>Wallet
          </button>
          <button onClick={onCreateOrder} className="flex-1 bg-white py-2.5 rounded-xl text-indigo-700 text-xs font-black uppercase transition-all hover:bg-indigo-50">
            <i className="fa-solid fa-plus mr-1.5"></i>New Order
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {pending > 0 && (
        <button onClick={onViewOrders} className="w-full bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center space-x-3 hover:border-amber-500/40 transition-all">
          <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-clock text-amber-400"></i>
          </div>
          <div className="text-left">
            <p className="font-black text-sm">{pending} Active Order{pending > 1 ? 's' : ''}</p>
            <p className="text-slate-400 text-xs">Tap to track</p>
          </div>
          <i className="fa-solid fa-chevron-right text-slate-600 ml-auto"></i>
        </button>
      )}

      {/* Quick order */}
      <div>
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Quick Order</h2>
        <button onClick={onCreateOrder} className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 flex items-center space-x-4 transition-all">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
            <i className="fa-solid fa-cart-plus text-indigo-400 text-xl"></i>
          </div>
          <div className="text-left">
            <p className="font-black">Browse Suppliers</p>
            <p className="text-slate-400 text-xs">Select products & place order</p>
          </div>
          <i className="fa-solid fa-chevron-right text-slate-600 ml-auto"></i>
        </button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Quick Templates</h2>
          <div className="space-y-2">
            {templates.map(tmp => (
              <button key={tmp.id} onClick={() => onApplyTemplate(tmp)} className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 flex items-center space-x-3 transition-all">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-bolt text-yellow-400"></i>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-sm">{tmp.name}</p>
                  <p className="text-slate-500 text-xs">{tmp.items.length} items · {tmp.supplierName}</p>
                </div>
                <span className="text-indigo-400 text-xs font-black">USE</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Recent Orders</h2>
            <button onClick={onViewOrders} className="text-indigo-400 text-xs font-black">View All</button>
          </div>
          <div className="space-y-2">
            {recent.map(o => (
              <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-box text-slate-400"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{o.id}</p>
                  <p className="text-slate-500 text-xs">{o.supplierName} · ${o.total.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusColor[o.status] || 'text-slate-400 bg-slate-800'}`}>
                    {o.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {(o.status === 'completed') && (
                    <button onClick={() => onReorder(o)} className="text-[10px] font-black text-indigo-400">Reorder</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
