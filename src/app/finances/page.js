'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import {
    Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle, Loader2
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem, TABLES } from '@/lib/supabase-storage';
import {
    formatDate, formatCurrency, getExpenseCategories, getRevenueCategories
} from '@/lib/utils';

export default function FinancesPage() {
    const [expenses, setExpenses] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [batches, setBatches] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [mortalityLogs, setMortalityLogs] = useState([]);
    const [activeTab, setActiveTab] = useState('expenses');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showRevenueModal, setShowRevenueModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [expenseForm, setExpenseForm] = useState({ category: '', unitCost: '', quantity: '1', description: '', batchId: '', date: '' });
    const [revenueForm, setRevenueForm] = useState({ category: '', unitCost: '', quantity: '1', description: '', batchId: '', pricePerKg: '', date: '', customerId: '' });
    const [selectedMargin, setSelectedMargin] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [exp, rev, bat, cust, mort] = await Promise.all([
            getItems(TABLES.EXPENSES),
            getItems(TABLES.REVENUE),
            getItems(TABLES.BATCHES),
            getItems(TABLES.CUSTOMERS),
            getItems(TABLES.MORTALITY_LOGS),
        ]);
        setExpenses(exp);
        setRevenue(rev);
        setBatches(bat);
        setCustomers(cust);
        setMortalityLogs(mort);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalRevenue = revenue.reduce((s, r) => s + Number(r.amount), 0);
    const profit = totalRevenue - totalExpenses;

    const expenseCategories = getExpenseCategories();
    const revenueCategories = getRevenueCategories();

    // Compute batch info for bird sale pricing
    const selectedBatchInfo = useMemo(() => {
        if (revenueForm.category !== 'bird_sale' || !revenueForm.batchId) return null;
        const batch = batches.find(b => b.id === revenueForm.batchId);
        if (!batch) return null;

        // Age calculation
        const ageAtAcq = Number(batch.ageAtAcquisition || 0);
        const daysSinceStart = Math.floor((new Date() - new Date(batch.startDate)) / (1000 * 60 * 60 * 24));
        const totalAgeDays = daysSinceStart + ageAtAcq;
        const ageWeeks = Math.floor(totalAgeDays / 7);
        const ageDays = totalAgeDays % 7;

        // Age category badge
        let ageCategory = '';
        let ageBadgeColor = '';
        if (ageWeeks < 6) { ageCategory = 'Too Young'; ageBadgeColor = 'var(--red-500)'; }
        else if (ageWeeks === 6) { ageCategory = '6 Weeks — Early Sale'; ageBadgeColor = 'var(--amber-500)'; }
        else if (ageWeeks === 7) { ageCategory = '7 Weeks — Standard'; ageBadgeColor = 'var(--green-600)'; }
        else { ageCategory = '8+ Weeks — Premium'; ageBadgeColor = 'var(--emerald-600)'; }

        // Live birds (subtract mortality + already sold)
        const deaths = mortalityLogs.filter(m => m.batchId === batch.id).reduce((s, m) => s + Number(m.quantity), 0);
        const alreadySold = revenue.filter(r => r.batchId === batch.id && r.category === 'bird_sale').reduce((s, r) => s + Number(r.quantity || 0), 0);
        const liveBirds = Number(batch.quantity) - deaths - alreadySold;

        // Cost per bird = (chick cost + all linked expenses) / live birds
        const chickCost = Number(batch.costPerChick || 0) * Number(batch.quantity);
        const batchExpenses = expenses.filter(e => e.batchId === batch.id).reduce((s, e) => s + Number(e.amount), 0);
        const totalCost = chickCost + batchExpenses;
        const costPerBird = liveBirds > 0 ? totalCost / liveBirds : 0;

        return { batch, totalAgeDays, ageWeeks, ageDays, ageCategory, ageBadgeColor, liveBirds, costPerBird, totalCost };
    }, [revenueForm.category, revenueForm.batchId, batches, mortalityLogs, revenue, expenses]);

    const profitMargins = [
        { label: '20%', value: 20 },
        { label: '30%', value: 30 },
        { label: '50%', value: 50 },
        { label: '75%', value: 75 },
        { label: '100%', value: 100 },
    ];

    const applySuggestedPrice = (marginPercent) => {
        if (!selectedBatchInfo || selectedBatchInfo.costPerBird <= 0) return;
        const suggestedPrice = Math.ceil(selectedBatchInfo.costPerBird * (1 + marginPercent / 100));
        setRevenueForm(prev => ({ ...prev, unitCost: String(suggestedPrice) }));
        setSelectedMargin(String(marginPercent));
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        const amount = Number(expenseForm.unitCost) * Number(expenseForm.quantity || 1);
        const data = { ...expenseForm, amount };
        if (editingItem) {
            await updateItem(TABLES.EXPENSES, editingItem.id, data);
        } else {
            await addItem(TABLES.EXPENSES, data);
        }
        setShowExpenseModal(false);
        setEditingItem(null);
        setExpenseForm({ category: '', unitCost: '', quantity: '1', description: '', batchId: '', date: '' });
        await loadData();
    };

    const handleRevenueSubmit = async (e) => {
        e.preventDefault();
        const amount = Number(revenueForm.unitCost) * Number(revenueForm.quantity || 1);
        const data = { ...revenueForm, amount };
        if (editingItem) {
            await updateItem(TABLES.REVENUE, editingItem.id, data);
        } else {
            await addItem(TABLES.REVENUE, data);
        }
        setShowRevenueModal(false);
        setEditingItem(null);
        setRevenueForm({ category: '', unitCost: '', quantity: '1', description: '', batchId: '', pricePerKg: '', date: '', customerId: '' });
        await loadData();
    };

    const handleEditExpense = (item) => {
        setEditingItem(item);
        setExpenseForm({
            category: item.category, unitCost: item.unitCost || item.amount || '',
            quantity: item.quantity || '1',
            description: item.description || '', batchId: item.batchId || '', date: item.date
        });
        setShowExpenseModal(true);
    };

    const handleEditRevenue = (item) => {
        setEditingItem(item);
        setRevenueForm({
            category: item.category, unitCost: item.unitCost || item.amount || '',
            quantity: item.quantity || '1',
            description: item.description || '', batchId: item.batchId || '',
            pricePerKg: item.pricePerKg || '', date: item.date,
            customerId: item.customerId || ''
        });
        setShowRevenueModal(true);
    };

    const handleDeleteExpense = async (id) => {
        if (confirm('Delete this expense?')) { await deleteItem(TABLES.EXPENSES, id); await loadData(); }
    };

    const handleDeleteRevenue = async (id) => {
        if (confirm('Delete this revenue entry?')) { await deleteItem(TABLES.REVENUE, id); await loadData(); }
    };

    const getCategoryLabel = (value, categories) => {
        const cat = categories.find(c => c.value === value);
        return cat ? cat.label : value;
    };

    const selectedExpenseCat = expenseCategories.find(c => c.value === expenseForm.category);
    const isBatchExpense = selectedExpenseCat?.type === 'batch';

    if (loading) {
        return (
            <>
                <Header title="Income & Expenses" subtitle="Track all your farm finances" />
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <Loader2 size={32} className="spinner" />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Income & Expenses" subtitle="Track all your farm finances" />
            <div className="page-content">
                {/* Financial Summary */}
                <div className="summary-cards">
                    <div className="summary-card">
                        <div className="summary-card-label">Total Revenue</div>
                        <div className="summary-card-value income">{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-label">Total Expenses</div>
                        <div className="summary-card-value expense">{formatCurrency(totalExpenses)}</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-label">Net Profit / Loss</div>
                        <div className={`summary-card-value ${profit >= 0 ? 'profit' : 'loss'}`}>{formatCurrency(profit)}</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-bar">
                    <button className="btn btn-danger" style={{ background: 'var(--red-500)' }} onClick={() => {
                        setEditingItem(null);
                        setExpenseForm({ ...expenseForm, date: new Date().toISOString().split('T')[0] });
                        setShowExpenseModal(true);
                    }}>
                        <ArrowDownCircle size={16} /> Record Expense
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        setEditingItem(null);
                        setRevenueForm({ ...revenueForm, date: new Date().toISOString().split('T')[0] });
                        setShowRevenueModal(true);
                    }}>
                        <ArrowUpCircle size={16} /> Record Revenue
                    </button>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
                        Expenses ({expenses.length})
                    </button>
                    <button className={`tab ${activeTab === 'revenue' ? 'active' : ''}`} onClick={() => setActiveTab('revenue')}>
                        Revenue ({revenue.length})
                    </button>
                </div>

                {/* Expenses Tab */}
                {activeTab === 'expenses' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Expenses</h3>
                        </div>
                        {expenses.length === 0 ? (
                            <div className="card-body">
                                <div className="empty-state">
                                    <div className="empty-state-icon"><TrendingDown size={28} /></div>
                                    <h3>No expenses recorded</h3>
                                    <p>Start recording your farm expenses to track spending.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Description</th>
                                            <th>Batch</th>
                                            <th>Qty</th>
                                            <th>Unit Cost</th>
                                            <th>Total</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
                                            const batch = batches.find(b => b.id === item.batchId);
                                            return (
                                                <tr key={item.id}>
                                                    <td>{formatDate(item.date)}</td>
                                                    <td>
                                                        {getCategoryLabel(item.category, expenseCategories)}
                                                        {item.source === 'inventory' && <span style={{ marginLeft: '6px', fontSize: '0.7rem', background: 'var(--blue-100, #dbeafe)', color: 'var(--blue-600, #2563eb)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>📦 Inventory</span>}
                                                    </td>
                                                    <td>{item.description || '—'}</td>
                                                    <td>{batch ? batch.name : '—'}</td>
                                                    <td>{item.quantity || 1}</td>
                                                    <td>{formatCurrency(item.unitCost || item.amount)}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--red-500)' }}>{formatCurrency(item.amount)}</td>
                                                    <td>
                                                        {item.source === 'inventory' ? (
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Manage in Inventory</span>
                                                        ) : (
                                                            <div className="table-actions">
                                                                <button className="btn-icon" onClick={() => handleEditExpense(item)}><Edit2 size={16} /></button>
                                                                <button className="btn-icon danger" onClick={() => handleDeleteExpense(item.id)}><Trash2 size={16} /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Revenue Tab */}
                {activeTab === 'revenue' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Revenue</h3>
                        </div>
                        {revenue.length === 0 ? (
                            <div className="card-body">
                                <div className="empty-state">
                                    <div className="empty-state-icon"><TrendingUp size={28} /></div>
                                    <h3>No revenue recorded</h3>
                                    <p>Record your sales to track income.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Category</th>
                                            <th>Customer</th>
                                            <th>Description</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                            <th>Total</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...revenue].sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
                                            const customer = customers.find(c => c.id === item.customerId);
                                            return (
                                                <tr key={item.id}>
                                                    <td>{formatDate(item.date)}</td>
                                                    <td>{getCategoryLabel(item.category, revenueCategories)}</td>
                                                    <td>{customer ? customer.name : '—'}</td>
                                                    <td>{item.description || '—'}</td>
                                                    <td>{item.quantity || 1}</td>
                                                    <td>{formatCurrency(item.unitCost || item.amount)}</td>
                                                    <td style={{ fontWeight: 600, color: 'var(--green-600)' }}>{formatCurrency(item.amount)}</td>
                                                    <td>
                                                        <div className="table-actions">
                                                            <button className="btn-icon" onClick={() => handleEditRevenue(item)}><Edit2 size={16} /></button>
                                                            <button className="btn-icon danger" onClick={() => handleDeleteRevenue(item.id)}><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Expense Modal */}
                <Modal
                    isOpen={showExpenseModal}
                    onClose={() => { setShowExpenseModal(false); setEditingItem(null); }}
                    title={editingItem ? 'Edit Expense' : 'Record Expense'}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="expenseForm">Save</button>
                        </>
                    }
                >
                    <form id="expenseForm" onSubmit={handleExpenseSubmit}>
                        <div className="form-group">
                            <label className="form-label">Category *</label>
                            <select className="form-input" required value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                                <option value="">Select category...</option>
                                <optgroup label="Batch Costs (Direct)">
                                    {expenseCategories.filter(c => c.type === 'batch').map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Farm Overhead">
                                    {expenseCategories.filter(c => c.type === 'farm').map(c => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        {isBatchExpense && (
                            <div className="form-group">
                                <label className="form-label">Batch</label>
                                <select className="form-input" value={expenseForm.batchId} onChange={e => setExpenseForm({ ...expenseForm, batchId: e.target.value })}>
                                    <option value="">Select batch (optional)...</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                <span className="form-hint">Link this expense to a specific batch for cost-per-bird tracking</span>
                            </div>
                        )}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Unit Cost (₦) *</label>
                                <input className="form-input" type="number" required value={expenseForm.unitCost} onChange={e => setExpenseForm({ ...expenseForm, unitCost: e.target.value })} placeholder="500" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input className="form-input" type="number" required min="1" value={expenseForm.quantity} onChange={e => setExpenseForm({ ...expenseForm, quantity: e.target.value })} placeholder="1" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Total Amount</label>
                                <div className="form-input" style={{ background: 'var(--slate-50)', fontWeight: 700, color: 'var(--red-500)' }}>
                                    {formatCurrency(Number(expenseForm.unitCost || 0) * Number(expenseForm.quantity || 1))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input className="form-input" type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input className="form-input" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="e.g., 2 bags of starter feed" />
                        </div>
                    </form>
                </Modal>

                {/* Revenue Modal */}
                <Modal
                    isOpen={showRevenueModal}
                    onClose={() => { setShowRevenueModal(false); setEditingItem(null); }}
                    title={editingItem ? 'Edit Revenue' : 'Record Revenue'}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowRevenueModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="revenueForm">Save</button>
                        </>
                    }
                >
                    <form id="revenueForm" onSubmit={handleRevenueSubmit}>
                        <div className="form-group">
                            <label className="form-label">Category *</label>
                            <select className="form-input" required value={revenueForm.category} onChange={e => setRevenueForm({ ...revenueForm, category: e.target.value })}>
                                <option value="">Select category...</option>
                                {revenueCategories.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>
                        {revenueForm.category === 'bird_sale' && (
                            <div className="form-group">
                                <label className="form-label">Batch</label>
                                <select className="form-input" value={revenueForm.batchId} onChange={e => { setRevenueForm({ ...revenueForm, batchId: e.target.value }); setSelectedMargin(''); }}>
                                    <option value="">Select batch (optional)...</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Bird Sale Info Card */}
                        {selectedBatchInfo && (
                            <div style={{ padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--slate-50)', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>🐔 Batch Info</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', background: selectedBatchInfo.ageBadgeColor, color: 'white' }}>
                                        {selectedBatchInfo.ageCategory}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Current Age</div>
                                        <strong>{selectedBatchInfo.ageWeeks}w {selectedBatchInfo.ageDays}d ({selectedBatchInfo.totalAgeDays} days)</strong>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Available Birds</div>
                                        <strong>{selectedBatchInfo.liveBirds}</strong>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Cost / Bird</div>
                                        <strong style={{ color: 'var(--red-500)' }}>{formatCurrency(Math.ceil(selectedBatchInfo.costPerBird))}</strong>
                                    </div>
                                </div>

                                {/* Profit Margin Selector */}
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Suggested selling price by profit margin:</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {profitMargins.map(m => {
                                            const price = Math.ceil(selectedBatchInfo.costPerBird * (1 + m.value / 100));
                                            return (
                                                <button
                                                    key={m.value}
                                                    type="button"
                                                    onClick={() => applySuggestedPrice(m.value)}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: 'var(--radius-sm)', border: selectedMargin === String(m.value) ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                                        background: selectedMargin === String(m.value) ? 'var(--primary-light)' : 'white', cursor: 'pointer', fontSize: '0.75rem', textAlign: 'center', lineHeight: '1.3',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700 }}>{formatCurrency(price)}</div>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>+{m.label}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Unit Price (₦) *</label>
                                <input className="form-input" type="number" required value={revenueForm.unitCost} onChange={e => { setRevenueForm({ ...revenueForm, unitCost: e.target.value }); setSelectedMargin(''); }} placeholder="2500" />
                                {selectedBatchInfo && revenueForm.unitCost && Number(revenueForm.unitCost) > 0 && (
                                    <span className="form-hint" style={{ color: Number(revenueForm.unitCost) > selectedBatchInfo.costPerBird ? 'var(--green-600)' : 'var(--red-500)' }}>
                                        Margin: {((Number(revenueForm.unitCost) - selectedBatchInfo.costPerBird) / selectedBatchInfo.costPerBird * 100).toFixed(1)}%
                                        ({formatCurrency(Number(revenueForm.unitCost) - Math.ceil(selectedBatchInfo.costPerBird))} profit/bird)
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input className="form-input" type="number" required min="1" max={selectedBatchInfo ? selectedBatchInfo.liveBirds : undefined} value={revenueForm.quantity} onChange={e => setRevenueForm({ ...revenueForm, quantity: e.target.value })} placeholder="10" />
                                {selectedBatchInfo && <span className="form-hint">{selectedBatchInfo.liveBirds} birds available</span>}
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Total Amount</label>
                                <div className="form-input" style={{ background: 'var(--slate-50)', fontWeight: 700, color: 'var(--green-600)' }}>
                                    {formatCurrency(Number(revenueForm.unitCost || 0) * Number(revenueForm.quantity || 1))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input className="form-input" type="date" required value={revenueForm.date} onChange={e => setRevenueForm({ ...revenueForm, date: e.target.value })} />
                            </div>
                        </div>
                        {revenueForm.category === 'bird_sale' && (
                            <div className="form-group">
                                <label className="form-label">Price per kg (₦)</label>
                                <input className="form-input" type="number" value={revenueForm.pricePerKg} onChange={e => setRevenueForm({ ...revenueForm, pricePerKg: e.target.value })} placeholder="2500" />
                                <span className="form-hint">Optional — for reference only</span>
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Customer</label>
                            <select className="form-input" value={revenueForm.customerId} onChange={e => setRevenueForm({ ...revenueForm, customerId: e.target.value })}>
                                <option value="">No customer linked</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <span className="form-hint">Link this sale to a customer for purchase history tracking</span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <input className="form-input" value={revenueForm.description} onChange={e => setRevenueForm({ ...revenueForm, description: e.target.value })} placeholder="e.g., Sold 20 birds to Alhaji Musa" />
                        </div>
                    </form>
                </Modal>
            </div>
        </>
    );
}
