import { create } from 'zustand';

interface SystemState {
  mfaRequired: boolean;
  maintenanceMode: boolean;
  autoClearHolds: boolean;
  openEnrollment: boolean;
  toggleSystemFlag: (flagName: 'mfaRequired' | 'maintenanceMode' | 'autoClearHolds' | 'openEnrollment') => void;
}

export const useSystemStore = create<SystemState>((set) => {
  const saved = localStorage.getItem('bmi_ums_v4_sysflags');
  const initialFlags = saved ? JSON.parse(saved) : {
    mfaRequired: true,
    maintenanceMode: false,
    autoClearHolds: true,
    openEnrollment: true
  };

  return {
    ...initialFlags,
    toggleSystemFlag: (flagName) => set((state) => {
      const updated = { ...state, [flagName]: !state[flagName] };
      localStorage.setItem('bmi_ums_v4_sysflags', JSON.stringify({
        mfaRequired: updated.mfaRequired,
        maintenanceMode: updated.maintenanceMode,
        autoClearHolds: updated.autoClearHolds,
        openEnrollment: updated.openEnrollment
      }));
      return updated;
    })
  };
});
