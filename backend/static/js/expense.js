import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { generateExpenseAISuggestions } from '../shared/ai-insights.js';

// DOM Elements
const manualExpenseModal = document.getElementById('manual-expense-modal');
const addExpenseBtn = document.getElementById('add-expense-btn');
const closeModalButtons = document.querySelectorAll('.close-modal');
const uploadArea = document.getElementById('upload-area');
const expenseTableBody = document.getElementById('expense-table-body');
const monthSelect = document.getElementById('month-select');
const categoryBreakdownModal = document.getElementById('category-breakdown-modal');
const viewCategoryDetailsBtn = document.getElementById('view-category-details');
const expenseForm = document.getElementById('manual-expense-form');

// Budget modal logic
const editBudgetBtn = document.getElementById('edit-budget-btn');
const editBudgetModal = document.getElementById('edit-budget-modal');
const closeBudgetModalBtn = editBudgetModal ? editBudgetModal.querySelector('.close-modal') : null;
const cancelBudgetBtn = document.getElementById('cancel-budget-btn');
const editBudgetForm = document.getElementById('edit-budget-form');
const budgetInput = document.getElementById('budget-input');
const monthlyBudgetValue = document.getElementById('monthly-budget-value');

let currentUid = null;
let currentMonthExpenses = [];
let currentBudget = 20000;
let expenseTrendChart = null;
let categoryBreakdownChart = null;

function getSelectedMonth() {
    return monthSelect ? parseInt(monthSelect.value) : new Date().getMonth();
}

function getSelectedYear() {
    const yearSelect = document.getElementById('year-select');
    return yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load navigation bar
    fetch('/components/navbar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('navbar-container').innerHTML = html;
            // Load navbar.js after the HTML is loaded
            const script = document.createElement('script');
            script.type = 'module';
            script.src = '/components/navbar.js';
            script.onload = () => {
                if (window.updateNotifications) window.updateNotifications();
            };
            document.body.appendChild(script);
        })
        .catch(error => console.error('Error loading navigation bar:', error));

    // Add event listener for Add Expense button
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', () => {
            console.log('Add Expense button clicked');
            openModal(manualExpenseModal);
        });
    }
    
    // Add event listeners for close buttons
    if (closeModalButtons) {
        closeModalButtons.forEach(button => {
            button.addEventListener('click', () => {
                closeModal(manualExpenseModal);
            });
        });
    }

    // Fetch and display expenses
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUid = user.uid;
            fetchAndDisplayExpenses();
            fetchAndRenderExpenseTrend();
            renderExpenseAISuggestions();
        } else {
            // Optionally redirect to login
            currentUid = null;
        }
    });

    // Category Breakdown Modal logic
    if (viewCategoryDetailsBtn && categoryBreakdownModal) {
        viewCategoryDetailsBtn.addEventListener('click', () => {
            // Calculate total spend per category for current month
            const categoryTotals = {};
            let total = 0;
            currentMonthExpenses.forEach(exp => {
                if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
                categoryTotals[exp.category] += Number(exp.amount);
                total += Number(exp.amount);
            });
            // Build the list
            const list = categoryBreakdownModal.querySelector('.category-breakdown-list');
            if (list) {
                list.innerHTML = '';
                Object.entries(categoryTotals).forEach(([cat, amt]) => {
                    const li = document.createElement('li');
                    li.innerHTML = `<span class="cat-label">${cat}</span> <span class="cat-amount">₹${amt.toLocaleString('en-IN')}</span>`;
                    list.appendChild(li);
                });
            }
            // Update total
            const summary = categoryBreakdownModal.querySelector('.category-breakdown-summary span');
            if (summary) summary.textContent = `₹${total.toLocaleString('en-IN')}`;
            openModal(categoryBreakdownModal);
        });
    }
    // Add close logic for the new modal
    if (categoryBreakdownModal) {
        const closeBtn = categoryBreakdownModal.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(categoryBreakdownModal));
        }
    }

    // Month/year change
    const yearSelect = document.getElementById('year-select');
    if (monthSelect) monthSelect.addEventListener('change', fetchAndDisplayExpenses);
    if (yearSelect) yearSelect.addEventListener('change', fetchAndDisplayExpenses);

    // Handle form submit
    if (expenseForm) {
        expenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUid) return;
            const description = document.getElementById('expense-description').value;
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const date = document.getElementById('expense-date').value;
            const category = document.getElementById('expense-category').value;
            if (!description || !amount || !date || !category) {
                alert('Please fill in all fields');
                return;
            }
            const payload = {
                uid: currentUid,
                date,
                description,
                category,
                amount
            };
            await fetch('http://127.0.0.1:5000/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            expenseForm.reset();
            if (manualExpenseModal) manualExpenseModal.style.display = 'none';
            fetchAndDisplayExpenses();
            if (window.updateNotifications) window.updateNotifications();
            renderExpenseAISuggestions();
        });
    }

    // Set default month and year to current
    const now = new Date();
    if (monthSelect) monthSelect.value = now.getMonth();
    if (yearSelect) yearSelect.value = now.getFullYear();

    if (editBudgetBtn && editBudgetModal) {
        editBudgetBtn.addEventListener('click', () => {
            budgetInput.value = currentBudget;
            openModal(editBudgetModal);
        });
    }
    if (closeBudgetModalBtn && editBudgetModal) {
        closeBudgetModalBtn.addEventListener('click', () => closeModal(editBudgetModal));
    }
    if (cancelBudgetBtn && editBudgetModal) {
        cancelBudgetBtn.addEventListener('click', () => closeModal(editBudgetModal));
    }
    if (editBudgetForm) {
        editBudgetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newBudget = Number(budgetInput.value);
            if (!currentUid || isNaN(newBudget) || newBudget < 0) return;
            try {
                const res = await fetch('http://127.0.0.1:5000/api/budget', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: currentUid, amount: newBudget })
                });
                if (res.ok) {
                    currentBudget = newBudget;
                    updateBudgetUI();
                    updateBudgetStatus();
                    closeModal(editBudgetModal);
                    if (window.updateNotifications) window.updateNotifications();
                    renderExpenseAISuggestions();
                } else {
                    alert('Failed to update budget.');
                }
            } catch (err) {
                alert('Failed to update budget.');
            }
        });
    }

    // Fetch budget after user is authenticated
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUid = user.uid;
            fetchAndDisplayBudget();
            fetchAndDisplayExpenses();
            fetchAndRenderExpenseTrend();
            renderExpenseAISuggestions();
        } else {
            currentUid = null;
        }
    });
});

