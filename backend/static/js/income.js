import { auth } from "./firebase-config.js";
import { generateIncomeAISuggestions } from '../shared/ai-insights.js';

let currentUid = null;
const incomeTableBody = document.getElementById('income-table-body');
const incomeMonthSelect = document.getElementById('income-month-select');
const incomeYearSelect = document.getElementById('income-year-select');
const incomeForm = document.getElementById('income-form');
const addIncomeBtn = document.getElementById('add-income-btn');
const incomeModal = document.getElementById('add-income-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');

// Add selectors for stat cards
const statCards = document.querySelectorAll('.stat-card');
let currentMonthIncomes = [];
let allIncomes = [];
let currentMonthExpenses = [];

let incomeTrendChart = null;
let sourceDistributionChart = null;

function getSelectedIncomeMonth() {
    return incomeMonthSelect ? parseInt(incomeMonthSelect.value) : new Date().getMonth();
}
function getSelectedIncomeYear() {
    return incomeYearSelect ? parseInt(incomeYearSelect.value) : new Date().getFullYear();
}

async function fetchAndDisplayIncomes() {
    if (!currentUid) return;
    if (!incomeTableBody) return;
    incomeTableBody.innerHTML = '';
    const month = getSelectedIncomeMonth();
    const year = getSelectedIncomeYear();
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}?month=${month}&year=${year}`);
        const data = await res.json();
        if (!data || data.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="text-center">No income found for selected period</td>`;
            incomeTableBody.appendChild(row);
        } else {
            data.forEach(income => {
                const date = new Date(income.date);
                const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${income.source}</td>
                    <td>${income.description || ''}</td>
                    <td>₹${income.amount.toLocaleString('en-IN')}</td>
                    <td><button class="btn btn-danger btn-sm delete-income-btn" data-id="${income._id}">Delete</button></td>
                `;
                incomeTableBody.appendChild(row);
            });
        }
    } catch (err) {
        incomeTableBody.innerHTML = `<tr><td colspan="5" class="text-center">Error loading income</td></tr>`;
    }
}

// Fetch current month expenses for savings rate
async function fetchCurrentMonthExpenses() {
    if (!currentUid) return [];
    const month = getSelectedIncomeMonth();
    const year = getSelectedIncomeYear();
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/expenses/${currentUid}?month=${month}&year=${year}`);
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {}
    return [];
}

// Fetch all incomes for average
async function fetchAllIncomes() {
    if (!currentUid) return [];
    try {
        const res = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}`);
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {}
    return [];
}

// Update stats UI
async function updateIncomeStats() {
    // Total Income (current month)
    const month = getSelectedIncomeMonth();
    const year = getSelectedIncomeYear();
    // Fetch current month incomes
    const res = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}?month=${month}&year=${year}`);
    currentMonthIncomes = res.ok ? await res.json() : [];
    // Fetch all incomes for average
    allIncomes = await fetchAllIncomes();
    // Fetch current month expenses
    currentMonthExpenses = await fetchCurrentMonthExpenses();
    // Total income
    const totalIncome = currentMonthIncomes.reduce((sum, i) => sum + Number(i.amount), 0);
    // Average monthly income (now: current month income - current month expense)
    const netSavings = totalIncome - currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    // Savings rate
    const totalExpense = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    let savingsRate = 0;
    if (totalIncome > 0) {
        savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
    }
    // Update UI
    statCards.forEach(card => {
        const h3 = card.querySelector('h3');
        if (!h3) return;
        if (h3.textContent.includes('Total Income')) {
            const statValue = card.querySelector('.stat-value');
            if (statValue) statValue.textContent = `₹${totalIncome.toLocaleString('en-IN')}`;
        } else if (h3.textContent.includes('Average Monthly')) {
            const statValue = card.querySelector('.stat-value');
            if (statValue) statValue.textContent = `₹${netSavings.toLocaleString('en-IN')}`;
        } else if (h3.textContent.includes('Savings Rate')) {
            const statValue = card.querySelector('.stat-value');
            if (statValue) statValue.textContent = `${Math.round(savingsRate)}%`;
            const statChange = card.querySelector('.stat-change');
            if (statChange) {
                if (savingsRate >= 0) {
                    statChange.textContent = 'Positive savings';
                    statChange.className = 'stat-change positive';
                } else {
                    statChange.textContent = 'Negative savings';
                    statChange.className = 'stat-change negative';
                }
            }
        }
    });
}

