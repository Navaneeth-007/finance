// Import Firebase modules
import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { generateHomeAISuggestions } from '../shared/ai-insights.js';

// --- Utility for totals ---
async function fetchTotal(type, uid, month, year) {
    const url = type === 'income'
        ? `http://127.0.0.1:5000/api/incomes/${uid}?month=${month}&year=${year}`
        : `http://127.0.0.1:5000/api/expenses/${uid}?month=${month}&year=${year}`;
    const res = await fetch(url);
    const data = res.ok ? await res.json() : [];
    return data.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

// --- Stats update ---
async function updateStats(uid) {
    const statCards = document.querySelectorAll('.stat-card');
    let totalBalanceElem = null, statChangeElem = null;
    let totalIncomeElem = null, totalExpenseElem = null;
    statCards.forEach(card => {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent.includes('Total Balance')) {
            totalBalanceElem = card.querySelector('.stat-value');
            statChangeElem = card.querySelector('.stat-change');
        } else if (h3 && h3.textContent.includes('Total Income')) {
            totalIncomeElem = card.querySelector('.stat-value');
        } else if (h3 && h3.textContent.includes('Total Expenses')) {
            totalExpenseElem = card.querySelector('.stat-value');
        }
    });
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    // Current month totals
    const [income, expense] = await Promise.all([
        fetchTotal('income', uid, month, year),
        fetchTotal('expense', uid, month, year)
    ]);
    const currentBalance = income - expense;
    // Previous month totals
    const [prevIncome, prevExpense] = await Promise.all([
        fetchTotal('income', uid, prevMonth, prevYear),
        fetchTotal('expense', uid, prevMonth, prevYear)
    ]);
    const prevBalance = prevIncome - prevExpense;
    // Percent change
    let percentChange = 0;
    if (prevBalance !== 0) {
        percentChange = ((currentBalance - prevBalance) / Math.abs(prevBalance)) * 100;
    }
    // Update UI
    if (totalBalanceElem) totalBalanceElem.textContent = `₹${currentBalance.toLocaleString('en-IN')}`;
    if (statChangeElem) {
        if (percentChange >= 0) {
            statChangeElem.innerHTML = `<i class=\"fas fa-arrow-up\"></i> ${percentChange.toFixed(1)}% from last month`;
            statChangeElem.className = 'stat-change positive';
        } else {
            statChangeElem.innerHTML = `<i class=\"fas fa-arrow-down\"></i> ${Math.abs(percentChange).toFixed(1)}% from last month`;
            statChangeElem.className = 'stat-change negative';
        }
    }
    if (totalIncomeElem) totalIncomeElem.textContent = `₹${income.toLocaleString('en-IN')}`;
    if (totalExpenseElem) totalExpenseElem.textContent = `₹${expense.toLocaleString('en-IN')}`;
}

// --- Chart.js: Overview (Income vs Expense Trend) ---
let overviewChart = null;
async function renderOverviewChart(uid) {
    const ctx = document.getElementById('overview-chart');
    if (!ctx) return;
    const now = new Date();
    const months = [];
    const monthLabels = [];
    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() });
        monthLabels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }
    // Fetch all incomes/expenses for user
    const allIncomeRes = await fetch(`http://127.0.0.1:5000/api/incomes/${uid}`);
    const allExpenseRes = await fetch(`http://127.0.0.1:5000/api/expenses/${uid}`);
    const allIncomes = allIncomeRes.ok ? await allIncomeRes.json() : [];
    const allExpenses = allExpenseRes.ok ? await allExpenseRes.json() : [];
    // Aggregate by month
    function sumByMonth(arr) {
        const map = {};
        arr.forEach(item => {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!map[key]) map[key] = 0;
            map[key] += Number(item.amount) || 0;
        });
        return map;
    }
    const incomeMap = sumByMonth(allIncomes);
    const expenseMap = sumByMonth(allExpenses);
    const incomeData = months.map(({ year, month }) => incomeMap[`${year}-${month}`] || 0);
    const expenseData = months.map(({ year, month }) => expenseMap[`${year}-${month}`] || 0);
    if (overviewChart) overviewChart.destroy();
    overviewChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 7
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    borderColor: '#f43f5e',
                    backgroundColor: 'rgba(244,63,94,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 5,
                    pointBackgroundColor: '#f43f5e',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: { enabled: true }
            },
            scales: {
                x: { title: { display: true, text: 'Month' } },
                y: { title: { display: true, text: 'Amount (₹)' }, beginAtZero: true }
            }
        }
    });
}