// Fetch and display expenses
async function fetchAndDisplayExpenses() {
    if (!currentUid) return;
    if (!expenseTableBody) return;
    expenseTableBody.innerHTML = '';
    const month = getSelectedMonth();
    const year = getSelectedYear();
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/expenses/${currentUid}?month=${month}&year=${year}`);
        let data = await res.json();
        // Debug log
        console.log('Fetched expenses:', data);
        // Sort by date descending (most recent first)
        data = data.sort((a, b) => new Date(b.date) - new Date(a.date));
        currentMonthExpenses = data; // Store for category breakdown
        // Update total expenses stat card
        updateTotalExpensesStat();
        updateBudgetStatus();
        fetchAndRenderExpenseTrend();
        renderCategoryBreakdownChart();
        if (!Array.isArray(data) || data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="text-center">No expenses found for selected period</td>`;
            expenseTableBody.appendChild(row);
        } else {
            data.forEach(expense => {
                if (!expense.date || !expense.description || !expense.category || typeof expense.amount === 'undefined') {
                    console.warn('Skipping malformed expense:', expense);
                    return;
                }
                const date = new Date(expense.date);
                const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${expense.description}</td>
                    <td class="category-cell">${expense.category}</td>
                    <td>₹${expense.amount.toLocaleString('en-IN')}</td>
                    <td><button class="btn btn-danger btn-sm delete-expense-btn" data-id="${expense._id}">Delete</button></td>
                `;
                expenseTableBody.appendChild(row);
            });
            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-expense-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this expense?')) {
                        await fetch(`http://127.0.0.1:5000/api/expenses/${id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                        });
                        fetchAndDisplayExpenses();
                        if (window.updateNotifications) window.updateNotifications();
                        renderExpenseAISuggestions();
                    }
                });
            });
        }
    } catch (err) {
        console.error('Error fetching expenses:', err);
        expenseTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Error loading expenses</td></tr>`;
    }
}

function updateTotalExpensesStat() {
    // Find the Total Expenses stat card
    const statCards = document.querySelectorAll('.stat-card');
    let statValueElem = null;
    let statChangeElem = null;
    statCards.forEach(card => {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent.includes('Total Expenses')) {
            statValueElem = card.querySelector('.stat-value');
            statChangeElem = card.querySelector('.stat-change');
        }
    });
    if (statValueElem) {
        const total = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        statValueElem.textContent = `₹${total.toLocaleString('en-IN')}`;
    }
}

function updateBudgetStatus() {
    const statChangeElem = document.getElementById('budget-status');
    if (statChangeElem) {
        const totalExpenses = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        if (totalExpenses <= currentBudget) {
            statChangeElem.innerHTML = '<i class="fas fa-check-circle"></i> Within budget';
            statChangeElem.className = 'stat-change positive';
        } else {
            statChangeElem.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Exceeded budget';
            statChangeElem.className = 'stat-change negative';
        }
    }
}

function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

async function fetchAndDisplayBudget() {
    if (!currentUid) return;
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/budget/${currentUid}`);
        if (res.ok) {
            const data = await res.json();
            currentBudget = data.amount;
        } else {
            currentBudget = 20000;
        }
    } catch (err) {
        currentBudget = 20000;
    }
    if (monthlyBudgetValue) {
        monthlyBudgetValue.textContent = Number(currentBudget).toLocaleString('en-IN');
    }
    updateBudgetStatus();
}

