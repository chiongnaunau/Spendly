'use client';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import en from '@/i18n/locales/en.json';
import vi from '@/i18n/locales/vi.json';

export type Lang = 'en' | 'vi';

interface TranslationContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  getCategoryLabel: (categoryKey: string) => string;
}

const STORAGE_KEY = 'spendly.lang';
const translations: Record<Lang, Record<string, unknown>> = { en, vi };

const TranslationContext = createContext<TranslationContextType>({
  lang: 'vi',
  setLang: () => {},
  t: (k) => k,
  getCategoryLabel: (k) => k,
});

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'vi';
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === 'en' || saved === 'vi') return saved;
    return navigator.language.startsWith('vi') ? 'vi' : 'en';
  });

  const handleSetLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[lang] || translations.en;
      const parts = key.split('.');
      let cur: unknown = dict;

      for (const p of parts) {
        if (cur && typeof cur === 'object') {
          cur = (cur as Record<string, unknown>)[p];
        } else {
          cur = undefined;
          break;
        }
      }

      // Fallback to English if key missing in Vietnamese
      if (typeof cur !== 'string' && lang !== 'en') {
        let fallbackCur: unknown = translations.en;
        for (const p of parts) {
          if (fallbackCur && typeof fallbackCur === 'object') {
            fallbackCur = (fallbackCur as Record<string, unknown>)[p];
          } else {
            fallbackCur = undefined;
            break;
          }
        }
        if (typeof fallbackCur === 'string') {
          cur = fallbackCur;
        }
      }

      if (typeof cur !== 'string') return key;

      let result = cur;
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }
      return result;
    },
    [lang]
  );

  const getCategoryLabel = useCallback(
    (categoryKey: string): string => {
      const keyMap: Record<string, string> = {
        an_uong: 'categories.food',
        FOOD: 'categories.food',
        di_chuyen: 'categories.transport',
        TRANSPORT: 'categories.transport',
        mua_sam: 'categories.shopping',
        SHOPPING: 'categories.shopping',
        y_te: 'categories.health',
        HEALTH: 'categories.health',
        giai_tri: 'categories.entertainment',
        ENTERTAINMENT: 'categories.entertainment',
        hoa_don: 'categories.utilities',
        UTILITIES: 'categories.utilities',
        giao_duc: 'categories.education',
        EDUCATION: 'categories.education',
        luong: 'categories.salary',
        SALARY: 'categories.salary',
        thuong: 'categories.bonus',
        BONUS: 'categories.bonus',
        kinh_doanh: 'categories.business',
        BUSINESS: 'categories.business',
        dau_tu: 'categories.investment',
        INVESTMENT: 'categories.investment',
        phu_cap: 'categories.allowance',
        ALLOWANCE: 'categories.allowance',
        khac: 'categories.other',
        OTHER: 'categories.other',
      };

      const transKey = keyMap[categoryKey];
      if (transKey) {
        const val = t(transKey);
        if (val !== transKey) return val;
      }
      return categoryKey;
    },
    [t]
  );

  return (
    <TranslationContext.Provider value={{ lang, setLang: handleSetLang, t, getCategoryLabel }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}

