import React, { useState } from 'react';
import { Order, UserRole } from '../types';

interface Props {
  orders: Order[];
  onViewDetails: (o: Order) => void;
  onReorder: (o: Order) => void;
  onCreateOrder: () => void;
  t: (k: string) => string;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  role: UserRole;
  currentUserId?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pending',    color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',   icon: 'fa-clock' },
  accepted:  { label: 'Accepted',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',       icon: 'fa-check' },
  picked_up: { label: 'On the way', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: 'fa-truck' },
  completed: { label: 'Delivered',  color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: 'fa-circle-check' },
  cancelled: { label: 'Cancelled',  color: 'text-rose-400 bg-rose-400/10 border-rose-400/20',       icon: 'fa-xmark' },
};

const tabs = ['All', 'Active', 'Completed', 'Cancelled'];

const MyOrders: React.FC<Props> = ({ orders, onViewDetails, onReorder, onCreateOrder }) => {
  const [tab, setTab] = useState('All');

  const filtered = orders.filter(o => {
    if (tab === 'Active') return ['pending', 'accepted', 'picked_up'].includes(o.status);
    if (tab === 'Completed') return o.status === 'completed';
    if (tab === 'Cancelled') return o.status === 'cancelled';
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-black mb-4">My Orders</h1>
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center">
              <i className="fa-solid fa-box-open text-slate-600 text-2xl"></i>
            </div>
            <p className="text-slate-500 font-bold">No orders yet</p>
            <button onClick={onCreateOrder} className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-2xl text-white font-black text-sm uppercase">
              Place First Order
            </button>
          </div>
        )}
        {filtered.map(o => {
          const cfg = statusConfig[o.status] || statusConfig.pending;
          return (
            <button key={o.id} onClick={() => onViewDetails(o)} className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/30 rounded-2xl p-4 text-left transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-black text-sm">{o.id}</p>
                  <p className="text-slate-400 text-xs">{o.supplierName}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${cfg.color}`}>
                  <i className={`fa-solid ${cfg.icon} mr-1`}></i>{cfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-xs">{o.items.length} item{o.items.length !== 1 ? 's' : ''} · {o.date?.split('T')[0]}</p>
                <div className="flex items-center space-x-2">
                  <p className="font-black text-indigo-400">${o.total.toFixed(2)}</p>
                  {o.status === 'completed' && (
                    <button onClick={e => { e.stopPropagation(); onReorder(o); }} className="text-[10px] font-black text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrders;
