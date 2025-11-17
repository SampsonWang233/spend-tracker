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
  const navAddExpense = document.getElementById('navAddExpense');
  const navDetail = document.getElementById('navDetail');

  // Chart instances
  let pieChart = null;
  let barChart = null;

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
    updateCharts(summary, state);
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
    if (!monthKey) return;
    if (navAddExpense) {
      navAddExpense.href = `details.html?month=${monthKey}`;
    }
    if (navDetail) {
      navDetail.href = `detail.html?month=${monthKey}`;
    }
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

  function updateCharts(summary, state) {
    updatePieChart(summary.categoryTotals);
    updateBarChart();
  }

  function updatePieChart(categoryTotals) {
    const pieCanvas = document.getElementById('pieChart');
    if (!pieCanvas) return;

    const entries = Object.entries(categoryTotals)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      if (pieChart) {
        pieChart.destroy();
        pieChart = null;
      }
      pieCanvas.parentElement.style.display = 'none';
      return;
    }

    pieCanvas.parentElement.style.display = 'block';

    const labels = entries.map(([key]) => CATEGORY_LABELS[key] || capitalize(key));
    const data = entries.map(([, value]) => value);
    const colors = getCategoryColors(entries.map(([key]) => key));

    if (pieChart) {
      pieChart.data.labels = labels;
      pieChart.data.datasets[0].data = data;
      pieChart.data.datasets[0].backgroundColor = colors;
      pieChart.update();
    } else {
      pieChart = new Chart(pieCanvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: {
                  size: 12
                },
                usePointStyle: true
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
  }

  function updateBarChart() {
    const barCanvas = document.getElementById('barChart');
    if (!barCanvas) return;

    const monthlyTotals = tracker.getMonthlyTotals(12).reverse(); // Show oldest to newest

    if (monthlyTotals.length === 0) {
      if (barChart) {
        barChart.destroy();
        barChart = null;
      }
      barCanvas.parentElement.style.display = 'none';
      return;
    }

    barCanvas.parentElement.style.display = 'block';

    const labels = monthlyTotals.map(m => m.label);
    const data = monthlyTotals.map(m => m.total);

    if (barChart) {
      barChart.data.labels = labels;
      barChart.data.datasets[0].data = data;
      barChart.update();
    } else {
      barChart = new Chart(barCanvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Total Spent',
            data: data,
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Total: ${formatCurrency(context.parsed.y)}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toFixed(0);
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  function getCategoryColors(categories) {
    const colorMap = {
      dining: 'rgba(254, 243, 199, 0.8)',
      shopping: 'rgba(252, 231, 243, 0.8)',
      transport: 'rgba(219, 234, 254, 0.8)',
      housing: 'rgba(253, 230, 138, 0.8)',
      grocery: 'rgba(199, 240, 216, 0.8)',
      entertainment: 'rgba(233, 213, 255, 0.8)',
      bills: 'rgba(220, 252, 231, 0.8)'
    };

    return categories.map(cat => colorMap[cat] || 'rgba(226, 232, 240, 0.8)');
  }
});
