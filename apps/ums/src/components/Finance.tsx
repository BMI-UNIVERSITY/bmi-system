/* eslint-disable */
/* eslint-disable */
import React, { useState, useMemo, useEffect } from "react";
import {
  Download,
  Plus,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Clock,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  History,
  Printer,
  Users,
  Briefcase,
  Wallet,
  ShieldAlert,
  Send,
  Mail,
  Check,
  Edit2,
  Calendar,
  Share2,
  MessageCircle,
  CreditCard,
} from "lucide-react";
import { Transaction, Student, StaffMember } from "../types";
import { getPrograms } from "../services/catalogService";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
} from "../services/financeService";
import { BulkEntryModal } from "./BulkEntryModal";
import { postTransactionBatch } from "../services/batchService";
import { useDataStore } from "../stores/dataStore";
import { useTransactionsQuery, useStudentsQuery, useStaffQuery } from "../hooks/useEntityQueries";
import { usePagination } from "../hooks/usePagination";

const Finance: React.FC = () => {
  const { page, perPage, setPage, setMeta, meta } = usePagination(50);

  // Fetch data using TanStack Query
  const { data: studentsRes, isLoading: isLoadingStudents } = useStudentsQuery({
    page: 1,
    perPage: 1000, // Fetch more for ledger until server-side aggregation is ready
  });
  const { data: staffRes, isLoading: isLoadingStaff } = useStaffQuery({
    page: 1,
    perPage: 1000,
  });
  const { data: transactionsRes, isLoading: isLoadingTransactions } = useTransactionsQuery({
    page: 1,
    perPage: 1000,
  });

  const students = studentsRes?.data || [];
  const staff = staffRes?.data || [];
  const transactions = transactionsRes?.data || [];

  const _setTransactions = useDataStore((s) => s.setTransactions);
  const setTransactions = (action: React.SetStateAction<Transaction[]>) => {
    if (typeof action === "function") {
      _setTransactions(
        (action as (prev: Transaction[]) => Transaction[])(
          useDataStore.getState().transactions,
        ),
      );
    } else {
      _setTransactions(action);
    }
  };
  const [financeView, setFinanceView] = useState<"students" | "employees">(
    "students",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<
    (Student & { paid: number; pending: number; txCount: number }) | null
  >(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showReceipt, setShowReceipt] = useState<Transaction | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [bulkTxOpen, setBulkTxOpen] = useState(false);
  const [programRows, setProgramRows] = useState<
    Array<{ id: string; label: string }>
  >([]);

  // Advanced Filters
  const [programFilter, setProgramFilter] = useState("All Programs");
  const [deptFilter, setDeptFilter] = useState("All Dept");
  const [yearFilter, setYearFilter] = useState("All Years");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getPrograms();
      if (cancelled || !r.success || !r.data) return;
      setProgramRows(
        r.data.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          label: `${String(p.program_code ?? "")} — ${String(p.name ?? "")}`,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await getPrograms();
      if (cancelled || !r.success || !r.data) return;
      setProgramRows(
        r.data.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          label: `${String(p.program_code ?? '')} — ${String(p.name ?? '')}`,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [newTx, setNewTx] = useState<{
    name: string;
    desc: string;
    amt: string;
    status: Transaction["status"];
    date: string;
  }>({
    name: "",
    desc: "Tuition Payment",
    amt: "",
    status: "Paid",
    date: new Date().toISOString().split("T")[0],
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const depts = [
    "All Dept",
    "Biblical Studies",
    "Computer Science",
    "Undeclared",
  ];
  const years = ["All Years", "2022", "2023", "2024"];

  const studentLedgerData = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch = `${s.first_name} ${s.last_name} ${s.id}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesProgram =
          programFilter === "All Programs" || s.program_code === programFilter;
        const matchesDept =
          deptFilter === "All Dept" ||
          (s as unknown as { department?: string }).department === deptFilter;
        const matchesYear =
          yearFilter === "All Years" ||
          String(
            (s as unknown as { admission_date?: string }).admission_date || "",
          ).includes(yearFilter);
        return matchesSearch && matchesProgram && matchesDept && matchesYear;
      })
      .map((s) => {
        const studentName = `${s.first_name} ${s.last_name}`;
        const studentTxs = transactions.filter((t) => t.name === studentName);
        const paid = studentTxs.reduce(
          (acc, curr) => (curr.status === "Paid" ? acc + curr.amt : acc),
          0,
        );
        const pending = studentTxs.reduce(
          (acc, curr) => (curr.status === "Pending" ? acc + curr.amt : acc),
          0,
        );
        return { ...s, paid, pending, txCount: studentTxs.length };
      });
  }, [
    students,
    transactions,
    searchTerm,
    programFilter,
    deptFilter,
    yearFilter,
  ]);

  const employeeLedgerData = useMemo(() => {
    return staff
      .filter((st) => {
        const matchesSearch = `${st.name} ${st.id}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
      .map((st) => {
        const staffTxs = transactions.filter(
          (t) => t.name === st.name && t.desc.includes("Salary"),
        );
        const totalPaid = staffTxs.reduce(
          (acc, curr) => (curr.status === "Paid" ? acc + curr.amt : acc),
          0,
        );
        return { ...st, totalPaid, txCount: staffTxs.length };
      });
  }, [staff, transactions, searchTerm]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.name) {
      setToastMsg("Please select a recipient from the registry");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    let committedTx: Transaction | null = null;

    try {
      if (editingTx && editingTx.id) {
        const res = await updateTransaction(editingTx.id, {
          name: newTx.name,
          desc: newTx.desc,
          amt: parseFloat(newTx.amt) || 0,
          status: newTx.status,
          date: newTx.date,
        });
        if (res.success && res.data) {
          committedTx = res.data as Transaction;
          setTransactions((prev) =>
            prev.map((t) => (t.id === editingTx.id ? committedTx! : t)),
          );
        } else {
          setToastMsg(res.error || "Update failed");
          setShowToast(true);
          return;
        }
        setIsNewTxModalOpen(false);
        setEditingTx(null);
        setToastMsg("Transaction updated successfully");
      } else if (editingTx) {
        committedTx = {
          ...editingTx,
          name: newTx.name,
          desc: newTx.desc,
          amt: parseFloat(newTx.amt) || 0,
          status: newTx.status,
          date: newTx.date,
        };
        setTransactions((prev) =>
          prev.map((t) => (t.ref === editingTx.ref ? committedTx! : t)),
        );
        setIsNewTxModalOpen(false);
        setEditingTx(null);
        setToastMsg("Transaction updated locally (no server id)");
      } else {
        const res = await createTransaction({
          ref: `TRX-${Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, "0")}`,
          name: newTx.name,
          desc: newTx.desc,
          date: newTx.date,
          amt: parseFloat(newTx.amt) || 0,
          status: newTx.status,
        });
        if (res.success && res.data) {
          committedTx = res.data as Transaction;
          setTransactions((prev) => [committedTx!, ...prev]);
          setToastMsg(`Entry for ${committedTx.name} committed successfully`);
        } else {
          setToastMsg(res.error || "Create failed");
          setShowToast(true);
          return;
        }
        if (!keepOpen) {
          setIsNewTxModalOpen(false);
        }
      }

      if (committedTx?.status === "Paid") {
        setShowReceipt(committedTx);
      }

      setNewTx({
        name: "",
        desc:
          financeView === "students"
            ? "Tuition Payment"
            : "Salary Disbursement",
        amt: "",
        status: "Paid",
        date: new Date().toISOString().split("T")[0],
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) { console.error(error);
      setToastMsg("Network error saving transaction");
      setShowToast(true);
     }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setNewTx({
      name: tx.name,
      desc: tx.desc,
      amt: tx.amt.toString(),
      status: tx.status,
      date: tx.date,
    });
    setIsNewTxModalOpen(true);
  };

  const sendReceipt = (
    recipient: string,
    type: "single" | "yearly" | "total",
    amt?: number,
  ) => {
    setToastMsg(
      `Digital Archive (${type}) dispatched to ${recipient}${amt ? ` for $${amt.toLocaleString()}` : ""}`,
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const getReceiptData = (tx: Transaction) => {
    const student = students.find(
      (s) => `${s.first_name} ${s.last_name}` === tx.name,
    );
    const studentTxs = transactions.filter(
      (t) => t.name === tx.name && t.status === "Paid",
    );
    const totalPaid = studentTxs.reduce((acc, curr) => acc + curr.amt, 0);
    const tuitionTotal = 5000;
    const balance = Math.max(0, tuitionTotal - totalPaid);
    return { student, totalPaid, balance };
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Sticky Header - Compact & Padded */}
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2 shadow-sm min-h-[60px]">
        <div className="flex items-center gap-3 pl-14 w-full md:w-auto">
          <div className="w-1 h-5 bg-[#4B0082] rounded-none"></div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-lg font-bold text-[#2E004F] dark:text-white tracking-tight uppercase leading-none">
              Department of Finance
            </h2>
            <p className="text-[8px] md:text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              BMI Institutional Finance & Audit Ledger
            </p>
          </div>
        </div>
        <div className="flex gap-3 pl-14 md:pl-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setBulkTxOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-700 text-white rounded-none shadow-xl hover:bg-indigo-900 transition-all font-black text-[9px] uppercase tracking-widest"
          >
            Bulk JSON
          </button>
          <button
            onClick={() => {
              setEditingTx(null);
              setNewTx({
                name: "",
                desc:
                  financeView === "students"
                    ? "Tuition Payment"
                    : "Salary Disbursement",
                amt: "",
                status: "Paid",
                date: new Date().toISOString().split("T")[0],
              });
              setIsNewTxModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2 bg-[#4B0082] text-white rounded-none shadow-xl hover:bg-black transition-all font-black text-[9px] uppercase tracking-widest border border-[#FFD700]/30"
          >
            <Plus size={12} className="text-[#FFD700]" />{" "}
            {financeView === "students" ? "Record Payment" : "Process Payroll"}
          </button>
        </div>
      </div>

      {/* Sticky Top Tab Bar */}
      <div className="sticky top-[60px] z-30 bg-[#F8F9FA]/95 dark:bg-[#0a0015]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
        <div className="flex items-center gap-2 mr-4 text-gray-400">
          <CreditCard size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Ledgers
          </span>
        </div>
        <button
          onClick={() => {
            setFinanceView("students");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            financeView === "students"
              ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
          }`}
        >
          <Users
            size={12}
            className={
              financeView === "students" ? "text-[#FFD700]" : "text-gray-400"
            }
          />{" "}
          Student Ledger
        </button>
        <button
          onClick={() => {
            setFinanceView("employees");
            setSearchTerm("");
          }}
          className={`flex items-center gap-2 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            financeView === "employees"
              ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
          }`}
        >
          <Briefcase
            size={12}
            className={
              financeView === "employees" ? "text-[#FFD700]" : "text-gray-400"
            }
          />{" "}
          Personnel Payroll
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Main Ledger Section */}
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-gray-700 space-y-6 bg-gray-50/50 dark:bg-gray-900/20">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-[450px]">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder={
                    financeView === "students"
                      ? "Search Student Name or BMI-ID..."
                      : "Search Employee Name or STF-ID..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none text-sm dark:text-white font-semibold focus:ring-1 focus:ring-[#4B0082] shadow-inner"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Ledger Metrics:
                </span>
                <div className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[10px] font-black uppercase">
                  Active Filters Applied
                </div>
              </div>
            </div>

            {financeView === "students" && (
              <div className="flex flex-wrap gap-4 items-center animate-fade-in">
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-[#4B0082] max-w-[200px]"
                >
                  <option value="All Programs">All Programs</option>
                  {programRows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-[#4B0082]"
                >
                  {depts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-[#4B0082]"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setProgramFilter("All Programs");
                    setDeptFilter("All Dept");
                    setYearFilter("All Years");
                  }}
                  className="text-[10px] font-black uppercase text-[#4B0082] hover:underline px-2"
                >
                  Reset Registry Filters
                </button>
              </div>
            )}
          </div>

          {/* ... Table logic remains the same ... */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase text-[9px] font-black tracking-[0.25em] border-b border-gray-800">
                  <th className="px-6 py-5">Record ID</th>
                  <th className="px-6 py-5">
                    {financeView === "students"
                      ? "Billed Student"
                      : "Employee Entity"}
                  </th>
                  <th className="px-6 py-5">Institutional Domain</th>
                  <th className="px-6 py-5">Admission / Join</th>
                  <th className="px-6 py-5">Cumulative Paid</th>
                  <th className="px-6 py-5">Pending Dues</th>
                  <th className="px-6 py-5 text-right">Commit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {financeView === "students"
                  ? studentLedgerData.map((s, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-purple-50/30 dark:hover:bg-gray-700/30 transition-all group"
                      >
                        <td className="px-6 py-5 text-xs font-mono font-bold text-[#4B0082] dark:text-purple-300">
                          {s.id}
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                            {s.first_name} {s.last_name}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                            {s.careerPath}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-blue-400"></div>
                            <span className="text-xs font-bold text-gray-400 dark:text-gray-400 uppercase tracking-tight">
                              {s.program_code || "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-gray-500 font-black">
                          {s.admissionYear}
                        </td>
                        <td className="px-6 py-5 text-sm font-black text-[#4B0082] dark:text-white">
                          ${s.paid.toLocaleString()}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${
                              s.pending > 0
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-100"
                            }`}
                          >
                            {s.pending > 0
                              ? `$${s.pending.toLocaleString()}`
                              : "Clear"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedStudent(s)}
                              className="p-2 text-gray-300 hover:text-[#4B0082] transition-colors"
                              title="Bursary Detail"
                            >
                              <History size={18} />
                            </button>
                            <button
                              onClick={() =>
                                sendReceipt(
                                  `${s.first_name} ${s.last_name}`,
                                  "total",
                                )
                              }
                              className="p-2 text-gray-300 hover:text-[#4B0082] transition-colors"
                              title="Dispatch Total Receipt"
                            >
                              <Mail size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : employeeLedgerData.map((st, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-purple-50/30 dark:hover:bg-gray-700/30 transition-all group"
                      >
                        <td className="px-6 py-5 text-xs font-mono font-bold text-[#4B0082] dark:text-purple-300">
                          {st.id}
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                            {st.name}
                          </p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                            {st.role}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-purple-400"></div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">
                              {st.department}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-gray-500 font-black">
                          {st.joinDate}
                        </td>
                        <td className="px-6 py-5 text-sm font-black text-[#4B0082] dark:text-white">
                          ${st.totalPaid.toLocaleString()}
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-700 border-emerald-100">
                            Verified
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="p-2 text-gray-300 hover:text-[#4B0082] transition-colors">
                            <FileText size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Existing Modals and Footers ... (Unchanged) */}
        {selectedStudent && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-3xl p-4">
            {/* ... Student History Modal ... */}
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl shadow-2xl border-2 border-gray-900 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b-4 border-[#4B0082] flex justify-between items-center bg-gray-900 text-white">
                <div>
                  <h3 className="text-2xl font-bold uppercase tracking-tight">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </h3>
                  <p className="text-xs font-bold text-[#FFD700] uppercase tracking-widest mt-1">
                    Institutional Financial Node: {selectedStudent.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-2 hover:bg-red-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              {/* ... Modal Content ... */}
              <div className="flex-1 overflow-y-auto p-10 space-y-10">
                {/* ... Student Details and History Table ... */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 border border-gray-100 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Total Capital Committed
                    </p>
                    <p className="text-3xl font-black text-[#4B0082] dark:text-white mt-1">
                      ${selectedStudent.paid.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 border border-gray-100 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Outstanding Audit Dues
                    </p>
                    <p className="text-3xl font-black text-amber-500 mt-1">
                      ${selectedStudent.pending.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        sendReceipt(
                          `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                          "yearly",
                        )
                      }
                      className="flex-1 bg-[#4B0082] text-white text-[10px] font-black uppercase tracking-widest py-3 hover:bg-black transition-all"
                    >
                      Dispatch Yearly Statement
                    </button>
                    <button
                      onClick={() =>
                        sendReceipt(
                          `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                          "total",
                        )
                      }
                      className="flex-1 border-2 border-[#4B0082] text-[#4B0082] text-[10px] font-black uppercase tracking-widest py-3 hover:bg-gray-50 transition-all"
                    >
                      Request Final Clearance
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                    <History size={14} /> Historical Ledger Entries
                  </h4>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-gray-400 uppercase text-[9px] font-black tracking-widest">
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Specification</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {transactions
                        .filter(
                          (t) =>
                            t.name ===
                            `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                        )
                        .map((t, i) => (
                          <tr
                            key={i}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="px-4 py-3 text-xs font-mono font-bold text-[#4B0082]">
                              {t.ref}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold uppercase tracking-tight">
                              {t.desc}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 font-semibold">
                              {t.date}
                            </td>
                            <td className="px-4 py-3 text-xs font-black">
                              ${t.amt.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEditClick(t)}
                                  className="p-1 text-gray-400 hover:text-[#4B0082] transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setShowReceipt(t)}
                                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                  <FileText size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    sendReceipt(t.name, "single", t.amt)
                                  }
                                  className="p-1 text-gray-400 hover:text-emerald-500 transition-colors"
                                >
                                  <Send size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {transactions.filter(
                        (t) =>
                          t.name ===
                          `${selectedStudent.first_name} ${selectedStudent.last_name}`,
                      ).length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-10 text-center text-xs font-bold text-gray-400 uppercase italic"
                          >
                            No documented transactions found in registry
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ... Other Modals ... */}
        {showReceipt &&
          (() => {
            const { student, totalPaid, balance } = getReceiptData(showReceipt);
            return (
              <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4">
                {/* Receipt Content */}
                <div className="bg-white w-full max-w-2xl shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col border-[12px] border-white overflow-hidden animate-slide-up">
                  {/* ... Same as original ... */}
                  <div className="relative p-12 border-b-2 border-gray-900 overflow-hidden">
                    {/* ... Header ... */}
                    <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-gray-300 select-none uppercase tracking-widest">
                      Digital Authentication Matrix Active
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-6">
                        <img
                          src="/BMI.svg"
                          className="w-24 h-24 object-contain bg-white p-2 border border-gray-100 shadow-sm"
                          alt="Logo"
                        />
                        <div>
                          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                            BMI UNIVERSITY
                          </h1>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mt-2">
                            Institutional Finance Division
                          </p>
                          <div className="mt-4 space-y-0.5 text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                            <p>980-259-3680 • bmiuniversity.org</p>
                            <p>East Africa Hub: +254 704 500 872</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase leading-none">
                          PAYMENT RECEIPT
                        </h2>
                        <p className="text-xs font-bold text-[#4B0082] mt-2">
                          REF: {showReceipt.ref}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          ISSUED: {showReceipt.date}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-12 relative overflow-hidden bg-[#FAFAFA]">
                    {/* ... Body ... */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] rotate-[-25deg] select-none scale-[1.5]">
                      <h1 className="text-[120px] font-black uppercase text-gray-900">
                        BMI UNIVERSITY
                      </h1>
                    </div>

                    <div className="grid grid-cols-2 gap-12 relative z-10">
                      <div className="space-y-6">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            RECIPIENT DOMAIN
                          </p>
                          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                            {showReceipt.name}
                          </h3>
                          <p className="text-xs font-bold text-[#4B0082] mt-1 italic">
                            {student?.id || "BMI-EXT-USR"}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">
                            {student?.program_code || "External Audit"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            PAYMENT SPECIFICATION
                          </p>
                          <p className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                            {showReceipt.desc}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                            VIA: ELECTRONIC LEDGER TRANSFER
                          </p>
                        </div>
                      </div>

                      <div className="bg-white border-2 border-gray-900 p-8 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase">
                              AMOUNT COMMITTED
                            </span>
                            <span className="text-sm font-black text-gray-900">
                              ${showReceipt.amt.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-gray-100 pb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase">
                              CUMULATIVE PAID
                            </span>
                            <span className="text-sm font-black text-emerald-600">
                              ${totalPaid.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="pt-6">
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                OUTSTANDING BALANCE
                              </p>
                              <p className="text-3xl font-black text-red-600 leading-none mt-1">
                                ${balance.toLocaleString()}
                              </p>
                            </div>
                            <div className="p-2 bg-gray-900 text-white rounded-none">
                              <ShieldAlert size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-16 flex justify-between items-end relative z-10">
                      <div className="max-w-xs">
                        <p className="text-[9px] font-bold text-gray-400 uppercase leading-relaxed">
                          This document serves as an official electronic
                          confirmation of funds received into BMI University
                          accounts. Any discrepancy should be reported within 48
                          hours to the Bursary Office.
                        </p>
                      </div>
                      <div className="text-center">
                        <div className="mb-2 font-['Brush_Script_MT',cursive] text-2xl text-[#4B0082] italic transform -rotate-2 select-none">
                          Institutional Registrar
                        </div>
                        <div className="w-48 h-[2px] bg-gray-900 mx-auto"></div>
                        <p className="text-[9px] font-black uppercase text-gray-900 mt-2 tracking-widest">
                          DIGITAL AUTHENTICATION SIGNATURE
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 border-t-2 border-gray-900 flex flex-wrap gap-4 items-center justify-between bg-white">
                    <div className="flex gap-4">
                      <button
                        onClick={() => {
                          setShowReceipt(null);
                          sendReceipt(
                            showReceipt.name,
                            "single",
                            showReceipt.amt,
                          );
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-[#4B0082] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                      >
                        <Mail size={16} /> Dispatch via Email
                      </button>
                      <button
                        onClick={() => {
                          setShowReceipt(null);
                          setShowToast(true);
                          setToastMsg(
                            `Receipt Matrix shared to WhatsApp: ${showReceipt.ref}`,
                          );
                          setTimeout(() => setShowToast(false), 3000);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                      >
                        <MessageCircle size={16} /> Share via WhatsApp
                      </button>
                    </div>
                    <button
                      onClick={() => setShowReceipt(null)}
                      className="p-3 bg-gray-100 hover:bg-red-500 hover:text-white transition-all rounded-none text-gray-400"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {isNewTxModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1a0033]/90 backdrop-blur-3xl p-4">
            {/* New Transaction Modal Content ... */}
            <div className="bg-white dark:bg-gray-900 shadow-2xl w-full max-w-lg border border-[#FFD700]/30 animate-slide-up overflow-hidden flex flex-col">
              <div className="bg-gray-900 p-8 border-b-2 border-[#FFD700] flex justify-between items-center text-white">
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight">
                    {editingTx
                      ? "Update Entry"
                      : financeView === "students"
                        ? "Fee Collection Portal"
                        : "Payroll Disbursement"}
                  </h3>
                  <p className="text-[10px] font-bold text-[#FFD700] uppercase tracking-widest mt-1">
                    BMI Financial Gateway Node
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsNewTxModalOpen(false);
                    setEditingTx(null);
                  }}
                  className="p-2 hover:bg-red-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddTx} className="p-10 space-y-8">
                {/* ... Form Fields ... */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                    {financeView === "students"
                      ? "Select Student Registry"
                      : "Select Employee Entity"}
                  </label>
                  <select
                    required
                    value={newTx.name}
                    onChange={(e) =>
                      setNewTx({ ...newTx, name: e.target.value })
                    }
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-sm focus:ring-1 focus:ring-[#4B0082] appearance-none cursor-pointer"
                  >
                    <option value="">
                      {financeView === "students"
                        ? "--- Select Student ---"
                        : "--- Select Staff ---"}
                    </option>
                    {financeView === "students"
                      ? students
                          .sort((a, b) =>
                            `${a.first_name} ${a.last_name}`.localeCompare(
                              `${b.first_name} ${b.last_name}`,
                            ),
                          )
                          .map((s) => (
                            <option
                              key={s.id}
                              value={`${s.first_name} ${s.last_name}`}
                            >
                              {s.id} | {s.first_name} {s.last_name}
                            </option>
                          ))
                      : staff
                          .sort((a, b) =>
                            (a.name ?? "").localeCompare(b.name ?? ""),
                          )
                          .map((st) => (
                            <option key={st.id} value={st.name}>
                              {st.id} | {st.name}
                            </option>
                          ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                      Transaction Code
                    </label>
                    <select
                      value={newTx.desc}
                      onChange={(e) =>
                        setNewTx({ ...newTx, desc: e.target.value })
                      }
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs uppercase tracking-tight"
                    >
                      {financeView === "students" ? (
                        <>
                          <option>Tuition Payment</option>
                          <option>Hostel Fee</option>
                          <option>Library Fine</option>
                          <option>Exam Retake Fee</option>
                        </>
                      ) : (
                        <>
                          <option>Salary Disbursement</option>
                          <option>Institutional Grant</option>
                          <option>Academic Research Allowance</option>
                          <option>Overtime Wage</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                      Transaction Status
                    </label>
                    <select
                      value={newTx.status}
                      onChange={(e) =>
                        setNewTx({ ...newTx, status: e.target.value as any })
                      }
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs uppercase tracking-tight"
                    >
                      <option value="Paid">Committed (Paid)</option>
                      <option value="Pending">Await Validation</option>
                      <option value="Failed">Declined / Error</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                      Amount In USD ($)
                    </label>
                    <div className="relative">
                      <DollarSign
                        size={20}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-[#4B0082]"
                      />
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={newTx.amt}
                        onChange={(e) =>
                          setNewTx({ ...newTx, amt: e.target.value })
                        }
                        placeholder="0.00"
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-black text-xl text-[#4B0082]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                      Effective Date
                    </label>
                    <div className="relative">
                      <Calendar
                        size={18}
                        className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        required
                        type="date"
                        value={newTx.date}
                        onChange={(e) =>
                          setNewTx({ ...newTx, date: e.target.value })
                        }
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs dark:text-white uppercase tracking-tight"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-5 pt-4">
                  <button
                    type="submit"
                    className="w-full py-5 bg-[#4B0082] text-white rounded-none shadow-2xl font-black uppercase tracking-[0.2em] text-xs border border-[#FFD700]/30 hover:bg-black transition-all flex items-center justify-center gap-4"
                  >
                    <CheckCircle2 size={18} className="text-[#FFD700]" />
                    {editingTx
                      ? "Update Ledger Commit"
                      : financeView === "students"
                        ? "Record Payment Entry"
                        : "Authorize Payroll"}
                  </button>

                  {!editingTx && (
                    <div className="flex items-center justify-center gap-3">
                      <input
                        type="checkbox"
                        id="keepOpen"
                        checked={keepOpen}
                        onChange={(e) => setKeepOpen(e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-[#4B0082]"
                      />
                      <label
                        htmlFor="keepOpen"
                        className="text-[10px] font-black uppercase text-gray-500 tracking-widest cursor-pointer select-none"
                      >
                        Stay in Gateway after submission (Batch Processing)
                      </label>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {showToast && (
          <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-[150] animate-fade-in">
            <div className="bg-gray-900 text-[#FFD700] px-10 py-5 rounded-none shadow-2xl flex items-center gap-4 border-2 border-[#FFD700] backdrop-blur-xl">
              <Check size={24} className="animate-pulse" />
              <span className="font-black text-xs uppercase tracking-[0.15em]">
                {toastMsg}
              </span>
            </div>
          </div>
        )}

        <BulkEntryModal
          open={bulkTxOpen}
          onClose={() => setBulkTxOpen(false)}
          title="Bulk transactions (JSON lines)"
          entity="transactions"
          sampleLine='{"ref":"TX-B-1","name":"Jane Doe","desc":"Tuition","amt":1500,"status":"Paid","date":"2025-01-01"}'
          onSubmit={async (lines) => {
            try {
              const items = lines.map(
                (l) => JSON.parse(l) as Record<string, unknown>,
              );
              const r = await postTransactionBatch(items);
              const list = await getTransactions({ perPage: 500 });
              if (list.success && list.data) setTransactions(list.data);
              return {
                ok: (r.data?.failureCount ?? 0) === 0,
                message: `Created: ${r.data?.successCount ?? 0}, failed: ${r.data?.failureCount ?? 0}.`,
              };
            } catch (error) {
              return {
                ok: false,
                message: "Invalid JSON on one or more lines.",
              };
            }
          }}
        />

        {/* Security Protocol Footer */}
        <div className="bg-gray-900 border-l-4 border-[#FFD700] p-6 text-white flex items-start gap-5 shadow-2xl mt-auto">
          <div className="p-2 bg-[#FFD700] text-black">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFD700]">
              Security Protocol Enforcement
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Bursary collections and payroll cycles are locked for the current
              fiscal period. Automated receipt dispatch is monitored for
              institutional transparency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;









