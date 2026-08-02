import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useStudents } from '../../hooks/api';
import { exportToText, exportToCsv, triggerPrint } from '../../utils/exportUtils';
import { 
  GraduationCap, 
  Heart, 
  DollarSign, 
  Plus, 
  X, 
  Award, 
  Search, 
  Filter, 
  CheckCircle2, 
  Building2, 
  Briefcase, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Users, 
  FileText, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  TrendingUp, 
  Send, 
  Radio, 
  Layers, 
  ChevronRight, 
  Star, 
  UserCheck, 
  Clock, 
  Globe, 
  Share2, 
  BookOpen, 
  Printer, 
  Lock 
} from 'lucide-react';
import { AlumniRecord } from '../../types';

export const AlumniView: React.FC = () => {
  const { alumniList: contextAlumni, recordAlumniDonation, updateAlumniRecord, logAudit } = useApp();
  const { data: _students } = useStudents();
  const students = _students || [];

  // Pre-populated default alumni list if context is empty
  const defaultAlumniData: AlumniRecord[] = [
    {
      id: 'alm-101',
      studentId: 'std-201',
      studentNumber: '2020-CS-001',
      name: 'Sophia Chen',
      graduationYear: 2022,
      degree: 'B.Sc. Computer Science',
      currentCompany: 'OpenAI',
      currentRole: 'Senior AI Research Engineer',
      email: 'sophia.chen@alumni.bmi.edu',
      phone: '+1 (415) 890-2134',
      totalDonations: 12500,
      mentorshipStatus: 'Active Mentor'
    },
    {
      id: 'alm-102',
      studentId: 'std-202',
      studentNumber: '2021-FIN-014',
      name: 'David O. Vance',
      graduationYear: 2023,
      degree: 'B.Sc. Financial Economics',
      currentCompany: 'Goldman Sachs',
      currentRole: 'Investment Banking Associate',
      email: 'd.vance@alumni.bmi.edu',
      phone: '+1 (212) 554-9812',
      totalDonations: 5500,
      mentorshipStatus: 'Active Mentor'
    },
    {
      id: 'alm-103',
      studentId: 'std-203',
      studentNumber: '2019-ENG-089',
      name: 'Amara Okafor',
      graduationYear: 2021,
      degree: 'M.Sc. Robotics & Automation',
      currentCompany: 'Tesla',
      currentRole: 'Autopilot Systems Lead',
      email: 'amara.okafor@alumni.bmi.edu',
      phone: '+1 (650) 412-8890',
      totalDonations: 15000,
      mentorshipStatus: 'Available'
    },
    {
      id: 'alm-104',
      studentId: 'std-204',
      studentNumber: '2020-BIO-045',
      name: 'Dr. Lucas Sterling',
      graduationYear: 2020,
      degree: 'Ph.D. Molecular Biology',
      currentCompany: 'Genentech',
      currentRole: 'Principal Investigator',
      email: 'lucas.sterling@alumni.bmi.edu',
      phone: '+1 (415) 771-3091',
      totalDonations: 8200,
      mentorshipStatus: 'Active Mentor'
    },
    {
      id: 'alm-105',
      studentId: 'std-205',
      studentNumber: '2022-LAW-012',
      name: 'Elena Rostova',
      graduationYear: 2024,
      degree: 'LL.B. Corporate Law',
      currentCompany: 'McKinsey & Company',
      currentRole: 'Strategy Consultant',
      email: 'e.rostova@alumni.bmi.edu',
      phone: '+44 20 7946 0912',
      totalDonations: 2500,
      mentorshipStatus: 'Available'
    },
    {
      id: 'alm-106',
      studentId: 'std-206',
      studentNumber: '2023-CS-110',
      name: 'Kenji Takahashi',
      graduationYear: 2025,
      degree: 'B.Sc. Software Engineering',
      currentCompany: 'Google DeepMind',
      currentRole: 'Research Scientist',
      email: 'k.takahashi@alumni.bmi.edu',
      phone: '+81 3 5555 0143',
      totalDonations: 1000,
      mentorshipStatus: 'Active Mentor'
    }
  ];

  // Local state for local additions if context is empty
  const [localAlumni, setLocalAlumni] = useState<AlumniRecord[]>([]);

  // Combined alumni list
  const alumniList = contextAlumni.length > 0 
    ? [...contextAlumni, ...localAlumni] 
    : [...defaultAlumniData, ...localAlumni];

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'directory' | 'donations' | 'mentorship' | 'events' | 'verifications'
  >('directory');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradYear, setSelectedGradYear] = useState<string>('all');
  const [selectedMentorshipFilter, setSelectedMentorshipFilter] = useState<string>('all');

  // Selected Alumni for Modals / Profile View
  const [selectedAlumniForDonation, setSelectedAlumniForDonation] = useState<AlumniRecord | null>(null);
  const [selectedAlumniForProfile, setSelectedAlumniForProfile] = useState<AlumniRecord | null>(null);
  const [verificationModalAlumni, setVerificationModalAlumni] = useState<AlumniRecord | null>(null);

  // Donation Form State
  const [donationAmount, setDonationAmount] = useState<number>(1000);
  const [fundTarget, setFundTarget] = useState<string>('AI & Quantum Computing Lab Fund');
  const [paymentMethod, setPaymentMethod] = useState<'Wire Transfer' | 'Credit Card' | 'Securities/Stock' | 'Check'>('Wire Transfer');
  const [donationNotes, setDonationNotes] = useState('');

  // Register New Alumnus Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [newAlumniData, setNewAlumniData] = useState({
    name: '',
    studentNumber: '',
    graduationYear: 2025,
    degree: 'B.Sc. Computer Science',
    currentCompany: '',
    currentRole: '',
    email: '',
    phone: '',
    mentorshipStatus: 'Available' as 'Available' | 'Active Mentor' | 'Not Opted'
  });

  // Endowment Gift Ledger State
  const [giftLedger, setGiftLedger] = useState<Array<{
    id: string;
    alumniName: string;
    amount: number;
    fundTarget: string;
    paymentMethod: string;
    date: string;
    receiptId: string;
  }>>([
    { id: 'gft-101', alumniName: 'Amara Okafor', amount: 15000, fundTarget: 'AI & Quantum Computing Lab Fund', paymentMethod: 'Securities/Stock', date: '2026-06-12', receiptId: 'RCP-2026-901' },
    { id: 'gft-102', alumniName: 'Sophia Chen', amount: 10500, fundTarget: 'Need-Based Student Scholarship Endowment', paymentMethod: 'Wire Transfer', date: '2026-07-04', receiptId: 'RCP-2026-902' },
    { id: 'gft-103', alumniName: 'Dr. Lucas Sterling', amount: 8200, fundTarget: 'Library & Rare Manuscripts Digitalization', paymentMethod: 'Credit Card', date: '2026-07-15', receiptId: 'RCP-2026-903' },
    { id: 'gft-104', alumniName: 'David O. Vance', amount: 5500, fundTarget: 'New Campus Sports Complex & Athletics Center', paymentMethod: 'Wire Transfer', date: '2026-07-20', receiptId: 'RCP-2026-904' }
  ]);

  // Campaign Progress State
  const [campaigns] = useState([
    { id: 'cmp-1', name: 'AI & Quantum Computing Lab Fund', target: 1200000, raised: 980000, icon: Sparkles, color: 'text-indigo-400', bg: 'bg-indigo-500' },
    { id: 'cmp-2', name: 'Need-Based Student Scholarship Endowment', target: 500000, raised: 410000, icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500' },
    { id: 'cmp-3', name: 'New Campus Sports Complex & Athletics Center', target: 2000000, raised: 1450000, icon: Building2, color: 'text-amber-400', bg: 'bg-amber-500' },
    { id: 'cmp-4', name: 'Library & Rare Manuscripts Digitalization', target: 250000, raised: 210000, icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500' }
  ]);

  // Mentorship Match State
  const [mentorshipPairings, setMentorshipPairings] = useState<Array<{
    id: string;
    mentorName: string;
    company: string;
    menteeName: string;
    menteeMajor: string;
    field: string;
    startDate: string;
    cadence: string;
    status: 'Active' | 'Completed';
  }>>([
    { id: 'mpt-1', mentorName: 'Sophia Chen', company: 'OpenAI', menteeName: 'Alex Mercer', menteeMajor: 'B.Sc. Computer Science', field: 'AI & Machine Learning Research', startDate: '2026-05-10', cadence: 'Bi-weekly 1-on-1', status: 'Active' },
    { id: 'mpt-2', mentorName: 'David O. Vance', company: 'Goldman Sachs', menteeName: 'Chloe Bennett', menteeMajor: 'B.Sc. Finance', field: 'Investment Banking & Valuation', startDate: '2026-06-01', cadence: 'Monthly Mentorship', status: 'Active' },
    { id: 'mpt-3', mentorName: 'Kenji Takahashi', company: 'Google DeepMind', menteeName: 'Devon Vance', menteeMajor: 'M.Sc. Artificial Intelligence', field: 'Deep Reinforcement Learning', startDate: '2026-06-15', cadence: 'Weekly Code Review', status: 'Active' }
  ]);

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedMentorForMatch, setSelectedMentorForMatch] = useState<AlumniRecord | null>(null);
  const [selectedStudentForMatch, setSelectedStudentForMatch] = useState<string>('');
  const [mentorshipField, setMentorshipField] = useState('Software Engineering & Career Prep');
  const [mentorshipCadence, setMentorshipCadence] = useState('Bi-weekly 1-on-1');

  // Alumni Events State
  const [alumniEvents, setAlumniEvents] = useState<Array<{
    id: string;
    title: string;
    chapter: string;
    date: string;
    time: string;
    location: string;
    capacity: number;
    rsvps: number;
    ticketFee: number;
    description: string;
    isVirtual: boolean;
  }>>([
    { id: 'evt-101', title: '2026 Annual Alumni Gala & Advancement Dinner', chapter: 'Global Campus Chapter', date: '2026-11-15', time: '18:00 - 22:00 UTC', location: 'Grand University Ballroom & Gardens', capacity: 350, rsvps: 240, ticketFee: 150, description: 'Exclusive formal gathering honoring major donors, distinguished alumni awardees, and faculty leadership.', isVirtual: false },
    { id: 'evt-102', title: 'Silicon Valley AI & Tech Leadership Summit', chapter: 'San Francisco Bay Chapter', date: '2026-09-20', time: '14:00 - 18:00 PST', location: 'Palo Alto Tech Hub & Zoom Live', capacity: 150, rsvps: 118, ticketFee: 0, description: 'Keynote panels on Generative AI, venture capital fundraising, and student internship sponsorships.', isVirtual: true },
    { id: 'evt-103', title: 'London Finance & Global Capital Markets Meetup', chapter: 'European Alumni Chapter', date: '2026-10-08', time: '19:00 - 21:30 GMT', location: 'The Mayfair Club, London', capacity: 80, rsvps: 62, ticketFee: 50, description: 'Networking cocktail evening connecting European alumni across investment banking, private equity, and fintech.', isVirtual: false }
  ]);

  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    chapter: 'Global Campus Chapter',
    date: '2026-10-15',
    time: '18:00 UTC',
    location: '',
    capacity: 100,
    ticketFee: 0,
    description: '',
    isVirtual: false
  });

  // Verification Requests State
  const [verificationQueue, setVerificationQueue] = useState<Array<{
    id: string;
    alumniName: string;
    studentNumber: string;
    degree: string;
    gradYear: number;
    requestingEntity: string;
    purpose: string;
    date: string;
    status: 'Pending Verification' | 'Verified' | 'Flagged';
    verifiedBy?: string;
  }>>([
    { id: 'ver-101', alumniName: 'Sophia Chen', studentNumber: '2020-CS-001', degree: 'B.Sc. Computer Science', gradYear: 2022, requestingEntity: 'OpenAI HR Compliance', purpose: 'Employment Background Audit', date: '2026-07-26', status: 'Pending Verification' },
    { id: 'ver-102', alumniName: 'Amara Okafor', studentNumber: '2019-ENG-089', degree: 'M.Sc. Robotics & Automation', gradYear: 2021, requestingEntity: 'Tesla Regulatory Legal Dept', purpose: 'Patent Security Clearance', date: '2026-07-24', status: 'Verified', verifiedBy: 'Alumni Relations Office' },
    { id: 'ver-103', alumniName: 'David O. Vance', studentNumber: '2021-FIN-014', degree: 'B.Sc. Financial Economics', gradYear: 2023, requestingEntity: 'Goldman Sachs Licensing Desk', purpose: 'FCA Professional Registration', date: '2026-07-20', status: 'Verified', verifiedBy: 'Registrar & Advancement' }
  ]);

  // Tax Receipt Download Modal state
  const [taxReceiptModalData, setTaxReceiptModalData] = useState<any | null>(null);

  // Calculation Metrics
  const totalDonations = alumniList.reduce((acc, a) => acc + a.totalDonations, 0);
  const totalMentors = alumniList.filter(a => a.mentorshipStatus === 'Active Mentor').length;
  const availableMentors = alumniList.filter(a => a.mentorshipStatus === 'Available').length;

  // Donor Tier Classifier
  const getDonorTier = (amount: number) => {
    if (amount >= 10000) return { label: 'Platinum Benefactor', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    if (amount >= 5000) return { label: 'Gold Partner', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    if (amount >= 1000) return { label: 'Silver Supporter', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    return { label: 'Bronze Contributor', bg: 'bg-slate-700/60 text-slate-300 border-slate-600/60' };
  };

  // Handlers
  const handleRecordDonation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlumniForDonation || donationAmount <= 0) return;

    recordAlumniDonation(selectedAlumniForDonation.id, donationAmount);

    const newGiftEntry = {
      id: `gft-${Date.now()}`,
      alumniName: selectedAlumniForDonation.name,
      amount: donationAmount,
      fundTarget,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
      receiptId: `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`
    };

    setGiftLedger([newGiftEntry, ...giftLedger]);
    setSelectedAlumniForDonation(null);
    setDonationNotes('');

    logAudit('Endowment Gift Recorded', `Recorded $${donationAmount.toLocaleString()} gift from ${selectedAlumniForDonation.name} targeting '${fundTarget}'.`);
    alert(`Successfully recorded $${donationAmount.toLocaleString()} endowment donation for ${selectedAlumniForDonation.name}!\nReceipt ID: ${newGiftEntry.receiptId}`);
  };

  const handleRegisterAlumni = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlumniData.name || !newAlumniData.email) return;

    const newRec: AlumniRecord = {
      id: `alm-${Date.now()}`,
      studentId: `std-${Date.now()}`,
      studentNumber: newAlumniData.studentNumber || `2025-ALM-${Math.floor(100 + Math.random() * 900)}`,
      name: newAlumniData.name,
      graduationYear: Number(newAlumniData.graduationYear),
      degree: newAlumniData.degree,
      currentCompany: newAlumniData.currentCompany || 'Graduate Scholar',
      currentRole: newAlumniData.currentRole || 'Alumnus',
      email: newAlumniData.email,
      phone: newAlumniData.phone || '+1 (555) 019-2834',
      totalDonations: 0,
      mentorshipStatus: newAlumniData.mentorshipStatus
    };

    setLocalAlumni([newRec, ...localAlumni]);
    setRegisterModalOpen(false);
    setNewAlumniData({
      name: '',
      studentNumber: '',
      graduationYear: 2025,
      degree: 'B.Sc. Computer Science',
      currentCompany: '',
      currentRole: '',
      email: '',
      phone: '',
      mentorshipStatus: 'Available'
    });

    logAudit('Alumni Registered', `Added new alumnus/alumna '${newRec.name}' ('${newRec.graduationYear}) to directory.`);
  };

  const handleCreateMentorshipMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorForMatch || !selectedStudentForMatch) return;

    const matchedStudentObj = students.find(s => s.id === selectedStudentForMatch);
    const studentNameStr = matchedStudentObj ? `${matchedStudentObj.firstName} ${matchedStudentObj.lastName}` : 'Enrolled Student';
    const studentMajorStr = matchedStudentObj?.program || 'Undergraduate Degree';

    const newMatch = {
      id: `mpt-${Date.now()}`,
      mentorName: selectedMentorForMatch.name,
      company: selectedMentorForMatch.currentCompany || 'Industry Leader',
      menteeName: studentNameStr,
      menteeMajor: studentMajorStr,
      field: mentorshipField,
      startDate: new Date().toISOString().split('T')[0],
      cadence: mentorshipCadence,
      status: 'Active' as const
    };

    setMentorshipPairings([newMatch, ...mentorshipPairings]);
    
    // Update mentor status to Active Mentor
    updateAlumniRecord(selectedMentorForMatch.id, { mentorshipStatus: 'Active Mentor' });

    setMatchModalOpen(false);
    setSelectedMentorForMatch(null);
    setSelectedStudentForMatch('');

    logAudit('Mentorship Matched', `Paired alumnus ${selectedMentorForMatch.name} with student ${studentNameStr}.`);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventData.title || !newEventData.location) return;

    const newEvt = {
      id: `evt-${Date.now()}`,
      title: newEventData.title,
      chapter: newEventData.chapter,
      date: newEventData.date,
      time: newEventData.time,
      location: newEventData.location,
      capacity: Number(newEventData.capacity),
      rsvps: 1,
      ticketFee: Number(newEventData.ticketFee),
      description: newEventData.description,
      isVirtual: newEventData.isVirtual
    };

    setAlumniEvents([newEvt, ...alumniEvents]);
    setNewEventModalOpen(false);
    setNewEventData({
      title: '',
      chapter: 'Global Campus Chapter',
      date: '2026-10-15',
      time: '18:00 UTC',
      location: '',
      capacity: 100,
      ticketFee: 0,
      description: '',
      isVirtual: false
    });

    logAudit('Alumni Event Created', `Created regional chapter event '${newEvt.title}' for ${newEvt.date}.`);
  };

  const handleVerifyDegreeRequest = (reqId: string) => {
    setVerificationQueue(prev => prev.map(v => v.id === reqId ? { ...v, status: 'Verified', verifiedBy: 'Alumni Relations Advancement Desk' } : v));
    logAudit('Degree Verification Issued', `Officially verified degree credentials for verification request ${reqId}.`);
  };

  const handleExportCSV = () => {
    const header = 'ID,StudentNumber,Name,GraduationYear,Degree,CurrentCompany,CurrentRole,Email,Phone,TotalDonations,MentorshipStatus\n';
    const rows = alumniList.map(a => `"${a.id}","${a.studentNumber}","${a.name}","${a.graduationYear}","${a.degree}","${a.currentCompany || ''}","${a.currentRole || ''}","${a.email}","${a.phone}","${a.totalDonations}","${a.mentorshipStatus}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bmi_alumni_directory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    logAudit('Alumni Directory Exported', 'Exported alumni records to CSV.');
  };

  // Filtered Alumni List
  const filteredAlumni = alumniList.filter(alm => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      alm.name.toLowerCase().includes(q) ||
      alm.email.toLowerCase().includes(q) ||
      (alm.currentCompany && alm.currentCompany.toLowerCase().includes(q)) ||
      (alm.currentRole && alm.currentRole.toLowerCase().includes(q)) ||
      alm.degree.toLowerCase().includes(q) ||
      alm.studentNumber.toLowerCase().includes(q);

    const matchesYear = selectedGradYear === 'all' || String(alm.graduationYear) === selectedGradYear;
    const matchesMentorship = selectedMentorshipFilter === 'all' || alm.mentorshipStatus === selectedMentorshipFilter;

    return matchesSearch && matchesYear && matchesMentorship;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 text-slate-100">
      
      {/* Header & Global Advancement Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
              Advancement & Philanthropy Office
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              501(c)(3) Endowment Registered
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center space-x-3">
            <GraduationCap className="w-7 h-7 text-indigo-400" />
            <span>Alumni Relations & Advancement Office</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Graduation transition pipeline, Endowment gift campaign ledger, Industry mentorship matching, Regional chapter events, and Degree verification services.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setRegisterModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Register Graduate</span>
          </button>

          <button
            onClick={() => setNewEventModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>New Reunion Event</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Directory</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Total Endowment Gifts</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+14.2% YoY</span>
          </div>
          <div className="text-2xl font-black text-emerald-400">${totalDonations.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400">Targeting $5.0M 2026 Expansion Campaign.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Registered Alumni</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Verified Profiles</span>
          </div>
          <div className="text-2xl font-black text-white">{alumniList.length} Graduates</div>
          <p className="text-[11px] text-slate-400">Across 18 Global Regional Chapters.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Mentorship Network</span>
            </span>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{totalMentors} Active</span>
          </div>
          <div className="text-2xl font-black text-cyan-300">{totalMentors + availableMentors} Mentors</div>
          <p className="text-[11px] text-slate-400">{availableMentors} Mentors available for pairing.</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Annual Giving Rate</span>
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Participation</span>
          </div>
          <div className="text-2xl font-black text-amber-300">68.4%</div>
          <p className="text-[11px] text-slate-400">Top 5% among private research universities.</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'directory' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Alumni Directory ({alumniList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('donations')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'donations' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Endowment Campaigns & Gifts ({giftLedger.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mentorship')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'mentorship' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Industry Mentorship ({mentorshipPairings.length} Pairs)</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'events' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Regional Events & Reunions ({alumniEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          className={`px-4 py-2.5 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'verifications' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Degree Verification Queue ({verificationQueue.filter(v => v.status === 'Pending Verification').length})</span>
        </button>
      </div>

      {/* --- TAB 1: ALUMNI DIRECTORY --- */}
      {activeTab === 'directory' && (
        <div className="space-y-4 text-xs">
          {/* Search & Filter Controls */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search alumni by name, company, degree, role, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400 font-semibold">Year:</span>
                <select
                  value={selectedGradYear}
                  onChange={e => setSelectedGradYear(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Years</option>
                  <option value="2025">Class of 2025</option>
                  <option value="2024">Class of 2024</option>
                  <option value="2023">Class of 2023</option>
                  <option value="2022">Class of 2022</option>
                  <option value="2021">Class of 2021</option>
                  <option value="2020">Class of 2020</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <span className="text-slate-400 font-semibold">Mentorship:</span>
                <select
                  value={selectedMentorshipFilter}
                  onChange={e => setSelectedMentorshipFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="Active Mentor">Active Mentor</option>
                  <option value="Available">Available</option>
                  <option value="Not Opted">Not Opted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlumni.map(alm => {
              const tier = getDonorTier(alm.totalDonations);

              return (
                <div key={alm.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-md flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-white text-base flex items-center space-x-2">
                          <span>{alm.name}</span>
                          <span className="text-slate-400 text-xs font-semibold">('{alm.graduationYear})</span>
                        </h3>
                        <p className="text-indigo-300 font-medium text-xs mt-0.5">{alm.degree}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${tier.bg}`}>
                        {tier.label}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                      <p className="flex items-center space-x-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span><strong>{alm.currentRole}</strong> at <span className="text-indigo-300 font-semibold">{alm.currentCompany}</span></span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">{alm.email}</span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-400">{alm.phone}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lifetime Giving:</span>
                      <strong className="text-emerald-400 text-sm font-black">${alm.totalDonations.toLocaleString()}</strong>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedAlumniForDonation(alm)}
                        className="px-2.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[10px] flex items-center space-x-1"
                        title="Record Gift"
                      >
                        <Heart className="w-3 h-3" />
                        <span>Gift</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedMentorForMatch(alm);
                          setMatchModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold rounded-lg transition text-[10px] flex items-center space-x-1"
                        title="Pair Student"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Pair</span>
                      </button>

                      <button
                        onClick={() => setSelectedAlumniForProfile(alm)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 transition text-[10px]"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAlumni.length === 0 && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">No alumni profiles found matching search criteria.</p>
              <p className="text-xs mt-1">Try resetting the graduation year or mentorship status filter.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: ENDOWMENT CAMPAIGNS & GIFTS LEDGER --- */}
      {activeTab === 'donations' && (
        <div className="space-y-6 text-xs">
          {/* Campaign Progress Bars */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <h2 className="font-bold text-white text-base flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Active University Advancement Campaigns</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map(cmp => {
                const Icon = cmp.icon;
                const percentage = Math.min(100, Math.round((cmp.raised / cmp.target) * 100));

                return (
                  <div key={cmp.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${cmp.color}`} />
                        <span>{cmp.name}</span>
                      </span>
                      <span className="text-slate-300 font-mono font-bold text-xs">{percentage}%</span>
                    </div>

                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                      <div className={`${cmp.bg} h-full rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Raised: <strong className="text-emerald-400">${cmp.raised.toLocaleString()}</strong></span>
                      <span>Target Goal: <strong className="text-white">${cmp.target.toLocaleString()}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gift Transactions Ledger */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Endowment Gift Ledger & Tax Receipts</span>
                </h3>
                <p className="text-slate-400 text-xs">Audited transactions for major gifts, alumni contributions, and securities transfers.</p>
              </div>

              <button
                onClick={() => {
                  if (alumniList.length > 0) setSelectedAlumniForDonation(alumniList[0]);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Record New Endowment Gift</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Receipt ID</th>
                    <th className="py-2.5 px-3">Donor Name</th>
                    <th className="py-2.5 px-3">Fund Target</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Gift Amount</th>
                    <th className="py-2.5 px-3 text-center">Tax Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {giftLedger.map(gft => (
                    <tr key={gft.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono text-indigo-300 font-bold">{gft.receiptId}</td>
                      <td className="py-3 px-3 font-bold text-white">{gft.alumniName}</td>
                      <td className="py-3 px-3 text-slate-300">{gft.fundTarget}</td>
                      <td className="py-3 px-3 text-slate-400">{gft.paymentMethod}</td>
                      <td className="py-3 px-3 text-slate-400">{gft.date}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono text-sm">${gft.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setTaxReceiptModalData(gft)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold rounded-lg border border-slate-700 transition text-[10px] inline-flex items-center space-x-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: INDUSTRY MENTORSHIP NETWORK --- */}
      {activeTab === 'mentorship' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  <span>Industry Mentorship & Student Career Guidance Hub</span>
                </h3>
                <p className="text-slate-400 text-xs">Pairing distinguished alumni leaders with current undergraduate and graduate scholars.</p>
              </div>

              <button
                onClick={() => {
                  const avail = alumniList.find(a => a.mentorshipStatus === 'Available') || alumniList[0];
                  setSelectedMentorForMatch(avail);
                  setMatchModalOpen(true);
                }}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Pair Student with Mentor</span>
              </button>
            </div>

            {/* Active Pairings Table */}
            <div className="space-y-3">
              {mentorshipPairings.map(mpt => (
                <div key={mpt.id} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <strong className="text-white text-sm">{mpt.mentorName}</strong>
                        <span className="text-slate-400">({mpt.company})</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        <strong className="text-cyan-300 text-sm">{mpt.menteeName}</strong>
                        <span className="text-slate-400">({mpt.menteeMajor})</span>
                      </div>
                      <p className="text-slate-300 text-[11px] mt-1">Focus Domain: <strong>{mpt.field}</strong> • Cadence: {mpt.cadence}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">Matched Date: {mpt.startDate}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                      {mpt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: REGIONAL EVENTS & REUNIONS --- */}
      {activeTab === 'events' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-amber-400" />
                  <span>Regional Alumni Chapters & Reunions Calendar</span>
                </h3>
                <p className="text-slate-400 text-xs">Global chapter gatherings, career symposiums, and advancement dinners.</p>
              </div>

              <button
                onClick={() => setNewEventModalOpen(true)}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create Chapter Event</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {alumniEvents.map(evt => (
                <div key={evt.id} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        {evt.chapter}
                      </span>
                      {evt.isVirtual && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                          Virtual Access
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-white text-sm leading-snug">{evt.title}</h4>
                    <p className="text-slate-300 text-[11px]">{evt.description}</p>

                    <div className="pt-2 space-y-1 text-[11px] text-slate-400">
                      <p className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.date} • {evt.time}</span>
                      </p>
                      <p className="flex items-center space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      RSVPs: <strong className="text-white">{evt.rsvps} / {evt.capacity}</strong>
                    </span>

                    <button
                      onClick={() => {
                        setAlumniEvents(prev => prev.map(e => e.id === evt.id ? { ...e, rsvps: e.rsvps + 1 } : e));
                        logAudit('Alumni RSVP Confirmed', `Confirmed RSVP for event '${evt.title}'.`);
                        alert(`RSVP confirmed for event: ${evt.title}`);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition"
                    >
                      RSVP / Register
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: DEGREE VERIFICATION QUEUE --- */}
      {activeTab === 'verifications' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Degree & Academic Credentials Verification Queue</span>
              </h3>
              <p className="text-slate-400 text-xs">Background checks from employer legal departments, government licensing boards, and graduate schools.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Graduate Name</th>
                    <th className="py-2.5 px-3">Reg No</th>
                    <th className="py-2.5 px-3">Degree & Year</th>
                    <th className="py-2.5 px-3">Requesting Employer</th>
                    <th className="py-2.5 px-3">Purpose</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {verificationQueue.map(ver => (
                    <tr key={ver.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-bold text-white">{ver.alumniName}</td>
                      <td className="py-3 px-3 font-mono text-slate-300">{ver.studentNumber}</td>
                      <td className="py-3 px-3 text-slate-300">{ver.degree} ('{ver.gradYear})</td>
                      <td className="py-3 px-3 text-indigo-300 font-semibold">{ver.requestingEntity}</td>
                      <td className="py-3 px-3 text-slate-400">{ver.purpose}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          ver.status === 'Verified' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {ver.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {ver.status === 'Pending Verification' ? (
                          <button
                            onClick={() => handleVerifyDegreeRequest(ver.id)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition text-[10px]"
                          >
                            Verify Credentials
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: RECORD ENDOWMENT GIFT --- */}
      {selectedAlumniForDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Heart className="w-5 h-5 text-emerald-400" />
                <span>Record Endowment Gift</span>
              </h2>
              <button onClick={() => setSelectedAlumniForDonation(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordDonation} className="space-y-3">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <p className="text-slate-400 text-[11px]">Donor:</p>
                <p className="text-white font-bold text-sm">{selectedAlumniForDonation.name} ('{selectedAlumniForDonation.graduationYear})</p>
                <p className="text-indigo-300 text-[11px]">{selectedAlumniForDonation.currentRole} at {selectedAlumniForDonation.currentCompany}</p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Target Endowment Campaign</label>
                <select
                  value={fundTarget}
                  onChange={e => setFundTarget(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="AI & Quantum Computing Lab Fund">AI & Quantum Computing Lab Fund</option>
                  <option value="Need-Based Student Scholarship Endowment">Need-Based Student Scholarship Endowment</option>
                  <option value="New Campus Sports Complex & Athletics Center">New Campus Sports Complex & Athletics Center</option>
                  <option value="Library & Rare Manuscripts Digitalization">Library & Rare Manuscripts Digitalization</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Gift Amount ($ USD)</label>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={e => setDonationAmount(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-sm font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Wire Transfer">Wire Transfer / ACH</option>
                  <option value="Credit Card">Corporate / Personal Credit Card</option>
                  <option value="Securities/Stock">Securities & Stock Equity Transfer</option>
                  <option value="Check">Official Cashier's Check</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Gift Dedication / Notes (Optional)</label>
                <textarea
                  value={donationNotes}
                  onChange={e => setDonationNotes(e.target.value)}
                  placeholder="e.g. In honor of Class of 2022 Computer Science department..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white h-16 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30"
              >
                Confirm & Record Gift
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: REGISTER NEW GRADUATE / ALUMNUS --- */}
      {registerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <span>Register New Alumnus / Alumna</span>
              </h2>
              <button onClick={() => setRegisterModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterAlumni} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Aurelius"
                    value={newAlumniData.name}
                    onChange={e => setNewAlumniData({ ...newAlumniData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Reg / Student Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 2025-CS-990"
                    value={newAlumniData.studentNumber}
                    onChange={e => setNewAlumniData({ ...newAlumniData, studentNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Graduation Year</label>
                  <input
                    type="number"
                    value={newAlumniData.graduationYear}
                    onChange={e => setNewAlumniData({ ...newAlumniData, graduationYear: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Degree Earned</label>
                  <input
                    type="text"
                    required
                    value={newAlumniData.degree}
                    onChange={e => setNewAlumniData({ ...newAlumniData, degree: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Current Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Google, DeepMind, NHS"
                    value={newAlumniData.currentCompany}
                    onChange={e => setNewAlumniData({ ...newAlumniData, currentCompany: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Current Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. AI Researcher, Physician"
                    value={newAlumniData.currentRole}
                    onChange={e => setNewAlumniData({ ...newAlumniData, currentRole: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Alumni Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@alumni.bmi.edu"
                    value={newAlumniData.email}
                    onChange={e => setNewAlumniData({ ...newAlumniData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={newAlumniData.phone}
                    onChange={e => setNewAlumniData({ ...newAlumniData, phone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Mentorship Preference</label>
                <select
                  value={newAlumniData.mentorshipStatus}
                  onChange={e => setNewAlumniData({ ...newAlumniData, mentorshipStatus: e.target.value as any })}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Available">Available for Student Mentorship</option>
                  <option value="Active Mentor">Active Mentor</option>
                  <option value="Not Opted">Not Opted In</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                Register Alumni Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: PAIR STUDENT WITH MENTOR --- */}
      {matchModalOpen && selectedMentorForMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>Pair Student with Alumni Mentor</span>
              </h2>
              <button onClick={() => setMatchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMentorshipMatch} className="space-y-3">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <p className="text-slate-400 text-[11px]">Selected Alumni Mentor:</p>
                <p className="text-white font-bold text-sm">{selectedMentorForMatch.name}</p>
                <p className="text-cyan-300 text-[11px]">{selectedMentorForMatch.currentRole} at {selectedMentorForMatch.currentCompany}</p>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Select Student Mentee</label>
                <select
                  value={selectedStudentForMatch}
                  onChange={e => setSelectedStudentForMatch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-cyan-500"
                  required
                >
                  <option value="">-- Choose Student from Directory --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.studentUid}) - {s.program}
                    </option>
                  ))}
                  {students.length === 0 && (
                    <option value="std-fallback-01">Alex Mercer (CS Senior Scholar)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Focus Domain / Guidance Area</label>
                <input
                  type="text"
                  value={mentorshipField}
                  onChange={e => setMentorshipField(e.target.value)}
                  placeholder="e.g. AI Research, Quantitative Trading, Law Practice"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Meeting Cadence</label>
                <select
                  value={mentorshipCadence}
                  onChange={e => setMentorshipCadence(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="Weekly 1-on-1">Weekly 1-on-1 (30 mins)</option>
                  <option value="Bi-weekly 1-on-1">Bi-weekly 1-on-1 (45 mins)</option>
                  <option value="Monthly Career Check-in">Monthly Career Check-in</option>
                  <option value="Ad-hoc Resume & Interview Prep">Ad-hoc Resume & Interview Prep</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition shadow-lg shadow-cyan-600/30"
              >
                Confirm Mentorship Match
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: CREATE CHAPTER REUNION EVENT --- */}
      {newEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span>Create Alumni Chapter Reunion Event</span>
              </h2>
              <button onClick={() => setNewEventModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 London Finance & Tech Dinner"
                  value={newEventData.title}
                  onChange={e => setNewEventData({ ...newEventData, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Regional Chapter</label>
                  <select
                    value={newEventData.chapter}
                    onChange={e => setNewEventData({ ...newEventData, chapter: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl p-2.5"
                  >
                    <option value="Global Campus Chapter">Global Campus Chapter</option>
                    <option value="San Francisco Bay Chapter">San Francisco Bay Chapter</option>
                    <option value="European Alumni Chapter">European Alumni Chapter</option>
                    <option value="New York Finance Chapter">New York Finance Chapter</option>
                    <option value="Tokyo Tech Chapter">Tokyo Tech Chapter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date & Time</label>
                  <input
                    type="date"
                    required
                    value={newEventData.date}
                    onChange={e => setNewEventData({ ...newEventData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Venue / Virtual Location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand University Ballroom or Zoom Live Link"
                  value={newEventData.location}
                  onChange={e => setNewEventData({ ...newEventData, location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Max Attendee Capacity</label>
                  <input
                    type="number"
                    value={newEventData.capacity}
                    onChange={e => setNewEventData({ ...newEventData, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Ticket Fee ($ USD)</label>
                  <input
                    type="number"
                    value={newEventData.ticketFee}
                    onChange={e => setNewEventData({ ...newEventData, ticketFee: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Event Description</label>
                <textarea
                  value={newEventData.description}
                  onChange={e => setNewEventData({ ...newEventData, description: e.target.value })}
                  placeholder="Event schedule, keynotes, dress code..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-white h-16 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-lg shadow-amber-600/30"
              >
                Publish Chapter Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: FULL ALUMNI PROFILE DRAWER --- */}
      {selectedAlumniForProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">{selectedAlumniForProfile.name}</h2>
                  <p className="text-slate-400 text-xs">Class of '{selectedAlumniForProfile.graduationYear} • {selectedAlumniForProfile.degree}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAlumniForProfile(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <span className="font-bold text-white block text-xs">Career & Employment</span>
                <p className="text-slate-300">Company: <strong className="text-indigo-300">{selectedAlumniForProfile.currentCompany}</strong></p>
                <p className="text-slate-300">Title: <strong>{selectedAlumniForProfile.currentRole}</strong></p>
                <p className="text-slate-400 text-[11px]">Registration No: <span className="font-mono text-slate-300">{selectedAlumniForProfile.studentNumber}</span></p>
              </div>

              <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2">
                <span className="font-bold text-white block text-xs">Philanthropy & Giving</span>
                <p className="text-slate-300">Total Endowment Gifted: <strong className="text-emerald-400 text-sm font-mono">${selectedAlumniForProfile.totalDonations.toLocaleString()}</strong></p>
                <p className="text-slate-300">Mentorship Status: <span className="text-cyan-300 font-semibold">{selectedAlumniForProfile.mentorshipStatus}</span></p>
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/60 space-y-2">
              <span className="font-bold text-white block text-xs">Official Contact Info</span>
              <p className="text-slate-300">Email: <span className="text-slate-200 font-mono">{selectedAlumniForProfile.email}</span></p>
              <p className="text-slate-300">Phone: <span className="text-slate-200 font-mono">{selectedAlumniForProfile.phone}</span></p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedAlumniForDonation(selectedAlumniForProfile);
                  setSelectedAlumniForProfile(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center space-x-2"
              >
                <Heart className="w-4 h-4" />
                <span>Record New Gift</span>
              </button>

              <button
                onClick={() => setSelectedAlumniForProfile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl border border-slate-700 transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 6: OFFICIAL TAX RECEIPT PREVIEW --- */}
      {taxReceiptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>Official Tax Receipt & Gift Acknowledgement</span>
              </h2>
              <button onClick={() => setTaxReceiptModalData(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 bg-white text-slate-900 rounded-xl space-y-4 font-sans border shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-black text-lg text-slate-900">BMI University Endowment Foundation</h3>
                  <p className="text-[10px] text-slate-600">501(c)(3) Tax-Exempt Educational Institution</p>
                </div>
                <div className="text-right font-mono text-xs font-bold text-emerald-700">
                  {taxReceiptModalData.receiptId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Donor Legal Name:</span>
                  <strong className="text-slate-900 font-bold">{taxReceiptModalData.alumniName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Contribution Date:</span>
                  <strong className="text-slate-900 font-bold">{taxReceiptModalData.date}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Endowment Target:</span>
                  <strong className="text-indigo-900 font-bold">{taxReceiptModalData.fundTarget}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Payment Channel:</span>
                  <strong className="text-slate-900 font-bold">{taxReceiptModalData.paymentMethod}</strong>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-center">
                <span className="text-slate-600 text-xs font-semibold block">Total Tax-Deductible Contribution</span>
                <span className="text-2xl font-black text-emerald-700 font-mono mt-1 block">
                  ${taxReceiptModalData.amount.toLocaleString()} USD
                </span>
              </div>

              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                No goods or services were provided in exchange for this contribution. Keep this document for federal and state tax filing purposes.
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => {
                  const receiptTxt = `=====================================================
BMI UNIVERSITY ADVANCEMENT OFFICE
OFFICIAL TAX-DEDUCTIBLE DONATION RECEIPT
=====================================================
Receipt ID:     ${taxReceiptModalData.receiptId}
Date Issued:    ${taxReceiptModalData.date}
Donor Name:     ${taxReceiptModalData.donorName}
Contribution:   $${taxReceiptModalData.amount.toLocaleString()} USD
Designation:    ${taxReceiptModalData.fundName}

ATTESTATION & ACKNOWLEDGMENT:
-----------------------------
BMI University is a 501(c)(3) tax-exempt higher education institution.
No goods or services were provided in exchange for this contribution.
Keep this official record for tax deduction filing purposes.

Authorized Registrar/Advancement Officer Signature:
Dr. Claire Beauchamp, Vice President of University Advancement
=====================================================`;
                  exportToText(`TaxReceipt_${taxReceiptModalData.receiptId}.txt`, receiptTxt);
                  setTaxReceiptModalData(null);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Signed Tax Receipt</span>
              </button>
              
              <button
                onClick={triggerPrint}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
