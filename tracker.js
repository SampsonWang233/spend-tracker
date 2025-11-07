// Shared ExpenseTracker class used across summary and detail pages
class ExpenseTracker {
  constructor() {
    this.currentDate = new Date();
    this.expenses = {};
    this.listeners = [];
    this.useFirebase = false;
    this.db = null;
    this.loading = false;
    this.userId = this.getUserId();
    
    // Initialize storage
    this.initStorage();
  }

  getUserId() {
    // Generate or retrieve a unique user ID
    let userId = localStorage.getItem('expenseTracker_userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('expenseTracker_userId', userId);
    }
    return userId;
  }

  async initStorage() {
    // Check if Firebase is available and configured
    if (window.firebaseConfig) {
      try {
        await window.firebaseConfig.init();
        this.db = window.firebaseConfig.getDb();
        if (this.db && window.firebaseConfig.isInitialized()) {
          this.useFirebase = true;
          await this.loadExpenses();
          this.setupFirebaseListener();
          this.notify();
          return;
        }
      } catch (error) {
        console.warn('Firebase not available, using localStorage:', error);
      }
    }
    
    // Fallback to localStorage
    this.useFirebase = false;
    this.expenses = this.loadExpensesFromLocal();
    this.notify();
  }

  setupFirebaseListener() {
    if (!this.db) return;
    
    // Listen for real-time updates
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
      });
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      if (!this.loading) {
        callback(this.getState());
      }
    }
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  loadExpensesFromLocal() {
    try {
      const stored = localStorage.getItem('expenses');
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
      const snapshot = await this.db.collection('expenses')
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
      // Fallback to localStorage
      this.expenses = this.loadExpensesFromLocal();
    } finally {
      this.loading = false;
    }
  }

  async saveExpenses() {
    if (!this.useFirebase || !this.db) {
      // Save to localStorage
      try {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
      } catch (error) {
        console.warn('Unable to save expenses to localStorage', error);
      }
      return;
    }

    // Firebase saves are handled individually in add/delete/clear methods
    // This method is kept for compatibility but doesn't need to do anything
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
      const category = expense.category || 'other';
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

  async addExpense({ description, amount, category, date }) {
    const trimmedDescription = (description || '').trim();
    const numericAmount = parseFloat(amount);

    if (!trimmedDescription || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return false;
    }

    const expenseDate = date ? new Date(date) : new Date(this.currentDate);
    const expenseData = {
      description: trimmedDescription,
      amount: numericAmount,
      category: category || 'other',
      date: expenseDate.toISOString(),
      userId: this.userId
    };

    // Add server timestamp only if using Firebase
    if (this.useFirebase && this.db && typeof firebase !== 'undefined') {
      expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    if (this.useFirebase && this.db) {
      try {
        const docRef = await this.db.collection('expenses').add(expenseData);
        // The listener will update this.expenses automatically
        return true;
      } catch (error) {
        console.error('Error adding expense to Firebase:', error);
        // Fallback to localStorage
        const expense = {
          id: Date.now(),
          ...expenseData
        };
        const monthKey = this.getMonthKey(expenseDate);
        if (!this.expenses[monthKey]) {
          this.expenses[monthKey] = [];
        }
        this.expenses[monthKey].push(expense);
        this.saveExpenses();
        this.notify();
        return true;
      }
    } else {
      // Use localStorage
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
      this.saveExpenses();
      this.notify();
      return true;
    }
  }

  async deleteExpense(expenseId) {
    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) return;

    if (this.useFirebase && this.db) {
      try {
        await this.db.collection('expenses').doc(expenseId).delete();
        // The listener will update this.expenses automatically
        return;
      } catch (error) {
        console.error('Error deleting expense from Firebase:', error);
        // Fallback to localStorage
      }
    }

    // Use localStorage or fallback
    this.expenses[monthKey] = existing.filter((expense) => expense.id !== expenseId);

    if (this.expenses[monthKey].length === 0) {
      delete this.expenses[monthKey];
    }

    this.saveExpenses();
    this.notify();
  }

  async clearCurrentMonth() {
    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) return;

    if (this.useFirebase && this.db) {
      try {
        // Delete all expenses for this month from Firebase
        const batch = this.db.batch();
        existing.forEach((expense) => {
          const docRef = this.db.collection('expenses').doc(expense.id);
          batch.delete(docRef);
        });
        await batch.commit();
        // The listener will update this.expenses automatically
        return;
      } catch (error) {
        console.error('Error clearing month from Firebase:', error);
        // Fallback to localStorage
      }
    }

    // Use localStorage or fallback
    delete this.expenses[monthKey];
    this.saveExpenses();
    this.notify();
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

// eslint-disable-next-line no-unused-vars
window.ExpenseTracker = ExpenseTracker;
