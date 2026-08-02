import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useInvoices, useStudents } from '../../hooks/api';
import { exportToCsv, triggerPrint } from '../../utils/exportUtils';
import { 
  CreditCard, 
  DollarSign, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  X, 
  FileCheck2, 
  Award, 
  Receipt,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  PieChart,
  Users,
  FileText,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Send,
  Eye,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { FeeInvoice, PaymentTransaction } from '../../types';
import { 
  SecurityWatermark, 
  GuillochePattern, 
  MicrotextBorder, 
  SecuritySealBadge 
} from '../common/DocumentSecurityComponents';

type TabType = 'ledger' | 'holds' | 'transactions' | 'scholarships' | 'tariffs' | 'analytics';

interface TariffItem {
  id: string;
  career: string;
  program: string;
  tuitionFee: number;
  labFee: number;
  techFee: number;
  activityFee: number;
  effectiveTerm: string;
}

interface ScholarshipGrant {
  id: string;
  title: string;
  donorCategory: 'Government Bursary' | 'University Merit' | 'Corporate Endowment' | 'Need-Based Aid';
  annualBudget: number;
  disbursedAmount: number;
  activeRecipients: number;
  coveragePercent: number;
}

export const FinanceView: React.FC = () => {
  const { data: _invoices } = useInvoices();
  const invoices = _invoices || [];
  const { data: _students } = useStudents();
  const students = _students || [];
  const { toggleStudentHold, processInvoicePayment, createInvoice, applyScholarshipToInvoice } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('ledger');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [termFilter, setTermFilter] = useState<string>('ALL');
  const [careerFilter, setCareerFilter] = useState<string>('ALL');

  // Modal States
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showBatchInvoicing, setShowBatchInvoicing] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState<FeeInvoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<FeeInvoice | null>(null);
  const [scholarshipInvoice, setScholarshipInvoice] = useState<FeeInvoice | null>(null);
  const [showHoldReasonModal, setShowHoldReasonModal] = useState<{ studentId: string; studentName: string; currentHold: boolean } | null>(null);
  const [holdReason, setHoldReason] = useState('Outstanding Fall 2026 Tuition Balance Exceeds Threshold ($1,000)');

  // Single Invoice Form
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [invoiceTerm, setInvoiceTerm] = useState('Fall 2026');
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [lineItems, setLineItems] = useState<{ description: string; amount: number }[]>([
    { description: 'Tuition Fee (12-18 Credits)', amount: 3200 },
    { description: 'Technology & Lab Infrastructure Fee', amount: 450 },
    { description: 'Student Health & Wellness Levy', amount: 150 }
  ]);

  // Payment Reconcile Form
  const [reconcileAmount, setReconcileAmount] = useState<number>(0);
  const [reconcileMethod, setReconcileMethod] = useState<'Credit Card' | 'Bank Transfer' | 'Mobile Payment' | 'Scholarship Voucher'>('Bank Transfer');
  const [reconcileRef, setReconcileRef] = useState('');
  const [reconcileNote, setReconcileNote] = useState('');

  // Scholarship Modal Form
  const [scholarshipName, setScholarshipName] = useState('Presidential Merit Grant');
  const [scholarshipAmount, setScholarshipAmount] = useState(1500);

  // Batch Invoicing Form
  const [batchTerm, setBatchTerm] = useState('Fall 2026');
  const [batchCareer, setBatchCareer] = useState('UG');
  const [batchDueDate, setBatchDueDate] = useState('2026-09-30');
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Fee Schedule / Tariff State
  const [tariffs, setTariffs] = useState<TariffItem[]>([
    { id: 'tf-1', career: 'UG', program: 'B.Sc. Computer Science', tuitionFee: 3200, labFee: 450, techFee: 200, activityFee: 150, effectiveTerm: 'Fall 2026' },
    { id: 'tf-2', career: 'UG', program: 'B.Sc. Software Engineering', tuitionFee: 3200, labFee: 500, techFee: 200, activityFee: 150, effectiveTerm: 'Fall 2026' },
    { id: 'tf-3', career: 'PG', program: 'M.Sc. Data Analytics & AI', tuitionFee: 4500, labFee: 600, techFee: 250, activityFee: 150, effectiveTerm: 'Fall 2026' },
    { id: 'tf-4', career: 'DR', program: 'Ph.D. Computer Engineering', tuitionFee: 5200, labFee: 750, techFee: 300, activityFee: 150, effectiveTerm: 'Fall 2026' },
    { id: 'tf-5', career: 'CE', program: 'Certificate in Cybersecurity', tuitionFee: 1800, labFee: 300, techFee: 150, activityFee: 100, effectiveTerm: 'Fall 2026' }
  ]);

  // Scholarship Programs State
  const [scholarships, setScholarships] = useState<ScholarshipGrant[]>([
    { id: 'sch-1', title: 'Presidential Excellence Merit Scholarship', donorCategory: 'University Merit', annualBudget: 250000, disbursedAmount: 185000, activeRecipients: 32, coveragePercent: 100 },
    { id: 'sch-2', title: 'Chancellor STEM Diversity Fellowship', donorCategory: 'Corporate Endowment', annualBudget: 150000, disbursedAmount: 95000, activeRecipients: 18, coveragePercent: 75 },
    { id: 'sch-3', title: 'National Higher Education Bursary', donorCategory: 'Government Bursary', annualBudget: 400000, disbursedAmount: 310000, activeRecipients: 64, coveragePercent: 50 },
    { id: 'sch-4', title: 'BMI Opportunity & Need-Based Grant', donorCategory: 'Need-Based Aid', annualBudget: 180000, disbursedAmount: 120000, activeRecipients: 25, coveragePercent: 40 }
  ]);

  // Transaction Ledger (simulated + real-time synced)
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([
    { id: 'tx-8001', invoiceId: 'inv-101', studentId: 'st-1', amount: 3800, paymentMethod: 'Credit Card', transactionReference: 'TXN-2026-99218', timestamp: '2026-07-28 10:14', status: 'Successful' },
    { id: 'tx-8002', invoiceId: 'inv-102', studentId: 'st-2', amount: 1500, paymentMethod: 'Bank Transfer', transactionReference: 'WIRE-2026-44102', timestamp: '2026-07-27 15:30', status: 'Successful' },
    { id: 'tx-8003', invoiceId: 'inv-103', studentId: 'st-3', amount: 2000, paymentMethod: 'Scholarship Voucher', transactionReference: 'SCH-2026-00312', timestamp: '2026-07-26 11:05', status: 'Successful' },
    { id: 'tx-8004', invoiceId: 'inv-104', studentId: 'st-4', amount: 1200, paymentMethod: 'Mobile Payment', transactionReference: 'MOMO-882193', timestamp: '2026-07-25 14:22', status: 'Successful' }
  ]);

  // Financial KPIs Calculations
  const totalInvoiced = useMemo(() => invoices.reduce((acc, i) => acc + i.totalAmount, 0), [invoices]);
  const totalCollected = useMemo(() => invoices.reduce((acc, i) => acc + i.amountPaid, 0), [invoices]);
  const totalOutstanding = totalInvoiced - totalCollected;
  const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : '0.0';
  const totalScholarshipDisbursed = scholarships.reduce((acc, s) => acc + s.disbursedAmount, 0);
  const studentsOnHoldCount = students.filter(s => s.financialHold).length;

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const student = students.find(s => s.id === inv.studentId);
      const studentName = student ? `${student.firstName} ${student.lastName}`.toLowerCase() : '';
      const regNo = student?.registrationNumber?.toLowerCase() || '';
      const stuNum = student?.studentNumber?.toLowerCase() || '';
      const invNum = inv.invoiceNumber.toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = invNum.includes(query) || studentName.includes(query) || regNo.includes(query) || stuNum.includes(query);
      const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
      const matchesTerm = termFilter === 'ALL' || inv.term === termFilter;
      const matchesCareer = careerFilter === 'ALL' || (student && student.career === careerFilter);

      return matchesSearch && matchesStatus && matchesTerm && matchesCareer;
    });
  }, [invoices, students, searchQuery, statusFilter, termFilter, careerFilter]);

  // Form Handlers
  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updated = [...lineItems];
    if (field === 'description') {
      updated[index].description = value as string;
    } else {
      updated[index].amount = Number(value);
    }
    setLineItems(updated);
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    const totalAmt = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);

    createInvoice({
      studentId: selectedStudentId,
      term: invoiceTerm,
      dueDate: dueDate,
      items: lineItems.filter(i => i.description.trim() !== ''),
      totalAmount: totalAmt,
      scholarshipDiscount: 0
    });

    setShowCreateInvoice(false);
    // Reset form
    setLineItems([
      { description: 'Tuition Fee (12-18 Credits)', amount: 3200 },
      { description: 'Technology & Lab Infrastructure Fee', amount: 450 }
    ]);
  };

  const handleProcessReconciliation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal || reconcileAmount <= 0) return;

    processInvoicePayment(showPaymentModal.id, reconcileAmount, reconcileMethod);

    // Record transaction
    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      invoiceId: showPaymentModal.id,
      studentId: showPaymentModal.studentId,
      amount: reconcileAmount,
      paymentMethod: reconcileMethod,
      transactionReference: reconcileRef || `BURSAR-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Successful'
    };
    setTransactions([newTx, ...transactions]);

    setShowPaymentModal(null);
    setReconcileAmount(0);
    setReconcileRef('');
  };

  const handleApplyScholarshipSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scholarshipInvoice || scholarshipAmount <= 0) return;

    applyScholarshipToInvoice(scholarshipInvoice.id, scholarshipAmount);

    // Log transaction
    const newTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      invoiceId: scholarshipInvoice.id,
      studentId: scholarshipInvoice.studentId,
      amount: scholarshipAmount,
      paymentMethod: 'Scholarship Voucher',
      transactionReference: `GRANT-${scholarshipName.substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'Successful'
    };
    setTransactions([newTx, ...transactions]);

    setScholarshipInvoice(null);
  };

  const handleExecuteBatchInvoicing = () => {
    const targetStudents = students.filter(s => batchCareer === 'ALL' || s.career === batchCareer);
    if (targetStudents.length === 0) return;

    let count = 0;
    targetStudents.forEach(std => {
      // Find matching tariff or default
      const tariff = tariffs.find(t => t.career === std.career) || tariffs[0];
      const totalAmt = tariff.tuitionFee + tariff.labFee + tariff.techFee + tariff.activityFee;

      createInvoice({
        studentId: std.id,
        term: batchTerm,
        dueDate: batchDueDate,
        items: [
          { description: `${batchTerm} ${std.career} Academic Tuition Fee`, amount: tariff.tuitionFee },
          { description: `Laboratory & Specialized Software License Levy`, amount: tariff.labFee },
          { description: `Campus Computing & High-Speed Network Infra`, amount: tariff.techFee },
          { description: `Student Government & Athletic Association Fee`, amount: tariff.activityFee }
        ],
        totalAmount: totalAmt,
        scholarshipDiscount: 0
      });
      count++;
    });

    setBatchSuccessMessage(`Successfully issued ${count} tuition invoices for ${batchTerm} (${batchCareer} cohort)!`);
    setTimeout(() => {
      setShowBatchInvoicing(false);
      setBatchSuccessMessage(null);
    }, 2000);
  };

  const handleConfirmToggleHold = () => {
    if (!showHoldReasonModal) return;
    toggleStudentHold(showHoldReasonModal.studentId, 'financial', !showHoldReasonModal.currentHold);
    setShowHoldReasonModal(null);
  };

  const handleExportLedgerCsv = () => {
    const headers = ['Invoice ID', 'Student ID', 'Student Name', 'Semester', 'Total Amount ($)', 'Amount Paid ($)', 'Balance Due ($)', 'Status', 'Due Date'];
    const rows = invoices.map(inv => {
      const std = students.find(s => s.id === inv.studentId);
      const total = inv.totalAmount ?? 0;
      const paid = inv.amountPaid ?? 0;
      return [
        inv.id,
        std?.studentNumber || inv.studentId,
        std ? `${std.firstName} ${std.lastName}` : 'N/A',
        inv.term,
        total,
        paid,
        total - paid,
        inv.status,
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'
      ];
    });
    exportToCsv('BMI_University_Bursar_Financial_Ledger.csv', headers, rows);
  };

  const handlePrintStatement = () => {
    triggerPrint();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-slate-100">
      
      {/* Top Console Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>Finance Officer & Bursar Console</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AY 2026/2027 ACTIVE
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                University Bursar revenue tracking, financial hold enforcement, tariff management, automated billing, and scholarship grants.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Button Group */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleExportLedgerCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700/80 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Financial Ledger CSV</span>
          </button>

          <button
            onClick={() => setShowBatchInvoicing(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium text-xs border border-slate-700/80 transition flex items-center space-x-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Batch Term Billing</span>
          </button>

          <button
            onClick={() => setShowCreateInvoice(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Issue Tuition Invoice</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16 text-emerald-400" />
          </div>
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Total Invoiced Revenue</span>
          <div className="text-2xl font-bold font-mono text-white mt-1.5">${totalInvoiced.toLocaleString()}</div>
          <div className="flex items-center space-x-1 text-emerald-400 text-[11px] mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target: 100% Enrollment Billing</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
          </div>
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Reconciled Collections</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1.5">${totalCollected.toLocaleString()}</div>
          <p className="text-slate-400 text-[11px] mt-2">
            Collection Efficiency: <strong className="text-emerald-300 font-mono">{collectionRate}%</strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertTriangle className="w-16 h-16 text-rose-400" />
          </div>
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Outstanding Receivable Balance</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1.5">${totalOutstanding.toLocaleString()}</div>
          <p className="text-slate-400 text-[11px] mt-2">
            Accounts under Hold: <strong className="text-rose-300 font-mono">{studentsOnHoldCount} Students</strong>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Award className="w-16 h-16 text-indigo-400" />
          </div>
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Scholarships & Financial Aid</span>
          <div className="text-2xl font-bold font-mono text-indigo-300 mt-1.5">${totalScholarshipDisbursed.toLocaleString()}</div>
          <p className="text-slate-400 text-[11px] mt-2">
            Institutional Grants Disbursed
          </p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        {[
          { id: 'ledger', label: 'Invoices & Billing Ledger', icon: Receipt, badge: invoices.length },
          { id: 'holds', label: 'Financial Holds Manager', icon: Lock, badge: studentsOnHoldCount },
          { id: 'transactions', label: 'Payment Gateway Ledger', icon: DollarSign, badge: transactions.length },
          { id: 'scholarships', label: 'Scholarships & Aid', icon: Award, badge: scholarships.length },
          { id: 'tariffs', label: 'University Fee Schedule', icon: Layers },
          { id: 'analytics', label: 'Revenue Analytics', icon: PieChart }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: INVOICES & BILLING LEDGER */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice #, student name, UID, or registration #..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                >
                  <option value="ALL" className="bg-slate-900">All Statuses</option>
                  <option value="Paid" className="bg-slate-900">Paid</option>
                  <option value="Partial" className="bg-slate-900">Partial</option>
                  <option value="Unpaid" className="bg-slate-900">Unpaid</option>
                  <option value="Overdue" className="bg-slate-900">Overdue</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400 font-medium">Career:</span>
                <select
                  value={careerFilter}
                  onChange={(e) => setCareerFilter(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                >
                  <option value="ALL" className="bg-slate-900">All Careers</option>
                  <option value="UG" className="bg-slate-900">Undergraduate (UG)</option>
                  <option value="PG" className="bg-slate-900">Postgraduate (PG)</option>
                  <option value="DR" className="bg-slate-900">Doctorate (DR)</option>
                  <option value="CE" className="bg-slate-900">Continuing Ed (CE)</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                <span className="text-slate-400 font-medium">Term:</span>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="bg-transparent text-white focus:outline-none"
                >
                  <option value="ALL" className="bg-slate-900">All Terms</option>
                  <option value="Fall 2026" className="bg-slate-900">Fall 2026</option>
                  <option value="Spring 2026" className="bg-slate-900">Spring 2026</option>
                  <option value="Summer 2026" className="bg-slate-900">Summer 2026</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ledger Table / List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Fee Invoices Ledger ({filteredInvoices.length})</span>
              </h2>
              <span className="text-slate-400 text-xs font-mono">
                Showing {filteredInvoices.length} of {invoices.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Student Name & Reg No</th>
                    <th className="p-3">Term & Due Date</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Aid / Discount</th>
                    <th className="p-3">Paid / Reconciled</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Bursar Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvoices.map(inv => {
                    const student = students.find(s => s.id === inv.studentId);
                    const remaining = inv.totalAmount - (inv.scholarshipDiscount || 0) - inv.amountPaid;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition group">
                        <td className="p-3 font-mono font-bold text-indigo-300">
                          {inv.invoiceNumber}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-white">
                            {student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {student?.registrationNumber || student?.studentNumber || 'N/A'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-slate-200 font-medium">{inv.term}</div>
                          <div className="text-[11px] text-slate-400">Due: {inv.dueDate}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-white">
                          ${inv.totalAmount.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono text-indigo-300 font-medium">
                          {inv.scholarshipDiscount > 0 ? `-$${inv.scholarshipDiscount.toLocaleString()}` : '$0'}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          ${inv.amountPaid.toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : inv.status === 'Partial'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Official Statement Modal Trigger */}
                            <button
                              onClick={() => setShowStatementModal(inv)}
                              title="View Official Statement of Account"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            >
                              <FileText className="w-4 h-4 text-emerald-400" />
                            </button>

                            {/* Apply Scholarship */}
                            {remaining > 0 && (
                              <button
                                onClick={() => {
                                  setScholarshipInvoice(inv);
                                  setScholarshipAmount(Math.min(1000, remaining));
                                }}
                                title="Grant Scholarship Credit"
                                className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold rounded-lg transition text-[11px] flex items-center space-x-1"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Aid</span>
                              </button>
                            )}

                            {/* Reconcile Payment */}
                            {remaining > 0 && (
                              <button
                                onClick={() => {
                                  setShowPaymentModal(inv);
                                  setReconcileAmount(remaining);
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[11px] flex items-center space-x-1 shadow-sm"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p>No fee invoices match the selected filters or query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCIAL HOLDS MANAGER */}
      {activeTab === 'holds' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-bold text-white text-base flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-rose-400" />
                  <span>Student Financial Holds & Service Restrictions</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Financial holds automatically restrict course registration, exam hall entry clearance, and official transcript issuances for overdue accounts.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold text-xs">
                  {studentsOnHoldCount} Active Restrictions
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="p-3">Student Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Career & Program</th>
                    <th className="p-3">Outstanding Balance</th>
                    <th className="p-3">Financial Hold Status</th>
                    <th className="p-3 text-right">Hold Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {students.map(std => {
                    const studentInvoices = invoices.filter(i => i.studentId === std.id);
                    const stdOutstanding = studentInvoices.reduce((acc, inv) => acc + (inv.totalAmount - (inv.scholarshipDiscount || 0) - inv.amountPaid), 0);

                    return (
                      <tr key={std.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-indigo-300">{std.studentNumber}</td>
                        <td className="p-3">
                          <div className="font-semibold text-white">{std.firstName} {std.lastName}</div>
                          <div className="text-[11px] text-slate-400">{std.email}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          <span className="font-bold text-indigo-300 mr-1.5">[{std.career}]</span>
                          <span>{std.program}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-white">
                          ${stdOutstanding.toLocaleString()}
                        </td>
                        <td className="p-3">
                          {std.financialHold ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 w-fit">
                              <Lock className="w-3 h-3 text-rose-400" />
                              <span>ACTIVE HOLD (LOCKED)</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>CLEAR / GOOD STANDING</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setShowHoldReasonModal({
                                studentId: std.id,
                                studentName: `${std.firstName} ${std.lastName}`,
                                currentHold: !!std.financialHold
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition shadow-sm ${
                              std.financialHold
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-rose-600 hover:bg-rose-500 text-white'
                            }`}
                          >
                            {std.financialHold ? 'Clear Financial Hold' : 'Impose Financial Hold'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT GATEWAY & TRANSACTIONS LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-bold text-white text-base flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Real-Time Payment Gateway & Cashier Audit Ledger</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Itemized ledger of verified wire transfers, credit card merchant transactions, cashier counter collections, and scholarship voucher disbursements.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="p-3">Tx Reference</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Payment Channel</th>
                    <th className="p-3">Amount Reconciled</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.map(tx => {
                    const student = students.find(s => s.id === tx.studentId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-indigo-300">{tx.transactionReference}</td>
                        <td className="p-3 font-semibold text-white">
                          {student ? `${student.firstName} ${student.lastName}` : 'Alex Mercer'}
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          +${tx.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-slate-400 font-mono">{tx.timestamp}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCHOLARSHIPS & FINANCIAL AID */}
      {activeTab === 'scholarships' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scholarships.map(sch => (
              <div key={sch.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                      {sch.donorCategory}
                    </span>
                    <h3 className="font-bold text-white text-base mt-1.5">{sch.title}</h3>
                  </div>
                  <Award className="w-6 h-6 text-indigo-400 shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-800/50 rounded-xl p-3 text-xs border border-slate-700/50">
                  <div>
                    <span className="text-slate-400 text-[11px]">Annual Allocation</span>
                    <div className="font-mono font-bold text-white text-sm mt-0.5">${sch.annualBudget.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Total Disbursed</span>
                    <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">${sch.disbursedAmount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Active Student Scholars: <strong className="text-white font-mono">{sch.activeRecipients}</strong></span>
                  <span>Tuition Coverage: <strong className="text-indigo-300 font-mono">{sch.coveragePercent}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: UNIVERSITY FEE SCHEDULE & TARIFFS */}
      {activeTab === 'tariffs' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="font-bold text-white text-base flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>Approved University Fee Schedule & Tariffs</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bursar standard tuition, laboratory levies, and technological fees structured by Academic Career and Program.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[10px]">
                    <th className="p-3">Career</th>
                    <th className="p-3">Program Name</th>
                    <th className="p-3">Tuition Fee</th>
                    <th className="p-3">Lab Levy</th>
                    <th className="p-3">Tech Fee</th>
                    <th className="p-3">Activity Fee</th>
                    <th className="p-3 font-mono">Total Per Term</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {tariffs.map(tf => {
                    const total = tf.tuitionFee + tf.labFee + tf.techFee + tf.activityFee;
                    return (
                      <tr key={tf.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-bold text-indigo-300">{tf.career}</td>
                        <td className="p-3 font-sans font-semibold text-white">{tf.program}</td>
                        <td className="p-3 text-slate-300">${tf.tuitionFee.toLocaleString()}</td>
                        <td className="p-3 text-slate-300">${tf.labFee.toLocaleString()}</td>
                        <td className="p-3 text-slate-300">${tf.techFee.toLocaleString()}</td>
                        <td className="p-3 text-slate-300">${tf.activityFee.toLocaleString()}</td>
                        <td className="p-3 font-bold text-emerald-400 text-sm">${total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REVENUE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <span>Revenue Distribution by Category</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Tuition Fees (Undergraduate & Postgrad)</span>
                <span className="font-mono font-bold text-white">$1,450,000 (78.3%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 w-[78.3%]" />
              </div>

              <div className="flex justify-between text-slate-300 pt-2">
                <span>Laboratory & Software License Levies</span>
                <span className="font-mono font-bold text-white">$210,000 (11.3%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-indigo-500 w-[11.3%]" />
              </div>

              <div className="flex justify-between text-slate-300 pt-2">
                <span>Technology Infrastructure Levy</span>
                <span className="font-mono font-bold text-white">$120,000 (6.5%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-amber-500 w-[6.5%]" />
              </div>

              <div className="flex justify-between text-slate-300 pt-2">
                <span>Student Association & Health Services</span>
                <span className="font-mono font-bold text-white">$70,000 (3.9%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-rose-500 w-[3.9%]" />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
            <h3 className="font-bold text-white text-base flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Bursar Audit & Security Compliance</span>
            </h3>
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
              <p className="flex items-center space-x-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Double-Entry Ledger Integrity verified.</span>
              </p>
              <p>
                All student transactions are digitally timestamped, linked to permanent UIDs, and protected by anti-tamper security watermarks on generated statements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ISSUE SINGLE TUITION INVOICE */}
      {showCreateInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <span>Issue Custom Tuition & Fee Invoice</span>
              </h2>
              <button onClick={() => setShowCreateInvoice(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Student Account</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentNumber} • {s.program})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Academic Term</label>
                  <input
                    type="text"
                    value={invoiceTerm}
                    onChange={(e) => setInvoiceTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-400 font-semibold">Itemized Charges</label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-emerald-400 hover:text-emerald-300 text-[11px] font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Item description (e.g. Tuition Fee)"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Amount ($)"
                      value={item.amount}
                      onChange={(e) => handleLineItemChange(idx, 'amount', e.target.value)}
                      className="w-28 bg-slate-800 border border-slate-700 rounded-xl p-2 text-white font-mono"
                      required
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <div className="text-right pt-2 border-t border-slate-800">
                  <span className="text-slate-400 mr-2">Total Invoice Amount:</span>
                  <strong className="font-mono text-emerald-400 text-sm">
                    ${lineItems.reduce((acc, item) => acc + (item.amount || 0), 0).toLocaleString()}
                  </strong>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                Post & Dispatch Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH TERM BILLING */}
      {showBatchInvoicing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Automated Batch Term Billing Generator</span>
              </h2>
              <button onClick={() => setShowBatchInvoicing(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchSuccessMessage ? (
              <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-bold text-sm">{batchSuccessMessage}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-xs">
                  This tool will automatically calculate and issue tuition fee invoices for all active registered students based on the approved University Tariff schedule.
                </p>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Academic Term</label>
                  <input
                    type="text"
                    value={batchTerm}
                    onChange={(e) => setBatchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Target Career Cohort</label>
                    <select
                      value={batchCareer}
                      onChange={(e) => setBatchCareer(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                    >
                      <option value="ALL">All Active Cohorts</option>
                      <option value="UG">Undergraduate (UG)</option>
                      <option value="PG">Postgraduate (PG)</option>
                      <option value="DR">Doctorate (DR)</option>
                      <option value="CE">Continuing Ed (CE)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      value={batchDueDate}
                      onChange={(e) => setBatchDueDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-slate-300">
                  <span className="font-bold text-white block mb-1">Batch Summary Preview:</span>
                  <span>
                    Will generate invoices for approx{' '}
                    <strong className="text-emerald-400 font-mono">
                      {students.filter(s => batchCareer === 'ALL' || s.career === batchCareer).length} students
                    </strong>.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteBatchInvoicing}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg"
                >
                  Execute Batch Term Invoicing
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: RECONCILE / PROCESS PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Bursar Payment Reconciliation</span>
              </h2>
              <button onClick={() => setShowPaymentModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessReconciliation} className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 font-mono">
                <div className="text-slate-400 text-[11px]">Invoice Reference</div>
                <div className="text-white font-bold">{showPaymentModal.invoiceNumber}</div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reconciliation Amount ($)</label>
                <input
                  type="number"
                  value={reconcileAmount}
                  onChange={(e) => setReconcileAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Method / Channel</label>
                <select
                  value={reconcileMethod}
                  onChange={(e) => setReconcileMethod(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="Credit Card">Cashier Counter / Debit Card</option>
                  <option value="Mobile Payment">Mobile Money Payment</option>
                  <option value="Scholarship Voucher">Government / Org Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Transaction Ref / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. WIRE-998124"
                  value={reconcileRef}
                  onChange={(e) => setReconcileRef(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                Reconcile & Clear Invoice Balance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: APPLY SCHOLARSHIP */}
      {scholarshipInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Apply Scholarship / Financial Aid Voucher</span>
              </h2>
              <button onClick={() => setScholarshipInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyScholarshipSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Scholarship Title / Donor Fund</label>
                <input
                  type="text"
                  value={scholarshipName}
                  onChange={(e) => setScholarshipName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Discount Amount ($)</label>
                <input
                  type="number"
                  value={scholarshipAmount}
                  onChange={(e) => setScholarshipAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg"
              >
                Disburse & Credit Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM FINANCIAL HOLD TOGGLE */}
      {showHoldReasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Lock className="w-5 h-5 text-rose-400" />
                <span>{showHoldReasonModal.currentHold ? 'Clear Financial Hold' : 'Impose Financial Hold'}</span>
              </h2>
              <button onClick={() => setShowHoldReasonModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300">
              Target Student: <strong className="text-white">{showHoldReasonModal.studentName}</strong>
            </p>

            {!showHoldReasonModal.currentHold && (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Reason for Hold Enforcement</label>
                <textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white text-xs h-20"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowHoldReasonModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleHold}
                className={`px-4 py-2 text-white font-bold rounded-xl shadow-lg ${
                  showHoldReasonModal.currentHold ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {showHoldReasonModal.currentHold ? 'Confirm Lift Hold' : 'Confirm Impose Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: OFFICIAL SECURITY-SEALED STATEMENT OF ACCOUNT */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-2xl p-8 shadow-2xl space-y-6 relative border border-slate-200 print:shadow-none print:border-none">
            
            {/* Modal Header Controls (Hidden on Print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-800 text-sm">Official University Bursar Statement</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintStatement}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition text-xs flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Statement</span>
                </button>
                <button
                  onClick={() => setShowStatementModal(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Security Background Elements */}
            <SecurityWatermark text="OFFICIAL BURSAR STATEMENT" />

            {/* Statement Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white font-bold flex items-center justify-center font-serif text-sm">
                    BMI
                  </div>
                  <div>
                    <h1 className="font-serif text-lg font-bold text-slate-900 tracking-tight">BMI UNIVERSITY</h1>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Office of the University Bursar & Financial Controller</p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="px-3 py-1 rounded-md bg-slate-100 text-slate-900 font-mono font-bold text-xs border border-slate-300">
                  {showStatementModal.invoiceNumber}
                </span>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Issued: {showStatementModal.issueDate}</div>
              </div>
            </div>

            {/* Student & Invoice Meta */}
            {(() => {
              const student = students.find(s => s.id === showStatementModal.studentId);
              return (
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Student Details</span>
                    <div className="font-bold text-slate-900 mt-0.5">{student ? `${student.firstName} ${student.lastName}` : 'Student Name'}</div>
                    <div className="font-mono text-slate-600 text-[11px]">Reg #: {student?.registrationNumber || 'N/A'}</div>
                    <div className="text-slate-600 text-[11px]">{student?.program}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] uppercase font-bold">Billing Account</span>
                    <div className="font-bold text-slate-900 mt-0.5">Academic Term: {showStatementModal.term}</div>
                    <div className="text-slate-600 text-[11px]">Due Date: {showStatementModal.dueDate}</div>
                    <div className={`font-bold mt-1 text-xs uppercase ${
                      showStatementModal.status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      Status: {showStatementModal.status}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Itemized Line Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Itemized Fee Assessment</h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {showStatementModal.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-sans text-slate-800">{item.description}</td>
                      <td className="p-2 text-right font-bold text-slate-900">${item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {showStatementModal.scholarshipDiscount > 0 && (
                    <tr className="bg-indigo-50/60 font-bold text-indigo-900">
                      <td className="p-2 font-sans">Institutional Scholarship / Aid Voucher</td>
                      <td className="p-2 text-right">-${showStatementModal.scholarshipDiscount.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Totals Summary */}
            <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-center text-xs">
              <div className="space-y-1">
                <SecuritySealBadge 
                  docType="Official Statement of Account"
                  docId={showStatementModal.invoiceNumber}
                  securityHash={`hash-${showStatementModal.id}-sec2026`}
                  issueDate={showStatementModal.issueDate}
                />
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Checksum: sha256-{showStatementModal.id.substring(0, 12)}...
                </div>
              </div>

              <div className="text-right space-y-1 font-mono">
                <div className="text-slate-600">Total Assessed: ${showStatementModal.totalAmount.toLocaleString()}</div>
                <div className="text-emerald-700 font-bold">Total Paid: ${showStatementModal.amountPaid.toLocaleString()}</div>
                <div className="text-slate-900 font-extrabold text-sm border-t border-slate-300 pt-1">
                  Net Due: ${(showStatementModal.totalAmount - (showStatementModal.scholarshipDiscount || 0) - showStatementModal.amountPaid).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Bursar Signature Block */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
              <div>
                <p className="font-semibold text-slate-700">BMI University Bursar & Treasury Office</p>
                <p>Computerized Account Verification System</p>
              </div>

              <div className="text-center space-y-1">
                <div className="font-serif italic text-sm text-slate-800 font-bold">Dr. Marcus Vance</div>
                <div className="border-t border-slate-400 px-6 pt-0.5 font-bold uppercase text-[9px] text-slate-600">
                  Chief University Bursar
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
