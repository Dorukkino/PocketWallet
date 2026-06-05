import type { CurrencyOption, ExpenseCategory } from '../types/budget';

export const CATEGORIES: ExpenseCategory[] = [
  {
    id: 'default-faturalar',
    name: 'Faturalar',
    color: '#f59e0b',
    softColor: 'rgba(245, 158, 11, 0.14)',
    icon: 'zap',
    isDefault: true,
  },
  {
    id: 'default-eglence',
    name: 'Eğlence',
    color: '#8b5cf6',
    softColor: 'rgba(139, 92, 246, 0.14)',
    icon: 'gamepad',
    isDefault: true,
  },
  {
    id: 'default-okul',
    name: 'Okul',
    color: '#3b82f6',
    softColor: 'rgba(59, 130, 246, 0.14)',
    icon: 'book',
    isDefault: true,
  },
  {
    id: 'default-mutfak',
    name: 'Mutfak',
    color: '#10b981',
    softColor: 'rgba(16, 185, 129, 0.14)',
    icon: 'utensils',
    isDefault: true,
  },
  {
    id: 'default-ulasim',
    name: 'Ulaşım',
    color: '#06b6d4',
    softColor: 'rgba(6, 182, 212, 0.14)',
    icon: 'car',
    isDefault: true,
  },
  {
    id: 'default-giyim',
    name: 'Giyim',
    color: '#ec4899',
    softColor: 'rgba(236, 72, 153, 0.14)',
    icon: 'shirt',
    isDefault: true,
  },
  {
    id: 'default-diger',
    name: 'Diğer',
    color: '#64748b',
    softColor: 'rgba(100, 116, 139, 0.16)',
    icon: 'briefcase',
    isDefault: true,
  },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'TRY', symbol: '₺' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
];

export const DEFAULT_INCOME = 45000;

export const DEFAULT_EXPENSES = [
  {
    id: 'f1f2f3f4-1000-4000-8000-000000000001',
    title: 'Elektrik ve İnternet Faturaları',
    amount: 1850,
    category: 'Faturalar',
    spentOn: '2026-06-01',
    createdAt: '2026-06-01T09:00:00.000Z',
  },
  {
    id: 'f1f2f3f4-1000-4000-8000-000000000002',
    title: 'Haftalık Süpermarket Alışverişi',
    amount: 4200,
    category: 'Mutfak',
    spentOn: '2026-06-03',
    createdAt: '2026-06-03T12:00:00.000Z',
  },
  {
    id: 'f1f2f3f4-1000-4000-8000-000000000003',
    title: 'Sinema ve Konser Biletleri',
    amount: 1250,
    category: 'Eğlence',
    spentOn: '2026-06-04',
    createdAt: '2026-06-04T20:00:00.000Z',
  },
] satisfies Array<{
  id: string;
  title: string;
  amount: number;
  category: string;
  spentOn: string;
  createdAt: string;
}>;

export const CATEGORY_COLORS = [
  '#f59e0b',
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#06b6d4',
  '#ec4899',
  '#f43f5e',
  '#84cc16',
  '#14b8a6',
  '#64748b',
];
