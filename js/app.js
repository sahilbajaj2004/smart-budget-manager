/* ================================
   SMART BUDGET MANAGER - APP LOGIC
   ================================ */

// ========== STATE MANAGEMENT ==========
class BudgetManager {
    constructor() {
        this.transactions = this.loadFromStorage('transactions') || [];
        this.goal = this.loadFromStorage('goal') || { amount: 0, deadline: null };
        this.theme = this.loadFromStorage('theme') || 'light';
        this.categoryChartInstance = null;
        this.incomeExpenseChartInstance = null;

        this.init();
    }

    // Initialize app
    init() {
        this.applyTheme();
        this.attachEventListeners();
        this.setDefaultDate();
        this.updateDashboard();
        this.renderRecentTransactions();
        this.generateInsights();
    }

    // ========== STORAGE ==========
    saveToStorage(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadFromStorage(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // ========== EVENT LISTENERS ==========
    attachEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Mobile toggle
        document.getElementById('mobileToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('mobile-open');
        });

        // Transaction form
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Export modal
        document.getElementById('exportBtn').addEventListener('click', () => {
            document.getElementById('exportModal').classList.add('active');
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('exportModal').classList.remove('active');
        });

        document.getElementById('exportCSV').addEventListener('click', () => this.exportCSV());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportPDF());

        // Filters
        document.getElementById('searchInput').addEventListener('input', () => this.filterTransactions());
        document.getElementById('filterType').addEventListener('change', () => this.filterTransactions());
        document.getElementById('filterCategory').addEventListener('change', () => this.filterTransactions());
        document.getElementById('clearFilters').addEventListener('click', () => this.clearFilters());

