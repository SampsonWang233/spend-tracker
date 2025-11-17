// Helper function to get month abbreviation
function getMonthAbbr(monthIndex) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames[monthIndex] || 'Unknown';
}

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
    
    console.log('👤 Current userId:', this.userId);
    console.log('💡 All devices using the same userId will share data');
    
    // Initialize storage
    this.initStorage();
  }

  getUserId() {
    // For personal use, always use 'personal' as the default userId
    // This ensures all devices (desktop, mobile) share the same data
    let userId = 'personal';
    
    // Allow user to set custom userId via URL parameter (optional)
    const urlParams = new URLSearchParams(window.location.search);
    const customUserId = urlParams.get('userId');
    if (customUserId && customUserId.trim()) {
      userId = customUserId.trim();
      localStorage.setItem('expenseTracker_userId', userId);
      console.log('🔑 Using custom userId from URL:', userId);
    } else {
      // Always use 'personal' and update localStorage to ensure consistency
      localStorage.setItem('expenseTracker_userId', userId);
      console.log('📱 Using shared userId for cross-device sync:', userId);
    }
    
    return userId;
  }

  async initStorage() {
    // Check if Firebase is available and configured
    if (window.firebaseConfig) {
      try {
        console.log('Attempting to initialize Firebase...');
        await window.firebaseConfig.init();
        this.db = window.firebaseConfig.getDb();
        if (this.db && window.firebaseConfig.isInitialized()) {
          console.log('✅ Firebase initialized successfully');
          this.useFirebase = true;
          
          // Load expenses from Firebase
          await this.loadExpenses();
          
          // Migrate localStorage data to Firebase if it exists
          await this.migrateLocalStorageToFirebase();
          
          // Load and add fixed expenses
          await this.loadAndAddFixedExpenses();
          
          this.setupFirebaseListener();
          this.notify();
          return;
        } else {
          console.warn('⚠️ Firebase DB not available');
        }
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        console.warn('Falling back to localStorage');
      }
    } else {
      console.warn('⚠️ Firebase config not found, using localStorage');
    }
    
    // Fallback to localStorage
    this.useFirebase = false;
    this.expenses = this.loadExpensesFromLocal();
    console.log('📦 Using localStorage for data storage');
    
    // Load and add fixed expenses
    await this.loadAndAddFixedExpenses();
    
    this.notify();
  }

  async migrateLocalStorageToFirebase() {
    if (!this.useFirebase || !this.db) return;
    
    // Check if migration was already done
    const migrationFlag = localStorage.getItem('expenseTracker_migratedToFirebase');
    if (migrationFlag === 'true') {
      console.log('Migration already completed, skipping');
      return;
    }
    
    try {
      const localData = this.loadExpensesFromLocal();
      const localKeys = Object.keys(localData);
      
      if (localKeys.length === 0) {
        console.log('No localStorage data to migrate');
        localStorage.setItem('expenseTracker_migratedToFirebase', 'true');
        return;
      }

      console.log(`🔄 Found ${localKeys.length} months of data in localStorage, migrating to Firebase...`);
      
      let migratedCount = 0;
      const batchLimit = 500; // Firestore batch limit
      let batch = this.db.batch();
      let currentBatch = 0;

      for (const monthKey of localKeys) {
        const expenses = localData[monthKey] || [];
        
        for (const expense of expenses) {
          // Check if expense already exists in Firebase (simple check by date and description)
          const existing = await this.db.collection('expenses')
            .where('userId', '==', this.userId)
            .where('date', '==', expense.date)
            .where('description', '==', expense.description)
            .limit(1)
            .get();
          
          if (existing.empty) {
            // Expense doesn't exist in Firebase, add it
            const expenseData = {
              description: expense.description,
              amount: expense.amount,
              category: expense.category || 'bills',
              date: expense.date,
              userId: this.userId
            };
            
            // Add timestamp if available
            if (expense.createdAt && typeof firebase !== 'undefined') {
              try {
                expenseData.createdAt = firebase.firestore.Timestamp.fromDate(new Date(expense.createdAt));
              } catch (e) {
                expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
              }
            } else if (typeof firebase !== 'undefined') {
              expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            const docRef = this.db.collection('expenses').doc();
            batch.set(docRef, expenseData);
            migratedCount++;
            currentBatch++;
            
            // Commit batch if we hit the limit and create new batch
            if (currentBatch >= batchLimit) {
              await batch.commit();
              batch = this.db.batch();
              currentBatch = 0;
            }
          }
        }
      }
      
      // Commit remaining items
      if (currentBatch > 0) {
        await batch.commit();
      }
      
      if (migratedCount > 0) {
        console.log(`✅ Migrated ${migratedCount} expenses to Firebase`);
        // Mark migration as complete
        localStorage.setItem('expenseTracker_migratedToFirebase', 'true');
        // Clear localStorage after successful migration
        localStorage.removeItem('expenses');
        console.log('🗑️ Cleared localStorage data after migration');
        // Reload expenses from Firebase to show migrated data
        await this.loadExpenses();
        this.notify();
      } else {
        console.log('✅ All data already in Firebase');
        localStorage.setItem('expenseTracker_migratedToFirebase', 'true');
      }
    } catch (error) {
      console.error('❌ Error migrating localStorage to Firebase:', error);
      // Don't throw - allow app to continue with localStorage
    }
  }

  setupFirebaseListener() {
    if (!this.db) return;
    
    console.log('👂 Setting up Firebase real-time listener...');
    
    // Listen for real-time updates
    this.db.collection('expenses')
      .where('userId', '==', this.userId)
      .onSnapshot((snapshot) => {
        console.log(`📥 Received ${snapshot.size} expenses from Firebase`);
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
        console.error('❌ Firebase listener error:', error);
        // Fallback to localStorage on persistent errors
        if (error.code === 'permission-denied') {
          console.warn('⚠️ Permission denied, falling back to localStorage');
          this.useFirebase = false;
          this.expenses = this.loadExpensesFromLocal();
          this.notify();
        }
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
      const category = expense.category || 'bills';
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
      category: category || 'bills',
      date: expenseDate.toISOString(),
      userId: this.userId
    };

    // Preserve isFixedExpense flag if provided
    if (isFixedExpense) {
      expenseData.isFixedExpense = true;
    }

    // Add server timestamp only if using Firebase
    if (this.useFirebase && this.db && typeof firebase !== 'undefined') {
      expenseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    if (this.useFirebase && this.db) {
      try {
        const docRef = await this.db.collection('expenses').add(expenseData);
        console.log('✅ Expense added to Firebase:', docRef.id);
        // The listener will update this.expenses automatically
        return true;
      } catch (error) {
        console.error('❌ Error adding expense to Firebase:', error);
        // If it's a permission error, switch to localStorage
        if (error.code === 'permission-denied') {
          console.warn('⚠️ Permission denied, switching to localStorage');
          this.useFirebase = false;
        }
        // Fallback to localStorage
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
    if (!expenseId) {
      console.error('No expense ID provided for deletion');
      return;
    }

    const monthKey = this.getCurrentMonthKey();
    const existing = this.expenses[monthKey];
    if (!existing) {
      console.warn('No expenses found for current month');
      return;
    }

    if (this.useFirebase && this.db) {
      try {
        // Firebase IDs are strings, but we need to ensure we're using the correct ID
        // The expenseId from the button should be the Firebase document ID
        await this.db.collection('expenses').doc(String(expenseId)).delete();
        console.log('✅ Expense deleted from Firebase:', expenseId);
        // The listener will update this.expenses automatically
        return;
      } catch (error) {
        console.error('❌ Error deleting expense from Firebase:', error);
        // If it's a permission error, switch to localStorage
        if (error.code === 'permission-denied') {
          console.warn('⚠️ Permission denied, switching to localStorage');
          this.useFirebase = false;
        } else {
          // For other errors, fallback to localStorage
        }
      }
    }

    // Use localStorage or fallback
    // Handle both string and number IDs for compatibility
    this.expenses[monthKey] = existing.filter((expense) => {
      // Compare as both string and number to handle both Firebase (string) and localStorage (number) IDs
      const expenseIdStr = String(expense.id);
      const deleteIdStr = String(expenseId);
      return expenseIdStr !== deleteIdStr;
    });

    if (this.expenses[monthKey].length === 0) {
      delete this.expenses[monthKey];
    }

    this.saveExpenses();
    this.notify();
    console.log('✅ Expense deleted from localStorage');
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

  async loadFixedExpenses() {
    // First, try to get from window object (loaded via script tag - works with file://)
    if (window.fixedExpensesData && window.fixedExpensesData.fixedExpenses) {
      console.log('✅ Loaded fixed expenses from JavaScript file');
      return window.fixedExpensesData.fixedExpenses;
    }

    // Fallback: try to fetch JSON file (works with http/https)
    try {
      const response = await fetch('fixed-expenses.json');
      if (!response.ok) {
        console.warn('⚠️ fixed-expenses.json not found or not accessible');
        return null;
      }
      const data = await response.json();
      return data.fixedExpenses || [];
    } catch (error) {
      console.warn('⚠️ Could not load fixed expenses from JSON:', error);
      console.warn('💡 Make sure fixed-expenses.js is loaded via script tag in your HTML');
      return null;
    }
  }

  async loadAndAddFixedExpenses() {
    console.log('🔄 Starting to load fixed expenses...');
    const fixedExpenses = await this.loadFixedExpenses();
    if (!fixedExpenses || fixedExpenses.length === 0) {
      console.warn('⚠️  No fixed expenses found or file could not be loaded');
      return;
    }

    console.log(`📋 Loaded ${fixedExpenses.length} fixed expenses`);

    // Get current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    console.log(`📅 Current date: ${now.toISOString().split('T')[0]}, Processing months from ${currentYear}-${String(currentMonth + 1).padStart(2, '0')} backwards`);

    // Check all months from the beginning of the current year to current month
    // Also check previous year's months
    for (let year = currentYear; year >= currentYear - 1; year--) {
      const startMonth = year === currentYear ? currentMonth : 11;
      
      for (let month = startMonth; month >= 0; month--) {
        await this.addFixedExpensesForMonth(fixedExpenses, year, month);
      }
    }
    
    console.log('✅ Finished processing fixed expenses');
  }

  async addFixedExpensesForMonth(fixedExpenses, year, month) {
    const monthKey = this.getMonthKey(new Date(year, month, 1));
    const monthExpenses = this.expenses[monthKey] || [];
    
    // Check which fixed expenses have already been added this month
    const existingDescriptions = new Set(
      monthExpenses
        .filter(e => e.isFixedExpense)
        .map(e => e.description)
    );

    let addedCount = 0;
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of day for comparison
    const targetDate = new Date(year, month, 1);
    
    // Only add fixed expenses for current or past months
    if (targetDate > today) {
      return;
    }

    console.log(`🔍 Checking fixed expenses for ${monthKey}...`);

    for (const fixedExpense of fixedExpenses) {
      // Skip if already added this month
      if (existingDescriptions.has(fixedExpense.description)) {
        console.log(`⏭️  Skipping "${fixedExpense.description}" - already exists in ${monthKey}`);
        continue;
      }

      // Normalize category to lowercase
      const normalizedCategory = (fixedExpense.category || 'bills').toLowerCase();

      // Calculate the date for this expense (dayOfMonth of the target month)
      const maxDay = new Date(year, month + 1, 0).getDate(); // Last day of the month
      const dayOfMonth = Math.min(fixedExpense.dayOfMonth || 1, maxDay);
      const expenseDate = new Date(year, month, dayOfMonth);
      expenseDate.setHours(0, 0, 0, 0); // Set to start of day

      // Only add if the expense date has passed or it's today
      if (expenseDate <= today) {
        const expenseData = {
          description: fixedExpense.description,
          amount: fixedExpense.amount,
          category: normalizedCategory,
          date: expenseDate,
          isFixedExpense: true // Mark as fixed expense
        };

        console.log(`➕ Adding fixed expense: ${fixedExpense.description} (${expenseData.amount}) on ${expenseDate.toISOString().split('T')[0]}`);
        const success = await this.addExpense(expenseData);
        if (success) {
          addedCount++;
        } else {
          console.warn(`⚠️  Failed to add expense: ${fixedExpense.description}`);
        }
      } else {
        console.log(`⏳ Skipping "${fixedExpense.description}" - date ${expenseDate.toISOString().split('T')[0]} is in the future`);
      }
    }

    if (addedCount > 0) {
      console.log(`✅ Added ${addedCount} fixed expense(s) for ${monthKey}`);
      // If using Firebase, reload expenses to ensure they're reflected
      if (this.useFirebase && this.db) {
        // Small delay to ensure Firebase has processed the writes
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.loadExpenses();
        this.notify();
      }
    } else {
      console.log(`ℹ️  No new fixed expenses to add for ${monthKey}`);
    }
  }

  getMonthlyTotals(limit = 12) {
    // Get monthly totals for the last N months
    const availableMonths = this.getAvailableMonths();
    const monthlyTotals = [];
    
    // Get totals for available months
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

// eslint-disable-next-line no-unused-vars
window.ExpenseTracker = ExpenseTracker;
