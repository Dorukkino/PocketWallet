import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'tr' | 'en';

type TranslationValues = Record<string, string | number>;

const LANGUAGE_STORAGE_KEY = 'pocketwallet_language_v1';

const translations = {
  tr: {
    addCategory: 'Kategori Ekle',
    addExpense: 'Gider Ekle',
    adviceEmpty:
      'Bu ay için gelir ve gider henüz girilmedi. Ayı yönetmeye gelirini ekleyerek başlayabilirsin.',
    adviceNegative:
      'Bu ay harcamalar geliri geçti. Eğlence, giyim veya dış harcama kalemlerini sınırlamak bütçeyi hızlı toparlar.',
    adviceSavingsExcellent:
      'Bu ay %{percent} tasarruf alanına sahipsin. Kalan bütçeni yatırım veya birikim için ayırabilirsin.',
    adviceSavingsHigh:
      'Bu ay %{percent} tasarruf alanın var. Kalan bütçeyi yatırım veya birikim için kullanabilirsin.',
    adviceSavingsMedium: 'Bu ay %{percent} tasarruf yapabildin. Bir sonraki aylarda daha fazla tasarruf yapabilirsin.',
    adviceSavingsLow: 'Bu ay %{percent} tasarruf alanın var. Bunu arttırmanı öneririm.',
    all: 'Hepsi',
    amountTry: 'Tutar (TRY)',
    atLeastOneCategory: 'En az bir kategori kalmalı.',
    authCreated: 'Hesap oluşturuldu. E-posta doğrulaması açıksa gelen kutunu kontrol et.',
    authEmailRequired: 'Lütfen e-posta adresinizi girin.',
    authFullNameError: 'Lütfen ad soyad bilgisini girin.',
    authPasswordMin: 'Lütfen en az 6 karakterli şifre girin.',
    authSubtitle: 'Gelirini, giderlerini ve ay sonu bütçe analizini tek mobil ekranda takip et.',
    budgetExceeded: 'Bu ay bütçeni aştın, giderleri gözden geçirebilirsin.',
    category: 'Kategori',
    categoryAlreadyExists: 'Bu kategori zaten var.',
    categoryInUse: 'Bu kategori giderlerde kullanılıyor. Önce ilgili giderleri silmelisiniz.',
    categoryManager: 'Kategori Yönetimi',
    categoryNameMin: 'Kategori adı en az 2 karakter olmalı.',
    categorySaveFailed: 'Kategori buluta kaydedilemedi, yerel kayıt korundu.',
    categoryDeleteFailed: 'Kategori silinemedi, kayıt geri yüklendi.',
    changeMonth: 'Ay değiştir',
    colorSelect: 'Renk Seç',
    currencyFetchFailed: 'Güncel kur alınamadı, son kayıtlı kur gösteriliyor.',
    currencySavedFailed: 'Para birimi buluta kaydedilemedi, yerel kayıt korundu.',
    currencyTitle: 'Günlük Kur Takibi',
    dashboardSubtitle: 'Aylık finans kontrol paneli',
    date: 'Tarih',
    dateModalSubtitle: 'Giderin gerçekleştiği günü seç.',
    dateModalTitle: 'Tarih Seç',
    deleteExpenseFailed: 'Gider silinemedi, kayıt geri yüklendi.',
    emailPlaceholder: 'E-posta',
    expenseDescription: 'Gider açıklaması (opsiyonel)',
    expensePlaceholder: 'İstersen not ekle: market, fatura, sinema',
    expenseSaveFailed: 'Gider buluta kaydedilemedi, yerel kayıt korundu.',
    financialAdvice: 'Kişiye Özel Finansal Öneri',
    fullNamePlaceholder: 'Ad Soyad',
    iconSelect: 'İkon Seç',
    incomeSavedAsTry: 'Gelir TRY olarak kaydedilir.',
    incomeValidation: 'Geçerli bir gelir girin.',
    languageEnglish: 'EN',
    languageTurkish: 'TR',
    latestTransactions: 'Son İşlemler',
    localSaveFailed: 'Yerel kayıt güncellenemedi.',
    monthCount: '{count} ay',
    monthModalSubtitle: 'Yıla göre hızlıca geçmiş ayına git.',
    monthSelect: 'Ay Seç',
    newCategory: 'Yeni Kategori',
    newCategoryPlaceholder: 'Örn: Kira, Sağlık, Evcil Hayvan',
    newCategorySubtitle: 'Adını yaz, rengini ve giderine uygun ikonu seç.',
    newExpense: 'Yeni Gider Ekle',
    newExpenseSubtitle: 'Harcamanı kaydet, bakiye anında güncellensin.',
    netRemainingBalance: 'Kalan Net Bakiye',
    next: 'Sonraki',
    noExpenses: 'Henüz harcama yok',
    noExpensesText: 'Gider eklediğinde grafik otomatik oluşacak.',
    noMatch: 'Harcama bulunamadı',
    noMatchText: 'Yeni gider ekleyebilir veya filtreleri temizleyebilirsin.',
    passwordPlaceholder: 'Şifre',
    pending: 'bekliyor',
    previous: 'Önceki',
    rateDate: 'Kur tarihi: {date}{stale}',
    rateLoading: 'Kurlar alınıyor...',
    rateStaleInline: ' · son kayıtlı',
    rateStaleParen: ' (son kayıtlı)',
    remoteFetchFailed: 'Bulut verileri alınamadı, yerel verilerle devam ediliyor.',
    remoteRefreshFailed: 'Veriler yenilenemedi, yerel veriler korunuyor.',
    refreshing: 'Yenileniyor...',
    saveCategory: 'Kategoriyi Kaydet',
    saving: 'Kaydediliyor...',
    searchExpenses: 'Giderlerde ara...',
    signIn: 'Giriş Yap',
    signOut: 'Çıkış Yap',
    signOutCancel: 'Vazgeç',
    signOutConfirm: 'PocketWallet hesabından çıkmak istiyor musun?',
    signUp: 'Hesap Oluştur',
    spendingAnalysis: 'Harcama Analizi',
    spendingAnalysisSubtitle: 'Bu ayki kategorisel gider dağılımı',
    switchToSignIn: 'Zaten hesabın var mı? Giriş yap',
    switchToSignUp: 'Hesabın yok mu? Kayıt ol',
    total: 'Toplam',
    totalExpense: 'Toplam Gider',
    totalIncome: 'Toplam Gelir',
    transactionCount: '{count} kayıt listeleniyor',
    tryEquivalent: 'TRY karşılığı',
    usedIncomeRatio: 'Gelirin %{ratio}',
    validAmountError: 'Lütfen sıfırdan büyük bir tutar girin.',
    categoryBills: 'Faturalar',
    categoryEntertainment: 'Eğlence',
    categorySchool: 'Okul',
    categoryKitchen: 'Mutfak',
    categoryTransport: 'Ulaşım',
    categoryClothing: 'Giyim',
    categoryOther: 'Diğer',
    demoBillTitle: 'Elektrik ve İnternet Faturaları',
    demoGroceryTitle: 'Haftalık Süpermarket Alışverişi',
    demoEntertainmentTitle: 'Sinema ve Konser Biletleri',
  },
  en: {
    addCategory: 'Add Category',
    addExpense: 'Add Expense',
    adviceEmpty: 'No income or expense has been entered for this month yet. Start by adding your income.',
    adviceNegative:
      'Your spending passed your income this month. Limiting entertainment, clothing, or outside spending can quickly recover the budget.',
    adviceSavingsExcellent:
      'You have %{percent} savings room this month. You can set your remaining budget aside for investing or saving.',
    adviceSavingsHigh:
      'You have %{percent} savings room this month. You can use the remaining budget for things like investing or saving.',
    adviceSavingsMedium: 'You managed to save %{percent} this month. You can save more in the coming months.',
    adviceSavingsLow: 'You have %{percent} savings room this month. I recommend increasing it.',
    all: 'All',
    amountTry: 'Amount (TRY)',
    atLeastOneCategory: 'At least one category must remain.',
    authCreated: 'Account created. If email verification is enabled, check your inbox.',
    authEmailRequired: 'Please enter your email address.',
    authFullNameError: 'Please enter your full name.',
    authPasswordMin: 'Please enter a password with at least 6 characters.',
    authSubtitle: 'Track your income, expenses, and month-end budget analysis on one mobile screen.',
    budgetExceeded: 'You exceeded your budget this month. You can review your expenses.',
    category: 'Category',
    categoryAlreadyExists: 'This category already exists.',
    categoryInUse: 'This category is used by expenses. Delete the related expenses first.',
    categoryManager: 'Category Management',
    categoryNameMin: 'Category name must be at least 2 characters.',
    categorySaveFailed: 'Category could not be saved to the cloud, local record was kept.',
    categoryDeleteFailed: 'Category could not be deleted, record was restored.',
    changeMonth: 'Change month',
    colorSelect: 'Select Color',
    currencyFetchFailed: 'Could not fetch current rates, showing the last saved rates.',
    currencySavedFailed: 'Currency could not be saved to the cloud, local record was kept.',
    currencyTitle: 'Daily Exchange Rates',
    dashboardSubtitle: 'Monthly finance dashboard',
    date: 'Date',
    dateModalSubtitle: 'Choose the day this expense happened.',
    dateModalTitle: 'Select Date',
    deleteExpenseFailed: 'Expense could not be deleted, record was restored.',
    emailPlaceholder: 'Email',
    expenseDescription: 'Expense description (optional)',
    expensePlaceholder: 'Optional note: groceries, bill, cinema',
    expenseSaveFailed: 'Expense could not be saved to the cloud, local record was kept.',
    financialAdvice: 'Personalized Financial Advice',
    fullNamePlaceholder: 'Full Name',
    iconSelect: 'Select Icon',
    incomeSavedAsTry: 'Income is saved as TRY.',
    incomeValidation: 'Enter a valid income.',
    languageEnglish: 'EN',
    languageTurkish: 'TR',
    latestTransactions: 'Latest Transactions',
    localSaveFailed: 'Local record could not be updated.',
    monthCount: '{count} months',
    monthModalSubtitle: 'Quickly jump to a past month by year.',
    monthSelect: 'Select Month',
    newCategory: 'New Category',
    newCategoryPlaceholder: 'Ex: Rent, Health, Pet Care',
    newCategorySubtitle: 'Write a name, then choose a color and icon for the expense.',
    newExpense: 'Add New Expense',
    newExpenseSubtitle: 'Log your spending and update the balance instantly.',
    netRemainingBalance: 'Net Remaining Balance',
    next: 'Next',
    noExpenses: 'No expenses yet',
    noExpensesText: 'The chart will appear automatically when you add an expense.',
    noMatch: 'No expense found',
    noMatchText: 'You can add a new expense or clear the filters.',
    passwordPlaceholder: 'Password',
    pending: 'pending',
    previous: 'Previous',
    rateDate: 'Rate date: {date}{stale}',
    rateLoading: 'Fetching rates...',
    rateStaleInline: ' · last saved',
    rateStaleParen: ' (last saved)',
    remoteFetchFailed: 'Cloud data could not be fetched, continuing with local data.',
    remoteRefreshFailed: 'Data could not be refreshed, local data was kept.',
    refreshing: 'Refreshing...',
    saveCategory: 'Save Category',
    saving: 'Saving...',
    searchExpenses: 'Search expenses...',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signOutCancel: 'Cancel',
    signOutConfirm: 'Do you want to sign out of your PocketWallet account?',
    signUp: 'Create Account',
    spendingAnalysis: 'Spending Analysis',
    spendingAnalysisSubtitle: 'This month\'s expense distribution by category',
    switchToSignIn: 'Already have an account? Sign in',
    switchToSignUp: 'No account yet? Sign up',
    total: 'Total',
    totalExpense: 'Total Expense',
    totalIncome: 'Total Income',
    transactionCount: '{count} records listed',
    tryEquivalent: 'TRY equivalent',
    usedIncomeRatio: '%{ratio} of income',
    validAmountError: 'Please enter an amount greater than zero.',
    categoryBills: 'Bills',
    categoryEntertainment: 'Entertainment',
    categorySchool: 'School',
    categoryKitchen: 'Kitchen',
    categoryTransport: 'Transportation',
    categoryClothing: 'Clothing',
    categoryOther: 'Other',
    demoBillTitle: 'Electricity and Internet Bills',
    demoGroceryTitle: 'Weekly Supermarket Shopping',
    demoEntertainmentTitle: 'Cinema and Concert Tickets',
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;

const dictionaries: Record<Language, Record<TranslationKey, string>> = translations;

type LanguageContextValue = {
  language: Language;
  locale: string;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  categoryLabel: (name: string) => string;
  expenseTitleLabel: (title: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const interpolate = (template: string, values?: TranslationValues) => {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
    template,
  );
};

const categoryTranslationKeys: Record<string, TranslationKey> = {
  Faturalar: 'categoryBills',
  'Eğlence': 'categoryEntertainment',
  Okul: 'categorySchool',
  Mutfak: 'categoryKitchen',
  'Ulaşım': 'categoryTransport',
  Giyim: 'categoryClothing',
  'Diğer': 'categoryOther',
};

type CategoryConcept = {
  tr: string;
  en: string;
};

const normalizeLabel = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ');

const makeCategoryAliases = (labels: CategoryConcept, aliases: string[]) =>
  aliases.reduce<Record<string, CategoryConcept>>((current, alias) => {
    current[normalizeLabel(alias)] = labels;
    return current;
  }, {});

const commonCategoryLabels: Record<string, CategoryConcept> = {
  ...makeCategoryAliases({ tr: 'Faturalar', en: 'Bills' }, [
    'fatura',
    'faturalar',
    'bill',
    'bills',
    'utility',
    'utilities',
    'elektrik',
    'electricity',
    'internet',
    'su',
    'water',
    'doğalgaz',
    'dogalgaz',
    'natural gas',
    'abonelik',
    'subscription',
    'subscriptions',
  ]),
  ...makeCategoryAliases({ tr: 'Eğlence', en: 'Entertainment' }, [
    'eğlence',
    'eglence',
    'entertainment',
    'sinema',
    'cinema',
    'movie',
    'movies',
    'konser',
    'concert',
    'concerts',
    'oyun',
    'game',
    'games',
    'gaming',
  ]),
  ...makeCategoryAliases({ tr: 'Okul', en: 'School' }, [
    'okul',
    'school',
    'eğitim',
    'egitim',
    'education',
    'kurs',
    'course',
    'courses',
    'kitap',
    'book',
    'books',
  ]),
  ...makeCategoryAliases({ tr: 'Mutfak', en: 'Kitchen' }, ['mutfak', 'kitchen']),
  ...makeCategoryAliases({ tr: 'Market', en: 'Groceries' }, [
    'market',
    'süpermarket',
    'supermarket',
    'grocery',
    'groceries',
    'bakkal',
  ]),
  ...makeCategoryAliases({ tr: 'Yemek', en: 'Food' }, ['food', 'yemek', 'yeme içme', 'restaurant', 'restoran']),
  ...makeCategoryAliases({ tr: 'Kafe', en: 'Cafe' }, ['cafe', 'kafe', 'kahve', 'coffee']),
  ...makeCategoryAliases({ tr: 'Ulaşım', en: 'Transportation' }, [
    'ulaşım',
    'ulasim',
    'transport',
    'transportation',
    'araba',
    'car',
    'taksi',
    'taxi',
    'otobüs',
    'otobus',
    'bus',
    'metro',
    'train',
    'tren',
    'uçak',
    'ucak',
    'plane',
    'flight',
    'benzin',
    'fuel',
    'gas',
  ]),
  ...makeCategoryAliases({ tr: 'Giyim', en: 'Clothing' }, [
    'giyim',
    'clothing',
    'kıyafet',
    'kiyafet',
    'clothes',
    'fashion',
    'moda',
    'ayakkabı',
    'ayakkabi',
    'shoes',
  ]),
  ...makeCategoryAliases({ tr: 'Kira', en: 'Rent' }, ['kira', 'rent']),
  ...makeCategoryAliases({ tr: 'Ev', en: 'Home' }, ['ev', 'home', 'house', 'mobilya', 'furniture']),
  ...makeCategoryAliases({ tr: 'Sağlık', en: 'Health' }, [
    'sağlık',
    'saglik',
    'health',
    'hastane',
    'hospital',
    'doktor',
    'doctor',
    'ilaç',
    'ilac',
    'medicine',
    'eczane',
    'pharmacy',
  ]),
  ...makeCategoryAliases({ tr: 'Spor', en: 'Fitness' }, ['spor', 'fitness', 'gym', 'salon', 'dumbbell']),
  ...makeCategoryAliases({ tr: 'Teknoloji', en: 'Technology' }, [
    'teknoloji',
    'technology',
    'tech',
    'telefon',
    'phone',
    'smartphone',
    'laptop',
    'bilgisayar',
    'computer',
  ]),
  ...makeCategoryAliases({ tr: 'Evcil Hayvan', en: 'Pet Care' }, [
    'evcil hayvan',
    'pet',
    'pets',
    'pet care',
    'kedi',
    'cat',
    'köpek',
    'kopek',
    'dog',
  ]),
  ...makeCategoryAliases({ tr: 'Kişisel Bakım', en: 'Personal Care' }, [
    'kişisel bakım',
    'kisisel bakim',
    'personal care',
    'bakım',
    'bakim',
    'kuaför',
    'kuafor',
    'barber',
    'hairdresser',
    'kozmetik',
    'cosmetics',
  ]),
  ...makeCategoryAliases({ tr: 'Hediye', en: 'Gifts' }, ['hediye', 'gift', 'gifts']),
  ...makeCategoryAliases({ tr: 'Bebek', en: 'Baby' }, ['bebek', 'baby', 'child', 'children', 'çocuk', 'cocuk']),
  ...makeCategoryAliases({ tr: 'Sigorta', en: 'Insurance' }, ['sigorta', 'insurance']),
  ...makeCategoryAliases({ tr: 'Banka', en: 'Banking' }, ['banka', 'bank', 'banking']),
  ...makeCategoryAliases({ tr: 'Vergi', en: 'Taxes' }, ['vergi', 'tax', 'taxes']),
  ...makeCategoryAliases({ tr: 'Tatil', en: 'Vacation' }, [
    'tatil',
    'vacation',
    'holiday',
    'seyahat',
    'travel',
    'trip',
    'otel',
    'hotel',
  ]),
  ...makeCategoryAliases({ tr: 'Kredi Kartı', en: 'Credit Card' }, [
    'kredi kartı',
    'kredi karti',
    'credit card',
    'card',
  ]),
  ...makeCategoryAliases({ tr: 'Borç', en: 'Debt' }, ['borç', 'borc', 'debt', 'loan', 'kredi']),
  ...makeCategoryAliases({ tr: 'Yatırım', en: 'Investment' }, [
    'yatırım',
    'yatirim',
    'investment',
    'investing',
    'hisse',
    'stock',
    'stocks',
    'kripto',
    'crypto',
  ]),
  ...makeCategoryAliases({ tr: 'Birikim', en: 'Savings' }, ['birikim', 'savings', 'saving']),
  ...makeCategoryAliases({ tr: 'Alışveriş', en: 'Shopping' }, [
    'alışveriş',
    'alisveris',
    'shopping',
    'shop',
    'store',
  ]),
  ...makeCategoryAliases({ tr: 'Diğer', en: 'Other' }, ['diğer', 'diger', 'other', 'misc', 'miscellaneous']),
};

const expenseTitleTranslationKeys: Record<string, TranslationKey> = {
  'Elektrik ve İnternet Faturaları': 'demoBillTitle',
  'Haftalık Süpermarket Alışverişi': 'demoGroceryTitle',
  'Sinema ve Konser Biletleri': 'demoEntertainmentTitle',
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((storedLanguage) => {
      if (storedLanguage === 'tr' || storedLanguage === 'en') {
        setLanguageState(storedLanguage);
      }
    });
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage).catch(() => undefined);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'tr' ? 'en' : 'tr');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => interpolate(dictionaries[language][key], values),
    [language],
  );

  const categoryLabel = useCallback(
    (name: string) => {
      const translationKey = categoryTranslationKeys[name];
      if (translationKey) {
        return t(translationKey);
      }

      const commonLabel = commonCategoryLabels[normalizeLabel(name)];
      return commonLabel ? commonLabel[language] : name;
    },
    [language, t],
  );

  const expenseTitleLabel = useCallback(
    (title: string) => {
      const translationKey = expenseTitleTranslationKeys[title];
      return translationKey ? t(translationKey) : title;
    },
    [t],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      locale: language === 'tr' ? 'tr-TR' : 'en-US',
      setLanguage,
      toggleLanguage,
      t,
      categoryLabel,
      expenseTitleLabel,
    }),
    [categoryLabel, expenseTitleLabel, language, setLanguage, t, toggleLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within LanguageProvider.');
  }
  return context;
}
