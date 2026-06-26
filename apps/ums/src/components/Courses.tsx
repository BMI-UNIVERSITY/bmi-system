/* eslint-disable */
/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  GraduationCap,
  BookMarked,
  Hash,
  Edit,
  Trash2,
  Info,
  LayoutGrid,
  List,
  Award,
  Library,
} from "lucide-react";
import { Course } from "../types";
import CourseModal from "./CourseModal";
import {
  createCourse as createCourseApi,
  deleteCourse as deleteCourseApi,
  updateCourse as updateCourseApi,
  getCourses,
} from "../services/courseService";
import { BulkEntryModal } from "./BulkEntryModal";
import { postCourseBatch } from "../services/batchService";
import { useDataStore } from "../stores/dataStore";
import { usePagination } from "../hooks/usePagination";
import { useCoursesQuery } from "../hooks/useEntityQueries";
import { useQueryClient } from "@tanstack/react-query";

const Courses: React.FC = () => {
  const courses = useDataStore((s) => s.courses);
  const _setCourses = useDataStore((s) => s.setCourses);
  const setCourses = (action: React.SetStateAction<Course[]>) => {
    if (typeof action === "function") {
      _setCourses(
        (action as (prev: Course[]) => Course[])(
          useDataStore.getState().courses,
        ),
      );
    } else {
      _setCourses(action);
    }
  };
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeLevel, setActiveLevel] = useState("All Levels");
  const [facultyFilter, setFacultyFilter] = useState("All Faculty");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [bulkCoursesOpen, setBulkCoursesOpen] = useState(false);
  const { page, perPage, meta, setPage, setMeta } = usePagination(50);
  const queryClient = useQueryClient();

  const {
    data: courseResponse,
    isLoading,
    isFetching,
  } = useCoursesQuery({
    page,
    perPage,
    search: searchTerm,
  });

  const pagedCourses = useMemo(
    () => (courseResponse?.success ? courseResponse.data : []),
    [courseResponse],
  );

  React.useEffect(() => {
    if (courseResponse?.success && courseResponse.meta) {
      setMeta(courseResponse.meta);
    }
  }, [courseResponse, setMeta]);

  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, facultyFilter, activeLevel, setPage]);

  const facultyOptions = useMemo(() => {
    const fromData = [
      ...new Set(courses.map((c) => c.faculty).filter(Boolean)),
    ];
    return ["All Faculty", ...fromData.sort()];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if ((pagedCourses && pagedCourses.length > 0) || isFetching)
      return pagedCourses || [];
    return courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFaculty =
        facultyFilter === "All Faculty" ||
        (course.faculty ?? "") === facultyFilter;

      let matchesLevel = true;
      if (activeLevel !== "All Levels") {
        if (activeLevel === "Undergraduate")
          matchesLevel = (course as any).level === "Undergraduate";
        else if (activeLevel === "Postgraduate")
          matchesLevel = (course as any).level === "Postgraduate";
        else if (activeLevel === "Diploma")
          matchesLevel = (course as any).level === "Diploma";
        else if (activeLevel === "Certificate")
          matchesLevel = (course as any).level === "Certificate";
        else if (activeLevel === "Masters")
          matchesLevel =
            course.title.includes("Master") ||
            course.title.includes("MA") ||
            course.title.includes("MDiv");
        else if (activeLevel === "PhD")
          matchesLevel =
            course.title.includes("Doctor") ||
            course.title.includes("PhD") ||
            course.code.startsWith("D");
      }

      return matchesSearch && matchesFaculty && matchesLevel;
    });
  }, [courses, searchTerm, facultyFilter, activeLevel]);

  const handleSave = async (courseData: Partial<Course>) => {
    if (editingCourse) {
      // Update existing course
      try {
        const result = await updateCourseApi(editingCourse.id, courseData);

        if (result.success) {
          // Use server response when available; fall back to local merge.
          const next = result.data
            ? result.data
            : ({ ...editingCourse, ...courseData } as Course);
          setCourses((prev) =>
            prev.map((c) => (c.id === editingCourse.id ? next : c)),
          );
          alert("Course updated successfully!");
        } else {
          console.warn(
            "Backend update failed, updating local state only",
            result.error,
          );
          setCourses((prev) =>
            prev.map((c) =>
              c.id === editingCourse.id
                ? ({ ...c, ...courseData } as Course)
                : c,
            ),
          );
          alert(
            "Course updated in local state (not saved to database). Backend may be offline.",
          );
        }
      } catch (error) { console.error("Error updating course:", error);
        setCourses((prev) =>
          prev.map((c) =>
            c.id === editingCourse.id ? ({ ...c, ...courseData  } as Course) : c,
          ),
        );
        alert(
          "Course updated in local state (not saved to database). Backend may be offline.",
        );
      }
    } else {
      // Add new course
      const newCourse: Course = {
        ...(courseData as Course),
        id: `CRS-${Math.floor(Math.random() * 9000) + 1000}`,
      };

      try {
        const result = await createCourseApi(newCourse);

        if (result.success) {
          setCourses((prev) => [result.data || newCourse, ...prev]);
          alert("Course added successfully!");
        } else {
          console.warn(
            "Backend save failed, adding to local state only",
            result.error,
          );
          setCourses((prev) => [newCourse, ...prev]);
          alert(
            "Course added to local state (not saved to database). Backend may be offline.",
          );
        }
      } catch (error) { console.error("Error saving course:", error);
        setCourses((prev) => [newCourse, ...prev]);
        alert(
          "Course added to local state (not saved to database). Backend may be offline.",
        );
       }
    }
    setEditingCourse(null);
  };

  const deleteCourse = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        const result = await deleteCourseApi(id);

        if (result.success) {
          setCourses((prev) => prev.filter((c) => c.id !== id));
          alert("Course deleted successfully!");
        } else {
          console.warn(
            "Backend delete failed, removing from local state only",
            result.error,
          );
          setCourses((prev) => prev.filter((c) => c.id !== id));
          alert(
            "Course removed from local state (not deleted from database). Backend may be offline.",
          );
        }
      } catch (error) { console.error("Error deleting course:", error);
        setCourses((prev) => prev.filter((c) => c.id !== id));
        alert(
          "Course removed from local state (not deleted from database). Backend may be offline.",
        );
       }
    }
  };

  const openModal = (course?: Course) => {
    setEditingCourse(course || null);
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Sticky Header */}
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2 shadow-sm min-h-[60px]">
        <div className="flex items-center gap-3 pl-14 w-full md:w-auto">
          <div className="w-1 h-5 bg-[#FFD700] rounded-none"></div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-lg font-bold text-[#2E004F] dark:text-white tracking-tight uppercase leading-none">
              Curriculum Management
            </h2>
            <p className="text-[8px] md:text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              BMI Institutional Course Catalog
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 pl-14 md:pl-0 w-full md:w-auto justify-end">
          <div className="flex bg-white dark:bg-gray-800 p-1 rounded-none shadow-sm border border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-all ${viewMode === "grid" ? "bg-[#4B0082] text-white" : "text-gray-400 hover:text-[#4B0082]"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-all ${viewMode === "list" ? "bg-[#4B0082] text-white" : "text-gray-400 hover:text-[#4B0082]"}`}
            >
              <List size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setBulkCoursesOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-700 text-white rounded-none shadow-xl hover:bg-indigo-900 transition-all font-black text-[9px] uppercase tracking-widest"
          >
            Bulk JSON
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#4B0082] text-white rounded-none shadow-xl hover:bg-black transition-all font-black text-[9px] uppercase tracking-widest border border-[#FFD700]/30"
          >
            <Plus size={12} className="text-[#FFD700]" /> New Course
          </button>
        </div>
      </div>

      {/* Sticky Top Tab Bar */}
      <div className="sticky top-[60px] z-30 bg-[#F8F9FA]/95 dark:bg-[#0a0015]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
        <div className="flex items-center gap-2 mr-4 text-gray-400">
          <BookMarked size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Programs
          </span>
        </div>
        {[
          { id: "All Levels", label: "All Programs", icon: Layers },
          { id: "Diploma", label: "Diploma", icon: BookMarked },
          { id: "Undergraduate", label: "Degree", icon: GraduationCap },
          { id: "Masters", label: "Masters", icon: Award },
          { id: "PhD", label: "PhD", icon: Library },
          { id: "Certificate", label: "Certificate", icon: Hash },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveLevel(tab.id)}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
              activeLevel === tab.id
                ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
            }`}
          >
            <tab.icon
              size={12}
              className={
                activeLevel === tab.id ? "text-[#FFD700]" : "text-gray-400"
              }
            />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pinned Filters */}
      <div className="sticky top-[110px] z-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by Course Name, Code or Description..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs dark:text-white focus:ring-1 focus:ring-[#4B0082]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={facultyFilter}
          onChange={(e) => setFacultyFilter(e.target.value)}
          className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] font-black uppercase outline-none cursor-pointer dark:text-white"
        >
          {facultyOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Grid or List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 flex flex-col group hover:shadow-2xl transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[#4B0082] group-hover:w-2 transition-all"></div>

                <div className="flex justify-between items-start mb-4 pl-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {course.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border ${
                      (course as any).status === "Published"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : (course as any).status === "Draft"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-50 text-gray-500 border-gray-200"
                    }`}
                  >
                    {(course as any).status}
                  </span>
                </div>

                <div className="pl-4 mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none group-hover:text-[#4B0082] transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-[10px] font-bold text-[#4B0082] dark:text-purple-300 uppercase tracking-widest mt-2">
                    {(course as any).category ?? ""} • {(course as any).department}
                  </p>
                  <div className="mt-4 text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-3">
                    {(course as any).description}
                  </div>
                </div>

                <div className="mt-auto pl-4 pt-4 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                      <Info size={12} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500">
                      {course.credit_hours} Credits
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(course)}
                      className="p-2 text-gray-300 hover:text-[#4B0082] transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteCourse(course.id)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredCourses.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
                <Layers size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">
                  No curriculum modules found
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-none shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Sticky Grid Header */}
            <div className="sticky top-0 z-20 bg-gray-900 text-gray-400 uppercase text-[9px] font-black tracking-[0.2em] shadow-md border-b border-gray-800 grid grid-cols-[100px_2fr_1.5fr_100px_100px_80px] gap-4 items-center">
              <div className="px-6 py-4">Code</div>
              <div className="px-6 py-4">Course Title</div>
              <div className="px-6 py-4">Department</div>
              <div className="px-6 py-4 text-center">Credits</div>
              <div className="px-6 py-4 text-center">Status</div>
              <div className="px-6 py-4 text-right">Actions</div>
            </div>

            {/* Grid Body */}
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="hover:bg-purple-50/20 dark:hover:bg-gray-700/20 transition-all group grid grid-cols-[100px_2fr_1.5fr_100px_100px_80px] gap-4 items-center"
                >
                  <div className="px-6 py-5 font-mono text-xs font-bold text-[#4B0082] dark:text-purple-300 truncate">
                    {course.code}
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                      {course.title}
                    </p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                      {(course as any).level}
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase truncate">
                      {(course as any).department}
                    </p>
                    <p className="text-[9px] font-black text-[#4B0082] dark:text-purple-300 uppercase tracking-widest mt-0.5 truncate">
                      {(course as any).category ?? ""}
                    </p>
                  </div>
                  <div className="px-6 py-5 text-center font-bold text-gray-600 dark:text-gray-400 text-xs">
                    {course.credit_hours}
                  </div>
                  <div className="px-6 py-5 text-center">
                    <span
                      className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
                        (course as any).status === "Published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : (course as any).status === "Draft"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                      }`}
                    >
                      {(course as any).status}
                    </span>
                  </div>
                  <div className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openModal(course)}
                        className="p-2 text-gray-400 hover:text-[#4B0082]"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredCourses.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400 border-t border-gray-100 dark:border-gray-800">
                <Layers size={48} className="mb-4 opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">
                  No curriculum modules found
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Pagination Bar ────────────────────────────────────── */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-6 py-3 shadow-sm mt-6">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Page {meta.page} of {meta.totalPages}
              &nbsp;·&nbsp;{meta.total.toLocaleString()} courses
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(1)}
                disabled={meta.page === 1}
                className="px-2 py-1 text-[10px] font-black uppercase border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082] transition-all"
              >
                «
              </button>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={meta.page <= 1}
                className="px-3 py-1 text-[10px] font-black uppercase border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082] transition-all"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
                const p =
                  Math.max(1, Math.min(meta.totalPages - 4, page - 2)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-[10px] font-black uppercase border transition-all ${
                      p === meta.page
                        ? "bg-[#4B0082] text-white border-[#4B0082]"
                        : "border-gray-200 dark:border-gray-700 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
                disabled={meta.page >= meta.totalPages}
                className="px-3 py-1 text-[10px] font-black uppercase border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082] transition-all"
               >
                Next
              </button>
              <button
                onClick={() => setPage(meta.totalPages)}
                disabled={meta.page >= meta.totalPages}
                className="px-2 py-1 text-[10px] font-black uppercase border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-[#4B0082] hover:text-white hover:border-[#4B0082] transition-all"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      <CourseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editData={editingCourse}
      />

      <BulkEntryModal
        open={bulkCoursesOpen}
        onClose={() => setBulkCoursesOpen(false)}
        title="Bulk courses (JSON lines)"
        entity="courses"
        sampleLine='{"name":"Sample Course","code":"SMPL101","faculty":"Theology","department":"Ministry","level":"Undergraduate","credits":3,"status":"Published","description":"At least ten chars here.","syllabus":"At least ten chars in syllabus text."}'
        onSubmit={async (lines) => {
          try {
            const items = lines.map(
              (l) => JSON.parse(l) as Record<string, unknown>,
            );
            const r = await postCourseBatch(items);
            const list = await getCourses({ perPage: 500 });
            if (list.success && list.data) setCourses(list.data);
            return {
              ok: (r.data?.failureCount ?? 0) === 0,
              message: `Created: ${r.data?.successCount ?? 0}, failed: ${r.data?.failureCount ?? 0}.`,
            };
          } catch (error) {
            return { ok: false, message: "Invalid JSON on one or more lines." };
          }
        }}
      />

      <BulkEntryModal
        open={bulkCoursesOpen}
        onClose={() => setBulkCoursesOpen(false)}
        title="Bulk courses (JSON lines)"
        entity="courses"
        sampleLine='{"name":"Sample Course","code":"SMPL101","faculty":"Theology","department":"Ministry","level":"Undergraduate","credits":3,"status":"Published","description":"At least ten chars here.","syllabus":"At least ten chars in syllabus text."}'
        onSubmit={async (lines) => {
          try {
            const items = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
            const r = await postCourseBatch(items);
            const list = await getCourses({ perPage: 500 });
            if (list.success && list.data) setCourses(list.data);
            return {
              ok: (r.data?.failureCount ?? 0) === 0,
              message: `Created: ${r.data?.successCount ?? 0}, failed: ${r.data?.failureCount ?? 0}.`,
            };
          } catch {
            return { ok: false, message: 'Invalid JSON on one or more lines.' };
          }
        }}
      />
    </div>
  );
};

export default Courses;









