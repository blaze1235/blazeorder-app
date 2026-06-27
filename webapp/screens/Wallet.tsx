import React, { useState } from 'react';
import { Transaction } from '../types';

interface Props {
  balance: number;
  onTopUp: (amt: number) => void;
  onWithdraw: (amt: number) => boolean;
  transactions: Transaction[];
  t: (k: string) => string;
}

const Wallet: React.FC<Props> = ({ balance, onTopUp, onWithdraw, transactions }) => {
  const [topUpAmt, setTopUpAmt] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [activeTab, setActiveTab] = useState<'top-up' | 'withdraw'>('top-up');
  const [msg, setMsg] = useState('');

  const handleTopUp = () => {
    const amt = parseFloat(topUpAmt);
    if (!amt || amt <= 0) return;
    onTopUp(amt);
    setTopUpAmt('');
    setMsg(`+$${amt.toFixed(2)} added`);
    setTimeout(() => setMsg(''), 2000);
  };

  const handleWithdraw = () => {
    const amt = parseFloat(withdrawAmt);
    if (!amt || amt <= 0) return;
    const ok = onWithdraw(amt);
    setWithdrawAmt('');
    setMsg(ok ? `-$${amt.toFixed(2)} withdrawn` : 'Insufficient balance');
    setTimeout(() => setMsg(''), 2000);
  };

  const typeIcon: Record<string, string> = {
    'top-up': 'fa-arrow-down text-emerald-400',
    'order-payment': 'fa-cart-shopping text-rose-400',
    'withdraw': 'fa-arrow-up text-rose-400',
    'earnings': 'fa-coins text-yellow-400',
    'credit-repayment': 'fa-rotate-left text-blue-400',
    'payout': 'fa-arrow-up text-purple-400',
  };

  return (
    <div className="p-4 space-y-5 animate-fadeIn">
      {/* Balance card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5">
        <p className="text-emerald-200 text-xs font-black uppercase tracking-wider mb-1">Wallet Balance</p>
        <p className="text-4xl font-black text-white">${balance.toFixed(2)}</p>
        {msg && <p className="text-emerald-200 text-sm mt-2 font-bold">{msg}</p>}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-slate-800 p-1 rounded-2xl">
        {(['top-up', 'withdraw'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-slate-900' : 'text-slate-400'}`}>
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex space-x-2">
          {[50, 100, 200, 500].map(amt => (
            <button key={amt} onClick={() => activeTab === 'top-up' ? setTopUpAmt(String(amt)) : setWithdrawAmt(String(amt))}
              className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-black text-slate-300 transition-all">
              ${amt}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            type="number" min="0" step="0.01"
            value={activeTab === 'top-up' ? topUpAmt : withdrawAmt}
            onChange={e => activeTab === 'top-up' ? setTopUpAmt(e.target.value) : setWithdrawAmt(e.target.value)}
            placeholder="Custom amount"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none text-sm focus:border-indigo-500" />
          <button onClick={activeTab === 'top-up' ? handleTopUp : handleWithdraw}
            className={`px-5 py-2.5 rounded-xl text-white font-black text-sm transition-all ${activeTab === 'top-up' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'}`}>
            {activeTab === 'top-up' ? 'Top Up' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Transaction History</h2>
        <div className="space-y-2">
          {transactions.length === 0 && <p className="text-slate-600 text-sm text-center py-4">No transactions yet</p>}
          {transactions.map(tx => (
            <div key={tx.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-3">
              <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${typeIcon[tx.type] || 'fa-circle text-slate-400'} text-sm`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm capitalize">{tx.type.replace(/-/g, ' ')}</p>
                <p className="text-slate-500 text-xs">{tx.date}</p>
              </div>
              <p className={`font-black text-sm ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