function updateBudgetUI() {
    if (monthlyBudgetValue) {
        monthlyBudgetValue.textContent = Number(currentBudget).toLocaleString('en-IN');
    }
}

async function fetchAndRenderExpenseTrend() {
    if (!currentUid) return;
    const ctx = document.getElementById('expense-trend-chart');
    if (!ctx) return;
    // Get last 4 months (including current)
    const now = new Date();
    const months = [];
    const monthLabels = [];
    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        monthLabels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }
    // Fetch all expense totals for user
    let totals = [];
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/expenses/${currentUid}`);
        if (res.ok) {
            const data = await res.json();
            // Aggregate totals by year/month
            const totalsMap = {};
            data.forEach(exp => {
                const d = new Date(exp.date);
                const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
                if (!totalsMap[key]) totalsMap[key] = 0;
                totalsMap[key] += Number(exp.amount);
            });
            totals = months.map(({ year, month }) => {
                const key = `${year}-${month}`;
                return totalsMap[key] || 0;
            });
        } else {
            totals = [0, 0, 0, 0];
        }
    } catch (err) {
        totals = [0, 0, 0, 0];
    }
    // Render Chart.js line chart
    if (expenseTrendChart) {
        expenseTrendChart.destroy();
    }
    expenseTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Total Expense',
                data: totals,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: '#6366F1',
                pointBorderColor: '#fff',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: { title: { display: true, text: 'Month' } },
                y: { title: { display: true, text: 'Total Expense (₹)' }, beginAtZero: true }
            }
        }
    });
}

function renderCategoryBreakdownChart() {
    const ctx = document.getElementById('category-breakdown-chart');
    if (!ctx) return;
    // Aggregate current month expenses by category
    const categoryTotals = {};
    currentMonthExpenses.forEach(exp => {
        if (!categoryTotals[exp.category]) categoryTotals[exp.category] = 0;
        categoryTotals[exp.category] += Number(exp.amount);
    });
    const categories = Object.keys(categoryTotals);
    const totals = Object.values(categoryTotals);
    const colors = [
        '#6366F1', '#06B6D4', '#F59E42', '#F43F5E', '#64748b', '#A855F7', '#22C55E', '#FBBF24', '#E11D48', '#0EA5E9'
    ];
    if (categoryBreakdownChart) {
        categoryBreakdownChart.destroy();
    }
    categoryBreakdownChart = new Chart(ctx, {
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

// Remove all static/random AI suggestion code and constants. Only use dynamic AI suggestions from ai-insights.js.
// (No static categories/messages/savings arrays or generateSuggestions function remain.)
async function renderExpenseAISuggestions() {
    if (!currentUid) return;
    // Fetch current month expenses
    const month = getSelectedMonth();
    const year = getSelectedYear();
    const res = await fetch(`http://127.0.0.1:5000/api/expenses/${currentUid}?month=${month}&year=${year}`);
    const expenses = res.ok ? await res.json() : [];
    // Fetch last month expenses
    let lastMonth = month - 1;
    let lastYear = year;
    if (lastMonth < 0) { lastMonth = 11; lastYear--; }
    const resLast = await fetch(`http://127.0.0.1:5000/api/expenses/${currentUid}?month=${lastMonth}&year=${lastYear}`);
    const lastMonthExpenses = resLast.ok ? await resLast.json() : [];
    // Fetch budget
    let budget = 0;
    const resBudget = await fetch(`http://127.0.0.1:5000/api/budget/${currentUid}`);
    if (resBudget.ok) {
        const data = await resBudget.json();
        budget = data.amount;
    }
    // Generate suggestions
    const suggestions = generateExpenseAISuggestions(expenses, budget, lastMonthExpenses);
    // Render
    const content = document.querySelector('.ai-suggestions-content');
    if (content) {
        content.innerHTML = '';
        suggestions.forEach(s => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <div class="suggestion-icon">
                    <i class="fas ${s.icon}"></i>
                </div>
                <div class="suggestion-text">
                    <h4 class="font-medium">${s.title}</h4>
                    <p>${s.text}</p>
                </div>
            `;
            content.appendChild(div);
        });
    }
}
