import fixedExpensesData from '../data/fixed-expenses.json';
import {
  canUseFirebase,
  firebase,
  getDb,
  initFirebase,
  isInitialized
} from '../firebase/config.js';

const STORAGE_KEY = 'expenses';
const USER_ID_KEY = 'expenseTracker_userId';
const MIGRATION_FLAG_KEY = 'expenseTracker_migratedToFirebase';
const FIXED_BACKFILL_KEY = 'expenseTracker_fixedBackfill';

const FIXED_EXPENSE_ALIASES = {
  'Electricity Bill': 'Electric'
};

let fixedExpenseInitialization = null;

function getLocalStorage() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }
  return window.localStorage;
}

function getWindowSearch() {
  if (typeof window === 'undefined' || typeof window.location === 'undefined') {
    return '';
  }
  return window.location.search || '';
}

function getMonthAbbr(monthIndex) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[monthIndex] || 'Unknown';
}

function normalizeFixedDescription(description) {
  return FIXED_EXPENSE_ALIASES[description] || description;
}

function getFixedExpenseKey(description, year, month, dayOfMonth) {
  const normalized = normalizeFixedDescription(description);
  return `${normalized}|${year}-${month}-${dayOfMonth}`;
}

function getExpenseDateParts(dateValue) {
  const expenseDate = new Date(dateValue);
  return {
    year: expenseDate.getFullYear(),
    month: expenseDate.getMonth(),
    day: expenseDate.getDate()
  };
}

class ExpenseTracker {
  constructor() {
    this.currentDate = new Date();
    this.expenses = {};
    this.listeners = [];
    this.useFirebase = false;
    this.db = null;
    this.loading = true;
    this.userId = this.getUserId();
    this.addingFixedExpenses = false;
    this.processedMonths = new Set();

    this.initStorage();
  }

  getUserId() {
    let userId = 'personal';
    const storage = getLocalStorage();

    if (storage) {
      const saved = storage.getItem(USER_ID_KEY);
      if (saved) {
        userId = saved;
      }
    }

    const urlParams = new URLSearchParams(getWindowSearch());
    const customUserId = urlParams.get('userId');
    if (customUserId && customUserId.trim()) {
      userId = customUserId.trim();
    }

    if (storage) {
      storage.setItem(USER_ID_KEY, userId);
    }

    return userId;
  }

  async initStorage() {
    if (canUseFirebase()) {
      try {
        await initFirebase();
        if (isInitialized()) {
          this.db = getDb();
          if (this.db) {
            this.useFirebase = true;
            await this.loadExpenses();
            await this.migrateLocalStorageToFirebase();
            await this.loadAndAddFixedExpenses();
            await this.syncFixedExpensesInCurrentMonth();
            this.setupFirebaseListener();
            this.loading = false;
            this.notify();
            return;
          }
        }
      } catch (error) {
        console.warn('Firebase initialization failed, falling back to localStorage', error);
      }
    }

    this.useFirebase = false;
    this.expenses = this.loadExpensesFromLocal();
    await this.loadAndAddFixedExpenses();
    await this.syncFixedExpensesInCurrentMonth();
    this.loading = false;
    this.notify();
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      return () => {};
    }

    this.listeners.push(callback);

