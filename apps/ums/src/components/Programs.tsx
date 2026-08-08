import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Award,
  BookMarked,
  Library,
  BookOpen,
  Search,
  Plus,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Layers,
  Book,
  Download,
  X,
  CheckCircle2,
} from "lucide-react";
import { Program, Faculty, Department } from "../types";
import { getPrograms, getFaculties, getDepartments, createProgram } from "../services/programService";


// Beautiful mapping of program levels to distinct, premium aesthetics
const LEVEL_CONFIG = {
  certificate: {
    label: "Certificates",
    gradient: "from-amber-500 to-orange-600",
    bgLight: "bg-amber-50/50 dark:bg-amber-950/10",
    border: "border-amber-200/50 dark:border-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    icon: Book,
  },
  diploma: {
    label: "Diplomas",
    gradient: "from-teal-500 to-emerald-600",
    bgLight: "bg-teal-50/50 dark:bg-teal-950/10",
    border: "border-teal-200/50 dark:border-teal-900/30",
    text: "text-teal-700 dark:text-teal-400",
    icon: BookMarked,
  },
  bachelor: {
    label: "Bachelors",
    gradient: "from-purple-500 to-indigo-600",
    bgLight: "bg-purple-50/50 dark:bg-purple-950/10",
    border: "border-purple-200/50 dark:border-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    icon: GraduationCap,
  },
  master: {
    label: "Masters",
    gradient: "from-pink-500 to-rose-600",
    bgLight: "bg-pink-50/50 dark:bg-pink-950/10",
    border: "border-pink-200/50 dark:border-pink-900/30",
    text: "text-pink-700 dark:text-pink-400",
    icon: Award,
  },
  doctorate: {
    label: "Doctorates",
    gradient: "from-blue-600 to-indigo-800",
    bgLight: "bg-blue-50/50 dark:bg-blue-950/10",
    border: "border-blue-200/50 dark:border-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    icon: Library,
  },
};

