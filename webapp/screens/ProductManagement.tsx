import React, { useState } from 'react';
import { Product, UserRole } from '../types';
import Drawer from '../components/Drawer';

interface ProductManagementProps {
  products: Product[];
  onUpdateProduct: (updatedProduct: Product) => void;
  onAddProduct?: (newProduct: Product) => void;
  role?: UserRole;
  suppliers?: string[];
}

const ProductManagement: React.FC<ProductManagementProps> = ({ products, onUpdateProduct, onAddProduct, role, suppliers = [] }) => {
  const [search, setSearch]               = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [newPrice, setNewPrice]           = useState('');
  const [newName, setNewName]             = useState('');
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  // New product form state
  const [addName, setAddName]           = useState('');
  const [addPrice, setAddPrice]         = useState('');
  const [addUnit, setAddUnit]           = useState('');
  const [addCategory, setAddCategory]   = useState('');
  const [addSupplier, setAddSupplier]   = useState(suppliers[0] || '');
  const [addStock, setAddStock]         = useState('100');
  const [addAlert, setAddAlert]         = useState('10');
  const [addDescription, setAddDescription] = useState('');

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const canEditPrice = role === 'fulfillment' || role === 'distributor';
  const canAddItems  = role === 'distributor';

  const handleSaveChanges = () => {
    if (!selectedProduct) return;
    onUpdateProduct({
      ...selectedProduct,
      name:       newName || selectedProduct.name,
      stockLevel: selectedProduct.stockLevel + adjustmentValue,
      price:      parseFloat(newPrice) || selectedProduct.price,
    });
    setSelectedProduct(null);
  };

  const handleAddProduct = () => {
    if (!addName.trim() || !addPrice || !addSupplier) {
      alert("Name, price and supplier are required.");
      return;
    }
    const newProduct: Product = {
      id:            `p${Date.now()}`,
      name:          addName.trim(),
      price:         parseFloat(addPrice),
      category:      addCategory,
      supplierId:    addSupplier,
      image:         `https://picsum.photos/seed/${Date.now()}/300/300`,
      description:   addDescription || addName,
      stockLevel:    parseInt(addStock) || 100,
      reservedStock: 0,
      isActive:      true,
      minOrderQty:   1,
      lowStockAlert: parseInt(addAlert) || 10,
    };
    onAddProduct?.(newProduct);
    setShowAddDrawer(false);
    setAddName(''); setAddPrice(''); setAddUnit(''); setAddCategory('');
    setAddSupplier(suppliers[0] || ''); setAddStock('100'); setAddAlert('10'); setAddDescription('');
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-32">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white leading-tight">Inventory</h2>
          <p className="text-xs text-slate-500 font-medium">Real-time stock — synced with Google Sheets</p>
        </div>
        {canAddItems && (
          <button
            onClick={() => setShowAddDrawer(true)}
            className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
          >
            <i className="fa-solid fa-plus text-lg"></i>
          </button>
        )}
      </div>

      <div className="bg-indigo-600/10 border border-indigo-500/20 p-5 rounded-[2.5rem] flex items-center space-x-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <i className="fa-solid fa-chart-line"></i>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Stock Intelligence</p>
          <p className="text-xs text-slate-300 font-medium leading-relaxed">
            {canEditPrice ? "Changes sync to Google Sheets automatically." : "View-only inventory for your role."}
          </p>
        </div>
      </div>

      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
        <input
          type="text"
          placeholder="Search SKU or name..."
          className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-indigo-500 transition-all text-white placeholder-slate-600"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredProducts.map(product => {
          const isLow = product.stockLevel <= product.lowStockAlert;
          return (
            <div key={product.id} className={`border p-5 rounded-[2.5rem] flex items-center space-x-4 transition-all ${isLow ? 'bg-amber-500/5 border-amber-500/40' : 'bg-slate-900 border-slate-800'}`}>
              <div className="relative">
                <img src={product.image} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                {isLow && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-slate-950">
                    <i className="fa-solid fa-exclamation text-[8px] text-white"></i>
                  </div>
                )}
                {!product.isActive && (
                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center border-2 border-slate-950">
                    <i className="fa-solid fa-xmark text-[8px] text-white"></i>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-100 truncate">{product.name}</h4>
                <p className="text-xs font-black text-indigo-400">{(product.price).toLocaleString('uz-UZ') + ' sum'} {product.category && <span className="text-slate-600 font-normal">· {product.category}</span>}</p>
                <div className="flex items-center space-x-3 mt-1">
                  <div className="flex items-baseline space-x-1">
                    <span className={`text-sm font-black ${isLow ? 'text-amber-400' : 'text-slate-100'}`}>{product.stockLevel}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">in stock</span>
                  </div>
                  {isLow && (
                    <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-[8px] font-black text-amber-500 uppercase animate-pulse">Low</span>
                  )}
                  {!product.isActive && (
                    <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 rounded-full text-[8px] font-black text-rose-500 uppercase">Inactive</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setSelectedProduct(product); setAdjustmentValue(0); setNewPrice(product.price.toString()); setNewName(product.name); }}
                className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors active:scale-90"
              >
                <i className="fa-solid fa-pen text-xs"></i>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── EDIT PRODUCT DRAWER ── */}
      <Drawer isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} title={selectedProduct?.name}>
        <div className="flex items-center space-x-4 mb-8">
          <img src={selectedProduct?.image} className="w-16 h-16 rounded-2xl object-cover" alt="" />
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Current Stock: {selectedProduct?.stockLevel}</p>
            <p className="text-xs font-black text-indigo-400">{(selectedProduct?.price).toLocaleString('uz-UZ') + ' sum'} / unit</p>
          </div>
        </div>

        <div className="space-y-6 pb-6">
          {canEditPrice && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          <div className="flex flex-col items-center space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock Adjustment</p>
            <div className="flex items-center space-x-8">
              <button onClick={() => setAdjustmentValue(p => p - 1)} className="w-14 h-14 bg-slate-800 rounded-2xl text-2xl font-black active:bg-rose-500/20 transition-all">-</button>
              <span className={`text-4xl font-black tabular-nums ${adjustmentValue > 0 ? 'text-emerald-400' : adjustmentValue < 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                {adjustmentValue > 0 ? `+${adjustmentValue}` : adjustmentValue}
              </span>
              <button onClick={() => setAdjustmentValue(p => p + 1)} className="w-14 h-14 bg-slate-800 rounded-2xl text-2xl font-black active:bg-emerald-500/20 transition-all">+</button>
            </div>
            <p className="text-xs text-slate-500">New total: <span className="font-black text-white">{(selectedProduct?.stockLevel || 0) + adjustmentValue}</span></p>
          </div>

          {canEditPrice && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price per unit ($)</label>
              <input
                type="number"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-xl font-black text-white focus:border-indigo-500 outline-none"
              />
            </div>
          )}

          {canEditPrice && (
            <div className="flex items-center justify-between bg-slate-800 p-4 rounded-2xl">
              <div>
                <p className="text-sm font-bold">Product Active</p>
                <p className="text-[10px] text-slate-500">Visible to buyers when active</p>
              </div>
              <button
                onClick={() => setSelectedProduct(p => p ? { ...p, isActive: !p.isActive } : p)}
                className={`w-12 h-6 rounded-full relative transition-colors ${selectedProduct?.isActive ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedProduct?.isActive ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button onClick={() => setSelectedProduct(null)} className="bg-slate-800 py-4 rounded-2xl text-xs font-black text-slate-400 uppercase">Cancel</button>
            <button onClick={handleSaveChanges} className="bg-indigo-600 py-4 rounded-2xl text-xs font-black text-white shadow-xl uppercase">
              Save & Sync
            </button>
          </div>
        </div>
      </Drawer>

      {/* ── ADD PRODUCT DRAWER ── */}
      <Drawer isOpen={showAddDrawer} onClose={() => setShowAddDrawer(false)} title="Add New Product">
        <div className="space-y-4 pb-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Name *</label>
            <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ex: Organic Milk" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price ($) *</label>
              <input type="number" value={addPrice} onChange={e => setAddPrice(e.target.value)} placeholder="0.00" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unit</label>
              <input type="text" value={addUnit} onChange={e => setAddUnit(e.target.value)} placeholder="kg, pcs, box" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Supplier *</label>
            {suppliers.length > 0 ? (
              <select value={addSupplier} onChange={e => setAddSupplier(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none">
                {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input type="text" value={addSupplier} onChange={e => setAddSupplier(e.target.value)} placeholder="Supplier name" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
              <input type="text" value={addCategory} onChange={e => setAddCategory(e.target.value)} placeholder="Dairy, Grocery..." className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Initial Stock</label>
              <input type="number" value={addStock} onChange={e => setAddStock(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
            <input type="text" value={addDescription} onChange={e => setAddDescription(e.target.value)} placeholder="Short product description" className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none" />
          </div>

          <button onClick={handleAddProduct} className="w-full bg-indigo-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl mt-2">
            Add to Catalogue & Sheets
          </button>
        </div>
      </Drawer>
    </div>
  );
};

export default ProductManagement;
