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

document.addEventListener('DOMContentLoaded', () => {
  const tracker = new window.ExpenseTracker();

  const expenseForm = document.getElementById('expenseForm');
  const descriptionInput = document.getElementById('expenseDescription');
  const amountInput = document.getElementById('expenseAmount');
  const categorySelect = document.getElementById('expenseCategory');
  const dateInput = document.getElementById('expenseDate');
  const navSummary = document.getElementById('navSummary');
  const navDetail = document.getElementById('navDetail');

  expenseForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const description = descriptionInput.value;
    const amount = amountInput.value;
    const category = categorySelect.value;
    const dateValue = dateInput.value;

    const selectedDate = dateValue ? new Date(dateValue) : tracker.getState().currentDate;

    const success = await tracker.addExpense({
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


  tracker.subscribe((state) => {
    const { currentDate, monthKey } = state;

    refreshDateInput();
    updateNavLinks(monthKey);
    updatePageTitle(currentDate);
  });

  applyInitialMonthFromQuery();


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

  function updateNavLinks(monthKey) {
    if (!monthKey) return;

    if (navSummary) {
      navSummary.href = `index.html?month=${monthKey}`;
    }

    if (navDetail) {
      navDetail.href = `detail.html?month=${monthKey}`;
    }
  }

  function updatePageTitle(date) {
    if (!(date instanceof Date)) return;
    const monthName = MONTHS[date.getMonth()];
    document.title = `My Spend Tracker · Add Expense · ${monthName} ${date.getFullYear()}`;
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
