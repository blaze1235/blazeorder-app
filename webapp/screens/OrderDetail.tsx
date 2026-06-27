import React from 'react';
import { Order, StaffMember, UserRole } from '../types';

interface Props {
  order: Order;
  onBack: () => void;
  isDistributor?: boolean;
  onUpdateStatus: (id: string, status: Order['status'], driver?: StaffMember, reason?: string) => void;
  onReorder?: (o: Order) => void;
  t: (k: string) => string;
  role?: UserRole;
  sessionOrders?: Order[];
}

const statusSteps: Order['status'][] = ['pending', 'accepted', 'picked_up', 'completed'];
const stepLabel: Record<string, string> = { pending: 'Order Placed', accepted: 'Accepted', picked_up: 'On the Way', completed: 'Delivered' };

const OrderDetail: React.FC<Props> = ({ order, onBack, isDistributor, onUpdateStatus, onReorder, role }) => {
  if (!order) return null;

  const currentStep = statusSteps.indexOf(order.status);

  const nextStatus = (): Order['status'] | null => {
    if (order.status === 'pending') return 'accepted';
    if (order.status === 'accepted') return 'picked_up';
    if (order.status === 'picked_up') return 'completed';
    return null;
  };

  const next = nextStatus();
  const canAct = isDistributor || role === 'distributor' || role === 'manager';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center space-x-3">
        <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <div>
          <h1 className="font-black text-lg leading-tight">{order.id}</h1>
          <p className="text-slate-400 text-xs">{order.date?.split('T')[0]} · {order.supplierName}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Progress */}
        {order.status !== 'cancelled' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              {statusSteps.map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${i <= currentStep ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                      {i < currentStep ? <i className="fa-solid fa-check text-xs"></i> : i + 1}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 text-center w-14">{stepLabel[step]}</p>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-3 ${i < currentStep ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
            <p className="font-black text-rose-400"><i className="fa-solid fa-xmark mr-2"></i>Order Cancelled</p>
            {order.declineReason && <p className="text-slate-400 text-sm mt-1">{order.declineReason}</p>}
          </div>
        )}

        {/* Buyer info */}
        {order.buyerName && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Buyer</p>
            <p className="font-bold">{order.buyerName}</p>
            {order.driverName && <p className="text-slate-400 text-sm"><i className="fa-solid fa-truck mr-2 text-purple-400"></i>{order.driverName}</p>}
          </div>
        )}

        {/* Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Items</p>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1.5">
                <div>
                  <p className="font-bold text-sm">{item.name}</p>
                  <p className="text-slate-500 text-xs">${item.price.toFixed(2)} × {item.quantity}</p>
                </div>
                <p className="font-black text-indigo-400">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <div className="border-t border-slate-800 pt-2 flex justify-between">
              <p className="font-black">Total</p>
              <p className="font-black text-indigo-400">${order.total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
          <p className="text-slate-400 text-sm">Payment</p>
          <span className={`text-xs font-black px-2 py-1 rounded-lg ${order.isCreditPayment ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
            {order.isCreditPayment ? 'Credit' : 'Balance'}
          </span>
        </div>

        {/* Timeline */}
        {order.timeline.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Timeline</p>
            <div className="space-y-3">
              {order.timeline.map((event, i) => (
                <div key={i} className="flex items-start space-x-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-bold text-sm">{event.status}</p>
                    <p className="text-slate-500 text-xs">{event.time} {event.author && `· ${event.author}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-6 space-y-2 border-t border-slate-800 pt-4">
        {canAct && next && (
          <button onClick={() => onUpdateStatus(order.id, next)} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
            Mark as {stepLabel[next]}
          </button>
        )}
        {canAct && order.status === 'pending' && (
          <button onClick={() => onUpdateStatus(order.id, 'cancelled', undefined, 'Declined by operator')} className="w-full bg-rose-500/10 border border-rose-500/20 py-3 rounded-2xl text-rose-400 font-black text-sm uppercase">
            Decline Order
          </button>
        )}
        {onReorder && order.status === 'completed' && (
          <button onClick={() => onReorder(order)} className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-2xl text-white font-black text-sm uppercase">
            Reorder
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
