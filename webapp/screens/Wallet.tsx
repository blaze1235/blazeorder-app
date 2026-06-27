
import React, { useState } from 'react';
import { Transaction } from '../types';
import Drawer from '../components/Drawer';

interface WalletProps {
  balance: number;
  onTopUp: (amount: number) => void;
  onWithdraw: (amount: number) => boolean;
  transactions: Transaction[];
  t: (key: string) => string;
}

const Wallet: React.FC<WalletProps> = ({ balance, onTopUp, onWithdraw, transactions, t }) => {
  const [drawerMode, setDrawerMode] = useState<'topup' | 'withdraw' | null>(null);
  const [amountInput, setAmountInput] = useState("");

  const handleConfirmAction = () => {
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (drawerMode === 'topup') {
      onTopUp(amount);
      setDrawerMode(null);
      setAmountInput("");
    } else if (drawerMode === 'withdraw') {
      const success = onWithdraw(amount);
      if (success) {
        setDrawerMode(null);
        setAmountInput("");
      } else {
        alert("Insufficient balance for withdrawal");
      }
    }
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-32 max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-black text-slate-100">{t('wallet')}</h2>

      <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden text-center transition-all">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mt-10 blur-xl"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-400/10 rounded-full -mr-20 -mb-20 blur-2xl"></div>
        
        <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-2 opacity-80">{t('available_balance')}</p>
        <h3 className="text-5xl font-black text-white tracking-tighter mb-8 tabular-nums">${balance.toFixed(2)}</h3>
        
        <div className="flex space-x-3 relative z-10">
          <button 
            onClick={() => setDrawerMode('topup')}
            className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-slate-50"
          >
            <i className="fa-solid fa-plus-circle"></i>
            <span>{t('top_up')}</span>
          </button>
          <button 
            onClick={() => setDrawerMode('withdraw')}
            className="flex-1 bg-indigo-500 text-white py-4 rounded-2xl font-black shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-indigo-400"
          >
            <i className="fa-solid fa-arrow-right-from-bracket rotate-90"></i>
            <span>{t('withdraw')}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('quick_top_up')}</h4>
        <div className="grid grid-cols-3 gap-3">
          {[50, 100, 250].map(val => (
            <button 
              key={val} 
              onClick={() => onTopUp(val)}
              className="bg-slate-900 border border-slate-800 py-4 rounded-2xl font-black text-sm hover:border-indigo-500 transition-colors active:scale-95 shadow-sm"
            >
              +${val}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('history')}</h4>
          <button className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{t('view_all')}</button>
        </div>

        <div className="space-y-3">
          {transactions.length > 0 ? transactions.map(tx => (
            <div key={tx.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center space-x-4 transition-all hover:border-slate-700">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
              }`}>
                <i className={`fa-solid ${
                  tx.type === 'top-up' ? 'fa-arrow-trend-up' : 
                  tx.type === 'withdraw' ? 'fa-arrow-trend-down' : 
                  'fa-shopping-bag'
                } text-lg`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-100 truncate">
                  {tx.type === 'top-up' ? t('top_up') : 
                   tx.type === 'withdraw' ? t('withdraw') : 
                   t('checkout')}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-tight">{tx.date}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black tabular-nums ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-100'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}
                </p>
                <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">{t(tx.status)}</p>
              </div>
            </div>
          )) : (
            <div className="py-20 text-center opacity-30">
               <i className="fa-solid fa-receipt text-5xl mb-4"></i>
               <p className="font-bold">No transactions found</p>
            </div>
          )}
        </div>
      </div>

      <Drawer 
        isOpen={!!drawerMode} 
        onClose={() => setDrawerMode(null)} 
        title={drawerMode === 'topup' ? t('top_up') : t('withdraw')}
      >
         <div className="space-y-6 pt-2 pb-6">
            <div className="space-y-3">
               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Enter Amount ($)</label>
               <input 
                  type="number" 
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-5 px-6 text-3xl font-black text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-700"
               />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <button 
                  onClick={() => setDrawerMode(null)}
                  className="bg-slate-800 py-4 rounded-2xl text-xs font-black uppercase text-slate-400 hover:bg-slate-700 transition-colors"
               >
                  {t('cancel')}
               </button>
               <button 
                  onClick={handleConfirmAction}
                  className="bg-indigo-600 py-4 rounded-2xl text-xs font-black uppercase text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all hover:bg-indigo-500"
               >
                  {t('confirm')}
               </button>
            </div>
         </div>
      </Drawer>
    </div>
  );
};

export default Wallet;
