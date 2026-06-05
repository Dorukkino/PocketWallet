# PocketWallet 💰

PocketWallet is a premium, mobile-first personal finance control panel built with **Expo SDK 56** and **React Native**. It simplifies monthly budget tracking by consolidating income management, expense logging, category customization, visual analysis, and multi-currency conversion into a single, intuitive dashboard.

Designed with a sleek, dark-themed UI reminiscent of high-end fintech applications, PocketWallet features a resilient offline-first architecture powered by Supabase and AsyncStorage.

---

## ✨ Features

- **Single-Screen Dashboard:** Manage your entire financial status without unnecessary navigation.
- **Monthly Budgeting:** Track income and expenses dynamically grouped by month (e.g., `2026-06`).
- **Multi-Currency Display:** View your balance in `TRY`, `USD`, `EUR`, or `GBP` with real-time exchange rates (cached for offline use via Frankfurter API).
- **Optimistic Expense Logging:** Add expenses instantly with automatic background synchronization to the cloud.
- **Custom Categories:** Personalize your expense tracking with custom names, colors, and Lucide icons.
- **Visual Analytics:** Interactive pie/donut charts generated via `react-native-svg` to pinpoint spending patterns.
- **Search & Filter:** Easily filter transactions by keyword or category.
- **Secure Authentication:** Complete email/password authentication managed securely via Supabase Auth.
- **Offline Resilience:** Reads from a local AsyncStorage snapshot on launch, maintaining full usability even when offline or during API downtime.

---

## 🛠️ Tech Stack

- **Framework:** Expo SDK 56 (~56.0.8)
- **Core:** React Native (0.85.3) & React 19 (19.2.3)
- **Language:** TypeScript (~6.0.3)
- **Backend-as-a-Service:** Supabase (Auth, RLS-protected Postgres Database)
- **Local Storage:** `@react-native-async-storage/async-storage`
- **UI & Graphics:** `expo-linear-gradient`, `react-native-svg`, `lucide-react-native`
- **Polyfills:** `react-native-get-random-values`, `react-native-url-polyfill`

---

## 📂 Project Structure

```text
src/
  ├── components/          # Reusable UI parts (Charts, Lists, Headers, Forms)
  ├── constants/           # Static data sets (Default categories, colors)
  ├── hooks/               # Domain business logic (useBudget, useExchangeRates)
  ├── lib/                 # Core services (Supabase client, storage, currency utilities)
  ├── screens/             # Top-level screen layouts (AuthScreen, BudgetScreen)
  └── types/               # TypeScript type definitions and interfaces
```
