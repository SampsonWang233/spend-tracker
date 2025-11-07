// Shared ExpenseTracker class used across summary and detail pages
class ExpenseTracker {
  constructor() {
    this.currentDate = new Date();
    this.expenses = this.loadExpenses();
    this.listeners = [];
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
      callback(this.getState());
    }
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  loadExpenses() {
    try {
      const stored = localStorage.getItem('expenses');
      const parsed = stored ? JSON.parse(stored) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      console.warn('Unable to load expenses from localStorage', error);
      return {};
    }
  }

  saveExpenses() {
    try {
      localStorage.setItem('expenses', JSON.stringify(this.expenses));
    } catch (error) {
      console.warn('Unable to save expenses to localStorage', error);
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

  addExpense({ description, amount, category, date }) {
    const trimmedDescription = (description || '').trim();
    const numericAmount = parseFloat(amount);

    if (!trimmedDescription || Number.isNaN(numericAmount) || numericAmount <= 0) {
      return false;
    }

    const expenseDate = date ? new Date(date) : new Date(this.currentDate);
    const expense = {
      id: Date.now(),
      description: trimmedDescription,
      amount: numericAmount,
      category: category || 'other',
      date: expenseDate.toISOString(),
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

  deleteExpense(expenseId) {
    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) return;

    this.expenses[monthKey] = existing.filter((expense) => expense.id !== expenseId);

    if (this.expenses[monthKey].length === 0) {
      delete this.expenses[monthKey];
    }

    this.saveExpenses();
    this.notify();
  }

  clearCurrentMonth() {
    const monthKey = this.getCurrentMonthKey();
    if (this.expenses[monthKey]) {
      delete this.expenses[monthKey];
      this.saveExpenses();
      this.notify();
    }
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
