'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
    getPlatformStats,
    getUsers,
    getTableCounts,
    getRecentActivity
} from '@/lib/admin-storage';
import Header from '@/components/Header';
import {
    Users,
    Bird,
    DollarSign,
    ShoppingCart,
    Database,
    Activity,
    Shield,
    Mail,
    Calendar,
    Loader2,
    ShieldAlert,
    TrendingUp,
    Package,
    Syringe,
    Camera,
    Scale,
    Skull
} from 'lucide-react';

export default function AdminPage() {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const router = useRouter();

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [tableCounts, setTableCounts] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [s, u, tc, a] = await Promise.all([
            getPlatformStats(),
            getUsers(),
            getTableCounts(),
            getRecentActivity()
        ]);
        setStats(s);
        setUsers(u);
        setTableCounts(tc);
        setActivity(a);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.replace('/');
            return;
        }
        if (isAdmin) {
            loadData();
        }
    }, [authLoading, isAdmin, router, loadData]);

    if (authLoading || (!isAdmin && !loading)) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)' }} />
            </div>
        );
    }

    if (!isAdmin) return null;

    const formatCurrency = (val) => `₦${Number(val || 0).toLocaleString()}`;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const formatDateTime = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

    const activityIcons = {
        batch: Bird,
        expense: DollarSign,
        revenue: TrendingUp,
        feed_purchase: Package,
        customer: Users,
    };

    const activityColors = {
        batch: '#3b82f6',
        expense: '#ef4444',
        revenue: '#16a34a',
        feed_purchase: '#f59e0b',
        customer: '#8b5cf6',
    };

    const tableIcons = {
        profiles: Users,
        batches: Bird,
        customers: Users,
        expenses: DollarSign,
        revenue: TrendingUp,
        feed_purchases: Package,
        feed_consumption: Package,
        weight_logs: Scale,
        mortality_logs: Skull,
        vaccinations: Syringe,
        photo_logs: Camera,
    };

    return (
        <>
            <Header title="Admin Dashboard" subtitle="Super admin overview" />
            <div className="page-content">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
                        <Loader2 size={32} className="spinner" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : (
                    <>
                        {/* ── Platform Stats ───────────────────────── */}
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <StatCard
                                icon={Users} label="Total Users" value={stats?.total_users || 0}
                                color="#3b82f6" bg="rgba(59,130,246,0.1)"
                            />
                            <StatCard
                                icon={Bird} label="Total Batches" value={stats?.total_batches || 0}
                                color="#16a34a" bg="rgba(22,163,74,0.1)"
                            />
                            <StatCard
                                icon={Bird} label="Total Birds" value={(stats?.total_birds || 0).toLocaleString()}
                                color="#8b5cf6" bg="rgba(139,92,246,0.1)"
                            />
                            <StatCard
                                icon={TrendingUp} label="Total Revenue" value={formatCurrency(stats?.total_revenue)}
                                color="#16a34a" bg="rgba(22,163,74,0.1)"
                            />
                            <StatCard
                                icon={DollarSign} label="Total Expenses" value={formatCurrency(stats?.total_expenses)}
                                color="#ef4444" bg="rgba(239,68,68,0.1)"
                            />
                            <StatCard
                                icon={ShoppingCart} label="Total Customers" value={stats?.total_customers || 0}
                                color="#f59e0b" bg="rgba(245,158,11,0.1)"
                            />
                        </div>

                        {/* ── User Management ───────────────────────── */}
                        <div className="card" style={{ marginTop: '24px' }}>
                            <div className="card-header">
                                <h3 className="card-title"><Users size={18} style={{ marginRight: '8px', verticalAlign: '-3px' }} /> User Management</h3>
                            </div>
                            <div className="card-body" style={{ padding: 0, overflow: 'hidden' }}>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Role</th>
                                                <th>Signed Up</th>
                                                <th>Last Sign In</th>
                                                <th>Batches</th>
                                                <th>Revenue</th>
                                                <th>Expenses</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((u) => (
                                                <tr key={u.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{
                                                                width: '28px', height: '28px', borderRadius: '50%',
                                                                background: u.is_admin ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0
                                                            }}>
                                                                {u.email?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span style={{ fontSize: '13px' }}>{u.email}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {u.is_admin ? (
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                                background: 'rgba(245,158,11,0.12)', color: '#d97706',
                                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600
                                                            }}>
                                                                <Shield size={11} /> Admin
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                background: 'rgba(100,116,139,0.1)', color: 'var(--text-secondary)',
                                                                padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500
                                                            }}>
                                                                User
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(u.signup_date)}</td>
                                                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(u.last_sign_in_at)}</td>
                                                    <td style={{ fontWeight: 600 }}>{u.batch_count}</td>
                                                    <td style={{ fontWeight: 600 }}>{u.revenue_entries}</td>
                                                    <td style={{ fontWeight: 600 }}>{u.expense_entries}</td>
                                                </tr>
                                            ))}
                                            {users.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px' }}>No users found</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* ── Two-column: System Health + Recent Activity ── */}
                        <div className="content-grid" style={{ marginTop: '24px' }}>
                            {/* System Health */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title"><Database size={18} style={{ marginRight: '8px', verticalAlign: '-3px' }} /> System Health</h3>
                                </div>
                                <div className="card-body">
                                    {tableCounts && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                                            {Object.entries(tableCounts).map(([table, count]) => {
                                                const Icon = tableIcons[table] || Database;
                                                return (
                                                    <div key={table} style={{
                                                        background: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        padding: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                    }}>
                                                        <Icon size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                        <div>
                                                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{count}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                                                {table.replace(/_/g, ' ')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title"><Activity size={18} style={{ marginRight: '8px', verticalAlign: '-3px' }} /> Recent Activity</h3>
                                </div>
                                <div className="card-body" style={{ padding: '0' }}>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        {activity.map((item, i) => {
                                            const Icon = activityIcons[item.type] || Activity;
                                            const color = activityColors[item.type] || '#64748b';
                                            return (
                                                <div key={i} style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    padding: '12px 20px',
                                                    borderBottom: '1px solid var(--border-light)',
                                                }}>
                                                    <div style={{
                                                        width: '30px', height: '30px', borderRadius: '8px',
                                                        background: `${color}15`, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                    }}>
                                                        <Icon size={14} style={{ color }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {item.label || item.type}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                            {item.user_email || 'Unknown'} · {formatDateTime(item.created_at)}
                                                        </div>
                                                    </div>
                                                    <span style={{
                                                        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                                                        color, background: `${color}12`, padding: '2px 8px', borderRadius: '10px',
                                                        flexShrink: 0,
                                                    }}>
                                                        {item.type?.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {activity.length === 0 && (
                                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px', fontSize: '13px' }}>
                                                No activity yet
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

function StatCard({ icon: Icon, label, value, color, bg }) {
    return (
        <div className="stat-card">
            <div className="stat-card-top">
                <div className="stat-card-icon" style={{ background: bg, color }}>
                    <Icon size={20} />
                </div>
                <span className="stat-card-label">{label}</span>
            </div>
            <div className="stat-card-value">{value}</div>
        </div>
    );
}
