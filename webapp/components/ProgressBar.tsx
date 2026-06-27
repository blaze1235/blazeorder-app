import React from 'react';
import { Order } from '../types';

interface Props {
  status: Order['status'];
  compact?: boolean;
}

const steps: { key: Order['status']; label: string; icon: string }[] = [
  { key: 'pending',   label: 'Placed',    icon: 'fa-circle-dot' },
  { key: 'accepted',  label: 'Accepted',  icon: 'fa-check' },
  { key: 'picked_up', label: 'On Way',    icon: 'fa-truck' },
  { key: 'completed', label: 'Delivered', icon: 'fa-circle-check' },
];

const rankOf = (s: Order['status']) => {
  const r: Record<string, number> = { pending: 0, accepted: 1, picked_up: 2, completed: 3, cancelled: -1 };
  return r[s] ?? 0;
};

const ProgressBar: React.FC<Props> = ({ status, compact }) => {
  if (status === 'cancelled') {
    return (
      <div className={`flex items-center space-x-2 ${compact ? '' : 'py-2'}`}>
        <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center">
          <i className="fa-solid fa-xmark text-rose-400 text-[10px]"></i>
        </div>
        <span className={`font-black text-rose-400 ${compact ? 'text-[10px]' : 'text-xs'} uppercase`}>Cancelled</span>
      </div>
    );
  }

  const current = rankOf(status);

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        {steps.map((step, i) => (
          <React.Fragment key={step.key}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${i <= current ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              <i className={`fa-solid ${step.icon} text-[7px] ${i <= current ? 'text-white' : 'text-slate-500'}`}></i>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px transition-all ${i < current ? 'bg-indigo-600' : 'bg-slate-700'}`} style={{ minWidth: 8 }}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${i < current ? 'bg-indigo-600' : i === current ? 'bg-indigo-600 ring-4 ring-indigo-600/20' : 'bg-slate-700'}`}>
              {i < current
                ? <i className="fa-solid fa-check text-white text-xs"></i>
                : <i className={`fa-solid ${step.icon} text-xs ${i === current ? 'text-white' : 'text-slate-500'}`}></i>
              }
            </div>
            <p className={`text-[9px] font-black mt-1 uppercase ${i <= current ? 'text-indigo-400' : 'text-slate-600'}`}>{step.label}</p>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-3 transition-all ${i < current ? 'bg-indigo-600' : 'bg-slate-700'}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default ProgressBar;
