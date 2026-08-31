import { Song } from '../types';

export const DEFAULT_CATEGORY_SUGGESTIONS = [
  'Louange',
  'Adoration',
  'Célébration',
  'Action de grâce',
  'Prière',
  'Méditation',
  'Gospel',
  'Noël',
  'Pâques',
  'Jeunesse',
  'Communion'
];

export const getCustomCategories = (): string[] => {
  try {
    const saved = localStorage.getItem('melobook_custom_categories');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveCustomCategories = (categories: string[]): void => {
  try {
    localStorage.setItem('melobook_custom_categories', JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving custom categories:', e);
  }
};

export const getHiddenCategories = (): string[] => {
  try {
    const saved = localStorage.getItem('melobook_hidden_categories');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const saveHiddenCategories = (categories: string[]): void => {
  try {
    localStorage.setItem('melobook_hidden_categories', JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving hidden categories:', e);
  }
};
