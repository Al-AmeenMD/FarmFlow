'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import {
    Plus, Edit2, Trash2, Bird, Scale, Skull, Eye, X, Camera, ImageIcon, Loader2
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem, TABLES } from '@/lib/supabase-storage';
import {
    formatDate, formatNumber, formatCurrency, daysBetween,
    calculateMortalityRate, getBatchStatus, getBatchStatusBadge
} from '@/lib/utils';

const initialBatchForm = {
    name: '', breed: '', quantity: '', startDate: '', pen: '', targetWeight: '', costPerChick: '', ageAtAcquisition: '0', notes: ''
};

function getBatchAge(batch) {
    const daysSinceStart = daysBetween(batch.startDate);
    const ageAtAcq = Number(batch.ageAtAcquisition || 0);
    return daysSinceStart + ageAtAcq;
}

function formatAge(totalDays) {
    if (totalDays < 7) return `${totalDays} days`;
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    return days > 0 ? `${weeks}w ${days}d (${totalDays}d)` : `${weeks} weeks (${totalDays}d)`;
}

export default function BatchesPage() {
    const [batches, setBatches] = useState([]);
    const [mortalityLogs, setMortalityLogs] = useState([]);
    const [weightLogs, setWeightLogs] = useState([]);
    const [revenue, setRevenue] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showMortalityModal, setShowMortalityModal] = useState(false);
    const [showWeightModal, setShowWeightModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [form, setForm] = useState(initialBatchForm);
    const [mortalityForm, setMortalityForm] = useState({ batchId: '', quantity: '', cause: '', date: '' });
    const [weightForm, setWeightForm] = useState({ batchId: '', avgWeight: '', sampleSize: '', date: '' });
    const [photoLogs, setPhotoLogs] = useState([]);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [photoCaption, setPhotoCaption] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [batchesData, mortalityData, weightData, photoData, revenueData] = await Promise.all([
                getItems(TABLES.BATCHES),
                getItems(TABLES.MORTALITY_LOGS),
                getItems(TABLES.WEIGHT_LOGS),
                getItems(TABLES.PHOTO_LOGS),
                getItems(TABLES.REVENUE),
            ]);
            setBatches(batchesData);
            setMortalityLogs(mortalityData);
            setWeightLogs(weightData);
            setPhotoLogs(photoData);
            setRevenue(revenueData);
        } catch (err) {
            console.error('Batches loadData error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (editingBatch) {
            await updateItem(TABLES.BATCHES, editingBatch.id, { ...form, status: editingBatch.status || getBatchStatus(form) });
        } else {
            const ageAtAcq = Number(form.ageAtAcquisition || 0);
            const initialStatus = ageAtAcq >= 7 ? 'Growing' : 'Day-old';
            await addItem(TABLES.BATCHES, { ...form, status: initialStatus });
        }
        setShowModal(false);
        setEditingBatch(null);
        setForm(initialBatchForm);
        await loadData();
    };

    const handleEdit = (batch) => {
        setEditingBatch(batch);
        setForm({
            name: batch.name, breed: batch.breed, quantity: batch.quantity,
            startDate: batch.startDate, pen: batch.pen, targetWeight: batch.targetWeight || '',
            costPerChick: batch.costPerChick || '', ageAtAcquisition: batch.ageAtAcquisition || '0', notes: batch.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this batch?')) {
            await deleteItem(TABLES.BATCHES, id);
            await loadData();
        }
    };

    const handleStatusChange = async (batch, newStatus) => {
        await updateItem(TABLES.BATCHES, batch.id, { status: newStatus });
        await loadData();
    };

    const handleMortalitySubmit = async (e) => {
        e.preventDefault();
        await addItem(TABLES.MORTALITY_LOGS, mortalityForm);
        setShowMortalityModal(false);
        setMortalityForm({ batchId: '', quantity: '', cause: '', date: '' });
        await loadData();
    };

    const handleWeightSubmit = async (e) => {
        e.preventDefault();
        await addItem(TABLES.WEIGHT_LOGS, weightForm);
        setShowWeightModal(false);
        setWeightForm({ batchId: '', avgWeight: '', sampleSize: '', date: '' });
        await loadData();
    };

    const getBatchLiveBirds = (batch) => {
        const deaths = mortalityLogs
            .filter(m => m.batchId === batch.id)
            .reduce((s, m) => s + Number(m.quantity), 0);
        const sold = revenue
            .filter(r => r.batchId === batch.id && r.category === 'bird_sale')
            .reduce((s, r) => s + Number(r.quantity || 0), 0);
        return Number(batch.quantity) - deaths - sold;
    };

    const getBatchMortality = (batch) => {
        const deaths = mortalityLogs
            .filter(m => m.batchId === batch.id)
            .reduce((s, m) => s + Number(m.quantity), 0);
        return deaths;
    };

    const getLatestWeight = (batchId) => {
        const logs = weightLogs.filter(w => w.batchId === batchId);
        if (logs.length === 0) return null;
        return logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    };

    const viewBatchDetail = (batch) => {
        setSelectedBatch(batch);
        setShowDetailModal(true);
    };

    const handlePhotoUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBatch) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            await addItem(TABLES.PHOTO_LOGS, {
                batchId: selectedBatch.id,
                photo: ev.target.result,
                caption: photoCaption,
                date: new Date().toISOString().split('T')[0],
            });
            setPhotoCaption('');
            setShowPhotoModal(false);
            await loadData();
        };
        reader.readAsDataURL(file);
    };

    const deletePhoto = async (id) => {
        await deleteItem(TABLES.PHOTO_LOGS, id);
        await loadData();
    };

    const activeBatches = batches.filter(b => b.status !== 'Sold');
    const soldBatches = batches.filter(b => b.status === 'Sold');

    if (loading) {
        return (
            <>
                <Header title="Batch Management" subtitle="Track your broiler batches from acquisition to sale" />
                <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                        <p>Loading batches...</p>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Header title="Batch Management" subtitle="Track your broiler batches from acquisition to sale" />
            <div className="page-content">
                {/* Action Buttons */}
                <div className="action-bar">
                    <button className="btn btn-primary" onClick={() => { setEditingBatch(null); setForm(initialBatchForm); setShowModal(true); }}>
                        <Plus size={16} /> New Batch
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                        setMortalityForm({ ...mortalityForm, date: new Date().toISOString().split('T')[0] });
                        setShowMortalityModal(true);
                    }}>
                        <Skull size={16} /> Record Mortality
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                        setWeightForm({ ...weightForm, date: new Date().toISOString().split('T')[0] });
                        setShowWeightModal(true);
                    }}>
                        <Scale size={16} /> Log Weight
                    </button>
                </div>

                {/* Active Batches */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div className="card-header">
                        <h3 className="card-title">Active Batches ({activeBatches.length})</h3>
                    </div>
                    {activeBatches.length === 0 ? (
                        <div className="card-body">
                            <div className="empty-state">
                                <div className="empty-state-icon"><Bird size={28} /></div>
                                <h3>No active batches</h3>
                                <p>Create your first batch to start tracking your broilers.</p>
                                <button className="btn btn-primary" onClick={() => { setEditingBatch(null); setForm(initialBatchForm); setShowModal(true); }}>
                                    <Plus size={16} /> Create Batch
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Batch Name</th>
                                        <th>Breed</th>
                                        <th>Birds (Live)</th>
                                        <th>Age (Days)</th>
                                        <th>Status</th>
                                        <th>Mortality</th>
                                        <th>Last Weight</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeBatches.map(batch => {
                                        const liveBirds = getBatchLiveBirds(batch);
                                        const deaths = getBatchMortality(batch);
                                        const age = getBatchAge(batch);
                                        const latestWeight = getLatestWeight(batch.id);
                                        const status = batch.status || getBatchStatus(batch);
                                        return (
                                            <tr key={batch.id}>
                                                <td style={{ fontWeight: 600 }}>{batch.name}</td>
                                                <td>{batch.breed || '—'}</td>
                                                <td>{liveBirds} / {batch.quantity}</td>
                                                <td>{formatAge(age)}</td>
                                                <td>
                                                    <select
                                                        className="form-input"
                                                        style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}
                                                        value={status}
                                                        onChange={(e) => handleStatusChange(batch, e.target.value)}
                                                    >
                                                        <option value="Day-old">Day-old</option>
                                                        <option value="Growing">Growing</option>
                                                        <option value="Ready">Ready for Sale</option>
                                                        <option value="Sold">Sold</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <span style={{ color: deaths > 0 ? 'var(--red-500)' : 'var(--green-600)' }}>
                                                        {deaths} ({calculateMortalityRate(deaths, batch.quantity)}%)
                                                    </span>
                                                </td>
                                                <td>{latestWeight ? `${latestWeight.avgWeight} kg` : '—'}</td>
                                                <td>
                                                    <div className="table-actions">
                                                        <button className="btn-icon" title="View Details" onClick={() => viewBatchDetail(batch)}><Eye size={16} /></button>
                                                        <button className="btn-icon" title="Edit" onClick={() => handleEdit(batch)}><Edit2 size={16} /></button>
                                                        <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(batch.id)}><Trash2 size={16} /></button>
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

                {/* Sold Batches */}
                {soldBatches.length > 0 && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Sold Batches ({soldBatches.length})</h3>
                        </div>
                        <div className="data-table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Batch Name</th>
                                        <th>Breed</th>
                                        <th>Initial Qty</th>
                                        <th>Duration</th>
                                        <th>Mortality</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {soldBatches.map(batch => {
                                        const deaths = getBatchMortality(batch);
                                        return (
                                            <tr key={batch.id}>
                                                <td style={{ fontWeight: 600 }}>{batch.name}</td>
                                                <td>{batch.breed || '—'}</td>
                                                <td>{batch.quantity}</td>
                                                <td>{formatAge(getBatchAge(batch))}</td>
                                                <td>{deaths} ({calculateMortalityRate(deaths, batch.quantity)}%)</td>
                                                <td>
                                                    <button className="btn-icon" onClick={() => viewBatchDetail(batch)}><Eye size={16} /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* New/Edit Batch Modal */}
                <Modal
                    isOpen={showModal}
                    onClose={() => { setShowModal(false); setEditingBatch(null); }}
                    title={editingBatch ? 'Edit Batch' : 'New Batch'}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="batchForm">Save</button>
                        </>
                    }
                >
                    <form id="batchForm" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Batch Name *</label>
                            <input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Batch #1 - Feb 2026" />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Breed</label>
                                <input className="form-input" value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="e.g., Cobb 500" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input className="form-input" type="number" required min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="100" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Date Acquired *</label>
                                <input className="form-input" type="date" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age at Acquisition (days)</label>
                                <input className="form-input" type="number" min="0" value={form.ageAtAcquisition} onChange={e => setForm({ ...form, ageAtAcquisition: e.target.value })} placeholder="0" />
                                <span className="form-hint">0 for day-old, 7 for 1 week, 14 for 2 weeks</span>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Pen / House</label>
                                <input className="form-input" value={form.pen} onChange={e => setForm({ ...form, pen: e.target.value })} placeholder="e.g., Pen A" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cost per Chick (₦)</label>
                                <input className="form-input" type="number" value={form.costPerChick} onChange={e => setForm({ ...form, costPerChick: e.target.value })} placeholder="350" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Target Weight (kg)</label>
                                <input className="form-input" type="number" step="0.1" value={form.targetWeight} onChange={e => setForm({ ...form, targetWeight: e.target.value })} placeholder="2.5" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-input" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
                        </div>
                    </form>
                </Modal>

                {/* Mortality Modal */}
                <Modal
                    isOpen={showMortalityModal}
                    onClose={() => setShowMortalityModal(false)}
                    title="Record Mortality"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowMortalityModal(false)}>Cancel</button>
                            <button className="btn btn-danger" form="mortalityForm">Record</button>
                        </>
                    }
                >
                    <form id="mortalityForm" onSubmit={handleMortalitySubmit}>
                        <div className="form-group">
                            <label className="form-label">Batch *</label>
                            <select className="form-input" required value={mortalityForm.batchId} onChange={e => setMortalityForm({ ...mortalityForm, batchId: e.target.value })}>
                                <option value="">Select batch...</option>
                                {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Quantity *</label>
                                <input className="form-input" type="number" required min="1" value={mortalityForm.quantity} onChange={e => setMortalityForm({ ...mortalityForm, quantity: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input className="form-input" type="date" required value={mortalityForm.date} onChange={e => setMortalityForm({ ...mortalityForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cause</label>
                            <select className="form-input" value={mortalityForm.cause} onChange={e => setMortalityForm({ ...mortalityForm, cause: e.target.value })}>
                                <option value="">Select cause...</option>
                                <option value="Disease">Disease</option>
                                <option value="Heat stress">Heat stress</option>
                                <option value="Crushing">Crushing</option>
                                <option value="Poor health">Poor health (weak chick)</option>
                                <option value="Predator">Predator</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </div>
                    </form>
                </Modal>

                {/* Weight Log Modal */}
                <Modal
                    isOpen={showWeightModal}
                    onClose={() => setShowWeightModal(false)}
                    title="Log Weight Check"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setShowWeightModal(false)}>Cancel</button>
                            <button className="btn btn-primary" form="weightForm">Save</button>
                        </>
                    }
                >
                    <form id="weightForm" onSubmit={handleWeightSubmit}>
                        <div className="form-group">
                            <label className="form-label">Batch *</label>
                            <select className="form-input" required value={weightForm.batchId} onChange={e => setWeightForm({ ...weightForm, batchId: e.target.value })}>
                                <option value="">Select batch...</option>
                                {activeBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Avg Weight (kg) *</label>
                                <input className="form-input" type="number" step="0.01" required value={weightForm.avgWeight} onChange={e => setWeightForm({ ...weightForm, avgWeight: e.target.value })} placeholder="1.5" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sample Size</label>
                                <input className="form-input" type="number" value={weightForm.sampleSize} onChange={e => setWeightForm({ ...weightForm, sampleSize: e.target.value })} placeholder="10" />
                                <span className="form-hint">How many birds you weighed</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input className="form-input" type="date" required value={weightForm.date} onChange={e => setWeightForm({ ...weightForm, date: e.target.value })} />
                        </div>
                    </form>
                </Modal>

                {/* Batch Detail Modal */}
                <Modal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    title={selectedBatch ? selectedBatch.name : ''}
                >
                    {selectedBatch && (() => {
                        const deaths = getBatchMortality(selectedBatch);
                        const liveBirds = getBatchLiveBirds(selectedBatch);
                        const age = getBatchAge(selectedBatch);
                        const ageAtAcq = Number(selectedBatch.ageAtAcquisition || 0);
                        const batchWeights = weightLogs.filter(w => w.batchId === selectedBatch.id).sort((a, b) => new Date(a.date) - new Date(b.date));
                        const batchMortalities = mortalityLogs.filter(m => m.batchId === selectedBatch.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                        return (
                            <div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Breed</span><br /><strong>{selectedBatch.breed || '—'}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pen</span><br /><strong>{selectedBatch.pen || '—'}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date Acquired</span><br /><strong>{formatDate(selectedBatch.startDate)}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Age at Acquisition</span><br /><strong>{ageAtAcq > 0 ? `${ageAtAcq} days` : 'Day-old'}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Age</span><br /><strong>{formatAge(age)}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Live Birds</span><br /><strong>{liveBirds} / {selectedBatch.quantity}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mortality Rate</span><br /><strong style={{ color: deaths > 0 ? 'var(--red-500)' : 'var(--green-600)' }}>{calculateMortalityRate(deaths, selectedBatch.quantity)}%</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Weight</span><br /><strong>{selectedBatch.targetWeight ? `${selectedBatch.targetWeight} kg` : '—'}</strong></div>
                                    <div><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cost/Chick</span><br /><strong>{selectedBatch.costPerChick ? formatCurrency(selectedBatch.costPerChick) : '—'}</strong></div>
                                </div>

                                {selectedBatch.notes && (
                                    <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
                                        <strong>Notes:</strong> {selectedBatch.notes}
                                    </div>
                                )}

                                {batchWeights.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Weight History</h4>
                                        <table className="data-table">
                                            <thead><tr><th>Date</th><th>Avg Weight</th><th>Sample</th></tr></thead>
                                            <tbody>
                                                {batchWeights.map(w => (
                                                    <tr key={w.id}><td>{formatDate(w.date)}</td><td>{w.avgWeight} kg</td><td>{w.sampleSize || '—'}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {batchMortalities.length > 0 && (
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Mortality Log</h4>
                                        <table className="data-table">
                                            <thead><tr><th>Date</th><th>Qty</th><th>Cause</th></tr></thead>
                                            <tbody>
                                                {batchMortalities.map(m => (
                                                    <tr key={m.id}><td>{formatDate(m.date)}</td><td>{m.quantity}</td><td>{m.cause || '—'}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Photo Logs */}
                                <div style={{ marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h4 style={{ fontSize: '0.9rem' }}>📸 Photo Log</h4>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowPhotoModal(true)}>
                                            <Camera size={14} /> Add Photo
                                        </button>
                                    </div>
                                    {(() => {
                                        const batchPhotos = photoLogs.filter(p => p.batchId === selectedBatch.id).sort((a, b) => new Date(b.date) - new Date(a.date));
                                        return batchPhotos.length === 0 ? (
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No photos yet. Add photos to document your flock&apos;s progress.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                                {batchPhotos.map(photo => (
                                                    <div key={photo.id} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                                                        <img src={photo.photo || photo.image} alt={photo.caption || 'Batch photo'} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                                        <div style={{ padding: '6px 8px', fontSize: '0.75rem' }}>
                                                            <div style={{ color: 'var(--text-secondary)' }}>{formatDate(photo.date)}</div>
                                                            {photo.caption && <div style={{ fontWeight: 500 }}>{photo.caption}</div>}
                                                        </div>
                                                        <button
                                                            onClick={() => deletePhoto(photo.id)}
                                                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
                                                        >×</button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Photo Upload Modal */}
                                {showPhotoModal && (
                                    <div style={{ marginTop: '16px', padding: '16px', background: 'var(--slate-50)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Caption (optional)</label>
                                            <input className="form-input" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="e.g., Day 14 weight check" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Select Photo *</label>
                                            <input className="form-input" type="file" accept="image/*" onChange={handlePhotoUpload} />
                                        </div>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowPhotoModal(false)}>Cancel</button>
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
