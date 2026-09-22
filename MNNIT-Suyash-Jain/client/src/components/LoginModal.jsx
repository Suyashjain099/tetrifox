import React, { useState } from 'react';
import { X, Lock, UserCheck, Shield, Building2 } from 'lucide-react';

export const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('supervisor@warehouse.com');
  const [password, setPassword] = useState('Supervisor123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickSwitch = (accountType) => {
    if (accountType === 'Operator') {
      setEmail('operator@warehouse.com');
      setPassword('Operator123!');
    } else if (accountType === 'SupervisorAMS') {
      setEmail('supervisor@warehouse.com');
      setPassword('Supervisor123!');
    } else if (accountType === 'SupervisorRTM') {
      setEmail('supervisor.rotterdam@warehouse.com');
      setPassword('Supervisor123!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      onLoginSuccess(data.token, data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 relative border border-slate-200 shadow-2xl text-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-slate-800" />
            <span>Warehouse Authentication</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Select a role profile or enter custom warehouse credentials</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Demo Accounts Quick Select */}
        <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Select Active Profile:
          </span>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleQuickSwitch('Operator')}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                email === 'operator@warehouse.com'
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Alex Operator</span>
              </span>
              <span className="text-[10px] bg-emerald-100/70 text-emerald-800 font-medium px-2 py-0.5 rounded">Amsterdam Hub</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSwitch('SupervisorAMS')}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                email === 'supervisor@warehouse.com'
                  ? 'bg-rose-50 border-rose-400 text-rose-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Sarah Supervisor</span>
              </span>
              <span className="text-[10px] bg-rose-100/70 text-rose-800 font-medium px-2 py-0.5 rounded">Amsterdam Hub</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickSwitch('SupervisorRTM')}
              className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                email === 'supervisor.rotterdam@warehouse.com'
                  ? 'bg-purple-50 border-purple-400 text-purple-800 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span>Mark Supervisor</span>
              </span>
              <span className="text-[10px] bg-purple-100/70 text-purple-800 font-medium px-2 py-0.5 rounded">Rotterdam Hub</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full text-white font-semibold text-sm transition shadow-md hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Console'}
          </button>
        </form>
      </div>
    </div>
  );
};
