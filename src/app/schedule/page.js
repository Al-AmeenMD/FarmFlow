'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import {
    Calendar, Plus, CheckCircle2, Clock, AlertTriangle,
    Trash2, Syringe, Pill, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { getItems, addItem, addItems, updateItem, deleteItem, TABLES } from '@/lib/supabase-storage';
import { formatDate } from '@/lib/utils';

const DEFAULT_BROILER_SCHEDULE = [
    { name: 'Marek\'s Disease Vaccine', targetDay: 1, type: 'vaccine', notes: 'Subcutaneous injection at hatchery' },
    { name: 'Newcastle (HB1/La Sota)', targetDay: 7, type: 'vaccine', notes: 'Eye drop or drinking water' },
    { name: 'Gumboro/IBD (1st dose)', targetDay: 14, type: 'vaccine', notes: 'Drinking water' },
    { name: 'Newcastle Booster', targetDay: 21, type: 'vaccine', notes: 'Drinking water' },
    { name: 'Gumboro/IBD (2nd dose)', targetDay: 28, type: 'vaccine', notes: 'Drinking water' },
    { name: 'Vitamins & Electrolytes', targetDay: 1, type: 'medication', notes: 'First 3 days — anti-stress' },
    { name: 'Coccidiostat / Anticoccidial', targetDay: 18, type: 'medication', notes: '3-5 day course' },
    { name: 'Dewormer', targetDay: 35, type: 'medication', notes: 'If needed' },
];

function getStatusInfo(entry, batchStartDate, batchAgeAtAcq) {
    if (entry.status === 'done') return { label: 'Completed', color: 'green', icon: CheckCircle2 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(batchStartDate);
    start.setHours(0, 0, 0, 0);
    const adjustedTarget = Math.max(0, entry.targetDay - (Number(batchAgeAtAcq) || 0));
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + adjustedTarget);
    const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: 'red', icon: AlertTriangle };
    if (diffDays <= 2) return { label: diffDays === 0 ? 'Due today' : `Due in ${diffDays}d`, color: 'amber', icon: Clock };
    return { label: `In ${diffDays} days`, color: 'blue', icon: Clock };
}

function getDueDate(entry, batchStartDate, batchAgeAtAcq) {
    const start = new Date(batchStartDate);
    const adjustedTarget = Math.max(0, entry.targetDay - (Number(batchAgeAtAcq) || 0));
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + adjustedTarget);
    return dueDate.toISOString().split('T')[0];
}

