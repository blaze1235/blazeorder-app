import React from 'react';
import { Order, OrderTemplate, AppNotification } from '../types';
import ProgressBar from '../components/ProgressBar';

interface HomeProps {
  onCreateOrder: () => void;
  onViewOrders: () => void;
  onViewWallet: () => void;
  onReorder: (order: Order) => void;
  onApplyTemplate: (template: OrderTemplate) => void;
  lastOrder?: Order;
  templates: OrderTemplate[];
  balance: number;
  orders: Order[];
  t: (key: string) => string;
  notifications: AppNotification[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  currentUserId?: string;
}

const Home: React.FC<HomeProps> = ({
  onCreateOrder, onViewOrders, onViewWallet, onReorder, onApplyTemplate,
  lastOrder, templates, balance, orders, t, notifications, onUpdateStatus, currentUserId
}) => {
  // Only show this user's active orders
  const myOrders = currentUserId
    ? orders.filter(o => o.clientChatId === currentUserId || o.buyerName === currentUserId)
    : orders;

  const activeOrders = myOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
  const monthlySpend = myOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.total, 0);
  const latestNotif  = notifications[0];

  // Group active orders by session
  const activeSessions: Record<string, Order[]> = {};
  activeOrders.forEach(o => {
    const key = o.sessionId || o.id;
    if (!activeSessions[key]) activeSessions[key] = [];
    activeSessions[key].push(o);
  });

  return (
    <div className="flex flex-col space-y-5 animate-fadeIn pb-8 max-w-full overflow-x-hidden">
      {/* Header card */}
      <div className="relative pt-12 pb-8 px-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-b-[2.5rem] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg rotate-3">
              <span className="text-2xl font-black text-indigo-600">B</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">BlazeOrder</h1>
              <p className="text-xs text-indigo-300 font-medium opacity-80 uppercase tracking-widest">Order Assistant</p>
            </div>
          </div>
          <button className="relative w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
            <i className="fa-solid fa-bell"></i>
            {notifications.some(n => !n.isRead) && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>
        </div>

        <div className="bg-indigo-600 p-5 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-indigo-100 text-xs font-medium mb-1 uppercase tracking-wider">{t('available_balance')}</p>
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-black text-white">{balance.toLocaleString('uz-UZ') + ' sum'} sum</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-indigo-100 text-[10px] font-black uppercase mb-1">{t('monthly_spend')}</p>
              <span className="text-lg font-bold text-white">{monthlySpend.toLocaleString('uz-UZ') + ' sum'} sum</span>
            </div>
          </div>
          <button onClick={onViewWallet} className="mt-4 w-full bg-white text-indigo-600 py-3 rounded-xl text-sm font-black active:scale-95 transition-all">
            {t('manage_wallet')}
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {latestNotif && (
        <div className="px-5">
          <div className={`p-4 rounded-2xl border flex items-center space-x-3 ${latestNotif.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'}`}>
            <i className={`fa-solid ${latestNotif.type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle'} shrink-0`}></i>
            <p className="text-xs font-bold truncate">{latestNotif.message}</p>
          </div>
        </div>
      )}

      {/* Active orders widget — one card per session */}
      {Object.entries(activeSessions).map(([sessionKey, group]) => {
        const isMulti = group.length > 1;
        const sessionTotal = group.reduce((s, o) => s + o.total, 0);

        return (
          <div key={sessionKey} className="px-5">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shrink-0">
                    <i className="fa-solid fa-truck-ramp-box"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase">
                      {isMulti ? `${group.length} Active Orders` : `Active Order: ${group[0].id}`}
                    </p>
                    {isMulti && (
                      <p className="text-xs font-bold text-slate-300">{sessionTotal.toLocaleString('uz-UZ') + ' sum'} sum total</p>
                    )}
                  </div>
                </div>
                <button onClick={onViewOrders} className="text-indigo-400 text-[10px] font-black uppercase shrink-0">
                  {t('track')}
                </button>
              </div>

              {/* Per-supplier mini status rows */}
              {group.map(o => (
                <div key={o.id} className="bg-slate-800/40 rounded-2xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-300">{o.supplierName}</p>
                    <span className="text-[10px] font-black text-indigo-300 uppercase">
                      {t(`status_${o.status}_buyer`) || o.status}
                    </span>
                  </div>
                  <ProgressBar status={o.status} compact />
                  {o.status === 'delivered' && (
                    <button
                      onClick={() => onUpdateStatus(o.id, 'completed')}
                      className="w-full bg-emerald-600 py-2.5 rounded-xl text-xs font-black uppercase text-white animate-pulse"
                    >
                      {t('confirm_delivery')} — {o.supplierName}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Action buttons */}
      <div className="px-5 space-y-4">
        <button
          onClick={onCreateOrder}
          className="w-full h-20 bg-slate-50 text-slate-900 rounded-3xl flex items-center justify-between px-6 shadow-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-cart-plus text-xl"></i>
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">{t('new_order')}</h3>
              <p className="text-xs text-slate-500">Agent-free instant checkout</p>
            </div>
          </div>
          <i className="fa-solid fa-chevron-right text-slate-300"></i>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center space-x-3 active:scale-95 transition-all">
            <i className="fa-solid fa-heart text-rose-500"></i>
            <span className="text-xs font-bold">{t('wishlist')}</span>
          </button>
          <button
            onClick={() => lastOrder && onReorder(lastOrder)}
            className="bg-slate-900 border border-slate-800 p-4 rounded-3xl flex items-center space-x-3 active:scale-95 transition-all"
          >
            <i className="fa-solid fa-bolt text-amber-500"></i>
            <span className="text-xs font-bold">{t('quick_repeat')}</span>
          </button>
        </div>

        {lastOrder && (
          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('quick_reorder')}</h4>
              <span className="text-[10px] text-slate-500">{lastOrder.date}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                  <i className="fa-solid fa-rotate-left"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-200 truncate">{lastOrder.supplierName}</p>
                  <p className="text-xs text-slate-500">{lastOrder.total.toLocaleString('uz-UZ') + ' sum'} sum</p>
                </div>
              </div>
              <button
                onClick={() => onReorder(lastOrder)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-indigo-600/20 shrink-0 ml-3"
              >
                {t('repeat_order')}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center px-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('order_templates')}</h4>
          <button className="text-indigo-400 text-[10px] font-black uppercase">{t('manage')}</button>
        </div>
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {templates.map(tmp => (
            <button
              key={tmp.id}
              onClick={() => onApplyTemplate(tmp)}
              className="flex-shrink-0 bg-slate-900 border border-slate-800 p-4 rounded-2xl w-36 text-left space-y-2 active:scale-95 transition-all"
            >
              <i className="fa-solid fa-file-invoice text-indigo-400"></i>
              <p className="text-xs font-bold text-slate-200 line-clamp-1">{tmp.name}</p>
              <p className="text-[10px] text-slate-500">{tmp.items.length} {t('items')}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