// --- Chart.js: Monthly Breakdown (Current Month Expense Categories) ---
let breakdownChart = null;
async function renderMonthlyBreakdownChart(uid) {
    const ctx = document.getElementById('monthly-breakdown-chart');
    if (!ctx) return;
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const res = await fetch(`http://127.0.0.1:5000/api/expenses/${uid}?month=${month}&year=${year}`);
    const expenses = res.ok ? await res.json() : [];
    // Aggregate by category
    const categoryTotals = {};
    expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
        categoryTotals[exp.category] += Number(exp.amount) || 0;
    });
    const categories = Object.keys(categoryTotals);
    const totals = Object.values(categoryTotals);
    const colors = [
        '#6366F1', '#06B6D4', '#F59E42', '#F43F5E', '#64748b', '#A855F7', '#22C55E', '#FBBF24', '#E11D48', '#0EA5E9'
    ];
    if (breakdownChart) breakdownChart.destroy();
    breakdownChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categories,
            datasets: [{
                data: totals,
                backgroundColor: colors.slice(0, categories.length),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true, position: 'bottom' },
                tooltip: { enabled: true }
            }
        }
    });
}

// --- DOMContentLoaded: Set up everything ---
document.addEventListener('DOMContentLoaded', () => {
    // Set current month and year
    const currentMonthElement = document.getElementById('current-month');
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();
    if (currentMonthElement) {
        currentMonthElement.textContent = `${currentMonth} ${currentYear}`;
    }
    // Set username and update stats/charts
    const userNameElement = document.getElementById('user');
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const displayName = user.displayName || user.email.split('@')[0];
            if (userNameElement) userNameElement.textContent = displayName;
            updateStats(user.uid);
            renderOverviewChart(user.uid);
            renderMonthlyBreakdownChart(user.uid);
            renderHomeAISuggestions(user.uid);
        } else {
            if (userNameElement) userNameElement.textContent = 'User';
            window.location.href = '/login/login.html';
        }
    });
});

// Remove static AI suggestions code and replace with dynamic
async function renderHomeAISuggestions(currentUid) {
    if (!currentUid) return;
    // Get current month
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    // Fetch expenses
    const resExp = await fetch(`http://127.0.0.1:5000/api/expenses/${currentUid}?month=${month}&year=${year}`);
    const expenses = resExp.ok ? await resExp.json() : [];
    // Fetch incomes
    const resInc = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}?month=${month}&year=${year}`);
    const incomes = resInc.ok ? await resInc.json() : [];
    // Fetch budget
    let budget = 0;
    const resBudget = await fetch(`http://127.0.0.1:5000/api/budget/${currentUid}`);
    if (resBudget.ok) {
        const data = await resBudget.json();
        budget = data.amount;
    }
    // Generate suggestions
    const suggestions = generateHomeAISuggestions(expenses, incomes, budget);
    // Render
    const content = document.querySelector('.ai-content');
    if (content) {
        content.innerHTML = '';
        suggestions.forEach(s => {
            const div = document.createElement('div');
            div.className = 'suggestion-card';
            div.innerHTML = `
                <div class="suggestion-icon">
                    <i class="fas ${s.icon}"></i>
                </div>
                <div class="suggestion-text">
                    <h4>${s.title}</h4>
                    <p>${s.text}</p>
                </div>
            `;
            content.appendChild(div);
        });
    }
}