import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useStudents, useCourses, useApplications, useBooks } from '../../hooks/api';
import { Search, X, User, BookOpen, FileCheck, Book } from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { setActiveStudentId, setCurrentPortal, setActiveRole } = useAuthStore();
  const { data: _students } = useStudents();
  const students = _students || [];
  const { data: _courses } = useCourses();
  const courses = _courses || [];
  const { data: _applications } = useApplications();
  const applications = _applications || [];
  const { data: _libraryBooks } = useBooks();
  const libraryBooks = _libraryBooks || [];
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredStudents = query.trim()
    ? students.filter(s => 
        s.firstName.toLowerCase().includes(query.toLowerCase()) ||
        s.lastName.toLowerCase().includes(query.toLowerCase()) ||
        s.studentNumber.toLowerCase().includes(query.toLowerCase()) ||
        s.program.toLowerCase().includes(query.toLowerCase())
      )
    : students.slice(0, 3);

  const filteredCourses = query.trim()
    ? courses.filter(c =>
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.instructorName.toLowerCase().includes(query.toLowerCase())
      )
    : courses.slice(0, 3);

  const filteredApplications = query.trim()
    ? applications.filter(a =>
        a.applicantName.toLowerCase().includes(query.toLowerCase()) ||
        a.applicationNumber.toLowerCase().includes(query.toLowerCase()) ||
        a.programApplied.toLowerCase().includes(query.toLowerCase())
      )
    : applications.slice(0, 2);

  const filteredBooks = query.trim()
    ? libraryBooks.filter(b =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase()) ||
        b.isbn.includes(query)
      )
    : libraryBooks.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center space-x-3 bg-slate-900">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students, courses, applications, library books... (e.g. CSC301, Alex, ADM-2026)"
            className="w-full bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4 text-xs">
          
          {/* Students Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold mb-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>STUDENTS (SIS RECORD)</span>
            </div>
            <div className="space-y-1">
              {filteredStudents.map(std => (
                <div
                  key={std.id}
                  onClick={() => {
                    setActiveStudentId(std.id);
                    setCurrentPortal('student');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-900/30 border border-slate-700/50 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div className="flex items-center space-x-3">
                    <img src={std.avatarUrl} className="w-8 h-8 rounded-full object-cover ring-1 ring-indigo-400" />
                    <div>
                      <p className="font-semibold text-white">{std.firstName} {std.lastName}</p>
                      <p className="text-[10px] text-slate-400">{std.studentNumber} • {std.program}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px]">
                    <span className="text-emerald-400 font-bold">GPA: {std.gpa}</span>
                    <p className="text-[10px] text-slate-400">{std.academicStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Courses Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>COURSES & CURRICULUM</span>
            </div>
            <div className="space-y-1">
              {filteredCourses.map(crs => (
                <div
                  key={crs.id}
                  onClick={() => {
                    setCurrentPortal('staff');
                    setActiveRole('registrar');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-blue-900/30 border border-slate-700/50 hover:border-blue-500/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-mono font-bold text-blue-300 mr-2">{crs.code}</span>
                    <span className="font-semibold text-white">{crs.title}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{crs.schedule} • Instructor: {crs.instructorName}</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded bg-slate-700 text-slate-300">
                    {crs.enrolledCount}/{crs.capacity} Enrolled
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Applications Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold mb-2">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ADMISSIONS PIPELINE</span>
            </div>
            <div className="space-y-1">
              {filteredApplications.map(app => (
                <div
                  key={app.id}
                  onClick={() => {
                    setCurrentPortal('staff');
                    setActiveRole('admissions');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-emerald-900/30 border border-slate-700/50 hover:border-emerald-500/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-mono font-bold text-emerald-300 mr-2">{app.applicationNumber}</span>
                    <span className="font-semibold text-white">{app.applicantName}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{app.programApplied} • GPA: {app.highSchoolGPA}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {app.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Library Section */}
          <div>
            <div className="flex items-center space-x-1.5 text-slate-400 font-semibold mb-2">
              <Book className="w-3.5 h-3.5 text-amber-400" />
              <span>CAMPUS LIBRARY CATALOG</span>
            </div>
            <div className="space-y-1">
              {filteredBooks.map(bk => (
                <div
                  key={bk.id}
                  onClick={() => {
                    setCurrentPortal('staff');
                    setActiveRole('librarian');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-amber-900/30 border border-slate-700/50 hover:border-amber-500/50 cursor-pointer flex items-center justify-between transition"
                >
                  <div>
                    <span className="font-semibold text-white">{bk.title}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Author: {bk.author} • ISBN: {bk.isbn}</p>
                  </div>
                  <span className="text-[10px] text-amber-300 font-mono">
                    {bk.availableCopies}/{bk.totalCopies} Copies
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-center text-[11px] text-slate-400">
          Click any item to jump directly to its role dashboard or student record
        </div>

      </div>
    </div>
  );
};