// Render Income Trend Chart (last 4 months)
async function renderIncomeTrendChart() {
    if (!currentUid) return;
    const ctx = document.getElementById('income-trend-chart');
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
    // Fetch all incomes for user
    let allIncomes = await fetchAllIncomes();
    // Aggregate totals by year/month
    const totalsMap = {};
    allIncomes.forEach(inc => {
        const d = new Date(inc.date);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        if (!totalsMap[key]) totalsMap[key] = 0;
        totalsMap[key] += Number(inc.amount);
    });
    const totals = months.map(({ year, month }) => {
        const key = `${year}-${month}`;
        return totalsMap[key] || 0;
    });
    // Render Chart.js line chart
    if (incomeTrendChart) incomeTrendChart.destroy();
    incomeTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Total Income',
                data: totals,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: '#22c55e',
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
                y: { title: { display: true, text: 'Total Income (₹)' }, beginAtZero: true }
            }
        }
    });
}

// Render Source Distribution Chart (current month)
async function renderSourceDistributionChart() {
    if (!currentUid) return;
    const ctx = document.getElementById('source-distribution-chart');
    if (!ctx) return;
    // Aggregate current month incomes by source
    const month = getSelectedIncomeMonth();
    const year = getSelectedIncomeYear();
    const res = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}?month=${month}&year=${year}`);
    const currentMonthIncomes = res.ok ? await res.json() : [];
    const sourceTotals = {};
    currentMonthIncomes.forEach(inc => {
        if (!sourceTotals[inc.source]) sourceTotals[inc.source] = 0;
        sourceTotals[inc.source] += Number(inc.amount);
    });
    const sources = Object.keys(sourceTotals);
    const totals = Object.values(sourceTotals);
    const colors = [
        '#6366F1', '#06B6D4', '#F59E42', '#F43F5E', '#64748b', '#A855F7', '#22C55E', '#FBBF24', '#E11D48', '#0EA5E9'
    ];
    if (sourceDistributionChart) sourceDistributionChart.destroy();
    sourceDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sources,
            datasets: [{
                data: totals,
                backgroundColor: colors.slice(0, sources.length),
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

// Call these after stats/table update
async function refreshIncomeStatsAndTable() {
    await fetchAndDisplayIncomes();
    await updateIncomeStats();
    await renderIncomeTrendChart();
    await renderSourceDistributionChart();
}

if (incomeForm) {
    incomeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const source = document.getElementById('income-source').value;
        const description = document.getElementById('income-description').value;
        const amount = parseFloat(document.getElementById('income-amount').value);
        const date = document.getElementById('income-date').value;
        if (!source || !amount || !date || !description) {
            alert('Please fill in all fields');
            return;
        }
        const payload = {
            uid: currentUid,
            date,
            amount,
            source,
            description
        };
        await fetch('http://127.0.0.1:5000/api/incomes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        incomeForm.reset();
        if (incomeModal) incomeModal.style.display = 'none';
        refreshIncomeStatsAndTable();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Set default month and year to current
    const now = new Date();
    if (incomeMonthSelect) incomeMonthSelect.value = now.getMonth();
    if (incomeYearSelect) incomeYearSelect.value = now.getFullYear();
    if (addIncomeBtn && incomeModal) {
        addIncomeBtn.addEventListener('click', () => incomeModal.style.display = 'block');
    }
    if (closeModalButtons && incomeModal) {
        closeModalButtons.forEach(btn => btn.addEventListener('click', () => incomeModal.style.display = 'none'));
    }
    window.addEventListener('click', (event) => {
        if (event.target === incomeModal) incomeModal.style.display = 'none';
    });
});

if (incomeMonthSelect) incomeMonthSelect.addEventListener('change', refreshIncomeStatsAndTable);
if (incomeYearSelect) incomeYearSelect.addEventListener('change', refreshIncomeStatsAndTable);

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-income-btn')) {
        const id = e.target.getAttribute('data-id');
        if (confirm('Are you sure you want to delete this income?')) {
            await fetch(`http://127.0.0.1:5000/api/incomes/${id}`, { method: 'DELETE' });
            refreshIncomeStatsAndTable();
        }
    }
});

// Firebase Auth
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUid = user.uid;
        refreshIncomeStatsAndTable();
        renderIncomeAISuggestions();
    } else {
        currentUid = null;
    }
});

// Remove static AI suggestions code and replace with dynamic
async function renderIncomeAISuggestions() {
    if (!currentUid) return;
    // Fetch current month incomes
    const month = getSelectedIncomeMonth();
    const year = getSelectedIncomeYear();
    const res = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}?month=${month}&year=${year}`);
    const incomes = res.ok ? await res.json() : [];
    // Fetch last month incomes
    let lastMonth = month - 1;
    let lastYear = year;
    if (lastMonth < 0) { lastMonth = 11; lastYear--; }
    const resLast = await fetch(`http://127.0.0.1:5000/api/incomes/${currentUid}?month=${lastMonth}&year=${lastYear}`);
    const lastMonthIncomes = resLast.ok ? await resLast.json() : [];
    // Generate suggestions
    const suggestions = generateIncomeAISuggestions(incomes, lastMonthIncomes);
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