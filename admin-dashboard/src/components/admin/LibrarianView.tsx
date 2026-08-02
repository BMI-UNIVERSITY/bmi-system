import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useBooks, useLoans, useStudents } from '../../hooks/api';
import { Book, CheckCircle2, Clock, Search, Plus, X, ArrowUpRight, Check } from 'lucide-react';

export const LibrarianView: React.FC = () => {
  const { data: _libraryBooks } = useBooks();
  const libraryBooks = _libraryBooks || [];
  const { data: _libraryLoans } = useLoans();
  const libraryLoans = _libraryLoans || [];
  const { data: _students } = useStudents();
  const students = _students || [];
  const { addLibraryBook, checkoutLibraryBook, returnLibraryBook } = useApp();
  
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // New Book Form
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('978-0131103627');
  const [copies, setCopies] = useState(5);
  const [shelf, setShelf] = useState('Section A-3');

  // Checkout Form
  const [selectedBookId, setSelectedBookId] = useState(libraryBooks[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');

  const filteredBooks = libraryBooks.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) return;

    addLibraryBook({
      title,
      author,
      isbn,
      totalCopies: copies,
      category: 'Computer Science',
      locationShelf: shelf
    });

    setShowAddModal(false);
    setTitle('');
    setAuthor('');
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookId || !selectedStudentId) return;

    checkoutLibraryBook(selectedBookId, selectedStudentId);
    setShowCheckoutModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Book className="w-6 h-6 text-indigo-400" />
            <span>Library Management & Circulation Desk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Catalog indexing, loan checkout/returns tracking, and overdue fine collection.
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs border border-slate-700 transition flex items-center space-x-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Checkout Loan</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg transition flex items-center space-x-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Book to Catalog</span>
          </button>
        </div>
      </div>

      {/* Book Catalog Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-bold text-white text-base">Book Inventory & Catalog</h2>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog by title, author, ISBN..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-white placeholder-slate-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredBooks.map(bk => (
            <div key={bk.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">{bk.title}</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Author: {bk.author} • ISBN: {bk.isbn} • {bk.locationShelf}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-indigo-300 text-sm">{bk.availableCopies} / {bk.totalCopies} Available</span>
                <span className="block text-[10px] text-emerald-400 mt-0.5 font-bold uppercase">In Circulation</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Loans Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-4">
        <h2 className="font-bold text-white text-base">Circulation Active Loans & Returns</h2>

        <div className="space-y-2">
          {libraryLoans.map(loan => {
            const book = libraryBooks.find(b => b.id === loan.bookId);
            const student = students.find(s => s.id === loan.studentId);
            return (
              <div key={loan.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{book?.title || 'Catalog Item'}</p>
                  <p className="text-slate-400 text-[11px]">Borrowed by: <strong className="text-indigo-300">{student?.firstName} {student?.lastName}</strong> ({student?.studentNumber}) • Due Date: {loan.dueDate}</p>
                </div>

                <div>
                  {loan.status !== 'Returned' ? (
                    <button
                      onClick={() => returnLibraryBook(loan.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Process Return</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-800 text-emerald-400 font-bold rounded-lg text-[10px] uppercase">Returned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Add Book to Library Catalog</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Book Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Clean Architecture"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Robert C. Martin"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ISBN</label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Copies Available</label>
                  <input
                    type="number"
                    value={copies}
                    onChange={(e) => setCopies(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Add to Index
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base">Checkout Book Loan</h2>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Book</label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {libraryBooks.map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.availableCopies} avail)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
              >
                Issue Circulation Loan
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
