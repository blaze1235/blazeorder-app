import React, { useState } from 'react';
import { Order, StaffMember, UserRole } from '../types';

interface Props {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status'], driver?: StaffMember, reason?: string) => void;
  onViewDetails: (o: Order) => void;
  t: (k: string) => string;
  role: UserRole;
  staff: StaffMember[];
}

const tabs = ['All', 'Pending', 'Active', 'Completed', 'Cancelled'];
const statusBadge: Record<string, string> = {
  pending:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  accepted:  'text-blue-400 bg-blue-400/10 border-blue-400/20',
  picked_up: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  completed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  cancelled: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

const IncomingOrders: React.FC<Props> = ({ orders, onUpdateStatus, onViewDetails, staff }) => {
  const [tab, setTab] = useState('All');

  const filtered = orders.filter(o => {
    if (tab === 'Pending') return o.status === 'pending';
    if (tab === 'Active') return ['accepted', 'picked_up'].includes(o.status);
    if (tab === 'Completed') return o.status === 'completed';
    if (tab === 'Cancelled') return o.status === 'cancelled';
    return true;
  });

  const drivers = staff.filter(s => s.role === 'driver');

  return (
    <div className="flex flex-col h-full max-h-screen">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-black mb-4">Incoming Orders</h1>
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
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-inbox text-4xl mb-3"></i>
            <p className="font-bold">No orders</p>
          </div>
        )}
        {filtered.map(o => (
          <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-black">{o.id}</p>
                <p className="text-slate-400 text-xs">{o.buyerName} · {o.date?.split('T')[0]}</p>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${statusBadge[o.status] || 'text-slate-400 border-slate-700 bg-slate-800'}`}>
                {o.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="text-sm">
              {o.items.slice(0, 2).map((item, i) => (
                <p key={i} className="text-slate-300">{item.quantity}× {item.name}</p>
              ))}
              {o.items.length > 2 && <p className="text-slate-500 text-xs">+{o.items.length - 2} more</p>}
            </div>

            <div className="flex items-center justify-between">
              <p className="font-black text-indigo-400">${o.total.toFixed(2)}</p>
              <div className="flex space-x-2">
                <button onClick={() => onViewDetails(o)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black transition-all">Details</button>
                {o.status === 'pending' && (
                  <>
                    <button onClick={() => onUpdateStatus(o.id, 'accepted')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black text-white transition-all">Accept</button>
                    <button onClick={() => onUpdateStatus(o.id, 'cancelled', undefined, 'Declined')} className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-xl text-xs font-black text-rose-400 transition-all">Decline</button>
                  </>
                )}
                {o.status === 'accepted' && (
                  <button onClick={() => {
                    const driver = drivers.find(d => d.status === 'active');
                    onUpdateStatus(o.id, 'picked_up', driver);
                  }} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-black text-white transition-all">Dispatch</button>
                )}
                {o.status === 'picked_up' && (
                  <button onClick={() => onUpdateStatus(o.id, 'completed')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black text-white transition-all">Complete</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingOrders;
