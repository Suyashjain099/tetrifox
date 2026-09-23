import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Send,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Check,
  CornerDownRight,
  Globe,
  Truck,
  Package,
  Mail,
  Lock,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { DepartmentBadge } from './DepartmentBadge';

const DEFAULT_FORM_DATA = {
  recipientName: 'Jan de Vries',
  weightKg: '0.45',
  valueEur: '25.00',
  postalCode: '1012AB',
  destinationCountry: 'NL',
};

export const SingleParcelForm = ({ apiKey, token, user, onOpenLogin, releasedParcel }) => {
  const [formData, setFormData] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tetrifox_single_form_data');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Fallback to default
    }
    return DEFAULT_FORM_DATA;
  });

  const [errorBanner, setErrorBanner] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tetrifox_single_result');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Fallback to null
    }
    return null;
  });

  // Persist form state across page reloads
  useEffect(() => {
    try {
      sessionStorage.setItem('tetrifox_single_form_data', JSON.stringify(formData));
    } catch (err) {}
  }, [formData]);

  useEffect(() => {
    try {
      if (result) {
        sessionStorage.setItem('tetrifox_single_result', JSON.stringify(result));
      } else {
        sessionStorage.removeItem('tetrifox_single_result');
      }
    } catch (err) {}
  }, [result]);

  const applyPreset = (preset) => {
    setErrorBanner('');
    switch (preset) {
      case 'mail':
        setFormData({
          recipientName: 'Vinny Gankema',
          weightKg: '0.25',
          valueEur: '15.00',
          postalCode: '4744AT',
          destinationCountry: 'NL',
        });
        break;
      case 'regular':
        setFormData({
          recipientName: 'Soner Colen',
          weightKg: '3.50',
          valueEur: '120.00',
          postalCode: '3036MN',
          destinationCountry: 'NL',
        });
        break;
      case 'heavy':
        setFormData({
          recipientName: 'Ricardus Proper',
          weightKg: '22.50',
          valueEur: '450.00',
          postalCode: '4724BE',
          destinationCountry: 'NL',
        });
        break;
      case 'insurance':
        setFormData({
          recipientName: 'Alvaro ten Cate',
          weightKg: '0.90',
          valueEur: '2400.00',
          postalCode: '9801BZ',
          destinationCountry: 'NL',
        });
        break;
      case 'customs':
        setFormData({
          recipientName: 'Emily Watson',
          weightKg: '2.10',
          valueEur: '180.00',
          postalCode: 'EC1A 1BB',
          destinationCountry: 'GB',
        });
        break;
      default:
        break;
    }
  };

  const validateForm = () => {
    setErrorBanner('');
    const weight = parseFloat(formData.weightKg);
    const value = parseFloat(formData.valueEur);

    if (!formData.recipientName.trim()) {
      setErrorBanner('Please enter recipient name');
      return false;
    }
    if (isNaN(weight) || weight <= 0) {
      setErrorBanner('Please enter a valid positive parcel weight in kilograms');
      return false;
    }
    if (isNaN(value) || value < 0) {
      setErrorBanner('Please enter a valid non-negative parcel value in Euros (€)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setErrorBanner('Authentication Required: Please sign in as an Operator or Supervisor to evaluate parcel routing.');
      if (onOpenLogin) onOpenLogin();
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setResult(null);

    try {
      const payload = {
        recipient: { name: formData.recipientName },
        weightKg: parseFloat(formData.weightKg),
        valueEur: parseFloat(formData.valueEur),
        postalCode: formData.postalCode,
        destinationCountry: formData.destinationCountry,
      };

      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['X-API-Key'] = apiKey;
      }

      const res = await fetch('/api/v1/route', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Routing failed');
      }

      setResult(data.data);
    } catch (err) {
      setErrorBanner(err.message || 'Unable to communicate with routing engine');
    } finally {
      setLoading(false);
    }
  };

  const isEuCountry = ['NL', 'DE', 'FR', 'BE', 'ES', 'IT', 'AT', 'PL', 'SE', 'IE'].includes(
    formData.destinationCountry
  );
  const parsedValue = parseFloat(formData.valueEur) || 0;
  const parsedWeight = parseFloat(formData.weightKg) || 0;

  const isCurrentParcelReleased = Boolean(
    releasedParcel &&
    result &&
    (result.parcelId === releasedParcel.parcelId ||
      result.dbId === releasedParcel.id ||
      result.id === releasedParcel.parcelId)
  );

  const isAutoApproved = Boolean(
    result &&
    result.approvalStatus === 'APPROVED' &&
    (result.matchedRule === 'InsuranceRule' || result.department === 'Insurance')
  );

  // Calculate active multi-hop routing itinerary
  const getRoutePlan = () => {
    let baseHops = [];
    if (result?.routePlan && result.routePlan.length > 0) {
      baseHops = result.routePlan;
    } else {
      const hops = [];
      let hopNum = 1;
      const isHighValue = parsedValue > 1000;
      const isNonEu = !isEuCountry;

      let physicalDept = 'Mail';
      let physicalBay = 'Bay M-01 (Automated Sorter)';
      let physicalReason = `Weight ${parsedWeight.toFixed(2)}kg ≤ 1.0kg threshold`;
      let physicalAction = 'Automated sorting for courier bikes & local postal vans';

      if (parsedWeight > 10.0) {
        physicalDept = 'Heavy';
        physicalBay = 'Bay H-04 (Pallet Freight & Forklift)';
        physicalReason = `Weight ${parsedWeight.toFixed(2)}kg > 10.0kg freight threshold`;
        physicalAction = 'Palletized loading for heavy cargo truck';
      } else if (parsedWeight > 1.0) {
        physicalDept = 'Regular';
        physicalBay = 'Bay R-02 (Standard Courier Van)';
        physicalReason = `Weight ${parsedWeight.toFixed(2)}kg ≤ 10.0kg standard threshold`;
        physicalAction = 'Standard parcel sorting for delivery van routes';
      }

      if (isHighValue) {
        hops.push({
          hop: hopNum++,
          department: 'Insurance',
          bay: 'Bay S-01 (Secure Vault Escrow)',
          type: 'COMPLIANCE_HOLD',
          status: 'CURRENT_HOLD',
          reason: `Value €${parsedValue.toFixed(2)} exceeds €1,000 threshold`,
          action: 'Supervisor liability sign-off required before physical release',
          isCurrentHop: true,
        });
      }

      if (isNonEu) {
        hops.push({
          hop: hopNum++,
          department: 'Customs',
          bay: 'Bay C-02 (Border Clearance)',
          type: 'CUSTOMS_CLEARANCE',
          status: isHighValue ? 'SCHEDULED_NEXT_HOP' : 'CURRENT_ACTIVE_HOP',
          reason: `Destination ${formData.destinationCountry} is outside the European Union`,
          action: 'Export tariff paperwork & border security screening',
          isCurrentHop: !isHighValue,
        });
      }

      hops.push({
        hop: hopNum++,
        department: physicalDept,
        bay: physicalBay,
        type: 'PHYSICAL_DISPATCH',
        status: (isHighValue || isNonEu) ? 'SCHEDULED_OUTBOUND' : 'READY_FOR_DISPATCH',
        reason: physicalReason,
        action: physicalAction,
        isCurrentHop: !isHighValue && !isNonEu,
      });

      baseHops = hops;
    }

    if (isCurrentParcelReleased || isAutoApproved) {
      const approverName = isCurrentParcelReleased ? releasedParcel.approvedBy : (result?.approvedBy || user?.name || 'Supervisor');
      return baseHops.map((hop, idx) => {
        if (hop.department === 'Insurance') {
          return {
            ...hop,
            status: 'CLEARED',
            isCurrentHop: false,
            reason: `Liability clearance authorized by Supervisor ${approverName}`,
            action: isCurrentParcelReleased
              ? `Escrow released -> Transfer to ${releasedParcel.releasedDepartment} (${releasedParcel.releasedBay})`
              : `Direct clearance -> Conveyor diverter to ${baseHops.find((h) => h.department !== 'Insurance')?.department || 'Outbound'} bay`,
          };
        }
        if (idx === 1 || (idx === 0 && baseHops[0].department !== 'Insurance')) {
          return {
            ...hop,
            status: 'CURRENT_ACTIVE_HOP',
            isCurrentHop: true,
            action: `Active diverter destination: ${hop.bay}`,
          };
        }
        return hop;
      });
    }

    return baseHops;
  };

  const routePlan = getRoutePlan();

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Single Parcel Dispatch Console
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time rule evaluation and automated department assignment
          </p>
        </div>

        {/* Quick Test Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Sample Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('mail')}
            className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition cursor-pointer"
          >
            Mail (0.25kg)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('regular')}
            className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition cursor-pointer"
          >
            Regular (3.5kg)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('heavy')}
            className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition cursor-pointer"
          >
            Heavy (22.5kg)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('insurance')}
            className="text-xs px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 font-medium border border-rose-200 transition cursor-pointer"
          >
            Insurance (€2,400)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('customs')}
            className="text-xs px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition cursor-pointer"
          >
            Customs (UK)
          </button>
          {releasedParcel && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  recipientName: releasedParcel.recipient || 'Customer',
                  weightKg: String(releasedParcel.weightKg || '1.0'),
                  valueEur: String(releasedParcel.valueEur || '1500.00'),
                  postalCode: '1012AB',
                  destinationCountry: releasedParcel.destinationCountry || 'NL',
                });
                setResult({
                  parcelId: releasedParcel.parcelId,
                  department: releasedParcel.releasedDepartment,
                  requiresApproval: false,
                  approvalStatus: 'APPROVED',
                  approvedBy: releasedParcel.approvedBy,
                  matchedRule: `${releasedParcel.releasedDepartment}Rule (Released)`,
                  evaluatedRules: ['InsuranceRule (Cleared)', `${releasedParcel.releasedDepartment}Rule`],
                });
              }}
              className="text-xs px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300 transition cursor-pointer flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Released ({releasedParcel.parcelId})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setFormData(DEFAULT_FORM_DATA);
              setResult(null);
              setErrorBanner('');
              sessionStorage.removeItem('tetrifox_single_form_data');
              sessionStorage.removeItem('tetrifox_single_result');
            }}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-medium transition cursor-pointer flex items-center gap-1 border border-slate-200"
            title="Reset form to default values"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="my-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Validation Notice</p>
            <p className="text-xs text-red-700 mt-0.5">{errorBanner}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Recipient Name
            </label>
            <input
              type="text"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              placeholder="e.g. Jan de Vries"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.weightKg}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              placeholder="e.g. 0.45"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Declared Value (€)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.valueEur}
              onChange={(e) => setFormData({ ...formData, valueEur: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              placeholder="e.g. 25.00"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              placeholder="e.g. 1012AB"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Destination Country
            </label>
            <select
              value={formData.destinationCountry}
              onChange={(e) => setFormData({ ...formData, destinationCountry: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            >
              <optgroup label="EU Member States (Internal Clearance)">
                <option value="NL">Netherlands (NL)</option>
                <option value="DE">Germany (DE)</option>
                <option value="FR">France (FR)</option>
                <option value="BE">Belgium (BE)</option>
                <option value="ES">Spain (ES)</option>
                <option value="IT">Italy (IT)</option>
                <option value="AT">Austria (AT)</option>
                <option value="PL">Poland (PL)</option>
                <option value="SE">Sweden (SE)</option>
                <option value="IE">Ireland (IE)</option>
              </optgroup>
              <optgroup label="Non-EU International (Triggers Customs Gate)">
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (GB)</option>
                <option value="CN">China (CN)</option>
                <option value="JP">Japan (JP)</option>
                <option value="CA">Canada (CA)</option>
                <option value="AU">Australia (AU)</option>
                <option value="IN">India (IN)</option>
                <option value="CH">Switzerland (CH)</option>
                <option value="SG">Singapore (SG)</option>
                <option value="BR">Brazil (BR)</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-6 rounded-full text-white font-medium text-sm transition shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              style={{ background: 'linear-gradient(to bottom, #3a3a3a, #111111)' }}
            >
              {loading ? 'Evaluating Engine...' : 'Evaluate Route'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Visual Complete Multi-Hop Routing Itinerary */}
      <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Complete Multi-Hop Route Itinerary ({routePlan.length} Stages)
            </span>
            <p className="text-[11px] text-slate-500">
              End-to-end physical journey from warehouse ingestion to final outbound carrier loading
            </p>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-slate-900 text-white font-bold self-start sm:self-auto shadow-xs">
            Immediate Diverter Target:{' '}
            {isCurrentParcelReleased
              ? releasedParcel.releasedDepartment
              : result
              ? result.approvalStatus === 'APPROVED' && result.department === 'Insurance'
                ? routePlan.find((h) => h.department !== 'Insurance')?.department || 'Regular'
                : result.department
              : routePlan[0]?.department}
          </span>
        </div>

        {/* Multi-Hop Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {routePlan.map((hop, idx) => {
            const isApproved = (result?.approvalStatus === 'APPROVED' || isCurrentParcelReleased) && hop.department === 'Insurance';
            const isHold = !isApproved && hop.status === 'CURRENT_HOLD';
            const isActive = !isHold && !isApproved && (hop.isCurrentHop || hop.status === 'CURRENT_ACTIVE_HOP' || hop.status === 'READY_FOR_DISPATCH');

            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all relative ${
                  isHold
                    ? 'bg-rose-50/70 border-rose-300 text-rose-950 shadow-xs'
                    : isApproved
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-xs'
                    : isActive
                    ? 'bg-slate-900 text-white shadow-sm border-slate-900'
                    : 'bg-slate-50/80 border-slate-200 text-slate-600'
                }`}
              >
                {/* Stage Header */}
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-current/10">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                      <span>Hop {hop.hop || idx + 1}</span>
                      <span>•</span>
                      <span>
                        {hop.department === 'Insurance'
                          ? 'Compliance'
                          : hop.department === 'Customs'
                          ? 'Border Law'
                          : 'Transport Fleet'}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isHold
                          ? 'bg-rose-200 text-rose-900 border border-rose-400'
                          : isApproved
                          ? 'bg-emerald-200 text-emerald-900 border border-emerald-400'
                          : isActive
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isHold
                        ? 'Immediate Stop'
                        : isApproved
                        ? 'Cleared'
                        : isActive
                        ? 'Active Target'
                        : 'Next Hop'}
                    </span>
                  </div>

                  {/* Department & Bay */}
                  <div className="flex items-start gap-2.5 mb-2">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isActive ? 'bg-white/10 text-white' : 'bg-slate-200/70 text-slate-800'
                      }`}
                    >
                      {hop.department === 'Insurance' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                      ) : hop.department === 'Customs' ? (
                        <Globe className="w-4 h-4 text-slate-700" />
                      ) : hop.department === 'Heavy' ? (
                        <Truck className="w-4 h-4 text-slate-700" />
                      ) : hop.department === 'Mail' ? (
                        <Mail className="w-4 h-4 text-slate-700" />
                      ) : (
                        <Package className="w-4 h-4 text-slate-700" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold tracking-tight">
                        {hop.department} Department
                      </h4>
                      <p className={`text-[11px] font-mono ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {hop.bay}
                      </p>
                    </div>
                  </div>

                  {/* Why this hop */}
                  <p className={`text-[11px] mb-2 leading-relaxed ${isActive ? 'text-slate-200' : 'opacity-85'}`}>
                    {hop.reason}
                  </p>
                </div>

                {/* Action Required Footer */}
                <div
                  className={`pt-2 border-t border-current/10 text-[10px] font-medium flex items-center justify-between ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <span className="line-clamp-1">{hop.action}</span>
                  {idx < routePlan.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60 ml-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supervisor Vault Release Floor Order Banner */}
      {isCurrentParcelReleased && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Supervisor Vault Release Order Authorized
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                Lock Disengaged
              </span>
            </div>
            <p className="text-xs text-emerald-900 font-bold mt-1">
              {releasedParcel.dispatchOrder}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Liability clearance verified by Supervisor {releasedParcel.approvedBy}. Operator may retrieve parcel from Vault S-01 and transport to {releasedParcel.releasedBay}.
            </p>
          </div>
        </div>
      )}

      {/* Supervisor Direct Intake Clearance Banner */}
      {isAutoApproved && !isCurrentParcelReleased && (
        <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Supervisor Direct Clearance Authorized
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold">
                Auto-Cleared
              </span>
            </div>
            <p className="text-xs text-emerald-900 font-bold mt-1">
              High-value consignment (€{parsedValue.toFixed(2)}) automatically cleared by Supervisor {result.approvedBy || user?.name || 'Supervisor'}.
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Immediate clearance granted on intake. Physical diverter routed directly to outbound bay without vault hold.
            </p>
          </div>
        </div>
      )}

      {/* Decision Summary Card */}
      {result && (
        <div className="mt-6 p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Routing Outcome:
              </span>
              <DepartmentBadge
                department={
                  isCurrentParcelReleased
                    ? releasedParcel.releasedDepartment
                    : isAutoApproved
                    ? routePlan.find((h) => h.department !== 'Insurance')?.department || 'Regular'
                    : result.department
                }
                requiresApproval={isCurrentParcelReleased || isAutoApproved ? false : result.requiresApproval}
              />
            </div>

            {isCurrentParcelReleased ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pre-Approved & Released by {releasedParcel.approvedBy}
              </span>
            ) : isAutoApproved ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Direct Clearance by {result.approvedBy || 'Supervisor'}
              </span>
            ) : result.approvalStatus === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pre-Approved by {result.approvedBy || 'Supervisor'}
              </span>
            ) : result.requiresApproval ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Held in Insurance Queue for Supervisor Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-white border border-slate-200">
                Standard Automated Clearance
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Matched Rule Strategy:
              </span>
              <p className="font-mono text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                {isCurrentParcelReleased ? `${releasedParcel.releasedDepartment}Rule (Released)` : result.matchedRule}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Assigned Logistics Bay:
              </span>
              <p className="font-mono text-slate-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                {isCurrentParcelReleased
                  ? releasedParcel.releasedBay
                  : isAutoApproved
                  ? routePlan.find((h) => h.department !== 'Insurance')?.bay || 'Bay R-03 (Standard Conveyor)'
                  : result.department === 'Mail'
                  ? 'Bay M-01 (Letters & Flats)'
                  : result.department === 'Regular'
                  ? 'Bay R-03 (Standard Conveyor)'
                  : result.department === 'Heavy'
                  ? 'Bay H-02 (Pallet Freight)'
                  : result.department === 'Insurance'
                  ? 'Bay S-01 (Secure Vault Escrow)'
                  : 'Bay C-01 (Customs Hold)'}
              </p>
            </div>

            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Evaluation Chain Order:
              </span>
              <p className="font-mono text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 overflow-x-auto whitespace-nowrap">
                {result.evaluatedRules?.join(' -> ') || result.matchedRule}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
