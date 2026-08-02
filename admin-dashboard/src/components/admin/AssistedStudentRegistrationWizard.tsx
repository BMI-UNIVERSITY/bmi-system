import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudents, useCreateStudent } from '../../hooks/api/useStudents';
import { useCourses } from '../../hooks/api/useCourses';
import { exportToText, exportToJson, triggerPrint } from '../../utils/exportUtils';
import { 
  UserPlus, 
  User, 
  BookOpen, 
  GraduationCap, 
  FileCheck, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Upload, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Sparkles, 
  Printer, 
  Eye, 
  Plus, 
  Trash2, 
  Check, 
  Lock, 
  QrCode, 
  Clock, 
  BadgeCheck, 
  FileText,
  Building2,
  Users,
  Award,
  Camera
} from 'lucide-react';
import { AcademicCareer, Student, Course } from '../../types';
import { 
  generateStudentUid, 
  extractProgramCode, 
  extractCareer, 
  generateRegistrationNumber 
} from '../../utils/studentIdGenerator';
import { generateDocumentHash } from '../../utils/documentSecurity';
import { 
  SecurityWatermark, 
  GuillochePattern, 
  MicrotextBorder, 
  SecuritySealBadge 
} from '../common/DocumentSecurityComponents';
import { AvatarCropModal } from '../common/AvatarCropModal';

interface AssistedStudentRegistrationWizardProps {
  onClose: () => void;
  onComplete?: (studentId: string) => void;
}

