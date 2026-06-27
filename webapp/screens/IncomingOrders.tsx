
import React, { useState } from 'react';
import { Order, UserRole, StaffMember } from '../types';
import Drawer from '../components/Drawer';
import ProgressBar from '../components/ProgressBar';

interface IncomingOrdersProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status'], driver?: StaffMember, reason?: string) => void;
  onViewDetails: (order: Order) => void;
  t: (key: string) => string;
  role: UserRole;
  staff: StaffMember[];
  activeDriverId?: string;
}

const IncomingOrders: React.FC<IncomingOrdersProps> = ({ orders, onUpdateStatus, onViewDetails, t, role, staff, activeDriverId }) => {
  const roleFilters = () => {
    let base: string[] = [];
    if (role === 'distributor' || role === 'manager') base = ['pending', 'accepted', 'picked_up', 'completed', 'cancelled'];
    else if (role === 'fulfillment') base = ['accepted', 'preparing', 'ready'];
    else if (role === 'driver') base = ['ready', 'picked_up', 'delivered'];
    if (role === 'distributor' || role === 'manager') return ['all', ...base];
    return base;
  };

  const tabs = roleFilters();
  const [filter, setFilter] = useState<string>(tabs[0]);
  const [declineOrder, setDeclineOrder] = useState<string | null>(null);
  const [assignDriverModal, setAssignDriverModal] = useState<string | null>(null);

  const declineReasons = [ t('out_of_stock'), t('delivery_issues'), t('closing_soon'), t('capacity_limit'), t('other') ];
  const drivers = staff.filter(s => s.role === 'driver' || s.role === 'owner');

  const sortedOrders = [...orders].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filteredOrders = sortedOrders.filter(o => {
    // 1. Isolation: Driver only sees their assigned tasks
    if (role === 'driver' && o.driverId !== activeDriverId) return false;
    
    // 2. Status Filter
    if (filter === 'all') return true;
    return o.status === filter;
  });

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">{role === 'fulfillment' ? t('assembly_checklist') : t('orders')}</h2>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}>
            {f === 'all' ? 'All Orders' : t(`status_${f}_buyer`)} {f !== 'all' && orders.filter(o=>o.status===f).length > 0 && `(${orders.filter(o=>o.status===f).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredOrders.length > 0 ? filteredOrders.map(order => (
          <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-6 space-y-4 relative overflow-hidden shadow-xl group">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-indigo-400">
                   <i className="fa-solid fa-user-circle text-xl"></i>
                </div>
                <div>
                   <h4 className="font-bold text-slate-100">{order.buyerName}</h4>
                   <p className="text-[10px] text-slate-500 font-black uppercase">{order.id}</p>
                </div>
              </div>
              <p className="text-xs font-black text-slate-400">{order.total.toLocaleString('uz-UZ') + ' sum'}</p>
            </div>

            {/* Role specific order info */}
            {role === 'fulfillment' && order.items.length > 0 && (
              <div className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Items to Assemble</p>
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <p key={i} className="text-[11px] font-bold text-slate-300">
                      {item.quantity}x <span className="text-indigo-400">{item.name}</span> ({item.category})
                    </p>
                  ))}
                </div>
              </div>
            )}

            <ProgressBar status={order.status} compact />

            <div className="flex space-x-3 pt-2">
               {/* 4-step flow: Pending → Accepted → In Delivery → Completed */}
               {order.status === 'pending' && (role === 'manager' || role === 'distributor') && (
                 <>
                   <button onClick={() => setDeclineOrder(order.id)} className="flex-1 bg-slate-800 py-4 rounded-2xl text-[10px] font-black text-rose-400 uppercase hover:bg-rose-500/10 transition-colors">Decline</button>
                   <button onClick={() => onUpdateStatus(order.id, 'accepted')} className="flex-[1.5] py-4 rounded-2xl text-[10px] font-black text-white uppercase shadow-xl bg-indigo-600 active:scale-95 hover:bg-indigo-500 transition-all">Accept Order</button>
                 </>
               )}
               {order.status === 'accepted' && (role === 'manager' || role === 'distributor') && (
                 <button onClick={() => onUpdateStatus(order.id, 'picked_up')} className="w-full bg-indigo-600 py-4 rounded-2xl text-[10px] font-black text-white uppercase shadow-xl hover:bg-indigo-500 transition-colors">Mark In Delivery</button>
               )}
               {order.status === 'picked_up' && (role === 'manager' || role === 'distributor') && (
                 <button onClick={() => onUpdateStatus(order.id, 'completed')} className="w-full bg-emerald-600 py-4 rounded-2xl text-[10px] font-black text-white uppercase shadow-xl hover:bg-emerald-500 transition-colors">Mark Completed</button>
               )}
            </div>
            
            <button onClick={() => onViewDetails(order)} className="w-full text-center text-[10px] font-black text-slate-600 pt-2 hover:text-indigo-400 transition-colors uppercase tracking-widest">Details</button>
          </div>
        )) : (
          <div className="py-20 text-center opacity-30 flex flex-col items-center">
            <i className="fa-solid fa-clipboard-list text-5xl mb-4"></i>
            <p className="font-bold">No tasks in this category</p>
          </div>
        )}
      </div>

      {/* DRIVER ASSIGNMENT MODAL */}
      <Drawer isOpen={!!assignDriverModal} onClose={() => setAssignDriverModal(null)} title="Select Courier">
        <p className="text-xs text-slate-500 font-bold uppercase mb-4 text-center">Assign an online driver to start</p>
        <div className="space-y-2 pb-6">
          {drivers.map(driver => {
            const isOffline = driver.status === 'offline';
            return (
              <button 
                key={driver.id} 
                disabled={isOffline}
                onClick={() => { if(assignDriverModal) onUpdateStatus(assignDriverModal, 'accepted', driver); setAssignDriverModal(null); }} 
                className={`w-full p-4 rounded-2xl text-left flex items-center space-x-4 border transition-colors ${isOffline ? 'bg-slate-900 border-slate-800 opacity-40 cursor-not-allowed' : 'bg-slate-800 border-slate-700 active:bg-indigo-600 hover:border-indigo-500/50'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOffline ? 'text-slate-600' : 'text-indigo-400'} bg-slate-900`}>
                  <i className="fa-solid fa-truck"></i>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-100">{driver.name}</p>
                  <p className={`text-[10px] font-black uppercase ${isOffline ? 'text-rose-500' : 'text-emerald-500'}`}>{driver.status}</p>
                </div>
                {isOffline && <span className="text-[8px] font-black text-rose-500 uppercase italic">Unavailable</span>}
              </button>
            );
          })}
        </div>
        <button onClick={() => setAssignDriverModal(null)} className="w-full bg-slate-800 py-4 rounded-2xl text-xs font-black uppercase">Cancel</button>
      </Drawer>

      {/* DECLINE REASON MODAL */}
      <Drawer isOpen={!!declineOrder} onClose={() => setDeclineOrder(null)} title="Decline Reason">
        <div className="space-y-3">
          {declineReasons.map(reason => (
            <button key={reason} onClick={() => { if(declineOrder) onUpdateStatus(declineOrder, 'cancelled', undefined, reason); setDeclineOrder(null); }} className="w-full text-left p-5 bg-slate-800 rounded-2xl text-sm font-bold text-slate-100 transition-all active:bg-rose-500/10 active:text-rose-400">
              {reason}
            </button>
          ))}
        </div>
      </Drawer>
    </div>
  );
};

export default IncomingOrders;
