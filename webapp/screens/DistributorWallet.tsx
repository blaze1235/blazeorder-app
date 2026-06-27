
import React from 'react';

const DistributorWallet: React.FC = () => {
  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-24">
      <h2 className="text-2xl font-black">Financials</h2>

      {/* Enterprise Wallet Card */}
      <div className="bg-indigo-600 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        <div className="relative z-10 space-y-6">
           <div>
             <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Settled Balance</p>
             <h3 className="text-5xl font-black text-white tracking-tighter">$12,450.00</h3>
           </div>
           <div className="flex space-x-3">
              <button className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-2">
                 <i className="fa-solid fa-money-bill-transfer"></i>
                 <span>Request Payout</span>
              </button>
           </div>
        </div>
      </div>

      {/* Platform Fees & Taxes */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] space-y-4">
         <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fee Breakdown</h4>
         <div className="space-y-3">
            <div className="flex justify-between text-sm">
               <span className="text-slate-400 font-medium">Platform Fee (3%)</span>
               <span className="font-bold text-rose-400">-$124.50</span>
            </div>
            <div className="flex justify-between text-sm">
               <span className="text-slate-400 font-medium">VAT / Tax (10%)</span>
               <span className="font-bold text-rose-400">-$415.00</span>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
               <span className="text-xs font-black text-slate-100 uppercase">Estimated Net Payout</span>
               <span className="text-xl font-black text-emerald-400">$11,910.50</span>
            </div>
         </div>
      </div>

      {/* Payout Schedule */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-6 flex items-center justify-between">
         <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
               <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div>
               <p className="text-xs font-bold">Auto-Payout</p>
               <p className="text-[10px] text-slate-500 font-medium">Every Friday @ 18:00</p>
            </div>
         </div>
         <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Scheduled</span>
      </div>

      {/* Transaction History Feed */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Recent Transactions</h4>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <i className="fa-solid fa-cart-shopping"></i>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Sale #1224</p>
                <p className="text-[9px] text-slate-500 uppercase">Settled</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-emerald-400">+$245.00</p>
              <p className="text-[9px] text-slate-600">Nov 24</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DistributorWallet;
