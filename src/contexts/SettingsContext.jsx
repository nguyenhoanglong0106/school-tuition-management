import { createContext, useContext, useEffect, useState } from 'react';
import { settingsService } from '@/services/settingsService';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const [s, accounts] = await Promise.all([
        settingsService.getSettings(),
        settingsService.getAllBankAccounts(),
      ]);
      setSettings(s);
      setBankAccounts(accounts);
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const defaultBank = bankAccounts.find((b) => b.is_default) ?? bankAccounts[0] ?? null;

  return (
    <SettingsContext.Provider
      value={{
        settings,
        bankAccounts,
        defaultBank,
        loading,
        reload: loadSettings,
        schoolName: settings?.school_name ?? import.meta.env.VITE_APP_NAME ?? 'Quản Lý Học Thêm',
        logoUrl: settings?.logo_url ?? null,
        slogan: settings?.slogan ?? '',
        brandColor: settings?.brand_color ?? '#4F46E5',
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
