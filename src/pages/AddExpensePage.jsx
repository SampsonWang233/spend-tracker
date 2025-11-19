import { useEffect, useMemo, useState } from 'react';
import { PageLayout } from '../components/PageLayout.jsx';
import { useExpenseTracker } from '../providers/ExpenseTrackerProvider.jsx';
import { useMonthSync } from '../hooks/useMonthSync.js';

const CATEGORY_OPTIONS = [
  { value: 'dining', label: 'Dining' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'transport', label: 'Transport' },
  { value: 'housing', label: 'Housing' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'bills', label: 'Bills' }
];

function AddExpensePage() {
  const { state, tracker } = useExpenseTracker();
  useMonthSync();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('dining');
  const [date, setDate] = useState(formatDateInput(state.currentDate));
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDate(formatDateInput(state.currentDate));
  }, [state.currentDate]);

  const { minDate, maxDate } = useMemo(() => getMonthBounds(state.currentDate), [state.currentDate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const success = await tracker.addExpense({
      description,
      amount,
      category,
      date
    });
    setSaving(false);
    if (success) {
      setDescription('');
      setAmount('');
      setCategory('dining');
      setDate(formatDateInput(state.currentDate));
      setFeedback('Added!');
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  return (
    <PageLayout
      title="Add Expense"
      subtitle="Add new expense entries quickly and easily."
      variant="details"
      monthKey={state.monthKey}
    >
      <section className="add-expense-section">
        <div className="section-header">
          <h2>Add Expense</h2>
        </div>
        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="expenseDescription">Description</label>
            <input
              id="expenseDescription"
              type="text"
              placeholder="e.g., Groceries, Coffee..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expenseAmount">Amount</label>
              <input
                id="expenseAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="expenseCategory">Category</label>
              <select
                id="expenseCategory"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                required
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="expenseDate">Date</label>
            <input
              id="expenseDate"
              type="date"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <button type="submit" className={`btn btn-primary${feedback ? ' btn-success' : ''}`} disabled={saving}>
            {feedback || (saving ? 'Adding...' : 'Add Expense')}
          </button>
        </form>
      </section>
    </PageLayout>
  );
}

function formatDateInput(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const today = new Date();
  let day = today.getDate();
  if (today.getFullYear() !== year || today.getMonth() !== date.getMonth()) {
    day = 1;
  }
  const maxDay = new Date(year, date.getMonth() + 1, 0).getDate();
  day = Math.min(day, maxDay);
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function getMonthBounds(date) {
  if (!(date instanceof Date)) {
    return { minDate: '', maxDate: '' };
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(year, date.getMonth() + 1, 0).getDate();
  return {
    minDate: `${year}-${month}-01`,
    maxDate: `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`
  };
}

export default AddExpensePage;

