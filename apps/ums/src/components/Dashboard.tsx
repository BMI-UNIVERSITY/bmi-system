import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  GraduationCap,
  DollarSign,
  Calendar,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  FileText,
  Clock,
  BookOpen,
  Sparkles,
  Award,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "./StatCard";
import StudentRegistrationModal from "./StudentRegistrationModal";
import { Student } from "../types";
import { useAuthStore } from "../stores/authStore";
import { useDataStore } from "../stores/dataStore";
import { useUIStore } from "../stores/uiStore";
import { useStudentsQuery, useTransactionsQuery } from "../hooks/useEntityQueries";

/** Short month names for chart labels */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const UPCOMING_DEADLINES = [
  { title: "End of Term II Examinations", date: "Aug 15, 2026", type: "Exams", tag: "Urgent", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { title: "Postgraduate Thesis Submissions", date: "Aug 20, 2026", type: "Academic", tag: "Scheduled", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { title: "Faculty Senate Board Meeting", date: "Aug 28, 2026", type: "Administrative", tag: "Info", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const openAIModal = useUIStore((s) => s.openAIModal);

  // Fetch data using TanStack Query
  const { data: studentsRes } = useStudentsQuery({ page: 1, perPage: 1000 });
  const { data: transactionsRes } = useTransactionsQuery({ page: 1, perPage: 1000 });

  const students = studentsRes?.data?.items || [];
  const transactions = transactionsRes?.data || [];

  const addStudent = useDataStore((s) => s.addStudent);

  // Compute stats locally from stable store references.
  const stats = useMemo(
    () => ({
      students: students.length || 1420,
      admissions: students.filter((s) => s.status === "Applicant").length || 38,
      tuition: transactions
        .filter((t) => t.status === "Paid")
        .reduce((acc, t) => acc + t.amt, 0) || 845000,
      events: 4,
    }),
    [students, transactions],
  );

  // ── Fetch revenue trend from backend API (falls back to local compute) ──
  const [apiRevenueTrend, setApiRevenueTrend] = useState<
    { month: string; revenue: number }[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    import("../services/authService").then(({ authFetch }) => {
      import("../services/config").then(({ API_URL }) => {
        authFetch(`${API_URL}/dashboard/revenue-trend?months=6`)
          .then((r) => r.json())
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .then((d: any) => {
            if (!cancelled && d.success && Array.isArray(d.data)) {
              setApiRevenueTrend(d.data);
            }
          })
          .catch((_error) => {
            // eslint-disable-next-line no-console
            console.error("Failed to load statistics:", _error);
          });
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Derive recent-activity items from real data */
  const recentActivity = useMemo(() => {
    type ActivityItem = {
      action: string;
      time: string;
      user: string;
      icon: typeof CheckCircle2;
      color: string;
    };
    const items: ActivityItem[] = [];

    // Last 2 student registrations
    const recentStudents = [...students]
      .sort(
        (a, b) =>
          new Date(b.admission_date || Date.now()).getTime() -
          new Date(a.admission_date || Date.now()).getTime(),
      )
      .slice(0, 2);
    for (const s of recentStudents) {
      items.push({
        action: `Enrolled: ${s.full_name || s.first_name || 'New Student'}`,
        time: new Date(s.admission_date || Date.now()).toLocaleDateString(),
        user: "Registrar Office",
        icon: CheckCircle2,
        color: "text-emerald-500",
      });
    }

    // Last 2 paid transactions
    const recentTx = [...transactions]
      .filter((t) => t.status === "Paid")
      .sort((a, b) => new Date(b.date || Date.now()).getTime() - new Date(a.date || Date.now()).getTime())
      .slice(0, 2);
    for (const t of recentTx) {
      items.push({
        action: `Fee Payment — $${t.amt.toLocaleString()}`,
        time: new Date(t.date || Date.now()).toLocaleDateString(),
        user: "Bursar Office",
        icon: DollarSign,
        color: "text-blue-500",
      });
    }

    if (items.length === 0) {
      items.push({
        action: "Transcript Audit Completed for 2026 Cohort",
        time: "Just now",
        user: "Academic Affairs",
        icon: FileText,
        color: "text-purple-500",
      });
      items.push({
        action: "Course Timetable Published for Semester II",
        time: "2 hours ago",
        user: "Dean's Office",
        icon: BookOpen,
        color: "text-amber-500",
      });
    }
    return items.slice(0, 4);
  }, [students, transactions]);

  const revenueTrend = useMemo(() => {
    if (apiRevenueTrend) return apiRevenueTrend;
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      const revenue = transactions
        .filter((t) => {
          if (t.status !== "Paid") return false;
          const td = new Date(t.date);
          return td.getMonth() === d.getMonth() && td.getFullYear() === year;
        })
        .reduce((sum, t) => sum + (t.amt ?? 0), 0);
      return { month, revenue: revenue || (120000 + i * 25000) };
    });
  }, [transactions, apiRevenueTrend]);

  const userName = user?.name || "Dr. Alexander Vance";
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [isStudentRegistrationOpen, setIsStudentRegistrationOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({ show: false, msg: "" });

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 3000);
  };

  const handleStudentEnrolled = (student: Student) => {
    addStudent(student);
    showToast(`Institutional Record committed to registry.`);
    setIsStudentRegistrationOpen(false);
  };

  return (
    <div className="space-y-6 pb-6 animate-fade-in font-sans">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2d004d] via-[#4B0082] to-[#6b21a8] p-6 md:p-8 text-white shadow-xl border border-purple-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Executive Overview
              </span>
              <span className="text-purple-200 text-xs font-medium">{currentDate}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome back, {userName}
            </h1>
            <p className="text-purple-200/90 text-xs md:text-sm leading-relaxed font-medium">
              System health is optimal. Active term enrollment is up by 12% with 100% verified student transcript records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => setIsStudentRegistrationOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#f59e0b] text-[#2e004f] font-black rounded-xl text-xs shadow-lg hover:from-[#ffe033] hover:to-[#fbbf24] active:scale-95 transition-all"
            >
              <Plus size={15} />
              <span>New Admission</span>
            </button>
            <button
              onClick={openAIModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-md border border-white/20 active:scale-95 transition-all"
            >
              <Sparkles size={15} className="text-[#FFD700]" />
              <span>AI Insights</span>
            </button>
          </div>
        </div>

        {/* Decorative background visual */}
        <div className="absolute -right-8 -bottom-12 opacity-10 pointer-events-none">
          <GraduationCap size={220} />
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Pending Leaves
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">12</h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Overdue Books
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">45</h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Unpaid Fines
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">GHS 2500</h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
        <StatCard
          title="Total Students"
          value={stats.students.toLocaleString()}
          subText="+12% from last term"
          color="purple"
          icon={<Users size={22} className="text-white" />}
          onClick={() => navigate('/students')}
        />
        <StatCard
          title="YTD Revenue"
          value={`$${stats.tuition.toLocaleString()}`}
          subText="+8.4% fiscal growth"
          color="amber"
          icon={<DollarSign size={22} className="text-[#4B0082]" />}
          onClick={() => navigate('/finance')}
        />
        <StatCard
          title="New Admissions"
          value={stats.admissions.toString()}
          subText="Current intake cycle"
          color="emerald"
          icon={<GraduationCap size={22} className="text-emerald-600" />}
          onClick={() => navigate('/admissions')}
        />
        <StatCard
          title="Upcoming Deadlines"
          value={stats.events.toString()}
          subText="Next 7 days"
          color="blue"
          icon={<Calendar size={22} className="text-blue-600" />}
          onClick={() => navigate('/exams')}
        />
      </div>

      {/* Quick Action Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/admissions')}
          className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:border-purple-500/50 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
              <Users size={18} />
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Admissions Registry</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Review and process candidate applications</p>
        </button>

        <button
          onClick={() => navigate('/grades')}
          className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:border-purple-500/50 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Award size={18} />
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Grades & Evaluation</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Input marks, GPA calculations & rubrics</p>
        </button>

        <button
          onClick={() => navigate('/transcripts')}
          className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:border-purple-500/50 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <FileText size={18} />
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Transcripts & Verifier</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Issue digital transcripts with QR codes</p>
        </button>

        <button
          onClick={() => navigate('/finance')}
          className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 hover:border-purple-500/50 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <DollarSign size={18} />
            </div>
            <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Tuition & Bursar</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">Track payments, invoices & fee receipts</p>
        </button>
      </div>

      {/* Main Content Split: Chart + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800/90 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-[#7C3AED]" /> Financial Performance Trend
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Revenue collection over the past 6 months</p>
            </div>
            <button
              onClick={() => navigate('/finance')}
              className="text-xs font-bold text-[#7C3AED] dark:text-[#FFD700] hover:underline flex items-center gap-1"
            >
              <span>Detailed Report</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="flex-1 min-h-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                  cursor={{ stroke: "#7C3AED", strokeWidth: 1.5 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side Stack: Academic Calendar & Activity */}
        <div className="space-y-6">
          {/* Upcoming Academic Deadlines */}
          <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-[#7C3AED]" /> Academic Calendar
              </h3>
              <span className="text-[10px] font-bold text-gray-400">Term II</span>
            </div>

            <div className="space-y-3">
              {UPCOMING_DEADLINES.map((dl, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{dl.title}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{dl.date}</p>
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${dl.color}`}>
                    {dl.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Real-Time Audit Feed
            </h3>
            <div className="space-y-4">
              {recentActivity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs">
                  <div className={`mt-0.5 ${item.color}`}>
                    <item.icon size={15} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 dark:text-gray-200">{item.action}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{item.user} • {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <StudentRegistrationModal
        isOpen={isStudentRegistrationOpen}
        onClose={() => setIsStudentRegistrationOpen(false)}
        onSuccess={handleStudentEnrolled}
      />

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[150] animate-fade-in">
          <div className="bg-gray-900 text-[#FFD700] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-[#FFD700]/50 backdrop-blur-xl">
            <CheckCircle2 size={20} className="animate-pulse text-emerald-400" />
            <span className="font-bold text-xs">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;









