
import React, { useState } from 'react';
import { Order, DeliveryZone, ScreenType, UserRole } from '../types';

interface LogisticsHubProps {
  orders: Order[];
  zones: DeliveryZone[];
  onUpdateZones: React.Dispatch<React.SetStateAction<DeliveryZone[]>>;
  onNavigate: (screen: ScreenType) => void;
  t: (key: string) => string;
  role: UserRole;
  onUpdateStatus: (id: string, status: Order['status']) => void;
  driverId?: string;
}

const LogisticsHub: React.FC<LogisticsHubProps> = ({ orders, zones, onUpdateZones, onNavigate, t, role, onUpdateStatus, driverId }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'zones'>('queue');
  
  const deliveryQueue = orders.filter(o => 
    ['ready', 'picked_up'].includes(o.status) && 
    (role === 'driver' ? o.driverId === driverId : true)
  );

  const toggleZone = (id: string) => {
    onUpdateZones(prev => prev.map(z => z.id === id ? { ...z, isActive: !z.isActive } : z));
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">{t('logistics')}</h2>
        <div className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
           <span className="text-[10px] font-black text-emerald-400 uppercase">Live Ops</span>
        </div>
      </div>

      <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800">
        <button onClick={() => setActiveTab('queue')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'queue' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Delivery Queue</button>
        <button onClick={() => setActiveTab('zones')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'zones' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Delivery Zones</button>
      </div>

      {activeTab === 'queue' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center space-x-3">
                <i className="fa-solid fa-route text-emerald-400"></i>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase">Avg Delivery</p>
                   <p className="text-lg font-black">24m</p>
                </div>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center space-x-3 text-indigo-400">
                <i className="fa-solid fa-box"></i>
                <div>
                   <p className="text-[9px] font-black text-slate-500 uppercase">Wait Time</p>
                   <p className="text-lg font-black text-white">12m</p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Active Queue ({deliveryQueue.length})</h4>
            {deliveryQueue.length > 0 ? deliveryQueue.map(order => (
              <div key={order.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-indigo-400">
                         <i className="fa-solid fa-map-pin"></i>
                      </div>
                      <div>
                         <p className="text-sm font-black">{order.id}</p>
                         <p className="text-[10px] text-slate-500 uppercase font-black">{order.buyerName}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-emerald-400">${order.total.toFixed(0)}</p>
                   </div>
                </div>

                {order.status === 'ready' && role === 'driver' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'picked_up')}
                    className="w-full bg-indigo-600 py-4 rounded-2xl text-xs font-black uppercase text-white shadow-lg active:scale-95 transition-all"
                  >
                    {t('pick_up')}
                  </button>
                )}
                {order.status === 'picked_up' && role === 'driver' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'delivered')}
                    className="w-full bg-emerald-600 py-4 rounded-2xl text-xs font-black uppercase text-white shadow-lg active:scale-95 transition-all"
                  >
                    {t('confirm_delivery')}
                  </button>
                )}
                
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Status: {t(`status_${order.status}`)}</span>
                  <button onClick={() => onNavigate('order-detail')} className="text-[10px] font-black text-indigo-400 uppercase">Details</button>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 opacity-30">
                <i className="fa-solid fa-truck-clock text-5xl mb-4"></i>
                <p className="font-bold">No active deliveries</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configured Zones</h4>
             <button className="text-indigo-400 text-[10px] font-black uppercase">+ New Zone</button>
          </div>
          <div className="space-y-3">
            {zones.map(zone => (
              <div key={zone.id} className={`bg-slate-900 border p-5 rounded-[2.5rem] flex items-center justify-between transition-all ${zone.isActive ? 'border-slate-800' : 'border-rose-500/20 opacity-60 grayscale'}`}>
                 <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${zone.isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                       <i className="fa-solid fa-map-location-dot text-lg"></i>
                    </div>
                    <div>
                       <h4 className="text-sm font-black text-slate-100">{zone.name}</h4>
                       <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">MOV: ${zone.minOrder} • Fee: ${zone.fee} • {zone.estTime}</p>
                    </div>
                 </div>
                 <button 
                  onClick={() => toggleZone(zone.id)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${zone.isActive ? 'bg-emerald-600' : 'bg-slate-800'}`}
                 >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${zone.isActive ? 'right-1' : 'left-1'}`}></div>
                 </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsHub;
