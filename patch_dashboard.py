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

staff_path = r"D:\BMI\apps\ums\src\components\Staff.tsx"
staff_replacements = [
    (
        '<div className="bg-white dark:bg-[#1a1a1a] p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6 space-y-3">',
        '''{activeTab === "Leave Requests" ? (
        <div className="flex-1 overflow-y-auto space-y-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
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
        <div className="bg-white dark:bg-[#1a1a1a] p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6 space-y-3">'''
    ),
    (
        '{isModalOpen && (',
        '''</>
      )}
      
      {isModalOpen && ('''
    )
]
if os.path.exists(staff_path):
    patch_file(staff_path, staff_replacements)


dashboard_path = r"D:\BMI\apps\ums\src\components\Dashboard.tsx"
dashboard_replacements = [
    (
        '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">',
        '''<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Pending Leaves
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">12</h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Overdue Books
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">45</h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <BookOpen size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                Unpaid Fines
              </p>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">GHS 2500</h3>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
        </div>'''
    ),
    (
        '  Clock,',
        '  Clock, BookOpen, DollarSign,'
    )
]

if os.path.exists(dashboard_path):
    patch_file(dashboard_path, dashboard_replacements)

print("Patch Dashboard and Staff Completed")
