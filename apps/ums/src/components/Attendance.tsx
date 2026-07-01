/* eslint-disable */
/* eslint-disable */
import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Users,
  BookOpen,
  Search,
  Save,
  Check,
  Loader2,
  X,
  History,
  Timer,
} from "lucide-react";
import { Student } from "../types";
import { useStudentsQuery } from "../hooks/useEntityQueries";
import { useApiDataStore } from "../stores/apiDataStore";

interface AttendanceState {
  [studentId: string]: "present" | "absent" | "late";
}

const Attendance: React.FC = () => {
  const { data: studentsRes, isLoading: isLoadingStudents } = useStudentsQuery({
    page: 1,
    perPage: 1000,
  });
  const students = studentsRes?.data?.items || [];
  
  const {
    attendanceRecords,
    fetchAttendance,
    createAttendanceRecord,
    updateAttendanceRecord,
  } = useApiDataStore();

  const [selectedCourse, setSelectedCourse] = useState("School of Theology");
  const [searchTerm, setSearchTerm] = useState("");
  const [attendance, setAttendance] = useState<AttendanceState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastMarkedAt, setLastMarkedAt] = useState<string | null>(null);

  // Explicit session timing state
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [sessionTime, setSessionTime] = useState(
    new Date().toTimeString().slice(0, 5),
  );

  const courses = [
    { name: "School of Theology", faculty: "Theology" },
    { name: "Dept. of ICT", faculty: "ICT" },
    { name: "School of Business", faculty: "Business" },
    { name: "Education Dept.", faculty: "Education" },
  ];

  useEffect(() => {
    fetchAttendance();
  }, []);

  const currentFaculty = useMemo(() => {
    return (
      courses.find((c) => c.name === selectedCourse)?.faculty || "Theology"
    );
  }, [selectedCourse]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const studentFaculty = (s.faculty || "").toLowerCase();
      const targetFaculty = currentFaculty.toLowerCase();
      const matchesFaculty =
        studentFaculty === targetFaculty ||
        studentFaculty.includes(targetFaculty) ||
        targetFaculty.includes(studentFaculty);

      const matchesSearch =
        `${s.first_name || ""} ${s.last_name || ""} ${s.reg_no || ""} ${s.id} ${s.department ?? ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesFaculty && matchesSearch;
    });
  }, [students, currentFaculty, searchTerm]);

  const existingRecord = useMemo(() => {
    return (attendanceRecords || []).find(
      (r) => r.courseId === selectedCourse && r.date === sessionDate
    );
  }, [attendanceRecords, selectedCourse, sessionDate]);

  useEffect(() => {
    if (existingRecord) {
      const state: AttendanceState = {};
      existingRecord.records.forEach((r) => {
        // Find matching student code or id in filtered list
        const s = students.find(stud => stud.reg_no === r.studentId || stud.id === r.studentId);
        if (s) {
          state[s.id] = r.status.toLowerCase() as any;
        }
      });
      setAttendance(state);
      if (existingRecord.updated) {
        setLastMarkedAt(new Date(existingRecord.updated).toLocaleString());
      }
    } else {
      setAttendance({});
      setLastMarkedAt(null);
    }
  }, [existingRecord, selectedCourse, sessionDate, students]);

  const handleMark = (id: string, status: "present" | "absent" | "late") => {
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === status ? "absent" : status, // Toggling back defaults to absent
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const recordsPayload = filteredStudents.map((s) => {
      const rawStatus = attendance[s.id] || "absent";
      const status = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as any;
      return {
        studentId: s.reg_no || s.id,
        studentName: `${s.first_name} ${s.last_name}`,
        status,
      };
    });

    let success = false;
    if (existingRecord) {
      const res = await updateAttendanceRecord(existingRecord.id, {
        courseId: selectedCourse,
        date: sessionDate,
        records: recordsPayload,
      });
      success = !!res;
    } else {
      const res = await createAttendanceRecord({
        courseId: selectedCourse,
        date: sessionDate,
        records: recordsPayload,
      });
      success = !!res;
    }

    setIsSubmitting(false);
    if (success) {
      setShowSuccess(true);
      const now = new Date();
      setLastMarkedAt(
        now.toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setTimeout(() => setShowSuccess(false), 3000);
      fetchAttendance(); // refresh the records
    } else {
      alert("Failed to commit attendance registry. Please try again.");
    }
  };

  const stats = useMemo(() => {
    let p = 0,
      l = 0,
      a = 0;
    filteredStudents.forEach((s) => {
      const status = attendance[s.id] || "absent";
      if (status === "present") p++;
      else if (status === "late") l++;
      else a++;
    });
    return { present: p, late: l, absent: a };
  }, [attendance, filteredStudents]);

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Sticky Header */}
      <div className="flex-shrink-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2 shadow-sm min-h-[60px]">
        <div className="flex items-center gap-3 pl-14 w-full md:w-auto">
          <div className="w-1 h-5 bg-[#FFD700] rounded-none"></div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-lg font-bold text-[#2E004F] dark:text-white tracking-tight uppercase leading-none">
              Institutional Attendance
            </h2>
            <p className="text-[8px] md:text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Live Session Monitoring • {currentFaculty}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-14 md:pl-0 w-full md:w-auto justify-end">
          {/* Date/Time Controls */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 border border-gray-100 dark:border-gray-700 shadow-sm hidden md:flex">
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700">
              <Calendar
                size={12}
                className="text-[#4B0082] dark:text-[#FFD700]"
              />
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 px-2 py-1">
              <Timer size={12} className="text-[#4B0082] dark:text-[#FFD700]" />
              <input
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase outline-none dark:text-white"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || filteredStudents.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-[#4B0082] text-white rounded-none shadow-xl hover:bg-black transition-all font-black text-[9px] uppercase tracking-widest border border-[#FFD700]/30 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Save size={12} className="text-[#FFD700]" />
            )}
            {existingRecord ? "Update Registry" : "Commit Registry"}
          </button>
        </div>
      </div>

      {/* Sticky Tab Bar - Modules */}
      <div className="flex-shrink-0 bg-[#F8F9FA]/95 dark:bg-[#0a0015]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
        <div className="flex items-center gap-2 mr-4 text-gray-400">
          <BookOpen size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Active Modules
          </span>
        </div>
        {courses.map((course) => (
          <button
            key={course.name}
            onClick={() => {
              setSelectedCourse(course.name);
            }}
            className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              selectedCourse === course.name
                ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
            }`}
          >
            {course.name}
          </button>
        ))}
      </div>

      {/* Pinned Metrics Row - MOVED OUTSIDE SCROLL CONTAINER TO FORCE PIN */}
      <div className="flex-shrink-0 bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 z-30 shadow-sm px-6 py-3">
        <div className="grid grid-cols-4 gap-4">
          {/* Present Card */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 border-l-[3px] border-emerald-500 pl-3 py-1 flex flex-col justify-center">
            <span className="text-[8px] font-black uppercase text-emerald-600 tracking-widest">
              Present
            </span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 leading-none">
              {stats.present}
            </span>
          </div>

          {/* Late Card */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border-l-[3px] border-amber-500 pl-3 py-1 flex flex-col justify-center">
            <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest">
              Late
            </span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-400 leading-none">
              {stats.late}
            </span>
          </div>

          {/* Absent Card */}
          <div className="bg-rose-50 dark:bg-rose-900/10 border-l-[3px] border-rose-500 pl-3 py-1 flex flex-col justify-center">
            <span className="text-[8px] font-black uppercase text-rose-600 tracking-widest">
              Absent
            </span>
            <span className="text-lg font-black text-rose-700 dark:text-rose-400 leading-none">
              {stats.absent}
            </span>
          </div>

          {/* Total Class Card */}
          <div className="bg-indigo-50 dark:bg-indigo-900/10 border-l-[3px] border-indigo-500 pl-3 py-1 flex flex-col justify-center">
            <span className="text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-300 tracking-widest">
              Total Class
            </span>
            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 leading-none">
              {filteredStudents.length}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-6 space-y-6">
          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row gap-4 items-center shadow-sm">
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search registry by ID, Name or Department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none outline-none font-bold text-xs dark:text-white focus:ring-1 focus:ring-[#4B0082]"
              />
            </div>
            {lastMarkedAt && (
              <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                <CheckCircle2 size={14} /> Last Save: {lastMarkedAt}
              </div>
            )}
          </div>

          {/* List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const currentStatus = attendance[student.id] || "absent";
                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-5 hover:bg-purple-50/30 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-none bg-purple-600 flex items-center justify-center font-bold text-white shadow-sm overflow-hidden`}
                        >
                          {student.photo ? (
                            <img
                              src={student.photo}
                              className="w-full h-full object-cover"
                              alt="S"
                            />
                          ) : (
                            student.first_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-tight">
                            {student.first_name} {student.last_name}
                          </p>
                          <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                            {student.reg_no || student.id} • {student.department}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-none border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleMark(student.id, "present")}
                          className={`px-4 py-2 rounded-none text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${currentStatus === "present" ? "bg-emerald-500 text-white shadow-md" : "text-gray-400 hover:text-emerald-500"}`}
                        >
                          <CheckCircle2 size={14} /> Present
                        </button>
                        <button
                          onClick={() => handleMark(student.id, "late")}
                          className={`px-4 py-2 rounded-none text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${currentStatus === "late" ? "bg-amber-500 text-white shadow-md" : "text-gray-400 hover:text-amber-500"}`}
                        >
                          <Clock size={14} /> Late
                        </button>
                        <button
                          onClick={() => handleMark(student.id, "absent")}
                          className={`px-4 py-2 rounded-none text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${currentStatus === "absent" ? "bg-red-500 text-white shadow-md font-black" : "text-gray-400 hover:text-red-500"}`}
                        >
                          <XCircle size={14} /> Absent
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                  No Students Identified in this Institutional Domain
                </div>
              )}
            </div>
          </div>

          {/* Footer Message */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-4 rounded-none">
            <div className="flex">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-amber-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-widest">
                  Institutional Protocol: Students not explicitly marked as
                  'Present' or 'Late' are automatically processed as 'Absent'.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-[120] animate-fade-in">
          <div className="bg-gray-900 text-[#FFD700] px-10 py-5 rounded-none shadow-2xl flex items-center gap-4 border-2 border-[#FFD700] backdrop-blur-xl">
            <Check size={24} className="animate-pulse" />
            <span className="font-black text-sm uppercase tracking-[0.25em] italic">
              Attendance Registry Successfully Committed
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;