export const AssistedStudentRegistrationWizard: React.FC<AssistedStudentRegistrationWizardProps> = ({
  onClose,
  onComplete
}) => {
  const { data: _existingStudents } = useStudents();
  const existingStudents = _existingStudents || [];
  const { data: _coursesList } = useCourses();
  const coursesList = _coursesList || [];
  const { 
    enrollStudentInCourse, 
    createInvoice, 
    logAudit 
  } = useApp();

  const createStudentMutation = useCreateStudent();

  // Wizard Step State (1 to 6, plus 7 for success)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdStudentResult, setCreatedStudentResult] = useState<Student | null>(null);
  const [securityHash, setSecurityHash] = useState<string>('');

  // Step 1: Personal & Guardian Details
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('2005-06-15');
  const [gender, setGender] = useState('Female');
  const [nationality, setNationality] = useState('United States');
  const [nationalId, setNationalId] = useState('');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Parent');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [showCropModal, setShowCropModal] = useState(false);

  // Step 2: Academic Program & Placement
  const [career, setCareer] = useState<AcademicCareer>('UG');
  const [department, setDepartment] = useState('School of Computing & Engineering');
  const [program, setProgram] = useState('B.Sc. Computer Science & Artificial Intelligence');
  const [cohortYear, setCohortYear] = useState<number>(2026);
  const [advisorName, setAdvisorName] = useState('Dr. Marcus Vance');
  const [advisorEmail, setAdvisorEmail] = useState('m.vance@bmi.edu');

  // Step 3: Documents & Identity Check
  const [documents, setDocuments] = useState<Array<{ name: string; type: string; status: 'Verified' | 'Pending'; hash?: string }>>([
    { name: 'National_ID_Passport_Scan.pdf', type: 'Identification', status: 'Verified', hash: 'SHA256: 8f9a2b...' },
    { name: 'High_School_Diploma_Transcript.pdf', type: 'Academic Record', status: 'Verified', hash: 'SHA256: 4c1d7e...' },
    { name: 'Proof_of_Residence_Recommendation.pdf', type: 'Proof of Address', status: 'Verified', hash: 'SHA256: 9e3f1a...' }
  ]);
  const [uploadingDocName, setUploadingDocName] = useState<string | null>(null);

  // Step 4: Course Registration
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Step 5: Tuition Fees & Financial Settlement
  const [paymentOption, setPaymentOption] = useState<'FULL' | 'DEPOSIT' | 'SCHOLARSHIP' | 'INVOICE_PENDING'>('DEPOSIT');
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [scholarshipCode, setScholarshipCode] = useState<string>('');

  // Step 6: Registrar Officer Notes
  const [officerNotes, setOfficerNotes] = useState<string>('Assisted registration executed by Registrar Officer due to portal session drop out.');

  // Pre-fill Sample Stuck Student Handler
  const handlePreFillStuckStudent = () => {
    const randomSeed = Math.floor(1000 + Math.random() * 9000);
    setFirstName('Maya');
    setLastName(`Patel`);
    setEmail(`m.patel${randomSeed}@student.bmi.edu`);
    setPhone('+1 (555) 438-9012');
    setDateOfBirth('2005-09-18');
    setGender('Female');
    setNationality('United States');
    setNationalId(`NAT-ID-${randomSeed}`);
    setAddress('842 Innovation Way, Tech District, CA');
    setGuardianName('Rajesh Patel');
    setGuardianRelation('Father');
    setGuardianPhone('+1 (555) 890-1234');
    setGuardianEmail('r.patel@example.com');
    setCareer('UG');
    setDepartment('School of Computing & Engineering');
    setProgram('B.Sc. Computer Science & Artificial Intelligence');
    setAdvisorName('Dr. Marcus Vance');
    setAdvisorEmail('m.vance@bmi.edu');
    setErrorMessage(null);
  };

  // Auto-select relevant 1st semester courses when program or department changes
  useEffect(() => {
    if (coursesList.length > 0) {
      const defaultCourses = coursesList.slice(0, 3).map(c => c.id);
      setSelectedCourseIds(defaultCourses);
    }
  }, [coursesList, program]);

  // Projected IDs computation
  const nextSeq = useMemo(() => 55600 + existingStudents.length + 1, [existingStudents]);
  const projectedUid = useMemo(() => generateStudentUid(nextSeq), [nextSeq]);
  const programCode = useMemo(() => extractProgramCode(program), [program]);
  const projectedRegNo = useMemo(() => generateRegistrationNumber({
    career,
    programCode,
    year: cohortYear,
    serial: existingStudents.length + 1
  }), [career, programCode, cohortYear, existingStudents]);

  // Selected Courses & Tuition Calculations
  const selectedCoursesList = useMemo(() => {
    return coursesList.filter(c => selectedCourseIds.includes(c.id));
  }, [coursesList, selectedCourseIds]);

  const totalCredits = useMemo(() => {
    return selectedCoursesList.reduce((acc, c) => acc + (c.credits || 3), 0);
  }, [selectedCoursesList]);

  const tuitionFee = useMemo(() => totalCredits * 320, [totalCredits]);
  const techFee = 400;
  const activityFee = 200;
  const grandTotalFee = useMemo(() => tuitionFee + techFee + activityFee, [tuitionFee]);

  const amountPaidCalculated = useMemo(() => {
    if (paymentOption === 'FULL') return grandTotalFee;
    if (paymentOption === 'DEPOSIT') return Math.min(depositAmount, grandTotalFee);
    if (paymentOption === 'SCHOLARSHIP') return grandTotalFee; // Covered by voucher
    return 0; // PENDING
  }, [paymentOption, grandTotalFee, depositAmount]);

  // Document Upload Simulation
  const handleSimulateAddDoc = (docTitle: string, docType: string) => {
    setUploadingDocName(docTitle);
    setTimeout(() => {
      const newDoc = {
        name: docTitle,
        type: docType,
        status: 'Verified' as const,
        hash: `SHA256: ${Math.random().toString(16).substring(2, 10)}...`
      };
      setDocuments(prev => [...prev.filter(d => d.name !== docTitle), newDoc]);
      setUploadingDocName(null);
    }, 800);
  };

  // Course Toggle Handler
  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourseIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId) 
        : [...prev, courseId]
    );
  };

  // Step Validation Logic
  const validateCurrentStep = (): boolean => {
    setErrorMessage(null);

    if (currentStep === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMessage('First Name and Last Name are required.');
        return false;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('A valid email address is required.');
        return false;
      }
      if (!nationalId.trim()) {
        setErrorMessage('National ID / Passport Number is required for verification.');
        return false;
      }
      if (!guardianName.trim() || !guardianPhone.trim()) {
        setErrorMessage('Guardian / Emergency Contact Name and Phone are required.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!program.trim() || !department.trim()) {
        setErrorMessage('Please select a valid Faculty Department and Degree Program.');
        return false;
      }
    }

    if (currentStep === 3) {
      const verifiedCount = documents.filter(d => d.status === 'Verified').length;
      if (verifiedCount < 2) {
        setErrorMessage('At least 2 verified identification & academic documents are required to proceed.');
        return false;
      }
    }

    if (currentStep === 4) {
      if (selectedCourseIds.length === 0) {
        setErrorMessage('Please select at least 1 course for Semester 1 curriculum enrollment.');
        return false;
      }
      if (totalCredits < 6) {
        setErrorMessage('Minimum registration credit load is 6 credits.');
        return false;
      }
    }

    if (currentStep === 5) {
      if (paymentOption === 'DEPOSIT' && depositAmount < 500) {
        setErrorMessage('Minimum initial tuition deposit is $500.');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(6, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // Final Registration Execution
  const handleFinalizeRegistration = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const studentPayload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '+1 (555) 000-0000',
        dateOfBirth: dateOfBirth,
        nationalId: nationalId.trim(),
        gender: gender,
        nationality: nationality,
        career: career,
        program: program,
        department: department,
        cohortYear: Number(cohortYear),
        currentSemester: 1,
        academicStatus: 'Active' as const,
        creditsRequired: 120,
        advisorName: advisorName,
        advisorEmail: advisorEmail,
        gpa: 0.0,
        cgpa: 0.0,
        creditsEarned: 0,
        financialHold: paymentOption === 'INVOICE_PENDING',
        academicHold: false,
        guardianName: guardianName.trim(),
        guardianRelation: guardianRelation,
        guardianPhone: guardianPhone.trim(),
        guardianEmail: guardianEmail.trim() || email.trim(),
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      };

      // 1. Call API mutation to create student
      const createdStudent = await createStudentMutation.mutateAsync(studentPayload);

      const finalStudentId = createdStudent.id || `std-${Date.now()}`;

      // 2. Auto-enroll student in selected courses
      selectedCourseIds.forEach(courseId => {
        enrollStudentInCourse(finalStudentId, courseId);
      });

      // 3. Create Fee Invoice
      createInvoice({
        studentId: finalStudentId,
        term: 'Fall 2026',
        dueDate: '2026-09-15',
        totalAmount: grandTotalFee,
        scholarshipDiscount: paymentOption === 'SCHOLARSHIP' ? grandTotalFee : 0,
        items: [
          { description: `Tuition Fee (${totalCredits} Credits)`, amount: tuitionFee },
          { description: 'Technology & Digital Infrastructure Levy', amount: techFee },
          { description: 'Student Union & Athletics Fee', amount: activityFee }
        ]
      });

      // 4. Generate Security Hash
      const hash = await generateDocumentHash({
        documentId: `MATRIC-${projectedRegNo.replace(/[/]/g, '-')}`,
        documentType: 'Official Academic Transcript',
        studentId: finalStudentId,
        studentName: `${firstName} ${lastName}`,
        issueDate: new Date().toISOString().slice(0, 10),
        payload: { regNo: projectedRegNo, uid: projectedUid, totalCredits }
      });
      setSecurityHash(hash);

      // 5. System Audit Log
      logAudit(
        'Assisted Student Registration Completed',
        `Registrar Officer manually registered & matriculated ${firstName} ${lastName} (${projectedRegNo}). Enrolled in ${selectedCourseIds.length} courses.`
      );

      setCreatedStudentResult({
        ...studentPayload,
        id: finalStudentId,
        internalSeq: nextSeq,
        studentUid: projectedUid,
        registrationNumber: projectedRegNo,
        studentNumber: projectedRegNo
      } as Student);

      setCurrentStep(7); // Show Success Confirmation Slip
      if (onComplete) onComplete(finalStudentId);

    } catch (err: any) {
      console.error('Failed to complete student registration:', err);
      setErrorMessage(err.message || 'Server error creating student record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl max-w-4xl w-full text-xs text-slate-200 shadow-2xl overflow-hidden my-auto relative flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 px-6 py-4 border-b border-indigo-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center space-x-2">
                <span>Assisted Student Registration Wizard</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono tracking-wider font-semibold">
                  STUDENT PORTAL PROTOTYPE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Official Registrar Assisted Flow • Complete all required onboarding steps to matriculate stuck student.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {currentStep <= 6 && (
              <button
                type="button"
                onClick={handlePreFillStuckStudent}
                className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 font-bold text-[11px] transition flex items-center space-x-1.5 shadow"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Auto-Fill Sample Applicant</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stepper Navigation Bar (Steps 1 to 6) */}
        {currentStep <= 6 && (
          <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center justify-between min-w-[620px] text-[11px] font-bold">
              {[
                { step: 1, label: '1. Personal Info', icon: User },
                { step: 2, label: '2. Program & Cohort', icon: GraduationCap },
                { step: 3, label: '3. Document Check', icon: FileCheck },
                { step: 4, label: '4. Course Roster', icon: BookOpen },
                { step: 5, label: '5. Tuition Settlement', icon: DollarSign },
                { step: 6, label: '6. Review & Seal', icon: ShieldCheck }
              ].map(s => {
                const Icon = s.icon;
                const isDone = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <div key={s.step} className="flex items-center space-x-2">
                    <button
                      disabled={s.step > currentStep}
                      onClick={() => setCurrentStep(s.step)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition ${
                        isCurrent
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : isDone
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                      <span>{s.label}</span>
                    </button>
                    {s.step < 6 && <ChevronRight className="w-3.5 h-3.5 text-slate-700" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Step Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* STEP 1: PERSONAL & CONTACT INFORMATION */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Student Onboarding Step 1: Personal & Contact Information</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Enter the student's legal name, contact credentials, national identity number, and guardian details.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                  PORTAL STEP 1 OF 6
                </span>
              </div>

              {/* Student Photo Avatar Upload Box */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="relative group shrink-0">
                    <img
                      src={avatarUrl}
                      alt="Student Preview"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-500 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCropModal(true)}
                      className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition rounded-2xl flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5"
                    >
                      <Camera className="w-4 h-4 text-indigo-300" />
                      <span>Crop</span>
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">Official Student Photo & ID Avatar</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Upload and crop a professional portrait according to biometric university standards.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCropModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center space-x-2 shrink-0 shadow-md shadow-indigo-600/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>Upload & Crop Photo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">First Name <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Maya"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Last Name <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Patel"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Email Address <span className="text-rose-400">*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. m.patel@student.bmi.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 438-9012"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Date of Birth <span className="text-rose-400">*</span></label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">National ID / Passport Number <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. NAT-882910"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nationality</label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="e.g. United States"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Guardian & Emergency Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Guardian & Emergency Contact Credentials</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Guardian Full Name <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Rajesh Patel"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Relationship</label>
                    <select
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Sibling">Sibling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Guardian Phone <span className="text-rose-400">*</span></label>
                    <input
                      type="text"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 890-1234"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Guardian Email</label>
                    <input
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="e.g. r.patel@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: ACADEMIC PROGRAM & COHORT PLACEMENT */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <span>Student Onboarding Step 2: Academic Program & Faculty Placement</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Assign student career level, school department, degree major, and academic advisor.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                  PORTAL STEP 2 OF 6
                </span>
              </div>

              {/* Projected Registration Cards */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Projected Lifetime Student UID</span>
                  <div className="text-xl font-black text-white font-mono">{projectedUid}</div>
                  <p className="text-[10px] text-slate-400">Sequential Base36 internal identifier.</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Projected Career Registration No.</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">{projectedRegNo}</div>
                  <p className="text-[10px] text-slate-400">Official matriculation registration string.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Academic Career Level</label>
                  <select
                    value={career}
                    onChange={(e) => setCareer(e.target.value as AcademicCareer)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-semibold"
                  >
                    <option value="UG">Undergraduate (UG)</option>
                    <option value="PG">Postgraduate (PG)</option>
                    <option value="DR">Doctoral / Ph.D. (DR)</option>
                    <option value="CE">Continuing Education (CE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">School / Faculty Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="School of Computing & Engineering">School of Computing & Engineering</option>
                    <option value="School of Business & Economics">School of Business & Economics</option>
                    <option value="School of Medicine & Bio Sciences">School of Medicine & Bio Sciences</option>
                    <option value="School of Humanities & Social Sciences">School of Humanities & Social Sciences</option>
                    <option value="School of Law & Governance">School of Law & Governance</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-300 mb-1 font-semibold">Degree Program Major</label>
                  <select
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-bold"
                  >
                    <option value="B.Sc. Computer Science & Artificial Intelligence">B.Sc. Computer Science & Artificial Intelligence</option>
                    <option value="B.Sc. Software Engineering & Cloud Architecture">B.Sc. Software Engineering & Cloud Architecture</option>
                    <option value="B.Sc. Cybersecurity & Digital Forensics">B.Sc. Cybersecurity & Digital Forensics</option>
                    <option value="B.A. Business Administration & Fintech">B.A. Business Administration & Fintech</option>
                    <option value="M.Sc. Data Analytics & Quantum Computing">M.Sc. Data Analytics & Quantum Computing</option>
                    <option value="B.Sc. Biomedical Engineering">B.Sc. Biomedical Engineering</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Cohort Entry Year</label>
                  <input
                    type="number"
                    value={cohortYear}
                    onChange={(e) => setCohortYear(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Assigned Academic Advisor</label>
                  <select
                    value={advisorName}
                    onChange={(e) => {
                      setAdvisorName(e.target.value);
                      if (e.target.value.includes('Marcus')) setAdvisorEmail('m.vance@bmi.edu');
                      if (e.target.value.includes('Evelyn')) setAdvisorEmail('e.reed@bmi.edu');
                      if (e.target.value.includes('Robert')) setAdvisorEmail('r.vance@bmi.edu');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="Dr. Marcus Vance">Dr. Marcus Vance (Dean of Computing)</option>
                    <option value="Dr. Evelyn Reed">Dr. Evelyn Reed (Provost)</option>
                    <option value="Dr. Robert Vance">Dr. Robert Vance (Senior Academic Advisor)</option>
                    <option value="Prof. Sarah Jenkins">Prof. Sarah Jenkins (Business Advisor)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DOCUMENT CHECK & IDENTITY VERIFICATION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <FileCheck className="w-4 h-4 text-indigo-400" />
                    <span>Student Onboarding Step 3: Identity & Document Verification Portal</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Verify required credentials, generate document security hashes, and clear compliance holds.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                  PORTAL STEP 3 OF 6
                </span>
              </div>

              <div className="space-y-3">
                {documents.map((doc, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-xs">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">{doc.type} • <span className="font-mono text-indigo-300">{doc.hash}</span></p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verified & Cleared</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Simulation Area */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-700 text-center space-y-3">
                <Upload className="w-6 h-6 text-indigo-400 mx-auto" />
                <div>
                  <p className="font-bold text-white text-xs">Simulate Document Scan & Upload</p>
                  <p className="text-[10px] text-slate-400">Add missing identity certificates or secondary school records to clearing queue.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={uploadingDocName !== null}
                    onClick={() => handleSimulateAddDoc('Secondary_School_Leaving_Certificate.pdf', 'High School Record')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ High School Certificate</span>
                  </button>

                  <button
                    type="button"
                    disabled={uploadingDocName !== null}
                    onClick={() => handleSimulateAddDoc('Medical_Fitness_Immunization_Card.pdf', 'Health Record')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Medical Clearance</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: COURSE SELECTION & CURRICULUM ROSTER */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>Student Onboarding Step 4: Semester 1 Course Roster & Timetable</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Select required core and elective courses. Verify schedule conflicts and seat capacity.
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800 block">
                    {totalCredits} Credits Selected
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coursesList.map(course => {
                  const isSelected = selectedCourseIds.includes(course.id);

                  return (
                    <div
                      key={course.id}
                      onClick={() => toggleCourseSelection(course.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                            {course.code}
                          </span>
                          <h4 className="font-bold text-white text-xs mt-1">{course.title}</h4>
                          <p className="text-[10px] text-slate-400">{course.schedule} • {course.room}</p>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">Instructor: <strong className="text-slate-200">{course.instructorName}</strong></span>
                        <span className="font-mono text-emerald-400 font-bold">{course.credits} Credits</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: TUITION ASSESSMENT & FINANCIAL CLEARANCE */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Student Onboarding Step 5: Fee Assessment & Financial Clearance</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Calculate tuition assessment based on registered credits and configure settlement option.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-800">
                  PORTAL STEP 5 OF 6
                </span>
              </div>

              {/* Tuition Ledger Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 font-mono">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Semester Tuition ({totalCredits} Credits @ $320/cr):</span>
                  <span className="text-white">${tuitionFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Technology & Digital Access Levy:</span>
                  <span className="text-white">${techFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Student Union & Athletic Levy:</span>
                  <span className="text-white">${activityFee.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-indigo-300">Grand Total Fee Assessment:</span>
                  <span className="text-emerald-400">${grandTotalFee.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300">Select Financial Clearance Mode:</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { id: 'DEPOSIT', title: 'Minimum Tuition Deposit Paid', desc: 'Collect initial deposit ($1,000+) & invoice balance.', tag: 'Recommended' },
                    { id: 'FULL', title: 'Full Semester Fee Settlement', desc: '100% full fee paid upfront.', tag: 'Fully Cleared' },
                    { id: 'SCHOLARSHIP', title: 'Scholarship / Grant Waiver', desc: 'Apply institutional scholarship voucher code.', tag: 'Waiver' },
                    { id: 'INVOICE_PENDING', title: 'Issue Deferred Invoice', desc: 'Issue invoice with 30-day grace period (Financial Hold applied).', tag: '30-Day Grace' }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setPaymentOption(opt.id as any)}
                      className={`p-4 rounded-2xl border cursor-pointer transition space-y-1 ${
                        paymentOption === opt.id
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{opt.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-bold">{opt.tag}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{opt.desc}</p>
                    </div>
                  ))}
                </div>

                {paymentOption === 'DEPOSIT' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <label className="block text-slate-300 font-semibold">Tuition Deposit Amount ($)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: FINAL REVIEW & REGISTRAR SEAL */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Student Onboarding Step 6: Final Review & Official Registrar Seal</span>
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Review completed registration profile prior to committing to canonical database.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                  FINAL VERIFICATION
                </span>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 relative overflow-hidden">
                <GuillochePattern />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Student Identity</span>
                    <h4 className="text-base font-black text-white">{firstName} {lastName}</h4>
                    <p className="text-slate-300 font-mono text-xs">{email} • {phone}</p>
                    <p className="text-slate-400 text-[11px] mt-1">National ID: <strong className="text-slate-200">{nationalId}</strong></p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Academic Placement</span>
                    <p className="font-bold text-indigo-300 text-xs">{program}</p>
                    <p className="text-slate-400 text-[11px]">{department} ({career})</p>
                    <p className="text-slate-400 text-[11px] mt-1">Reg No: <strong className="text-emerald-400 font-mono">{projectedRegNo}</strong></p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Enrolled Courses ({selectedCoursesList.length})</span>
                    <p className="text-slate-200 text-xs font-semibold">{selectedCoursesList.map(c => c.code).join(', ')}</p>
                    <p className="text-slate-400 text-[11px] font-mono">{totalCredits} Total Credits</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Financial Settlement</span>
                    <p className="font-bold text-emerald-400 text-xs">${amountPaidCalculated.toLocaleString()} / ${grandTotalFee.toLocaleString()}</p>
                    <p className="text-slate-400 text-[11px]">{paymentOption}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 relative z-10">
                  <label className="block text-slate-300 mb-1 font-semibold">Registrar Officer Verification Memo</label>
                  <textarea
                    rows={2}
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: SUCCESSFUL REGISTRATION CONFIRMATION SLIP */}
          {currentStep === 7 && createdStudentResult && (
            <div className="space-y-5 animate-in zoom-in-95 duration-200 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Student Registration Successfully Completed!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                  Student record created in database, curriculum roster enrolled, tuition invoice issued, and official security hash logged.
                </p>
              </div>

              {/* Canonical Registration Slip */}
              <div className="max-w-lg mx-auto bg-slate-950 border-2 border-indigo-500/40 rounded-3xl p-6 text-left space-y-4 relative overflow-hidden shadow-2xl">
                <SecurityWatermark text="BMI MATRICULATED" />
                <GuillochePattern />

                <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
                  <div>
                    <h4 className="font-bold text-white text-sm">Official Student Registration Card</h4>
                    <p className="text-[10px] text-indigo-300 font-mono">BMI UNIVERSITY REGISTRAR GENERAL</p>
                  </div>
                  <SecuritySealBadge docType="Matriculation Certificate" docId={createdStudentResult.registrationNumber} securityHash={securityHash} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs relative z-10 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Student Name</span>
                    <span className="font-bold text-white">{createdStudentResult.firstName} {createdStudentResult.lastName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Registration Number</span>
                    <span className="font-bold text-emerald-400">{createdStudentResult.registrationNumber}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Permanent UID</span>
                    <span className="text-indigo-300">{createdStudentResult.studentUid}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block font-bold">Degree Major</span>
                    <span className="text-slate-200">{createdStudentResult.program}</span>
                  </div>
                </div>

                <MicrotextBorder />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={triggerPrint}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold transition flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Registration Slip</span>
                </button>

                <button
                  onClick={() => {
                    const confirmDoc = `BMI UNIVERSITY REGISTRAR ASSISTED REGISTRATION CONFIRMATION
================================================================
Registration Date:  ${new Date().toISOString().split('T')[0]}
Student Number:     ${createdStudentResult?.studentNumber || createdStudentResult?.registrationNumber || 'TBD'}
Full Name:          ${createdStudentResult?.firstName || ''} ${createdStudentResult?.lastName || ''}
Program/Degree:     ${createdStudentResult?.program || ''}
Department:         ${createdStudentResult?.department || ''}
Initial Status:     ${createdStudentResult?.academicStatus || 'Active'}

SEAL & AUTHENTICATION:
----------------------
Assisted Manual Registration Processed by University Registrar.
No steps overridden. Verified against prerequisite rules & clearance.
================================================================`;
                    exportToText(`RegistrationSlip_${createdStudentResult?.firstName || 'Student'}_${createdStudentResult?.lastName || 'Card'}.txt`, confirmDoc);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold transition flex items-center space-x-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Confirmation Slip</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-lg shadow-indigo-600/30"
                >
                  Return to Registrar Dashboard
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls (Steps 1 to 6) */}
        {currentStep <= 6 && (
          <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
            <button
              disabled={currentStep === 1 || isSubmitting}
              onClick={handlePrevStep}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 transition flex items-center space-x-1 font-semibold text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20 text-xs"
              >
                <span>Proceed to Step {currentStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalizeRegistration}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center space-x-2 shadow-lg shadow-emerald-600/30 text-xs"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Sealing Registration...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Official Registration & Seal</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Avatar Crop Modal */}
        <AvatarCropModal
          isOpen={showCropModal}
          onClose={() => setShowCropModal(false)}
          onCropComplete={(croppedDataUrl) => {
            setAvatarUrl(croppedDataUrl);
            setShowCropModal(false);
          }}
          currentAvatarUrl={avatarUrl}
          studentName={firstName && lastName ? `${firstName} ${lastName}` : 'New Student Applicant'}
        />

      </div>
    </div>
  );
};
