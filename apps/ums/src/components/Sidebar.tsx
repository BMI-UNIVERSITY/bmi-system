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
  ClipboardList,
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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  isCollapsed,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const openAIModal = useUIStore((s) => s.openAIModal);
  const user = useAuthStore((s) => s.user);

  console.log('[Sidebar] User object from authStore:', user);
  console.log('[Sidebar] User role:', user?.role);

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
    { id: "admissions", label: "Admissions", icon: ClipboardList },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "students", label: "Students", icon: Users },
    { id: "staff", label: "Staff & Faculty", icon: Briefcase },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "timetable", label: "Timetable", icon: Calendar },
    { id: "finance", label: "Finance", icon: CreditCard },
    { id: "courses", label: "Courses", icon: MonitorPlay },
    { id: "programs", label: `Degree ${t('academic.programs')}`, icon: GraduationCap },
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
          "admissions",
          "documents",
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
          "admissions",
          "documents",
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
      {/* Mobile backdrop overlay - only show on mobile when open */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Fixed Sidebar - Always visible on desktop, slides in on mobile */}
      <div
        className={`fixed left-0 top-0 h-screen bg-[#1a1a1a] border-r border-gray-800 flex flex-col shadow-2xl z-50 transition-all duration-300 ease-out ${
          isCollapsed ? "w-16" : "w-64"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header Area */}
        <div className={`p-4 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center border-b border-gray-800`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <img
                  src={logo}
                  alt="BMI University"
                  className="w-full h-full object-contain rounded-lg border border-[#FFD700]"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#FFD700]">BMI University</h1>
                <span className="text-[8px] text-gray-400 uppercase tracking-wider">ERP System</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 relative">
              <img
                src={logo}
                alt="BMI"
                className="w-full h-full object-contain rounded-lg border border-[#FFD700]"
              />
            </div>
          )}
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto py-2 px-2 space-y-1 no-scrollbar"
          aria-label="Main navigation"
        >
          {allMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = getActiveView(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-[#2a2a2a] text-[#FFD700]"
                    : "text-gray-400 hover:bg-[#2a2a2a] hover:text-white"
                }`}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={20}
                  className={`flex-shrink-0 transition-colors ${isActive ? "text-[#FFD700]" : "text-gray-400 group-hover:text-white"}`}
                />
                {!isCollapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFD700] rounded-r" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-2 border-t border-gray-800 space-y-2 ${isCollapsed ? '' : 'px-4'}`}>
          {/* Toggle collapse button - desktop only */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-[#2a2a2a] hover:text-white transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <LayoutDashboard size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? "Log out" : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Log Out</span>}
          </button>

          {/* User info - only show when expanded */}
          {!isCollapsed && user && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-800 mt-2">
              <div className="truncate font-medium text-gray-400">{user.name}</div>
              <div className="truncate">{user.email}</div>
              <div className="uppercase text-[10px] text-[#FFD700] mt-1">{user.role}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;









