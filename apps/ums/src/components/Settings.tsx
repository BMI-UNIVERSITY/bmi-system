/* eslint-disable */
/* eslint-disable */
import React, { useState, useEffect } from "react";
import {
  Save,
  Bell,
  Shield,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Mail,
  Upload,
  ImageIcon,
  Check,
  AlertTriangle,
  Database,
} from "lucide-react";
import { authFetch } from "../services/authService";
import { useUIStore } from "../stores/uiStore";

const Settings: React.FC = () => {
  const currentLogo = useUIStore((s) => s.logo);
  const onUpdateLogo = useUIStore((s) => s.setLogo);
  const currentTheme = useUIStore((s) => s.theme);
  const onUpdateTheme = useUIStore((s) => s.setTheme);
  const [activeTab, setActiveTab] = useState("general");
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState(
    "Settings saved successfully",
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogo);

  // Password Management State
  const [passwordData, setPasswordData] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  // Sync logo preview if prop changes
  useEffect(() => {
    setLogoPreview(currentLogo);
  }, [currentLogo]);

  // General Settings State
  const [general, setGeneral] = useState(() => {
    const saved = localStorage.getItem("bmi_settings_general");
    return saved
      ? JSON.parse(saved)
      : {
          uniName: "BMI University",
          email: "admin@bmi.edu",
          phone: "+1 (555) 123-4567",
          address: "123 University Ave, Education City",
          theme: "light",
        };
  });

  // Sync local theme state with prop to ensure form consistency
  useEffect(() => {
    setGeneral((prev: any) => ({ ...prev, theme: currentTheme }));
  }, [currentTheme]);

  // Notifications State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("bmi_settings_notifications");
    return saved
      ? JSON.parse(saved)
      : {
          emailAlerts: true,
          smsAlerts: false,
          newsletters: true,
          weeklyReports: true,
        };
  });

  // Security State
  const [security, setSecurity] = useState(() => {
    const saved = localStorage.getItem("bmi_settings_security");
    return saved
      ? JSON.parse(saved)
      : {
          twoFactor: true,
          sessionTimeout: "30m",
        };
  });

  const handleSave = () => {
    setIsLoading(true);

    // Save all settings to localStorage
    localStorage.setItem("bmi_settings_general", JSON.stringify(general));
    localStorage.setItem(
      "bmi_settings_notifications",
      JSON.stringify(notifications),
    );
    localStorage.setItem("bmi_settings_security", JSON.stringify(security));

    setTimeout(() => {
      setIsLoading(false);
      setToastMessage("Configuration Committed Successfully");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }, 1000);
  };

  const handlePasswordUpdate = async () => {
    if (
      !passwordData.current ||
      !passwordData.newPass ||
      !passwordData.confirm
    ) {
      setToastMessage("Please fill in all password fields");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    if (passwordData.newPass !== passwordData.confirm) {
      setToastMessage("Passwords do not match");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    if (passwordData.newPass.length < 8) {
      setToastMessage("Password must be at least 8 characters");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authFetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.newPass,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setToastMessage("Password updated successfully");
        setPasswordData({ current: "", newPass: "", confirm: "" });
      } else {
        setToastMessage(data.error || "Failed to update password");
      }
    } catch (error) {
      setToastMessage("Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleResetSystem = () => {
    if (
      window.confirm(
        "CRITICAL SECURITY WARNING:\n\nThis action will PURGE ALL INSTITUTIONAL DATA (Student Registries, Financial Ledgers, Staff Records, etc.) and restore the system to factory defaults.\n\nThis action is irreversible and will log a security event.\n\nAre you sure you want to proceed?",
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Media Protocol: File exceeds 2MB limit.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/png", 0.8);
            setLogoPreview(dataUrl);
            onUpdateLogo(dataUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-widest transition-all rounded-none ${
        activeTab === id
          ? "bg-white dark:bg-gray-800 text-[#4B0082] dark:text-[#FFD700] border-t-4 border-[#4B0082] dark:border-[#FFD700] shadow-sm"
          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="p-8 animate-fade-in pb-20 max-w-6xl mx-auto relative">
      <div className="mb-8 flex items-center gap-4">
        <div className="w-2 h-12 bg-[#4B0082]"></div>
        <div>
          <h2 className="text-3xl font-bold text-[#2E004F] dark:text-white tracking-tight uppercase">
            System Configuration
          </h2>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Institutional Preferences & Control
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-none shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <TabButton id="general" label="General" icon={Globe} />
          <TabButton id="notifications" label="Notifications" icon={Bell} />
          <TabButton id="security" label="Security" icon={Shield} />
        </div>

        {/* Content */}
        <div className="p-10 min-h-[500px]">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-10 max-w-3xl">
              {/* Logo Upload Section */}
              <div className="bg-purple-50/30 dark:bg-gray-700/30 p-8 border border-purple-100 dark:border-gray-600 rounded-none">
                <h3 className="text-xs font-black text-[#4B0082] dark:text-purple-300 mb-6 flex items-center gap-2 uppercase tracking-widest">
                  <ImageIcon size={16} /> Institutional Branding
                </h3>
                <div className="flex items-center gap-8">
                  <div className="w-24 h-24 rounded-none border-2 border-dashed border-purple-200 dark:border-gray-500 flex items-center justify-center bg-white dark:bg-gray-600 overflow-hidden relative group shadow-sm">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center">
                        <span className="text-[10px] font-bold uppercase text-gray-400">
                          No Logo
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-[#4B0082] dark:hover:text-purple-300 hover:border-[#4B0082] transition-all shadow-sm font-black text-[10px] uppercase tracking-widest group">
                      <Upload
                        size={14}
                        className="group-hover:scale-110 transition-transform"
                      />
                      Upload Emblem
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </label>
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mt-2 uppercase tracking-wide">
                      Accepted: PNG, JPG, SVG • Max 2MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Institution Name
                  </label>
                  <input
                    type="text"
                    value={general.uniName}
                    onChange={(e) =>
                      setGeneral({ ...general, uniName: e.target.value })
                    }
                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-none focus:border-[#4B0082] outline-none transition-all dark:bg-gray-700 dark:text-white font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    value={general.email}
                    onChange={(e) =>
                      setGeneral({ ...general, email: e.target.value })
                    }
                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-none focus:border-[#4B0082] outline-none transition-all dark:bg-gray-700 dark:text-white font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={general.phone}
                    onChange={(e) =>
                      setGeneral({ ...general, phone: e.target.value })
                    }
                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-none focus:border-[#4B0082] outline-none transition-all dark:bg-gray-700 dark:text-white font-bold text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Primary Timezone
                  </label>
                  <select className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-none focus:border-[#4B0082] outline-none transition-all bg-white dark:bg-gray-700 dark:text-white font-bold text-sm">
                    <option>UTC-05:00 Eastern Time</option>
                    <option>UTC-08:00 Pacific Time</option>
                    <option>UTC+00:00 London</option>
                    <option>UTC+03:00 Nairobi (EAT)</option>
                  </select>
                </div>
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                    Campus Address
                  </label>
                  <textarea
                    value={general.address}
                    onChange={(e) =>
                      setGeneral({ ...general, address: e.target.value })
                    }
                    rows={3}
                    className="w-full px-5 py-3 border border-gray-200 dark:border-gray-600 rounded-none focus:border-[#4B0082] outline-none transition-all resize-none dark:bg-gray-700 dark:text-white font-medium text-sm"
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">
                  Interface Theme
                </h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => onUpdateTheme("light")}
                    className={`flex items-center gap-3 px-6 py-3 border rounded-none transition-all ${currentTheme === "light" ? "border-[#4B0082] bg-purple-50 text-[#4B0082] dark:bg-gray-700 dark:text-white" : "border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-400"}`}
                  >
                    <Sun size={18} />
                    <span className="font-bold text-xs uppercase tracking-widest">
                      Light Mode
                    </span>
                  </button>
                  <button
                    onClick={() => onUpdateTheme("dark")}
                    className={`flex items-center gap-3 px-6 py-3 border rounded-none transition-all ${currentTheme === "dark" ? "border-[#4B0082] bg-purple-900 text-white shadow-md" : "border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-400"}`}
                  >
                    <Moon size={18} />
                    <span className="font-bold text-xs uppercase tracking-widest">
                      Dark Mode
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-black text-red-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Database size={16} /> Data Governance
                </h3>
                <div className="bg-red-50 dark:bg-red-900/10 p-6 border border-red-100 dark:border-red-900/30 rounded-none flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-tight">
                      Factory Reset
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Purge all local registries. Irreversible.
                    </p>
                  </div>
                  <button
                    onClick={handleResetSystem}
                    className="px-6 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm rounded-none"
                  >
                    Reset System
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="space-y-8 max-w-3xl">
              <h3 className="text-sm font-black text-[#4B0082] dark:text-purple-300 uppercase tracking-widest">
                Alert Protocols
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-8 rounded-none border border-gray-100 dark:border-gray-600 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-blue-600 rounded-none shadow-sm">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm uppercase">
                        Email Notifications
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Daily summaries and critical institutional alerts
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.emailAlerts}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          emailAlerts: !notifications.emailAlerts,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4B0082] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4B0082]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-green-600 rounded-none shadow-sm">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm uppercase">
                        SMS Alerts
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Urgent campus announcements sent to mobile terminals
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.smsAlerts}
                      onChange={() =>
                        setNotifications({
                          ...notifications,
                          smsAlerts: !notifications.smsAlerts,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4B0082] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4B0082]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-10 max-w-3xl">
              <div>
                <h3 className="text-sm font-black text-[#4B0082] dark:text-purple-300 uppercase tracking-widest mb-6">
                  Credential Management
                </h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="Current Access Code"
                      value={passwordData.current}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          current: e.target.value,
                        })
                      }
                      className="w-full px-5 py-4 border border-gray-200 dark:border-gray-600 rounded-none bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:border-[#4B0082] outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="New Access Code"
                        value={passwordData.newPass}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            newPass: e.target.value,
                          })
                        }
                        className="w-full px-5 py-4 border border-gray-200 dark:border-gray-600 rounded-none bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:border-[#4B0082] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        placeholder="Confirm New Access Code"
                        value={passwordData.confirm}
                        onChange={(e) =>
                          setPasswordData({
                            ...passwordData,
                            confirm: e.target.value,
                          })
                        }
                        className="w-full px-5 py-4 border border-gray-200 dark:border-gray-600 rounded-none bg-gray-50 dark:bg-gray-700 dark:text-white focus:bg-white dark:focus:bg-gray-600 focus:border-[#4B0082] outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handlePasswordUpdate}
                    disabled={isLoading}
                    className="px-8 py-3 text-[10px] font-black text-[#4B0082] dark:text-purple-300 hover:text-white hover:bg-[#4B0082] border-2 border-[#4B0082] dark:border-purple-300 rounded-none transition-colors disabled:opacity-50 uppercase tracking-widest"
                  >
                    {isLoading
                      ? "Processing Protocol..."
                      : "Update Credentials"}
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-black text-[#4B0082] dark:text-purple-300 uppercase tracking-widest mb-6">
                  Access Control Matrix
                </h3>
                <div className="flex items-center justify-between p-6 border border-purple-100 dark:border-gray-600 bg-purple-50/50 dark:bg-gray-700/50 rounded-none">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white text-sm uppercase">
                      Two-Factor Authentication (2FA)
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Enforce biometric or secondary token verification for
                      admin sessions
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.twoFactor}
                      onChange={() =>
                        setSecurity({
                          ...security,
                          twoFactor: !security.twoFactor,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4B0082] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4B0082]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#4B0082] to-[#320064] text-white font-black text-xs uppercase tracking-widest rounded-none shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-70 disabled:transform-none border border-[#FFD700]/20"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={16} className="text-[#FFD700]" />
            )}
            Commit Configuration
          </button>
        </div>
      </div>

      {/* Success Toast Notification */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-[#4B0082] text-white dark:bg-white dark:text-[#4B0082] px-8 py-4 rounded-none shadow-2xl flex items-center gap-4 border-2 border-[#FFD700] dark:border-[#4B0082]/20">
            <div className="bg-white/20 dark:bg-[#4B0082]/10 p-1.5 rounded-full">
              <Check size={18} className="text-[#FFD700] dark:text-[#4B0082]" />
            </div>
            <span className="font-black text-xs uppercase tracking-widest">
              {toastMessage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;









