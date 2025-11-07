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
  food: 'Food & Dining',
  transport: 'Transport',
  shopping: 'Shopping',
  bills: 'Bills & Utilities',
  entertainment: 'Entertainment',
  health: 'Health & Fitness',
  other: 'Other',
};

document.addEventListener('DOMContentLoaded', () => {
  const tracker = new window.ExpenseTracker();

  const expenseForm = document.getElementById('expenseForm');
  const descriptionInput = document.getElementById('expenseDescription');
  const amountInput = document.getElementById('expenseAmount');
  const categorySelect = document.getElementById('expenseCategory');
  const dateInput = document.getElementById('expenseDate');
  const expensesList = document.getElementById('expensesList');
  const clearMonthBtn = document.getElementById('clearMonth');
  const navSummary = document.getElementById('navSummary');
  const navBreakdown = document.querySelector('.tab-nav .tab-active');

  expenseForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const description = descriptionInput.value;
    const amount = amountInput.value;
    const category = categorySelect.value;
    const dateValue = dateInput.value;

    const selectedDate = dateValue ? new Date(dateValue) : tracker.getState().currentDate;

    const success = tracker.addExpense({
      description,
      amount,
      category,
      date: selectedDate,
    });

    if (success) {
      expenseForm.reset();
      refreshDateInput();
      showFormFeedback('Added!');
    }
  });

  clearMonthBtn.addEventListener('click', () => {
    const state = tracker.getState();
    const monthName = MONTHS[state.currentDate.getMonth()];
    const confirmation = window.confirm(`Clear all expenses for ${monthName} ${state.currentDate.getFullYear()}?`);
    if (confirmation) {
      tracker.clearCurrentMonth();
    }
  });

  expensesList.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-expense-id]');
    if (!deleteButton) return;

    const expenseId = Number.parseInt(deleteButton.dataset.expenseId, 10);
    if (!Number.isNaN(expenseId)) {
      tracker.deleteExpense(expenseId);
    }
  });

  tracker.subscribe((state) => {
    const { currentDate, expenses, monthKey } = state;

    renderExpenses(expenses);
    refreshDateInput();
    updateNavLinks(monthKey);
    updatePageTitle(currentDate);
  });

  applyInitialMonthFromQuery();

  function renderExpenses(expenses = []) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      expensesList.innerHTML = '<p class="empty-state">No expenses yet. Add your first expense above!</p>';
      return;
    }

    expensesList.innerHTML = expenses
      .map((expense) => {
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const label = CATEGORY_LABELS[expense.category] || capitalize(expense.category);

        return `
          <div class="expense-item">
            <div class="expense-item-info">
              <div class="expense-item-description">${escapeHtml(expense.description)}</div>
              <div class="expense-item-meta">
                <span class="category-badge category-${expense.category}">${label}</span>
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

  function refreshDateInput() {
    const { currentDate } = tracker.getState();
    const today = new Date();
    const year = currentDate.getFullYear();
    const monthIndex = currentDate.getMonth();
    const month = String(monthIndex + 1).padStart(2, '0');
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let day = 1;
    if (
      today.getFullYear() === year &&
      today.getMonth() === monthIndex
    ) {
      day = today.getDate();
    }

    day = Math.min(day, daysInMonth);

    const dayString = String(day).padStart(2, '0');
    dateInput.value = `${year}-${month}-${dayString}`;
    dateInput.min = `${year}-${month}-01`;
    dateInput.max = `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`;
  }

  function showFormFeedback(message) {
    const submitButton = expenseForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = message;
    submitButton.classList.add('btn-success');
    setTimeout(() => {
      submitButton.textContent = originalText;
      submitButton.classList.remove('btn-success');
    }, 1500);
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

    if (navBreakdown) {
      navBreakdown.href = `details.html?month=${monthKey}`;
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
