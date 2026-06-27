import React, { useState } from 'react';
import { StaffMember, UserRole } from '../types';

interface Props {
  team: StaffMember[];
  onUpdateTeam: (team: StaffMember[]) => void;
  role: UserRole;
  onRemoveStaff: (id: string) => void;
}

const roleColor: Record<string, string> = {
  owner: 'text-amber-400 bg-amber-400/10',
  manager: 'text-blue-400 bg-blue-400/10',
  fulfillment: 'text-indigo-400 bg-indigo-400/10',
  driver: 'text-purple-400 bg-purple-400/10',
  finance: 'text-emerald-400 bg-emerald-400/10',
};

const TeamSettings: React.FC<Props> = ({ team, onRemoveStaff }) => {
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  return (
    <div className="p-4 space-y-4 animate-fadeIn pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Team</h1>
        <span className="text-slate-400 text-sm font-bold">{team.length} member{team.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Active', value: team.filter(s => s.status === 'active').length, color: 'text-emerald-400' },
          { label: 'Offline', value: team.filter(s => s.status === 'offline').length, color: 'text-slate-400' },
          { label: 'Total Orders', value: team.reduce((s, m) => s + (m.ordersHandled || 0), 0), color: 'text-indigo-400' },
        ].map(item => (
          <div key={item.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-3 text-center">
            <p className={`font-black text-xl ${item.color}`}>{item.value}</p>
            <p className="text-slate-500 text-[10px] font-bold uppercase">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {team.map(member => (
          <div key={member.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="font-black text-indigo-400 text-sm">{member.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="font-black text-sm">{member.name}</p>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${member.status === 'active' ? 'bg-emerald-400' : 'bg-slate-600'}`}></div>
                </div>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded capitalize ${roleColor[member.role] || 'text-slate-400 bg-slate-800'}`}>{member.role}</span>
                  <span className="text-slate-500 text-xs">{member.lastActive}</span>
                </div>
              </div>
              {confirmRemove === member.id ? (
                <div className="flex space-x-1.5">
                  <button onClick={() => { onRemoveStaff(member.id); setConfirmRemove(null); }}
                    className="text-[10px] font-black bg-rose-500 text-white px-2 py-1.5 rounded-lg">Remove</button>
                  <button onClick={() => setConfirmRemove(null)}
                    className="text-[10px] font-black bg-slate-700 text-slate-300 px-2 py-1.5 rounded-lg">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(member.id)} className="w-8 h-8 bg-slate-800 hover:bg-rose-500/20 rounded-xl flex items-center justify-center transition-all">
                  <i className="fa-solid fa-trash text-slate-500 hover:text-rose-400 text-xs transition-colors"></i>
                </button>
              )}
            </div>
            {(member.ordersHandled || member.avgTime) && (
              <div className="flex space-x-4 mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
                {member.ordersHandled !== undefined && <span><i className="fa-solid fa-box mr-1"></i>{member.ordersHandled} orders</span>}
                {member.avgTime && <span><i className="fa-solid fa-clock mr-1"></i>avg {member.avgTime}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamSettings;
