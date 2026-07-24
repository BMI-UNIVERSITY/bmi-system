/**
 * KIRO: DO NOT MODIFY
 * This file contains stable production logic.
 * Do not edit unless explicitly instructed.
 * 
 * Verification Dashboard Component
 * Administrative interface for certificate verification management
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Download,
  Search,
  
  
  
  Globe,
  Smartphone,
  Clock,
  MapPin
} from 'lucide-react';

interface VerificationStats {
  total_verifications: number;
  today: number;
  this_month: number;
  success_rate: number;
  unique_verifiers: number;
  certificates: {
    total_issued: number;
    active: number;
    revoked: number;
    suspended: number;
  };
  by_faculty: Record<string, number>;
  by_method: {
    online: number;
    offline: number;
    qr_scan: number;
  };
}

interface VerificationLog {
  id: string;
  certificate_serial: string;
  student_name: string;
  verification_result: 'valid' | 'invalid' | 'revoked';
  method: 'online' | 'offline' | 'qr_scan';
  timestamp: string;
  ip_address: string;
  location?: string;
  user_agent: string;
}

const VerificationDashboard: React.FC = () => {
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [logs, setLogs] = useState<VerificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterResult, setFilterResult] = useState('all');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For demo, we'll use mock data
      
      const mockStats: VerificationStats = {
        total_verifications: 15420,
        today: 45,
        this_month: 1200,
        success_rate: 94.2,
        unique_verifiers: 890,
        certificates: {
          total_issued: 1250,
          active: 1200,
          revoked: 45,
          suspended: 5
        },
        by_faculty: {
          'Theology': 650,
          'ICT': 300,
          'Business': 200,
          'Education': 100
        },
        by_method: {
          online: 8500,
          offline: 4200,
          qr_scan: 2720
        }
      };

      const mockLogs: VerificationLog[] = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i + 1}`,
        certificate_serial: `BMI-${2024 - Math.floor(i / 20)}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
        student_name: ['James Smith', 'Mary Johnson', 'John Williams', 'Patricia Jones', 'Robert Brown'][i % 5],
        verification_result: (['valid', 'valid', 'valid', 'invalid', 'revoked'][Math.floor(Math.random() * 5)] as 'valid' | 'invalid' | 'revoked'),
        method: (['online', 'offline', 'qr_scan'][Math.floor(Math.random() * 3)] as 'online' | 'offline' | 'qr_scan'),
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        location: ['Nairobi, Kenya', 'Mombasa, Kenya', 'Kisumu, Kenya', 'Eldoret, Kenya'][Math.floor(Math.random() * 4)],
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }));

      setStats(mockStats);
      setLogs(mockLogs);
    } catch (error) { // eslint-disable-next-line no-console
      console.error('Error loading dashboard data:', error);
     } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.certificate_serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || log.method === filterMethod;
    const matchesResult = filterResult === 'all' || log.verification_result === filterResult;
    
    return matchesSearch && matchesMethod && matchesResult;
  });

  const getResultColor = (result: string) => {
    switch (result) {
      case 'valid': return 'text-emerald-600 bg-emerald-50';
      case 'invalid': return 'text-red-600 bg-red-50';
      case 'revoked': return 'text-amber-600 bg-amber-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'online': return <Globe size={16} />;
      case 'offline': return <Smartphone size={16} />;
      case 'qr_scan': return <Eye size={16} />;
      default: return <Shield size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification Dashboard</h1>
        <p className="text-gray-600">Monitor certificate verification activity and system performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_verifications.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
            <span className="text-emerald-600 font-medium">+12.5%</span>
            <span className="text-gray-500 ml-1">from last month</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.success_rate}%</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
            <span className="text-emerald-600 font-medium">+2.1%</span>
            <span className="text-gray-500 ml-1">from last week</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.today}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Peak: 2:00 PM - 4:00 PM</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Verifiers</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.unique_verifiers}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">Avg: 3.2 verifications/user</span>
          </div>
        </div>
      </div>
      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Verification Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Methods</h3>
          <div className="space-y-4">
            {stats && Object.entries(stats.by_method).map(([method, count]) => {
              const total = Object.values(stats.by_method).reduce((a: number, b: number) => a + b, 0);
              const percentage = (((count as number) / (total as number)) * 100).toFixed(1);
              
              return (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getMethodIcon(method)}
                    <span className="font-medium capitalize">{method.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#4B0082] h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Faculty Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificates by Faculty</h3>
          <div className="space-y-4">
            {stats && Object.entries(stats.by_faculty).map(([faculty, count]) => {
              const total = Object.values(stats.by_faculty).reduce((a: number, b: number) => a + b, 0);
              const percentage = (((count as number) / (total as number)) * 100).toFixed(1);
              
              return (
                <div key={faculty} className="flex items-center justify-between">
                  <span className="font-medium">{faculty}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#FFD700] h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Certificate Status Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Certificate Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <div className="text-2xl font-bold text-emerald-600">{stats?.certificates.active}</div>
            <div className="text-sm text-emerald-700">Active</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats?.certificates.revoked}</div>
            <div className="text-sm text-red-700">Revoked</div>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">{stats?.certificates.suspended}</div>
            <div className="text-sm text-amber-700">Suspended</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats?.certificates.total_issued}</div>
            <div className="text-sm text-blue-700">Total Issued</div>
          </div>
        </div>
      </div>

      {/* Verification Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Verification Activity</h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search certificates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B0082] focus:border-transparent text-sm"
                />
              </div>

              {/* Filters */}
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B0082] focus:border-transparent text-sm"
              >
                <option value="all">All Methods</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="qr_scan">QR Scan</option>
              </select>

              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4B0082] focus:border-transparent text-sm"
              >
                <option value="all">All Results</option>
                <option value="valid">Valid</option>
                <option value="invalid">Invalid</option>
                <option value="revoked">Revoked</option>
              </select>

              <button className="px-4 py-2 bg-[#4B0082] text-white rounded-lg hover:bg-purple-700 transition-all flex items-center gap-2 text-sm">
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Certificate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.slice(0, 20).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.certificate_serial}</div>
                    <div className="text-sm text-gray-500">{log.ip_address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{log.student_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getResultColor(log.verification_result)}`}>
                      {log.verification_result === 'valid' && <CheckCircle2 size={12} className="mr-1" />}
                      {log.verification_result === 'invalid' && <XCircle size={12} className="mr-1" />}
                      {log.verification_result === 'revoked' && <AlertTriangle size={12} className="mr-1" />}
                      {log.verification_result.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      {getMethodIcon(log.method)}
                      <span className="capitalize">{log.method.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin size={12} />
                      {log.location || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No verification logs found matching your criteria</p>
          </div>
        )}

        {filteredLogs.length > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Showing 20 of {filteredLogs.length} results
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationDashboard;








