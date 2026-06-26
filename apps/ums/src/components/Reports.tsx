/* eslint-disable */
/* eslint-disable */

import React, { useState, useMemo } from 'react';
import { 
  FileBarChart, 
  TrendingUp, 
  Users, 
  Wallet, 
  Calendar, 
  Download, 
  Filter, 
  Target, 
  ChevronRight, 
  Award, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Activity, 
  Zap, 
  Bot, 
  Loader2, 
  ShieldCheck,
  Printer,
  Maximize2,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  CartesianGrid,
  Legend
} from 'recharts';
import { getAIResponse } from '../services/aiService';

const Reports: React.FC = () => {
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [activeRange, setActiveRange] = useState('Fiscal Year 2024');

  const enrollmentData = [
    { name: 'Theology', val: 450, growth: 12, faculty: 15 },
    { name: 'ICT', val: 890, growth: 28, faculty: 22 },
    { name: 'Business', val: 1200, growth: 5, faculty: 30 },
    { name: 'Education', val: 1007, growth: 18, faculty: 25 },
  ];

  const financialTrend = [
    { month: 'Jan', revenue: 120000, expenses: 95000 },
    { month: 'Feb', revenue: 145000, expenses: 102000 },
    { month: 'Mar', revenue: 210000, expenses: 140000 },
    { month: 'Apr', revenue: 190000, expenses: 135000 },
    { month: 'May', revenue: 250000, expenses: 180000 },
    { month: 'Jun', revenue: 389000, expenses: 210000 },
  ];

  const departmentalAllocation = [
    { name: 'Academic Faculty', value: 45, color: '#4B0082' },
    { name: 'Infrastructure', value: 25, color: '#FFD700' },
    { name: 'Research', value: 20, color: '#10B981' },
    { name: 'Admin', value: 10, color: '#EF4444' },
  ];

  const handleGenerateReport = async () => {
    setIsGeneratingAiReport(true);
    const prompt = `Generate a brief executive summary of the university's performance for ${activeRange}.
    Data:
    - Enrollment: Theology (450), ICT (890), Business (1200), Education (1007).
    - Financials: Steady growth from Jan ($120k) to Jun ($389k).
    - Resource Allocation: 45% Academic, 25% Infrastructure.
    Highlight key growth areas and suggest one strategic improvement.`;
    
    try {
        const response = await getAIResponse(prompt, 'Institutional Data Analyst');
        setAiReport(response);
    } catch (error) {
        setAiReport("Analysis generation failed. Please check network connectivity.");
    }
    setIsGeneratingAiReport(false);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Sticky Header */}
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex justify-between items-center shadow-sm min-h-[60px]">
         <div className="flex items-center gap-3 pl-14 w-full">
            <div className="w-1 h-5 bg-[#FFD700] rounded-none"></div>
            <div>
               <h2 className="text-base md:text-lg font-bold text-[#2E004F] dark:text-white uppercase leading-none">Institutional Analytics</h2>
               <p className="text-[8px] md:text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Performance & Fiscal Intelligence</p>
            </div>
         </div>
      </div>

      {/* Sticky Top Tab Bar */}
      <div className="sticky top-[60px] z-30 bg-[#F8F9FA]/95 dark:bg-[#0a0015]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
         <div className="flex items-center gap-2 mr-4 text-gray-400">
            <Clock size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">Analysis Period</span>
         </div>
         {['Fiscal Year 2024', 'Q1 Performance', 'Q2 Performance', 'Academic Cycle A', 'Admissions Intake'].map((range) => (
            <button
              key={range}
              onClick={() => setActiveRange(range)}
              className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeRange === range 
                  ? 'bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50' 
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]'
              }`}
            >
              {range}
            </button>
         ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
         {/* AI Section */}
         <div className="bg-gradient-to-r from-[#4B0082] to-[#320064] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Bot size={120} /></div>
            <div className="relative z-10">
               <h3 className="text-lg font-black uppercase tracking-tight mb-2 flex items-center gap-2">
                  <Sparkles size={18} className="text-[#FFD700]" /> AI Executive Summary
               </h3>
               {aiReport ? (
                  <div className="bg-white/10 p-6 rounded-none backdrop-blur-sm border border-white/20 text-sm leading-relaxed font-medium">
                     {aiReport}
                  </div>
               ) : (
                  <p className="text-xs text-purple-200 max-w-xl mb-6">Generate a comprehensive natural language report based on real-time enrollment, financial, and departmental data matrices.</p>
               )}
               {!aiReport && (
                   <button 
                     onClick={handleGenerateReport}
                     disabled={isGeneratingAiReport}
                     className="mt-4 px-6 py-3 bg-[#FFD700] text-[#4B0082] font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                   >
                      {isGeneratingAiReport ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      Generate Report
                   </button>
               )}
            </div>
         </div>

         {/* Charts Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Financial */}
            <div className="bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] flex flex-col">
               <h4 className="text-xs font-black uppercase text-gray-500 mb-6 flex items-center gap-2"><Wallet size={14}/> Revenue vs Expenses</h4>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={financialTrend}>
                        <defs>
                           <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4B0082" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4B0082" stopOpacity={0}/>
                           </linearGradient>
                           <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#4B0082" fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="expenses" stroke="#EF4444" fillOpacity={1} fill="url(#colorExp)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Enrollment */}
            <div className="bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] flex flex-col">
               <h4 className="text-xs font-black uppercase text-gray-500 mb-6 flex items-center gap-2"><Users size={14}/> Enrollment by Faculty</h4>
               <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={enrollmentData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="val" fill="#4B0082" barSize={20} radius={[0, 4, 4, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
         
         {/* Allocation Pie */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 h-[300px] flex flex-col">
                <h4 className="text-xs font-black uppercase text-gray-500 mb-6">Resource Allocation</h4>
                <div className="flex-1 w-full min-h-0">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={departmentalAllocation} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {departmentalAllocation.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Pie>
                         <Tooltip />
                         <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" iconSize={8} wrapperStyle={{fontSize: '10px', fontWeight: 'bold'}} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
             </div>
             
             {/* Key Metrics */}
             <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 border border-emerald-100 dark:border-emerald-800 flex flex-col justify-center">
                   <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">YoY Growth</p>
                   <p className="text-4xl font-black text-emerald-800 dark:text-emerald-400 mt-2">+12.4%</p>
                   <p className="text-xs font-bold text-emerald-600/60 mt-1">Surpassing Projection</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 border border-blue-100 dark:border-blue-800 flex flex-col justify-center">
                   <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Research Grants</p>
                   <p className="text-4xl font-black text-blue-800 dark:text-blue-400 mt-2">$2.1M</p>
                   <p className="text-xs font-bold text-blue-600/60 mt-1">Secured Fiscal 2024</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 border border-amber-100 dark:border-amber-800 flex flex-col justify-center">
                   <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Student Retention</p>
                   <p className="text-4xl font-black text-amber-800 dark:text-amber-400 mt-2">94.2%</p>
                   <p className="text-xs font-bold text-amber-600/60 mt-1">Above National Avg</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/10 p-6 border border-purple-100 dark:border-purple-800 flex flex-col justify-center">
                   <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Faculty Ratio</p>
                   <p className="text-4xl font-black text-purple-800 dark:text-purple-400 mt-2">1:18</p>
                   <p className="text-xs font-bold text-purple-600/60 mt-1">Optimal Academic Density</p>
                </div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Reports;









