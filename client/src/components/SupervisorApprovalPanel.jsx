import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Lock, RefreshCw, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { DepartmentBadge } from './DepartmentBadge';

export const SupervisorApprovalPanel = ({ user, token, onSwitchRole }) => {
  const [pendingParcels, setPendingParcels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  const fetchPending = async () => {
    setLoading(true);
    setErrorBanner('');
    try {
      const res = await fetch('/api/v1/route/pending-approvals', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load pending approvals');
      }

      setPendingParcels(data.pendingParcels || []);
    } catch (err) {
      setErrorBanner(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'Supervisor' || user?.role === 'Admin') {
      fetchPending();
    }
  }, [user, token]);

  const handleApprove = async (parcelDbId) => {
    setErrorBanner('');
    setSuccessBanner('');

    if (user?.role !== 'Supervisor' && user?.role !== 'Admin') {
      setErrorBanner("Role 'Operator' is not authorized to approve high-value insurance parcels. Please switch to Supervisor mode.");
      return;
    }

    try {
      const res = await fetch(`/api/v1/route/approve/${parcelDbId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Approval failed');
      }

      setSuccessBanner(`${data.message || 'Insurance clearance authorized successfully'}: Floor release dispatch order transmitted to Operator terminal`);
      fetchPending();
    } catch (err) {
      setErrorBanner(err.message);
    }
  };

  const handleApproveAll = async () => {
    setErrorBanner('');
    setSuccessBanner('');
    for (const p of pendingParcels) {
      await handleApprove(p._id);
    }
  };

  if (user?.role !== 'Supervisor' && user?.role !== 'Admin') {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm text-slate-900 max-w-xl mx-auto">
        <Shield className="w-12 h-12 mx-auto text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">Supervisor Authorization Required</h3>
        <p className="text-xs text-slate-500 mb-6">
          High-value insurance parcels (greater than €1,000) are placed in escrow and restricted to Supervisor roles for liability clearance.
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

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Supervisor Insurance Approval Queue</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review and authorize high-value parcels worth over €1,000 requiring manual liability clearance
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingParcels.length > 1 && (
            <button
              onClick={handleApproveAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approve All ({pendingParcels.length})</span>
            </button>
          )}

          <button
            onClick={fetchPending}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="my-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          {errorBanner}
        </div>
      )}

      {successBanner && (
        <div className="my-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successBanner}</span>
        </div>
      )}

      {pendingParcels.length === 0 ? (
        <div className="mt-6 p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-900">No Pending Insurance Approvals</p>
          <p className="text-xs text-slate-500 mt-1">All high-value parcels in facility hub WH-AMS-01 have cleared liability review.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
              <tr>
                <th className="p-3">Parcel ID</th>
                <th className="p-3">Hub</th>
                <th className="p-3">Recipient</th>
                <th className="p-3">Declared Value</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingParcels.map((parcel) => (
                <tr key={parcel._id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-semibold text-slate-900">{parcel.parcelId}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-100 text-slate-700 border border-slate-300">
                      {parcel.warehouseId || 'WH-AMS-01'}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-800">{parcel.recipient?.name || 'Unknown'}</td>
                  <td className="p-3 text-rose-800 font-bold">€{parcel.valueEur}</td>
                  <td className="p-3">
                    <DepartmentBadge department={parcel.department} requiresApproval={false} />
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                      Held for Clearance
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleApprove(parcel._id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold transition shadow-sm hover:opacity-90 cursor-pointer"
                      style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Authorize Insurance</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
