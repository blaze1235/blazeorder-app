import React, { useState } from 'react';
import { Supplier, Product, CartItem } from '../types';

interface Props {
  supplier: Supplier;
  products: Product[];
  cart: CartItem[];
  onAddToCart: (p: Product, qty: number) => void;
  onViewReview: () => void;
  onBack: () => void;
  t: (k: string) => string;
}

const ProductList: React.FC<Props> = ({ supplier, products, cart, onAddToCart, onViewReview, onBack }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    return matchSearch && matchCat && p.isActive;
  });

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const qtyInCart = (id: string) => cart.find(i => i.id === id)?.quantity || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center space-x-3 mb-4">
          <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
            <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
          </button>
          <div>
            <h1 className="font-black text-lg leading-tight">{supplier.name}</h1>
            <p className="text-slate-400 text-xs">{supplier.category} · {supplier.deliveryTime}</p>
          </div>
        </div>
        <div className="relative mb-3">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:border-indigo-500 outline-none text-sm" />
        </div>
        {/* Category tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${activeCategory === cat ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-box-open text-4xl mb-3"></i>
            <p className="font-bold">No products found</p>
          </div>
        )}
        {filtered.map(p => {
          const qty = qtyInCart(p.id);
          const lowStock = p.stockLevel <= p.lowStockAlert;
          return (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
              <img src={p.image} alt={p.name} className="w-14 h-14 rounded-xl object-cover bg-slate-800 flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{p.name}</p>
                <p className="text-slate-400 text-xs mb-1">{p.category}</p>
                <div className="flex items-center space-x-2">
                  <p className="font-black text-indigo-400">${p.price.toFixed(2)}</p>
                  {p.unit && <span className="text-slate-500 text-xs">/ {p.unit}</span>}
                  {lowStock && <span className="text-amber-400 text-[10px] font-black">LOW STOCK</span>}
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {qty > 0 ? (
                  <div className="flex items-center space-x-2">
                    <button onClick={() => onAddToCart(p, -1)} className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black text-sm">-</button>
                    <span className="w-6 text-center font-black text-sm">{qty}</span>
                    <button onClick={() => onAddToCart(p, 1)} className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">+</button>
                  </div>
                ) : (
                  <button onClick={() => onAddToCart(p, 1)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-black transition-all">Add</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="px-4 pb-4">
          <button onClick={onViewReview} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl flex items-center justify-between px-5 transition-all">
            <span className="bg-indigo-500 text-white text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center">{cartCount}</span>
            <span className="font-black text-white">Review Order</span>
            <span className="font-black text-white">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductList;