    if (!this.loading) {
      callback(this.getState());
    }

    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback);
    };
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  loadExpensesFromLocal() {
    const storage = getLocalStorage();
    if (!storage) {
      return {};
    }

    try {
      const stored = storage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      console.warn('Unable to load expenses from localStorage', error);
      return {};
    }
  }

  async loadExpenses() {
    if (!this.useFirebase || !this.db) {
      this.expenses = this.loadExpensesFromLocal();
      return;
    }

    this.loading = true;
    try {
      const snapshot = await this.db
        .collection('expenses')
        .where('userId', '==', this.userId)
        .get();

      this.expenses = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const monthKey = this.getMonthKey(new Date(data.date));
        if (!this.expenses[monthKey]) {
          this.expenses[monthKey] = [];
        }
        this.expenses[monthKey].push({
          id: doc.id,
          ...data
        });
      });
    } catch (error) {
      console.error('Error loading expenses from Firebase:', error);
      this.expenses = this.loadExpensesFromLocal();
      this.useFirebase = false;
    } finally {
      this.loading = false;
    }
  }

  async migrateLocalStorageToFirebase() {
    if (!this.useFirebase || !this.db) return;

    const storage = getLocalStorage();
    if (!storage) return;

    const migrationFlag = storage.getItem(MIGRATION_FLAG_KEY);
    if (migrationFlag === 'true') {
      return;
    }

    try {
      const localData = this.loadExpensesFromLocal();
      const localKeys = Object.keys(localData);

      if (localKeys.length === 0) {
        storage.setItem(MIGRATION_FLAG_KEY, 'true');
        return;
      }

      let migratedCount = 0;
      const batchLimit = 500;
      let batch = this.db.batch();
      let currentBatch = 0;

      for (const monthKey of localKeys) {
        const expenses = localData[monthKey] || [];

        for (const expense of expenses) {
          const existing = await this.db.collection('expenses')
            .where('userId', '==', this.userId)
            .where('date', '==', expense.date)
            .where('description', '==', expense.description)
            .limit(1)
            .get();

          if (existing.empty) {
            const expenseData = {
              description: expense.description,
              amount: expense.amount,
              category: expense.category || 'bills',
              date: expense.date,
              userId: this.userId
            };

            if (expense.createdAt && firebase?.firestore?.Timestamp) {
              try {
                expenseData.createdAt = firebase.firestore.Timestamp.fromDate(new Date(expense.createdAt));
              } catch (e) {
                expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
              }
            } else if (firebase?.firestore?.FieldValue) {
              expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            const docRef = this.db.collection('expenses').doc();
            batch.set(docRef, expenseData);
            migratedCount += 1;
            currentBatch += 1;

            if (currentBatch >= batchLimit) {
              await batch.commit();
              batch = this.db.batch();
              currentBatch = 0;
            }
          }
        }
      }

      if (currentBatch > 0) {
        await batch.commit();
      }

      storage.setItem(MIGRATION_FLAG_KEY, 'true');
      storage.removeItem(STORAGE_KEY);
      await this.loadExpenses();
      this.notify();
      console.log(`Migrated ${migratedCount} expenses to Firebase`);
    } catch (error) {
      console.error('Error migrating localStorage to Firebase:', error);
    }
  }

  setupFirebaseListener() {
    if (!this.db) return;

    this.db.collection('expenses')
      .where('userId', '==', this.userId)
      .onSnapshot((snapshot) => {
        this.expenses = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const monthKey = this.getMonthKey(new Date(data.date));
          if (!this.expenses[monthKey]) {
            this.expenses[monthKey] = [];
          }
          this.expenses[monthKey].push({
            id: doc.id,
            ...data
          });
        });
        this.notify();
      }, (error) => {
        console.error('Firebase listener error:', error);
        if (error.code === 'permission-denied') {
          console.warn('Permission denied, falling back to localStorage');
          this.useFirebase = false;
          this.expenses = this.loadExpensesFromLocal();
          this.notify();
        }
      });
  }

  async saveExpenses() {
    if (!this.useFirebase || !this.db) {
      const storage = getLocalStorage();
      if (storage) {
        try {
          storage.setItem(STORAGE_KEY, JSON.stringify(this.expenses));
        } catch (error) {
          console.warn('Unable to save expenses to localStorage', error);
        }
      }
    }
  }

  getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  getCurrentMonthKey() {
    return this.getMonthKey(this.currentDate);
  }

  setMonth(year, monthIndex) {
    if (typeof year === 'number' && typeof monthIndex === 'number') {
      this.currentDate = new Date(year, monthIndex, 1);
      this.notify();
    }
  }

  incrementMonth(offset) {
    if (typeof offset === 'number') {
      const newDate = new Date(this.currentDate);
      newDate.setMonth(newDate.getMonth() + offset);
      this.currentDate = newDate;
      this.notify();
    }
  }

  getCurrentMonthExpenses() {
    const monthKey = this.getCurrentMonthKey();
    return [...(this.expenses[monthKey] || [])].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
  }

  getCategoryTotals(expenses) {
    return expenses.reduce((totals, expense) => {
      const category = (expense.category || 'bills').toLowerCase();
      if (!totals[category]) {
        totals[category] = 0;
      }
      totals[category] += Number(expense.amount) || 0;
      return totals;
    }, {});
  }

  getMonthlySummary(date = this.currentDate) {
    const monthKey = this.getMonthKey(date);
    const expenses = [...(this.expenses[monthKey] || [])];
    const totalSpent = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const expenseCount = expenses.length;
    const categoryTotals = this.getCategoryTotals(expenses);

    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0] || [null, 0];

    const averagePerExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    return {
      totalSpent,
      expenseCount,
      categoryTotals,
      topCategory,
      averagePerExpense,
    };
  }

  getAvailableMonths() {
    return Object.keys(this.expenses)
      .map((key) => {
        const [year, month] = key.split('-').map(Number);
        return { key, year, month: month - 1 };
      })
      .sort((a, b) => new Date(b.year, b.month, 1) - new Date(a.year, a.month, 1));
  }

  async addExpense({ description, amount, category, date, isFixedExpense }) {
    const trimmedDescription = (description || '').trim();
    const numericAmount = parseFloat(amount);

    if (!trimmedDescription || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return false;
    }

    const expenseDate = date ? new Date(date) : new Date(this.currentDate);
    const expenseData = {
      description: trimmedDescription,
      amount: numericAmount,
      category: (category || 'bills').toLowerCase(),
      date: expenseDate.toISOString(),
      userId: this.userId
    };

    if (isFixedExpense) {
      expenseData.isFixedExpense = true;
    }

    if (this.useFirebase && this.db && firebase?.firestore?.FieldValue) {
      expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    if (this.useFirebase && this.db) {
      try {
        const docRef = await this.db.collection('expenses').add(expenseData);
        console.log('Expense added to Firebase:', docRef.id);
        return true;
      } catch (error) {
        console.error('Error adding expense to Firebase:', error);
        if (error.code === 'permission-denied') {
          this.useFirebase = false;
        }
      }
    }

    const expense = {
      id: Date.now(),
      ...expenseData,
      createdAt: new Date().toISOString()
    };
    const monthKey = this.getMonthKey(expenseDate);
    if (!this.expenses[monthKey]) {
      this.expenses[monthKey] = [];
    }
    this.expenses[monthKey].push(expense);
    await this.saveExpenses();
    this.notify();
    return true;
  }

  async deleteExpense(expenseId) {
    if (!expenseId) {
      return;
    }

    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) {
      return;
    }

    if (this.useFirebase && this.db) {
      try {
        await this.db.collection('expenses').doc(String(expenseId)).delete();
        return;
      } catch (error) {
        console.error('Error deleting expense from Firebase:', error);
        if (error.code === 'permission-denied') {
          this.useFirebase = false;
        }
      }
    }

    this.expenses[monthKey] = existing.filter((expense) => {
      const expenseIdStr = String(expense.id);
      const deleteIdStr = String(expenseId);
      return expenseIdStr !== deleteIdStr;
    });

    if (this.expenses[monthKey].length === 0) {
      delete this.expenses[monthKey];
    }

    await this.saveExpenses();
    this.notify();
  }

  async updateExpense(expenseId, updates) {
    if (!expenseId) {
      return false;
    }

    let monthKey = null;
    let expenseIndex = -1;

    for (const [key, monthExpenses] of Object.entries(this.expenses)) {
      const index = monthExpenses.findIndex((expense) => String(expense.id) === String(expenseId));
      if (index !== -1) {
        monthKey = key;
        expenseIndex = index;
        break;
      }
    }

    if (monthKey === null || expenseIndex === -1) {
      return false;
    }

    const existing = this.expenses[monthKey];
    const expense = existing[expenseIndex];
    const updatedExpense = { ...expense, ...updates };

    if (this.useFirebase && this.db) {
      try {
        await this.db.collection('expenses').doc(String(expenseId)).update(updates);
        existing[expenseIndex] = updatedExpense;
        await this.loadExpenses();
        this.notify();
        return true;
      } catch (error) {
        console.error('Error updating expense in Firebase:', error);
        if (error.code === 'permission-denied') {
          this.useFirebase = false;
        }
        return false;
      }
    }

    existing[expenseIndex] = updatedExpense;
    await this.saveExpenses();
    this.notify();
    return true;
  }

  async updateFixedExpenseInCurrentMonth(description, newAmount) {
    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) {
      return false;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const fixedExpense = { description, dayOfMonth: 1 };
    const matchingExpense = this.findMatchingFixedExpense(existing, fixedExpense, year, month, 1)
      || existing.find((expense) => normalizeFixedDescription(expense.description) === normalizeFixedDescription(description));

    if (matchingExpense) {
      return await this.updateExpense(matchingExpense.id, { amount: newAmount });
    }

    return false;
  }

  async clearCurrentMonth() {
    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) return;

    if (this.useFirebase && this.db) {
      try {
        const batch = this.db.batch();
        existing.forEach((expense) => {
          const docRef = this.db.collection('expenses').doc(expense.id);
          batch.delete(docRef);
        });
        await batch.commit();
        this.clearMonthFixedExpenseLoaded(monthKey);
        return;
      } catch (error) {
        console.error('Error clearing month from Firebase:', error);
      }
    }

    delete this.expenses[monthKey];
    this.clearMonthFixedExpenseLoaded(monthKey);
    await this.saveExpenses();
    this.notify();
  }

  getFixedBackfillState() {
    const storage = getLocalStorage();
    if (!storage) {
      return {};
    }

    try {
      const parsed = JSON.parse(storage.getItem(FIXED_BACKFILL_KEY) || '{}');
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      console.warn('Unable to read fixed expense backfill state', error);
      return {};
    }
  }

  getFixedBackfillEntryKey(monthKey) {
    return `${this.userId}:${monthKey}`;
  }

  isMonthFixedExpenseLoaded(monthKey) {
    return Boolean(this.getFixedBackfillState()[this.getFixedBackfillEntryKey(monthKey)]?.loaded);
  }

  markMonthFixedExpenseLoaded(monthKey) {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    const state = this.getFixedBackfillState();
    state[this.getFixedBackfillEntryKey(monthKey)] = {
      loaded: true,
      loadedAt: new Date().toISOString()
    };
    storage.setItem(FIXED_BACKFILL_KEY, JSON.stringify(state));
  }

  clearMonthFixedExpenseLoaded(monthKey) {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    const state = this.getFixedBackfillState();
    delete state[this.getFixedBackfillEntryKey(monthKey)];
    storage.setItem(FIXED_BACKFILL_KEY, JSON.stringify(state));
  }

  buildExistingFixedExpenseKeys(monthExpenses) {
    const keys = new Set();

    for (const expense of monthExpenses) {
      const { year, month, day } = getExpenseDateParts(expense.date);
      keys.add(getFixedExpenseKey(expense.description, year, month, day));
      keys.add(`${expense.description}|${year}-${month}-${day}`);
    }

    return keys;
  }

  findMatchingFixedExpense(monthExpenses, fixedExpense, year, month, dayOfMonth) {
    const targetDescription = normalizeFixedDescription(fixedExpense.description);

    return monthExpenses.find((expense) => {
      const { year: expenseYear, month: expenseMonth, day: expenseDay } = getExpenseDateParts(expense.date);
      const expenseDescription = normalizeFixedDescription(expense.description);

      return expenseDescription === targetDescription
        && expenseYear === year
        && expenseMonth === month
        && expenseDay === dayOfMonth;
    });
  }

  async loadFixedExpenses() {
    if (fixedExpensesData?.fixedExpenses?.length) {
      return fixedExpensesData.fixedExpenses;
    }
    return [];
  }

  hasAllFixedExpensesForMonth(monthExpenses, fixedExpenses, year, month, today) {
    const targetDate = new Date(year, month, 1);
    if (targetDate > today) {
      return true;
    }

    for (const fixedExpense of fixedExpenses) {
      const maxDay = new Date(year, month + 1, 0).getDate();
      const dayOfMonth = Math.min(fixedExpense.dayOfMonth || 1, maxDay);
      const expenseDate = new Date(year, month, dayOfMonth);
      expenseDate.setHours(0, 0, 0, 0);

      if (expenseDate > today) {
        continue;
      }

      if (!this.findMatchingFixedExpense(monthExpenses, fixedExpense, year, month, dayOfMonth)) {
        return false;
      }
    }

    return true;
  }

  async loadAndAddFixedExpenses() {
    if (fixedExpenseInitialization) {
      return fixedExpenseInitialization;
    }

    fixedExpenseInitialization = this.runFixedExpenseBackfill();
    try {
      await fixedExpenseInitialization;
    } finally {
      fixedExpenseInitialization = null;
    }
  }

  async runFixedExpenseBackfill() {
    if (this.addingFixedExpenses) {
      return;
    }

    getLocalStorage()?.removeItem('expenseTracker_fixedExpenseLock');

    this.addingFixedExpenses = true;
    try {
      this.processedMonths.clear();

      const fixedExpenses = await this.loadFixedExpenses();
      if (!fixedExpenses || fixedExpenses.length === 0) {
        return;
      }

      if (this.useFirebase && this.db) {
        await this.loadExpenses();
      }

      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      for (let year = currentYear; year >= currentYear - 1; year -= 1) {
        const startMonth = year === currentYear ? currentMonth : 11;

        for (let month = startMonth; month >= 0; month -= 1) {
          const monthKey = this.getMonthKey(new Date(year, month, 1));

          if (this.isMonthFixedExpenseLoaded(monthKey)) {
            continue;
          }

          const monthExpenses = this.expenses[monthKey] || [];
          if (this.hasAllFixedExpensesForMonth(monthExpenses, fixedExpenses, year, month, today)) {
            this.markMonthFixedExpenseLoaded(monthKey);
            continue;
          }

          await this.addFixedExpensesForMonth(fixedExpenses, year, month);

          if (this.useFirebase && this.db) {
            await this.loadExpenses();
          }

          const updatedMonthExpenses = this.expenses[monthKey] || [];
          if (this.hasAllFixedExpensesForMonth(updatedMonthExpenses, fixedExpenses, year, month, today)) {
            this.markMonthFixedExpenseLoaded(monthKey);
          }
        }
      }
    } finally {
      this.addingFixedExpenses = false;
    }
  }

  async syncFixedExpensesInCurrentMonth() {
    const fixedExpenses = await this.loadFixedExpenses();
    if (!fixedExpenses || fixedExpenses.length === 0) {
      return;
    }

    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey] || [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    for (const fixedExpense of fixedExpenses) {
      const maxDay = new Date(year, month + 1, 0).getDate();
      const dayOfMonth = Math.min(fixedExpense.dayOfMonth || 1, maxDay);
      const matchingExpense = this.findMatchingFixedExpense(existing, fixedExpense, year, month, dayOfMonth);

      if (!matchingExpense) {
        continue;
      }

      const updates = {};
      if (matchingExpense.description !== fixedExpense.description) {
        updates.description = fixedExpense.description;
      }
      if (matchingExpense.amount !== fixedExpense.amount) {
        updates.amount = fixedExpense.amount;
      }
      if (!matchingExpense.isFixedExpense) {
        updates.isFixedExpense = true;
      }

      if (Object.keys(updates).length > 0) {
        await this.updateExpense(matchingExpense.id, updates);
      }
    }
  }

  async addFixedExpensesForMonth(fixedExpenses, year, month) {
    const monthKey = this.getMonthKey(new Date(year, month, 1));

    const processingKey = `fixed-${monthKey}`;
    if (this.processedMonths.has(processingKey)) {
      return;
    }

    if (this.useFirebase && this.db) {
      await this.loadExpenses();
    }

    const monthExpenses = this.expenses[monthKey] || [];
    const existingFixedExpenseKeys = this.buildExistingFixedExpenseKeys(monthExpenses);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const targetDate = new Date(year, month, 1);

    if (targetDate > today) {
      this.processedMonths.add(processingKey);
      return;
    }

    let addedCount = 0;

    for (const fixedExpense of fixedExpenses) {
      const normalizedCategory = (fixedExpense.category || 'bills').toLowerCase();
      const maxDay = new Date(year, month + 1, 0).getDate();
      const dayOfMonth = Math.min(fixedExpense.dayOfMonth || 1, maxDay);
      const expenseDate = new Date(year, month, dayOfMonth);
      expenseDate.setHours(0, 0, 0, 0);

      const expenseKey = getFixedExpenseKey(fixedExpense.description, year, month, dayOfMonth);
      const matchingExpense = this.findMatchingFixedExpense(monthExpenses, fixedExpense, year, month, dayOfMonth);

      if (matchingExpense) {
        const updates = {};
        if (matchingExpense.description !== fixedExpense.description) {
          updates.description = fixedExpense.description;
        }
        if (matchingExpense.amount !== fixedExpense.amount) {
          updates.amount = fixedExpense.amount;
        }
        if (!matchingExpense.isFixedExpense) {
          updates.isFixedExpense = true;
        }

        if (Object.keys(updates).length > 0) {
          await this.updateExpense(matchingExpense.id, updates);
        }
        continue;
      }

      if (existingFixedExpenseKeys.has(expenseKey)) {
        continue;
      }

      if (expenseDate <= today) {
        const expenseData = {
          description: fixedExpense.description,
          amount: fixedExpense.amount,
          category: normalizedCategory,
          date: expenseDate,
          isFixedExpense: true
        };

        const success = await this.addExpense(expenseData);
        if (success) {
          addedCount += 1;
          existingFixedExpenseKeys.add(expenseKey);
        }
      }
    }

    this.processedMonths.add(processingKey);

    if (addedCount > 0 && this.useFirebase && this.db) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.loadExpenses();
      this.notify();
    }
  }

  getMonthlyTotals(limit = 12) {
    const availableMonths = this.getAvailableMonths();
    const monthlyTotals = [];

    for (const monthInfo of availableMonths.slice(0, limit)) {
      const summary = this.getMonthlySummary(new Date(monthInfo.year, monthInfo.month, 1));
      monthlyTotals.push({
        monthKey: monthInfo.key,
        year: monthInfo.year,
        month: monthInfo.month,
        total: summary.totalSpent,
        label: `${getMonthAbbr(monthInfo.month)} ${monthInfo.year}`
      });
    }

    return monthlyTotals;
  }

  getState() {
    const currentExpenses = this.getCurrentMonthExpenses();
    return {
      currentDate: new Date(this.currentDate),
      monthKey: this.getCurrentMonthKey(),
      expenses: currentExpenses,
      summary: this.getMonthlySummary(),
      availableMonths: this.getAvailableMonths(),
    };
  }
}

export default ExpenseTracker;

