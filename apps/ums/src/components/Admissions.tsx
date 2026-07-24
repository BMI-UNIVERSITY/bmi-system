import { useState, useEffect } from "react";
import { Search, ClipboardList, CheckCircle, XCircle, Clock, Eye, AlertCircle } from "lucide-react";
import { admissionsService, Application, StatusLogEntry } from "../services/admissionsService";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  submitted: "bg-blue-100 text-blue-700 border-blue-200",
  under_review: "bg-yellow-100 text-yellow-700 border-yellow-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  waitlisted: "bg-purple-100 text-purple-700 border-purple-200",
};

const NEXT_STATUSES: Record<string, string[]> = {
  draft: [],
  submitted: ["under_review", "rejected"],
  under_review: ["accepted", "rejected", "waitlisted"],
  accepted: [],
  rejected: ["under_review"],
  waitlisted: ["accepted", "rejected"],
};

export default function Admissions() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [appDetails, setAppDetails] = useState<Application | null>(null);
  const [logs, setLogs] = useState<StatusLogEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadApplications();
  }, [filter]);

  const loadApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await admissionsService.listApplications(filter ? { status: filter } : {});
      setApps(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApp = async (app: Application) => {
    setSelectedApp(app);
    setAppDetails(null);
    setLogs([]);
    setNotes("");
    try {
      const [details, auditLogs] = await Promise.all([
        admissionsService.getApplication(app.id),
        admissionsService.getStatusLogs(app.id).catch(() => [])
      ]);
      setAppDetails(details);
      setLogs(auditLogs);
    } catch {
      setError("Failed to load full application details");
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      await admissionsService.updateStatus(selectedApp.id, newStatus, notes);
      setSuccess(`Application updated to ${newStatus.replace("_", " ")}`);
      setSelectedApp(null);
      loadApplications();
      
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  // Stats
  const stats = {
    total: apps.length,
    submitted: apps.filter(a => a.status === "submitted").length,
    under_review: apps.filter(a => a.status === "under_review").length,
    accepted: apps.filter(a => a.status === "accepted").length,
  };

  // Filter local search
  const filteredApps = apps.filter(a => {
    const term = search.toLowerCase();
    return (
      a.first_name.toLowerCase().includes(term) ||
      a.last_name.toLowerCase().includes(term) ||
      a.email.toLowerCase().includes(term) ||
      a.program.toLowerCase().includes(term)
    );
  });

  return (
    <div className="h-full flex flex-col p-6 max-w-7xl mx-auto w-full relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-[#FFD700]" /> Admissions Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review and process student applications.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
          <button onClick={() => setError("")} className="ml-auto">✕</button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 border-t-4 border-t-blue-500">
          <div className="text-3xl font-black text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm font-semibold text-gray-500">Total Applications</div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 border-t-4 border-t-blue-300">
          <div className="text-3xl font-black text-blue-500">{stats.submitted}</div>
          <div className="text-sm font-semibold text-gray-500">Awaiting Review</div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 border-t-4 border-t-yellow-500">
          <div className="text-3xl font-black text-yellow-500">{stats.under_review}</div>
          <div className="text-sm font-semibold text-gray-500">Under Review</div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 border-t-4 border-t-green-500">
          <div className="text-3xl font-black text-green-500">{stats.accepted}</div>
          <div className="text-sm font-semibold text-gray-500">Accepted</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search applicants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD700] dark:text-white"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap bg-white dark:bg-[#1a1a1a] p-1 rounded-lg border border-gray-200 dark:border-gray-800">
          {["", "submitted", "under_review", "accepted", "rejected", "waitlisted"].map(s => (
            <button
              key={s || "all"}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === s
                  ? "bg-[#2a2a2a] text-[#FFD700] shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              {s ? s.replace("_", " ").toUpperCase() : "ALL"}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col min-h-0">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#FFD700] rounded-full animate-spin"></div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500">
            <ClipboardList size={48} className="mb-4 opacity-20" />
            <p>No applications found.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-400 sticky top-0 uppercase font-semibold text-xs border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4">Applicant</th>
                  <th className="px-6 py-4">Program</th>
                  <th className="px-6 py-4">Level</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white">{app.first_name} {app.last_name}</div>
                      <div className="text-xs text-gray-500">{app.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{app.program}</td>
                    <td className="px-6 py-4 capitalize">{app.degree_level}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${STATUS_COLORS[app.status]}`}>
                        {app.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {app.submitted_at ? new Date(app.submitted_at + 'Z').toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleSelectApp(app)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-transparent dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                      >
                        <Eye size={16} /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side Panel (Details) */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="bg-white dark:bg-[#111] w-full max-w-xl h-full shadow-2xl flex flex-col animate-slide-in-right overflow-hidden border-l border-gray-200 dark:border-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Applicant Review
                </h2>
                <div className="text-sm text-gray-500 mt-1">{selectedApp.first_name} {selectedApp.last_name}</div>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Application Meta */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50">
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                  <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded border inline-block ${STATUS_COLORS[selectedApp.status]}`}>
                    {selectedApp.status.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Submitted On</div>
                  <div className="text-sm dark:text-gray-300 font-medium">{new Date(selectedApp.submitted_at + 'Z').toLocaleDateString()}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Program Selected</div>
                  <div className="text-sm font-bold text-[#FFD700]">{selectedApp.program} ({selectedApp.degree_level})</div>
                </div>
              </div>

              {/* Personal Details (Loaded asynchronously) */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">Applicant Profile</h3>
                {appDetails ? (
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Email</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Phone</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.phone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Date of Birth</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.date_of_birth ? new Date(appDetails.date_of_birth + 'Z').toLocaleDateString() : "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Gender</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.gender || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Nationality</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.nationality || "—"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block text-xs">Address</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.address || "—"}</span>
                    </div>
                    <div className="col-span-2 border-t border-gray-200 dark:border-gray-800 pt-3 mt-1">
                      <span className="text-gray-900 dark:text-white font-bold text-xs uppercase tracking-wider mb-2 block">Academic History</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">High School</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.high_school || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">Graduation Year</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.graduation_year || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">GPA</span>
                      <span className="dark:text-gray-300 font-medium">{appDetails.gpa || "—"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded"></div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-5/6"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Audit Logs */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2 mb-4 flex justify-between">
                  Status Timeline
                </h3>
                {logs.length > 0 ? (
                  <div className="space-y-4">
                    {logs.map((log, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-0.5 flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          {i < logs.length - 1 && <div className="w-px h-full bg-gray-200 dark:bg-gray-800 my-1"></div>}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="text-sm dark:text-gray-300">
                            Changed to <span className="font-bold">{log.new_status.replace('_', ' ')}</span> by {log.changed_by_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock size={12} /> {new Date(log.changed_at + 'Z').toLocaleString()}
                          </div>
                          {log.notes && (
                            <div className="mt-2 text-sm bg-gray-50 dark:bg-gray-800/50 p-2 rounded text-gray-600 dark:text-gray-400 italic">
                              "{log.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">No timeline events found.</div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
              {NEXT_STATUSES[selectedApp.status]?.length > 0 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">INTERNAL NOTES (Optional)</label>
                    <textarea 
                      className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#FFD700] outline-none dark:text-white" 
                      rows={2} 
                      placeholder="Add review notes here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="flex gap-2">
                    {NEXT_STATUSES[selectedApp.status].map(status => (
                      <button
                        key={status}
                        disabled={updating}
                        onClick={() => handleUpdateStatus(status)}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold text-white shadow-sm transition-all
                          ${status === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 
                            status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 
                            'bg-blue-600 hover:bg-blue-700'}`}
                      >
                        {updating ? 'Processing...' : status === 'accepted' ? 'Approve Admission' : status === 'rejected' ? 'Decline' : 'Mark ' + status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-gray-500 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                  This application has reached a final status and cannot be modified further.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
