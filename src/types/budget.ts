export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type CategoryName = string;

export type ExpenseCategory = {
  id: string;
  name: CategoryName;
  color: string;
  softColor: string;
  icon: string;
  isDefault?: boolean;
  pending?: boolean;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  category: CategoryName;
  spentOn: string;
  createdAt: string;
  pending?: boolean;
};

export type BudgetPeriod = {
  monthKey: string;
  label: string;
  startDate: string;
  endDate: string;
};

export type BudgetSnapshot = {
  income: number;
  currency: CurrencyCode;
  expenses: Expense[];
  categories?: ExpenseCategory[];
  budgetStartDate?: string;
  monthlyIncomes?: Record<string, number>;
  updatedAt: string;
};

export type CategoryStat = {
  name: CategoryName;
  color: string;
  total: number;
  percentage: number;
  icon: string;
};

export type CurrencyOption = {
  code: CurrencyCode;
  symbol: string;
};

export type ExchangeRates = {
  base: 'TRY';
  rates: Record<CurrencyCode, number>;
  sourceDate: string;
  fetchedAt: string;
  isStale: boolean;
};
