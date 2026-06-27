import React, { useState } from 'react';
import { ClientProfile, AccountProfile } from '../api';
import { loginAccount, lookupClient, registerClient } from '../api';

export interface LoggedInUser {
  type: 'supplier' | 'owner' | 'client';
  profile: AccountProfile | ClientProfile;
}

interface Props {
  onAuthenticated: (u: LoggedInUser) => void;
}

type Mode = 'choose' | 'staff-login' | 'client-lookup' | 'client-register';

const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<Mode>('choose');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const profile = await loginAccount(username.trim(), password.trim());
      onAuthenticated({ type: profile.type as 'supplier' | 'owner', profile });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleClientLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const client = await lookupClient({ phone: phone.trim() });
      if (client) {
        onAuthenticated({ type: 'client', profile: client });
      } else {
        setMode('client-register');
      }
    } catch (err: any) {
      setError(err.message || 'Lookup failed');
    } finally { setLoading(false); }
  };

  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const client = await registerClient({ name: name.trim(), institution: institution.trim(), phone: phone.trim(), address: address.trim() });
      onAuthenticated({ type: 'client', profile: client });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const Logo = () => (
    <div className="flex flex-col items-center mb-8">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4">
        <span className="text-3xl font-black text-indigo-600">B</span>
      </div>
      <h1 className="text-2xl font-black text-white">BlazeOrder</h1>
      <p className="text-slate-400 text-sm mt-1">Smart Order Management</p>
    </div>
  );

  if (mode === 'choose') return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 px-6">
      <Logo />
      <div className="w-full max-w-sm space-y-3">
        <button onClick={() => setMode('client-lookup')} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
          <i className="fa-solid fa-user mr-2"></i>I'm a Buyer
        </button>
        <button onClick={() => setMode('staff-login')} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
          <i className="fa-solid fa-building mr-2"></i>Supplier / Owner Login
        </button>
      </div>
    </div>
  );

  if (mode === 'staff-login') return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 px-6">
      <Logo />
      <form onSubmit={handleStaffLogin} className="w-full max-w-sm space-y-3">
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required
          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required
          className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
        {error && <p className="text-rose-400 text-xs font-bold px-1">{error}</p>}
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <button type="button" onClick={() => { setMode('choose'); setError(''); }} className="w-full py-3 text-slate-500 text-sm font-bold">Back</button>
      </form>
    </div>
  );

  if (mode === 'client-lookup') return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 px-6">
      <Logo />
      <div className="w-full max-w-sm">
        <p className="text-slate-400 text-center text-sm mb-6">Enter your phone number to continue</p>
        <form onSubmit={handleClientLookup} className="space-y-3">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90 000 0000" required
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
          {error && <p className="text-rose-400 text-xs font-bold px-1">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
            {loading ? 'Checking...' : 'Continue'}
          </button>
          <button type="button" onClick={() => { setMode('choose'); setError(''); }} className="w-full py-3 text-slate-500 text-sm font-bold">Back</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-950 px-6">
      <Logo />
      <div className="w-full max-w-sm">
        <p className="text-slate-400 text-center text-sm mb-6">Complete your registration</p>
        <form onSubmit={handleClientRegister} className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone Number" required
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
          <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="Company / Institution"
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Delivery Address"
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:border-indigo-500 outline-none" />
          {error && <p className="text-rose-400 text-xs font-bold px-1">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-4 rounded-2xl text-white font-black text-sm uppercase transition-all">
            {loading ? 'Registering...' : 'Create Account'}
          </button>
          <button type="button" onClick={() => { setMode('client-lookup'); setError(''); }} className="w-full py-3 text-slate-500 text-sm font-bold">Back</button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
