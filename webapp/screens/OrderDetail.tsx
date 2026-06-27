import React, { useState } from 'react';
import { Order, UserRole } from '../types';
import ProgressBar from '../components/ProgressBar';
import Drawer from '../components/Drawer';

interface OrderDetailProps {
  order: Order;
  onBack: () => void;
  isDistributor?: boolean;
  onUpdateStatus?: (id: string, status: Order['status'], driver?: any, reason?: string) => void;
  onReorder: (order: Order) => void;
  t: (key: string) => string;
  role: UserRole;
  // For multi-supplier sessions: sibling orders from the same session
  sessionOrders?: Order[];
}

const STATUS_ICON: Record<string, string> = {
  pending:    'fa-clock',
  accepted:   'fa-check',
  preparing:  'fa-gear',
  ready:      'fa-box',
  picked_up:  'fa-truck',
  delivered:  'fa-location-dot',
  completed:  'fa-circle-check',
  cancelled:  'fa-circle-xmark',
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'completed':  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'pending':    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'accepted': case 'preparing': case 'ready': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'delivered': case 'picked_up': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'cancelled':  return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:           return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
};

const OrderDetail: React.FC<OrderDetailProps> = ({
  order, onBack, isDistributor, onUpdateStatus, onReorder, t, role, sessionOrders
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // All orders in this session (this order + siblings), deduplicated
  const allSessionOrders: Order[] = sessionOrders && sessionOrders.length > 0
    ? sessionOrders
    : [order];

  const isMultiSupplier = allSessionOrders.length > 1;
  const sessionTotal = allSessionOrders.reduce((s, o) => s + o.total, 0);

  const handleCancel = () => {
    if (onUpdateStatus) {
      onUpdateStatus(order.id, 'cancelled', undefined, cancelReason);
      setShowCancelModal(false);
    }
  };

  const getDisplayStatus = (status: Order['status']) => {
    if (status === 'completed' || status === 'cancelled') return t(`status_${status}`);
    const key = role === 'buyer' ? `status_${status}_buyer` : `status_${status}`;
    return t(key) || t(`status_${status}_buyer`);
  };

  return (
    <div className="animate-fadeIn p-4 space-y-5 pb-36 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300 shrink-0"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate">
            {isMultiSupplier ? `Order Session` : order.id}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest truncate">
            {isMultiSupplier
              ? `${allSessionOrders.length} suppliers · ${order.date}`
              : (role === 'buyer' ? order.supplierName : `Buyer: ${order.buyerName || '—'}`)}
          </p>
        </div>
        {role === 'buyer' && order.status === 'pending' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="text-rose-500 font-bold text-xs uppercase tracking-widest shrink-0"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Multi-supplier: session total bar */}
      {isMultiSupplier && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Order Value</p>
            <p className="text-2xl font-black text-indigo-400">{sessionTotal.toLocaleString('uz-UZ') + ' sum'} sum</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase">{allSessionOrders.length} Suppliers</p>
            <p className="text-xs text-slate-400 mt-0.5">{order.date}</p>
          </div>
        </div>
      )}

      {/* Per-supplier cards */}
      {allSessionOrders.map(o => (
        <div key={o.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden">
          {/* Supplier header */}
          <div className="px-5 pt-5 pb-4 flex justify-between items-center border-b border-slate-800/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400">
                <i className="fa-solid fa-store text-sm"></i>
              </div>
              <div>
                <p className="font-bold text-slate-100">{o.supplierName}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">{o.id}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusStyle(o.status)}`}>
              {getDisplayStatus(o.status)}
            </span>
          </div>

          {/* Progress bar for this supplier */}
          <div className="px-5 py-4 border-b border-slate-800/50">
            <ProgressBar status={o.status} />
          </div>

          {/* Timeline for this supplier */}
          <div className="px-5 py-4 space-y-4 border-b border-slate-800/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('track')}</p>
            {o.timeline.map((step, idx) => {
              const isActive = idx === o.timeline.length - 1 && !['completed','cancelled'].includes(o.status);
              return (
                <div key={idx} className="flex space-x-3 relative">
                  {idx !== o.timeline.length - 1 && (
                    <div className={`absolute left-[7px] top-6 w-0.5 h-7 ${step.completed ? 'bg-indigo-600' : 'bg-slate-800'}`}></div>
                  )}
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 z-10 shrink-0 ${step.completed ? 'bg-indigo-600 border-indigo-600' : isActive ? 'bg-amber-500 border-amber-500 animate-pulse' : 'bg-slate-950 border-slate-800'}`}>
                    {step.completed && <i className="fa-solid fa-check text-[7px] text-white block text-center leading-[12px]"></i>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-bold ${step.completed ? 'text-slate-100' : isActive ? 'text-amber-400' : 'text-slate-600'}`}>{step.status}</p>
                      <span className="text-[10px] text-slate-500 font-bold shrink-0 ml-2">{step.time}</span>
                    </div>
                    {step.author && <p className="text-[10px] text-slate-500">{step.author}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Items for this supplier */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('order_summary')}</p>
            {o.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-300 shrink-0">
                    {item.quantity}×
                  </div>
                  <span className="text-slate-300 font-medium truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-200 shrink-0 ml-2">{(item.price * item.quantity).toLocaleString('uz-UZ') + ' sum'} sum</span>
              </div>
            ))}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400">Subtotal</span>
              <span className="font-black text-indigo-400">{o.total.toLocaleString('uz-UZ') + ' sum'} sum</span>
            </div>
          </div>

          {/* Confirm delivery button — per supplier */}
          {o.status === 'delivered' && role === 'buyer' && (
            <div className="px-5 pb-5">
              <button
                onClick={() => onUpdateStatus?.(o.id, 'completed')}
                className="w-full bg-emerald-600 py-3.5 rounded-2xl text-sm font-black uppercase text-white shadow-lg hover:bg-emerald-500 transition-colors"
              >
                <i className="fa-solid fa-circle-check mr-2"></i>
                Confirm Delivery — {o.supplierName}
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Decline reason if cancelled */}
      {order.status === 'cancelled' && (order.declineReason || order.cancelReason) && (
        <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl">
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Cancellation Reason</p>
          <p className="text-xs text-slate-400">{order.declineReason || order.cancelReason}</p>
        </div>
      )}

      {/* Staff action buttons */}
      <div className="fixed bottom-24 left-4 right-4 space-y-3 max-w-md mx-auto">
        {order.status === 'pending' && role === 'manager' && (
          <div className="flex space-x-3">
            <button onClick={() => onUpdateStatus?.(order.id, 'cancelled')} className="flex-1 bg-slate-800 py-4 rounded-2xl text-xs font-black text-rose-400 uppercase">{t('decline')}</button>
            <button onClick={() => onUpdateStatus?.(order.id, 'accepted')} className="flex-[1.5] bg-indigo-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl">{t('accept_order')}</button>
          </div>
        )}
        {order.status === 'accepted' && role === 'fulfillment' && (
          <button onClick={() => onUpdateStatus?.(order.id, 'preparing')} className="w-full bg-indigo-600 h-16 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">{t('status_preparing_fulfillment')}</button>
        )}
        {order.status === 'preparing' && role === 'fulfillment' && (
          <button onClick={() => onUpdateStatus?.(order.id, 'ready')} className="w-full bg-emerald-600 h-16 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">{t('status_ready_buyer')}</button>
        )}
        {order.status === 'ready' && role === 'driver' && (
          <button onClick={() => onUpdateStatus?.(order.id, 'picked_up')} className="w-full bg-indigo-600 h-16 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">{t('pick_up')}</button>
        )}
        {order.status === 'picked_up' && role === 'driver' && (
          <button onClick={() => onUpdateStatus?.(order.id, 'delivered')} className="w-full bg-emerald-600 h-16 rounded-[2rem] font-black text-lg shadow-2xl active:scale-95 transition-all">{t('confirm_delivery')}</button>
        )}
        {role === 'buyer' && (order.status === 'completed' || order.status === 'cancelled') && (
          <button onClick={() => onReorder(order)} className="w-full bg-slate-900 border border-slate-800 h-14 rounded-[2rem] font-black text-base shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-3">
            <i className="fa-solid fa-rotate-left"></i>
            <span>{t('repeat_order')}</span>
          </button>
        )}
      </div>

      <Drawer isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Order">
        <div className="space-y-6">
          <p className="text-xs text-slate-500 font-medium text-center">Are you sure? Please provide a reason.</p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Reason</label>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Ex: Wrong items, found better price..."
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-white focus:border-indigo-500 outline-none h-24"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShowCancelModal(false)} className="bg-slate-800 py-4 rounded-2xl text-xs font-black uppercase">Go Back</button>
            <button onClick={handleCancel} className="bg-rose-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl">Confirm Cancel</button>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

export default OrderDetail;
