import React, { useState } from 'react';
import { CartItem } from '../types';

interface Props {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onSetQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onConfirm: (isCredit: boolean) => void;
  onBack: () => void;
  t: (k: string) => string;
}

const OrderReview: React.FC<Props> = ({ cart, onUpdateQuantity, onRemove, onConfirm, onBack }) => {
  const [confirming, setConfirming] = useState(false);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  const handleConfirm = async (credit: boolean) => {
    setConfirming(true);
    await onConfirm(credit);
    setConfirming(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 flex items-center space-x-3">
        <button onClick={onBack} className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-arrow-left text-slate-300 text-sm"></i>
        </button>
        <h1 className="text-xl font-black">Review Order</h1>
        <span className="ml-auto text-slate-500 text-sm font-bold">{count} item{count !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {cart.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{item.name}</p>
              <p className="text-indigo-400 text-sm font-black">${(item.price * item.quantity).toFixed(2)}</p>
              <p className="text-slate-500 text-xs">${item.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button onClick={() => item.quantity <= 1 ? onRemove(item.id) : onUpdateQuantity(item.id, -1)}
                className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white font-black text-sm">
                {item.quantity <= 1 ? <i className="fa-solid fa-trash text-rose-400 text-xs"></i> : '-'}
              </button>
              <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
              <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm">+</button>
            </div>
          </div>
        ))}

        {cart.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <i className="fa-solid fa-cart-shopping text-4xl mb-3"></i>
            <p className="font-bold">Cart is empty</p>
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="px-4 pb-6 space-y-3 border-t border-slate-800 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="font-black">${total.toFixed(2)}</span>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => handleConfirm(false)} disabled={confirming}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
              {confirming ? '...' : `Pay Balance $${total.toFixed(2)}`}
            </button>
            <button onClick={() => handleConfirm(true)} disabled={confirming}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
              Credit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderReview;
