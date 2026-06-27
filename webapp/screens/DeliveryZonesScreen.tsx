import React, { useState } from 'react';
import { DeliveryZone } from '../types';

interface Props {
  zones: DeliveryZone[];
  onUpdateZones: (zones: DeliveryZone[]) => void;
  onBack: () => void;
}

const DeliveryZonesScreen: React.FC<Props> = ({ zones, onUpdateZones, onBack }) => {
  const [local, setLocal] = useState<DeliveryZone[]>(zones);

  const toggle = (id: string) => {
    setLocal(prev => prev.map(z => z.id === id ? { ...z, isActive: !z.isActive } : z));
  };

  const handleSave = () => { onUpdateZones(local); onBack(); };

  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center space-x-3">
        <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <h1 className="text-xl font-black">Delivery Zones</h1>
      </div>
      <div className="space-y-2">
        {local.map(zone => (
          <div key={zone.id} className={`bg-slate-900 border rounded-3xl p-4 transition-all ${zone.isActive ? 'border-slate-800' : 'border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-black">{zone.name}</p>
                <p className="text-slate-400 text-xs">{zone.estTime}</p>
              </div>
              <button onClick={() => toggle(zone.id)}
                className={`w-10 h-6 rounded-full transition-all relative ${zone.isActive ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${zone.isActive ? 'left-4' : 'left-0.5'}`}></span>
              </button>
            </div>
            <div className="flex space-x-4 text-sm">
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase">Min Order</p>
                <p className="font-black text-indigo-400">${zone.minOrder}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase">Delivery Fee</p>
                <p className="font-black">{zone.fee === 0 ? <span className="text-emerald-400">Free</span> : `$${zone.fee}`}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-black text-sm uppercase">Save Zones</button>
    </div>
  );
};

export default DeliveryZonesScreen;
