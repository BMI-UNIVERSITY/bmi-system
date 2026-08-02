import os

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for target, replacement in replacements:
        if target in content:
            content = content.replace(target, replacement)
        else:
            print(f"Target not found in {filepath}:\n{target[:100]}...")
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Patch Alumni.tsx
alumni_path = r"D:\BMI\apps\ums\src\components\Alumni.tsx"
alumni_replacements = [
    (
        'const [searchTerm, setSearchTerm] = useState("");',
        'const [activeTab, setActiveTab] = useState<"Registry" | "Events" | "Donations">("Registry");\n  const [searchTerm, setSearchTerm] = useState("");\n  const [events, setEvents] = useState([{id: 1, title: "Annual Alumni Gala", date: "2024-12-01", location: "Grand Hall", capacity: 500}]);\n  const [donations, setDonations] = useState([{id: 1, alumniId: "ALM-101", amount: "5000", purpose: "Scholarship Fund", donatedAt: "2024-05-15"}]);'
    ),
    (
        '{/* Cohort Tabs & Filter Bar */}',
        '''{/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6 gap-2">
        {(["Registry", "Events", "Donations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-bold text-xs uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#2E004F] text-[#2E004F] dark:border-[#FFD700] dark:text-[#FFD700]"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Registry" && (
        <>
          {/* Cohort Tabs & Filter Bar */}'''
    ),
    (
        '{/* Edit / Add Alumni Modal */}',
        '''</>
      )}

      {activeTab === "Events" && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold">Alumni Events</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr><th className="p-4">Title</th><th className="p-4">Date</th><th className="p-4">Location</th><th className="p-4">Capacity</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 font-bold">{e.title}</td>
                    <td className="p-4">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="p-4">{e.location}</td>
                    <td className="p-4">{e.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}

      {activeTab === "Donations" && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-bold">Donation Records</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr><th className="p-4">Alumni ID</th><th className="p-4">Amount</th><th className="p-4">Purpose</th><th className="p-4">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 font-bold">#{d.alumniId}</td>
                    <td className="p-4 font-bold text-emerald-600">GHS {parseFloat(d.amount).toFixed(2)}</td>
                    <td className="p-4">{d.purpose}</td>
                    <td className="p-4">{new Date(d.donatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      )}

      {/* Edit / Add Alumni Modal */}'''
    )
]
patch_file(alumni_path, alumni_replacements)

# Patch Staff.tsx
staff_path = r"D:\BMI\apps\ums\src\components\Staff.tsx"
staff_replacements = [
    (
        '"All" | "Academic" | "Administrative" | "Management"',
        '"All" | "Academic" | "Administrative" | "Management" | "Leave Requests"'
    ),
    (
        '["All", "Academic", "Administrative", "Management"].map',
        '["All", "Academic", "Administrative", "Management", "Leave Requests"].map'
    ),
    (
        'const filteredStaff =',
        'const [leaveRequests, setLeaveRequests] = useState([{id: 1, staffId: "EMP-001", startDate: "2024-06-01", endDate: "2024-06-15", reason: "Medical", status: "pending"}]);\n  const filteredStaff ='
    ),
    (
        '{/* Search & Filter Bar */}',
        '''{activeTab === "Leave Requests" ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-none border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold uppercase tracking-widest text-[#2E004F] dark:text-white">Leave Requests</h3>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4 uppercase tracking-widest text-xs font-bold text-gray-500">Staff ID</th>
                  <th className="p-4 uppercase tracking-widest text-xs font-bold text-gray-500">Start</th>
                  <th className="p-4 uppercase tracking-widest text-xs font-bold text-gray-500">End</th>
                  <th className="p-4 uppercase tracking-widest text-xs font-bold text-gray-500">Reason</th>
                  <th className="p-4 uppercase tracking-widest text-xs font-bold text-gray-500">Status</th>
                  <th className="p-4 uppercase tracking-widest text-xs font-bold text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leaveRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 font-bold text-[#4B0082] dark:text-[#FFD700]">#{r.staffId}</td>
                    <td className="p-4">{r.startDate}</td>
                    <td className="p-4">{r.endDate}</td>
                    <td className="p-4">{r.reason}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-widest border ${
                        r.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        r.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-yellow-50 text-yellow-700 border-yellow-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setLeaveRequests(prev => prev.map(req => req.id === r.id ? {...req, status: 'approved'} : req))}
                            className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest hover:bg-green-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setLeaveRequests(prev => prev.map(req => req.id === r.id ? {...req, status: 'rejected'} : req))}
                            className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
        {/* Search & Filter Bar */}'''
    ),
    (
        '{/* Registration Modal */}',
        '''</>
      )}

      {/* Registration Modal */}'''
    )
]
patch_file(staff_path, staff_replacements)

