// Utility functions for the Broiler Farm Management App

export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatRelativeDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
}

export function daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    return Math.floor((end - start) / 86400000);
}

export function calculateFCR(totalFeedKg, totalWeightGainKg) {
    if (!totalWeightGainKg || totalWeightGainKg === 0) return 0;
    return (totalFeedKg / totalWeightGainKg).toFixed(2);
}

export function calculateMortalityRate(deaths, initialCount) {
    if (!initialCount || initialCount === 0) return 0;
    return ((deaths / initialCount) * 100).toFixed(1);
}

export function getBatchStatus(batch) {
    if (batch.status) return batch.status;
    const age = daysBetween(batch.startDate);
    if (age <= 1) return 'Day-old';
    if (age <= 42) return 'Growing';
    return 'Ready';
}

export function getBatchStatusBadge(status) {
    switch (status) {
        case 'Day-old': return 'blue';
        case 'Growing': return 'amber';
        case 'Ready': return 'green';
        case 'Sold': return 'slate';
        default: return 'slate';
    }
}

export function getExpenseCategories() {
    return [
        { value: 'chicks', label: '🐣 Chick Purchase', type: 'batch' },
        { value: 'feed', label: '🌾 Feed', type: 'batch' },
        { value: 'medication', label: '💊 Medication', type: 'batch' },
        { value: 'infrastructure', label: '🔧 Infrastructure / Renovation', type: 'farm' },
        { value: 'utilities', label: '⚡ Utilities', type: 'farm' },
        { value: 'labor', label: '👷 Labor', type: 'farm' },
        { value: 'equipment', label: '🛠️ Equipment', type: 'farm' },
        { value: 'transport', label: '🚛 Transport', type: 'farm' },
        { value: 'other', label: '📦 Other', type: 'farm' },
    ];
}

export function getRevenueCategories() {
    return [
        { value: 'bird_sale', label: '🐔 Bird Sale' },
        { value: 'manure_sale', label: '💩 Manure Sale' },
        { value: 'other', label: '📦 Other' },
    ];
}

export function getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
}

export function isInDateRange(dateStr, startDate, endDate) {
    const date = new Date(dateStr);
    if (startDate && date < new Date(startDate)) return false;
    if (endDate && date > new Date(endDate)) return false;
    return true;
}

export function generateSampleData() {
    // Returns empty - user starts fresh
    return {};
}
