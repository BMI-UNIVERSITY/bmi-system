# Martin Njoroge Ndung'u Grade Analysis

**Student Information:**
- Full Name: Martin Njoroge Ndung'u
- Admission No: KEN-DP 225-538
- Student Code: 2025-008
- Campus: Mukurweini
- Programme: Diploma in Theology & Christian Ministry

## Grades from CSV (Column 3)

| No. | Course Name | Score | Course Code | Grade | Grade Point | Status |
|-----|-------------|-------|-------------|-------|-------------|--------|
| 1 | HERMENEUTICS | 89 | HER 114 | A | 4.0 | ✓ Exists |
| 2 | HOMILETICS | 95 | HOM 121 | A | 4.0 | ✓ Exists |
| 3 | PNEUMATOLOGY | 78 | PNE 126 | B+ | 3.5 | ✓ Exists |
| 4 | PRINCIPLES OF SUCCESS | 95 | POS 217 | A | 4.0 | ✓ Exists |
| 5 | CHURCH ADMINSTRATION | 98 | CAD 212 | A | 4.0 | ✓ Exists |
| 6 | EVANGELISM | 96 | EVA 115 | A | 4.0 | ✓ Exists |
| 7 | ESCHATOLOGY | 96 | ESC 221 | A | 4.0 | ✓ Exists |
| 8 | CHRISTOLOGY | 83 | CHR 124 | A | 4.0 | ✓ Exists |
| 9 | ANGELOLOGY & DEMONOLOGY | 74 | ANG 222 | B | 3.0 | ✓ Exists |
| 10 | BIBLIOLOGY | 98 | BIB 113 | A | 4.0 | ✓ Exists |
| 11 | ANTHROPOLOGY & HARMATIOLOGY | 80 | ANH 223 | A | 4.0 | ✓ Exists |
| 12 | O.T. SURVEY | 90 | OTS 111 | A | 4.0 | ✓ Exists |
| 13 | N.T. SURVEY | 98 | NTS 112 | A | 4.0 | ✓ Exists |
| 14 | HEBREW LANGUAGE | 78 | HEB 312 | B+ | 3.5 | **MISSING** |
| 15 | GREEK LANGUAGE | 87 | GRK 311 | A | 4.0 | **MISSING** |
| 16 | PRAISE & WORSHIP | 78 | PRW 127 | B+ | 3.5 | ✓ Exists |
| 17 | SPIRITUAL FORMATION | 100 | SPF 216 | A | 4.0 | ✓ Exists |
| 18 | CHURCH PLANTING | 90 | CHP 214 | A | 4.0 | ✓ Exists |
| 19 | BASIC ENGLISH GRAMMAR | 92 | ENG 101 | A | 4.0 | **MISSING** |
| 20 | ACADEMIC WRITING | 90 | AWR 102 | A | 4.0 | **MISSING** |
| 21 | ECCLESIOLOGY | 92 | ECC 211 | A | 4.0 | ✓ Exists |
| 22 | KINGDOM PRINCIPLES | 98 | UKP 218 | A | 4.0 | ✓ Exists |

## Summary

- **Total Courses in CSV**: 22
- **Already in Database**: 18
- **Missing from Database**: 4

## Missing Grades to Add

1. **HEBREW LANGUAGE (HEB 312)**: 78 → B+ (3.5)
2. **GREEK LANGUAGE (GRK 311)**: 87 → A (4.0)
3. **BASIC ENGLISH GRAMMAR (ENG 101)**: 92 → A (4.0)
4. **ACADEMIC WRITING (AWR 102)**: 90 → A (4.0)

## SQL Insert Statements

```sql
-- Add missing grades for Martin Njoroge Ndung'u (2025-008)

INSERT INTO academic_records (student_code, course_code, total_score, grade, grade_point, remarks, academic_year)
VALUES 
  ('2025-008', 'HEB 312', 78, 'B+', 3.5, 'Pass', '2025'),
  ('2025-008', 'GRK 311', 87, 'A', 4.0, 'Pass', '2025'),
  ('2025-008', 'ENG 101', 92, 'A', 4.0, 'Pass', '2025'),
  ('2025-008', 'AWR 102', 90, 'A', 4.0, 'Pass', '2025');
```

## CSV Format for Import

```csv
student_code,course_code,total_score,ca_score,exam_score,grade,grade_point,remarks,academic_year
2025-008,HEB 312,78,,,B+,3.5,Pass,2025
2025-008,GRK 311,87,,,A,4,Pass,2025
2025-008,ENG 101,92,,,A,4,Pass,2025
2025-008,AWR 102,90,,,A,4,Pass,2025
```
