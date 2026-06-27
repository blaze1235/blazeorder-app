
import React, { useState } from 'react';
import { UserRole, Language, ScreenType, StaffMember } from '../types';
import Drawer from '../components/Drawer';

interface ProfileProps {
  role: UserRole;
  onRoleSwitch: (role: UserRole) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (screen: ScreenType) => void;
  t: (key: string) => string;
  staff?: StaffMember[];
  activeDriverId?: string;
  onActiveDriverChange?: (id: string) => void;
  onUpdateStaffStatus?: (id: string, status: 'active' | 'offline') => void;
}

const LANGUAGES: { id: Language, label: string, flag: string }[] = [
  { id: 'en', label: 'English', flag: '🇺🇸' },
  { id: 'ru', label: 'Русский', flag: '🇷🇺' },
  { id: 'uz', label: 'O\'zbekcha', flag: '🇺🇿' },
];

const ROLES: UserRole[] = ['distributor', 'manager', 'fulfillment', 'driver'];

const Profile: React.FC<ProfileProps> = ({ 
  role, onRoleSwitch, language, onLanguageChange, onNavigate, t, staff = [], activeDriverId, onActiveDriverChange, onUpdateStaffStatus 
}) => {
  const [showLang, setShowLang] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDriverSwitcher, setShowDriverSwitcher] = useState(false);

  const isStaff = ['manager', 'fulfillment', 'driver', 'distributor'].includes(role);
  const drivers = staff.filter(s => s.role === 'driver');
  const currentDriver = drivers.find(d => d.id === activeDriverId);
  
  const canManageLogistics = role === 'distributor' || role === 'manager' || role === 'driver';
  const canManageAdminSettings = role === 'distributor' || role === 'manager';

  const menuItems = role === 'buyer' ? [
    { icon: 'fa-globe', label: t('language_select'), value: LANGUAGES.find(l=>l.id===language)?.label, action: () => setShowLang(true), color: 'text-indigo-400' },
    { icon: 'fa-heart', label: t('wishlist'), action: () => {}, color: 'text-rose-400' },
    { icon: 'fa-shield-halved', label: t('security'), action: () => {}, color: 'text-emerald-400' },
    { icon: 'fa-circle-question', label: t('support'), action: () => {}, color: 'text-blue-400' },
  ] : [
    { icon: 'fa-globe', label: t('language_select'), value: LANGUAGES.find(l=>l.id===language)?.label, action: () => setShowLang(true), color: 'text-indigo-400' },
    { icon: 'fa-user-gear', label: t('switch_role'), value: t(role), action: () => setShowRoleModal(true), color: 'text-rose-400' },
    ...(role === 'driver' ? [
        { icon: 'fa-id-card', label: 'Switch Active Driver', value: currentDriver?.name, action: () => setShowDriverSwitcher(true), color: 'text-amber-400' },
        { 
          icon: 'fa-signal', 
          label: 'My Availability', 
          value: currentDriver?.status === 'active' ? 'Online' : 'Offline', 
          action: () => {
            if (activeDriverId && onUpdateStaffStatus && currentDriver) {
               onUpdateStaffStatus(activeDriverId, currentDriver.status === 'active' ? 'offline' : 'active');
            }
          }, 
          color: currentDriver?.status === 'active' ? 'text-emerald-400' : 'text-slate-500' 
        }
    ] : []),
    ...(canManageAdminSettings ? [{ icon: 'fa-clock', label: t('working_hours'), action: () => onNavigate('working-hours'), color: 'text-amber-400' }] : []),
    ...(canManageLogistics ? [{ icon: 'fa-truck-fast', label: t('delivery_zones'), action: () => onNavigate('delivery-zones'), color: 'text-emerald-400' }] : []),
    ...(canManageAdminSettings ? [{ icon: 'fa-user-group', label: t('staff_access'), action: () => onNavigate('distributor-team'), color: 'text-blue-400' }] : []),
  ];

  return (
    <div className="animate-fadeIn p-6 space-y-8">
      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="w-28 h-28 bg-gradient-to-tr from-indigo-500 to-purple-500 p-1 rounded-full shadow-2xl">
          <img src="https://picsum.photos/seed/avatar/200/200" className="w-full h-full rounded-full border-4 border-slate-950 object-cover" alt="Profile" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">{isStaff ? (role.toUpperCase()) : 'John Doe'}</h2>
          <p className="text-sm text-slate-500 font-medium">@{isStaff ? role : 'johndoe'}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-2 rounded-2xl flex">
        <button onClick={() => onRoleSwitch('buyer')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${role === 'buyer' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>{t('buyer')}</button>
        <button onClick={() => onRoleSwitch('distributor')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${isStaff ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>{t('staff')}</button>
      </div>

      <div className="space-y-2 pb-12">
        {menuItems.map((item, idx) => (
          <button key={idx} onClick={item.action} className="w-full bg-slate-900/50 border border-slate-800/60 p-5 rounded-3xl flex items-center justify-between transition-all group active:scale-[0.98]">
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center ${item.color}`}>
                <i className={`fa-solid ${item.icon}`}></i>
              </div>
              <span className="font-bold text-sm text-slate-200">{item.label}</span>
            </div>
            <div className="flex items-center space-x-3">
              {item.value && <span className="text-xs font-bold text-slate-500">{item.value}</span>}
              <i className="fa-solid fa-chevron-right text-slate-700"></i>
            </div>
          </button>
        ))}
      </div>

      <Drawer isOpen={showDriverSwitcher} onClose={() => setShowDriverSwitcher(false)} title="Active Driver Switcher">
         <div className="space-y-3">
           {drivers.map(d => (
             <button 
                key={d.id} 
                onClick={() => { onActiveDriverChange?.(d.id); setShowDriverSwitcher(false); }}
                className={`w-full p-5 rounded-3xl text-sm font-bold flex justify-between items-center transition-all ${activeDriverId === d.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300'}`}
             >
                <div className="flex items-center space-x-4">
                   <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center"><i className="fa-solid fa-id-card text-xs"></i></div>
                   <div className="text-left">
                      <p>{d.name}</p>
                      <p className={`text-[10px] font-black uppercase ${d.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>{d.status}</p>
                   </div>
                </div>
                {activeDriverId === d.id && <i className="fa-solid fa-check"></i>}
             </button>
           ))}
         </div>
      </Drawer>

      <Drawer isOpen={showLang} onClose={() => setShowLang(false)} title={t('language_select')}>
        <div className="space-y-3">
          {LANGUAGES.map(l => (
            <button 
            key={l.id} 
            onClick={() => { onLanguageChange(l.id); setShowLang(false); }} 
            className={`w-full p-5 rounded-3xl text-sm font-bold flex justify-between items-center transition-all ${language === l.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300'}`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-xl">{l.flag}</span>
                <span>{l.label}</span>
              </div>
              {language === l.id && <i className="fa-solid fa-check"></i>}
            </button>
          ))}
        </div>
      </Drawer>

      <Drawer isOpen={showRoleModal && isStaff} onClose={() => setShowRoleModal(false)} title={t('switch_role')}>
        <div className="space-y-3">
          {ROLES.map(r => (
            <button 
            key={r} 
            onClick={() => { onRoleSwitch(r); setShowRoleModal(false); }} 
            className={`w-full p-5 rounded-3xl text-sm font-bold flex justify-between items-center transition-all ${role === r ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300'}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role === r ? 'bg-white/20' : 'bg-slate-700'}`}>
                  <i className={`fa-solid ${r === 'manager' ? 'fa-user-tie' : r === 'fulfillment' ? 'fa-box-open' : r === 'driver' ? 'fa-truck-fast' : 'fa-crown'} text-xs`}></i>
                </div>
                <span>{t(r)}</span>
              </div>
              {role === r && <i className="fa-solid fa-check"></i>}
            </button>
          ))}
        </div>
      </Drawer>
    </div>
  );
};

export default Profile;
