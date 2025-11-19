import { useMemo, useState } from 'react';
import { PageLayout } from '../components/PageLayout.jsx';
import { useExpenseTracker } from '../providers/ExpenseTrackerProvider.jsx';
import { useMonthSync } from '../hooks/useMonthSync.js';

const CATEGORY_LABELS = {
  dining: 'Dining',
  shopping: 'Shopping',
  transport: 'Transport',
  housing: 'Housing',
  grocery: 'Grocery',
  entertainment: 'Entertainment',
  bills: 'Bills'
};

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

function DetailPage() {
  const { state, tracker } = useExpenseTracker();
  useMonthSync();
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === 'all') {
      return state.expenses;
    }
    return state.expenses.filter((expense) => {
      const normalized = (expense.category || 'bills').toLowerCase();
      return normalized === categoryFilter.toLowerCase();
    });
  }, [state.expenses, categoryFilter]);

  const categoryTotal = useMemo(() => {
    if (categoryFilter === 'all') {
      return 0;
    }
    return filteredExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  }, [filteredExpenses, categoryFilter]);

  const handleDelete = async (expenseId) => {
    await tracker.deleteExpense(expenseId);
  };

  const handleClearMonth = async () => {
    const monthName = MONTHS[state.currentDate.getMonth()];
    const confirmation = window.confirm(`Clear all expenses for ${monthName} ${state.currentDate.getFullYear()}?`);
    if (confirmation) {
      await tracker.clearCurrentMonth();
    }
  };

  return (
    <PageLayout
      title="Expense Detail"
      subtitle="View, filter, and manage your expenses."
      variant="details"
      monthKey={state.monthKey}
    >
      <section className="expenses-section">
        <div className="section-header">
          <h2>Expenses</h2>
          <div className="expenses-controls">
            <select
              id="categoryFilter"
              className="category-filter"
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button id="clearMonth" className="btn btn-secondary" type="button" onClick={handleClearMonth}>
              Clear Month
            </button>
          </div>
        </div>

        {categoryFilter !== 'all' && (
          <div className="category-total">
            <span className="category-total-label">Total:</span>
            <span className="category-total-amount">{formatCurrency(categoryTotal)}</span>
          </div>
        )}

        <div className="expenses-list">
          {filteredExpenses.length === 0 ? (
            <p className="empty-state">
              {categoryFilter === 'all'
                ? 'No expenses yet. Add your first expense!'
                : `No expenses found for ${CATEGORY_LABELS[categoryFilter] || capitalize(categoryFilter)} category.`}
            </p>
          ) : (
            filteredExpenses.map((expense) => {
              const date = new Date(expense.date);
              const formattedDate = date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const normalizedCategory = (expense.category || 'bills').toLowerCase();
              const label = CATEGORY_LABELS[normalizedCategory] || capitalize(expense.category || 'bills');

              return (
                <div className="expense-item" key={expense.id}>
                  <div className="expense-item-info">
                    <div className="expense-item-description">{expense.description}</div>
                    <div className="expense-item-meta">
                      <span className={`category-badge category-${normalizedCategory}`}>{label}</span>
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                  <div className="expense-item-actions">
                    <span className="expense-item-amount">{formatCurrency(expense.amount)}</span>
                    <button
                      className="expense-item-delete"
                      type="button"
                      aria-label="Delete expense"
                      onClick={() => handleDelete(expense.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })
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

export default DetailPage;

