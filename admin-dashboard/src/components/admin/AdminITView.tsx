import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuditLogs, useStudents, useCourses, useStaff } from '../../hooks/api';
import { 
  Server, 
  Database, 
  ShieldCheck, 
  FileText, 
  Cloud, 
  HardDrive, 
  Zap, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Key,
  ExternalLink,
  Code,
  Terminal,
  Activity,
  Layers,
  UserCheck,
  UserX,
  ShieldAlert,
  Sliders,
  Play,
  Trash2,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Radio,
  ToggleLeft,
  ToggleRight,
  Bell,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  Wifi,
  Cpu,
  UploadCloud,
  Clock,
  Globe,
  Settings,
  Power,
  RotateCcw,
  FileCode
} from 'lucide-react';
import { UserRole } from '../../types';

export const AdminITView: React.FC = () => {
  const { data: auditLogsData } = useAuditLogs();
  const auditLogs = auditLogsData || [];
  const { data: studentsData } = useStudents();
  const students = studentsData || [];
  const { data: coursesData } = useCourses();
  const courses = coursesData || [];
  const { data: staffListData } = useStaff();
  const staffList = staffListData || [];
  
  const { 
    resetDemoData, 
    neonDatabases, 
    dbBackups, 
    rlsPolicies: initialRlsPolicies, 
    triggerBackup, 
    getSignedR2Url,
    systemFlags,
    toggleSystemFlag,
    logAudit
  } = useApp();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'neon_db' | 'users_access' | 'auth_rls' | 'r2_storage' | 'backups' | 'api_webhooks' | 'hold_verifier' | 'audit_logs'
  >('neon_db');

  // Global System Announcement Banner
  const [systemBanner, setSystemBanner] = useState<string>('Scheduled Database Maintenance & Index Optimization on Sunday 02:00 UTC.');
  const [isBannerActive, setIsBannerActive] = useState<boolean>(true);

  // System Diagnostics / Metrics
  const [metrics, setMetrics] = useState({
    cpuUsage: 14,
    memoryUsageMB: 1280,
    activeDbConnections: 38,
    uptimeDays: 18,
    cacheHitRatio: 99.4
  });
  const [autoRefreshMetrics, setAutoRefreshMetrics] = useState(false);

  // Cold Start Ping State
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // --- TAB 1: Neon DB State ---
  const [selectedDb, setSelectedDb] = useState<string>('bmi-ums-production');
  const [selectedTable, setSelectedTable] = useState<string>('students');
  const [isRunningVacuum, setIsRunningVacuum] = useState(false);
  const [vacuumLogs, setVacuumLogs] = useState<string[]>([]);
  const [poolConfig, setPoolConfig] = useState({ maxConnections: 50, idleTimeoutSec: 30, statementTimeoutMs: 10000 });

  // Table Schema Metadata Mock
  const tableSchemas: Record<string, { column: string; type: string; isPk?: boolean; nullable: boolean; desc: string }[]> = {
    students: [
      { column: 'id', type: 'VARCHAR(64)', isPk: true, nullable: false, desc: 'Primary internal UUID' },
      { column: 'student_uid', type: 'VARCHAR(32)', nullable: false, desc: 'Permanent lifetime student UID' },
      { column: 'registration_number', type: 'VARCHAR(64)', nullable: false, desc: 'Career registration number' },
      { column: 'first_name', type: 'VARCHAR(128)', nullable: false, desc: 'Student first name' },
      { column: 'last_name', type: 'VARCHAR(128)', nullable: false, desc: 'Student last name' },
      { column: 'email', type: 'VARCHAR(256)', nullable: false, desc: 'Institutional email address' },
      { column: 'financial_hold', type: 'BOOLEAN', nullable: false, desc: 'Enforces course registration block' },
      { column: 'gpa', type: 'NUMERIC(3,2)', nullable: false, desc: 'Current term Grade Point Average' },
      { column: 'created_at', type: 'TIMESTAMPTZ', nullable: false, desc: 'Account creation timestamp' }
    ],
    applications: [
      { column: 'id', type: 'VARCHAR(64)', isPk: true, nullable: false, desc: 'Application identifier' },
      { column: 'application_number', type: 'VARCHAR(32)', nullable: false, desc: 'Public application reference' },
      { column: 'applicant_name', type: 'VARCHAR(256)', nullable: false, desc: 'Full legal name' },
      { column: 'status', type: 'VARCHAR(32)', nullable: false, desc: 'Submitted, Verified, Enrolled, etc.' },
      { column: 'high_school_gpa', type: 'NUMERIC(3,2)', nullable: false, desc: 'Secondary school GPA' }
    ],
    courses: [
      { column: 'id', type: 'VARCHAR(64)', isPk: true, nullable: false, desc: 'Course ID' },
      { column: 'code', type: 'VARCHAR(16)', nullable: false, desc: 'Course Code (e.g. CSC301)' },
      { column: 'title', type: 'VARCHAR(256)', nullable: false, desc: 'Course title' },
      { column: 'credits', type: 'INTEGER', nullable: false, desc: 'Credit units value' },
      { column: 'capacity', type: 'INTEGER', nullable: false, desc: 'Maximum seat capacity' }
    ],
    invoices: [
      { column: 'id', type: 'VARCHAR(64)', isPk: true, nullable: false, desc: 'Invoice UUID' },
      { column: 'invoice_number', type: 'VARCHAR(32)', nullable: false, desc: 'Reference invoice code' },
      { column: 'student_id', type: 'VARCHAR(64)', nullable: false, desc: 'Foreign key to students.id' },
      { column: 'total_amount', type: 'NUMERIC(10,2)', nullable: false, desc: 'Total fee billed' },
      { column: 'status', type: 'VARCHAR(16)', nullable: false, desc: 'Paid, Partial, Unpaid' }
    ],
    staff: [
      { column: 'id', type: 'VARCHAR(64)', isPk: true, nullable: false, desc: 'Staff identifier' },
      { column: 'staff_number', type: 'VARCHAR(32)', nullable: false, desc: 'Employee staff ID' },
      { column: 'name', type: 'VARCHAR(256)', nullable: false, desc: 'Full name' },
      { column: 'role', type: 'VARCHAR(32)', nullable: false, desc: 'User role context' },
      { column: 'department', type: 'VARCHAR(128)', nullable: false, desc: 'Assigned academic/admin department' }
    ],
    audit_logs: [
      { column: 'id', type: 'VARCHAR(64)', isPk: true, nullable: false, desc: 'Log entry ID' },
      { column: 'timestamp', type: 'TIMESTAMPTZ', nullable: false, desc: 'Event timestamp' },
      { column: 'performed_by', type: 'VARCHAR(128)', nullable: false, desc: 'Executing user account' },
      { column: 'action', type: 'VARCHAR(128)', nullable: false, desc: 'System action label' },
      { column: 'severity', type: 'VARCHAR(16)', nullable: false, desc: 'Info, Warning, Security, Error' }
    ]
  };

  // --- TAB 2: User Access & Role Permissions State ---
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [usersState, setUsersState] = useState(() => {
    // Combine staff and default user list
    const systemUsers = [
      { id: 'usr-101', name: 'Dr. Arthur Vance', email: 'a.vance@bmi.edu', role: 'president' as UserRole, status: 'Active', mfaEnabled: true, lastLogin: '10 mins ago' },
      { id: 'usr-102', name: 'Elena Rostova', email: 'e.rostova@bmi.edu', role: 'registrar' as UserRole, status: 'Active', mfaEnabled: true, lastLogin: '1 hour ago' },
      { id: 'usr-103', name: 'Marcus Brody', email: 'm.brody@bmi.edu', role: 'it_admin' as UserRole, status: 'Active', mfaEnabled: true, lastLogin: 'Just now' },
      { id: 'usr-104', name: 'Sarah Connor', email: 's.connor@bmi.edu', role: 'finance' as UserRole, status: 'Active', mfaEnabled: true, lastLogin: '2 hours ago' },
      { id: 'usr-105', name: 'Prof. Alan Turing', email: 'a.turing@bmi.edu', role: 'lecturer' as UserRole, status: 'Active', mfaEnabled: false, lastLogin: 'Yesterday' },
      { id: 'usr-106', name: 'Grace Hopper', email: 'g.hopper@bmi.edu', role: 'admissions' as UserRole, status: 'Active', mfaEnabled: true, lastLogin: '3 hours ago' },
      { id: 'usr-107', name: 'John Doe', email: 'j.doe@bmi.edu', role: 'student' as UserRole, status: 'Active', mfaEnabled: false, lastLogin: '4 hours ago' },
      { id: 'usr-108', name: 'Jane Smith', email: 'j.smith@bmi.edu', role: 'student' as UserRole, status: 'Locked', mfaEnabled: false, lastLogin: '3 days ago' },
    ];
    return systemUsers;
  });

  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', email: '', role: 'lecturer' as UserRole });

  // --- TAB 3: Auth & RLS State ---
  const [rlsRules, setRlsRules] = useState(initialRlsPolicies);
  const [sandboxRole, setSandboxRole] = useState<UserRole>('student');
  const [sandboxTable, setSandboxTable] = useState<string>('students');
  const [sandboxAction, setSandboxAction] = useState<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'>('SELECT');
  const [sandboxResult, setSandboxResult] = useState<{
    allowed: boolean;
    policyName: string;
    sqlExpression: string;
    reason: string;
  } | null>(null);

  const [addPolicyModal, setAddPolicyModal] = useState(false);
  const [newPolicyData, setNewPolicyData] = useState({
    table: 'students',
    policyName: 'p_custom_security_check',
    action: 'SELECT' as 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    roleScope: 'student',
    definition: 'auth.uid() = student_uid'
  });

  // --- TAB 4: Cloudflare R2 Storage Vault State ---
  const [r2Search, setR2Search] = useState('');
  const [selectedDocName, setSelectedDocName] = useState('Official_Academic_Transcript_std-101.pdf');
  const [urlExpiry, setUrlExpiry] = useState<number>(3600); // in seconds
  const [generatedSignedUrl, setGeneratedSignedUrl] = useState<string | null>(null);
  const [activeSignedUrls, setActiveSignedUrls] = useState<Array<{ docName: string; url: string; expiresAt: string; status: 'Active' | 'Revoked' }>>([]);
  const [uploadSimulating, setUploadSimulating] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');

  const [r2VaultFiles, setR2VaultFiles] = useState([
    { name: 'Official_Academic_Transcript_std-101.pdf', sizeMB: 1.2, mime: 'application/pdf', category: 'Transcripts', uploaded: '2026-07-20', checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    { name: 'National_ID_Card_Scan_std-102.png', sizeMB: 3.4, mime: 'image/png', category: 'ID Documents', uploaded: '2026-07-22', checksum: 'sha256-f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2' },
    { name: 'Admission_Offer_Letter_APP-2026-904.pdf', sizeMB: 0.82, mime: 'application/pdf', category: 'Admissions', uploaded: '2026-07-25', checksum: 'sha256-8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4' },
    { name: 'Proof_of_Tuition_Wire_Transfer_INV-2026-101.pdf', sizeMB: 0.51, mime: 'application/pdf', category: 'Finance', uploaded: '2026-07-27', checksum: 'sha256-11f8b1c4161f364028682138240562e64ca820d6f30a442e97148b52a7d4df0f' }
  ]);

  // --- TAB 5: Backups & Restores State ---
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupConsoleLogs, setBackupConsoleLogs] = useState<string[]>([]);
  const [restoreModalBackup, setRestoreModalBackup] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConsoleLogs, setRestoreConsoleLogs] = useState<string[]>([]);

  // Backup Schedule Settings
  const [backupSchedule, setBackupSchedule] = useState<'hourly' | 'nightly' | 'weekly'>('nightly');
  const [retentionDays, setRetentionDays] = useState<number>(30);

  // --- TAB 6: API Keys & Webhooks Engine State ---
  const [apiKeys, setApiKeys] = useState([
    { id: 'key-01', name: 'LMS Sync Gateway', prefix: 'bmi_sk_live_9a4f...', scopes: ['read:students', 'write:grades'], created: '2026-06-15', lastUsed: '5 mins ago', status: 'Active' },
    { id: 'key-02', name: 'Mobile Banking API', prefix: 'bmi_sk_live_3x8d...', scopes: ['read:invoices', 'write:payments'], created: '2026-07-01', lastUsed: '1 hour ago', status: 'Active' },
    { id: 'key-03', name: 'Library Kiosk Terminal', prefix: 'bmi_sk_live_1z9e...', scopes: ['read:books', 'write:loans'], created: '2026-07-10', lastUsed: 'Yesterday', status: 'Active' }
  ]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', scopes: ['read:students'] });

  const [webhooks, setWebhooks] = useState([
    { id: 'wh-01', name: 'Student Enrollment Webhook', url: 'https://api.canvaslms.com/webhooks/bmi/enrollment', event: 'student.registered', status: 'Active', lastTriggered: '12 mins ago' },
    { id: 'wh-02', name: 'Payment Clearance Webhook', url: 'https://finance.bmi.edu/hooks/clearance', event: 'invoice.paid', status: 'Active', lastTriggered: '1 hour ago' },
    { id: 'wh-03', name: 'Grade Submission Notification', url: 'https://notifications.bmi.edu/push/grades', event: 'grade.submitted', status: 'Active', lastTriggered: 'Yesterday' }
  ]);
  const [testWebhookResult, setTestWebhookResult] = useState<{ id: string; status: number; durationMs: number; response: string } | null>(null);

  // --- TAB 7: Financial Hold Constraint Verifier State ---
  const [holdTestStudentId, setHoldTestStudentId] = useState('std-102');
  const [holdTestCourseId, setHoldTestCourseId] = useState('CS101');
  const [holdTestResult, setHoldTestResult] = useState<{ status: 'blocked' | 'passed'; message: string; sqlConstraint: string } | null>(null);

  // --- TAB 8: Security Audit Trail Filter State ---
  const [auditFilter, setAuditFilter] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('all');

  // --- HANDLERS ---

  const handlePingColdStart = () => {
    setIsPinging(true);
    setPingLatency(null);
    const start = performance.now();
    setTimeout(() => {
      const elapsed = Math.round(performance.now() - start + 380);
      setPingLatency(elapsed);
      setIsPinging(false);
      logAudit('Scale-to-Zero Ping', `Neon Postgres cold start ping completed in ${elapsed}ms. Connection pool active.`);
    }, 500);
  };

  const handleRefreshMetrics = () => {
    setMetrics({
      cpuUsage: Math.floor(Math.random() * 15) + 8,
      memoryUsageMB: Math.floor(Math.random() * 200) + 1200,
      activeDbConnections: Math.floor(Math.random() * 20) + 30,
      uptimeDays: 18,
      cacheHitRatio: +(99.1 + Math.random() * 0.7).toFixed(2)
    });
  };

  const handleRunVacuum = () => {
    setIsRunningVacuum(true);
    setVacuumLogs([
      `[${new Date().toISOString()}] Initiating VACUUM ANALYZE on project '${selectedDb}'...`,
      `Locking table statistics for read optimization...`,
      `Scanning heap tuples and dead rows across 18 system tables...`
    ]);

    setTimeout(() => {
      setVacuumLogs(prev => [
        ...prev,
        `Reclaimed 18.4 MB of bloated dead tuples. Page visibility map updated.`,
        `Analyzing distribution histograms for cost-based query optimizer...`,
        `VACUUM ANALYZE COMPLETE: Zero locks blocking active queries.`
      ]);
      setIsRunningVacuum(false);
      logAudit('Database Maintenance', `Executed VACUUM ANALYZE on ${selectedDb}. Reclaimed 18.4 MB dead tuples.`);
    }, 1200);
  };

  const handleToggleUserLock = (id: string) => {
    setUsersState(prev => prev.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'Locked' ? 'Active' : 'Locked';
        logAudit('User Access Modified', `User account '${u.email}' status changed to ${nextStatus}.`, 'Security');
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleToggleUserMfa = (id: string) => {
    setUsersState(prev => prev.map(u => {
      if (u.id === id) {
        const nextMfa = !u.mfaEnabled;
        logAudit('User Security Updated', `MFA requirement for user '${u.email}' set to ${nextMfa}.`, 'Security');
        return { ...u, mfaEnabled: nextMfa };
      }
      return u;
    }));
  };

  const handleUserRoleChange = (id: string, newRole: UserRole) => {
    setUsersState(prev => prev.map(u => {
      if (u.id === id) {
        logAudit('Role Promoted/Changed', `User '${u.email}' role updated from ${u.role} to ${newRole}.`, 'Security');
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  const handleForcePasswordReset = (email: string) => {
    logAudit('Password Reset Issued', `Force password reset token dispatched to user '${email}'.`, 'Security');
    alert(`Temporary password reset token issued for ${email}.\nToken: RESET-TMP-${Math.floor(100000 + Math.random() * 900000)}\nSent via secure notification gateway.`);
  };

  const handleRevokeTokens = (email: string) => {
    logAudit('Session Revocation', `Revoked all active JWT session tokens for user '${email}'.`, 'Security');
    alert(`Active auth tokens for ${email} revoked. User will be prompted to re-authenticate on next request.`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email) return;

    const newUser = {
      id: `usr-${Date.now()}`,
      name: newUserData.name,
      email: newUserData.email,
      role: newUserData.role,
      status: 'Active',
      mfaEnabled: true,
      lastLogin: 'Never'
    };

    setUsersState([newUser, ...usersState]);
    setNewUserModal(false);
    setNewUserData({ name: '', email: '', role: 'lecturer' });
    logAudit('User Account Created', `New system user '${newUser.email}' created with role '${newUser.role}'.`, 'Security');
  };

  const handleRunRlsSandbox = () => {
    let allowed = false;
    let policyName = 'Default Deny';
    let sqlExpression = 'FALSE';
    let reason = '';

    if (sandboxRole === 'it_admin' || sandboxRole === 'president') {
      allowed = true;
      policyName = 'p_admin_super_access';
      sqlExpression = 'auth.jwt()->>\'role\' IN (\'it_admin\', \'president\')';
      reason = 'Superuser or System Admin role has full CRUD bypass for governance & operations.';
    } else if (sandboxRole === 'student') {
      if (sandboxTable === 'students' && sandboxAction === 'SELECT') {
        allowed = true;
        policyName = 'p_student_self_read';
        sqlExpression = 'auth.uid() = student_uid';
        reason = 'Students can read their own personal profile records.';
      } else if (sandboxTable === 'courses' && sandboxAction === 'SELECT') {
        allowed = true;
        policyName = 'p_public_course_catalog';
        sqlExpression = 'is_published = TRUE';
        reason = 'Course catalog is publicly readable by all authenticated students.';
      } else {
        allowed = false;
        policyName = 'p_student_isolation_policy';
        sqlExpression = 'auth.uid() = student_uid AND is_owner(table)';
        reason = `Student role is strictly prohibited from executing ${sandboxAction} on '${sandboxTable}'.`;
      }
    } else if (sandboxRole === 'lecturer') {
      if (sandboxTable === 'courses' && sandboxAction === 'SELECT') {
        allowed = true;
        policyName = 'p_lecturer_assigned_courses';
        sqlExpression = 'instructor_id = auth.uid()';
        reason = 'Lecturers can manage and view their assigned teaching modules.';
      } else if (sandboxTable === 'staff' && sandboxAction === 'SELECT') {
        allowed = true;
        policyName = 'p_staff_directory_view';
        sqlExpression = 'TRUE';
        reason = 'Staff directory is accessible to all university personnel.';
      } else {
        allowed = false;
        policyName = 'p_faculty_restriction';
        sqlExpression = 'FALSE';
        reason = `Lecturers do not possess administrative privilege for ${sandboxAction} on '${sandboxTable}'.`;
      }
    } else {
      allowed = true;
      policyName = `p_${sandboxRole}_department_scope`;
      sqlExpression = `department = auth.jwt()->>'department'`;
      reason = `Access granted based on ${sandboxRole} departmental permission claims.`;
    }

    setSandboxResult({ allowed, policyName, sqlExpression, reason });
  };

  const handleCreatePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    const createdRule = {
      table: newPolicyData.table,
      policyName: newPolicyData.policyName,
      action: newPolicyData.action,
      roleScope: newPolicyData.roleScope,
      definition: newPolicyData.definition,
      status: 'Active' as const
    };
    setRlsRules([createdRule, ...rlsRules]);
    setAddPolicyModal(false);
    logAudit('RLS Policy Created', `New RLS policy '${createdRule.policyName}' applied to table '${createdRule.table}'.`, 'Security');
  };

  const handleGenerateR2Url = () => {
    const url = getSignedR2Url(selectedDocName);
    setGeneratedSignedUrl(url);

    const expiresDate = new Date(Date.now() + urlExpiry * 1000).toLocaleTimeString();
    setActiveSignedUrls(prev => [
      { docName: selectedDocName, url, expiresAt: expiresDate, status: 'Active' },
      ...prev.filter(item => item.docName !== selectedDocName)
    ]);
    logAudit('R2 Signed URL Issued', `Temporary 60-min signed R2 URL issued for object '${selectedDocName}'.`);
  };

  const handleRevokeSignedUrl = (docName: string) => {
    setActiveSignedUrls(prev => prev.map(u => u.docName === docName ? { ...u, status: 'Revoked' } : u));
    logAudit('R2 Signed URL Revoked', `Revoked active temporary download token for '${docName}'.`, 'Security');
  };

  const handleUploadSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadSimulating(true);
    setUploadFileName(file.name);

    setTimeout(() => {
      const newFile = {
        name: file.name,
        sizeMB: +(file.size / (1024 * 1024)).toFixed(2) || 1.1,
        mime: file.type || 'application/pdf',
        category: 'Vault Upload',
        uploaded: new Date().toISOString().split('T')[0],
        checksum: `sha256-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      };

      setR2VaultFiles([newFile, ...r2VaultFiles]);
      setUploadSimulating(false);
      setUploadFileName('');
      logAudit('R2 Object Uploaded', `File '${file.name}' (${newFile.sizeMB} MB) uploaded to Cloudflare R2 bucket 'bmi-ums-vault'.`);
    }, 800);
  };

  const handleRunBackup = async () => {
    setIsBackingUp(true);
    setBackupConsoleLogs([
      `[${new Date().toISOString()}] Initiating automated pg_dump for Neon DB project '${selectedDb}'...`,
      `Connecting to postgres://neon_user:***@ep-cool-mountains.us-east-2.aws.neon.tech/${selectedDb}...`,
      `Executing: pg_dump --no-owner --no-privileges --clean --format=custom...`,
      `Piping binary stream to pigz multithreaded compression worker...`
    ]);

    setTimeout(() => {
      setBackupConsoleLogs(prev => [
        ...prev,
        `Compression complete. Snapshot size: 14.3 MB (Compression ratio: 4.8x).`,
        `Signing S3 API payload for Cloudflare R2 bucket 'bmi-ums-backups'...`,
        `PUT s3://bmi-ums-backups/manual/${selectedDb}-${newDateStr()}.sql.gz HTTP/1.1 200 OK`
      ]);

      setTimeout(async () => {
        await triggerBackup(selectedDb);
        setBackupConsoleLogs(prev => [
          ...prev,
          `SUCCESS: Database backup verified and stored in R2 bucket with $0 bandwidth egress fees!`
        ]);
        setIsBackingUp(false);
      }, 500);
    }, 700);
  };

  const handleRestoreDatabase = () => {
    if (!restoreModalBackup) return;
    setIsRestoring(true);
    setRestoreConsoleLogs([
      `[${new Date().toISOString()}] INITIALIZING POINT-IN-TIME DATABASE RESTORE SEQUENCE...`,
      `Target DB Project: ${restoreModalBackup.databaseProject}`,
      `Source Snapshot: ${restoreModalBackup.filename}`,
      `Terminating active client pool connections on target database...`,
      `Downloading snapshot from R2 bucket '${restoreModalBackup.r2Bucket}'...`
    ]);

    setTimeout(() => {
      setRestoreConsoleLogs(prev => [
        ...prev,
        `Decompressing pigz snapshot payload...`,
        `Executing pg_restore --clean --if-exists --single-transaction...`,
        `Rebuilding foreign keys, GIN/B-Tree indexes, and RLS security policies...`,
        `Running schema integrity diagnostic checks...`
      ]);

      setTimeout(() => {
        setRestoreConsoleLogs(prev => [
          ...prev,
          `RESTORE COMPLETE: Database project '${restoreModalBackup.databaseProject}' restored to snapshot state (${restoreModalBackup.timestamp}).`
        ]);
        setIsRestoring(false);
        logAudit('Database Restore Executed', `Restored database project '${restoreModalBackup.databaseProject}' from backup ${restoreModalBackup.filename}.`, 'Security');
      }, 800);
    }, 800);
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyData.name) return;

    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyData.name,
      prefix: `bmi_sk_live_${Math.random().toString(36).substring(2, 6)}...`,
      scopes: newKeyData.scopes,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      status: 'Active'
    };

    setApiKeys([newKey, ...apiKeys]);
    setNewKeyModal(false);
    setNewKeyData({ name: '', scopes: ['read:students'] });
    logAudit('API Key Issued', `New integration API key '${newKey.name}' generated.`, 'Security');
  };

  const handleRevokeApiKey = (id: string, name: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    logAudit('API Key Revoked', `Integration API key '${name}' was revoked.`, 'Security');
  };

  const handleTestWebhook = (wh: typeof webhooks[0]) => {
    setTestWebhookResult({
      id: wh.id,
      status: 200,
      durationMs: Math.floor(Math.random() * 40) + 25,
      response: `{"success": true, "event": "${wh.event}", "timestamp": "${new Date().toISOString()}", "message": "Webhook payload received"}`
    });
    logAudit('Webhook Dispatched', `Test payload delivered to ${wh.url} (HTTP 200 OK).`);
  };

  const handleTestHoldConstraint = () => {
    const std = students.find(s => s.id === holdTestStudentId);
    const crs = courses.find(c => c.id === holdTestCourseId);

    if (std?.financialHold) {
      setHoldTestResult({
        status: 'blocked',
        sqlConstraint: 'CONSTRAINT chk_financial_hold CHECK (NOT (financial_hold AND IS_REGISTERING()))',
        message: `DB CONSTRAINT TRIGGER BLOCKED REGISTRATION: Student ${std.firstName} ${std.lastName} (${std.studentUid}) has active financialHold = TRUE. Postgres transaction aborted.`
      });
    } else {
      setHoldTestResult({
        status: 'passed',
        sqlConstraint: 'CONSTRAINT chk_financial_hold PASSED (financial_hold = FALSE)',
        message: `DB CONSTRAINT CHECK PASSED: Student ${std?.firstName} ${std?.lastName} has no active financial holds. Registration transaction permitted.`
      });
    }
  };

  const newDateStr = () => new Date().toISOString().split('T')[0];

  const filteredLogs = auditLogs.filter(log => {
    const matchesKeyword = !auditFilter || 
      log.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(auditFilter.toLowerCase());

    const matchesSeverity = auditSeverityFilter === 'all' || log.severity?.toLowerCase() === auditSeverityFilter.toLowerCase();
    return matchesKeyword && matchesSeverity;
  });

  const handleExportAuditLogs = () => {
    const header = 'ID,Timestamp,PerformedBy,Role,Action,Severity,Details\n';
    const rows = filteredLogs.map(l => `"${l.id}","${l.timestamp}","${l.performedBy}","${l.role}","${l.action}","${l.severity}","${l.details.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bmi_ums_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    logAudit('Audit Logs Exported', 'Exported security audit logs to CSV file format.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      
      {/* Global System Announcement Banner (Editable by IT Admin) */}
      {isBannerActive && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 text-xs shadow-md">
          <div className="flex items-center space-x-3">
            <Bell className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] block">Live Broadcast System Banner</span>
              <p className="text-white font-medium">{systemBanner}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                const msg = prompt('Enter new global system announcement message:', systemBanner);
                if (msg !== null) {
                  setSystemBanner(msg);
                  logAudit('System Banner Updated', `Updated broadcast announcement message.`);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/40 transition"
            >
              Edit Banner Message
            </button>
            <button
              onClick={() => setIsBannerActive(false)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Neon Postgres Core
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
              Cloudflare R2 Storage
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
              JWT Row-Level Security
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2 flex items-center space-x-3">
            <Server className="w-7 h-7 text-emerald-400" />
            <span>BMI UMS Infrastructure Console</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Complete IT system management: Database bounded contexts, User account permissions, Row-Level Security, Cloudflare R2 vault, Nightly pg_dump backups, and API token gateways.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handlePingColdStart}
            disabled={isPinging}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition flex items-center space-x-2"
          >
            <Zap className={`w-4 h-4 text-amber-400 ${isPinging ? 'animate-bounce' : ''}`} />
            <span>{isPinging ? 'Testing Ping...' : pingLatency ? `Cold Start: ${pingLatency}ms` : 'Ping Cold Start'}</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Re-initialize entire UMS seed database? This restores all default student, course, and grade records.')) {
                resetDemoData();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Seed Data</span>
          </button>
        </div>
      </div>

      {/* Quick System Flags Control Strip */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <button
          onClick={() => toggleSystemFlag('maintenanceMode')}
          className={`p-3 rounded-xl border transition flex items-center justify-between text-left ${
            systemFlags.maintenanceMode 
              ? 'bg-rose-950/40 border-rose-700 text-rose-200' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div>
            <span className="font-bold text-white block text-[11px]">Maintenance Mode</span>
            <span className="text-[10px] text-slate-400">{systemFlags.maintenanceMode ? 'System Locked' : 'System Operational'}</span>
          </div>
          {systemFlags.maintenanceMode ? <ToggleRight className="w-6 h-6 text-rose-400 shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-500 shrink-0" />}
        </button>

        <button
          onClick={() => toggleSystemFlag('mfaRequired')}
          className={`p-3 rounded-xl border transition flex items-center justify-between text-left ${
            systemFlags.mfaRequired 
              ? 'bg-indigo-950/40 border-indigo-700 text-indigo-200' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div>
            <span className="font-bold text-white block text-[11px]">Enforce MFA</span>
            <span className="text-[10px] text-slate-400">{systemFlags.mfaRequired ? 'Required for All' : 'Optional'}</span>
          </div>
          {systemFlags.mfaRequired ? <ToggleRight className="w-6 h-6 text-indigo-400 shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-500 shrink-0" />}
        </button>

        <button
          onClick={() => toggleSystemFlag('autoClearHolds')}
          className={`p-3 rounded-xl border transition flex items-center justify-between text-left ${
            systemFlags.autoClearHolds 
              ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div>
            <span className="font-bold text-white block text-[11px]">Auto Clear Holds</span>
            <span className="text-[10px] text-slate-400">{systemFlags.autoClearHolds ? 'Active on $0 Balance' : 'Manual Clearance'}</span>
          </div>
          {systemFlags.autoClearHolds ? <ToggleRight className="w-6 h-6 text-emerald-400 shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-500 shrink-0" />}
        </button>

        <button
          onClick={() => toggleSystemFlag('openEnrollment')}
          className={`p-3 rounded-xl border transition flex items-center justify-between text-left ${
            systemFlags.openEnrollment 
              ? 'bg-cyan-950/40 border-cyan-700 text-cyan-200' 
              : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <div>
            <span className="font-bold text-white block text-[11px]">Open Registration</span>
            <span className="text-[10px] text-slate-400">{systemFlags.openEnrollment ? 'Enrollment Window Open' : 'Closed'}</span>
          </div>
          {systemFlags.openEnrollment ? <ToggleRight className="w-6 h-6 text-cyan-400 shrink-0" /> : <ToggleLeft className="w-6 h-6 text-slate-500 shrink-0" />}
        </button>
      </div>

      {/* System Capacity & Live Performance Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Neon Core DB</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">142.8 MB / 512 MB</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '28.5%' }} />
          </div>
          <p className="text-[11px] text-slate-400">Normalized PostgreSQL core tables.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Cloud className="w-4 h-4 text-cyan-400" />
              <span>Cloudflare R2</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold">1.4 GB / 10 GB</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-500 h-full rounded-full" style={{ width: '14%' }} />
          </div>
          <p className="text-[11px] text-slate-400">Zero bandwidth egress storage.</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Server Load</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-400 font-bold">{metrics.cpuUsage}% CPU</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${metrics.cpuUsage}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">RAM: {metrics.memoryUsageMB} MB • Uptime: {metrics.uptimeDays}d</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5">
              <Wifi className="w-4 h-4 text-amber-400" />
              <span>DB Pool Connections</span>
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">{metrics.activeDbConnections} / 50 Active</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(metrics.activeDbConnections / 50) * 100}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">Cache hit ratio: {metrics.cacheHitRatio}%</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-200">Diagnostics</span>
            <button
              onClick={handleRefreshMetrics}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Refresh Stats"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center space-x-1 my-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>All Services Operational</span>
          </div>
          <p className="text-[10px] text-slate-500">Auto-scaling Cloud Run instance.</p>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('neon_db')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'neon_db' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>1. Neon DB Projects & Schema</span>
        </button>

        <button
          onClick={() => setActiveTab('users_access')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'users_access' 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>2. User Access & Permissions ({usersState.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('auth_rls')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'auth_rls' 
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>3. RLS Policies & Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('r2_storage')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'r2_storage' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>4. Cloudflare R2 Vault</span>
        </button>

        <button
          onClick={() => setActiveTab('backups')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'backups' 
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>5. Backups & Restores ({dbBackups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('api_webhooks')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'api_webhooks' 
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>6. API Keys & Webhooks</span>
        </button>

        <button
          onClick={() => setActiveTab('hold_verifier')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'hold_verifier' 
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>7. DB Hold Constraint Sandbox</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`px-3.5 py-2 rounded-xl transition flex items-center space-x-2 shrink-0 ${
            activeTab === 'audit_logs' 
              ? 'bg-slate-700 text-white shadow-lg shadow-slate-700/30' 
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>8. Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* --- TAB 1: NEON DB PROJECTS & SCHEMA INSPECTOR --- */}
      {activeTab === 'neon_db' && (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Database Projects List */}
            <div className="space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Neon PostgreSQL Projects</span>
              </h3>

              <div className="space-y-3">
                {neonDatabases.map(db => (
                  <div
                    key={db.id}
                    onClick={() => setSelectedDb(db.projectName)}
                    className={`p-4 rounded-xl cursor-pointer border transition ${
                      selectedDb === db.projectName 
                        ? 'bg-slate-800 border-emerald-500 ring-2 ring-emerald-500/20' 
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-sm">{db.projectName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {db.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">{db.contextScope}</p>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Storage: <strong className="text-white">{db.usedMB} MB / {db.allocatedMB} MB</strong></span>
                      <span className="text-slate-400">Compute: <strong className="text-white">{db.computeHoursUsed} CU-hrs</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Maintenance Control */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Database Operations</span>
                </h4>
                
                <button
                  onClick={handleRunVacuum}
                  disabled={isRunningVacuum}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunningVacuum ? 'animate-spin' : ''}`} />
                  <span>{isRunningVacuum ? 'Executing VACUUM...' : 'Run VACUUM ANALYZE'}</span>
                </button>

                {vacuumLogs.length > 0 && (
                  <div className="bg-slate-950 p-3 rounded-lg font-mono text-[10px] text-emerald-300 space-y-1">
                    {vacuumLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Schema & Table Inspector */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center space-x-2">
                      <Code className="w-4 h-4 text-emerald-400" />
                      <span>Schema Inspector ({selectedDb})</span>
                    </h3>
                    <p className="text-slate-400 text-xs">Inspect table definitions, data types, indexes, and primary keys.</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="text-slate-400 text-xs font-semibold">Select Table:</label>
                    <select
                      value={selectedTable}
                      onChange={e => setSelectedTable(e.target.value)}
                      className="bg-slate-800 border border-slate-700 text-white font-bold text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="students">students</option>
                      <option value="applications">applications</option>
                      <option value="courses">courses</option>
                      <option value="invoices">invoices</option>
                      <option value="staff">staff</option>
                      <option value="audit_logs">audit_logs</option>
                    </select>
                  </div>
                </div>

                {/* Table Schema Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                        <th className="p-3">Column Name</th>
                        <th className="p-3">Data Type</th>
                        <th className="p-3">Key Constraint</th>
                        <th className="p-3">Nullable</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {(tableSchemas[selectedTable] || []).map(col => (
                        <tr key={col.column} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">{col.column}</td>
                          <td className="p-3 text-emerald-300">{col.type}</td>
                          <td className="p-3">
                            {col.isPk ? (
                              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] border border-amber-800 font-sans font-bold">
                                PRIMARY KEY
                              </span>
                            ) : (
                              <span className="text-slate-500 font-sans text-[10px]">STANDARD</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-400 font-sans">{col.nullable ? 'YES' : 'NO'}</td>
                          <td className="p-3 text-slate-300 font-sans text-[11px]">{col.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Connection Pool Config */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 mt-4">
                  <h4 className="font-bold text-white text-xs">PgBouncer Connection Pool Configuration</h4>
                  <div className="grid grid-cols-3 gap-3 text-slate-300 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-1">Max Pool Connections</label>
                      <input
                        type="number"
                        value={poolConfig.maxConnections}
                        onChange={e => setPoolConfig({ ...poolConfig, maxConnections: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-1">Idle Timeout (sec)</label>
                      <input
                        type="number"
                        value={poolConfig.idleTimeoutSec}
                        onChange={e => setPoolConfig({ ...poolConfig, idleTimeoutSec: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-semibold mb-1">Statement Timeout (ms)</label>
                      <input
                        type="number"
                        value={poolConfig.statementTimeoutMs}
                        onChange={e => setPoolConfig({ ...poolConfig, statementTimeoutMs: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 2: USER ACCESS & ROLE PERMISSIONS --- */}
      {activeTab === 'users_access' && (
        <div className="space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <span>User Account & Role Governance</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Manage administrative accounts, faculty credentials, role privileges, and session locks.</p>
              </div>

              <button
                onClick={() => setNewUserModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shadow-lg shadow-indigo-600/30 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create System Account</span>
              </button>
            </div>

            {/* Search & Role Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search user accounts by name, email, or role..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Roles</option>
                <option value="president">President</option>
                <option value="registrar">Registrar</option>
                <option value="it_admin">IT Admin</option>
                <option value="finance">Finance</option>
                <option value="lecturer">Lecturer</option>
                <option value="admissions">Admissions</option>
                <option value="student">Student</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/60">
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Permission Role</th>
                    <th className="p-3">MFA Status</th>
                    <th className="p-3">Account Status</th>
                    <th className="p-3">Last Login</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {usersState
                    .filter(u => {
                      const matchQuery = u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                      const matchRole = roleFilter === 'all' || u.role === roleFilter;
                      return matchQuery && matchRole;
                    })
                    .map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{u.name}</td>
                        <td className="p-3 text-slate-300 font-mono text-[11px]">{u.email}</td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            onChange={e => handleUserRoleChange(u.id, e.target.value as UserRole)}
                            className="bg-slate-950 border border-slate-700 text-indigo-300 font-mono font-bold text-[10px] rounded px-2 py-1"
                          >
                            <option value="student">student</option>
                            <option value="lecturer">lecturer</option>
                            <option value="registrar">registrar</option>
                            <option value="finance">finance</option>
                            <option value="admissions">admissions</option>
                            <option value="hr_manager">hr_manager</option>
                            <option value="it_admin">it_admin</option>
                            <option value="president">president</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleUserMfa(u.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                              u.mfaEnabled 
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-700' 
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {u.mfaEnabled ? 'MFA ACTIVE' : 'NO MFA'}
                          </button>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'Active' 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">{u.lastLogin}</td>
                        <td className="p-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleToggleUserLock(u.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              u.status === 'Locked' 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                : 'bg-rose-600/80 hover:bg-rose-600 text-white'
                            }`}
                          >
                            {u.status === 'Locked' ? 'Unlock' : 'Lock'}
                          </button>
                          <button
                            onClick={() => handleForcePasswordReset(u.email)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold"
                            title="Force Password Reset"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleRevokeTokens(u.email)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-semibold"
                            title="Revoke Active Sessions"
                          >
                            Revoke Tokens
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

      {/* --- TAB 3: AUTH & RLS POLICIES --- */}
      {activeTab === 'auth_rls' && (
        <div className="space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-purple-400" />
                  <span>Row-Level Security (RLS) Policy Inspector & Sandbox</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Database server-enforced security rules preventing cross-account data leaks.</p>
              </div>

              <button
                onClick={() => setAddPolicyModal(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition flex items-center space-x-2 shadow-lg shadow-purple-600/30 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom RLS Policy</span>
              </button>
            </div>

            {/* Interactive RLS Policy Evaluation Sandbox */}
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                <Play className="w-4 h-4 text-purple-400" />
                <span>Interactive RLS Policy Sandbox Simulator</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Simulated User Role</label>
                  <select
                    value={sandboxRole}
                    onChange={e => setSandboxRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-semibold text-xs rounded-lg px-3 py-2"
                  >
                    <option value="student">student</option>
                    <option value="lecturer">lecturer</option>
                    <option value="registrar">registrar</option>
                    <option value="finance">finance</option>
                    <option value="it_admin">it_admin</option>
                    <option value="president">president</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Target Table</label>
                  <select
                    value={sandboxTable}
                    onChange={e => setSandboxTable(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-semibold text-xs rounded-lg px-3 py-2"
                  >
                    <option value="students">students</option>
                    <option value="courses">courses</option>
                    <option value="invoices">invoices</option>
                    <option value="staff">staff</option>
                    <option value="audit_logs">audit_logs</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-semibold block mb-1">Action</label>
                  <select
                    value={sandboxAction}
                    onChange={e => setSandboxAction(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 text-white font-semibold text-xs rounded-lg px-3 py-2"
                  >
                    <option value="SELECT">SELECT</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleRunRlsSandbox}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition flex items-center justify-center space-x-1.5"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Evaluate RLS Policy</span>
                  </button>
                </div>
              </div>

              {/* Evaluation Output Result */}
              {sandboxResult && (
                <div className={`p-4 rounded-xl border space-y-2 mt-3 ${
                  sandboxResult.allowed 
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' 
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}>
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="flex items-center space-x-2">
                      {sandboxResult.allowed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-400" />
                      )}
                      <span>RESULT: {sandboxResult.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED BY RLS'}</span>
                    </span>
                    <span className="font-mono text-xs text-purple-300">Policy: {sandboxResult.policyName}</span>
                  </div>
                  <p className="text-xs">{sandboxResult.reason}</p>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300">
                    <span className="text-slate-500 text-[9px] uppercase font-sans font-bold block mb-1">Postgres USING Check:</span>
                    <code>{sandboxResult.sqlExpression}</code>
                  </div>
                </div>
              )}
            </div>

            {/* Existing RLS Policies List */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Active Postgres Row-Level Security Rules ({rlsRules.length})</h4>
              {rlsRules.map(pol => (
                <div key={pol.policyName} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono font-bold text-[10px]">
                        {pol.action}
                      </span>
                      <span className="font-bold text-white text-sm font-mono">{pol.table}</span>
                      <span className="text-slate-400">• Policy: <strong className="text-purple-300">{pol.policyName}</strong></span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                      {pol.status}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-purple-300">
                    <span className="text-slate-500 uppercase font-sans text-[9px] block mb-1">SQL USING EXPRESSION:</span>
                    <code>{pol.definition}</code>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 4: CLOUDFLARE R2 VAULT --- */}
      {activeTab === 'r2_storage' && (
        <div className="space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Cloud className="w-5 h-5 text-cyan-400" />
                  <span>Cloudflare R2 Object Storage Vault</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">High-volume PDF transcripts, high school scans, and invoices stored with zero bandwidth egress fees.</p>
              </div>

              <label className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center space-x-2 cursor-pointer shadow-lg shadow-cyan-600/30 shrink-0">
                <UploadCloud className="w-4 h-4" />
                <span>{uploadSimulating ? `Uploading ${uploadFileName}...` : 'Upload Asset to R2'}</span>
                <input type="file" onChange={handleUploadSimulate} className="hidden" disabled={uploadSimulating} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Signed URL Generator */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <h4 className="font-bold text-white text-sm">Generate Temporary Signed Download URL</h4>

                <div className="space-y-2">
                  <label className="text-slate-400 font-semibold block text-xs">Select Document Asset</label>
                  <select
                    value={selectedDocName}
                    onChange={e => setSelectedDocName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  >
                    {r2VaultFiles.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name} ({f.sizeMB} MB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 font-semibold block text-xs">Expiration Token Duration</label>
                  <select
                    value={urlExpiry}
                    onChange={e => setUrlExpiry(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                  >
                    <option value={900}>15 Minutes (High Security)</option>
                    <option value={3600}>1 Hour (Standard)</option>
                    <option value={86400}>24 Hours (Extended)</option>
                    <option value={604800}>7 Days (Archival Access)</option>
                  </select>
                </div>

                <button
                  onClick={handleGenerateR2Url}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/30"
                >
                  <Zap className="w-4 h-4" />
                  <span>Issue Signed R2 URL Token</span>
                </button>

                {generatedSignedUrl && (
                  <div className="p-3 bg-slate-900 rounded-lg border border-cyan-800/60 font-mono text-[10px] text-cyan-300 break-all space-y-2">
                    <div>{generatedSignedUrl}</div>
                    <div className="flex items-center space-x-2 pt-1">
                      <a
                        href={generatedSignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center space-x-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Simulate Fetch</span>
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedSignedUrl);
                          alert('Signed URL copied to clipboard!');
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* R2 Vault Files Browser */}
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-sm">Stored Vault Assets ({r2VaultFiles.length})</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {r2VaultFiles.map(file => (
                    <div key={file.name} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between font-bold text-white text-xs">
                        <span className="truncate pr-2">{file.name}</span>
                        <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800 shrink-0">
                          {file.sizeMB} MB
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Category: {file.category} • Uploaded: {file.uploaded}</p>
                      <div className="text-[9px] font-mono text-slate-500 truncate">SHA-256: {file.checksum}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* --- TAB 5: BACKUPS & RESTORES --- */}
      {activeTab === 'backups' && (
        <div className="space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-amber-400" />
                  <span>Nightly pg_dump Backups & Cloudflare R2 Snapshots</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Automated database dump snapshots saved directly to Cloudflare R2 object storage.</p>
              </div>

              <button
                onClick={handleRunBackup}
                disabled={isBackingUp}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center space-x-2 shadow-lg shadow-amber-600/30 shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
                <span>{isBackingUp ? 'Executing pg_dump...' : 'Run Manual Backup to R2'}</span>
              </button>
            </div>

            {/* Execution Logs */}
            {backupConsoleLogs.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
                <div className="flex items-center space-x-2 text-slate-400 text-[10px] font-bold uppercase mb-2">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Backup Runner Terminal Logs</span>
                </div>
                {backupConsoleLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">{log}</div>
                ))}
              </div>
            )}

            {/* Historical Snapshots Table */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Verified Snapshot Archives ({dbBackups.length})</h4>
              <div className="space-y-2">
                {dbBackups.map(bkp => (
                  <div key={bkp.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                    <div className="space-y-1">
                      <div className="text-white font-bold text-xs flex items-center space-x-2">
                        <span>{bkp.filename}</span>
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] border border-amber-800">
                          {bkp.databaseProject}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Timestamp: {bkp.timestamp} • Size: {bkp.sizeMB} MB • Bucket: {bkp.r2Bucket}</p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                        {bkp.status}
                      </span>
                      <button
                        onClick={() => setRestoreModalBackup(bkp)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-sans font-bold transition"
                      >
                        Restore Snapshot
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Backup Retention Settings */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 font-semibold block text-xs mb-1">Automated Schedule</label>
                <select
                  value={backupSchedule}
                  onChange={e => setBackupSchedule(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                >
                  <option value="hourly">Hourly Incremental Dumps</option>
                  <option value="nightly">Nightly Full pg_dump at 02:00 UTC</option>
                  <option value="weekly">Weekly Full Snapshot</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block text-xs mb-1">Rolling Retention Policy</label>
                <select
                  value={retentionDays}
                  onChange={e => setRetentionDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                >
                  <option value={7}>7 Days (Development)</option>
                  <option value={30}>30 Days (Standard Compliance)</option>
                  <option value={90}>90 Days (Financial Clearance)</option>
                  <option value={365}>365 Days (Archival Standards)</option>
                </select>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 6: API KEYS & WEBHOOKS --- */}
      {activeTab === 'api_webhooks' && (
        <div className="space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
            
            {/* API Keys Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center space-x-2">
                    <Key className="w-5 h-5 text-teal-400" />
                    <span>REST / GraphQL API Access Keys</span>
                  </h3>
                  <p className="text-slate-400 text-xs">Token credentials for external service integrations.</p>
                </div>

                <button
                  onClick={() => setNewKeyModal(true)}
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate API Key</span>
                </button>
              </div>

              <div className="space-y-2">
                {apiKeys.map(key => (
                  <div key={key.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs flex items-center space-x-2">
                        <span>{key.name}</span>
                        <span className="font-mono text-teal-300 text-[11px]">{key.prefix}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {key.scopes.map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-mono border border-slate-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-slate-400">Last used: {key.lastUsed}</span>
                      <button
                        onClick={() => handleRevokeApiKey(key.id, key.name)}
                        className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded text-[10px] font-bold border border-rose-800"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhooks Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ExternalLink className="w-5 h-5 text-teal-400" />
                <span>Active System Event Webhooks</span>
              </h3>

              <div className="space-y-3">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white text-xs flex items-center space-x-2">
                        <span>{wh.name}</span>
                        <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 text-[10px] font-mono border border-teal-800">
                          {wh.event}
                        </span>
                      </div>
                      <button
                        onClick={() => handleTestWebhook(wh)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded text-xs font-bold transition flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Test Dispatch</span>
                      </button>
                    </div>

                    <div className="font-mono text-[11px] text-slate-400 break-all">{wh.url}</div>
                  </div>
                ))}
              </div>

              {testWebhookResult && (
                <div className="p-4 bg-slate-950 border border-teal-800 rounded-xl font-mono text-[11px] space-y-1 text-teal-300">
                  <div className="font-bold text-white flex items-center space-x-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>WEBHOOK TEST DISPATCH SUCCESSFUL (HTTP {testWebhookResult.status})</span>
                    <span className="text-slate-400 text-[10px]">• Latency: {testWebhookResult.durationMs}ms</span>
                  </div>
                  <code>{testWebhookResult.response}</code>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* --- TAB 7: FINANCIAL HOLD DB CONSTRAINT SANDBOX --- */}
      {activeTab === 'hold_verifier' && (
        <div className="space-y-6 text-xs">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <span>Database-Level Financial Hold Constraint Sandbox</span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                Financial holds are enforced directly as Postgres check constraints and trigger procedures so that course registration cannot occur if unpaid balance exists.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-slate-950 p-5 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white text-sm">Select Student & Course to Test Constraint</h4>
                
                <div className="space-y-2">
                  <label className="text-slate-400 font-semibold block">Student Account</label>
                  <select
                    value={holdTestStudentId}
                    onChange={e => setHoldTestStudentId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    {students.map(std => (
                      <option key={std.id} value={std.id}>
                        {std.firstName} {std.lastName} ({std.studentUid}) - {std.financialHold ? '⚠️ FINANCIAL HOLD ACTIVE' : '✅ Clear'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-400 font-semibold block">Target Course</label>
                  <select
                    value={holdTestCourseId}
                    onChange={e => setHoldTestCourseId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-semibold"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.title} ({c.credits} Credits)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleTestHoldConstraint}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/30"
                >
                  <Zap className="w-4 h-4" />
                  <span>Execute Registration DB Transaction Test</span>
                </button>
              </div>

              {/* Transaction Result */}
              <div className="space-y-3 bg-slate-950 p-5 rounded-xl border border-slate-800">
                <h4 className="font-bold text-white text-sm">Postgres Engine Transaction Log</h4>
                {holdTestResult ? (
                  <div className="space-y-3">
                    <div className={`p-4 rounded-xl border ${
                      holdTestResult.status === 'blocked'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    }`}>
                      <div className="font-bold text-sm mb-1 flex items-center space-x-2">
                        {holdTestResult.status === 'blocked' ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>TRANSACTION ABORTED BY DB TRIGGER</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>TRANSACTION COMMITTED</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs">{holdTestResult.message}</p>
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold mb-1">Postgres Constraint Definition:</span>
                      <code>{holdTestResult.sqlConstraint}</code>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-lg">
                    Click execute to test database-level financial hold transaction blocking.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 8: AUDIT LOGS & DIAGNOSTICS --- */}
      {activeTab === 'audit_logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md text-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="font-bold text-white text-base flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Live Security Audit Logs ({filteredLogs.length} Events)</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">Immutable Postgres audit log trail capturing all governance actions.</p>
            </div>

            <button
              onClick={handleExportAuditLogs}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition flex items-center space-x-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Audit Log</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search audit trail by user, action, or details..."
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-emerald-500"
            />

            <select
              value={auditSeverityFilter}
              onChange={e => setAuditSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-white font-semibold text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="security">Security</option>
            </select>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 font-mono text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-indigo-300 font-bold">[{log.timestamp}] {log.action}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.severity === 'Security' 
                        ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                        : log.severity === 'Warning' 
                        ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {log.severity || 'Info'}
                    </span>
                    <span className="text-emerald-400 font-sans font-semibold">{log.performedBy}</span>
                  </div>
                </div>
                <p className="text-slate-200">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE USER --- */}
      {newUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <span>Create System User Account</span>
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={e => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. Dr. Alan Grant"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                  placeholder="e.g. a.grant@bmi.edu"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">System Permission Role</label>
                <select
                  value={newUserData.role}
                  onChange={e => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="lecturer">Lecturer</option>
                  <option value="registrar">Registrar</option>
                  <option value="finance">Finance</option>
                  <option value="admissions">Admissions</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="it_admin">IT Admin</option>
                  <option value="president">President</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: ADD CUSTOM RLS POLICY --- */}
      {addPolicyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Lock className="w-5 h-5 text-purple-400" />
              <span>Define Custom RLS Security Policy</span>
            </h3>

            <form onSubmit={handleCreatePolicy} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Target Table</label>
                <select
                  value={newPolicyData.table}
                  onChange={e => setNewPolicyData({ ...newPolicyData, table: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold"
                >
                  <option value="students">students</option>
                  <option value="courses">courses</option>
                  <option value="invoices">invoices</option>
                  <option value="staff">staff</option>
                  <option value="audit_logs">audit_logs</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Policy Identifier Name</label>
                <input
                  type="text"
                  required
                  value={newPolicyData.policyName}
                  onChange={e => setNewPolicyData({ ...newPolicyData, policyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">SQL USING Expression</label>
                <input
                  type="text"
                  required
                  value={newPolicyData.definition}
                  onChange={e => setNewPolicyData({ ...newPolicyData, definition: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddPolicyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/30"
                >
                  Save Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: RESTORE DATABASE CONFIRMATION --- */}
      {restoreModalBackup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Database Point-In-Time Restore Confirmation</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to restore database project <strong className="text-amber-300">{restoreModalBackup.databaseProject}</strong> to snapshot state <strong className="text-white">{restoreModalBackup.timestamp}</strong>.
            </p>

            {restoreConsoleLogs.length > 0 && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[10px] text-amber-300 space-y-1">
                {restoreConsoleLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                disabled={isRestoring}
                onClick={() => {
                  setRestoreModalBackup(null);
                  setRestoreConsoleLogs([]);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
              >
                Close
              </button>
              <button
                disabled={isRestoring}
                onClick={handleRestoreDatabase}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-600/30 flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                <span>{isRestoring ? 'Restoring Database...' : 'Execute Database Restore'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: GENERATE API KEY --- */}
      {newKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-teal-400" />
              <span>Generate Integration API Token</span>
            </h3>

            <form onSubmit={handleCreateApiKey} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Integration / Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Canvas LMS Integration Key"
                  value={newKeyData.name}
                  onChange={e => setNewKeyData({ ...newKeyData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-semibold block">Assigned Scope Privileges</label>
                {['read:students', 'write:grades', 'read:invoices', 'write:payments', 'admin:full'].map(scope => (
                  <label key={scope} className="flex items-center space-x-2 text-slate-300 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={newKeyData.scopes.includes(scope)}
                      onChange={e => {
                        if (e.target.checked) {
                          setNewKeyData({ ...newKeyData, scopes: [...newKeyData.scopes, scope] });
                        } else {
                          setNewKeyData({ ...newKeyData, scopes: newKeyData.scopes.filter(s => s !== scope) });
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-950 text-teal-500 focus:ring-teal-500"
                    />
                    <span className="font-mono text-xs">{scope}</span>
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewKeyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold shadow-lg shadow-teal-600/30"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
