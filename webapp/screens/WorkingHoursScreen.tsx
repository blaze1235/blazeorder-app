import React, { useState } from 'react';
import { WorkingHours } from '../types';

interface Props {
  hours: WorkingHours[];
  onUpdateHours: (hours: WorkingHours[]) => void;
  onBack: () => void;
}

const WorkingHoursScreen: React.FC<Props> = ({ hours, onUpdateHours, onBack }) => {
  const [local, setLocal] = useState<WorkingHours[]>(hours);

  const toggle = (i: number) => {
    const updated = local.map((h, idx) => idx === i ? { ...h, isOpen: !h.isOpen } : h);
    setLocal(updated);
  };

  const update = (i: number, field: 'open' | 'close', val: string) => {
    const updated = local.map((h, idx) => idx === i ? { ...h, [field]: val } : h);
    setLocal(updated);
  };

  const handleSave = () => { onUpdateHours(local); onBack(); };

  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center space-x-3">
        <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <h1 className="text-xl font-black">Working Hours</h1>
      </div>
      <div className="space-y-2">
        {local.map((h, i) => (
          <div key={h.day} className={`bg-slate-900 border rounded-2xl p-4 transition-all ${h.isOpen ? 'border-slate-800' : 'border-slate-800 opacity-60'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-black">{h.day}</p>
              <button onClick={() => toggle(i)}
                className={`w-10 h-6 rounded-full transition-all relative ${h.isOpen ? 'bg-indigo-600' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${h.isOpen ? 'left-4' : 'left-0.5'}`}></span>
              </button>
            </div>
            {h.isOpen && (
              <div className="flex space-x-3">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Open</p>
                  <input type="time" value={h.open} onChange={e => update(i, 'open', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Close</p>
                  <input type="time" value={h.close} onChange={e => update(i, 'close', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-2 text-white text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
            )}
            {!h.isOpen && <p className="text-slate-600 text-sm">Closed</p>}
          </div>
        ))}
      </div>
      <button onClick={handleSave} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-black text-sm uppercase">Save Hours</button>
    </div>
  );
};

export default WorkingHoursScreen;
