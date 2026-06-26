/* eslint-disable */
/* eslint-disable */
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Calendar,
  CreditCard,
  MonitorPlay,
  MessageSquare,
  FileBarChart,
  Settings,
  Bot,
  LogOut,
  Briefcase,
  Book,
  Home,
  FileSpreadsheet,
  ShieldCheck,
  Stethoscope,
  Package,
  Award,
  FileText,
  Scroll,
  X,
  GraduationCap,
  Activity,
} from "lucide-react";
import { NavItem } from "../types";
import { useUIStore } from "../stores/uiStore";
import { useAuthStore } from "../stores/authStore";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  logo: string;
  isOpen: boolean;
  onClose: () => void;
}

// Map view IDs to route paths
const viewToRoute: Record<string, string> = {
  student: "/student",
  faculty: "/faculty",
  dashboard: "/dashboard",
  students: "/students",
  staff: "/staff",
  attendance: "/attendance",
  finance: "/finance",
  courses: "/courses",
  timetable: "/timetable",
  programs: "/programs",
  exams: "/exams",
  grades: "/grades",
  rubrics: "/rubrics",
  transcripts: "/transcripts",
  certificates: "/certificates",
  library: "/library",
  hostels: "/hostels",
  medical: "/medical",
  inventory: "/inventory",
  alumni: "/alumni",
  sms: "/communications",
  visitors: "/visitors",
  reports: "/reports",
  settings: "/settings",
  diagnostics: "/diagnostics",
};

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onChangeView,
  onLogout,
  logo,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();
  const openAIModal = useUIStore((s) => s.openAIModal);
  const user = useAuthStore((s) => s.user);

  // Role-specific portal items shown only for matching roles
  const roleItems: NavItem[] =
    user?.role === "student"
      ? [{ id: "student", label: "My Portal", icon: GraduationCap }]
      : user?.role === "faculty"
        ? [{ id: "faculty", label: "Faculty Portal", icon: Briefcase }]
        : [];

  const allMenuItems: NavItem[] = [
    ...roleItems,
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "students", label: "Students", icon: Users },
    { id: "staff", label: "Staff & Faculty", icon: Briefcase },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "finance", label: "Finance", icon: CreditCard },
    { id: "courses", label: "Courses", icon: MonitorPlay },
    { id: "programs", label: "Degree Programs", icon: GraduationCap },
    { id: "exams", label: "Exams & Grading", icon: FileSpreadsheet },
    { id: "grades", label: "Grade Management", icon: FileSpreadsheet },
    { id: "rubrics", label: "Marking Rubrics", icon: FileText },
    { id: "transcripts", label: "Transcripts", icon: FileText },
    { id: "certificates", label: "Certificates", icon: Scroll },
    { id: "library", label: "Library", icon: Book },
    { id: "hostels", label: "Hostels", icon: Home },
    { id: "medical", label: "Health Center", icon: Stethoscope },
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "alumni", label: "Alumni Registry", icon: Award },
    { id: "sms", label: "Communications", icon: MessageSquare },
    { id: "visitors", label: "Visitors", icon: ShieldCheck },
    { id: "reports", label: "Reports", icon: FileBarChart },
    { id: "ai", label: "AI Assistant", icon: Bot },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "diagnostics", label: "System Health", icon: Activity },
  ].filter((item) => {
    // Admin sees everything
    if (user?.role === "admin") return true;

    // AI and Settings are available to all staff-level roles
    if (["ai", "settings"].includes(item.id)) {
      return user?.role !== "student";
    }

    // Role-specific visibility
    switch (user?.role) {
      case "student":
        return ["student", "timetable", "library", "medical", "ai"].includes(item.id);

      case "faculty":
        return [
          "faculty",
          "dashboard",
          "students",
          "attendance",
          "timetable",
          "courses",
          "programs",
          "exams",
          "grades",
          "rubrics",
          "library",
        ].includes(item.id);

      case "registrar":
        return [
          "dashboard",
          "students",
          "staff",
          "attendance",
          "timetable",
          "courses",
          "programs",
          "exams",
          "grades",
          "rubrics",
          "transcripts",
          "certificates",
          "reports",
          "alumni",
        ].includes(item.id);

      case "staff":
        return [
          "dashboard",
          "students",
          "library",
          "hostels",
          "medical",
          "inventory",
          "visitors",
        ].includes(item.id);

      case "viewer":
        return ["dashboard", "students", "courses", "library"].includes(
          item.id,
        );

      default:
        // Default: only dashboard
        return ["dashboard"].includes(item.id);
    }
  });

  const handleNavigate = (viewId: string) => {
    if (viewId === "ai") {
      openAIModal();
    } else {
      const route = viewToRoute[viewId] || `/${viewId}`;
      navigate(route);
    }
    onClose();
  };

  // Determine active item from current URL path
  const getActiveView = (itemId: string): boolean => {
    const currentPath = location.pathname;
    if (itemId === "dashboard") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    if (itemId === "sms") {
      return currentPath === "/communications";
    }
    return currentPath === `/${itemId}`;
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Drawer */}
      <div
        className={`h-[calc(100vh-2rem)] w-72 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#7B1FA2] via-[#4B0082] to-[#1a0033] text-white flex flex-col shadow-2xl fixed left-4 top-4 z-[100] border border-[#FFD700]/20 dark:border-gray-800 transition-transform duration-300 ease-out rounded-3xl overflow-hidden ${isOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"}`}
      >
        {/* Header Area */}
        <div className="p-6 flex flex-col items-center border-b border-[#FFD700]/20 bg-black/10 backdrop-blur-sm relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 mb-3 relative filter drop-shadow-lg transition-transform hover:scale-105 duration-300">
            <img
              src={logo}
              alt="BMI University Logo"
              className="w-full h-full object-contain rounded-xl border-2 border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] bg-white"
            />
          </div>
          <h1 className="text-md font-bold text-center leading-tight bg-gradient-to-r from-[#FFD700] to-[#FDB931] bg-clip-text text-transparent drop-shadow-sm">
            BMI University
          </h1>
          <span className="text-[8px] text-purple-200 opacity-80 uppercase tracking-widest mt-1">
            Institutional ERP
          </span>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-1"
          aria-label="Main navigation"
        >
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = getActiveView(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? "bg-gradient-to-r from-[#FFD700]/20 to-transparent border-l-4 border-[#FFD700] text-white shadow-lg backdrop-blur-md"
                    : "text-purple-200 hover:bg-white/10 hover:text-[#FFD700]"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-300 ${isActive ? "text-[#FFD700]" : "text-purple-300 group-hover:text-[#FFD700]"}`}
                />
                <span
                  className={`text-[11px] tracking-wide font-medium ${isActive ? "translate-x-1 font-bold" : ""} transition-transform`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-[#FFD700]/20 bg-black/20 backdrop-blur-sm space-y-3">
          {/* Language Toggle */}
          <div className="flex flex-col gap-2 px-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">Language</span>
            <div className="flex flex-wrap gap-1">
              {['en', 'sw', 'es', 'fr', 'ar'].map((lang) => (
                <button 
                  key={lang}
                  onClick={() => i18n.changeLanguage(lang)}
                  className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${i18n.language.startsWith(lang) ? 'bg-[#FFD700] text-[#4B0082]' : 'text-purple-300 hover:bg-white/10'}`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-purple-200 hover:bg-red-500/20 hover:text-red-100 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-[11px] font-medium">Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;









