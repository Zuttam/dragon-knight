import type { TranslationKey, TranslationMap } from './keys';
import type { SupportedLanguage } from '../save/SaveSystem';
import { en } from './en';
import { es } from './es';
import { he } from './he';

const translations: Partial<Record<SupportedLanguage, TranslationMap>> = {
  en,
  es,
  he,
};

let currentLocale: SupportedLanguage = 'en';

export function setLocale(lang: SupportedLanguage): void {
  currentLocale = lang;
  if (isRTL()) {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
}

export function getLocale(): SupportedLanguage {
  return currentLocale;
}

export function t(key: TranslationKey, vars?: Record<string, string | number>): string {
  const map = translations[currentLocale];
  let text = (map && map[key]) || en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export function isRTL(): boolean {
  return currentLocale === 'ar' || currentLocale === 'he';
}

export function localizeDOM(root?: HTMLElement): void {
  const container = root || document.body;

  // data-i18n → textContent
  for (const el of container.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = el.getAttribute('data-i18n') as TranslationKey;
    if (key) el.textContent = t(key);
  }

  // data-i18n-placeholder → placeholder attribute
  for (const el of container.querySelectorAll<HTMLElement>('[data-i18n-placeholder]')) {
    const key = el.getAttribute('data-i18n-placeholder') as TranslationKey;
    if (key) (el as HTMLInputElement).placeholder = t(key);
  }

  // data-i18n-title → title attribute
  for (const el of container.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    const key = el.getAttribute('data-i18n-title') as TranslationKey;
    if (key) el.title = t(key);
  }
}

export type { TranslationKey } from './keys';
