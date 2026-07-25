export interface NormalizedStudentRow {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
  program_name?: string;
  program_code?: string;
  study_center_name?: string;
  admission_date?: string;
  reg_no?: string;
  uid?: string;
  photo?: string;
  status?: string;

  _original: Record<string, string>;
  _unmatchedColumns: string[];
}

export interface ImportValidationResult {
  valid: NormalizedStudentRow[];
  errors: Array<{ row: number; message: string; original: Record<string, string> }>;
  warnings: Array<{ row: number; message: string; original: Record<string, string> }>;
  columnMapping: Record<string, string>;
  unmatchedColumns: string[];
}

type ColumnMapper = Record<string, string[]>;

const COLUMN_ALIASES: ColumnMapper = {
  first_name: ['first_name', 'firstname', 'first name', 'fname', 'given name', 'given_name', 'f_name', 'first'],
  last_name: ['last_name', 'lastname', 'last name', 'lname', 'surname', 'family name', 'family_name', 'l_name', 'last'],
  email: ['email', 'e-mail', 'email address', 'email_address', 'emailaddr', 'mail'],
  phone: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'phone number', 'phone_number', 'contact', 'contact_no'],
  gender: ['gender', 'sex', 'gendor'],
  date_of_birth: ['date_of_birth', 'dob', 'date of birth', 'birth date', 'birth_date', 'birthday'],
  nationality: ['nationality', 'nation', 'country', 'citizenship', 'national'],
  address: ['address', 'addr', 'residence', 'home address', 'home_address', 'current_address'],
  program_name: ['program', 'program_name', 'program name', 'programme', 'course', 'course_name', 'program of study', 'program_of_study', 'academic program'],
  program_code: ['program_code', 'program code', 'programme_code', 'course_code', 'course code', 'code'],
  study_center_name: ['study_center', 'campus', 'center', 'centre', 'study center', 'study_center_name', 'branch', 'location'],
  admission_date: ['admission_date', 'admission date', 'enrollment_date', 'enrollment date', 'enrolment date', 'start date', 'start_date', 'date_admitted'],
  reg_no: ['reg_no', 'regno', 'registration number', 'registration_number', 'student_id', 'student id', 'studentid', 'student number', 'student_number', 'admission_no', 'admission number'],
  uid: ['uid', 'unique id', 'unique_id', 'student uid', 'student_uid'],
  photo: ['photo', 'picture', 'image', 'avatar', 'photograph'],
  status: ['status', 'student_status', 'student status', 'enrollment status', 'enrollment_status'],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[_\s-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function fuzzyMatch(header: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(header);
  return aliases.some(alias => {
    const nAlias = normalizeHeader(alias);
    if (nAlias === normalized) return true;
    const aParts = nAlias.split(' ');
    const hParts = normalized.split(' ');
    if (aParts.length === 1 && hParts.length === 1) {
      if (hParts[0].startsWith(aParts[0]) || aParts[0].startsWith(hParts[0])) return true;
      if (aParts[0].length >= 3 && hParts[0].length >= 3) {
        let matches = 0;
        const shorter = Math.min(aParts[0].length, hParts[0].length);
        for (let i = 0; i < shorter; i++) {
          if (aParts[0][i] === hParts[0][i]) matches++;
        }
        if (matches / shorter >= 0.6) return true;
      }
    }
    if (aParts.length > 1 && hParts.length > 1) {
      const common = aParts.filter(p => hParts.includes(p));
      return common.length >= Math.min(aParts.length, hParts.length) * 0.5;
    }
    return false;
  });
}

function buildColumnMapping(headers: string[]): { mapping: Record<string, string>; unmatched: string[] } {
  const mapping: Record<string, string> = {};
  const unmatched: string[] = [];

  const usedHeaders = new Set<string>();

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    let matched = false;
    for (const header of headers) {
      if (usedHeaders.has(header)) continue;
      if (fuzzyMatch(header, aliases)) {
        mapping[field] = header;
        usedHeaders.add(header);
        matched = true;
        break;
      }
    }
    if (!matched && field !== 'photo' && field !== 'uid' && field !== 'status') {
      // Field not found in headers — will use defaults
    }
  }

  for (const header of headers) {
    if (!usedHeaders.has(header)) {
      unmatched.push(header);
    }
  }

  return { mapping, unmatched };
}

function normalizeValue(value: string): string {
  if (!value || value.trim() === '') return '';
  return value.trim();
}

export function normalizeImportRows(
  rows: Record<string, string>[],
  headers: string[]
): ImportValidationResult {
  const { mapping, unmatched } = buildColumnMapping(headers);

  const valid: NormalizedStudentRow[] = [];
  const errors: ImportValidationResult['errors'] = [];
  const warnings: ImportValidationResult['warnings'] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (Object.values(row).every(v => !v || v.trim() === '')) {
      continue;
    }

    const get = (field: string): string => {
      const header = mapping[field];
      return header ? normalizeValue(row[header] || '') : '';
    };

    const firstName = get('first_name');
    const lastName = get('last_name');

    if (!firstName && !lastName) {
      errors.push({ row: rowNum, message: 'Row has no identifiable name data — skipped', original: row });
      continue;
    }

    if (!firstName) {
      errors.push({ row: rowNum, message: 'First name is required', original: row });
      continue;
    }

    if (!lastName) {
      warnings.push({ row: rowNum, message: 'Last name missing — using first name as fallback', original: row });
    }

    const rowUnmatched: string[] = [];
    for (const header of Object.keys(row)) {
      if (!Object.values(mapping).includes(header)) {
        rowUnmatched.push(header);
      }
    }

    const finalLastName = lastName || firstName;

    valid.push({
      first_name: firstName,
      last_name: finalLastName,
      email: get('email') || undefined,
      phone: get('phone') || undefined,
      gender: get('gender') || undefined,
      date_of_birth: get('date_of_birth') || undefined,
      nationality: get('nationality') || undefined,
      address: get('address') || undefined,
      program_name: get('program_name') || undefined,
      program_code: get('program_code') || undefined,
      study_center_name: get('study_center_name') || undefined,
      admission_date: get('admission_date') || undefined,
      reg_no: get('reg_no') || undefined,
      uid: get('uid') || undefined,
      photo: get('photo') || undefined,
      status: get('status') || undefined,
      _original: { ...row, _rowNumber: String(rowNum) },
      _unmatchedColumns: rowUnmatched,
    });
  }

  return {
    valid,
    errors,
    warnings,
    columnMapping: mapping,
    unmatchedColumns: unmatched,
  };
}
