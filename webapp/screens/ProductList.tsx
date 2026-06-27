import React, { useState } from 'react';
import { Supplier, Product, CartItem } from '../types';

interface ProductListProps {
  supplier: Supplier;
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product, quantity: number) => void;
  onViewReview: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

const fmt = (n: number) => n.toLocaleString('uz-UZ') + ' sum';

const ProductList: React.FC<ProductListProps> = ({ supplier, products, cart, onAddToCart, onViewReview, onBack, t }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [manualQty, setManualQty] = useState('');
  const [editingQty, setEditingQty] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleAddToCart = () => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, quantity);
      setSelectedProduct(null);
      setQuantity(1);
    }
  };

  const availableProducts = products.filter(p => p.isActive);

  return (
    <div className="animate-fadeIn relative min-h-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300 shrink-0">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div>
              <h2 className="text-base font-bold leading-tight">{supplier.name}</h2>
              <p className="text-[10px] text-slate-500 font-bold">{availableProducts.length} products available</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <span className="text-[10px] font-black text-emerald-400 uppercase">Open</span>
          </div>
        </div>
      </div>

      {/* Products grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {products.map(product => {
          const isUnavailable  = !product.isActive || product.stockLevel === 0;
          const isLowStock     = product.stockLevel > 0 && product.stockLevel <= product.lowStockAlert;
          const inCart         = cart.find(i => i.id === product.id);

          return (
            <button
              key={product.id}
              onClick={() => { if (!isUnavailable) { setSelectedProduct(product); setQuantity(inCart?.quantity || 1); } }}
              disabled={isUnavailable}
              className={`bg-slate-900/50 border rounded-3xl overflow-hidden text-left flex flex-col transition-all relative
                ${isUnavailable ? 'opacity-50 border-slate-800 cursor-not-allowed' : 'border-slate-800 active:scale-[0.98] hover:border-indigo-500/50'}
                ${inCart ? 'border-indigo-500/40' : ''}
              `}
            >
              {/* Stock badges */}
              {isUnavailable && (
                <div className="absolute top-2 left-2 z-10 bg-rose-600/90 px-2 py-0.5 rounded-lg text-[8px] font-black text-white">
                  {product.stockLevel === 0 ? 'Out of Stock' : 'Unavailable'}
                </div>
              )}
              {isLowStock && !isUnavailable && (
                <div className="absolute top-2 left-2 z-10 bg-amber-500/90 px-2 py-0.5 rounded-lg text-[8px] font-black text-white">
                  Low Stock: {product.stockLevel}
                </div>
              )}
              {inCart && !isUnavailable && (
                <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[8px] font-black text-white">
                  {inCart.quantity}
                </div>
              )}

              {/* Image */}
              <div className="relative aspect-square w-full bg-slate-800">
                {product.image
                  ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-slate-600"><i className="fa-solid fa-box text-3xl"></i></div>
                }
                <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-white">
                  {product.price.toLocaleString()}
                </div>
              </div>

              <div className="p-3 space-y-1">
                <h4 className="text-xs font-bold truncate text-slate-100">{product.name}</h4>
                <p className="text-[10px] text-slate-500">{product.stockLevel} in stock</p>
                <div className="pt-1 flex justify-between items-center">
                  <span className="text-[10px] font-black text-indigo-400">
                    {isUnavailable ? 'Unavailable' : t('add')}
                  </span>
                  {!isUnavailable && <i className="fa-solid fa-circle-plus text-indigo-500 text-base"></i>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 animate-slideUp">
          <button
            onClick={onViewReview}
            className="w-full bg-indigo-600 p-4 rounded-2xl shadow-2xl flex items-center justify-between active:scale-95 transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-black text-white">{cartCount}</div>
              <span className="font-bold text-sm">{t('review_order')}</span>
            </div>
            <span className="font-black text-sm">{fmt(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Product detail sheet */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>
          <div className="relative bg-slate-900 w-full max-w-md rounded-t-[2.5rem] p-6 animate-slideUp border-t border-slate-800 shadow-2xl">
            <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-5"></div>
            <div className="flex items-start space-x-4 mb-5">
              {selectedProduct.image
                ? <img src={selectedProduct.image} className="w-20 h-20 rounded-2xl object-cover shadow-lg shrink-0" alt="" />
                : <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 shrink-0"><i className="fa-solid fa-box text-2xl"></i></div>
              }
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold truncate">{selectedProduct.name}</h3>
                <p className="text-xl font-black text-indigo-400 mt-1">{selectedProduct.price.toLocaleString()} sum</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{selectedProduct.stockLevel} available</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('quantity')}</label>
                <div className="flex items-center space-x-3">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-300">−</button>

                  {/* Tap to type quantity */}
                  {editingQty ? (
                    <input
                      type="number"
                      value={manualQty}
                      autoFocus
                      onChange={e => setManualQty(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(manualQty);
                        if (n > 0 && n <= selectedProduct.stockLevel) setQuantity(n);
                        setEditingQty(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const n = parseInt(manualQty);
                          if (n > 0 && n <= selectedProduct.stockLevel) setQuantity(n);
                          setEditingQty(false);
                        }
                      }}
                      className="w-16 text-center bg-slate-700 border border-indigo-500 rounded-xl text-lg font-black text-white outline-none py-2"
                    />
                  ) : (
                    <button
                      onClick={() => { setManualQty(String(quantity)); setEditingQty(true); }}
                      className="w-12 text-center text-xl font-black text-white hover:text-indigo-400 transition-colors"
                    >
                      {quantity}
                    </button>
                  )}

                  <button
                    onClick={() => setQuantity(q => Math.min(selectedProduct.stockLevel, q + 1))}
                    className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-bold text-indigo-400"
                  >+</button>
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-500">Total: <span className="font-black text-white">{fmt(selectedProduct.price * quantity)}</span></p>

              <button
                onClick={handleAddToCart}
                className="w-full bg-indigo-600 h-14 rounded-2xl font-black text-base flex items-center justify-center shadow-xl active:scale-95 transition-all"
              >
                {t('add')} to Cart · {fmt(selectedProduct.price * quantity)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
