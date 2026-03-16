import { useEffect, useState } from "react";

export type BusinessInfo = {
  name: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  footerNote?: string;
  logo?: string; // base64 data URL
};

const STORAGE_KEY = "distri_business_info";

export function useBusinessInfo() {
  const [info, setInfo] = useState<BusinessInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setInfo(JSON.parse(stored));
      }
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, []);

  const update = (next: BusinessInfo) => {
    setInfo(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return {
    info,
    loaded,
    update,
  };
}
