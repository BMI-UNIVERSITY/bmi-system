export type AcademicCareer = 'UG' | 'PG' | 'DR' | 'CE';

export function generateStudentUid(seqNumber: number): string {
  const base36 = seqNumber.toString(36).toUpperCase().padStart(6, '0');
  return `BMI${base36}`;
}

export function extractProgramCode(programName: string): string {
  if (!programName) return 'GEN';
  const name = programName.toUpperCase();
  if (name.includes('COMPUTER SCIENCE')) return 'CS';
  if (name.includes('DATA SCIENCE') || name.includes('AI')) return 'DS';
  if (name.includes('BUSINESS') || name.includes('ADMINISTRATION')) return 'BBA';
  if (name.includes('EMBEDDED') || name.includes('ENGINEERING')) return 'ENG';
  if (name.includes('MEDICINE') || name.includes('HEALTH')) return 'MED';
  if (name.includes('LAW')) return 'LAW';
  if (name.includes('MATHEMATICS')) return 'MTH';
  if (name.includes('HUMANITIES') || name.includes('ENGLISH')) return 'HUM';

  const clean = programName.replace(/B\.Sc\.|B\.A\.|B\.Eng\.|M\.Sc\.|Ph\.D\./gi, '').trim();
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

export function extractCareer(programName: string): AcademicCareer {
  if (!programName) return 'UG';
  const name = programName.toUpperCase();
  if (name.includes('PH.D') || name.includes('DOCTOR') || name.includes('DR.')) return 'DR';
  if (name.includes('M.SC') || name.includes('M.A.') || name.includes('MBA') || name.includes('MASTER') || name.includes('POSTGRAD')) return 'PG';
  if (name.includes('CERTIFICATE') || name.includes('DIPLOMA') || name.includes('CONTINUING')) return 'CE';
  return 'UG';
}

export function generateRegistrationNumber(params: {
  career?: AcademicCareer;
  programCode: string;
  year: number;
  serial: number;
}): string {
  const career = params.career || 'UG';
  const shortYear = `2${params.year.toString().slice(-2)}`;
  const serialPadded = params.serial.toString().padStart(3, '0');
  return `BMI/${career}-${params.programCode}/${shortYear}/${serialPadded}`;
}