        // Goal form
        document.getElementById('goalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.setGoal();
        });

        // View all link
        document.querySelector('.view-all').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchSection('transactions');
        });
    }

    // ========== THEME ==========
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveToStorage('theme', this.theme);
    }

    applyTheme() {
        if (this.theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.querySelector('.theme-icon').textContent = '☀️';
        } else {
            document.body.classList.remove('dark-theme');
            document.querySelector('.theme-icon').textContent = '🌙';
        }
    }

    // ========== NAVIGATION ==========
    handleNavigation(e) {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        this.switchSection(section);
    }

    switchSection(sectionName) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });

        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.add('active');

        // Update header
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your finances' },
            transactions: { title: 'Transactions', subtitle: 'All your income and expenses' },
            analytics: { title: 'Analytics', subtitle: 'Visual insights and trends' },
            goals: { title: 'Goals', subtitle: 'Track your savings progress' }
        };

        document.getElementById('sectionTitle').textContent = titles[sectionName].title;
        document.getElementById('sectionSubtitle').textContent = titles[sectionName].subtitle;

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('mobile-open');

        // Render section-specific content
        if (sectionName === 'transactions') {
            this.renderAllTransactions();
        } else if (sectionName === 'analytics') {
            this.renderCharts();
            this.renderAnalysis();
        } else if (sectionName === 'goals') {
            this.renderGoalDetails();
        }
    }

    // ========== TRANSACTIONS ==========
    addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !date) {
            alert('Please fill all fields');
            return;
        }

        const transaction = {
            id: Date.now(),
            description,
            amount,
            type,
            category,
            date,
            timestamp: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveToStorage('transactions', this.transactions);

        // Reset form
        document.getElementById('transactionForm').reset();
        this.setDefaultDate();

        // Update UI
        this.updateDashboard();
        this.renderRecentTransactions();
        this.generateInsights();

        // Show success message
        this.showNotification(`Transaction added: ${description}`);
    }

    deleteTransaction(id) {
        if (!confirm('Delete this transaction?')) return;

        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToStorage('transactions', this.transactions);

        // Update UI
        this.updateDashboard();
        this.renderRecentTransactions();
        this.renderAllTransactions();
        this.generateInsights();

        this.showNotification('Transaction deleted');
    }

    // ========== RENDER TRANSACTIONS ==========
    renderRecentTransactions(limit = 5) {
        const container = document.getElementById('recentTransactionsList');
        const recent = this.transactions.slice(0, limit);

        if (recent.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No transactions yet. Add your first one!</p>';
            return;
        }

        container.innerHTML = recent.map(t => this.createTransactionHTML(t)).join('');

        // Attach delete handlers
        container.querySelectorAll('.transaction-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteTransaction(id);
            });
        });
    }

    renderAllTransactions() {
        const container = document.getElementById('allTransactionsList');

        if (this.transactions.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No transactions found.</p>';
            return;
        }

        container.innerHTML = this.transactions.map(t => this.createTransactionHTML(t)).join('');

        // Attach delete handlers
        container.querySelectorAll('.transaction-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteTransaction(id);
            });
        });
    }

    createTransactionHTML(transaction) {
        const categoryIcons = {
            food: '🍔', transport: '🚗', shopping: '🛍️', bills: '💡',
            entertainment: '🎬', health: '⚕️', education: '📚', salary: '💼', other: '📦'
        };

        const icon = categoryIcons[transaction.category] || '📦';
        const sign = transaction.type === 'income' ? '+' : '-';
        const formattedDate = new Date(transaction.date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        return `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-left">
                    <div class="transaction-icon">${icon}</div>
                    <div class="transaction-details">
                        <h4>${transaction.description}</h4>
                        <p class="transaction-meta">${formattedDate} • ${transaction.category}</p>
                    </div>
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${transaction.type}">
                        ${sign}₹${transaction.amount.toLocaleString('en-IN')}
                    </div>
                    <button class="transaction-delete" data-id="${transaction.id}">🗑️ Delete</button>
                </div>
            </div>
        `;
    }

    // ========== FILTERS ==========
    filterTransactions() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const typeFilter = document.getElementById('filterType').value;
        const categoryFilter = document.getElementById('filterCategory').value;

        let filtered = this.transactions;

        // Apply search
        if (search) {
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(search) ||
                t.category.toLowerCase().includes(search)
            );
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }

        // Apply category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }

        // Render filtered results
        const container = document.getElementById('allTransactionsList');

        if (filtered.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No matching transactions found.</p>';
            return;
        }

        container.innerHTML = filtered.map(t => this.createTransactionHTML(t)).join('');

        // Attach delete handlers
        container.querySelectorAll('.transaction-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                this.deleteTransaction(id);
            });
        });
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterType').value = 'all';
        document.getElementById('filterCategory').value = 'all';
        this.renderAllTransactions();
    }

    // ========== DASHBOARD UPDATES ==========
    updateDashboard() {
        const totals = this.calculateTotals();

        document.getElementById('totalIncome').textContent = `₹${totals.income.toLocaleString('en-IN')}`;
        document.getElementById('totalExpense').textContent = `₹${totals.expense.toLocaleString('en-IN')}`;
        document.getElementById('balance').textContent = `₹${totals.balance.toLocaleString('en-IN')}`;

        // Update goal progress
        this.updateGoalProgress(totals.balance);
    }

    calculateTotals() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            income,
            expense,
            balance: income - expense
        };
    }

    // ========== GOALS ==========
    setGoal() {
        const amount = parseFloat(document.getElementById('goalAmount').value);
        const deadline = document.getElementById('goalDeadline').value;

        if (!amount || amount <= 0) {
            alert('Please enter a valid goal amount');
            return;
        }

        this.goal = { amount, deadline };
        this.saveToStorage('goal', this.goal);

        const totals = this.calculateTotals();
        this.updateGoalProgress(totals.balance);
        this.renderGoalDetails();

        this.showNotification('Goal saved successfully!');
    }

    updateGoalProgress(currentBalance) {
        if (this.goal.amount === 0) {
            document.getElementById('goalProgress').textContent = 'No goal set';
            document.getElementById('goalProgressBar').style.width = '0%';
            return;
        }

        const percentage = Math.min((currentBalance / this.goal.amount) * 100, 100);
        document.getElementById('goalProgress').textContent = `${percentage.toFixed(1)}%`;
        document.getElementById('goalProgressBar').style.width = `${percentage}%`;
    }

    renderGoalDetails() {
        const container = document.getElementById('goalDetails');
        const totals = this.calculateTotals();

        if (this.goal.amount === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No goal set yet. Set one to start tracking!</p>';
            return;
        }

        const percentage = Math.min((totals.balance / this.goal.amount) * 100, 100);
        const remaining = Math.max(this.goal.amount - totals.balance, 0);
        const deadlineText = this.goal.deadline
            ? new Date(this.goal.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'No deadline set';

        container.innerHTML = `
            <div class="summary-card">
                <div class="card-content">
                    <p class="card-label">Target Amount</p>
                    <h3 class="card-value">₹${this.goal.amount.toLocaleString('en-IN')}</h3>
                </div>
            </div>
            <div class="summary-card">
                <div class="card-content">
                    <p class="card-label">Current Savings</p>
                    <h3 class="card-value">₹${totals.balance.toLocaleString('en-IN')}</h3>
                </div>
            </div>
            <div class="summary-card">
                <div class="card-content">
                    <p class="card-label">Remaining</p>
                    <h3 class="card-value">₹${remaining.toLocaleString('en-IN')}</h3>
                </div>
            </div>
            <div class="summary-card">
                <div class="card-content">
                    <p class="card-label">Progress</p>
                    <h3 class="card-value">${percentage.toFixed(1)}%</h3>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="card-content">
                    <p class="card-label">Target Date</p>
                    <h3 class="card-value" style="font-size: 1.25rem;">${deadlineText}</h3>
                </div>
            </div>
        `;
    }

    // ========== INSIGHTS ==========
    generateInsights() {
        const container = document.getElementById('insightsContainer');
        const insights = [];
        const totals = this.calculateTotals();

        if (this.transactions.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Add transactions to see smart insights!</p>';
            return;
        }

        // Calculate category percentages
        const categoryTotals = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });

        // Overspending warnings
        Object.entries(categoryTotals).forEach(([category, amount]) => {
            const percentage = (amount / totals.expense) * 100;
            if (percentage > 40) {
                insights.push({
                    type: 'warning',
                    message: `⚠️ You're spending ${percentage.toFixed(1)}% of your expenses on ${category}. Consider reducing it.`
                });
            }
        });

        // Positive feedback
        if (totals.balance > 0 && totals.income > 0) {
            const savingsRate = (totals.balance / totals.income) * 100;
            if (savingsRate > 20) {
                insights.push({
                    type: 'success',
                    message: `✅ Great job! You're saving ${savingsRate.toFixed(1)}% of your income.`
                });
            }
        }

        // Expense > Income warning
        if (totals.expense > totals.income) {
            insights.push({
                type: 'danger',
                message: `🚨 Alert: Your expenses (₹${totals.expense.toLocaleString('en-IN')}) exceed your income (₹${totals.income.toLocaleString('en-IN')})`
            });
        }

        // No expenses logged
        if (totals.expense === 0 && totals.income > 0) {
            insights.push({
                type: 'success',
                message: `🎉 Amazing! You haven't spent anything yet. Your balance is ₹${totals.balance.toLocaleString('en-IN')}.`
            });
        }

        // Default message
        if (insights.length === 0) {
            insights.push({
                type: 'info',
                message: `💡 Keep tracking your expenses regularly to get personalized insights.`
            });
        }

        container.innerHTML = insights
            .map(i => `<div class="insight-item ${i.type}">${i.message}</div>`)
            .join('');
    }

    // ========== CHARTS ==========
    renderCharts() {
        this.renderCategoryChart();
        this.renderIncomeExpenseChart();
    }

    renderCategoryChart() {
        const ctx = document.getElementById('categoryChart').getContext('2d');

        // Calculate category totals
        const categoryTotals = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        // Destroy previous chart
        if (this.categoryChartInstance) {
            this.categoryChartInstance.destroy();
        }

        this.categoryChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }

    renderIncomeExpenseChart() {
        const ctx = document.getElementById('incomeExpenseChart').getContext('2d');

        const totals = this.calculateTotals();

        // Destroy previous chart
        if (this.incomeExpenseChartInstance) {
            this.incomeExpenseChartInstance.destroy();
        }

        this.incomeExpenseChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expense', 'Balance'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [totals.income, totals.expense, totals.balance],
                    backgroundColor: ['#26a69a', '#ef5350', '#42a5f5']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderAnalysis() {
        const container = document.getElementById('analysisDetails');
        const totals = this.calculateTotals();

        // Calculate category breakdown
        const categoryTotals = {};
        this.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            });

        const sorted = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([category, amount]) => {
                const percentage = (amount / totals.expense) * 100;
                return `
                    <div class="transaction-item">
                        <div class="transaction-left">
                            <div class="transaction-details">
                                <h4>${category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                                <p class="transaction-meta">${percentage.toFixed(1)}% of total expenses</p>
                            </div>
                        </div>
                        <div class="transaction-right">
                            <div class="transaction-amount expense">₹${amount.toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                `;
            })
            .join('');

        container.innerHTML = sorted || '<p style="color: var(--text-secondary); padding: 1rem;">No expense data available.</p>';
    }

    // ========== EXPORT ==========
    exportCSV() {
        if (this.transactions.length === 0) {
            alert('No transactions to export');
            return;
        }

        const headers = ['Date', 'Description', 'Type', 'Category', 'Amount'];
        const rows = this.transactions.map(t => [
            t.date,
            t.description,
            t.type,
            t.category,
            t.amount
        ]);

        let csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `budget-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        this.showNotification('CSV exported successfully!');
        document.getElementById('exportModal').classList.remove('active');
    }

    exportPDF() {
        if (typeof jspdf === 'undefined') {
            alert('PDF export not available');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();

        const totals = this.calculateTotals();

        doc.setFontSize(20);
        doc.text('Smart Budget Manager', 20, 20);

        doc.setFontSize(12);
        doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 30);

        doc.setFontSize(14);
        doc.text('Summary', 20, 45);
        doc.setFontSize(11);
        doc.text(`Total Income: ₹${totals.income.toLocaleString('en-IN')}`, 20, 55);
        doc.text(`Total Expense: ₹${totals.expense.toLocaleString('en-IN')}`, 20, 62);
        doc.text(`Balance: ₹${totals.balance.toLocaleString('en-IN')}`, 20, 69);

        doc.setFontSize(14);
        doc.text('Recent Transactions', 20, 85);

        let yPos = 95;
        this.transactions.slice(0, 15).forEach((t, i) => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(10);
            doc.text(`${t.date} - ${t.description} (${t.category})`, 20, yPos);
            doc.text(`${t.type === 'income' ? '+' : '-'}₹${t.amount}`, 150, yPos);
            yPos += 7;
        });

        doc.save(`budget-report-${new Date().toISOString().split('T')[0]}.pdf`);

        this.showNotification('PDF exported successfully!');
        document.getElementById('exportModal').classList.remove('active');
    }

    // ========== UTILITIES ==========
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;

        if (document.getElementById('goalDeadline')) {
            document.getElementById('goalDeadline').value = this.goal.deadline || '';
        }
        if (document.getElementById('goalAmount')) {
            document.getElementById('goalAmount').value = this.goal.amount || '';
        }
    }

    showNotification(message) {
        // Simple notification (can be enhanced with a toast library)
        console.log('Notification:', message);
    }
}

// ========== INITIALIZE APP ==========
document.addEventListener('DOMContentLoaded', () => {
    window.budgetApp = new BudgetManager();
});
