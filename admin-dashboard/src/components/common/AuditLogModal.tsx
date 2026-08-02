import React from 'react';
import { useAuditLogs } from '../../hooks/api';
import { X, ShieldAlert, FileText, CheckCircle2, Clock } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const { data: _auditLogs } = useAuditLogs();
  const auditLogs = _auditLogs || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>System Security & Audit Trail</span>
                <span className="text-xs font-mono font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {auditLogs.length} Events Logged
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time immutable log of state modifications, permissions, and financial transactions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {auditLogs.map((log) => {
            const isSecurity = log.severity === 'Security';
            const isWarning = log.severity === 'Warning';

            return (
              <div
                key={log.id}
                className={`p-4 rounded-xl border text-xs transition-all ${
                  isSecurity
                    ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {isSecurity ? (
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                    ) : isWarning ? (
                      <Clock className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span className="font-bold text-white text-sm">{log.action}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-mono font-bold tracking-wider ${
                        isSecurity
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {log.timestamp}
                  </span>
                </div>

                <p className="text-slate-300 mb-2 leading-relaxed">{log.details}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
                  <span>Actor: <strong className="text-slate-200">{log.performedBy}</strong> ({log.role})</span>
                  <span>IP: <span className="text-indigo-400">{log.ipAddress}</span></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Compliant with ISO/IEC 27001 Security Audit Specifications</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition"
          >
            Close Audit Log
          </button>
        </div>

      </div>
    </div>
  );
};
