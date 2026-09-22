import React, { useState } from 'react';
import { Package, Menu, X, Shield, UserCheck, LogOut } from 'lucide-react';
import { LoginModal } from './LoginModal';

export const Navbar = ({
  user,
  token,
  activeTab,
  setActiveTab,
  showLoginModal,
  setShowLoginModal,
  onLoginSuccess,
  onLogout,
  onSwitchRole,
  pendingApprovalsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isSupervisor = user?.role === 'Supervisor' || user?.role === 'Admin';

  const handleNavClick = (tabKey) => {
    setActiveTab(tabKey);
    setMobileMenuOpen(false);
    const workbenchEl = document.getElementById('workbench');
    if (workbenchEl) {
      workbenchEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-30">
        {/* Left Column: Brand Identity */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer select-none shrink-0 z-10"
        >
          <img
            src="/tetrifox-logo.png"
            alt="Tetrifox Logo"
            className="w-8 h-8 rounded-lg shadow-xs object-cover shrink-0"
          />
          <div className="flex items-center gap-2">
            <img
              src="/tetrifox-wordmark-black.svg"
              alt="tetrifox"
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="hidden xl:inline-flex items-center text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 whitespace-nowrap">
              Parcel Flow
            </span>
          </div>
        </div>

        {/* Center Column: Navigation Pill (True Absolute Centering with Uniform Distance) */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-1 rounded-full border border-slate-300/80 shadow-xs shrink-0 z-10" style={{ background: '#e5e5e5' }}>
          <button
            type="button"
            onClick={() => handleNavClick('single')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap font-medium ${
              activeTab === 'single'
                ? 'bg-[#111111] text-white font-semibold shadow-xs'
                : 'text-[#1a1a1a] hover:bg-white/60'
            }`}
          >
            Dispatch
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('batch')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap font-medium ${
              activeTab === 'batch'
                ? 'bg-[#111111] text-white font-semibold shadow-xs'
                : 'text-[#1a1a1a] hover:bg-white/60'
            }`}
          >
            Batch Ingest
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('supervisor')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap font-medium ${
              activeTab === 'supervisor'
                ? 'bg-[#111111] text-white font-semibold shadow-xs'
                : 'text-[#1a1a1a] hover:bg-white/60'
            }`}
          >
            <span>Approvals</span>
            {pendingApprovalsCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('rules')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap font-medium ${
              activeTab === 'rules'
                ? 'bg-[#111111] text-white font-semibold shadow-xs'
                : 'text-[#1a1a1a] hover:bg-white/60'
            }`}
          >
            Rule Config
          </button>

          <button
            type="button"
            onClick={() => handleNavClick('analytics')}
            className={`text-xs px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer whitespace-nowrap font-medium ${
              activeTab === 'analytics'
                ? 'bg-[#111111] text-white font-semibold shadow-xs'
                : 'text-[#1a1a1a] hover:bg-white/60'
            }`}
          >
            Telemetry
          </button>
        </div>

        {/* Right Column: User Profile Badge & Persona Switcher */}
        <div className="flex items-center justify-end gap-2 shrink-0 z-10">
          <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-slate-300 text-xs shadow-xs font-medium">
            {isSupervisor ? (
              <Shield className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="font-bold text-slate-800 hidden sm:inline">{user?.name || 'User'}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase leading-none ${
                isSupervisor ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {user?.role || 'Operator'}
            </span>
            {isSupervisor && pendingApprovalsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-none">
                {pendingApprovalsCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-300 transition cursor-pointer shadow-xs whitespace-nowrap"
            title="Log out and switch warehouse persona"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">Switch User</span>
            <span className="sm:hidden">Switch</span>
          </button>

          {/* Hamburger Menu (Tablets & Mobile) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-full transition-colors duration-200 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X size={20} color="#111111" />
            ) : (
              <Menu size={20} color="#111111" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile / Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div
          className="relative z-40 mx-4 mb-2 rounded-2xl px-4 py-4 flex flex-col gap-2 lg:hidden shadow-xl border border-slate-300"
          style={{ background: '#e5e5e5' }}
        >
          <button
            type="button"
            onClick={() => handleNavClick('single')}
            className={`text-left text-sm px-4 py-2 rounded-xl transition-colors duration-200 font-medium ${
              activeTab === 'single' ? 'bg-[#111111] text-white' : 'text-[#1a1a1a] hover:bg-white/50'
            }`}
          >
            Dispatch (Single Parcel)
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('batch')}
            className={`text-left text-sm px-4 py-2 rounded-xl transition-colors duration-200 font-medium ${
              activeTab === 'batch' ? 'bg-[#111111] text-white' : 'text-[#1a1a1a] hover:bg-white/50'
            }`}
          >
            Batch Ingest (XML / JSON)
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('supervisor')}
            className={`text-left text-sm px-4 py-2 rounded-xl transition-colors duration-200 font-medium ${
              activeTab === 'supervisor' ? 'bg-[#111111] text-white' : 'text-[#1a1a1a] hover:bg-white/50'
            }`}
          >
            Approvals Queue
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('rules')}
            className={`text-left text-sm px-4 py-2 rounded-xl transition-colors duration-200 font-medium ${
              activeTab === 'rules' ? 'bg-[#111111] text-white' : 'text-[#1a1a1a] hover:bg-white/50'
            }`}
          >
            Rule Configuration
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('analytics')}
            className={`text-left text-sm px-4 py-2 rounded-xl transition-colors duration-200 font-medium ${
              activeTab === 'analytics' ? 'bg-[#111111] text-white' : 'text-[#1a1a1a] hover:bg-white/50'
            }`}
          >
            System Telemetry
          </button>

          <div className="flex items-center justify-between pt-2 border-t border-[#c0c0c0]">
            <div className="flex items-center gap-2 text-xs">
              {isSupervisor ? (
                <Shield className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="font-bold text-slate-800">{user?.name} ({user?.role})</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onLogout && onLogout();
                setMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 rounded-full bg-white text-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch User</span>
            </button>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={onLoginSuccess}
      />
    </>
  );
};
