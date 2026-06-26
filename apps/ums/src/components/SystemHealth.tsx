/* eslint-disable */
/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Database, 
  Brain, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  History,
  Cpu,
  MemoryStick as Memory,
  Network
} from 'lucide-react';
import { authFetch } from '../services/authService';

interface DiagnosticData {
  summary: {
    total_requests: number;
    error_count: number;
    error_rate: string;
    avg_latency_ms: number;
    last_100_avg_latency_ms: number;
    method_distribution: Record<string, number>;
    status_distribution: Record<number, number>;
    uptime_seconds: number;
  };
  recent_requests: Array<{
    timestamp: number;
    duration: number;
    method: string;
    path: string;
    status: number;
  }>;
  internal: {
    pool: any;
    performance: any;
    cache: any;
  };
  system: {
    platform: string;
    arch: string;
    node_version: string;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
  };
}

const SystemHealth: React.FC = () => {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const response = await authFetch('/api/v1/health/diagnostics');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch diagnostics');
      }
    } catch (error) { setError('Network error fetching diagnostics');
     } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4B0082]"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Diagnostic Error</h2>
        <p className="text-gray-600">{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchHealth(); }}
          className="mt-4 px-6 py-2 bg-[#4B0082] text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex justify-between items-end border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#2E004F] uppercase tracking-tight">System Diagnostics</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Real-time Node.js & Infrastructure Monitoring</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live Telemetry
          </div>
          <p className="text-[10px] text-gray-400 font-mono mt-1">Refreshes every 5s</p>
        </div>
      </div>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Requests</p>
            <p className="text-xl font-black text-gray-900">{data?.summary.total_requests.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Latency</p>
            <p className="text-xl font-black text-gray-900">{data?.summary.avg_latency_ms}ms</p>
          </div>
        </div>
        <div className="bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${parseFloat(data?.summary.error_rate || '0') > 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Error Rate</p>
            <p className="text-xl font-black text-gray-900">{data?.summary.error_rate}</p>
          </div>
        </div>
        <div className="bg-white p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Network size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Uptime</p>
            <p className="text-xs font-black text-gray-900">{formatUptime(data?.summary.uptime_seconds || 0)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Info & Resources */}
        <div className="space-y-6">
          <div className="bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
              <Server size={14} className="text-purple-600" /> Runtime Environment
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Platform</span>
                <span className="font-mono text-gray-900">{data?.system.platform} ({data?.system.arch})</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Node Version</span>
                <span className="font-mono text-gray-900">{data?.system.node_version}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Memory RSS</span>
                <span className="font-mono text-gray-900">{formatBytes(data?.system.memory.rss || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Heap Used</span>
                <span className="font-mono text-gray-900">{formatBytes(data?.system.memory.heapUsed || 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
              <Database size={14} className="text-amber-600" /> Database Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Total Records (Optimized)</span>
                <span className="font-mono text-gray-900">{data?.internal.performance.total_records}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Avg Query Time</span>
                <span className="font-mono text-gray-900">{data?.internal.performance.avg_query_time_ms}ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-bold uppercase tracking-tight">Cache Hit Rate</span>
                <span className="font-mono text-gray-900">{data?.internal.cache.hit_rate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Request History */}
        <div className="lg:col-span-2 bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-4 flex items-center gap-2">
            <History size={14} className="text-blue-600" /> Recent Request History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 font-black text-gray-400 uppercase tracking-tighter">Method</th>
                  <th className="pb-3 font-black text-gray-400 uppercase tracking-tighter">Path</th>
                  <th className="pb-3 font-black text-gray-400 uppercase tracking-tighter text-center">Status</th>
                  <th className="pb-3 font-black text-gray-400 uppercase tracking-tighter text-right">Latency</th>
                  <th className="pb-3 font-black text-gray-400 uppercase tracking-tighter text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.recent_requests.map((req, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        req.method === 'GET' ? 'bg-blue-50 text-blue-600' :
                        req.method === 'POST' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {req.method}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-gray-600 max-w-[200px] truncate">{req.path}</td>
                    <td className="py-3 text-center">
                      <span className={`font-bold ${req.status >= 400 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-gray-500">{req.duration}ms</td>
                    <td className="py-3 text-right text-gray-400">{new Date(req.timestamp).toLocaleTimeString([], { hour12: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;









