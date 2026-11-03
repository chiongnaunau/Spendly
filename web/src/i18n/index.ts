'use client';
import en from './locales/en.json';
import vi from './locales/vi.json';

export type Lang = 'en' | 'vi';
export type TranslationKey = string;

const STORAGE_KEY = 'spendly.lang';
const translations = { en, vi } as const;

let currentLang: Lang = 'en';

export function initLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (saved === 'en' || saved === 'vi') { currentLang = saved; return saved; }
  const browser = navigator.language.startsWith('vi') ? 'vi' : 'en';
  currentLang = browser;
  return browser;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
}

export function getLang(): Lang { return currentLang; }

export function t(key: string, lang?: Lang): string {
  const l = lang ?? currentLang;
  const dict = translations[l] as Record<string, unknown>;
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[p];
    else return key;
  }
  return typeof cur === 'string' ? cur : key;
}
