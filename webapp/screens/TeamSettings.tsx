
import React, { useState } from 'react';
import { StaffMember, Permission, UserRole } from '../types';
import Drawer from '../components/Drawer';

interface TeamSettingsProps {
  team: StaffMember[];
  onUpdateTeam: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  role: UserRole;
  onRemoveStaff: (id: string) => void;
}

const TeamSettings: React.FC<TeamSettingsProps> = ({ team, onUpdateTeam, role, onRemoveStaff }) => {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<'manager' | 'fulfillment' | 'driver'>('fulfillment');

  const isOwner = role === 'distributor';
  const isManager = role === 'manager';
  const canManageStaff = isOwner || isManager;

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'owner': return 'text-rose-400 bg-rose-400/10';
      case 'manager': return 'text-indigo-400 bg-indigo-400/10';
      case 'fulfillment': return 'text-emerald-400 bg-emerald-400/10';
      case 'driver': return 'text-amber-400 bg-amber-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const handleAddStaff = () => {
    if (!newStaffName.trim()) return;
    const newMember: StaffMember = {
      id: `u${Date.now()}`,
      name: newStaffName,
      role: newStaffRole as any,
      permissions: [],
      status: 'offline',
      lastActive: 'Never',
      ordersHandled: 0,
      avgTime: 'N/A'
    };
    onUpdateTeam(prev => [...prev, newMember]);
    setShowAddStaff(false);
    setNewStaffName("");
  };

  return (
    <div className="animate-fadeIn p-6 space-y-6 pb-24 md:px-12 w-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black">Staff Management</h2>
          <p className="text-xs text-slate-500 font-medium">
            {isOwner ? 'Full administrative control' : isManager ? 'Operational team management' : 'View-only team access'}
          </p>
        </div>
        {canManageStaff && (
          <button 
            onClick={() => setShowAddStaff(true)}
            className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-90 transition-all hover:bg-indigo-500"
          >
             <i className="fa-solid fa-plus text-lg"></i>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {team.map((member) => (
          <button 
            key={member.id}
            onClick={() => setSelectedStaff(member)}
            className="w-full bg-slate-900/50 border border-slate-800 p-5 rounded-[2.5rem] flex items-center justify-between group active:scale-[0.98] transition-all hover:border-indigo-500/50"
          >
             <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${getRoleColor(member.role)}`}>
                   {member.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-left">
                   <h4 className="font-bold text-slate-100">{member.name}</h4>
                   <div className="flex items-center space-x-2 mt-0.5">
                     <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${getRoleColor(member.role)}`}>
                        {member.role}
                     </span>
                     <span className={`text-[9px] font-bold ${member.status === 'active' ? 'text-emerald-500' : 'text-slate-600'}`}>• {member.status}</span>
                   </div>
                </div>
             </div>
             <i className="fa-solid fa-chevron-right text-slate-700 group-hover:translate-x-1 transition-transform"></i>
          </button>
        ))}
      </div>

      <Drawer isOpen={!!selectedStaff} onClose={() => setSelectedStaff(null)} title={selectedStaff?.name}>
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-3xl ${selectedStaff ? getRoleColor(selectedStaff.role) : ''}`}>
               {selectedStaff?.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h3 className="text-xl font-bold">{selectedStaff?.name}</h3>
            <p className="text-xs text-slate-500">Last active: {selectedStaff?.lastActive}</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-center">
             <div className="bg-slate-800 p-4 rounded-2xl">
                <p className="text-[8px] text-slate-500 uppercase font-black">Orders Processed</p>
                <p className="text-lg font-black text-white">{selectedStaff?.ordersHandled || 0}</p>
             </div>
             <div className="bg-slate-800 p-4 rounded-2xl">
                <p className="text-[8px] text-slate-500 uppercase font-black">Efficiency</p>
                <p className="text-lg font-black text-emerald-400">98%</p>
             </div>
          </div>

          {(isOwner || (isManager && selectedStaff?.role !== 'owner')) && (
            <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => {
                    if (selectedStaff && window.confirm(`Permanently revoke access for ${selectedStaff.name}?`)) {
                      onRemoveStaff(selectedStaff.id);
                      setSelectedStaff(null);
                    }
                  }}
                  className="bg-rose-500/10 py-5 rounded-3xl text-xs font-black text-rose-500 hover:bg-rose-500/20 transition-all uppercase tracking-widest border border-rose-500/20"
                >
                  Remove Access
                </button>
            </div>
          )}
        </div>
      </Drawer>

      <Drawer isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} title="Add Staff Member">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
            <input 
              type="text" 
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Ex: David Jones"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-sm text-white focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Role</label>
            <div className="flex space-x-2">
              {(isOwner ? ['manager', 'fulfillment', 'driver'] : ['fulfillment', 'driver']).map(r => (
                <button 
                  key={r}
                  onClick={() => setNewStaffRole(r as any)}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${newStaffRole === r ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-400'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <button 
            onClick={handleAddStaff}
            className="w-full bg-indigo-600 py-4 rounded-2xl text-xs font-black text-white uppercase shadow-xl"
          >
            Create Access
          </button>
        </div>
      </Drawer>
    </div>
  );
};

export default TeamSettings;
