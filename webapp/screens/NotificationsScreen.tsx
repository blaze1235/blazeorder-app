import React from 'react';
import { AppNotification, UserRole } from '../types';

interface Props {
  notifications: AppNotification[];
  t: (k: string) => string;
  role: UserRole;
  onClear: () => void;
  onMarkRead: (id: string) => void;
}

const typeStyle: Record<string, string> = {
  info: 'text-blue-400 bg-blue-400/10',
  success: 'text-emerald-400 bg-emerald-400/10',
  warning: 'text-amber-400 bg-amber-400/10',
  error: 'text-rose-400 bg-rose-400/10',
};
const typeIcon: Record<string, string> = {
  info: 'fa-circle-info',
  success: 'fa-circle-check',
  warning: 'fa-triangle-exclamation',
  error: 'fa-circle-xmark',
};

const NotificationsScreen: React.FC<Props> = ({ notifications, onClear, onMarkRead }) => {
  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Alerts</h1>
        {notifications.length > 0 && (
          <button onClick={onClear} className="text-slate-400 text-xs font-black hover:text-rose-400 transition-colors">Clear All</button>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center">
            <i className="fa-solid fa-bell-slash text-slate-600 text-2xl"></i>
          </div>
          <p className="text-slate-500 font-bold">No notifications</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map(n => (
          <button key={n.id} onClick={() => onMarkRead(n.id)}
            className={`w-full bg-slate-900 border rounded-2xl p-4 flex items-start space-x-3 text-left transition-all ${n.isRead ? 'border-slate-800' : 'border-indigo-500/30'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeStyle[n.type]}`}>
              <i className={`fa-solid ${typeIcon[n.type]} text-sm`}></i>
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${n.isRead ? 'text-slate-300' : 'text-white'}`}>{n.message}</p>
              <p className="text-slate-500 text-xs mt-0.5">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1 flex-shrink-0"></div>}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationsScreen;
