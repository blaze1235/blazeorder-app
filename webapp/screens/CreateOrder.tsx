import React, { useEffect, useState } from 'react';
import { Supplier } from '../types';
import { fetchSuppliers, SheetSupplier } from '../api';

interface Props {
  onSelectSupplier: (s: Supplier) => void;
  onBack: () => void;
  t: (k: string) => string;
}

const CreateOrder: React.FC<Props> = ({ onSelectSupplier, onBack }) => {
  const [suppliers, setSuppliers] = useState<SheetSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSuppliers().then(setSuppliers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  const toSupplier = (s: SheetSupplier): Supplier => ({
    id: s.id, name: s.name, category: s.category, rating: s.rating,
    image: s.image, deliveryTime: s.deliveryTime, isOpen: s.isOpen,
    successRate: s.successRate, isVerified: s.isVerified,
    complianceStatus: s.complianceStatus, workingHours: s.workingHours,
    deliveryZones: s.deliveryZones, capacityLimit: s.capacityLimit,
    currentOrderCount: s.currentOrderCount,
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center space-x-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
          </button>
          <h1 className="text-xl font-black">Choose Supplier</h1>
        </div>
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none text-sm" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-box-open text-4xl mb-3"></i>
            <p className="font-bold">No suppliers found</p>
          </div>
        )}
        {filtered.map(s => (
          <button key={s.id} onClick={() => onSelectSupplier(toSupplier(s))}
            className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-4 flex items-center space-x-4 text-left transition-all">
            <img src={s.image} alt={s.name} className="w-14 h-14 rounded-2xl object-cover bg-slate-800 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-0.5">
                <p className="font-black truncate">{s.name}</p>
                {s.isVerified && <i className="fa-solid fa-circle-check text-indigo-400 text-xs flex-shrink-0"></i>}
              </div>
              <p className="text-slate-400 text-xs mb-2">{s.category}</p>
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-amber-400"><i className="fa-solid fa-star mr-1"></i>{s.rating}</span>
                <span className="text-slate-500"><i className="fa-solid fa-clock mr-1"></i>{s.deliveryTime}</span>
                {!s.isOpen && <span className="text-rose-400 font-bold">Closed</span>}
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-slate-600 flex-shrink-0"></i>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CreateOrder;