export default function SchedulePage() {
    const [vaccinations, setVaccinations] = useState([]);
    const [batches, setBatches] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [expandedBatch, setExpandedBatch] = useState(null);
    const [form, setForm] = useState({ batchId: '', name: '', targetDay: '', type: 'vaccine', notes: '' });
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [vax, bat] = await Promise.all([
            getItems(TABLES.VACCINATIONS),
            getItems(TABLES.BATCHES),
        ]);
        setVaccinations(vax);
        setBatches(bat.filter(b => b.status !== 'Sold'));
        setLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await addItem(TABLES.VACCINATIONS, { ...form, status: 'pending' });
        setShowModal(false);
        setForm({ batchId: '', name: '', targetDay: '', type: 'vaccine', notes: '' });
        await loadData();
    };

    const applyTemplate = async (batchId) => {
        const items = DEFAULT_BROILER_SCHEDULE.map(item => ({
            ...item,
            batchId,
            status: 'pending',
        }));
        await addItems(TABLES.VACCINATIONS, items);
        setShowTemplateModal(false);
        await loadData();
    };

    const toggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'done' ? 'pending' : 'done';
        await updateItem(TABLES.VACCINATIONS, id, { status: newStatus, completedDate: newStatus === 'done' ? new Date().toISOString().split('T')[0] : null });
        await loadData();
    };

    const handleDelete = async (id) => {
        await deleteItem(TABLES.VACCINATIONS, id);
        await loadData();
    };

    // Count pending/overdue
    const getAlerts = () => {
        const alerts = [];
        batches.forEach(batch => {
            const batchVax = vaccinations.filter(v => v.batchId === batch.id && v.status !== 'done');
            batchVax.forEach(v => {
                const status = getStatusInfo(v, batch.startDate, batch.ageAtAcquisition);
                if (status.color === 'red' || status.color === 'amber') {
                    alerts.push({ batchName: batch.name, vaxName: v.name, ...status });
                }
            });
        });
        return alerts;
    };
    const alerts = getAlerts();

    // Group by batch
    const batchesWithSchedule = batches.map(batch => {
        const entries = vaccinations
            .filter(v => v.batchId === batch.id)
            .sort((a, b) => a.targetDay - b.targetDay);
        const completed = entries.filter(e => e.status === 'done').length;
        return { ...batch, entries, completed, total: entries.length };
    });

    if (loading) {
        return (
            <>
                <Header title="Health Schedule" subtitle="Vaccination & medication tracking" />
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <Loader2 size={32} className="spinner" />
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Health Schedule" subtitle="Vaccination & medication tracking" />
            <div className="page-content">
                {/* Alerts */}
                {alerts.length > 0 && (
                    <div className="alert-cards">
                        {alerts.slice(0, 4).map((alert, i) => (
                            <div key={i} className={`alert-card ${alert.color === 'red' ? 'danger' : 'warning'}`}>
                                <AlertTriangle size={18} />
                                <span><strong>{alert.batchName}:</strong> {alert.vaxName} — {alert.label}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card green">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Completed</span>
                            <div className="stat-card-icon"><CheckCircle2 size={20} /></div>
                        </div>
                        <div className="stat-card-value">{vaccinations.filter(v => v.status === 'done').length}</div>
                        <div className="stat-card-detail">Vaccinations/meds given</div>
                    </div>
                    <div className="stat-card amber">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Pending</span>
                            <div className="stat-card-icon"><Clock size={20} /></div>
                        </div>
                        <div className="stat-card-value">{vaccinations.filter(v => v.status !== 'done').length}</div>
                        <div className="stat-card-detail">Upcoming items</div>
                    </div>
                    <div className="stat-card red">
                        <div className="stat-card-header">
                            <span className="stat-card-label">Overdue</span>
                            <div className="stat-card-icon"><AlertTriangle size={20} /></div>
                        </div>
                        <div className="stat-card-value">{alerts.filter(a => a.color === 'red').length}</div>
                        <div className="stat-card-detail">Needs attention</div>
                    </div>
                </div>

                {/* Actions */}
                <div className="action-bar">
                    <button className="btn btn-primary" onClick={() => { setForm({ ...form, batchId: batches[0]?.id || '' }); setShowModal(true); }}>
                        <Plus size={16} /> Add Entry
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowTemplateModal(true)}>
                        <Syringe size={16} /> Apply Broiler Template
                    </button>
                </div>

                {/* Schedule by Batch */}
                {batchesWithSchedule.length === 0 ? (
                    <div className="card">
                        <div className="card-body">
                            <div className="empty-state">
                                <div className="empty-state-icon"><Calendar size={28} /></div>
                                <h3>No active batches</h3>
                                <p>Create a batch first, then add vaccinations and medication schedules.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {batchesWithSchedule.map(batch => (
                            <div key={batch.id} className="card">
                                <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <h3 className="card-title">{batch.name}</h3>
                                        <span className="badge green">{batch.completed}/{batch.total} done</span>
                                    </div>
                                    {expandedBatch === batch.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                                {(expandedBatch === batch.id || batch.entries.length === 0) && (
                                    <div>
                                        {batch.entries.length === 0 ? (
                                            <div className="card-body" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                No schedule entries yet. Use &quot;Apply Broiler Template&quot; or add entries manually.
                                            </div>
                                        ) : (
                                            <div className="data-table-wrapper">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: '40px' }}></th>
                                                            <th>Treatment</th>
                                                            <th>Type</th>
                                                            <th>Day</th>
                                                            <th>Due Date</th>
                                                            <th>Status</th>
                                                            <th>Notes</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {batch.entries.map(entry => {
                                                            const status = getStatusInfo(entry, batch.startDate, batch.ageAtAcquisition);
                                                            const StatusIcon = status.icon;
                                                            const dueDate = getDueDate(entry, batch.startDate, batch.ageAtAcquisition);
                                                            return (
                                                                <tr key={entry.id} style={{ opacity: entry.status === 'done' ? 0.6 : 1 }}>
                                                                    <td>
                                                                        <button
                                                                            className="btn-icon"
                                                                            onClick={() => toggleStatus(entry.id, entry.status)}
                                                                            style={{ border: 'none', color: entry.status === 'done' ? 'var(--green-500)' : 'var(--slate-300)' }}
                                                                            title={entry.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                                                                        >
                                                                            <CheckCircle2 size={20} />
                                                                        </button>
                                                                    </td>
                                                                    <td style={{ fontWeight: 600, textDecoration: entry.status === 'done' ? 'line-through' : 'none' }}>
                                                                        {entry.type === 'vaccine' ? '💉' : '💊'} {entry.name}
                                                                    </td>
                                                                    <td><span className={`badge ${entry.type === 'vaccine' ? 'blue' : 'amber'}`}>{entry.type === 'vaccine' ? 'Vaccine' : 'Medication'}</span></td>
                                                                    <td>Day {entry.targetDay}</td>
                                                                    <td>{formatDate(dueDate)}</td>
                                                                    <td>
                                                                        <span className={`badge ${status.color}`}>
                                                                            <StatusIcon size={12} /> {status.label}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{entry.notes || '—'}</td>
                                                                    <td>
                                                                        <button className="btn-icon danger" onClick={() => handleDelete(entry.id)}>
                                                                            <Trash2 size={16} />
                                                                        </button>
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
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Entry Modal */}
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title="Add Schedule Entry"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="scheduleForm">Save</button>
                        </>
                    }
                >
                    <form id="scheduleForm" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Batch *</label>
                            <select className="form-input" required value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                                <option value="">Select batch...</option>
                                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Treatment Name *</label>
                            <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Newcastle Vaccine" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Type *</label>
                                <select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    <option value="vaccine">Vaccine</option>
                                    <option value="medication">Medication</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Target Day *</label>
                                <input className="form-input" type="number" required min="1" value={form.targetDay} onChange={e => setForm({ ...form, targetDay: e.target.value })} placeholder="7" />
                                <span className="form-hint">Day of life (e.g., 7 = day 7)</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g., Via drinking water" />
                        </div>
                    </form>
                </Modal>

                {/* Apply Template Modal */}
                <Modal
                    isOpen={showTemplateModal}
                    onClose={() => setShowTemplateModal(false)}
                    title="Apply Broiler Vaccination Template"
                >
                    <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        This will add the standard broiler vaccination & medication schedule to a batch. Due dates are auto-calculated from the batch start date.
                    </p>
                    <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)' }}>
                        {DEFAULT_BROILER_SCHEDULE.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < DEFAULT_BROILER_SCHEDULE.length - 1 ? '1px solid var(--border-color)' : 'none', fontSize: '0.85rem' }}>
                                <span>{item.type === 'vaccine' ? '💉' : '💊'} {item.name}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>Day {item.targetDay}</span>
                            </div>
                        ))}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Select Batch</label>
                        <select className="form-input" id="templateBatch" defaultValue="">
                            <option value="">Select batch...</option>
                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                        <button className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => {
                            const batchId = document.getElementById('templateBatch').value;
                            if (batchId) applyTemplate(batchId);
                        }}>
                            <Syringe size={16} /> Apply Template
                        </button>
                    </div>
                </Modal>
            </div>
        </>
    );
}
