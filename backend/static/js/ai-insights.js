// ai-insights.js
// Shared AI Insights generator for SmartFin

/**
 * Generate AI suggestions for the expense page.
 * @param {Array} expenses - Current month expenses
 * @param {number} budget - Current month budget
 * @param {Array} lastMonthExpenses - Previous month expenses
 * @returns {Array} Array of suggestion objects {icon, title, text}
 */
export function generateExpenseAISuggestions(expenses, budget, lastMonthExpenses) {
    const suggestions = [];
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    // 1. Exceeded budget
    if (budget && total > budget) {
        suggestions.push({
            icon: 'fa-exclamation-triangle text-red-500',
            title: 'Budget Exceeded',
            text: 'You have exceeded your monthly budget. Consider reviewing your spending.'
        });
    }
    // 2. High spending in a category
    const categoryTotals = {};
    expenses.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
    });
    for (const [cat, amt] of Object.entries(categoryTotals)) {
        if (amt > total * 0.3 && total > 0) {
            suggestions.push({
                icon: 'fa-utensils text-orange-500',
                title: `High ${cat.charAt(0).toUpperCase() + cat.slice(1)} Expenses`,
                text: `Your ${cat} expenses are unusually high this month.`
            });
        }
    }
    // 3. Compare to last month
    if (lastMonthExpenses && lastMonthExpenses.length) {
        const lastTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
        if (total > lastTotal * 1.2) {
            suggestions.push({
                icon: 'fa-chart-line-down text-red-500',
                title: 'Spending Increased',
                text: 'Your total expenses increased by more than 20% compared to last month.'
            });
        }
    }
    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'fa-piggy-bank text-emerald-500',
            title: 'Good Job!',
            text: 'Your spending is under control this month.'
        });
    }
    return suggestions;
}

/**
 * Generate AI suggestions for the income page.
 * @param {Array} incomes - Current month incomes
 * @param {Array} lastMonthIncomes - Previous month incomes
 * @returns {Array} Array of suggestion objects {icon, title, text}
 */
export function generateIncomeAISuggestions(incomes, lastMonthIncomes) {
    const suggestions = [];
    const total = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    const lastTotal = lastMonthIncomes ? lastMonthIncomes.reduce((sum, i) => sum + Number(i.amount), 0) : 0;
    // 1. Income dropped
    if (lastTotal > 0 && total < lastTotal) {
        suggestions.push({
            icon: 'fa-arrow-down text-red-500',
            title: 'Income Dropped',
            text: 'Your income is lower than last month. Consider diversifying your sources.'
        });
    }
    // 2. New income source
    const sources = new Set(incomes.map(i => i.source));
    const lastSources = new Set(lastMonthIncomes ? lastMonthIncomes.map(i => i.source) : []);
    for (const src of sources) {
        if (!lastSources.has(src)) {
            suggestions.push({
                icon: 'fa-lightbulb text-yellow-500',
                title: 'New Income Source',
                text: `You added a new income source: ${src}.`
            });
        }
    }
    // 3. High savings rate (if income > 0 and savings > 30%)
    // This can be calculated on the home page with both incomes and expenses
    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'fa-chart-line-up text-emerald-500',
            title: 'Stable Income',
            text: 'Your income is stable this month.'
        });
    }
    return suggestions;
}

/**
 * Generate AI suggestions for the home page (general financial insights).
 * @param {Array} expenses - Current month expenses
 * @param {Array} incomes - Current month incomes
 * @param {number} budget - Current month budget
 * @returns {Array} Array of suggestion objects {icon, title, text}
 */
export function generateHomeAISuggestions(expenses, incomes, budget) {
    const suggestions = [];
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
    // 1. Savings rate
    if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
        if (savingsRate > 30) {
            suggestions.push({
                icon: 'fa-piggy-bank text-emerald-500',
                title: 'Great Savings Rate',
                text: `Your savings rate is ${Math.round(savingsRate)}% this month. Keep it up!`
            });
        } else if (savingsRate < 10) {
            suggestions.push({
                icon: 'fa-exclamation-triangle text-red-500',
                title: 'Low Savings Rate',
                text: 'Your savings rate is low this month. Try to reduce expenses or increase income.'
            });
        }
    }
    // 2. Budget exceeded
    if (budget && totalExpenses > budget) {
        suggestions.push({
            icon: 'fa-exclamation-triangle text-red-500',
            title: 'Budget Exceeded',
            text: 'You have exceeded your monthly budget.'
        });
    }
    // 3. Expense vs income
    if (totalIncome > 0 && totalExpenses > totalIncome * 0.8) {
        suggestions.push({
            icon: 'fa-balance-scale text-yellow-500',
            title: 'High Expenses',
            text: 'Your expenses are close to your income. Watch your spending!'
        });
    }
    if (suggestions.length === 0) {
        suggestions.push({
            icon: 'fa-lightbulb text-emerald-500',
            title: 'Finances Stable',
            text: 'Your finances look stable this month.'
        });
    }
    return suggestions;
} 