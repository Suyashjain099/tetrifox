import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Download,
  X,
  Package,
  Layers,
  Calendar,
  Weight,
  DollarSign,
} from 'lucide-react';
import { DepartmentBadge } from './DepartmentBadge';

export const BatchUploadPanel = ({ apiKey, token, user, onOpenLogin }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorBanner, setErrorBanner] = useState('');
  const [batchData, setBatchData] = useState(() => {
    try {
      const cached = sessionStorage.getItem('tetrifox_batch_data');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return null;
  });

  // Persist batch manifest results across reloads
  useEffect(() => {
    try {
      if (batchData) {
        sessionStorage.setItem('tetrifox_batch_data', JSON.stringify(batchData));
      } else {
        sessionStorage.removeItem('tetrifox_batch_data');
      }
    } catch (e) {}
  }, [batchData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [inspectedParcel, setInspectedParcel] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    setErrorBanner('');
    if (!token) {
      setErrorBanner('Authentication Required: Please sign in as an Operator or Supervisor to upload batch manifests.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'xml' && ext !== 'json') {
      setErrorBanner('Unsupported file format. Please upload a .xml or .json manifest file.');
      return;
    }

    setLoading(true);
    setProgress(30);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setProgress(60);
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['X-API-Key'] = apiKey;
      }

      const res = await fetch('/api/v1/route/batch', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Batch upload failed');
      }

      setProgress(100);
      setBatchData(data);
      setSelectedCategory('ALL');
    } catch (err) {
      setErrorBanner(err.message || 'Error processing batch upload');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleXml = async () => {
    setErrorBanner('');
    if (!token) {
      setErrorBanner('Authentication Required: Please sign in as an Operator or Supervisor to evaluate manifests.');
      if (onOpenLogin) onOpenLogin();
      return;
    }

    try {
      setLoading(true);
      setProgress(20);
      const response = await fetch('/Container_68465468.xml');
      if (!response.ok) {
        throw new Error('Failed to load sample Container_68465468.xml');
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], 'Container_68465468.xml', { type: 'application/xml' });
      await handleFile(sampleFile);
    } catch (err) {
      setErrorBanner(err.message || 'Failed to trigger sample manifest');
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!batchData || !batchData.results) return;
    const manifestBlob = new Blob([JSON.stringify(batchData, null, 2)], {
      type: 'application/json',
    });
    const downloadUrl = URL.createObjectURL(manifestBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = downloadUrl;
    downloadAnchor.download = `Dispatched-Manifest-${batchData.batchId || 'output'}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const resultsList = batchData?.results || [];
  const filteredResults = resultsList.filter((item) => {
    const matchesCategory =
      selectedCategory === 'ALL'
        ? true
        : selectedCategory === 'HELD'
        ? item.requiresApproval
        : item.department === selectedCategory;

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      item.parcelId?.toLowerCase().includes(term) ||
      item.recipient?.name?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term);

    return matchesCategory && matchesSearch;
  });

  const totalGrossWeight = resultsList.reduce((acc, p) => acc + (p.weightKg || 0), 0);
  const totalValuation = resultsList.reduce((acc, p) => acc + (p.valueEur || 0), 0);
  const totalHeldCount = resultsList.filter((p) => p.requiresApproval).length;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 text-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Batch Container Manifest Ingestion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Universal logistics manifest parser for legacy XML containers and JSON manifests
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {batchData && (
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export JSON Manifest</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLoadSampleXml}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-700" />
            <span>Load Assessment XML (Container_68465468)</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="my-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Batch Ingestion Notice</p>
            <p className="text-xs text-red-700 mt-0.5">{errorBanner}</p>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-6 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
          dragActive
            ? 'border-slate-900 bg-slate-100'
            : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-100/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.json"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />
        <UploadCloud className="w-10 h-10 mx-auto text-slate-700 mb-2.5" />
        <p className="text-sm font-bold text-slate-900 mb-1">Click to browse or Drag & Drop Manifest</p>
        <p className="text-xs text-slate-500">Supports Container XML specifications (Container_68465468.xml) and batch JSON</p>
      </div>

      {/* Progress Bar */}
      {loading && (
        <div className="mt-5">
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span>Parsing Container & Evaluating Routing Matrix...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-slate-900 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch Statistics & Outcome */}
      {batchData && (
        <div className="mt-8 space-y-6">
          {/* Container Metadata Card */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Container Manifest Record:
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300">
                  {batchData.summary.containerId ? `#${batchData.summary.containerId}` : batchData.summary.filename}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date: 2016-07-22</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold">
                  Format: {batchData.summary.fileType}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5">Total Parcels:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">{resultsList.length}</p>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Gross Weight:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">{totalGrossWeight.toFixed(2)} kg</p>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Total Declared Value:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">€{totalValuation.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Held for Review:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {totalHeldCount > 0 ? (
                    <span className="text-rose-700 font-bold">{totalHeldCount} Parcels</span>
                  ) : (
                    <span>0 Parcels</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Department Filter Chips & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                All ({resultsList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('Mail')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === 'Mail'
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Mail ({batchData.summary.routedCounts.Mail || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('Regular')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === 'Regular'
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Regular ({batchData.summary.routedCounts.Regular || 0})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('Heavy')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === 'Heavy'
                    ? 'bg-[#111111] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                Heavy ({batchData.summary.routedCounts.Heavy || 0})
              </button>
              {totalHeldCount > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('HELD')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    selectedCategory === 'HELD'
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-300'
                  }`}
                >
                  Held ({totalHeldCount})
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search parcels in manifest..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-200 font-bold">
                <tr>
                  <th className="p-3">Parcel ID</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Weight (kg)</th>
                  <th className="p-3">Value (€)</th>
                  <th className="p-3">Assigned Department</th>
                  <th className="p-3">Rule Strategy</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredResults.map((item, idx) => (
                  <tr
                    key={idx}
                    onClick={() => setInspectedParcel(item)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="p-3 font-mono font-semibold text-slate-900">{item.parcelId}</td>
                    <td className="p-3 font-medium text-slate-800">{item.recipient?.name || 'Unknown'}</td>
                    <td className="p-3 text-slate-600">{item.weightKg} kg</td>
                    <td className="p-3 text-slate-600">€{item.valueEur}</td>
                    <td className="p-3">
                      <DepartmentBadge department={item.department} requiresApproval={item.requiresApproval} />
                    </td>
                    <td className="p-3 font-mono text-slate-700 font-medium">{item.matchedRule}</td>
                    <td className="p-3 text-right text-slate-400 hover:text-slate-900 font-semibold">
                      View →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Parcel Detail Inspector Modal */}
      {inspectedParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 relative border border-slate-200 shadow-2xl text-slate-900 animate-in fade-in duration-150">
            <button
              onClick={() => setInspectedParcel(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5 pb-3 border-b border-slate-200">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                Logistics Dispatch Waybill
              </span>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-700" />
                <span>Parcel {inspectedParcel.parcelId}</span>
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Recipient & Address Details
                </span>
                <p className="font-semibold text-slate-900 text-sm">
                  {inspectedParcel.recipient?.name || 'Unknown'}
                </p>
                <p className="text-slate-600 mt-0.5">
                  {inspectedParcel.recipient?.street && `${inspectedParcel.recipient.street} ${inspectedParcel.recipient.houseNumber}, `}
                  {inspectedParcel.recipient?.city && `${inspectedParcel.recipient.city}, `}
                  {inspectedParcel.postalCode && `${inspectedParcel.postalCode} `}
                  ({inspectedParcel.destinationCountry || 'NL'})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Physical Metrics
                  </span>
                  <p className="font-mono text-slate-900 font-bold">
                    {inspectedParcel.weightKg} kg | €{inspectedParcel.valueEur}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Assigned Bay
                  </span>
                  <p className="font-mono text-slate-900 font-bold">
                    {inspectedParcel.department === 'Mail'
                      ? 'Bay M-01 (Letters)'
                      : inspectedParcel.department === 'Regular'
                      ? 'Bay R-03 (Conveyor)'
                      : inspectedParcel.department === 'Heavy'
                      ? 'Bay H-02 (Pallets)'
                      : 'Bay S-01 (Escrow)'}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Rule Evaluation Trace
                </span>
                <p className="font-mono text-slate-700">
                  {inspectedParcel.evaluatedRules?.join(' -> ') || inspectedParcel.matchedRule}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedParcel(null)}
                className="px-4 py-2 rounded-full bg-slate-900 text-white font-medium text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
