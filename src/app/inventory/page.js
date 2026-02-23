'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import {
    Plus, Edit2, Trash2, Warehouse, AlertTriangle, ShoppingCart, Utensils, Loader2
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem, TABLES } from '@/lib/supabase-storage';
import { formatDate, formatNumber, formatCurrency } from '@/lib/utils';

export default function InventoryPage() {
    const [feedPurchases, setFeedPurchases] = useState([]);
    const [feedConsumption, setFeedConsumption] = useState([]);
    const [batches, setBatches] = useState([]);
    const [allBatches, setAllBatches] = useState([]);
    const [activeTab, setActiveTab] = useState('purchases');
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [showConsumptionModal, setShowConsumptionModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [purchaseForm, setPurchaseForm] = useState({ feedType: '', quantity: '', unitCost: '', bags: '1', supplier: '', batchId: '', date: '' });
    const [consumptionForm, setConsumptionForm] = useState({ batchId: '', quantity: '', feedType: '', date: '' });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [purchases, consumption, allB] = await Promise.all([
            getItems(TABLES.FEED_PURCHASES),
            getItems(TABLES.FEED_CONSUMPTION),
            getItems(TABLES.BATCHES),
        ]);
        setFeedPurchases(purchases);
        setFeedConsumption(consumption);
        setAllBatches(allB);
        setBatches(allB.filter(b => b.status !== 'Sold'));
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const totalBought = feedPurchases.reduce((s, f) => s + Number(f.quantity), 0);
    const totalUsed = feedConsumption.reduce((s, f) => s + Number(f.quantity), 0);
    const feedStock = totalBought - totalUsed;
    const totalFeedCost = feedPurchases.reduce((s, f) => s + Number(f.cost), 0);

    const handlePurchaseSubmit = async (e) => {
        e.preventDefault();
        const totalCost = Number(purchaseForm.unitCost) * Number(purchaseForm.bags || 1);
        const purchaseData = { ...purchaseForm, cost: totalCost };
        if (editingItem) {
            await updateItem(TABLES.FEED_PURCHASES, editingItem.id, purchaseData);
            // Update linked expense
            if (editingItem.linkedExpenseId) {
                await updateItem(TABLES.EXPENSES, editingItem.linkedExpenseId, {
                    category: 'feed', unitCost: purchaseForm.unitCost, quantity: purchaseForm.bags || '1',
                    amount: totalCost, description: `${purchaseForm.feedType} feed — ${purchaseForm.quantity}kg (${purchaseForm.bags || 1} bags)`,
                    batchId: purchaseForm.batchId || '', date: purchaseForm.date, source: 'inventory'
                });
            }
        } else {
            // Create auto-linked expense
            const expenseEntry = await addItem(TABLES.EXPENSES, {
                category: 'feed', unitCost: purchaseForm.unitCost, quantity: purchaseForm.bags || '1',
                amount: totalCost, description: `${purchaseForm.feedType} feed — ${purchaseForm.quantity}kg (${purchaseForm.bags || 1} bags)`,
                batchId: purchaseForm.batchId || '', date: purchaseForm.date, source: 'inventory'
            });
            purchaseData.linkedExpenseId = expenseEntry?.id || '';
            await addItem(TABLES.FEED_PURCHASES, purchaseData);
        }
        setShowPurchaseModal(false);
        setEditingItem(null);
        setPurchaseForm({ feedType: '', quantity: '', unitCost: '', bags: '1', supplier: '', batchId: '', date: '' });
        await loadData();
    };

    const handleConsumptionSubmit = async (e) => {
        e.preventDefault();
        await addItem(TABLES.FEED_CONSUMPTION, consumptionForm);
        setShowConsumptionModal(false);
        setConsumptionForm({ batchId: '', quantity: '', feedType: '', date: '' });
        await loadData();
    };

    const handleEditPurchase = (item) => {
        setEditingItem(item);
        setPurchaseForm({
            feedType: item.feedType, quantity: item.quantity,
            unitCost: item.unitCost || item.cost || '', bags: item.bags || '1',
            supplier: item.supplier || '', batchId: item.batchId || '', date: item.date
        });
        setShowPurchaseModal(true);
    };

    const handleDeletePurchase = async (id) => {
        if (confirm('Delete this purchase record? The linked expense will also be removed.')) {
            const purchase = feedPurchases.find(p => p.id === id);
            if (purchase?.linkedExpenseId) {
                await deleteItem(TABLES.EXPENSES, purchase.linkedExpenseId);
            }
            await deleteItem(TABLES.FEED_PURCHASES, id);
            await loadData();
        }
    };

    const handleDeleteConsumption = async (id) => {
        if (confirm('Delete this consumption record?')) {
            await deleteItem(TABLES.FEED_CONSUMPTION, id);
            await loadData();
        }
    };

    if (loading) {
        return (
            <>
                <Header title="Feed & Inventory" subtitle="Track feed purchases, consumption, and stock levels" />
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <Loader2 size={32} className="spinner" />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Feed & Inventory" subtitle="Track feed purchases, consumption, and stock levels" />
            <div className="page-content">
                {/* Stock Summary */}
                <div className="stats-grid">
                    <div className={`stat-card ${feedStock < 50 ? 'red' : 'green'}`}>
                        <div className="stat-card-header">
                            <span className="stat-card-label">Current Stock</span>
                            <div className="stat-card-icon"><Warehouse size={20} /></div>
                        </div>
                        <div className="stat-card-value">{formatNumber(feedStock)} kg</div>
                        <div className="stat-card-detail">{feedStock < 50 ? '⚠️ Low stock — reorder soon!' : 'Sufficient stock'}</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Total Purchased</span>
                            <div className="stat-card-icon"><ShoppingCart size={20} /></div>
                        </div>
                        <div className="stat-card-value">{formatNumber(totalBought)} kg</div>
                        <div className="stat-card-detail">{formatCurrency(totalFeedCost)} total spent</div>
                    </div>
                    <div className="stat-card amber">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Total Consumed</span>
                            <div className="stat-card-icon"><Utensils size={20} /></div>
                        </div>
                        <div className="stat-card-value">{formatNumber(totalUsed)} kg</div>
                        <div className="stat-card-detail">Across all batches</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="action-bar">
                    <button className="btn btn-primary" onClick={() => {
                        setEditingItem(null);
                        setPurchaseForm({ ...purchaseForm, date: new Date().toISOString().split('T')[0] });
                        setShowPurchaseModal(true);
                    }}>
                        <Plus size={16} /> Log Purchase
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                        setConsumptionForm({ ...consumptionForm, date: new Date().toISOString().split('T')[0] });
                        setShowConsumptionModal(true);
                    }}>
                        <Utensils size={16} /> Log Consumption
                    </button>
                </div>

                {/* Tabs */}
                <div className="tabs">
                    <button className={`tab ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>Purchases</button>
                    <button className={`tab ${activeTab === 'consumption' ? 'active' : ''}`} onClick={() => setActiveTab('consumption')}>Consumption</button>
                </div>

                {/* Purchases Tab */}
                {activeTab === 'purchases' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Feed Purchases</h3>
                        </div>
                        {feedPurchases.length === 0 ? (
                            <div className="card-body">
                                <div className="empty-state">
                                    <div className="empty-state-icon"><ShoppingCart size={28} /></div>
                                    <h3>No purchases yet</h3>
                                    <p>Log your first feed purchase to start tracking inventory.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Feed Type</th>
                                            <th>Quantity (kg)</th>
                                            <th>Cost</th>
                                            <th>Supplier</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...feedPurchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => (
                                            <tr key={item.id}>
                                                <td>{formatDate(item.date)}</td>
                                                <td>{item.feedType || '—'}</td>
                                                <td>{formatNumber(item.quantity)}</td>
                                                <td>{formatCurrency(item.cost)}</td>
                                                <td>{item.supplier || '—'}</td>
                                                <td>
                                                    <div className="table-actions">
                                                        <button className="btn-icon" onClick={() => handleEditPurchase(item)}><Edit2 size={16} /></button>
                                                        <button className="btn-icon danger" onClick={() => handleDeletePurchase(item.id)}><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Consumption Tab */}
                {activeTab === 'consumption' && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Feed Consumption</h3>
                        </div>
                        {feedConsumption.length === 0 ? (
                            <div className="card-body">
                                <div className="empty-state">
                                    <div className="empty-state-icon"><Utensils size={28} /></div>
                                    <h3>No consumption logged</h3>
                                    <p>Start logging daily feed consumption per batch.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Batch</th>
                                            <th>Feed Type</th>
                                            <th>Quantity (kg)</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...feedConsumption].sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
                                            const batch = allBatches.find(b => b.id === item.batchId);
                                            return (
                                                <tr key={item.id}>
                                                    <td>{formatDate(item.date)}</td>
                                                    <td>{batch ? batch.name : '—'}</td>
                                                    <td>{item.feedType || '—'}</td>
                                                    <td>{formatNumber(item.quantity)}</td>
                                                    <td>
                                                        <button className="btn-icon danger" onClick={() => handleDeleteConsumption(item.id)}><Trash2 size={16} /></button>
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

                {/* Purchase Modal */}
                <Modal
                    isOpen={showPurchaseModal}
                    onClose={() => { setShowPurchaseModal(false); setEditingItem(null); }}
                    title={editingItem ? 'Edit Purchase' : 'Log Feed Purchase'}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowPurchaseModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="purchaseForm">Save</button>
                        </>
                    }
                >
                    <form id="purchaseForm" onSubmit={handlePurchaseSubmit}>
                        <div className="form-group">
                            <label className="form-label">Feed Type *</label>
                            <select className="form-input" required value={purchaseForm.feedType} onChange={e => setPurchaseForm({ ...purchaseForm, feedType: e.target.value })}>
                                <option value="">Select type...</option>
                                <option value="Starter">Starter</option>
                                <option value="Grower">Grower</option>
                                <option value="Finisher">Finisher</option>
                                <option value="Pre-starter">Pre-starter</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Total Quantity (kg) *</label>
                                <input className="form-input" type="number" step="0.5" required value={purchaseForm.quantity} onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} placeholder="25" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Number of Bags *</label>
                                <input className="form-input" type="number" required min="1" value={purchaseForm.bags} onChange={e => setPurchaseForm({ ...purchaseForm, bags: e.target.value })} placeholder="1" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Cost per Bag (₦) *</label>
                                <input className="form-input" type="number" required value={purchaseForm.unitCost} onChange={e => setPurchaseForm({ ...purchaseForm, unitCost: e.target.value })} placeholder="15000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Cost</label>
                                <div className="form-input" style={{ background: 'var(--slate-50)', fontWeight: 700, color: 'var(--red-500)' }}>
                                    {formatCurrency(Number(purchaseForm.unitCost || 0) * Number(purchaseForm.bags || 1))}
                                </div>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input className="form-input" type="date" required value={purchaseForm.date} onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Supplier</label>
                                <input className="form-input" value={purchaseForm.supplier} onChange={e => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })} placeholder="e.g., CHI Feeds" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Link to Batch (optional)</label>
                            <select className="form-input" value={purchaseForm.batchId} onChange={e => setPurchaseForm({ ...purchaseForm, batchId: e.target.value })}>
                                <option value="">No batch (general feed)</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <span className="form-hint">This expense will be linked to the selected batch</span>
                        </div>
                    </form>
                </Modal>

                {/* Consumption Modal */}
                <Modal
                    isOpen={showConsumptionModal}
                    onClose={() => setShowConsumptionModal(false)}
                    title="Log Feed Consumption"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowConsumptionModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="consumptionForm">Save</button>
                        </>
                    }
                >
                    <form id="consumptionForm" onSubmit={handleConsumptionSubmit}>
                        <div className="form-group">
                            <label className="form-label">Batch *</label>
                            <select className="form-input" required value={consumptionForm.batchId} onChange={e => setConsumptionForm({ ...consumptionForm, batchId: e.target.value })}>
                                <option value="">Select batch...</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Quantity (kg) *</label>
                                <input className="form-input" type="number" step="0.5" required value={consumptionForm.quantity} onChange={e => setConsumptionForm({ ...consumptionForm, quantity: e.target.value })} placeholder="5" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Feed Type</label>
                                <select className="form-input" value={consumptionForm.feedType} onChange={e => setConsumptionForm({ ...consumptionForm, feedType: e.target.value })}>
                                    <option value="">Select...</option>
                                    <option value="Starter">Starter</option>
                                    <option value="Grower">Grower</option>
                                    <option value="Finisher">Finisher</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input className="form-input" type="date" required value={consumptionForm.date} onChange={e => setConsumptionForm({ ...consumptionForm, date: e.target.value })} />
                        </div>
                    </form>
                </Modal>
            </div>
        </>
    );
}
