// Expense Tracker App
class ExpenseTracker {
    constructor() {
        this.currentDate = new Date();
        this.expenses = this.loadExpenses();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.populateMonthYearSelectors();
        this.updateDisplay();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Month navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.updateDisplay();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.updateDisplay();
        });

        // Month/Year selector changes
        document.getElementById('monthSelect').addEventListener('change', (e) => {
            this.currentDate.setMonth(parseInt(e.target.value));
            this.updateDisplay();
        });

        document.getElementById('yearSelect').addEventListener('change', (e) => {
            this.currentDate.setFullYear(parseInt(e.target.value));
            this.updateDisplay();
        });

        // Clear month button
        document.getElementById('clearMonth').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all expenses for this month?')) {
                this.clearCurrentMonth();
            }
        });
    }

    populateMonthYearSelectors() {
        const monthSelect = document.getElementById('monthSelect');
        const yearSelect = document.getElementById('yearSelect');
        
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        // Populate months
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        // Populate years (current year ± 5 years)
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
    }

    getMonthKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    getCurrentMonthKey() {
        return this.getMonthKey(this.currentDate);
    }

    loadExpenses() {
        const stored = localStorage.getItem('expenses');
        return stored ? JSON.parse(stored) : {};
    }

    saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    addExpense() {
        const description = document.getElementById('expenseDescription').value.trim();
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const date = new Date();

        if (!description || isNaN(amount) || amount <= 0) {
            return;
        }

        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            date: date.toISOString()
        };

        const monthKey = this.getMonthKey(date);
        if (!this.expenses[monthKey]) {
            this.expenses[monthKey] = [];
        }

        this.expenses[monthKey].push(expense);
        this.saveExpenses();

        // Clear form
        document.getElementById('expenseForm').reset();

        // Update display
        this.updateDisplay();

        // Show success feedback
        const btn = document.querySelector('.btn-primary');
        const originalText = btn.textContent;
        btn.textContent = '✓ Added!';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1500);
    }

    getCurrentMonthExpenses() {
        const monthKey = this.getCurrentMonthKey();
        return this.expenses[monthKey] || [];
    }

    deleteExpense(expenseId) {
        const monthKey = this.getCurrentMonthKey();
        if (this.expenses[monthKey]) {
            this.expenses[monthKey] = this.expenses[monthKey].filter(
                exp => exp.id !== expenseId
            );
            
            // Clean up empty months
            if (this.expenses[monthKey].length === 0) {
                delete this.expenses[monthKey];
            }
            
            this.saveExpenses();
            this.updateDisplay();
        }
    }

    clearCurrentMonth() {
        const monthKey = this.getCurrentMonthKey();
        if (this.expenses[monthKey]) {
            delete this.expenses[monthKey];
            this.saveExpenses();
            this.updateDisplay();
        }
    }

    calculateTotal(expenses) {
        return expenses.reduce((sum, exp) => sum + exp.amount, 0);
    }

    updateDisplay() {
        // Update month/year selectors
        document.getElementById('monthSelect').value = this.currentDate.getMonth();
        document.getElementById('yearSelect').value = this.currentDate.getFullYear();

        // Get current month expenses
        const currentExpenses = this.getCurrentMonthExpenses();

        // Sort by date (newest first)
        currentExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Update totals
        const total = this.calculateTotal(currentExpenses);
        document.getElementById('totalSpent').textContent = `$${total.toFixed(2)}`;
        document.getElementById('expenseCount').textContent = currentExpenses.length;

        // Display expenses
        this.renderExpenses(currentExpenses);
    }

    renderExpenses(expenses) {
        const expensesList = document.getElementById('expensesList');
        
        if (expenses.length === 0) {
            expensesList.innerHTML = '<p class="empty-state">No expenses yet. Add your first expense above!</p>';
            return;
        }

        expensesList.innerHTML = expenses.map(expense => {
            const date = new Date(expense.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== this.currentDate.getFullYear() ? 'numeric' : undefined
            });

            return `
                <div class="expense-item">
                    <div class="expense-item-info">
                        <div class="expense-item-description">${this.escapeHtml(expense.description)}</div>
                        <div class="expense-item-meta">
                            <span class="expense-item-category category-badge category-${expense.category}">${expense.category}</span>
                            <span>${dateStr}</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center;">
                        <span class="expense-item-amount">$${expense.amount.toFixed(2)}</span>
                        <button class="expense-item-delete" onclick="tracker.deleteExpense(${expense.id})" aria-label="Delete expense">×</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new ExpenseTracker();
});

