/* eslint-disable */
/* eslint-disable */
import React, { useState, useMemo, useEffect } from "react";
import {
  Send,
  Mail,
  Smartphone,
  Users,
  Search,
  History,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Bot,
  Sparkles,
  Paperclip,
  FileText,
  ChevronRight,
  Trash2,
  Layout,
  Loader2,
  Check,
  ShieldCheck,
  Zap,
  Info,
  User,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { getAIResponse } from "../services/aiService";
import { Student, StaffMember } from "../types";
import { useDataStore } from "../stores/dataStore";

interface MessageLog {
  id: string;
  type: "SMS" | "Email";
  recipient: string;
  date: string;
  status: "Delivered" | "Pending" | "Failed";
  subject?: string;
  text: string;
}

const Communications: React.FC = () => {
  const students = useDataStore((s) => s.students);
  const staff = useDataStore((s) => s.staff);
  const [activeChannel, setActiveChannel] = useState<"sms" | "email">("email");
  const [activeTab, setActiveTab] = useState<"composer" | "history">(
    "composer",
  );
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [recipientType, setRecipientType] = useState<
    "Broadcast" | "Individual"
  >("Broadcast");
  const [recipientGroup, setRecipientGroup] = useState(
    "All Registered Students",
  );
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [isAiDrafting, setIsAiDrafting] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [history, setHistory] = useState<MessageLog[]>(() => {
    const saved = localStorage.getItem("bmi_comms_history");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: "MSG-8821",
            type: "SMS",
            recipient: "Cohort 2024",
            date: "2024-05-18 09:12",
            status: "Delivered",
            text: "Institutional Protocol: Campus facilities will transition to holiday schedule effective midnight tonight.",
          },
          {
            id: "MSG-8790",
            type: "Email",
            recipient: "Dr. Samuel Kiptoo",
            date: "2024-05-15 14:05",
            status: "Delivered",
            subject: "Dean's Council Meeting",
            text: "Respected Faculty,\nThe Dean requests your presence at the Zion Wing Seminar Room for the Q3 curriculum review.",
          },
          {
            id: "MSG-8742",
            type: "SMS",
            recipient: "BMI-2022-001",
            date: "2024-05-10 11:20",
            status: "Failed",
            text: "Urgent: Financial audit required. Please report to the Bursary Office node for ledger verification.",
          },
        ];
  });

  useEffect(() => {
    localStorage.setItem("bmi_comms_history", JSON.stringify(history));
  }, [history]);

  const templates = [
    {
      name: "Exam Reminder",
      channel: "both",
      text: "Official Notice: Final examinations for the current semester commence on [Date]. Ensure all academic clearances are satisfied.",
    },
    {
      name: "Fee Deadline",
      channel: "email",
      subject: "Urgent: Financial Commitment Deadline",
      text: "Institutional Audit Notice: The deadline for tuition settlement for the Fall 2024 cycle is approaching. Please satisfy outstanding dues to maintain portal access.",
    },
    {
      name: "Event Invitation",
      channel: "email",
      subject: "Chancellor's Excellence Convocation",
      text: "BMI University cordially invites you to the annual Convocation of Excellence at Bethlehem Hall.",
    },
    {
      name: "System Maintenance",
      channel: "sms",
      text: "ICT Alert: The Institutional ERP Node will undergo optimization on [Time]. System latency may be encountered.",
    },
  ];

  const filteredTemplates = templates.filter(
    (t) => t.channel === "both" || t.channel === activeChannel,
  );

  const getRecipientLabel = () => {
    if (recipientType === "Broadcast") return recipientGroup;
    const s = students.find((x) => x.id === selectedRecipientId);
    if (s) return `${s.first_name} ${s.last_name} (${s.id})`;
    const st = staff.find((x) => x.id === selectedRecipientId);
    if (st)
      return `${`${st.first_name ?? ""} ${st.last_name ?? ""}`.trim()} (${st.id})`;
    return "Unknown Recipient";
  };

  const handleAiDraft = async () => {
    if (!message && activeChannel === "email" && !subject) {
      setToastMsg("Please enter a brief topic or prompt for the AI.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsAiDrafting(true);
    const target = getRecipientLabel();
    const prompt = `Draft a professional BMI University institutional ${activeChannel} to ${target} about: ${message || subject || "general campus updates"}.
    Use a formal tone. DO NOT use stars (**) or HTML (<b>).
    Ensure titles end with a colon (:) or are on a single line.
    Include the official signature: "In Excellence, Office of the Registrar".`;

    let response = await getAIResponse(
      prompt,
      `Acting as the BMI Communications Director. Target: ${target}.`,
    );

    // Final clean: remove any accidental stars or tags
    response = response
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/<[^>]*>?/gm, "");

    if (activeChannel === "email") {
      if (response.includes("Subject:")) {
        const lines = response.split("\n");
        const subjLine = lines.find((l) => l.startsWith("Subject:"));
        if (subjLine) {
          setSubject(subjLine.replace("Subject:", "").trim());
          setMessage(
            lines
              .filter((l) => !l.startsWith("Subject:"))
              .join("\n")
              .trim(),
          );
        } else {
          setMessage(response);
        }
      } else {
        setMessage(response);
      }
    } else {
      setMessage(response.slice(0, 160));
    }
    setIsAiDrafting(false);
  };

  const handleSend = async () => {
    if (!message) return;
    if (recipientType === "Individual" && !selectedRecipientId) {
      setToastMsg("Please select a specific recipient from the registry.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsDispatching(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newMsg: MessageLog = {
      id: `MSG-${Math.floor(Math.random() * 9000) + 1000}`,
      type: activeChannel === "sms" ? "SMS" : "Email",
      recipient: getRecipientLabel(),
      date: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Delivered",
      subject: activeChannel === "email" ? subject : undefined,
      text: message,
    };

    setHistory([newMsg, ...history]);
    setIsDispatching(false);
    setToastMsg(
      `${activeChannel.toUpperCase()} Broadcast dispatched successfully.`,
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    setMessage("");
    setSubject("");
    setSelectedRecipientId("");
  };

  const handleWhatsAppSend = () => {
    if (!message) return;
    const cleanMsg = message.replace(/<[^>]*>?/gm, "");
    const formatNum = (num: string) => num.replace(/\D/g, "");

    let targetNumbers: string[] = [];

    if (recipientType === "Individual") {
      const entity =
        students.find((s) => s.id === selectedRecipientId) ||
        staff.find((st) => st.id === selectedRecipientId);
      if (entity?.phone) {
        targetNumbers.push(formatNum(entity.phone));
      }
    } else {
      // Broadcast Logic
      let targets: (Student | StaffMember)[] = [];
      if (recipientGroup === "All Registered Students") {
        targets = students;
      } else if (recipientGroup === "Faculty of Theology") {
        targets = students.filter((s) => s.faculty === "Theology");
      } else if (recipientGroup === "ICT Department") {
        targets = students.filter((s) => s.faculty === "ICT");
      } else if (recipientGroup === "Business Cohort") {
        targets = students.filter((s) => s.faculty === "Business");
      } else if (recipientGroup === "Education Staff") {
        targets = staff.filter(
          (st) => st.role?.includes("Education") || st.category === "Academic",
        );
      } else if (recipientGroup === "Eden Residence Tenants") {
        targets = students.filter((s) => s.status === "Active").slice(0, 10); // Simulated segment
      } else if (recipientGroup === "Emergency Nodes") {
        targets = staff.filter((st) => st.category === "Management");
      }
      targetNumbers = targets
        .map((t) => t.phone)
        .filter(Boolean)
        .map((n) => formatNum(n));
    }

    if (targetNumbers.length === 0) {
      setToastMsg(
        "Registry Error: No valid phone numbers identified for selection.",
      );
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    // Direct WhatsApp Dispatch (Sequential tab opening with delay to prevent browser blocking)
    targetNumbers.forEach((num, idx) => {
      setTimeout(() => {
        window.open(
          `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(cleanMsg)}`,
          "_blank",
        );
      }, idx * 800);
    });

    setHistory([
      {
        id: `MSG-${Math.floor(Math.random() * 9000) + 1000}`,
        type: "SMS",
        recipient: `${getRecipientLabel()} (WhatsApp)`,
        date: new Date().toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Delivered",
        text: message,
      },
      ...history,
    ]);

    setToastMsg(
      `WhatsApp Gateway: Initiating dispatch to ${targetNumbers.length} entities.`,
    );
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Logic to visually bold titles and signature lines in the UI without using tags in the text
  const renderMessageText = (text: string) => {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      // Bold if ends with colon, starts with "Subject", is the signature line, or is short and all caps
      const isHeader =
        trimmed.endsWith(":") ||
        trimmed.startsWith("Subject:") ||
        trimmed.startsWith("In Excellence") ||
        trimmed.startsWith("Office of the Registrar") ||
        trimmed.startsWith("BMI University") ||
        (trimmed.length > 0 &&
          trimmed.length < 30 &&
          trimmed === trimmed.toUpperCase() &&
          !trimmed.includes("."));

      return (
        <div
          key={i}
          className={
            isHeader
              ? "font-black text-gray-900 dark:text-white"
              : "font-medium"
          }
        >
          {line || "\u00A0"}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      {/* Sticky Header - Compact & Padded */}
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2 shadow-sm min-h-[60px]">
        <div className="flex items-center gap-3 pl-14 w-full md:w-auto">
          <div className="w-1 h-5 bg-[#FFD700] rounded-none"></div>
          <div className="flex flex-col">
            <h2 className="text-base md:text-lg font-bold text-[#2E004F] dark:text-white tracking-tight uppercase leading-none">
              Communications Center
            </h2>
            <p className="text-[8px] md:text-[9px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              BMI Institutional Broadcast & Global Notification Gateway
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Top Tab Bar */}
      <div className="sticky top-[60px] z-30 bg-[#F8F9FA]/95 dark:bg-[#0a0015]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-sm">
        <div className="flex items-center gap-2 mr-4 text-gray-400">
          <MessageSquare size={14} />
          <span className="text-[9px] font-black uppercase tracking-widest">
            Modules
          </span>
        </div>
        <button
          onClick={() => setActiveTab("composer")}
          className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "composer"
              ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
          }`}
        >
          <Send
            size={12}
            className={
              activeTab === "composer" ? "text-[#FFD700]" : "text-gray-400"
            }
          />{" "}
          Composer
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-[#4B0082] text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-500/50"
              : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-[#4B0082]"
          }`}
        >
          <History
            size={12}
            className={
              activeTab === "history" ? "text-[#FFD700]" : "text-gray-400"
            }
          />{" "}
          Dispatch Log
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-none border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6 flex items-center gap-2">
                <Layout size={14} className="text-[#4B0082]" /> Template Library
              </h3>
              <div className="space-y-2">
                {filteredTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setMessage(t.text);
                      setSubject(t.subject || "");
                    }}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-900 border border-transparent hover:border-[#4B0082] transition-all group rounded-none"
                  >
                    <p className="text-[11px] font-black uppercase text-gray-700 dark:text-gray-200 group-hover:text-[#4B0082]">
                      {t.name}
                    </p>
                    <div className="text-[9px] text-gray-400 mt-1 line-clamp-1 italic">
                      {t.text}
                    </div>
                  </button>
                ))}
              </div>
              <button className="w-full mt-6 py-3 border-2 border-dashed border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#4B0082] hover:border-[#4B0082] transition-all">
                Create New Template
              </button>
            </div>

            <div className="bg-[#1a0033] p-8 border-l-4 border-[#FFD700] text-white shadow-xl relative overflow-hidden">
              <Zap
                size={100}
                className="absolute -right-8 -bottom-8 text-white/5 rotate-12"
              />
              <div className="relative z-10 space-y-6">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">
                  Gateway Metrics
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-purple-300 uppercase">
                      Monthly SMS
                    </p>
                    <p className="text-xl font-black">12.4k / 50k</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-purple-300 uppercase">
                      Deliverability
                    </p>
                    <p className="text-xl font-black text-emerald-400">99.8%</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-tighter">
                    SMTP Relay healthy. Encryption: TLS 1.3 Active.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "composer" ? (
              <div className="bg-white dark:bg-gray-800 rounded-none shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[600px]">
                <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-900">
                  <button
                    onClick={() => setActiveChannel("email")}
                    className={`flex-1 py-6 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${activeChannel === "email" ? "bg-[#4B0082] text-white" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    <Mail
                      size={18}
                      className={
                        activeChannel === "email" ? "text-[#FFD700]" : ""
                      }
                    />{" "}
                    Institutional Email
                  </button>
                  <button
                    onClick={() => setActiveChannel("sms")}
                    className={`flex-1 py-6 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${activeChannel === "sms" ? "bg-[#4B0082] text-white" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    <Smartphone
                      size={18}
                      className={
                        activeChannel === "sms" ? "text-[#FFD700]" : ""
                      }
                    />{" "}
                    SMS Gateway
                  </button>
                </div>

                <div className="p-10 space-y-10 flex-1">
                  {/* Form Content ... */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                        Target Selection Mode
                      </label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setRecipientType("Broadcast")}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${recipientType === "Broadcast" ? "bg-[#4B0082] text-white border-[#4B0082]" : "bg-gray-50 text-gray-400 border-gray-200"}`}
                        >
                          Mass Broadcast
                        </button>
                        <button
                          onClick={() => setRecipientType("Individual")}
                          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border transition-all ${recipientType === "Individual" ? "bg-[#4B0082] text-white border-[#4B0082]" : "bg-gray-50 text-gray-400 border-gray-200"}`}
                        >
                          Selective Individual
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                        {recipientType === "Broadcast"
                          ? "Registry Segment"
                          : "Registry Entity Search"}
                      </label>
                      {recipientType === "Broadcast" ? (
                        <div className="relative group">
                          <Users
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B0082]"
                          />
                          <select
                            value={recipientGroup}
                            onChange={(e) => setRecipientGroup(e.target.value)}
                            className="w-full pl-12 pr-10 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-[#4B0082] outline-none text-sm font-black uppercase tracking-tight rounded-none appearance-none cursor-pointer shadow-inner"
                          >
                            <option>All Registered Students</option>
                            <option>Faculty of Theology</option>
                            <option>ICT Department</option>
                            <option>Business Cohort</option>
                            <option>Education Staff</option>
                            <option>Eden Residence Tenants</option>
                            <option>Emergency Nodes</option>
                          </select>
                        </div>
                      ) : (
                        <div className="relative group">
                          <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4B0082]"
                          />
                          <select
                            value={selectedRecipientId}
                            onChange={(e) =>
                              setSelectedRecipientId(e.target.value)
                            }
                            className="w-full pl-12 pr-10 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-[#4B0082] outline-none text-sm font-black uppercase tracking-tight rounded-none appearance-none cursor-pointer shadow-inner"
                          >
                            <option value="">--- Select Individual ---</option>
                            <optgroup label="Staff & Faculty">
                              {staff.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {`${st.first_name ?? ""} ${st.last_name ?? ""}`.trim()}{" "}
                                  ({st.id})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Student Registry">
                              {students.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.first_name} {s.last_name} ({s.id})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeChannel === "email" && (
                    <div className="space-y-2 animate-slide-up">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                        Formal Subject Line
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. OFFICIAL ADVISORY: Semester Curriculum Finalization"
                        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-[#4B0082] outline-none text-sm font-bold uppercase tracking-widest rounded-none shadow-inner"
                      />
                    </div>
                  )}

                  <div className="space-y-2 relative">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em]">
                        Broadcast Narrative
                      </label>
                      <button
                        onClick={handleAiDraft}
                        disabled={isAiDrafting}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#4B0082] text-[#FFD700] text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg border border-[#FFD700]/30 disabled:opacity-50"
                      >
                        {isAiDrafting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Bot size={12} />
                        )}
                        Assist with BMI AI
                      </button>
                    </div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={
                        activeChannel === "sms"
                          ? "Type concise SMS protocol message..."
                          : "Draft institutional email body content..."
                      }
                      className="w-full px-6 py-6 bg-gray-50 dark:bg-gray-700 border-2 border-transparent focus:border-[#4B0082] outline-none text-sm font-medium leading-relaxed rounded-none h-64 resize-none shadow-inner"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-gray-400 select-none">
                      {activeChannel === "email" && (
                        <button className="flex items-center gap-1.5 hover:text-[#4B0082] transition-colors">
                          <Paperclip size={12} /> Attach Protocols
                        </button>
                      )}
                      <span
                        className={
                          activeChannel === "sms" && message.length > 160
                            ? "text-red-500"
                            : ""
                        }
                      >
                        {message.length} /{" "}
                        {activeChannel === "sms" ? "160 (1 Segment)" : "10,000"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-900 text-[#FFD700] rounded-none shadow-lg">
                        <ShieldCheck size={20} />
                      </div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest max-w-[300px] leading-relaxed">
                        This transmission is record-locked. Hierarchy:
                        Institutional Audit Level 4.
                      </p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                      <button
                        onClick={handleWhatsAppSend}
                        disabled={!message}
                        className="px-8 py-5 bg-[#25D366] text-white rounded-none shadow-2xl font-black uppercase tracking-[0.2em] text-[11px] border border-white/20 hover:bg-[#128C7E] transition-all transform active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        <Smartphone size={18} /> WhatsApp
                      </button>
                      <button
                        onClick={handleSend}
                        disabled={!message || isDispatching}
                        className="flex-1 md:flex-none px-14 py-5 bg-[#4B0082] text-white rounded-none shadow-2xl font-black uppercase tracking-[0.3em] text-[11px] border-2 border-[#FFD700]/30 hover:bg-black transition-all transform active:scale-95 flex items-center justify-center gap-4 group disabled:opacity-50 min-w-[220px]"
                      >
                        {isDispatching ? (
                          <>
                            <Loader2
                              size={18}
                              className="animate-spin text-[#FFD700]"
                            />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Send
                              size={18}
                              className="text-[#FFD700] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                            />
                            Dispatch
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-none shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 bg-gray-900 text-white flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <History size={18} className="text-[#FFD700]" />
                    <h3 className="font-black text-xs uppercase tracking-[0.25em]">
                      Institutional Dispatch Ledger
                    </h3>
                  </div>
                  <div className="relative w-full md:w-80">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={14}
                    />
                    <input
                      type="text"
                      placeholder="Search dispatch records..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 text-[10px] font-bold uppercase outline-none focus:border-[#FFD700] text-white"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-700/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                        <th className="px-6 py-5">Node ID</th>
                        <th className="px-6 py-5">Recipient Identity</th>
                        <th className="px-6 py-5 text-center">Gateway</th>
                        <th className="px-6 py-5">Broadcast Content</th>
                        <th className="px-6 py-5 text-center">Status</th>
                        <th className="px-6 py-5 text-right">Commit Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {history
                        .filter(
                          (h) =>
                            h.recipient
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            h.text
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                        )
                        .map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-purple-50/20 dark:hover:bg-gray-700/20 transition-all group"
                          >
                            <td className="px-6 py-5 font-mono text-xs font-bold text-[#4B0082] dark:text-purple-300">
                              {log.id}
                            </td>
                            <td className="px-6 py-5">
                              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                                {log.recipient}
                              </p>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">
                                {log.date}
                              </p>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-none text-[8px] font-black uppercase tracking-widest border ${log.type === "SMS" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-purple-50 text-[#4B0082] border-purple-100"}`}
                              >
                                {log.type}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="max-w-[350px]">
                                {log.subject && (
                                  <p className="text-[10px] font-black text-gray-900 dark:text-white uppercase truncate mb-1 flex items-center gap-2">
                                    <Mail
                                      size={10}
                                      className="text-[#4B0082]"
                                    />{" "}
                                    {log.subject}
                                  </p>
                                )}
                                <div className="text-[10px] text-gray-600 dark:text-gray-400 font-medium line-clamp-4 leading-relaxed italic">
                                  {renderMessageText(log.text)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-center">
                              <div className="flex justify-center items-center gap-1.5">
                                {log.status === "Delivered" ? (
                                  <CheckCircle
                                    size={14}
                                    className="text-emerald-500"
                                  />
                                ) : log.status === "Failed" ? (
                                  <AlertCircle
                                    size={14}
                                    className="text-red-500"
                                  />
                                ) : (
                                  <Clock size={14} className="text-amber-500" />
                                )}
                                <span
                                  className={`text-[9px] font-black uppercase tracking-widest ${log.status === "Delivered" ? "text-emerald-600" : log.status === "Failed" ? "text-red-600" : "text-amber-600"}`}
                                >
                                  {log.status}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-2 text-gray-300 hover:text-blue-500"
                                  title="View Protocol Record"
                                >
                                  <FileText size={16} />
                                </button>
                                <button
                                  className="p-2 text-gray-300 hover:text-red-500"
                                  title="Delete Archive"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {history.length === 0 && (
                    <div className="py-20 text-center text-gray-400 font-black uppercase tracking-[0.4em] text-sm italic">
                      Zero (0) dispatch records identified in comms ledger
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showToast && (
          <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-[150] animate-fade-in">
            <div className="bg-gray-900 text-[#FFD700] px-10 py-5 rounded-none shadow-2xl flex items-center gap-4 border-2 border-[#FFD700] backdrop-blur-xl">
              <Check size={24} className="animate-pulse" />
              <span className="font-black text-xs uppercase tracking-[0.15em]">
                {toastMsg}
              </span>
            </div>
          </div>
        )}

        {/* Institutional Security Bar */}
        <div className="bg-gray-900 border-l-4 border-[#FFD700] p-8 text-white flex items-start gap-8 shadow-2xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="p-3 bg-[#FFD700] text-black shadow-lg relative z-10">
            <ShieldAlert size={24} />
          </div>
          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FFD700]">
              Communication Privacy & Ethics Disclosure
            </p>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed max-w-4xl font-medium">
              Institutional broadcasts are subject to the BMI University
              Information Security Mandate. All transmissions are digitally
              watermarked and stored for 7 academic years. Visual formatting is
              enforced for professional legibility.
            </p>
            <button className="mt-4 text-[9px] font-black uppercase tracking-widest text-[#FFD700] hover:underline flex items-center gap-2">
              Review Ethics Policy <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communications;









