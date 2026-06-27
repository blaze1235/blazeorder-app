
import React, { useState } from 'react';
import { DeliveryZone } from '../types';
import Drawer from '../components/Drawer';

interface DeliveryZonesScreenProps {
  zones: DeliveryZone[];
  onUpdateZones: (zones: DeliveryZone[]) => void;
  onBack: () => void;
}

const DeliveryZonesScreen: React.FC<DeliveryZonesScreenProps> = ({ zones, onUpdateZones, onBack }) => {
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const toggleZone = (id: string) => {
    onUpdateZones(zones.map(z => z.id === id ? {...z, isActive: !z.isActive} : z));
  };

  const handleUpdateZone = (minOrder: number, fee: number) => {
    if (editingZone) {
      onUpdateZones(zones.map(z => z.id === editingZone.id ? { ...z, minOrder, fee } : z));
      setEditingZone(null);
    }
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-24 md:px-12 w-full max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h2 className="text-xl font-black">Delivery Zones</h2>
      </div>

      <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-3xl text-xs text-indigo-400 font-medium">
        Click a zone to edit Minimum Order Values (MOV) and Fees. Restricted zones will block buyer checkout.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map(zone => (
          <div key={zone.id} className={`bg-slate-900 border p-5 rounded-[2.5rem] flex items-center justify-between transition-all ${zone.isActive ? 'border-slate-800' : 'border-rose-500/20 opacity-60 grayscale'}`}>
             <button 
                onClick={() => setEditingZone(zone)}
                className="flex items-center space-x-4 flex-1 text-left"
             >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${zone.isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                   <i className="fa-solid fa-map-location-dot text-lg"></i>
                </div>
                <div>
                   <p className="font-bold text-sm text-slate-100">{zone.name}</p>
                   <p className="text-[9px] text-slate-500 font-black uppercase mt-0.5 tracking-wider">MOV: ${zone.minOrder} • Fee: ${zone.fee} • {zone.estTime}</p>
                </div>
             </button>
             <button onClick={() => toggleZone(zone.id)} className={`w-12 h-6 rounded-full relative transition-colors ${zone.isActive ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${zone.isActive ? 'right-1' : 'left-1'}`}></div>
             </button>
          </div>
        ))}
      </div>
      
      <button className="w-full bg-slate-900 border-2 border-dashed border-slate-800 py-6 rounded-3xl text-slate-500 font-black text-sm flex items-center justify-center space-x-3 active:scale-[0.98] transition-all">
         <i className="fa-solid fa-plus-circle"></i>
         <span>Add New Zone</span>
      </button>

      <Drawer isOpen={!!editingZone} onClose={() => setEditingZone(null)} title={`Edit ${editingZone?.name} Settings`}>
         <div className="space-y-6">
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Minimum Order Value ($)</label>
                  <input 
                    type="number" 
                    defaultValue={editingZone?.minOrder}
                    id="minOrderInput"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Delivery Fee ($)</label>
                  <input 
                    type="number" 
                    defaultValue={editingZone?.fee}
                    id="feeInput"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none"
                  />
               </div>
            </div>
            <button 
               onClick={() => {
                  const m = Number((document.getElementById('minOrderInput') as HTMLInputElement).value);
                  const f = Number((document.getElementById('feeInput') as HTMLInputElement).value);
                  handleUpdateZone(m, f);
               }}
               className="w-full bg-indigo-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl"
            >
               Update Zone Constraints
            </button>
         </div>
      </Drawer>
    </div>
  );
};

export default DeliveryZonesScreen;