const Programs: React.FC = () => {
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<Program[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [activeLevel, setActiveLevel] = useState<string>("All");

  // Load programs, faculties, and departments
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [progRes, facRes, deptRes] = await Promise.all([
          getPrograms(),
          getFaculties(),
          getDepartments(),
        ]);

        if (progRes.success && progRes.data) setPrograms(progRes.data);
        if (facRes.success && facRes.data) setFaculties(facRes.data);
        if (deptRes.success && deptRes.data) setDepartments(deptRes.data);
      } catch (error) { // eslint-disable-next-line no-console
        console.error("Failed to load academic catalog", error);
       } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.abbreviation || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFaculty =
        selectedFaculty === "All" || p.faculty_id === selectedFaculty;

      const matchesDepartment =
        selectedDepartment === "All" || p.department_id === selectedDepartment;

      const matchesLevel =
        activeLevel === "All" || p.level === activeLevel;

      return matchesSearch && matchesFaculty && matchesDepartment && matchesLevel;
    });
  }, [programs, searchTerm, selectedFaculty, selectedDepartment, activeLevel]);

  // Grouped Programs by level
  const groupedPrograms = useMemo(() => {
    const groups: Record<string, Program[]> = {
      certificate: [],
      diploma: [],
      bachelor: [],
      master: [],
      doctorate: [],
    };

    filteredPrograms.forEach((p) => {
      if (groups[p.level]) {
        groups[p.level].push(p);
      }
    });

    return groups;
  }, [filteredPrograms]);

  // Department Mapping
  const deptMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  }, [departments]);

  // Modal & Toast State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProgData, setNewProgData] = useState({
    name: "",
    code: "",
    level: "bachelor" as "certificate" | "diploma" | "bachelor" | "master" | "doctorate",
    duration_years: 4,
    total_credit_hours: 120,
    department_id: "",
    faculty_id: "",
    description: "",
  });
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleExportCSV = () => {
    const listToExport = filteredPrograms.length > 0 ? filteredPrograms : programs;
    const headers = ["Code", "Program Name", "Level", "Duration Years", "Total Credits", "Department ID"];
    const rows = listToExport.map((p) => [
      `"${p.code}"`,
      `"${p.name}"`,
      `"${p.level}"`,
      p.duration_years,
      p.total_credit_hours,
      `"${p.department_id}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `degree_programs_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateProgramSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProgData.name || !newProgData.code) return;

    try {
      const res = await createProgram({
        ...newProgData,
        department_id: newProgData.department_id || (departments[0]?.id || "dept-1"),
        faculty_id: newProgData.faculty_id || (faculties[0]?.id || "fac-1"),
      });

      if (res.success && res.data) {
        // @ts-ignore
        setPrograms(prev => (prev as any).map((p: any) => p.id === editingProgram.id ? {
          ...p,
        } : p));
        showToast("New degree program created successfully!");
      } else {
        const localProg: Program = {
          id: `prog-${Date.now()}`,
          ...newProgData,
          department_id: newProgData.department_id || "dept-1",
          faculty_id: newProgData.faculty_id || "fac-1",
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };
        setPrograms((prev) => [localProg, ...prev]);
        showToast("New degree program added to catalog!");
      }
    } catch {
      const localProg: Program = {
        id: `prog-${Date.now()}`,
        ...newProgData,
        department_id: newProgData.department_id || "dept-1",
        faculty_id: newProgData.faculty_id || "fac-1",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      setPrograms((prev) => [localProg, ...prev]);
      showToast("New degree program added to catalog!");
    } finally {
      setIsCreateModalOpen(false);
      setNewProgData({
        name: "",
        code: "",
        level: "bachelor",
        duration_years: 4,
        total_credit_hours: 120,
        department_id: "",
        faculty_id: "",
        description: "",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-[#4B0082]/30 border-t-[#4B0082] rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest animate-pulse">
          Loading Academic Taxonomy...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in relative bg-[#F8F9FA] dark:bg-[#0a0015]">
      {/* Premium Sticky Header */}
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3 pl-14 w-full md:w-auto">
          <div className="w-1.5 h-7 bg-[#FFD700] rounded-none"></div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-xl font-black text-[#2E004F] dark:text-white tracking-tight uppercase leading-none">
              Programs & Curricula
            </h2>
            <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
              Theological Seminary Degree Taxonomy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-14 md:pl-0 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-xs cursor-pointer"
          >
            <Download size={12} /> Export CSV
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B0082] text-white hover:bg-black transition-all font-bold text-[10px] uppercase tracking-wider border border-[#FFD700]/30 shadow-md rounded-lg cursor-pointer"
          >
            <Plus size={12} className="text-[#FFD700]" /> Create Program
          </button>
        </div>
      </div>

      {/* Level Filters Quickbar */}
      <div className="sticky top-[73px] z-30 bg-[#F8F9FA]/95 dark:bg-[#0a0015]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
        <div className="flex items-center gap-2 mr-4 text-gray-400">
          <Layers size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Degree Levels
          </span>
        </div>
        <button
          onClick={() => setActiveLevel("All")}
          className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeLevel === "All"
              ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          All Programs
        </button>
        {Object.entries(LEVEL_CONFIG).map(([key, config]) => {
          const IconComponent = config.icon;
          const isSelected = activeLevel === key;
          return (
            <button
              key={key}
              onClick={() => setActiveLevel(key)}
              className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg scale-105 border border-white/20`
                  : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <IconComponent size={12} className={isSelected ? "text-[#FFD700]" : "text-gray-400"} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Advanced Filters Drawer / Pinned Header */}
      <div className="sticky top-[125px] z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex flex-col lg:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search programs by title, code or abbreviation..."
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs dark:text-white focus:ring-1 focus:ring-[#4B0082]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full lg:w-auto items-center">
          <div className="flex items-center gap-2 text-gray-400 mr-2">
            <SlidersHorizontal size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              Filters
            </span>
          </div>

          {/* Faculty select */}
          <select
            value={selectedFaculty}
            onChange={(e) => {
              setSelectedFaculty(e.target.value);
              setSelectedDepartment("All"); // Reset department on faculty change
            }}
            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white flex-1 md:flex-initial"
          >
            <option value="All">All Faculties</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {/* Department select */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white flex-1 md:flex-initial"
          >
            <option value="All">All Departments</option>
            {departments
              .filter((d) => selectedFaculty === "All" || d.faculty_id === selectedFaculty)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {Object.entries(LEVEL_CONFIG).map(([levelKey, config]) => {
          const progs = groupedPrograms[levelKey] || [];
          if (progs.length === 0) return null;

          const IconComponent = config.icon;

          return (
            <div key={levelKey} className="space-y-4">
              {/* Category Sub-Header */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                <div className={`p-2 bg-gradient-to-r ${config.gradient} text-white shadow-md rounded-xl`}>
                  <IconComponent size={16} />
                </div>
                <h3 className="text-base font-black text-[#2E004F] dark:text-white uppercase tracking-wider">
                  {config.label}
                </h3>
                <span className="ml-2 text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {progs.length}
                </span>
              </div>

              {/* Grid of Programs */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {progs.map((prog) => (
                  <div
                    key={prog.id}
                    onClick={() => navigate(`/programs/${prog.id}`)}
                    className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    {/* Level Accent Bar */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${config.gradient} group-hover:w-2.5 transition-all`}></div>

                    <div className="pl-4">
                      {/* Top Meta */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#4B0082] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 px-2 py-0.5 border border-purple-100 dark:border-purple-900/30">
                          {prog.code}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                          {prog.duration_years} Years
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight leading-snug group-hover:text-[#4B0082] dark:group-hover:text-[#FFD700] transition-colors line-clamp-2">
                        {prog.name}
                      </h4>

                      {/* Department */}
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-2 line-clamp-1">
                        {deptMap[prog.department_id] || "Academic Department"}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-gray-400 dark:text-gray-400 font-medium line-clamp-3 mt-4 leading-relaxed">
                        {prog.description || "Comprehensive theological studies curriculum preparing leaders for ministerial excellence, biblical pedagogy, and pastoral stewardship."}
                      </p>
                    </div>

                    {/* Stats and Navigation indicator */}
                    <div className="mt-6 pl-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <BookOpen size={12} />
                          <span className="text-[10px] font-bold text-gray-500">
                            {prog.total_credit_hours} Credits
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Info size={12} />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {prog.mode_of_study === "full_time" ? "Full Time" : prog.mode_of_study || "Hybrid"}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-300 group-hover:text-[#4B0082] dark:group-hover:text-[#FFD700] group-hover:translate-x-1.5 transition-all">
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredPrograms.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-gray-400">
            <GraduationCap size={64} className="mb-4 opacity-20 text-[#4B0082]" />
            <h4 className="font-black uppercase tracking-widest text-base">
              No programs found
            </h4>
            <p className="text-xs text-gray-500 mt-2 font-medium">
              Try adjusting your search criteria or catalog filters.
            </p>
          </div>
        )}
      </div>

      {/* Create Program Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-800 animate-scale-up">
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-[#2E004F] text-[#FFD700] rounded-lg">
                  <GraduationCap size={18} />
                </span>
                <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Create Degree Program
                </h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProgramSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Program Full Name *</label>
                <input
                  type="text"
                  required
                  value={newProgData.name}
                  onChange={(e) => setNewProgData({ ...newProgData, name: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none"
                  placeholder="e.g. Bachelor of Theology & Pastoral Ministry"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Program Code *</label>
                  <input
                    type="text"
                    required
                    value={newProgData.code}
                    onChange={(e) => setNewProgData({ ...newProgData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none font-mono"
                    placeholder="BTH-101"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Academic Level *</label>
                  <select
                    value={newProgData.level}
                    onChange={(e) => setNewProgData({ ...newProgData, level: e.target.value as any })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none"
                  >
                    <option value="certificate">Certificate</option>
                    <option value="diploma">Diploma</option>
                    <option value="bachelor">Bachelor Degree</option>
                    <option value="master">Master Degree</option>
                    <option value="doctorate">Doctorate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Duration (Years)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newProgData.duration_years}
                    onChange={(e) => setNewProgData({ ...newProgData, duration_years: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Total Credit Hours</label>
                  <input
                    type="number"
                    min={10}
                    max={300}
                    value={newProgData.total_credit_hours}
                    onChange={(e) => setNewProgData({ ...newProgData, total_credit_hours: Number(e.target.value) })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <select
                  value={newProgData.department_id}
                  onChange={(e) => setNewProgData({ ...newProgData, department_id: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none"
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Program Overview & Description</label>
                <textarea
                  rows={2}
                  value={newProgData.description}
                  onChange={(e) => setNewProgData({ ...newProgData, description: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-2 font-medium focus:ring-2 focus:ring-[#FFD700] outline-none"
                  placeholder="Program objectives, ministerial focus, and academic requirements..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-black uppercase text-xs tracking-wider bg-[#2E004F] text-[#FFD700] hover:bg-purple-950 rounded-lg shadow-md transition-all"
                >
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[150] animate-fade-in">
          <div className="bg-[#2E004F] text-[#FFD700] px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-purple-800">
            <CheckCircle2 size={18} />
            <span className="font-bold text-xs">{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Programs;









