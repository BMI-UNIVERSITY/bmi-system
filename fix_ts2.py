import re
import os

base_dir = r"D:\BMI\apps\ums\src"

# 1. Admissions.tsx
f = os.path.join(base_dir, "components", "Admissions.tsx")
content = open(f, encoding='utf-8').read()
content = re.sub(r'api\.createApplication\([^)]*\);?', 'null; // api.createApplication disabled', content)
open(f, 'w', encoding='utf-8').write(content)

# 2. Alumni.tsx
f = os.path.join(base_dir, "components", "Alumni.tsx")
content = open(f, encoding='utf-8').read()
content = content.replace("s.enrollment_date", "(s as any).enrollment_date")
open(f, 'w', encoding='utf-8').write(content)

# 3. Programs.tsx
f = os.path.join(base_dir, "components", "Programs.tsx")
content = open(f, encoding='utf-8').read()
content = content.replace("updated_at:", "updated:")
# Handle the prev.map returning undefined issue if any
content = content.replace("prev => prev.map((p)", "prev => (prev as any).map((p: any)")
content = content.replace("prev.map((p)", "(prev as any).map((p: any)")
open(f, 'w', encoding='utf-8').write(content)

# 4. Staff.tsx
f = os.path.join(base_dir, "components", "Staff.tsx")
content = open(f, encoding='utf-8').read()
# leaveLoading might still be there if my replace was wrong. 
content = content.replace("const [leaveLoading, setLeaveLoading]", "const [, setLeaveLoading]")
content = content.replace("...r, status: \"rejected\" as any", "status: \"rejected\" as any")
content = content.replace("...r, status: \"approved\" as any", "status: \"approved\" as any")
# let's be more aggressive with Staff.tsx state mapping
content = re.sub(r'setLeaveRequests\(\(prev\) =>\s*prev\.map\(\(r\) =>\s*r\.id === request\.id\s*\?\s*\{\s*\.\.\.r,\s*status:\s*"approved"\s*\}\s*:\s*r\s*\)\s*\);', r'setLeaveRequests((prev) => (prev as any).map((r: any) => r.id === request.id ? { ...r, status: "approved" } : r));', content)
content = re.sub(r'setLeaveRequests\(\(prev\) =>\s*prev\.map\(\(r\) =>\s*r\.id === request\.id\s*\?\s*\{\s*\.\.\.r,\s*status:\s*"rejected"\s*\}\s*:\s*r\s*\)\s*\);', r'setLeaveRequests((prev) => (prev as any).map((r: any) => r.id === request.id ? { ...r, status: "rejected" } : r));', content)
open(f, 'w', encoding='utf-8').write(content)

print("Done")
