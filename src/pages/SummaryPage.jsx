import { useEffect, useMemo, useRef } from 'react';
import Chart from 'chart.js/auto';
import { PageLayout } from '../components/PageLayout.jsx';
import { useExpenseTracker } from '../providers/ExpenseTrackerProvider.jsx';
import { useMonthSync } from '../hooks/useMonthSync.js';

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
  'December'
];

const CATEGORY_LABELS = {
  dining: 'Dining',
  shopping: 'Shopping',
  transport: 'Transport',
  housing: 'Housing',
  grocery: 'Grocery',
  entertainment: 'Entertainment',
  bills: 'Bills'
};

const CATEGORY_COLORS = {
  dining: 'rgba(254, 243, 199, 0.8)',
  shopping: 'rgba(252, 231, 243, 0.8)',
  transport: 'rgba(219, 234, 254, 0.8)',
  housing: 'rgba(253, 230, 138, 0.8)',
  grocery: 'rgba(199, 240, 216, 0.8)',
  entertainment: 'rgba(233, 213, 255, 0.8)',
  bills: 'rgba(220, 252, 231, 0.8)'
};

function SummaryPage() {
  const { state, tracker } = useExpenseTracker();
  useMonthSync();

  const selectedMonth = state.currentDate.getMonth();
  const selectedYear = state.currentDate.getFullYear();

  const categoryEntries = useMemo(() => {
    return Object.entries(state.summary.categoryTotals || {})
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [state.summary.categoryTotals]);

  const categoryTotal = useMemo(() => {
    return categoryEntries.reduce((sum, [, value]) => sum + value, 0);
  }, [categoryEntries]);

  const monthlyTotals = useMemo(() => {
    const totals = tracker.getMonthlyTotals(12);
    return totals.slice().reverse();
  }, [tracker, state.monthKey, state.summary]);

  const pieCanvasRef = useRef(null);
  const pieChartRef = useRef(null);
  const barCanvasRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pieChartRef.current) {
        pieChartRef.current.destroy();
      }
      if (barChartRef.current) {
        barChartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (categoryEntries.length === 0) {
      if (pieChartRef.current) {
        pieChartRef.current.destroy();
        pieChartRef.current = null;
      }
      return;
    }

    let frameId = requestAnimationFrame(() => {
      const canvas = pieCanvasRef.current;
      if (!canvas || !canvas.ownerDocument) {
        return;
      }

      const labels = categoryEntries.map(([key]) => CATEGORY_LABELS[key] || capitalize(key));
      const data = categoryEntries.map(([, value]) => value);
      const colors = categoryEntries.map(([key]) => CATEGORY_COLORS[key] || 'rgba(226, 232, 240, 0.8)');

      try {
        if (pieChartRef.current) {
          pieChartRef.current.data.labels = labels;
          pieChartRef.current.data.datasets[0].data = data;
          pieChartRef.current.data.datasets[0].backgroundColor = colors;
          pieChartRef.current.update();
        } else {
          pieChartRef.current = new Chart(canvas, {
            type: 'pie',
            data: {
              labels,
              datasets: [
                {
                  data,
                  backgroundColor: colors,
                  borderWidth: 2,
                  borderColor: '#ffffff'
                }
              ]
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
                    label(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                    }
                  }
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Unable to render pie chart', error);
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [categoryEntries]);

  useEffect(() => {
    if (monthlyTotals.length === 0) {
      if (barChartRef.current) {
        barChartRef.current.destroy();
        barChartRef.current = null;
      }
      return;
    }

    let frameId = requestAnimationFrame(() => {
      const canvas = barCanvasRef.current;
      if (!canvas || !canvas.ownerDocument) {
        return;
      }

      const labels = monthlyTotals.map((month) => month.label);
      const data = monthlyTotals.map((month) => month.total);

      try {
        if (barChartRef.current) {
          barChartRef.current.data.labels = labels;
          barChartRef.current.data.datasets[0].data = data;
          barChartRef.current.update();
        } else {
          barChartRef.current = new Chart(canvas, {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Total Spent',
                  data,
                  backgroundColor: 'rgba(99, 102, 241, 0.8)',
                  borderColor: 'rgba(99, 102, 241, 1)',
                  borderWidth: 2,
                  borderRadius: 6
                }
              ]
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
                    label(context) {
                      return `Total: ${formatCurrency(context.parsed.y)}`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    callback(value) {
                      return `$${value.toFixed(0)}`;
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
      } catch (error) {
        console.error('Unable to render bar chart', error);
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [monthlyTotals]);

  const handleMonthChange = (event) => {
    const monthIndex = Number.parseInt(event.target.value, 10);
    tracker.setMonth(selectedYear, monthIndex);
  };

  const handleYearChange = (event) => {
    const year = Number.parseInt(event.target.value, 10);
    tracker.setMonth(year, selectedMonth);
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
      options.push(year);
    }
    return options;
  }, []);

  return (
    <PageLayout
      title="💰 My Spend Tracker"
      subtitle="Quick overview of your monthly spending at a glance."
      variant="summary"
      monthKey={state.monthKey}
    >
      <section className="month-selector-card">
        <div className="section-header">
          <h2>Current Month</h2>
          <div className="month-selector">
            <select
              id="monthSelect"
              className="month-select"
              aria-label="Select month"
              value={selectedMonth}
              onChange={handleMonthChange}
            >
              {MONTHS.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <select
              id="yearSelect"
              className="year-select"
              aria-label="Select year"
              value={selectedYear}
              onChange={handleYearChange}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="label">Total Spent</span>
            <span className="value">{formatCurrency(state.summary.totalSpent)}</span>
          </div>
          <div className="summary-card">
            <span className="label">Expenses</span>
            <span className="value">{state.summary.expenseCount}</span>
          </div>
          <div className="summary-card">
            <span className="label">Average per Expense</span>
            <span className="value">{formatCurrency(state.summary.averagePerExpense)}</span>
          </div>
          <div className="summary-card">
            <span className="label">Top Category</span>
            <span className="value">
              {state.summary.topCategory[0]
                ? `${CATEGORY_LABELS[state.summary.topCategory[0]] || capitalize(state.summary.topCategory[0])} (${formatCurrency(state.summary.topCategory[1])})`
                : '—'}
            </span>
          </div>
        </div>
      </section>

      <section className="category-section">
        <div className="section-header">
          <h2>Category Breakdown</h2>
        </div>
        <div className="category-list">
          {categoryEntries.length === 0 ? (
            <p className="empty-state">No spending recorded this month.</p>
          ) : (
            categoryEntries.map(([key, value]) => {
              const label = CATEGORY_LABELS[key] || capitalize(key);
              const percentage = categoryTotal > 0 ? Math.round((value / categoryTotal) * 100) : 0;
              return (
                <div className="category-row" key={key}>
                  <div className="category-info">
                    <span className="category-label">{label}</span>
                    <span className="category-percentage">{percentage}%</span>
                  </div>
                  <span className="category-amount">{formatCurrency(value)}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="charts-section">
        <div className="chart-container">
          <div className="section-header">
            <h2>Category Distribution</h2>
          </div>
          {categoryEntries.length === 0 ? (
            <p className="empty-state">Add expenses to see this chart.</p>
          ) : (
            <canvas ref={pieCanvasRef} />
          )}
        </div>
        <div className="chart-container">
          <div className="section-header">
            <h2>Monthly Comparison</h2>
          </div>
          {monthlyTotals.length === 0 ? (
            <p className="empty-state">Add expenses to see this chart.</p>
          ) : (
            <canvas ref={barCanvasRef} />
          )}
        </div>
      </section>
    </PageLayout>
  );
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default SummaryPage;

