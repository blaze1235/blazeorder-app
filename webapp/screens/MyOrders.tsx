import React, { useState } from 'react';
import { Order, UserRole } from '../types';
import ProgressBar from '../components/ProgressBar';

interface MyOrdersProps {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onReorder: (order: Order) => void;
  onCreateOrder: () => void;
  t: (key: string) => string;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  role: UserRole;
  currentUserId?: string; // chat_id or buyerName to filter client's own orders
}

const MyOrders: React.FC<MyOrdersProps> = ({
  orders, onViewDetails, onReorder, onCreateOrder, t, onUpdateStatus, role, currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // Clients only see their own orders; staff/distributor see all
  const myOrders = (role === 'buyer' && currentUserId)
    ? orders.filter(o => o.clientChatId === currentUserId || o.buyerName === currentUserId)
    : orders;

  // Newest first
  const sorted = [...myOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredOrders = sorted.filter(o =>
    activeTab === 'active'
      ? !['completed', 'cancelled'].includes(o.status)
      : ['completed', 'cancelled'].includes(o.status)
  );

  // Group orders by sessionId so multi-supplier checkout shows as one session
  const groupedBySession: Record<string, Order[]> = {};
  const sessionKeyOrder: string[] = [];
  filteredOrders.forEach(o => {
    const key = o.sessionId || o.id;
    if (!groupedBySession[key]) { groupedBySession[key] = []; sessionKeyOrder.push(key); }
    groupedBySession[key].push(o);
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':  return 'bg-emerald-500/10 text-emerald-400';
      case 'pending':    return 'bg-amber-500/10 text-amber-400';
      case 'accepted': case 'preparing': case 'ready': return 'bg-indigo-500/10 text-indigo-400';
      case 'delivered': case 'picked_up': return 'bg-blue-500/10 text-blue-400';
      case 'cancelled':  return 'bg-rose-500/10 text-rose-400';
      default:           return 'bg-slate-500/10 text-slate-400';
    }
  };

  // For a session group, pick the "worst" status to show overall
  const sessionStatus = (group: Order[]): Order['status'] => {
    const priority = ['cancelled','pending','accepted','preparing','ready','picked_up','delivered','completed'];
    return group.reduce<Order['status']>((worst, o) => {
      return priority.indexOf(o.status) < priority.indexOf(worst) ? o.status : worst;
    }, group[0].status);
  };

  const sessionTotal = (group: Order[]) => group.reduce((s, o) => s + o.total, 0);

  return (
    <div className="animate-fadeIn p-4 space-y-5 pb-24 w-full max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('orders')}</h2>
        {role === 'buyer' && (
          <button
            onClick={onCreateOrder}
            className="bg-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
          >
            <i className="fa-solid fa-plus mr-2"></i>{t('new_order')}
          </button>
        )}
      </div>

      <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
        >{t('active_order')}</button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'completed' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
        >{t('history')}</button>
      </div>

      <div className="space-y-4">
        {Object.keys(groupedBySession).length === 0 ? (
          <div className="py-20 text-center opacity-40">
            <i className="fa-solid fa-box-open text-5xl mb-4"></i>
            <p className="font-bold">No orders found</p>
          </div>
        ) : sessionKeyOrder.map((sessionKey) => {
          const group = groupedBySession[sessionKey];
          const isMulti = group.length > 1;
          const overallStatus = sessionStatus(group);
          const total = sessionTotal(group);
          return (
            <div key={sessionKey} className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden">
              {/* Session header */}
              {isMulti && (
                <div className="px-5 pt-4 pb-2 flex justify-between items-center border-b border-slate-800/50">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Combined Order</p>
                    <p className="text-xs font-bold text-slate-300 mt-0.5">{group[0].date}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusStyle(overallStatus)}`}>
                      {t(`status_${overallStatus}`)}
                    </span>
                    <p className="text-base font-black text-slate-100 mt-1">{total.toLocaleString('uz-UZ') + ' sum'}</p>
                  </div>
                </div>
              )}

              {/* Each supplier's sub-order */}
              {group.map((order, idx) => (
                <div
                  key={order.id}
                  onClick={() => onViewDetails(order)}
                  className={`p-5 cursor-pointer hover:bg-slate-800/30 active:bg-slate-800/50 transition-all ${isMulti && idx < group.length - 1 ? 'border-b border-slate-800/50' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400">
                        <i className="fa-solid fa-store text-sm"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">{order.supplierName}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{order.id}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                      {t(`status_${order.status}`)}
                    </span>
                  </div>

                  {/* Items preview */}
                  <p className="text-[11px] text-slate-400 mb-3 line-clamp-1">
                    {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                  </p>

                  {!['completed','cancelled'].includes(order.status) && (
                    <div className="mb-3">
                      <ProgressBar status={order.status} compact />
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <p className="text-xs text-slate-500">{order.items.length} {t('items')}</p>
                    <p className="text-base font-black text-indigo-400">{order.total.toLocaleString('uz-UZ') + ' sum'}</p>
                  </div>

                  {order.status === 'picked_up' && role === 'buyer' && (
                    <button
                      onClick={e => { e.stopPropagation(); onUpdateStatus(order.id, 'completed'); }}
                      className="mt-3 w-full bg-emerald-600 py-3 rounded-2xl text-xs font-black uppercase text-white shadow-lg hover:bg-emerald-500 transition-colors"
                    >
                      {t('confirm_delivery')} — {order.supplierName}
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyOrders;
