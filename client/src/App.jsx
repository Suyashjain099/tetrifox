import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { SingleParcelForm } from './components/SingleParcelForm';
import { BatchUploadPanel } from './components/BatchUploadPanel';
import { SupervisorApprovalPanel } from './components/SupervisorApprovalPanel';
import { AnalyticsWidget } from './components/AnalyticsWidget';
import { RuleConfigPanel } from './components/RuleConfigPanel';
import {
  Package,
  UploadCloud,
  ShieldAlert,
  Activity,
  Sliders,
  UserCheck,
  Shield,
  Truck,
  Mail,
  Globe,
  ArrowRight,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(() => {
    try {
      const stored = sessionStorage.getItem('tetrifox_token');
      return stored && stored !== 'undefined' && stored !== 'null' ? stored : null;
    } catch (e) {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tetrifox_user');
      if (cached && cached !== 'undefined' && cached !== 'null') {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && parsed.role) {
          return parsed;
        }
      }
    } catch (e) {
      try {
        sessionStorage.removeItem('tetrifox_user');
      } catch (err) {}
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    try {
      return sessionStorage.getItem('tetrifox_active_tab') || 'single';
    } catch (e) {
      return 'single';
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [releaseNotification, setReleaseNotification] = useState(null);
  const [lastKnownApprovalTime, setLastKnownApprovalTime] = useState(() => Date.now());
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Authenticate and save session
  const authenticateRole = async (roleName = 'Operator') => {
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

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        sessionStorage.setItem('tetrifox_token', data.token);
        sessionStorage.setItem('tetrifox_user', JSON.stringify(data.user));
      }
    } catch (err) {
      // Handled silently
    }
  };

  // Poll pending approvals count periodically for the supervisor badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/v1/route/pending-approvals', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPendingApprovalsCount(data.pendingParcels?.length || 0);
        }
      } catch (err) {
        // Handled silently
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 6000);
    return () => clearInterval(interval);
  }, [token]);

  // Poll recent approvals to notify operators in real time of vault releases
  useEffect(() => {
    if (!token) return;

    const fetchRecentApprovals = async () => {
      try {
        const res = await fetch('/api/v1/route/recent-approvals', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const approvals = data.recentApprovals || [];
          if (approvals.length > 0) {
            const latest = approvals[0];
            const latestTime = new Date(latest.approvedAt).getTime();
            if (latestTime > lastKnownApprovalTime) {
              setReleaseNotification(latest);
              setLastKnownApprovalTime(latestTime);
            }
          }
        }
      } catch (err) {
        // Handled silently
      }
    };

    fetchRecentApprovals();
    const interval = setInterval(fetchRecentApprovals, 4000);
    return () => clearInterval(interval);
  }, [token, lastKnownApprovalTime]);

  const handleSelectTab = (tabKey) => {
    setActiveTab(tabKey);
    sessionStorage.setItem('tetrifox_active_tab', tabKey);
  };

  const handleLoginSuccess = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem('tetrifox_token', newToken);
    sessionStorage.setItem('tetrifox_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setReleaseNotification(null);
    sessionStorage.removeItem('tetrifox_token');
    sessionStorage.removeItem('tetrifox_user');
  };

  const handleSwitchRole = (role) => {
    authenticateRole(role);
  };

  const scrollToTab = (tabKey) => {
    handleSelectTab(tabKey);
    const workbench = document.getElementById('workbench');
    if (workbench) {
      workbench.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isSupervisor = user?.role === 'Supervisor' || user?.role === 'Admin';

  if (!token || !user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className="relative min-h-screen flex flex-col bg-[#f8fafc] text-[#111111]"
      style={{ fontFamily: "'ITC Avant Garde Gothic W02 Bk', Inter, system-ui, sans-serif" }}
    >
      {/* Persistent Fixed Top Header Bar */}
      <header
        className={`fixed top-0 inset-x-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs'
            : 'bg-[#f8fafc]/95 backdrop-blur-md border-b border-slate-200/80'
        }`}
      >
        <Navbar
          user={user}
          token={token}
          activeTab={activeTab}
          setActiveTab={handleSelectTab}
          showLoginModal={showLoginModal}
          setShowLoginModal={setShowLoginModal}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          pendingApprovalsCount={pendingApprovalsCount}
        />
      </header>

      {/* Hero Section Container with Bounded Video Backdrop (Offset for Fixed Persistent Header) */}
      <section className="relative overflow-hidden w-full pt-16">
        {/* Background Desaturated Grayscale Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
          style={{ filter: 'saturate(0)', opacity: 0.85 }}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260602_132418_e0e79d08-5d1f-42d9-b8ae-8dd69217aacf.mp4"
        />

        {/* Soft Bottom Gradient Mask for Seamless Transition */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f8fafc] z-10 pointer-events-none" />

        {/* Foreground Hero Content */}
        <div className="relative z-20 flex flex-col min-h-[480px] sm:min-h-[540px] items-center justify-center text-center px-4 pt-10 pb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 backdrop-blur-md border border-slate-300 text-xs font-semibold text-slate-800 mb-5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
            <span>Production Routing Engine v1.0</span>
          </div>

          <h1
            className="font-bold leading-tight mb-4 tracking-tight text-[#111111]"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              maxWidth: '820px',
              lineHeight: 1.1,
            }}
          >
            Intelligent parcel routing at enterprise velocity
          </h1>

          <p
            className="text-sm sm:text-base mb-8 max-w-xs sm:max-w-lg leading-relaxed font-normal"
            style={{ color: '#333333' }}
          >
            Automate parcel classification, enforce dynamic threshold safety, and dispatch multi-carrier manifests with sub-millisecond precision.
          </p>

          {/* Primary & Secondary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none">
            <button
              type="button"
              onClick={() => scrollToTab('single')}
              className="w-full sm:w-auto text-center text-white text-sm px-7 py-3 rounded-full transition-all duration-200 hover:opacity-90 shadow-sm cursor-pointer font-medium flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(to bottom, #3a3a3a, #111111)',
                border: '1.5px solid transparent',
              }}
            >
              <span>Route Single Parcel</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollToTab('batch')}
              className="w-full sm:w-auto text-center text-sm px-7 py-3 rounded-full transition-colors duration-200 backdrop-blur-md bg-white/70 hover:bg-white cursor-pointer font-medium border border-slate-800 text-slate-900"
            >
              Upload Batch Manifest
            </button>
          </div>
        </div>
      </section>

      {/* Floating Active Routing Department & Interchange Matrix Card */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 mb-8 relative z-20">
        <div
          className="w-full bg-white rounded-2xl p-5 sm:p-7 shadow-xl border border-slate-200"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-2 mb-3.5">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Routing Department Matrix
              </span>
              <p className="text-xs text-slate-400">
                Operational European postal thresholds and carrier dispatch rules
              </p>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 font-bold">
              Rules Synchronized
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div
              onClick={() => scrollToTab('single')}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <Mail className="w-3.5 h-3.5 text-slate-600" />
                <span>Mail Dept</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Weight ≤ 1.0 kg</p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Automated Dispatch</span>
            </div>

            <div
              onClick={() => scrollToTab('single')}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <Package className="w-3.5 h-3.5 text-slate-600" />
                <span>Regular Dept</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Weight ≤ 10.0 kg</p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Standard Dispatch</span>
            </div>

            <div
              onClick={() => scrollToTab('single')}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <Truck className="w-3.5 h-3.5 text-slate-600" />
                <span>Heavy Dept</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Weight &gt; 10.0 kg</p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Pallet Freight</span>
            </div>

            <div
              onClick={() => scrollToTab('supervisor')}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Insurance</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Value &gt; €1,000</p>
              <span className="text-[10px] text-rose-800 font-bold block mt-0.5">Supervisor Hold</span>
            </div>

            <div
              onClick={() => scrollToTab('single')}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-400 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <Globe className="w-3.5 h-3.5 text-slate-600" />
                <span>Customs</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1">Non-EU Target</p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Border Clearance</span>
            </div>
          </div>

          {/* Carrier Interchange Standards */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
            <span className="font-semibold text-slate-700">Supported Carrier & Logistics Standards:</span>
            <div className="flex items-center gap-2 font-medium">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">PostNL</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">DHL Express</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">FedEx</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">Universal Postal XML (UPU)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Studio Workbench */}
      <section id="workbench" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-4 scroll-mt-20">
        {/* Low-Profile Workbench Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Workbench</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900">
              {activeTab === 'single'
                ? 'Single Parcel Dispatch'
                : activeTab === 'batch'
                ? 'Batch Manifest Ingestion'
                : activeTab === 'supervisor'
                ? 'Supervisor Approvals Queue'
                : activeTab === 'rules'
                ? 'Dynamic Rule Governance'
                : 'System Telemetry & Analytics'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              {isSupervisor ? (
                <Shield className="w-3.5 h-3.5 text-slate-800" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-slate-800" />
              )}
              <span>
                Session: <strong className="text-slate-900">{user?.name || 'Guest'}</strong> (
                {user?.role || 'Operator'})
              </span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-slate-700">Hub: {user?.warehouseId || 'WH-AMS-01'}</span>
          </div>
        </div>

        {/* Tab View Content */}
        {activeTab === 'single' && (
          <SingleParcelForm
            apiKey="secret-api-key"
            token={token}
            user={user}
            onOpenLogin={() => setShowLoginModal(true)}
            releasedParcel={releaseNotification}
          />
        )}

        {activeTab === 'batch' && (
          <BatchUploadPanel
            apiKey="secret-api-key"
            token={token}
            user={user}
            onOpenLogin={() => setShowLoginModal(true)}
          />
        )}

        {activeTab === 'supervisor' && (
          <SupervisorApprovalPanel
            user={user}
            token={token}
            onSwitchRole={handleSwitchRole}
          />
        )}

        {activeTab === 'rules' && (
          <RuleConfigPanel
            user={user}
            token={token}
            onSwitchRole={handleSwitchRole}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsWidget user={user} token={token} />
        )}
      </section>

      {/* Real-time Operator Release Notification Toast (Delivered strictly to Floor Operator) */}
      {releaseNotification && user?.role === 'Operator' && (
        <aside
          aria-label="Supervisor Release Notification"
          className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2.5rem)] sm:w-[420px] bg-white border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Supervisor Vault Release Order
                  </h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300">
                    To: Floor Operator
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Authorized by {releaseNotification.approvedBy}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReleaseNotification(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold">Released Parcel:</span>
              <span className="font-mono font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                {releaseNotification.parcelId}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950">
              <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-800 block mb-0.5">
                Floor Dispatch Instruction:
              </span>
              <p className="font-semibold text-xs text-emerald-900">
                {releaseNotification.dispatchOrder}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500 font-medium">
                Destination: <strong className="text-slate-800">{releaseNotification.releasedBay}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  scrollToTab('single');
                }}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>View in Console</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Minimalist Global Logistics Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <img
              src="/tetrifox-logo.png"
              alt="Tetrifox Logo"
              className="w-4 h-4 rounded object-cover"
            />
            <img
              src="/tetrifox-wordmark-black.svg"
              alt="tetrifox"
              className="h-4 w-auto object-contain"
            />
            <span className="text-xs text-slate-600">Parcel Routing System</span>
          </div>
          <p className="text-slate-400">
            Automated postal routing and dynamic business rule governance.
          </p>
          <span className="font-mono text-[11px] text-slate-400">
            Active Hub: WH-AMS-01 (Amsterdam Distribution Center)
          </span>
        </div>
      </footer>
    </div>
  );
}
