import React from 'react';
import { Order, Product } from '../types';
import { SupplierStats } from '../api';

interface Props {
  supplierStats: SupplierStats[];
  orders: Order[];
  products: Product[];
  loading: boolean;
}

const OwnerSuppliersScreen: React.FC<Props> = ({ supplierStats, loading }) => {
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <h1 className="text-2xl font-black">Suppliers</h1>
      {supplierStats.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <i className="fa-solid fa-boxes-stacked text-4xl mb-3"></i>
          <p className="font-bold">No supplier data</p>
        </div>
      )}
      <div className="space-y-3">
        {supplierStats.map(s => (
          <div key={s.name} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black">{s.name}</p>
                <p className="text-slate-400 text-xs">{s.productCount} products · {s.staffCount} staff</p>
              </div>
              <p className="font-black text-indigo-400 text-lg">${s.revenue.toFixed(0)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800 rounded-xl p-2">
                <p className="font-black text-sm text-emerald-400">{s.completedOrders}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Done</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-2">
                <p className="font-black text-sm text-amber-400">{s.fulfillmentRate}%</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Fulfil</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-2">
                <p className={`font-black text-sm ${s.lowStockCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{s.lowStockCount}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">Low Stock</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span><i className="fa-solid fa-user-group mr-1"></i>{s.activeStaff}/{s.staffCount} active</span>
              <span>{s.totalOrders} total orders</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerSuppliersScreen;
