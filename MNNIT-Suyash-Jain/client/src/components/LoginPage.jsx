import React, { useState } from 'react';
import {
  Package,
  UserCheck,
  Shield,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  KeyRound,
} from 'lucide-react';

export const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('operator@warehouse.com');
  const [password, setPassword] = useState('Operator123!');
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);

  const handleQuickLogin = async (roleName) => {
    setError('');
    setLoadingRole(roleName);

    const credentials =
      roleName === 'Supervisor'
        ? { email: 'supervisor@warehouse.com', password: 'Supervisor123!' }
        : { email: 'operator@warehouse.com', password: 'Operator123!' };

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        // Handle non-JSON server responses gracefully
      }

      if (!res.ok) {
        throw new Error(data.message || `Server responded with status ${res.status}`);
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Failed to authenticate with warehouse auth server');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingRole('custom');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        // Handle non-JSON server responses gracefully
      }

      if (!res.ok) {
        throw new Error(data.message || `Server responded with status ${res.status}`);
      }

      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Invalid warehouse credentials');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] text-[#111111] px-4 py-12 relative overflow-hidden"
      style={{ fontFamily: "'ITC Avant Garde Gothic W02 Bk', Inter, system-ui, sans-serif" }}
    >
      {/* Background Soft Gradient Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border border-slate-300 shadow-xs mb-4">
            <img
              src="/tetrifox-logo.png"
              alt="Tetrifox Logo"
              className="w-5 h-5 rounded-md object-cover"
            />
            <img
              src="/tetrifox-wordmark-black.svg"
              alt="tetrifox"
              className="h-4 sm:h-4.5 w-auto object-contain"
            />
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-xs text-slate-700 tracking-wide uppercase">
              Logistics Portal
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-mono text-slate-500">WH-AMS-01 Online</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Facility Terminal Authentication
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Select an operational persona to sign in and initialize your warehouse workstation session.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2 Persona Login Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Card 1: Operator */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-800 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Floor Operations
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-black transition">
                Alex Operator
              </h3>
              <span className="text-xs text-slate-500 font-mono block mt-0.5">
                operator@warehouse.com
              </span>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Physical conveyor sorting, parcel evaluation, universal XML / JSON manifest ingestion, and floor release retrieval.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Single & Batch Routing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Real-Time Vault Release Orders</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-60">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Insurance Hold Approval (Restricted)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleQuickLogin('Operator')}
              className="mt-6 w-full py-2.5 px-4 rounded-full text-white text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
            >
              <span>{loadingRole === 'Operator' ? 'Signing In...' : 'Sign In as Operator'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Supervisor */}
          <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-slate-800 transition-all shadow-sm hover:shadow-md flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Liability Escrow
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-black transition">
                Sarah Supervisor
              </h3>
              <span className="text-xs text-slate-500 font-mono block mt-0.5">
                supervisor@warehouse.com
              </span>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                Review high-value insurance holds, authorize liability release from Vault S-01, and manage dynamic business rules.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Insurance Liability Authorization</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Disengage Vault Escrow Locks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Dynamic Rule Governance & Priority Tuning</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={loadingRole !== null}
              onClick={() => handleQuickLogin('Supervisor')}
              className="mt-6 w-full py-2.5 px-4 rounded-full text-white text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
            >
              <span>{loadingRole === 'Supervisor' ? 'Signing In...' : 'Sign In as Supervisor'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Custom Credentials Toggle Form */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span>Enter Custom Warehouse Credentials (Email / Password)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {showCustomForm ? 'Hide Form' : 'Show Form'}
            </span>
          </button>

          {showCustomForm && (
            <form onSubmit={handleCustomSubmit} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    placeholder="operator@warehouse.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">
                  Default credentials prefilled for quick authentication
                </span>
                <button
                  type="submit"
                  disabled={loadingRole === 'custom'}
                  className="px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loadingRole === 'custom' ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-[11px] text-slate-400 flex items-center justify-center gap-3">
          <span>Enterprise Role-Based Access Control</span>
          <span>•</span>
          <span>Hub WH-AMS-01 (Amsterdam Distribution Center)</span>
        </div>
      </div>
    </div>
  );
};
