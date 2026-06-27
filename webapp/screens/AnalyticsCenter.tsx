
import React, { useState, useMemo } from 'react';
import { UserRole, Product, Order, StaffMember } from '../types';

interface AnalyticsCenterProps {
  onBack: () => void;
  role: UserRole;
  products: Product[];
  stats: any;
  staff: StaffMember[];
  orders: Order[];
}

const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({ onBack, role, products, stats, staff, orders }) => {
  const [activeTab, setActiveTab] = useState<'business' | 'team'>('business');

  const topProducts = useMemo(() => {
    const itemCounts: Record<string, number> = {};
    orders.filter(o => o.status === 'completed').forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.id] = (itemCounts[item.id] || 0) + item.quantity;
      });
    });
    return products
      .map(p => ({ ...p, sold: itemCounts[p.id] || 0 }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);
  }, [orders, products]);

  const staffPerformance = useMemo(() => {
    return staff.filter(s => s.role !== 'owner').map(member => {
      const handled = orders.filter(o => 
        o.driverId === member.id || 
        o.timeline.some(t => t.author === member.name)
      ).length;
      return {
        name: member.name,
        role: member.role,
        handled,
        efficiency: handled > 0 ? 95 + (handled % 5) : 0 // Demo logic based on real volume
      };
    }).sort((a, b) => b.handled - a.handled);
  }, [staff, orders]);

  return (
    <div className="animate-fadeIn p-6 space-y-8 pb-24 md:px-12 w-full">
      <div className="flex items-center space-x-4">
        <button onClick={onBack} className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-300 hover:border-indigo-500 transition-colors">
          <i className="fa-solid fa-chevron-left"></i>
        </button>
        <h2 className="text-2xl font-black">{activeTab === 'business' ? 'Business Intelligence' : 'Team Performance'}</h2>
      </div>

      <div className="bg-slate-900 p-1 rounded-2xl flex border border-slate-800 max-w-sm mx-auto w-full">
        <button onClick={() => setActiveTab('business')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'business' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Business</button>
        <button onClick={() => setActiveTab('team')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'team' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Team</button>
      </div>

      {activeTab === 'business' ? (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Revenue</p>
                <p className="text-2xl font-black text-white">${stats.revenue.toLocaleString()}</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Growth</p>
                <p className="text-2xl font-black text-emerald-400">+{stats.growth}%</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inventory</p>
                <p className="text-2xl font-black text-indigo-400">{stats.inventoryHealth}%</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fulfillment</p>
                <p className="text-2xl font-black text-amber-400">{stats.totalCompleted}</p>
             </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] space-y-6 lg:p-12">
            <div className="flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Volume Trend</h3>
               <span className="text-xs font-bold text-slate-100">Last 7 Cycles</span>
            </div>
            <div className="h-40 flex items-end justify-between space-x-2 lg:h-60">
               {[40, 60, 45, 90, 70, 85, 100].map((h, i) => (
                 <div key={i} className="flex-1 bg-indigo-600 rounded-t-xl transition-all duration-1000 group relative" style={{ height: `${h}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-500 text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        {h}
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Best Selling Products</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topProducts.map((item, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center justify-between hover:border-indigo-500 transition-all">
                    <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center font-black text-indigo-400">#{idx+1}</div>
                    <span className="font-bold text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                    <p className="font-black text-white">${(item.price * item.sold).toFixed(0)}</p>
                    <p className="text-[9px] text-slate-500 uppercase font-black">{item.sold} units</p>
                    </div>
                </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Delivery</p>
                <p className="text-2xl font-black text-emerald-400">{stats.avgDeliveryTime}m</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Assembly</p>
                <p className="text-2xl font-black text-indigo-400">{stats.avgAssemblyTime}m</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Success Rate</p>
                <p className="text-2xl font-black text-amber-400">99.2%</p>
             </div>
             <div className="bg-slate-900 border border-slate-800 p-5 rounded-[2.5rem] space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Staff</p>
                <p className="text-2xl font-black text-white">{staff.filter(s=>s.status==='active').length}</p>
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Leaderboard</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffPerformance.map((member, idx) => (
                <div key={idx} className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex flex-col space-y-4 hover:border-indigo-500 transition-all">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg">{member.name[0]}</div>
                            <div>
                                <p className="font-bold text-sm">{member.name}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-black">{member.role}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black text-emerald-400">{member.handled} handled</p>
                            <p className="text-[9px] text-slate-600 uppercase">Eff. {member.efficiency}%</p>
                        </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${member.efficiency}%` }}></div>
                    </div>
                </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto w-full">
        <button className="bg-slate-800 py-4 rounded-2xl text-xs font-black text-indigo-400 flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-slate-700">
           <i className="fa-solid fa-file-pdf"></i>
           <span>Export PDF</span>
        </button>
        <button className="bg-slate-800 py-4 rounded-2xl text-xs font-black text-emerald-400 flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-slate-700">
           <i className="fa-solid fa-file-csv"></i>
           <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
};

export default AnalyticsCenter;
