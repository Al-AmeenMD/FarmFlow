'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import {
    Users, Plus, Edit2, Trash2, Phone, MapPin, ShoppingBag, Search, Loader2
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem, TABLES } from '@/lib/supabase-storage';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [cust, rev] = await Promise.all([
            getItems(TABLES.CUSTOMERS),
            getItems(TABLES.REVENUE),
        ]);
        setCustomers(cust);
        setRevenue(rev);
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingItem) {
            await updateItem(TABLES.CUSTOMERS, editingItem.id, form);
        } else {
            await addItem(TABLES.CUSTOMERS, form);
        }
        setShowModal(false);
        setEditingItem(null);
        setForm({ name: '', phone: '', address: '', notes: '' });
        await loadData();
    };

    const handleEdit = (customer) => {
        setEditingItem(customer);
        setForm({ name: customer.name, phone: customer.phone || '', address: customer.address || '', notes: customer.notes || '' });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this customer?')) {
            await deleteItem(TABLES.CUSTOMERS, id);
            await loadData();
        }
    };

    const viewCustomer = (customer) => {
        setSelectedCustomer(customer);
        setShowDetailModal(true);
    };

    const getCustomerPurchases = (customerId) => {
        return revenue.filter(r => r.customerId === customerId).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const getCustomerTotalSpent = (customerId) => {
        return revenue.filter(r => r.customerId === customerId).reduce((s, r) => s + Number(r.amount), 0);
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery))
    );

    if (loading) {
        return (
            <>
                <Header title="Customers" subtitle="Manage buyers and track purchase history" />
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <Loader2 size={32} className="spinner" />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Customers" subtitle="Manage buyers and track purchase history" />
            <div className="page-content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card blue">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Total Customers</span>
                            <div className="stat-card-icon"><Users size={20} /></div>
                        </div>
                        <div className="stat-card-value">{customers.length}</div>
                        <div className="stat-card-detail">Registered buyers</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Total Sales Revenue</span>
                            <div className="stat-card-icon"><ShoppingBag size={20} /></div>
                        </div>
                        <div className="stat-card-value">{formatCurrency(revenue.reduce((s, r) => s + Number(r.amount), 0))}</div>
                        <div className="stat-card-detail">All-time from customers</div>
                    </div>
                    <div className="stat-card purple">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Top Buyer</span>
                            <div className="stat-card-icon"><Users size={20} /></div>
                        </div>
                        <div className="stat-card-value" style={{ fontSize: '1.2rem' }}>
                            {(() => {
                                if (customers.length === 0) return '—';
                                let top = customers[0];
                                let topAmt = 0;
                                customers.forEach(c => {
                                    const amt = getCustomerTotalSpent(c.id);
                                    if (amt > topAmt) { topAmt = amt; top = c; }
                                });
                                return topAmt > 0 ? top.name : '—';
                            })()}
                        </div>
                        <div className="stat-card-detail">By total purchases</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="action-bar">
                    <button className="btn btn-primary" onClick={() => { setEditingItem(null); setForm({ name: '', phone: '', address: '', notes: '' }); setShowModal(true); }}>
                        <Plus size={16} /> Add Customer
                    </button>
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            className="form-input"
                            placeholder="Search customers..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Customer List */}
                {filteredCustomers.length === 0 ? (
                    <div className="card">
                        <div className="card-body">
                            <div className="empty-state">
                                <div className="empty-state-icon"><Users size={28} /></div>
                                <h3>{searchQuery ? 'No customers found' : 'No customers yet'}</h3>
                                <p>{searchQuery ? 'Try a different search term.' : 'Add your first customer to start tracking buyers.'}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="customer-grid">
                        {filteredCustomers.map(customer => {
                            const purchases = getCustomerPurchases(customer.id);
                            const totalSpent = getCustomerTotalSpent(customer.id);
                            return (
                                <div key={customer.id} className="card customer-card" onClick={() => viewCustomer(customer)}>
                                    <div className="card-body">
                                        <div className="customer-card-top">
                                            <div>
                                                <h3 className="customer-name">{customer.name}</h3>
                                                {customer.phone && (
                                                    <div className="customer-info-row">
                                                        <Phone size={14} /> {customer.phone}
                                                    </div>
                                                )}
                                                {customer.address && (
                                                    <div className="customer-info-row">
                                                        <MapPin size={14} /> {customer.address}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="table-actions" onClick={e => e.stopPropagation()}>
                                                <button className="btn-icon" onClick={() => handleEdit(customer)}><Edit2 size={16} /></button>
                                                <button className="btn-icon danger" onClick={() => handleDelete(customer.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="customer-stats">
                                            <div>
                                                <div className="customer-stat-label">Total Purchases</div>
                                                <div className="customer-stat-value" style={{ color: 'var(--green-600)' }}>{formatCurrency(totalSpent)}</div>
                                            </div>
                                            <div>
                                                <div className="customer-stat-label">Orders</div>
                                                <div className="customer-stat-value">{purchases.length}</div>
                                            </div>
                                            {purchases[0] && (
                                                <div>
                                                    <div className="customer-stat-label">Last Purchase</div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatDate(purchases[0].date)}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add/Edit Modal */}
                <Modal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setEditingItem(null); }}
                    title={editingItem ? 'Edit Customer' : 'Add Customer'}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="customerForm">Save</button>
                        </>
                    }
                >
                    <form id="customerForm" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08012345678" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Location" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g., Prefers live birds" />
                        </div>
                    </form>
                </Modal>

                {/* Detail Modal */}
                <Modal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    title={selectedCustomer ? selectedCustomer.name : ''}
                >
                    {selectedCustomer && (() => {
                        const purchases = getCustomerPurchases(selectedCustomer.id);
                        const totalSpent = getCustomerTotalSpent(selectedCustomer.id);
                        return (
                            <div>
                                <div className="detail-grid">
                                    <div><span className="customer-stat-label">Phone</span><br /><strong>{selectedCustomer.phone || '—'}</strong></div>
                                    <div><span className="customer-stat-label">Address</span><br /><strong>{selectedCustomer.address || '—'}</strong></div>
                                    <div><span className="customer-stat-label">Total Spent</span><br /><strong style={{ color: 'var(--green-600)' }}>{formatCurrency(totalSpent)}</strong></div>
                                    <div><span className="customer-stat-label">Orders</span><br /><strong>{purchases.length}</strong></div>
                                </div>
                                {selectedCustomer.notes && (
                                    <div className="info-note">
                                        📝 {selectedCustomer.notes}
                                    </div>
                                )}
                                <h4 className="section-heading">Purchase History</h4>
                                {purchases.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No purchases linked to this customer yet.</p>
                                ) : (
                                    <div className="data-table-wrapper">
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Description</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {purchases.map(p => (
                                                    <tr key={p.id}>
                                                        <td>{formatDate(p.date)}</td>
                                                        <td>{p.description || '—'}</td>
                                                        <td style={{ fontWeight: 600, color: 'var(--green-600)' }}>{formatCurrency(p.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </Modal>
            </div>
        </>
    );
}
