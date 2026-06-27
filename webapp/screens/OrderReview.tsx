
import React, { useState } from 'react';
import { CartItem } from '../types';

interface OrderReviewProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onConfirm: (isCredit: boolean) => void;
  onBack: () => void;
  t: (key: string) => string;
}

const OrderReview: React.FC<OrderReviewProps> = ({ cart, onUpdateQuantity, onRemove, onConfirm, onBack, t }) => {
  const [isCredit, setIsCredit] = useState(false);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 2.50;
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="animate-fadeIn p-6 flex flex-col items-center justify-center h-full space-y-6">
        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
           <i className="fa-solid fa-cart-shopping text-3xl"></i>
        </div>
        <p className="text-slate-500 font-bold">{t('empty_cart')}</p>
        <button onClick={onBack} className="bg-indigo-600 px-8 py-3 rounded-xl font-bold">{t('home')}</button>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-32">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h2 className="text-xl font-bold">{t('cart')}</h2>
      </div>

      <div className="space-y-3">
        {cart.map(item => (
          <div key={item.id} className="bg-slate-900/40 border border-slate-800 p-4 rounded-3xl flex items-center space-x-4">
            <img src={item.image} className="w-14 h-14 rounded-2xl object-cover" alt="" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-100">{item.name}</h4>
              <p className="text-xs font-black text-indigo-400 mt-1">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
            <div className="flex items-center space-x-3">
               <button onClick={() => onUpdateQuantity(item.id, -1)} className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold">-</button>
               <span className="text-xs font-black">{item.quantity}</span>
               <button onClick={() => onUpdateQuantity(item.id, 1)} className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-indigo-400">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
              <i className="fa-solid fa-credit-card"></i>
            </div>
            <div>
              <p className="text-sm font-bold">{t('pay_credit')}</p>
              <p className="text-[10px] text-slate-500 font-medium">30 days settlement</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCredit(!isCredit)}
            className={`w-12 h-6 rounded-full relative transition-colors ${isCredit ? 'bg-indigo-600' : 'bg-slate-800'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isCredit ? 'right-1' : 'left-1'}`}></div>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 shadow-lg">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-medium">{t('subtotal')}</span>
          <span className="font-bold text-slate-100">${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 font-medium">{t('delivery')}</span>
          <span className="font-bold text-slate-100">${deliveryFee.toFixed(2)}</span>
        </div>
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
          <span className="text-lg font-bold">{t('total')}</span>
          <span className="text-2xl font-black text-indigo-400">${total.toFixed(2)}</span>
        </div>
      </div>

      <button 
        onClick={() => onConfirm(isCredit)}
        className={`w-full h-16 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl active:scale-95 transition-all`}
      >
        {isCredit ? t('pay_credit') : t('pay_balance')}
      </button>
    </div>
  );
};

export default OrderReview;
