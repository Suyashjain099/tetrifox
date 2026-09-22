import React, { useState, useEffect } from 'react';
import { Sliders, Shield, RotateCcw, Save, AlertCircle, CheckCircle2, ArrowRight, Info } from 'lucide-react';

export const RuleConfigPanel = ({ user, token, onSwitchRole }) => {
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    mailMaxWeightKg: '1.0',
    regularMaxWeightKg: '10.0',
    insuranceMinThresholdEur: '1000.0',
  });

  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const fetchConfig = async () => {
    if (!token) return;
    setLoading(true);
    setErrorBanner('');
    try {
      const res = await fetch('/api/v1/config/rules', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch rule configuration');
      }

      setConfig(data.config);
      setFormData({
        mailMaxWeightKg: String(data.config.mailMaxWeightKg),
        regularMaxWeightKg: String(data.config.regularMaxWeightKg),
        insuranceMinThresholdEur: String(data.config.insuranceMinThresholdEur),
      });
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [token, user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorBanner('');
    setSuccessBanner('');

    if (user?.role !== 'Supervisor' && user?.role !== 'Admin') {
      setErrorBanner("Role 'Operator' is not authorized to update business rule thresholds. Switch to Supervisor mode.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/config/rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mailMaxWeightKg: parseFloat(formData.mailMaxWeightKg),
          regularMaxWeightKg: parseFloat(formData.regularMaxWeightKg),
          insuranceMinThresholdEur: parseFloat(formData.insuranceMinThresholdEur),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Update failed');
      }

      setSuccessBanner(data.message || 'Routing thresholds updated successfully!');
      setConfig(data.config);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    setErrorBanner('');
    setSuccessBanner('');

    if (user?.role !== 'Supervisor' && user?.role !== 'Admin') {
      setErrorBanner("Role 'Operator' is not authorized to execute configuration rollback.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/config/rules/rollback', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Rollback failed');
      }

      setSuccessBanner(data.message || 'Rolled back to previous threshold configuration!');
      setConfig(data.config);
      setFormData({
        mailMaxWeightKg: String(data.config.mailMaxWeightKg),
        regularMaxWeightKg: String(data.config.regularMaxWeightKg),
        insuranceMinThresholdEur: String(data.config.insuranceMinThresholdEur),
      });
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'Supervisor' && user?.role !== 'Admin') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm text-slate-900 max-w-xl mx-auto">
        <Sliders className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">Supervisor Governance Required</h3>
        <p className="text-xs text-slate-500 mb-6">
          Dynamic Business Rule Configuration and Rollback safety controls are restricted to Supervisor and Admin roles.
        </p>
        <button
          type="button"
          onClick={() => onSwitchRole && onSwitchRole('Supervisor')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-semibold shadow-sm hover:opacity-90 transition cursor-pointer"
          style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
        >
          <span>Switch to Supervisor Role (Demo)</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const mailWeightNum = parseFloat(formData.mailMaxWeightKg) || 1.0;
  const regularWeightNum = parseFloat(formData.regularMaxWeightKg) || 10.0;
  const insuranceNum = parseFloat(formData.insuranceMinThresholdEur) || 1000.0;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Dynamic Rule Threshold Governance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Safely calibrate routing boundaries in real-time with versioning and zero-downtime rollback
          </p>
        </div>

        {config && (
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
            Active Revision: v{config.version}
          </span>
        )}
      </div>

      {errorBanner && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorBanner}</span>
        </div>
      )}

      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successBanner}</span>
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Mail Max Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.mailMaxWeightKg}
              onChange={(e) => setFormData({ ...formData, mailMaxWeightKg: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
            <span className="text-[11px] text-slate-500 block">Parcels up to this weight route to Mail</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Regular Max Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.regularMaxWeightKg}
              onChange={(e) => setFormData({ ...formData, regularMaxWeightKg: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
            <span className="text-[11px] text-slate-500 block">Parcels greater than Mail and up to this weight route to Regular</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Insurance Threshold (€)
            </label>
            <input
              type="number"
              step="50"
              value={formData.insuranceMinThresholdEur}
              onChange={(e) => setFormData({ ...formData, insuranceMinThresholdEur: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            />
            <span className="text-[11px] text-slate-500 block">Parcels exceeding this declared value require Supervisor clearance</span>
          </div>
        </div>

        {/* What-If Impact Simulator */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900 block mb-0.5">Configuration Impact Analysis:</span>
            <p>
              Current setting assigns weights from 0 to {mailWeightNum} kg to Mail, {mailWeightNum} to {regularWeightNum} kg to Regular, and over {regularWeightNum} kg to Heavy. High-value parcels over €{insuranceNum} are intercepted for Insurance approval before department routing.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-200 gap-4">
          <button
            type="button"
            onClick={handleRollback}
            disabled={loading || !config || config.historyCount === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold transition border border-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rollback Configuration ({config?.historyCount || 0} history records)</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-white font-medium text-sm transition shadow-sm hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Validating...' : 'Apply Threshold Updates'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
