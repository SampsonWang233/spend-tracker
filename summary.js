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

  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  const totalSpentEl = document.getElementById('totalSpent');
  const expenseCountEl = document.getElementById('expenseCount');
  const averageExpenseEl = document.getElementById('averageExpense');
  const topCategoryEl = document.getElementById('topCategory');
  const categoryList = document.getElementById('categoryList');
  const navBreakdown = document.getElementById('navBreakdown');

  populateMonthOptions(monthSelect);
  populateYearOptions(yearSelect);

  monthSelect.addEventListener('change', () => {
    const monthIndex = Number.parseInt(monthSelect.value, 10);
    const year = Number.parseInt(yearSelect.value, 10);
    tracker.setMonth(year, monthIndex);
  });

  yearSelect.addEventListener('change', () => {
    const monthIndex = Number.parseInt(monthSelect.value, 10);
    const year = Number.parseInt(yearSelect.value, 10);
    tracker.setMonth(year, monthIndex);
  });

  tracker.subscribe((state) => {
    const { currentDate, summary, monthKey } = state;

    updateSelectors(currentDate);
    updateSummaryCards(summary);
    renderCategoryBreakdown(summary.categoryTotals);
    updateBreakdownLink(monthKey);
  });

  applyInitialMonthFromQuery();

  function populateMonthOptions(select) {
    MONTHS.forEach((month, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = month;
      select.appendChild(option);
    });
  }

  function populateYearOptions(select) {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      select.appendChild(option);
    }
  }

  function updateSelectors(date) {
    const month = date.getMonth();
    const year = date.getFullYear();

    ensureYearOption(year);

    monthSelect.value = month;
    yearSelect.value = year;
  }

  function updateSummaryCards(summary) {
    const { totalSpent, expenseCount, averagePerExpense, topCategory } = summary;

    totalSpentEl.textContent = formatCurrency(totalSpent);
    expenseCountEl.textContent = expenseCount;
    averageExpenseEl.textContent = formatCurrency(averagePerExpense);

    if (topCategory[0]) {
      const label = CATEGORY_LABELS[topCategory[0]] || capitalize(topCategory[0]);
      topCategoryEl.textContent = `${label} (${formatCurrency(topCategory[1])})`;
    } else {
      topCategoryEl.textContent = '—';
    }
  }

  function updateBreakdownLink(monthKey) {
    if (!navBreakdown || !monthKey) return;
    navBreakdown.href = `details.html?month=${monthKey}`;
  }

  function ensureYearOption(year) {
    const exists = Array.from(yearSelect.options).some((option) => Number(option.value) === year);
    if (!exists) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);

      const sorted = Array.from(yearSelect.options)
        .sort((a, b) => Number(a.value) - Number(b.value));
      yearSelect.innerHTML = '';
      sorted.forEach((opt) => yearSelect.appendChild(opt));
    }
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

  function renderCategoryBreakdown(categoryTotals = {}) {
    const entries = Object.entries(categoryTotals)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      categoryList.innerHTML = '<p class="empty-state">No spending recorded this month.</p>';
      return;
    }

    const total = entries.reduce((sum, [, value]) => sum + value, 0);

    categoryList.innerHTML = entries
      .map(([key, value]) => {
        const label = CATEGORY_LABELS[key] || capitalize(key);
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        return `
          <div class="category-row">
            <div class="category-info">
              <span class="category-label">${label}</span>
              <span class="category-percentage">${percentage}%</span>
            </div>
            <span class="category-amount">${formatCurrency(value)}</span>
          </div>
        `;
      })
      .join('');
  }

  function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
});
