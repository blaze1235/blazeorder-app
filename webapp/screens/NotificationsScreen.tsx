
import React from 'react';
import { AppNotification, UserRole } from '../types';

interface NotificationsScreenProps {
  notifications: AppNotification[];
  t: (key: string) => string;
  role: UserRole;
  onClear: () => void;
  onMarkRead: (id: string) => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ notifications, t, role, onClear, onMarkRead }) => {
  const filteredNotifs = notifications.filter(n => {
    if (!n.roleTarget) return true;
    return n.roleTarget.includes(role);
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return 'fa-circle-check text-emerald-400';
      case 'warning': return 'fa-circle-exclamation text-amber-400';
      case 'error': return 'fa-circle-xmark text-rose-400';
      default: return 'fa-circle-info text-indigo-400';
    }
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-24 md:px-12 w-full max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-black">{t('notifications')}</h2>
           <p className="text-xs text-slate-500 font-medium">Activity and system alerts</p>
        </div>
        <button 
          onClick={onClear} 
          className="text-[10px] font-black text-rose-400 uppercase tracking-widest border border-rose-500/20 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-all"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {filteredNotifs.length > 0 ? filteredNotifs.map((notif) => (
          <div 
            key={notif.id} 
            onClick={() => onMarkRead(notif.id)}
            className={`p-5 rounded-3xl border flex items-start space-x-4 transition-all cursor-pointer ${notif.isRead ? 'bg-slate-900/40 border-slate-800/60' : 'bg-slate-900 border-indigo-500/30 shadow-lg shadow-indigo-600/5'}`}
          >
             <div className="mt-1">
               <i className={`fa-solid ${getIcon(notif.type)} text-lg`}></i>
             </div>
             <div className="flex-1 min-w-0">
               <div className="flex justify-between items-center mb-1">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                   {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </p>
                 {!notif.isRead && <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>}
               </div>
               <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-slate-400' : 'text-slate-100 font-medium'}`}>
                 {notif.message}
               </p>
               {notif.orderId && (
                 <p className="text-[10px] font-black text-indigo-400 uppercase mt-2">
                   Order Ref: {notif.orderId}
                 </p>
               )}
             </div>
          </div>
        )) : (
          <div className="py-24 text-center opacity-20 flex flex-col items-center">
            <i className="fa-solid fa-bell-slash text-6xl mb-4"></i>
            <p className="font-bold">No new notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen;
