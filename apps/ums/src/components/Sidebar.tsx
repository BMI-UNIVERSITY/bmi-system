/* eslint-disable */
import React, { useCallback, useRef, useEffect } from "react";
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
  ChevronDown,
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

interface NavGroup {
  id: string;
  label: string;
  icon: any;
  items: NavItem[];
}

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

// Accessible keyboard handler for group toggles
function useKeyboardNav() {
  const handleGroupKeyDown = useCallback(
    (e: React.KeyboardEvent, toggle: () => void, close: () => void) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [],
  );
  return { handleGroupKeyDown };
}

const Sidebar: React.FC<SidebarProps> = ({
  onLogout,
  logo,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const openAIModal = useUIStore((s) => s.openAIModal);
  const expandedGroups = useUIStore((s) => s.expandedGroups);
  const toggleGroup = useUIStore((s) => s.toggleGroup);
  const user = useAuthStore((s) => s.user);
  const { handleGroupKeyDown } = useKeyboardNav();
  const activeGroupRef = useRef<HTMLButtonElement>(null);

  // Role-specific portal items shown only for matching roles
  const roleItems: NavItem[] =
    user?.role === "student"
      ? [{ id: "student", label: "My Portal", icon: GraduationCap }]
      : user?.role === "faculty"
        ? [{ id: "faculty", label: "Faculty Portal", icon: Briefcase }]
        : [];

  // Define navigation groups
  const navGroups: NavGroup[] = [
    {
      id: "quick_access",
      label: "Quick Access",
      icon: LayoutDashboard,
      items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
      id: "student_mgmt",
      label: "Student Management",
      icon: Users,
      items: [
        { id: "admissions", label: "Admissions", icon: ClipboardList },
        { id: "documents", label: "Documents", icon: FileText },
        { id: "students", label: "Students", icon: Users },
        { id: "alumni", label: "Alumni Registry", icon: Award },
      ],
    },
    {
      id: "academic",
      label: "Academic",
      icon: MonitorPlay,
      items: [
        { id: "courses", label: "Courses", icon: MonitorPlay },
        { id: "programs", label: `Degree ${t("academic.programs")}`, icon: GraduationCap },
        { id: "exams", label: "Exams & Grading", icon: FileSpreadsheet },
        { id: "grades", label: "Grade Management", icon: FileSpreadsheet },
        { id: "rubrics", label: "Marking Rubrics", icon: FileText },
        { id: "transcripts", label: "Transcripts", icon: FileText },
        { id: "certificates", label: "Certificates", icon: Scroll },
      ],
    },
    {
      id: "operations",
      label: "Operations",
      icon: CalendarCheck,
      items: [
        { id: "attendance", label: "Attendance", icon: CalendarCheck },
        { id: "timetable", label: "Timetable", icon: Calendar },
        { id: "finance", label: "Finance", icon: CreditCard },
        { id: "staff", label: "Staff & Faculty", icon: Briefcase },
      ],
    },
    {
      id: "facilities",
      label: "Facilities",
      icon: Home,
      items: [
        { id: "hostels", label: "Hostels", icon: Home },
        { id: "library", label: "Library", icon: Book },
        { id: "medical", label: "Health Center", icon: Stethoscope },
        { id: "inventory", label: "Inventory", icon: Package },
        { id: "visitors", label: "Visitors", icon: ShieldCheck },
      ],
    },
    {
      id: "system",
      label: "System",
      icon: Settings,
      items: [
        { id: "sms", label: "Communications", icon: MessageSquare },
        { id: "reports", label: "Reports", icon: FileBarChart },
        { id: "ai", label: "AI Assistant", icon: Bot },
        { id: "settings", label: "Settings", icon: Settings },
        { id: "diagnostics", label: "System Health", icon: Activity },
      ],
    },
  ];

  // Filter groups and items based on user role
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (user?.role === "admin") return true;
        if (["ai", "settings"].includes(item.id)) {
          return user?.role !== "student";
        }
        switch (user?.role) {
          case "student":
            return ["timetable", "library", "medical"].includes(item.id);
          case "faculty":
            return [
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
            return ["dashboard", "students", "courses", "library"].includes(item.id);
          default:
            return ["dashboard"].includes(item.id);
        }
      }),
    }))
    .filter((group) => group.items.length > 0);

  // Auto-expand the group containing the active item
  const currentPath = location.pathname;
  const getActiveView = (itemId: string): boolean => {
    if (itemId === "dashboard") return currentPath === "/" || currentPath === "/dashboard";
    if (itemId === "sms") return currentPath === "/communications";
    return currentPath === `/${itemId}`;
  };

  // Auto-expand active item's group on mount and route change
  useEffect(() => {
    for (const group of filteredGroups) {
      for (const item of group.items) {
        if (getActiveView(item.id)) {
          useUIStore.getState().expandGroup(group.id);
          break;
        }
      }
    }
  }, [currentPath, filteredGroups]);

  const handleNavigate = (viewId: string) => {
    if (viewId === "ai") {
      openAIModal();
    } else {
      const route = viewToRoute[viewId] || `/${viewId}`;
      navigate(route);
    }
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-screen bg-[#D4C5F9] dark:bg-[#1a1a1a] border-r border-[#C4B5E3] dark:border-gray-800 flex flex-col shadow-2xl z-50 transition-all duration-300 ease-out ${
          isCollapsed ? "w-16" : "w-64"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className={`p-4 flex ${isCollapsed ? "justify-center" : "justify-between"} items-center border-b border-[#C4B5E3] dark:border-gray-800`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 relative">
                <img
                  src={logo}
                  alt="BMI University"
                  className="w-full h-full object-contain rounded-lg border border-[#4B0082]"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[#4B0082] dark:text-[#FFD700]">BMI University</h1>
                <span className="text-[8px] text-[#5C4E7A] dark:text-gray-400 uppercase tracking-wider">ERP System</span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 relative">
              <img
                src={logo}
                alt="BMI"
                className="w-full h-full object-contain rounded-lg border border-[#4B0082]"
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-[#5C4E7A] dark:text-gray-400 hover:text-[#1E1B4B] dark:hover:text-white hover:bg-[#C4B5E3] dark:hover:bg-white/10 rounded transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto py-2 px-2 space-y-1 no-scrollbar"
          aria-label="Main navigation"
        >
          {/* Role-specific portal items */}
          {roleItems.map((item) => {
            const Icon = item.icon;
            const isActive = getActiveView(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative text-left ${
                  isActive
                    ? "bg-[#7C3AED] text-white shadow-sm"
                    : "text-[#1E1B4B] dark:text-gray-400 hover:bg-[#C4B5E3] dark:hover:bg-[#2a2a2a] hover:text-[#1E1B4B] dark:hover:text-white"
                }`}
                title={isCollapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={20}
                  className={`flex-shrink-0 ${isActive ? "text-white" : "text-[#5C4E7A] dark:text-gray-400 group-hover:text-[#1E1B4B] dark:group-hover:text-white"}`}
                />
                {!isCollapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
              </button>
            );
          })}

          {/* Role divider */}
          {roleItems.length > 0 && !isCollapsed && (
            <div className="py-1 px-3">
              <div className="border-t border-[#C4B5E3] dark:border-gray-700" />
            </div>
          )}

          {/* Navigation groups */}
          {filteredGroups.map((group) => {
            const GroupIcon = group.icon;
            const isExpanded = expandedGroups.includes(group.id);
            return (
              <div key={group.id} className="space-y-0.5">
                {/* Group header */}
                <button
                  ref={activeGroupRef}
                  onClick={() => toggleGroup(group.id)}
                  onKeyDown={(e) =>
                    handleGroupKeyDown(
                      e,
                      () => toggleGroup(group.id),
                      () => {
                        if (isExpanded) toggleGroup(group.id);
                      },
                    )
                  }
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left ${
                    isCollapsed
                      ? "justify-center text-[#5C4E7A] dark:text-gray-400 hover:bg-[#C4B5E3] dark:hover:bg-[#2a2a2a]"
                      : "text-[#5C4E7A] dark:text-gray-400 hover:bg-[#C4B5E3] dark:hover:bg-[#2a2a2a] hover:text-[#1E1B4B] dark:hover:text-white"
                  }`}
                  title={isCollapsed ? group.label : undefined}
                  aria-expanded={isExpanded}
                  aria-label={`${group.label} section`}
                >
                  <GroupIcon
                    size={18}
                    className="flex-shrink-0"
                  />
                  {!isCollapsed && (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-widest flex-1 truncate">
                        {group.label}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                      />
                    </>
                  )}
                </button>

                {/* Submenu items */}
                {!isCollapsed && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-2 pl-2 border-l-2 border-[#C4B5E3] dark:border-gray-700 space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = getActiveView(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-left ${
                              isActive
                                ? "bg-[#7C3AED] text-white shadow-sm"
                                : "text-[#1E1B4B] dark:text-gray-400 hover:bg-[#C4B5E3] dark:hover:bg-[#2a2a2a] hover:text-[#1E1B4B] dark:hover:text-white"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon
                              size={16}
                              className={`flex-shrink-0 ${isActive ? "text-white" : "text-[#5C4E7A] dark:text-gray-400 group-hover:text-[#1E1B4B] dark:group-hover:text-white"}`}
                            />
                            <span className="text-xs font-medium truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={`p-2 border-t border-[#C4B5E3] dark:border-gray-800 space-y-2 ${isCollapsed ? "" : "px-4"}`}>
          {/* Collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[#5C4E7A] dark:text-gray-400 hover:bg-[#C4B5E3] dark:hover:bg-[#2a2a2a] hover:text-[#1E1B4B] dark:hover:text-white transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <LayoutDashboard size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#5C4E7A] dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? "Log out" : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Log Out</span>}
          </button>

          {/* User info */}
          {!isCollapsed && user && (
            <div className="px-3 py-2 text-xs text-[#5C4E7A] dark:text-gray-500 border-t border-[#C4B5E3] dark:border-gray-700 mt-2">
              <div className="truncate font-medium text-[#1E1B4B] dark:text-gray-400">{user.name}</div>
              <div className="truncate">{user.email}</div>
              <div className="uppercase text-[10px] text-[#4B0082] dark:text-[#FFD700] mt-1 font-bold">{user.role}</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
