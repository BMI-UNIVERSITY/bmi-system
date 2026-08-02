import React, { useEffect, useState } from 'react';
import { adminApi, Book } from '../lib/api';

export const LibraryView: React.FC = () => {
  const [books, setBooks]         = useState<Book[]>([]);
  const [borrowings, setBorrowings] = useState<any[]>([]);
  const [fines, setFines]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'borrowing' | 'fines'>('catalog');
  const [returning, setReturning] = useState<number | null>(null);

  useEffect(() => {
    Promise.allSettled([
      adminApi.getBooks(),
      adminApi.getBorrowings(),
      adminApi.getFines(),
    ]).then(([b, br, f]) => {
      if (b.status === 'fulfilled')  setBooks(b.value);
      if (br.status === 'fulfilled') setBorrowings(br.value);
      if (f.status === 'fulfilled')  setFines(f.value);
    }).finally(() => setLoading(false));
  }, []);

  const handleReturn = async (id: number) => {
    setReturning(id);
    try {
      await adminApi.returnBook(id);
      setBorrowings((prev) => prev.map((b) => b.id === id ? { ...b, returnedAt: new Date().toISOString() } : b));
    } finally {
      setReturning(null);
    }
  };

  const filteredBooks = books.filter((b) =>
    `${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(search.toLowerCase())
  );
  const unpaidFines = fines.filter((f) => !f.isPaid).length;
  const overdue = borrowings.filter((b) => !b.returnedAt && new Date(b.dueDate) < new Date()).length;

  return (
    <div>
      <div className="page-header fade-up">
        <h1>Library Management</h1>
        <p>Manage the book catalog, track borrowings, and oversee outstanding fines.</p>
      </div>

      <div className="stat-grid fade-up fade-up-delay-1">
        <div className="stat-card"><div className="stat-icon blue">📚</div><div className="stat-body"><div className="stat-label">Books in Catalog</div><div className="stat-value">{books.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">📤</div><div className="stat-body"><div className="stat-label">Active Borrowings</div><div className="stat-value">{borrowings.filter(b => !b.returnedAt).length}</div></div></div>
        <div className="stat-card"><div className="stat-icon amber">⚠️</div><div className="stat-body"><div className="stat-label">Overdue Items</div><div className="stat-value">{overdue}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">💰</div><div className="stat-body"><div className="stat-label">Unpaid Fines</div><div className="stat-value">{unpaidFines}</div></div></div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }} className="fade-up fade-up-delay-2">
        {(['catalog', 'borrowing', 'fines'] as const).map((tab) => (
          <button
            key={tab}
            id={`library-tab-${tab}`}
            className={activeTab === tab ? 'btn btn-primary' : 'btn btn-ghost'}
            onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
          >
            {tab === 'catalog' ? '📚 Catalog' : tab === 'borrowing' ? '📤 Borrowings' : '💰 Fines'}
          </button>
        ))}
      </div>

      {/* Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="card fade-up">
          <div className="card-header">
            <div className="card-title">Book Catalog</div>
            <input
              className="form-input"
              placeholder="Search by title, author, or ISBN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '240px' }}
            />
          </div>
          {loading ? <div className="empty-state"><p>Loading…</p></div> : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>ISBN</th><th>Title</th><th>Author</th><th>Total</th><th>Available</th></tr></thead>
                <tbody>
                  {filteredBooks.map((b) => (
                    <tr key={b.id}>
                      <td>{b.isbn}</td>
                      <td><strong>{b.title}</strong></td>
                      <td>{b.author}</td>
                      <td>{b.copiesTotal}</td>
                      <td>
                        <span className={`badge ${b.copiesAvailable > 0 ? 'badge-green' : 'badge-red'}`}>
                          {b.copiesAvailable}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Borrowing Tab */}
      {activeTab === 'borrowing' && (
        <div className="card fade-up">
          <div className="card-header"><div className="card-title">Current Borrowings</div></div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Book</th><th>Borrowed</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {borrowings.map((b) => {
                  const isOverdue = !b.returnedAt && new Date(b.dueDate) < new Date();
                  return (
                    <tr key={b.id}>
                      <td><strong>{b.bookTitle ?? `Book #${b.bookId}`}</strong></td>
                      <td>{new Date(b.borrowedAt).toLocaleDateString()}</td>
                      <td>
                        {b.dueDate}
                        {isOverdue && <span className="badge badge-red" style={{ marginLeft: '6px' }}>Overdue</span>}
                      </td>
                      <td>
                        <span className={`badge ${b.returnedAt ? 'badge-green' : 'badge-blue'}`}>
                          {b.returnedAt ? 'Returned' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {!b.returnedAt && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                            disabled={returning === b.id}
                            onClick={() => handleReturn(b.id)}
                          >
                            {returning === b.id ? '…' : 'Mark Returned'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fines Tab */}
      {activeTab === 'fines' && (
        <div className="card fade-up">
          <div className="card-header"><div className="card-title">Library Fines</div></div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>ID</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id}>
                    <td><strong>#{f.id}</strong></td>
                    <td>GHS {parseFloat(f.amount).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${f.isPaid ? 'badge-green' : 'badge-red'}`}>
                        {f.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
