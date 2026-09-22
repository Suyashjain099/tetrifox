import React from 'react';
import { Mail, Package, ShieldAlert, Truck, Globe } from 'lucide-react';

export const DepartmentBadge = ({ department, requiresApproval, showApprovalBadge = true }) => {
  const getDeptStyle = () => {
    switch (department) {
      case 'Insurance':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-300 shadow-sm',
          icon: ShieldAlert,
        };
      case 'Heavy':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Truck,
        };
      case 'Mail':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Mail,
        };
      case 'Customs':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Globe,
        };
      case 'Regular':
      default:
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: Package,
        };
    }
  };

  const style = getDeptStyle();
  const Icon = style.icon;

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border tracking-wide uppercase ${style.bg}`}>
        <Icon className="w-3.5 h-3.5 text-slate-600" />
        <span>{department}</span>
      </span>
      {requiresApproval && showApprovalBadge && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          <span>Hold for Clearance</span>
        </span>
      )}
    </div>
  );
};