# Patch Hostels.tsx (adding Transport)
hostels_path = r"D:\BMI\apps\ums\src\components\Hostels.tsx"
hostels_replacements = [
    (
        'const [activeTab, setActiveTab] = useState<"halls" | "registry">("halls");',
        'const [activeTab, setActiveTab] = useState<"halls" | "registry" | "transport">("halls");\n  const [routes, setRoutes] = useState([{id: 1, routeName: "Main Campus - City Center", vehicleNumber: "KAB 123C"}]);\n  const [passes, setPasses] = useState([{id: 1, routeId: 1, routeName: "Main Campus - City Center", validUntil: "2024-12-31"}]);'
    ),
    (
        '<button\n          onClick={() => setActiveTab("registry")}',
        '''<button
          onClick={() => setActiveTab("transport")}
          className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "transport"
              ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
          }`}
        >
          <Building2
            size={12}
            className={
              activeTab === "transport" ? "text-[#FFD700]" : "text-gray-400"
            }
          />{" "}
          Transport Routes
        </button>
        <button
          onClick={() => setActiveTab("registry")}'''
    ),
    (
        '{activeTab === "halls" ? (',
        '''{activeTab === "transport" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden rounded-none">
              <div className="p-6 bg-gray-900 text-white border-b border-gray-800">
                <h3 className="font-black text-xs uppercase tracking-[0.25em]">Transport Routes</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                  <tr><th className="px-6 py-5">Route</th><th className="px-6 py-5">Vehicle</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {routes.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-5 font-bold text-sm">{r.routeName}</td>
                      <td className="px-6 py-5 text-gray-500">{r.vehicleNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden rounded-none">
              <div className="p-6 bg-gray-900 text-white border-b border-gray-800">
                <h3 className="font-black text-xs uppercase tracking-[0.25em]">Issued Passes</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                  <tr><th className="px-6 py-5">Route</th><th className="px-6 py-5">Valid Until</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {passes.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-5 font-bold text-sm">{p.routeName}</td>
                      <td className="px-6 py-5 text-gray-500">{p.validUntil}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "halls" ? ('''
    )
]
patch_file(hostels_path, hostels_replacements)

# Patch Library.tsx
library_path = r"D:\BMI\apps\ums\src\components\Library.tsx"
library_replacements = [
    (
        'const [viewMode, setViewMode] = useState<"grid" | "list">("list");',
        'const [viewMode, setViewMode] = useState<"grid" | "list">("list");\n  const [activeTab, setActiveTab] = useState<"catalog" | "borrowings" | "fines">("catalog");\n  const [borrowings, setBorrowings] = useState([{id: 1, itemTitle: "Introduction to Algorithms", studentId: "STD-101", dueDate: "2024-06-15", status: "Overdue"}]);\n  const [fines, setFines] = useState([{id: 1, studentId: "STD-101", amount: "50", status: "Unpaid", reason: "Overdue Book"}]);'
    ),
    (
        '{categories.map((cat) => (',
        '''
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2"></div>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === "catalog" ? "bg-[#4B0082] text-white shadow-lg border border-purple-500/50" : "bg-white text-gray-500 border border-gray-200"
          }`}
        >Catalog</button>
        <button
          onClick={() => setActiveTab("borrowings")}
          className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === "borrowings" ? "bg-[#4B0082] text-white shadow-lg border border-purple-500/50" : "bg-white text-gray-500 border border-gray-200"
          }`}
        >Borrowings</button>
        <button
          onClick={() => setActiveTab("fines")}
          className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === "fines" ? "bg-[#4B0082] text-white shadow-lg border border-purple-500/50" : "bg-white text-gray-500 border border-gray-200"
          }`}
        >Fines</button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-2"></div>
        
        {categories.map((cat) => ('''
    ),
    (
        '{/* Main Listing View */}',
        '''{/* Main Listing View */}
        {activeTab === "borrowings" ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold uppercase tracking-widest">Borrowing Records</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="px-6 py-5">Item</th><th className="px-6 py-5">Student</th><th className="px-6 py-5">Due Date</th><th className="px-6 py-5">Status</th></tr>
              </thead>
              <tbody>
                {borrowings.map(b => (
                  <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-5 font-bold">{b.itemTitle}</td>
                    <td className="px-6 py-5">{b.studentId}</td>
                    <td className="px-6 py-5">{b.dueDate}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest border ${b.status === "Overdue" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "fines" ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold uppercase tracking-widest">Library Fines</h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <tr><th className="px-6 py-5">Student ID</th><th className="px-6 py-5">Amount</th><th className="px-6 py-5">Reason</th><th className="px-6 py-5">Status</th><th className="px-6 py-5 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {fines.map(f => (
                  <tr key={f.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-5 font-bold">{f.studentId}</td>
                    <td className="px-6 py-5 text-red-600 font-bold">GHS {f.amount}</td>
                    <td className="px-6 py-5">{f.reason}</td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest border ${f.status === "Unpaid" ? "bg-red-50 text-red-700 border-red-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {f.status === "Unpaid" && (
                        <button onClick={() => setFines(prev => prev.map(x => x.id === f.id ? {...x, status: "Paid"} : x))} className="px-4 py-2 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest">Mark Paid</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === "grid" ? ('''
    ),
    (
        '{selectedItem && (',
        ''') : (
        <></>
        )}
        
        {selectedItem && ('''
    )
]
patch_file(library_path, library_replacements)

# Patch Dashboard Overview
dashboard_path = r"D:\BMI\apps\ums\src\components\Dashboard.tsx"
dashboard_replacements = [
    (
        '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">',
        '''<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-none shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-none"><Users size={24} /></div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Pending Leaves</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">12</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-none shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-none"><BookOpen size={24} /></div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Overdue Books</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">45</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-none shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-red-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-none"><DollarSign size={24} /></div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Unpaid Fines</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">GHS 2500</h3>
            </div>
          </div>
        </div>'''
    ),
    (
        'import { Users, BookOpen',
        'import { Users, BookOpen, DollarSign'
    )
]
if os.path.exists(dashboard_path):
    patch_file(dashboard_path, dashboard_replacements)
else:
    print("Dashboard.tsx not found, skipping...")

print("All files patched!")
