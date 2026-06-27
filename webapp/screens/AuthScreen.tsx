import React, { useState, useEffect } from 'react';
import { lookupClient, loginAccount, ClientProfile, AccountProfile } from '../api';

export type LoggedInUser =
  | { type: 'client';   profile: ClientProfile }
  | { type: 'supplier'; profile: AccountProfile }
  | { type: 'owner';    profile: AccountProfile };

interface AuthScreenProps {
  onAuthenticated: (user: LoggedInUser) => void;
}

type AuthView = 'detecting' | 'landing' | 'client-login' | 'client-register' | 'account-login' | 'loading';

// Phone validation: must be +998XXXXXXXXX (9 digits after code)
const PHONE_REGEX = /^\+998\d{9}$/;
const formatPhone = (raw: string): string => {
  // Strip everything except digits and leading +
  let digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('998') && !digits.startsWith('+')) digits = '+' + digits;
  if (!digits.startsWith('+')) digits = '+998' + digits.replace(/^\+?/, '');
  return digits.slice(0, 13); // +998 + 9 digits = 13 chars max
};

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [view, setView]         = useState<AuthView>('detecting');
  const [accountType, setAccountType] = useState<'supplier' | 'owner'>('supplier');
  const [error, setError]       = useState('');

  // Client login
  const [phone, setPhone]       = useState('');

  // Client register
  const [regName, setRegName]           = useState('');
  const [regInstitution, setRegInstitution] = useState('');
  const [regPhone, setRegPhone]         = useState('');
  const [regAddress, setRegAddress]     = useState('');
  const [fieldErrors, setFieldErrors]   = useState<Record<string,string>>({});

  // Supplier / Owner login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    setView('detecting');
    const saved = localStorage.getItem('blazeorder_user');
    if (saved) {
      try {
        const user = JSON.parse(saved) as LoggedInUser;
        if (user.type && user.profile) { onAuthenticated(user); return; }
      } catch { localStorage.removeItem('blazeorder_user'); }
    }
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      const chatId = String(tg.initDataUnsafe.user.id);
      try {
        const client = await lookupClient({ chat_id: chatId });
        if (client) {
          const user: LoggedInUser = { type: 'client', profile: client };
          localStorage.setItem('blazeorder_user', JSON.stringify(user));
          onAuthenticated(user); return;
        }
        const u = tg.initDataUnsafe.user;
        setRegName(`${u.first_name || ''} ${u.last_name || ''}`.trim());
        setView('client-register'); return;
      } catch { /* fall through */ }
    }
    setView('landing');
  };

  const saveAndGo = (user: LoggedInUser) => {
    localStorage.setItem('blazeorder_user', JSON.stringify(user));
    onAuthenticated(user);
  };

  // ── Client phone lookup ──────────────────────────────────────────────────
  const handleClientLogin = async () => {
    const cleaned = formatPhone(phone);
    if (!PHONE_REGEX.test(cleaned)) {
      setError('Enter a valid Uzbek number: +998XXXXXXXXX');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const client = await lookupClient({ phone: cleaned });
      if (client) {
        saveAndGo({ type: 'client', profile: client });
      } else {
        setRegPhone(cleaned);
        setView('client-register');
      }
    } catch (e: any) { setError(e.message || 'Connection error'); }
    finally { setSubmitting(false); }
  };

  // ── Validate registration fields ─────────────────────────────────────────
  const validateRegister = (): boolean => {
    const errs: Record<string,string> = {};
    if (!regName.trim())          errs.name        = 'Full name is required';
    if (!regInstitution.trim())   errs.institution = 'Institution / business is required';
    if (!regPhone.trim())         errs.phone       = 'Phone number is required';
    else if (!PHONE_REGEX.test(regPhone)) errs.phone = 'Must be +998XXXXXXXXX format';
    if (!regAddress.trim())       errs.address     = 'Delivery address is required';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Client registration ──────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!validateRegister()) return;
    setSubmitting(true); setError('');
    try {
      const { registerClient } = await import('../api');
      const tg     = (window as any).Telegram?.WebApp;
      const chatId = tg?.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : '';
      const client = await registerClient({
        name: regName.trim(), institution: regInstitution.trim(),
        phone: regPhone.trim(), address: regAddress.trim(), chat_id: chatId,
      });
      saveAndGo({ type: 'client', profile: client });
    } catch (e: any) { setError(e.message || 'Registration failed'); }
    finally { setSubmitting(false); }
  };

  // ── Supplier / Owner login ────────────────────────────────────────────────
  const handleAccountLogin = async () => {
    if (!username.trim() || !password.trim()) { setError('Username and password required'); return; }
    setSubmitting(true); setError('');
    try {
      const account = await loginAccount(username.trim(), password.trim());
      if (account.type === 'owner' || account.type === 'supplier') {
        saveAndGo({ type: account.type, profile: account });
      } else {
        setError('Unknown account type');
      }
    } catch (e: any) { setError(e.message || 'Invalid credentials'); }
    finally { setSubmitting(false); }
  };

  const Field = ({ label, value, onChange, placeholder, type = 'text', error: err }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder: string; type?: string; error?: string;
  }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input
        type={type} value={value}
        onChange={e => {
          if (type === 'tel') onChange(formatPhone(e.target.value));
          else onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={`w-full bg-slate-900 border rounded-2xl py-4 px-5 text-sm text-white outline-none transition-all placeholder-slate-600
          ${err ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-indigo-500'}`}
      />
      {err && <p className="text-rose-400 text-[10px] font-bold px-1">{err}</p>}
    </div>
  );

  // DETECTING
  if (view === 'detecting' || view === 'loading') return (
    <div className="flex items-center justify-center h-screen bg-slate-950 flex-col gap-4">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
        <span className="text-3xl font-black text-indigo-600">B</span>
      </div>
      <p className="text-white text-lg font-semibold">BlazeOrder</p>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mt-2"></div>
    </div>
  );

  // LANDING
  if (view === 'landing') return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      <div className="flex-1 flex flex-col items-center justify-center px-8 space-y-10">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
            <span className="text-5xl font-black text-indigo-600">B</span>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight">BlazeOrder</h1>
            <p className="text-slate-400 text-sm mt-1">Fast B2B Ordering Platform</p>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-4">Who are you?</p>
          {[
            { label: "I'm a Client",    sub: 'Browse and order products',  icon: 'fa-user',          color: 'indigo',  view: 'client-login' as AuthView,  type: null },
            { label: "I'm a Supplier",  sub: 'Manage orders and inventory', icon: 'fa-boxes-stacked', color: 'emerald', view: 'account-login' as AuthView, type: 'supplier' as const },
            { label: "Owner / Admin",   sub: 'Full system access',         icon: 'fa-crown',         color: 'amber',   view: 'account-login' as AuthView,  type: 'owner' as const },
          ].map(item => (
            <button key={item.label}
              onClick={() => { if (item.type) setAccountType(item.type); setView(item.view); setError(''); }}
              className={`w-full bg-slate-900 border border-slate-700 hover:border-${item.color}-500 p-5 rounded-3xl flex items-center space-x-4 transition-all active:scale-[0.98]`}>
              <div className={`w-12 h-12 bg-${item.color}-600/20 rounded-2xl flex items-center justify-center`}>
                <i className={`fa-solid ${item.icon} text-${item.color}-400 text-lg`}></i>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
              </div>
              <i className="fa-solid fa-chevron-right text-slate-600 ml-auto"></i>
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-700 pb-8">BlazeOrder · Tashkent, Uzbekistan</p>
    </div>
  );

  // CLIENT PHONE LOGIN
  if (view === 'client-login') return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      <div className="flex-1 flex flex-col justify-center px-8 space-y-6 max-w-sm mx-auto w-full">
        <button onClick={() => { setView('landing'); setError(''); }} className="flex items-center space-x-2 text-slate-400 text-sm mb-4">
          <i className="fa-solid fa-chevron-left text-xs"></i><span>Back</span>
        </button>
        <div>
          <h2 className="text-2xl font-black">Welcome back</h2>
          <p className="text-slate-400 text-sm mt-1">Enter your phone number to continue</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
          <input
            type="tel" value={phone}
            onChange={e => { setPhone(formatPhone(e.target.value)); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleClientLogin()}
            placeholder="+998901234567"
            className={`w-full bg-slate-900 border rounded-2xl py-4 px-5 text-base text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-600
              ${error ? 'border-rose-500' : 'border-slate-700'}`}
          />
          <p className="text-[10px] text-slate-600 px-1">Format: +998 XX XXX XX XX</p>
          {error && <p className="text-rose-400 text-xs font-bold px-1">{error}</p>}
        </div>
        <button onClick={handleClientLogin} disabled={submitting || !phone.trim()}
          className="w-full bg-indigo-600 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40">
          {submitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Checking...</span> : 'Continue'}
        </button>
        <p className="text-center text-xs text-slate-600">New? Enter your number and we'll register you.</p>
      </div>
    </div>
  );

  // CLIENT REGISTER
  if (view === 'client-register') return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white pb-10">
      <div className="pt-12 pb-6 px-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950">
        <button onClick={() => { setView('client-login'); setError(''); setFieldErrors({}); }} className="flex items-center space-x-2 text-slate-400 text-sm mb-4">
          <i className="fa-solid fa-chevron-left text-xs"></i><span>Back</span>
        </button>
        <h2 className="text-2xl font-black">Create Account</h2>
        <p className="text-indigo-300 text-sm mt-1">All fields are required</p>
      </div>
      <div className="flex-1 px-6 pt-6 space-y-4 max-w-lg mx-auto w-full">
        <Field label="Full Name *"             value={regName}        onChange={setRegName}        placeholder="John Doe"            error={fieldErrors.name} />
        <Field label="Institution / Business *" value={regInstitution} onChange={setRegInstitution} placeholder="Cyber Club Galaxy..."  error={fieldErrors.institution} />
        <Field label="Phone Number *"          value={regPhone}       onChange={setRegPhone}       placeholder="+998901234567" type="tel" error={fieldErrors.phone} />
        <Field label="Delivery Address *"      value={regAddress}     onChange={setRegAddress}     placeholder="Street, building..."   error={fieldErrors.address} />
        {error && <p className="text-rose-400 text-xs font-bold px-1">{error}</p>}
        <button onClick={handleRegister} disabled={submitting}
          className="w-full bg-indigo-600 py-5 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40 mt-2">
          {submitting
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Creating...</span>
            : 'Create Account & Continue'}
        </button>
      </div>
    </div>
  );

  // SUPPLIER / OWNER LOGIN
  const isOwner = accountType === 'owner';
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white">
      <div className="flex-1 flex flex-col justify-center px-8 space-y-6 max-w-sm mx-auto w-full">
        <button onClick={() => { setView('landing'); setError(''); setUsername(''); setPassword(''); }} className="flex items-center space-x-2 text-slate-400 text-sm mb-2">
          <i className="fa-solid fa-chevron-left text-xs"></i><span>Back</span>
        </button>
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isOwner ? 'bg-amber-600/20' : 'bg-emerald-600/20'}`}>
            <i className={`fa-solid ${isOwner ? 'fa-crown text-amber-400' : 'fa-boxes-stacked text-emerald-400'} text-xl`}></i>
          </div>
          <div>
            <h2 className="text-2xl font-black">{isOwner ? 'Owner Login' : 'Supplier Login'}</h2>
            <p className="text-slate-400 text-sm">{isOwner ? 'Full system access' : 'Your orders & inventory'}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
            <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAccountLogin()}
              placeholder={isOwner ? 'admin' : 'your username'}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-600" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <input type={pwVisible ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAccountLogin()}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-5 pr-12 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder-slate-600" />
              <button onClick={() => setPwVisible(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <i className={`fa-solid ${pwVisible ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
              </button>
            </div>
          </div>
        </div>
        {error && <p className="text-rose-400 text-xs font-bold px-1">{error}</p>}
        <button onClick={handleAccountLogin} disabled={submitting || !username.trim() || !password.trim()}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40 ${isOwner ? 'bg-amber-600' : 'bg-emerald-600'}`}>
          {submitting
            ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Signing in...</span>
            : 'Sign In'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
