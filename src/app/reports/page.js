'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import { BarChart3, Download, Upload, Trash2, Bird, DollarSign, Skull, Scale, Loader2 } from 'lucide-react';
import { getItems, addItems, clearTable, TABLES } from '@/lib/supabase-storage';
import {
    formatCurrency, formatNumber, formatDate, calculateMortalityRate,
    calculateFCR, daysBetween, getExpenseCategories
} from '@/lib/utils';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, ArcElement,
    PointElement, LineElement, Title, Tooltip, Legend, Filler
);

export default function ReportsPage() {
    const [batches, setBatches] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [feedPurchases, setFeedPurchases] = useState([]);
    const [feedConsumption, setFeedConsumption] = useState([]);
    const [mortalityLogs, setMortalityLogs] = useState([]);
    const [weightLogs, setWeightLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [bat, exp, rev, fp, fc, mort, wl] = await Promise.all([
            getItems(TABLES.BATCHES),
            getItems(TABLES.EXPENSES),
            getItems(TABLES.REVENUE),
            getItems(TABLES.FEED_PURCHASES),
            getItems(TABLES.FEED_CONSUMPTION),
            getItems(TABLES.MORTALITY_LOGS),
            getItems(TABLES.WEIGHT_LOGS),
        ]);
        setBatches(bat);
        setExpenses(exp);
        setRevenue(rev);
        setFeedPurchases(fp);
        setFeedConsumption(fc);
        setMortalityLogs(mort);
        setWeightLogs(wl);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Calculations
    const totalBirdsEver = batches.reduce((s, b) => s + Number(b.quantity), 0);
    const totalDeaths = mortalityLogs.reduce((s, m) => s + Number(m.quantity), 0);
    const overallMortality = calculateMortalityRate(totalDeaths, totalBirdsEver);
    const totalFeedUsed = feedConsumption.reduce((s, f) => s + Number(f.quantity), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0);
    const profit = totalRevenue - totalExpenses;
    const costPerBird = totalBirdsEver > 0 ? (totalExpenses / totalBirdsEver) : 0;
    const revenuePerBird = totalBirdsEver > 0 ? (totalRevenue / totalBirdsEver) : 0;

    // Expense breakdown for pie chart
    const expenseCategories = getExpenseCategories();
    const expenseByCategory = {};
    expenses.forEach(e => {
        const label = expenseCategories.find(c => c.value === e.category)?.label || e.category;
        expenseByCategory[label] = (expenseByCategory[label] || 0) + Number(e.amount);
    });

    const pieData = {
        labels: Object.keys(expenseByCategory),
        datasets: [{
            data: Object.values(expenseByCategory),
            backgroundColor: [
                '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7',
                '#f97316', '#06b6d4', '#ec4899', '#64748b'
            ],
            borderWidth: 2,
            borderColor: '#fff',
        }],
    };

    // Monthly P&L
    const monthlyData = {};
    expenses.forEach(e => {
        const month = e.date?.substring(0, 7);
        if (!month) return;
        if (!monthlyData[month]) monthlyData[month] = { expenses: 0, revenue: 0 };
        monthlyData[month].expenses += Number(e.amount);
    });
    revenue.forEach(r => {
        const month = r.date?.substring(0, 7);
        if (!month) return;
        if (!monthlyData[month]) monthlyData[month] = { expenses: 0, revenue: 0 };
        monthlyData[month].revenue += Number(r.amount);
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    const barData = {
        labels: sortedMonths.map(m => {
            const [y, mo] = m.split('-');
            return new Date(y, mo - 1).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' });
        }),
        datasets: [
            {
                label: 'Revenue',
                data: sortedMonths.map(m => monthlyData[m].revenue),
                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                borderRadius: 6,
            },
            {
                label: 'Expenses',
                data: sortedMonths.map(m => monthlyData[m].expenses),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderRadius: 6,
            },
        ],
    };

    // Batch comparison with profitability
    const batchComparison = batches.map(batch => {
        const deaths = mortalityLogs.filter(m => m.batchId === batch.id).reduce((s, m) => s + Number(m.quantity), 0);
        const sold = revenue.filter(r => r.batchId === batch.id && r.category === 'bird_sale').reduce((s, r) => s + Number(r.quantity || 0), 0);
        const feedUsed = feedConsumption.filter(f => f.batchId === batch.id).reduce((s, f) => s + Number(f.quantity), 0);
        const batchExpenses = expenses.filter(e => e.batchId === batch.id).reduce((s, e) => s + Number(e.amount), 0);
        const chickCost = Number(batch.costPerChick || 0) * Number(batch.quantity);
        const batchRevenue = revenue.filter(r => r.batchId === batch.id).reduce((s, r) => s + Number(r.amount), 0);
        const latestWeight = weightLogs.filter(w => w.batchId === batch.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const liveBirds = Number(batch.quantity) - deaths - sold;
        const totalWeightGain = latestWeight ? liveBirds * Number(latestWeight.avgWeight) : 0;
        const fcr = calculateFCR(feedUsed, totalWeightGain);
        const totalCost = batchExpenses + chickCost;
        const profitPerBird = liveBirds > 0 ? ((batchRevenue - totalCost) / liveBirds) : 0;

        return {
            name: batch.name,
            quantity: batch.quantity,
            liveBirds,
            deaths,
            mortalityRate: calculateMortalityRate(deaths, batch.quantity),
            feedUsed,
            fcr,
            age: daysBetween(batch.startDate) + Number(batch.ageAtAcquisition || 0),
            latestWeight: latestWeight?.avgWeight || 0,
            chickCost,
            expenses: batchExpenses,
            totalCost,
            revenue: batchRevenue,
            profit: batchRevenue - totalCost,
            profitPerBird,
            status: batch.status || 'Active',
        };
    });

    // Export CSV
    const exportCSV = () => {
        const headers = ['Batch', 'Qty', 'Live', 'Deaths', 'Mortality%', 'Feed(kg)', 'FCR', 'Age(days)', 'Weight(kg)', 'Chick Cost', 'Expenses', 'Total Cost', 'Revenue', 'Profit', 'Profit/Bird'];
        const rows = batchComparison.map(b => [
            b.name, b.quantity, b.liveBirds, b.deaths, b.mortalityRate,
            b.feedUsed, b.fcr, b.age, b.latestWeight, b.chickCost,
            b.expenses, b.totalCost, b.revenue, b.profit, b.profitPerBird.toFixed(2)
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farm_report_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export ALL data as JSON backup
    const exportAllData = async () => {
        const tableMap = {
            batches: TABLES.BATCHES,
            expenses: TABLES.EXPENSES,
            revenue: TABLES.REVENUE,
            feed_purchases: TABLES.FEED_PURCHASES,
            feed_consumption: TABLES.FEED_CONSUMPTION,
            mortality_logs: TABLES.MORTALITY_LOGS,
            weight_logs: TABLES.WEIGHT_LOGS,
            vaccinations: TABLES.VACCINATIONS,
            customers: TABLES.CUSTOMERS,
            photo_logs: TABLES.PHOTO_LOGS,
        };
        const data = {};
        const entries = Object.entries(tableMap);
        const results = await Promise.all(entries.map(([, table]) => getItems(table)));
        entries.forEach(([key], i) => { data[key] = results[i]; });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farmflow_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import data from JSON
    const importData = () => {
        if (!importFile) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const tableMap = {
                    batches: TABLES.BATCHES,
                    expenses: TABLES.EXPENSES,
                    revenue: TABLES.REVENUE,
                    feed_purchases: TABLES.FEED_PURCHASES,
                    feed_consumption: TABLES.FEED_CONSUMPTION,
                    mortality_logs: TABLES.MORTALITY_LOGS,
                    weight_logs: TABLES.WEIGHT_LOGS,
                    vaccinations: TABLES.VACCINATIONS,
                    customers: TABLES.CUSTOMERS,
                    photo_logs: TABLES.PHOTO_LOGS,
                };
                // Clear all tables then re-import
                for (const [key, table] of Object.entries(tableMap)) {
                    await clearTable(table);
                    if (data[key] && Array.isArray(data[key]) && data[key].length > 0) {
                        await addItems(table, data[key]);
                    }
                }
                setShowImportModal(false);
                setImportFile(null);
                await loadData();
                alert('Data imported successfully! All pages will reflect the imported data.');
            } catch {
                alert('Invalid backup file. Please select a valid FarmFlow backup JSON file.');
            }
        };
        reader.readAsText(importFile);
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
    };

    const noData = batches.length === 0 && expenses.length === 0 && revenue.length === 0;

    if (loading) {
        return (
            <>
                <Header title="Reports & Analytics" subtitle="Performance metrics, profitability, and backups" />
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <Loader2 size={32} className="spinner" />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Reports & Analytics" subtitle="Performance metrics, profitability, and backups" />
            <div className="page-content">
                {/* Data Backup Actions */}
                <div className="action-bar">
                    <button className="btn btn-primary" onClick={exportAllData}>
                        <Download size={16} /> Export All Data
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                        <Upload size={16} /> Import Backup
                    </button>
                    <button className="btn btn-danger" onClick={async () => {
                        if (!confirm('⚠️ This will permanently delete ALL your farm data. Are you sure?')) return;
                        const typed = prompt('Type DELETE to confirm:');
                        if (typed !== 'DELETE') { alert('Cancelled.'); return; }
                        const tables = Object.values(TABLES);
                        await Promise.all(tables.map(t => clearTable(t)));
                        await loadData();
                        alert('All data has been deleted.');
                    }}>
                        <Trash2 size={16} /> Delete All Data
                    </button>
                </div>

                {noData ? (
                    <div className="card">
                        <div className="card-body">
                            <div className="empty-state">
                                <div className="empty-state-icon"><BarChart3 size={28} /></div>
                                <h3>No data yet</h3>
                                <p>Start adding batches, expenses, and revenue to see reports and analytics here.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Key Metrics */}
                        <div className="metric-grid" style={{ marginBottom: '28px' }}>
                            <div className="metric-card">
                                <div className="metric-label">Total Birds Raised</div>
                                <div className="metric-value">{formatNumber(totalBirdsEver)}</div>
                                <div className="metric-sub">Across {batches.length} batches</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Overall Mortality</div>
                                <div className="metric-value" style={{ color: Number(overallMortality) > 5 ? 'var(--red-500)' : 'var(--green-600)' }}>{overallMortality}%</div>
                                <div className="metric-sub">{totalDeaths} birds lost</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Cost per Bird</div>
                                <div className="metric-value">{formatCurrency(costPerBird)}</div>
                                <div className="metric-sub">Total expenses ÷ total birds</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Revenue per Bird</div>
                                <div className="metric-value" style={{ color: 'var(--green-600)' }}>{formatCurrency(revenuePerBird)}</div>
                                <div className="metric-sub">Total revenue ÷ total birds</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Total Feed Used</div>
                                <div className="metric-value">{formatNumber(totalFeedUsed)} kg</div>
                                <div className="metric-sub">All batches combined</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Net Profit / Loss</div>
                                <div className="metric-value" style={{ color: profit >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>{formatCurrency(profit)}</div>
                                <div className="metric-sub">All time</div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="tabs">
                            <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Charts</button>
                            <button className={`tab ${activeTab === 'batches' ? 'active' : ''}`} onClick={() => setActiveTab('batches')}>Batch Profitability</button>
                        </div>

                        {activeTab === 'overview' && (
                            <div className="content-grid">
                                {sortedMonths.length > 0 && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">Monthly Revenue vs Expenses</h3>
                                        </div>
                                        <div className="card-body">
                                            <div className="chart-container">
                                                <Bar data={barData} options={chartOptions} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {Object.keys(expenseByCategory).length > 0 && (
                                    <div className="card">
                                        <div className="card-header">
                                            <h3 className="card-title">Expense Breakdown</h3>
                                        </div>
                                        <div className="card-body">
                                            <div className="chart-container chart-wrapper">
                                                <Pie data={pieData} options={chartOptions} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'batches' && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Batch Profitability Report</h3>
                                    <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
                                        <Download size={14} /> Export CSV
                                    </button>
                                </div>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Batch</th>
                                                <th>Qty</th>
                                                <th>Live</th>
                                                <th>Mortality</th>
                                                <th>FCR</th>
                                                <th>Avg Wt</th>
                                                <th>Chick Cost</th>
                                                <th>Expenses</th>
                                                <th>Total Cost</th>
                                                <th>Revenue</th>
                                                <th>Profit</th>
                                                <th>₦/Bird</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {batchComparison.map((b, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                                                    <td>{b.quantity}</td>
                                                    <td>{b.liveBirds}</td>
                                                    <td style={{ color: Number(b.mortalityRate) > 5 ? 'var(--red-500)' : 'var(--green-600)' }}>{b.mortalityRate}%</td>
                                                    <td>{b.fcr || '—'}</td>
                                                    <td>{b.latestWeight ? `${b.latestWeight}kg` : '—'}</td>
                                                    <td>{formatCurrency(b.chickCost)}</td>
                                                    <td style={{ color: 'var(--red-500)' }}>{formatCurrency(b.expenses)}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(b.totalCost)}</td>
                                                    <td style={{ color: 'var(--green-600)' }}>{formatCurrency(b.revenue)}</td>
                                                    <td style={{ fontWeight: 700, color: b.profit >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>{formatCurrency(b.profit)}</td>
                                                    <td style={{ fontWeight: 600, color: b.profitPerBird >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>{formatCurrency(b.profitPerBird)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Import Modal */}
                <Modal
                    isOpen={showImportModal}
                    onClose={() => { setShowImportModal(false); setImportFile(null); }}
                    title="Import Data Backup"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={importData} disabled={!importFile}>
                                <Upload size={16} /> Import
                            </button>
                        </>
                    }
                >
                    <div style={{ marginBottom: '16px' }}>
                        <div className="alert-card warning" style={{ animation: 'none' }}>
                            <span>⚠️ Importing will <strong>replace</strong> all existing data. Make sure to export a backup first!</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Select Backup File (.json)</label>
                        <input
                            className="form-input"
                            type="file"
                            accept=".json"
                            onChange={e => setImportFile(e.target.files?.[0] || null)}
                        />
                        <span className="form-hint">Select a FarmFlow backup file (farmflow_backup_*.json)</span>
                    </div>
                </Modal>
            </div>
        </>
    );
}
