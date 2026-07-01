# Program Centralization - Code Changes

## File 1: `apps/ums/src/components/Exams.tsx`

### Import Changes

```diff
  import {
    FileSpreadsheet,
    Calendar,
    Clock,
    GraduationCap,
    CheckCircle,
    AlertTriangle,
    Search,
    Plus,
    MapPin,
    ChevronRight,
    Printer,
    Download,
    Filter,
    FileText,
    ShieldCheck,
    UserCheck,
    Trophy,
    BookOpen,
    Layout,
    ClipboardList,
  } from "lucide-react";
+ import { PROGRAMS } from "@bmi/shared";
  import { Student, Course } from "../types";
  import ImportModal from "./ImportModal";
```

### Program Dropdown Changes

```diff
  <select
    value={selectedProgram}
    onChange={(e) => setSelectedProgram(e.target.value)}
    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-none text-xs font-bold uppercase outline-none focus:border-[#4B0082] dark:text-white"
  >
    <option>All Programs</option>
-   <option>Bachelor of Theology</option>
-   <option>B.Sc. Computer Science</option>
-   <option>Diploma in Christian Ministry and Theology</option>
-   <option>Masters in Divinity</option>
-   <option>PhD in Biblical Studies</option>
+   {PROGRAMS.map((program) => (
+     <option key={program.label} value={program.label}>
+       {program.label}
+     </option>
+   ))}
  </select>
```

**Impact:**
- Before: 5 hardcoded programs (3 of which don't match BMI's actual offerings)
- After: 18 official BMI programs dynamically rendered from shared package

---

## File 2: `apps/ums/src/components/AdmissionLetter.tsx`

### Import Changes

```diff
  import React, { useState, useMemo, useCallback } from 'react';
  import { 
    Search, Printer, Download, Mail, ShieldCheck, X, Calendar,
    CheckCircle, Sparkles, FileText, Building2, GraduationCap,
    MapPin, Phone, Globe, Hash, Send, Award
  } from 'lucide-react';
- import { PORTAL_URL, MARKETING_URL, ADMISSIONS_EMAIL } from '@bmi/shared';
+ import { PORTAL_URL, MARKETING_URL, ADMISSIONS_EMAIL, PROGRAMS } from '@bmi/shared';
  import { Student } from '../types';
```

### Initial State Changes

```diff
  const [letterConfig, setLetterConfig] = useState({
-   program: 'Bachelor of Science',
+   program: PROGRAMS[0].label, // Default to first program
    faculty: 'School of Science and Technology',
    semester: 'Fall 2024',
    reference: '',
  });
```

### Program Dropdown Changes

```diff
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Program</label>
    <select
      value={letterConfig.program}
      onChange={(e) => setLetterConfig({ ...letterConfig, program: e.target.value })}
      className={THEME.input}
    >
-     <option>Bachelor of Science</option>
-     <option>Bachelor of Arts</option>
-     <option>Bachelor of Commerce</option>
-     <option>Bachelor of Engineering</option>
-     <option>Master of Science</option>
-     <option>Master of Business Administration</option>
+     {PROGRAMS.map((program) => (
+       <option key={program.label} value={program.label}>
+         {program.label}
+       </option>
+     ))}
    </select>
  </div>
```

**Impact:**
- Before: 6 hardcoded programs (generic academic programs not matching BMI's theological focus)
- After: 18 official BMI programs (all focused on theology, ministry, and Christian education)

---

## Summary of Replacements

### Programs Removed (Incorrect/Non-existent)

**From Exams.tsx:**
- ❌ "Bachelor of Theology" (not in official catalog)
- ❌ "B.Sc. Computer Science" (not a BMI program)
- ❌ "Diploma in Christian Ministry and Theology" (not in official catalog)
- ❌ "Masters in Divinity" (incorrect naming - should be "Master of Divinity")
- ❌ "PhD in Biblical Studies" (not in official catalog)

**From AdmissionLetter.tsx:**
- ❌ "Bachelor of Science" (generic, not BMI-specific)
- ❌ "Bachelor of Arts" (generic, not BMI-specific)
- ❌ "Bachelor of Commerce" (not a BMI program)
- ❌ "Bachelor of Engineering" (not a BMI program)
- ❌ "Master of Science" (generic, not BMI-specific)
- ❌ "Master of Business Administration" (not a BMI program)

### Programs Added (Official BMI Catalog)

✅ **5 Undergraduate Programs:**
1. BA in Biblical Studies
2. BA in Christian Education
3. BA in Ministry Leadership
4. BA in Theological Studies
5. BA in Worship Leadership

✅ **6 Graduate Programs:**
1. Master of Divinity (MDiv)
2. MA in Christian Counseling
3. MA in Theology
4. MA in Christian Education
5. MA in Christian Apologetics
6. MA in Christian Leadership

✅ **3 Doctorate Programs:**
1. Doctor of Ministry (DMin)
2. Doctor of Theology (ThD)
3. Doctor of Christian Education

✅ **4 Certificate Programs:**
1. Graduate Certificate in Biblical Studies
2. Graduate Certificate in Christian Studies
3. Graduate Certificate in Spiritual Formation

---

## Benefits of Centralization

### 1. Data Consistency
- All components reference the same 18 programs
- No discrepancies between different UMS modules
- Single source of truth in `@bmi/shared`

### 2. Easy Updates
- Add new program: Edit `@bmi/shared/src/programs.ts` once
- Change program name: Update in one place, reflects everywhere
- Deprecate program: Remove from shared package

### 3. Type Safety
- Programs now have structured metadata (label, level, description)
- TypeScript interfaces ensure correct usage
- Compile-time validation of program data

### 4. Accurate Catalog
- All 18 programs now match BMI's actual offerings
- Consistent with marketing website and admissions portal
- Reflects BMI's theological and ministry focus
