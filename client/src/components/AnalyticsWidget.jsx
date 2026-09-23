import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, AlertTriangle, RefreshCw, BarChart2, Package, CheckCircle2, RotateCcw } from 'lucide-react';

export const AnalyticsWidget = ({ user, token }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/route/analytics', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch analytics metrics');
      }

      setMetrics(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetHistory = async () => {
    if (!token) return;
    const confirm = window.confirm('Reset all facility telemetry and parcel routing history to a clean slate of 0?');
    if (!confirm) return;

    setResetting(true);
    setError('');
    try {
      const res = await fetch('/api/v1/route/analytics/reset', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset telemetry history');
      }
      await fetchAnalytics();
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 3000);
    return () => clearInterval(interval);
  }, [token, user]);

  if (!metrics) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 flex items-center justify-between text-slate-900">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-slate-700 animate-pulse" />
          <span className="text-sm font-bold text-slate-800">Synchronizing Telemetry Metrics...</span>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition"
        >
          Refresh
        </button>
      </div>
    );
  }

  const { totalParcels, pendingApprovals, approvedInsurance, departmentBreakdown, anomalyAlerts } = metrics;
  const safeTotal = totalParcels || 1;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Real-Time Facility Telemetry & Anomaly Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time routing throughput for facility hub: <span className="font-mono text-slate-900 font-bold">{metrics.warehouseId}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Stream (3s)</span>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleResetHistory}
            disabled={resetting || loading}
            title="Reset all facility telemetry and parcel records to start fresh from 0"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset History'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Evaluated</span>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{totalParcels}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Live facility throughput</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Clearance</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {pendingApprovals > 0 ? (
              <span className="text-amber-800">{pendingApprovals}</span>
            ) : (
              <span>0</span>
            )}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Insurance holds awaiting review</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Insurance Cleared</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">{approvedInsurance}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Authorized by Supervisors</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Anomaly Warnings</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-3xl font-black text-slate-900">
            {anomalyAlerts.length > 0 ? (
              <span className="text-rose-800">{anomalyAlerts.length}</span>
            ) : (
              <span>0</span>
            )}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Statistical deviation triggers</span>
        </div>
      </div>

      {/* Department Distribution & Anomaly Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Volume Progress Bars */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-slate-700" />
            <span>Department Volume Distribution</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            {Object.entries(departmentBreakdown).map(([dept, count]) => {
              const pct = Math.round((count / safeTotal) * 100);
              return (
                <div key={dept} className="space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-800">{dept} Department</span>
                    <span className="text-slate-500 font-mono">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Anomaly & Risk Alerts Monitor */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Anomaly & Outlier Pattern Feed</span>
          </h3>

          {anomalyAlerts.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-900">Standard Operating Tolerances</p>
              <p className="text-[11px] text-slate-500 mt-0.5">No routing volume outliers or tariff anomalies detected.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {anomalyAlerts.map((alert) => {
                const isCritical = alert.level === 'CRITICAL';
                const isWarning = alert.level === 'WARNING';
                const isOutlier = alert.type === 'EXTREME_OUTLIER';

                return (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border bg-white text-xs space-y-1.5 transition-all shadow-2xs ${
                      isCritical
                        ? 'border-l-4 border-l-rose-600 border-slate-200'
                        : isWarning
                        ? 'border-l-4 border-l-amber-500 border-slate-200'
                        : 'border-l-4 border-l-sky-500 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {alert.level}
                        </span>
                        {isOutlier ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-purple-100 text-purple-800">
                            Outlier Parcel
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-amber-50 text-amber-900 border border-amber-200">
                            Facility Anomaly
                          </span>
                        )}
                        <span className="font-bold text-slate-900">{alert.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{alert.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
