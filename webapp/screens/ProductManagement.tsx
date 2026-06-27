import React, { useState } from 'react';
import { Product, UserRole } from '../types';

interface Props {
  products: Product[];
  onUpdateProduct: (p: Product) => void;
  onAddProduct: (p: Product) => Promise<void>;
  role: UserRole;
  suppliers: string[];
}

const ProductManagement: React.FC<Props> = ({ products, onUpdateProduct, onAddProduct, suppliers }) => {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ isActive: true, stockLevel: 100, lowStockAlert: 10, minOrderQty: 1 });
  const [saving, setSaving] = useState(false);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.supplierId.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveEdit = () => {
    if (editing) { onUpdateProduct(editing); setEditing(null); }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.supplierId) return;
    setSaving(true);
    try {
      await onAddProduct({
        id: `p${Date.now()}`,
        name: newProduct.name || '',
        price: newProduct.price || 0,
        description: newProduct.description || '',
        image: `https://picsum.photos/seed/${Date.now()}/300/300`,
        category: newProduct.category || 'General',
        supplierId: newProduct.supplierId || '',
        stockLevel: newProduct.stockLevel ?? 100,
        reservedStock: 0,
        isActive: true,
        minOrderQty: newProduct.minOrderQty ?? 1,
        lowStockAlert: newProduct.lowStockAlert ?? 10,
      });
      setAdding(false);
      setNewProduct({ isActive: true, stockLevel: 100, lowStockAlert: 10, minOrderQty: 1 });
    } finally { setSaving(false); }
  };

  const InputRow = ({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) => (
    <div>
      <p className="text-xs font-black text-slate-500 uppercase mb-1">{label}</p>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" />
    </div>
  );

  if (editing) return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center space-x-3">
        <button onClick={() => setEditing(null)} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <h1 className="font-black text-xl">Edit Product</h1>
      </div>
      <div className="space-y-3">
        <InputRow label="Name" value={editing.name} onChange={v => setEditing({ ...editing, name: v })} />
        <InputRow label="Price" value={editing.price} onChange={v => setEditing({ ...editing, price: parseFloat(v) || 0 })} type="number" />
        <InputRow label="Stock Level" value={editing.stockLevel} onChange={v => setEditing({ ...editing, stockLevel: parseInt(v) || 0 })} type="number" />
        <InputRow label="Low Stock Alert" value={editing.lowStockAlert} onChange={v => setEditing({ ...editing, lowStockAlert: parseInt(v) || 0 })} type="number" />
        <InputRow label="Description" value={editing.description} onChange={v => setEditing({ ...editing, description: v })} />
        <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
          <span className="text-sm font-bold">Active</span>
          <button onClick={() => setEditing({ ...editing, isActive: !editing.isActive })}
            className={`w-10 h-6 rounded-full transition-all relative ${editing.isActive ? 'bg-indigo-600' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${editing.isActive ? 'left-4' : 'left-0.5'}`}></span>
          </button>
        </div>
      </div>
      <button onClick={handleSaveEdit} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-black text-sm uppercase">Save Changes</button>
    </div>
  );

  if (adding) return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center space-x-3">
        <button onClick={() => setAdding(false)} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <h1 className="font-black text-xl">Add Product</h1>
      </div>
      <div className="space-y-3">
        <InputRow label="Name" value={newProduct.name || ''} onChange={v => setNewProduct({ ...newProduct, name: v })} />
        <div>
          <p className="text-xs font-black text-slate-500 uppercase mb-1">Supplier</p>
          <select value={newProduct.supplierId || ''} onChange={e => setNewProduct({ ...newProduct, supplierId: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none">
            <option value="">Select supplier</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <InputRow label="Category" value={newProduct.category || ''} onChange={v => setNewProduct({ ...newProduct, category: v })} />
        <InputRow label="Price" value={newProduct.price || ''} onChange={v => setNewProduct({ ...newProduct, price: parseFloat(v) || 0 })} type="number" />
        <InputRow label="Stock Level" value={newProduct.stockLevel || 100} onChange={v => setNewProduct({ ...newProduct, stockLevel: parseInt(v) || 0 })} type="number" />
        <InputRow label="Description" value={newProduct.description || ''} onChange={v => setNewProduct({ ...newProduct, description: v })} />
      </div>
      <button onClick={handleAddProduct} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-2xl text-white font-black text-sm uppercase">
        {saving ? 'Adding...' : 'Add Product'}
      </button>
    </div>
  );

  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Products</h1>
        <button onClick={() => setAdding(true)} className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-plus text-white text-sm"></i>
        </button>
      </div>
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
          className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none text-sm" />
      </div>
      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-bold text-sm truncate">{p.name}</p>
                {!p.isActive && <span className="text-[10px] font-black text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded">Inactive</span>}
              </div>
              <p className="text-slate-500 text-xs">{p.supplierId} · {p.category}</p>
              <div className="flex items-center space-x-3 mt-1">
                <p className="font-black text-indigo-400 text-sm">${p.price.toFixed(2)}</p>
                <span className={`text-xs font-bold ${p.stockLevel <= p.lowStockAlert ? 'text-rose-400' : 'text-slate-500'}`}>
                  Stock: {p.stockLevel}
                </span>
              </div>
            </div>
            <button onClick={() => setEditing(p)} className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0 transition-all">
              <i className="fa-solid fa-pen text-slate-400 text-xs"></i>
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-box-open text-4xl mb-3"></i>
            <p className="font-bold">No products</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;
