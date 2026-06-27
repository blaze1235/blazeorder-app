import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { fetchSuppliers, SheetSupplier } from '../api';

interface CreateOrderProps {
  onSelectSupplier: (supplier: Supplier) => void;
  onBack: () => void;
  t: (key: string) => string;
}

const CreateOrder: React.FC<CreateOrderProps> = ({ onSelectSupplier, onBack, t }) => {
  const [searchTerm, setSearchTerm]       = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [suppliers, setSuppliers]         = useState<SheetSupplier[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  // Load suppliers from Google Sheets via API
  useEffect(() => {
    fetchSuppliers()
      .then(data => { setSuppliers(data); setLoading(false); })
      .catch(e  => { setError('Could not load suppliers. Is the API server running?'); setLoading(false); console.error(e); });
  }, []);

  // Build category list dynamically from sheet data
  const categories = ['All', ...Array.from(new Set(suppliers.flatMap(s => s.categories)))];

  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch   = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.categories.includes(activeCategory);
    return matchesSearch && matchesCategory;
  });

  // Convert SheetSupplier → Supplier type that the rest of the app expects
  const handleSelect = (s: SheetSupplier) => {
    const supplier: Supplier = {
      id:                 s.name,  // match supplierId in products
      name:               s.name,
      category:           s.category,
      rating:             s.rating,
      image:              s.image,
      deliveryTime:       s.deliveryTime,
      isOpen:             s.isOpen,
      successRate:        s.successRate,
      isVerified:         s.isVerified,
      complianceStatus:   s.complianceStatus,
      workingHours:       s.workingHours,
      deliveryZones:      s.deliveryZones,
      capacityLimit:      s.capacityLimit,
      currentOrderCount:  s.currentOrderCount,
    };
    onSelectSupplier(supplier);
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h2 className="text-xl font-bold">{t('suppliers')}</h2>
        {!loading && (
          <span className="ml-auto text-xs text-slate-500">
            {filteredSuppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Search + categories */}
      <div className="space-y-4">
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
          <input
            type="text"
            placeholder={t('search_suppliers')}
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading suppliers from Google Sheets...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-center">
          <i className="fa-solid fa-triangle-exclamation text-red-400 text-xl mb-2 block"></i>
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(''); fetchSuppliers().then(d => { setSuppliers(d); setLoading(false); }).catch(() => { setError('Still offline.'); setLoading(false); }); }}
            className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-xl text-xs font-bold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredSuppliers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 space-y-2">
          <i className="fa-solid fa-store-slash text-slate-600 text-4xl"></i>
          <p className="text-slate-400 text-sm">No suppliers found</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-indigo-400 text-xs">
              Clear search
            </button>
          )}
        </div>
      )}

      {/* Supplier list */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4">
          {filteredSuppliers.map(supplier => (
            <button
              key={supplier.id}
              onClick={() => handleSelect(supplier)}
              className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 flex items-center space-x-4 transition-all text-left active:scale-[0.98] hover:border-indigo-500"
            >
              <div className="relative">
                <img
                  src={supplier.image}
                  alt={supplier.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                {supplier.isVerified && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-slate-900">
                    <i className="fa-solid fa-check text-[8px] text-white"></i>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-50">{supplier.name}</h3>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                      {supplier.categories.join(' · ')} • {supplier.successRate}% success
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400">
                      Active
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center space-x-3 text-[10px] text-indigo-400 font-bold">
                  <div className="flex items-center space-x-1">
                    <i className="fa-solid fa-clock opacity-60"></i>
                    <span>{supplier.deliveryTime}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-amber-400">
                    <i className="fa-solid fa-star"></i>
                    <span>{supplier.rating}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CreateOrder;
