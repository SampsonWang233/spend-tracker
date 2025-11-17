const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CATEGORY_LABELS = {
  dining: 'Dining',
  shopping: 'Shopping',
  transport: 'Transport',
  housing: 'Housing',
  grocery: 'Grocery',
  entertainment: 'Entertainment',
  bills: 'Bills',
};

document.addEventListener('DOMContentLoaded', () => {
  const tracker = new window.ExpenseTracker();

  const expensesList = document.getElementById('expensesList');
  const clearMonthBtn = document.getElementById('clearMonth');
  const categoryFilter = document.getElementById('categoryFilter');
  const categoryTotal = document.getElementById('categoryTotal');
  const categoryTotalAmount = document.getElementById('categoryTotalAmount');
  const navSummary = document.getElementById('navSummary');
  const navAddExpense = document.getElementById('navAddExpense');

  // Track current filter
  let currentFilter = 'all';

  categoryFilter.addEventListener('change', (event) => {
    currentFilter = event.target.value;
    const state = tracker.getState();
    renderExpenses(state.expenses);
  });

  clearMonthBtn.addEventListener('click', async () => {
    const state = tracker.getState();
    const monthName = MONTHS[state.currentDate.getMonth()];
    const confirmation = window.confirm(`Clear all expenses for ${monthName} ${state.currentDate.getFullYear()}?`);
    if (confirmation) {
      await tracker.clearCurrentMonth();
    }
  });

  expensesList.addEventListener('click', async (event) => {
    const deleteButton = event.target.closest('[data-expense-id]');
    if (!deleteButton) return;

    const expenseId = deleteButton.dataset.expenseId;
    if (expenseId) {
      await tracker.deleteExpense(expenseId);
    }
  });

  tracker.subscribe((state) => {
    const { currentDate, expenses, monthKey } = state;

    renderExpenses(expenses);
    updateNavLinks(monthKey);
    updatePageTitle(currentDate);
  });

  applyInitialMonthFromQuery();

  function renderExpenses(expenses = []) {
    // Filter expenses by selected category
    let filteredExpenses = expenses;
    if (currentFilter !== 'all') {
      filteredExpenses = expenses.filter(expense => {
        // Normalize category to lowercase for comparison (handle both cases and missing categories)
        const expenseCategory = (expense.category || 'bills').toLowerCase();
        return expenseCategory === currentFilter.toLowerCase();
      });
    }

    // Calculate and display category total
    updateCategoryTotal(filteredExpenses);

    if (!Array.isArray(filteredExpenses) || filteredExpenses.length === 0) {
      if (currentFilter === 'all') {
        expensesList.innerHTML = '<p class="empty-state">No expenses yet. Add your first expense!</p>';
      } else {
        const categoryLabel = CATEGORY_LABELS[currentFilter] || capitalize(currentFilter);
        expensesList.innerHTML = `<p class="empty-state">No expenses found for ${categoryLabel} category.</p>`;
      }
      return;
    }

    expensesList.innerHTML = filteredExpenses
      .map((expense) => {
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        // Normalize category to lowercase for CSS class and label lookup
        const normalizedCategory = (expense.category || 'bills').toLowerCase();
        const label = CATEGORY_LABELS[normalizedCategory] || capitalize(expense.category || 'bills');

        return `
          <div class="expense-item">
            <div class="expense-item-info">
              <div class="expense-item-description">${escapeHtml(expense.description)}</div>
              <div class="expense-item-meta">
                <span class="category-badge category-${normalizedCategory}">${label}</span>
                <span>${formattedDate}</span>
              </div>
            </div>
            <div class="expense-item-actions">
              <span class="expense-item-amount">${formatCurrency(expense.amount)}</span>
              <button class="expense-item-delete" data-expense-id="${expense.id}" aria-label="Delete expense">×</button>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function updateCategoryTotal(filteredExpenses) {
    if (currentFilter === 'all') {
      // Hide total when showing all categories
      categoryTotal.style.display = 'none';
      return;
    }

    // Calculate total for filtered category
    const total = filteredExpenses.reduce((sum, expense) => {
      return sum + (Number(expense.amount) || 0);
    }, 0);

    // Update display
    const categoryLabel = CATEGORY_LABELS[currentFilter] || capitalize(currentFilter);
    categoryTotalAmount.textContent = formatCurrency(total);
    categoryTotal.style.display = 'flex';
  }

  function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateNavLinks(monthKey) {
    if (!monthKey) return;

    if (navSummary) {
      navSummary.href = `index.html?month=${monthKey}`;
    }

    if (navAddExpense) {
      navAddExpense.href = `details.html?month=${monthKey}`;
    }
  }

  function updatePageTitle(date) {
    if (!(date instanceof Date)) return;
    const monthName = MONTHS[date.getMonth()];
    document.title = `My Spend Tracker · ${monthName} ${date.getFullYear()}`;
  }

  function applyInitialMonthFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const monthParam = params.get('month');
    if (!monthParam) return;

    const match = monthParam.match(/^(\d{4})-(\d{2})$/);
    if (!match) return;

    const year = Number.parseInt(match[1], 10);
    const monthIndex = Number.parseInt(match[2], 10) - 1;

    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return;
    }

    tracker.setMonth(year, monthIndex);
  }
});

