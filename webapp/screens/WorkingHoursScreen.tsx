
import React, { useState } from 'react';
import { WorkingHours } from '../types';
import Drawer from '../components/Drawer';

interface WorkingHoursScreenProps {
  hours: WorkingHours[];
  onUpdateHours: (hours: WorkingHours[]) => void;
  onBack: () => void;
}

const WorkingHoursScreen: React.FC<WorkingHoursScreenProps> = ({ hours, onUpdateHours, onBack }) => {
  const [editingDay, setEditingDay] = useState<WorkingHours | null>(null);

  const toggleDay = (day: string) => {
    onUpdateHours(hours.map(h => h.day === day ? {...h, isOpen: !h.isOpen} : h));
  };

  const handleUpdateTimes = (open: string, close: string) => {
    if (editingDay) {
      onUpdateHours(hours.map(h => h.day === editingDay.day ? { ...h, open, close } : h));
      setEditingDay(null);
    }
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-24 md:px-12 w-full max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h2 className="text-xl font-black">Working Hours</h2>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl text-xs text-amber-400 font-medium">
        Orders cannot be placed by buyers during closed hours. Click a day to edit opening/closing times.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hours.map(h => (
          <div key={h.day} className={`bg-slate-900 border p-5 rounded-[2.5rem] flex items-center justify-between transition-all ${h.isOpen ? 'border-slate-800' : 'border-rose-500/20 opacity-60'}`}>
             <button 
                onClick={() => setEditingDay(h)}
                className="flex items-center space-x-4 flex-1 text-left"
             >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${h.isOpen ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                   <i className="fa-solid fa-clock"></i>
                </div>
                <div>
                   <p className="font-bold text-sm text-slate-100">{h.day}</p>
                   <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{h.open} - {h.close}</p>
                </div>
             </button>
             <button onClick={() => toggleDay(h.day)} className={`w-12 h-6 rounded-full relative transition-colors ${h.isOpen ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${h.isOpen ? 'right-1' : 'left-1'}`}></div>
             </button>
          </div>
        ))}
      </div>

      <Drawer isOpen={!!editingDay} onClose={() => setEditingDay(null)} title={`Edit ${editingDay?.day} Hours`}>
         <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Open Time</label>
                  <input 
                    type="time" 
                    defaultValue={editingDay?.open}
                    id="openTimeInput"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Close Time</label>
                  <input 
                    type="time" 
                    defaultValue={editingDay?.close}
                    id="closeTimeInput"
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none"
                  />
               </div>
            </div>
            <button 
               onClick={() => {
                  const o = (document.getElementById('openTimeInput') as HTMLInputElement).value;
                  const c = (document.getElementById('closeTimeInput') as HTMLInputElement).value;
                  handleUpdateTimes(o, c);
               }}
               className="w-full bg-indigo-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl"
            >
               Save Schedule
            </button>
         </div>
      </Drawer>
    </div>
  );
};

export default WorkingHoursScreen;
