import { DEFAULT_LOCALE } from 'src/constants/App';
import * as en from './en.json';

const LOCALES = {
  en: en.default,
};

const DEFAULT_LANG = LOCALES[DEFAULT_LOCALE];

let LANG = DEFAULT_LANG;

export function setLanguage(lang) {
  if (Object.keys(LOCALES).includes(lang)) {
    LANG = LOCALES[lang];
  }
}

export default function i18n(key, vars = {}) {
  const str = LANG[key] || DEFAULT_LANG[key] || '';
  return str;
}
