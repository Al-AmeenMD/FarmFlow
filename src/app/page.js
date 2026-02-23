'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import {
  Bird,
  Warehouse,
  DollarSign,
  TrendingUp,
  Plus,
  ShoppingCart,
  Package,
  AlertTriangle,
  Syringe,
  Scale,
  Calendar,
  Loader2
} from 'lucide-react';
import { getItems, TABLES } from '@/lib/supabase-storage';
import {
  formatCurrency,
  formatNumber,
  formatRelativeDate,
  daysBetween,
  calculateMortalityRate,
  calculateFCR
} from '@/lib/utils';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBirds: 0,
    activeBatches: 0,
    feedStock: 0,
    monthlyProfit: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    mortalityRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [batchFCRs, setBatchFCRs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [batches, expenses, revenue, feedPurchases, feedConsumption, mortalityLogs, weightLogs, vaccinations] = await Promise.all([
        getItems(TABLES.BATCHES),
        getItems(TABLES.EXPENSES),
        getItems(TABLES.REVENUE),
        getItems(TABLES.FEED_PURCHASES),
        getItems(TABLES.FEED_CONSUMPTION),
        getItems(TABLES.MORTALITY_LOGS),
        getItems(TABLES.WEIGHT_LOGS),
        getItems(TABLES.VACCINATIONS),
      ]);

      // Active batches (not sold)
      const activeBatches = batches.filter(b => b.status !== 'Sold');
      const totalBirds = activeBatches.reduce((sum, b) => {
        const batchMortality = mortalityLogs
          .filter(m => m.batchId === b.id)
          .reduce((s, m) => s + Number(m.quantity), 0);
        const batchSold = revenue
          .filter(r => r.batchId === b.id && r.category === 'bird_sale')
          .reduce((s, r) => s + Number(r.quantity || 0), 0);
        return sum + (Number(b.quantity) - batchMortality - batchSold);
      }, 0);

      // Feed stock
      const totalFeedBought = feedPurchases.reduce((s, f) => s + Number(f.quantity), 0);
      const totalFeedUsed = feedConsumption.reduce((s, f) => s + Number(f.quantity), 0);
      const feedStock = totalFeedBought - totalFeedUsed;

      // Monthly finances
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthExpenses = expenses
        .filter(e => e.date >= monthStart)
        .reduce((s, e) => s + Number(e.amount), 0);
      const monthRevenue = revenue
        .filter(r => r.date >= monthStart)
        .reduce((s, r) => s + Number(r.amount), 0);

      // Mortality rate
      const totalInitialBirds = batches.reduce((s, b) => s + Number(b.quantity), 0);
      const totalDeaths = mortalityLogs.reduce((s, m) => s + Number(m.quantity), 0);
      const mortalityRate = calculateMortalityRate(totalDeaths, totalInitialBirds);

      setStats({
        totalBirds,
        activeBatches: activeBatches.length,
        feedStock,
        monthlyProfit: monthRevenue - monthExpenses,
        totalRevenue: monthRevenue,
        totalExpenses: monthExpenses,
        mortalityRate,
      });

      // --- FCR per active batch ---
      const fcrs = activeBatches.map(batch => {
        const batchFeedUsed = feedConsumption.filter(f => f.batchId === batch.id).reduce((s, f) => s + Number(f.quantity), 0);
        const batchDeaths = mortalityLogs.filter(m => m.batchId === batch.id).reduce((s, m) => s + Number(m.quantity), 0);
        const liveBirds = Number(batch.quantity) - batchDeaths;
        const latestWeight = weightLogs.filter(w => w.batchId === batch.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const totalWeightGain = latestWeight ? liveBirds * Number(latestWeight.avgWeight) : 0;
        const fcr = calculateFCR(batchFeedUsed, totalWeightGain);
        const age = daysBetween(batch.startDate) + Number(batch.ageAtAcquisition || 0);
        return {
          name: batch.name,
          fcr: fcr ? Number(fcr) : null,
          weight: latestWeight?.avgWeight || null,
          age,
          liveBirds,
        };
      }).filter(b => b.fcr !== null);
      setBatchFCRs(fcrs);

      // --- Smart Alerts ---
      const newAlerts = [];

      // Low feed stock
      if (feedStock < 50 && feedStock >= 0) {
        newAlerts.push({ type: 'warning', icon: Warehouse, text: `Feed stock is low: ${formatNumber(feedStock)} kg remaining` });
      }

      // High mortality
      if (Number(mortalityRate) > 5) {
        newAlerts.push({ type: 'danger', icon: AlertTriangle, text: `Overall mortality rate is ${mortalityRate}% — above 5% threshold` });
      }

      // Batch approaching target weight
      activeBatches.forEach(batch => {
        if (batch.targetWeight) {
          const latestWeight = weightLogs.filter(w => w.batchId === batch.id).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
          if (latestWeight && Number(latestWeight.avgWeight) >= Number(batch.targetWeight) * 0.85) {
            newAlerts.push({ type: 'success', icon: Scale, text: `"${batch.name}" is at ${latestWeight.avgWeight}kg — approaching target of ${batch.targetWeight}kg` });
          }
        }
      });

      // Overdue vaccinations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      vaccinations.filter(v => v.status !== 'done').forEach(v => {
        const batch = batches.find(b => b.id === v.batchId);
        if (!batch) return;
        const start = new Date(batch.startDate);
        start.setHours(0, 0, 0, 0);
        const adjustedTarget = Math.max(0, v.targetDay - (Number(batch.ageAtAcquisition) || 0));
        const dueDate = new Date(start);
        dueDate.setDate(dueDate.getDate() + adjustedTarget);
        const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          newAlerts.push({ type: 'danger', icon: Syringe, text: `"${batch.name}": ${v.name} is ${Math.abs(diffDays)} day(s) overdue` });
        } else if (diffDays <= 1) {
          newAlerts.push({ type: 'warning', icon: Calendar, text: `"${batch.name}": ${v.name} is ${diffDays === 0 ? 'due today' : 'due tomorrow'}` });
        }
      });

      setAlerts(newAlerts);

      // Build activity feed
      const activities = [];
      batches.slice(-5).forEach(b => {
        activities.push({
          text: `Batch "${b.name}" created with ${b.quantity} birds`,
          time: b.createdAt,
          color: 'green',
        });
      });
      expenses.slice(-5).forEach(e => {
        activities.push({
          text: `Expense: ${formatCurrency(e.amount)} — ${e.category}`,
          time: e.createdAt,
          color: 'red',
        });
      });
      revenue.slice(-5).forEach(r => {
        activities.push({
          text: `Revenue: ${formatCurrency(r.amount)} — ${r.category}`,
          time: r.createdAt,
          color: 'blue',
        });
      });
      mortalityLogs.slice(-3).forEach(m => {
        activities.push({
          text: `${m.quantity} bird(s) lost — ${m.cause || 'Unknown cause'}`,
          time: m.createdAt,
          color: 'amber',
        });
      });

      activities.sort((a, b) => new Date(b.time) - new Date(a.time));
      setRecentActivity(activities.slice(0, 8));
    } catch (err) {
      console.error('Dashboard loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getFCRColor = (fcr) => {
    if (fcr <= 1.6) return 'var(--green-600)';
    if (fcr <= 1.8) return 'var(--amber-500)';
    return 'var(--red-500)';
  };

  const getFCRLabel = (fcr) => {
    if (fcr <= 1.6) return 'Excellent';
    if (fcr <= 1.8) return 'Good';
    if (fcr <= 2.0) return 'Average';
    return 'Poor';
  };

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Overview of your farm performance" />
        <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p>Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Overview of your farm performance"
      />
      <div className="page-content">
        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="alert-cards">
            {alerts.map((alert, i) => {
              const Icon = alert.icon;
              return (
                <div key={i} className={`alert-card ${alert.type}`}>
                  <Icon size={18} />
                  <span>{alert.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card green">
            <div className="stat-card-header">
              <span className="stat-card-label">Active Birds</span>
              <div className="stat-card-icon"><Bird size={20} /></div>
            </div>
            <div className="stat-card-value">{formatNumber(stats.totalBirds)}</div>
            <div className="stat-card-detail">{stats.activeBatches} active batch{stats.activeBatches !== 1 ? 'es' : ''}</div>
          </div>

          <div className="stat-card amber">
            <div className="stat-card-header">
              <span className="stat-card-label">Feed Stock</span>
              <div className="stat-card-icon"><Warehouse size={20} /></div>
            </div>
            <div className="stat-card-value">{formatNumber(stats.feedStock)} kg</div>
            <div className="stat-card-detail">{stats.feedStock < 50 ? '⚠️ Low stock!' : 'In stock'}</div>
          </div>

          <div className="stat-card blue">
            <div className="stat-card-header">
              <span className="stat-card-label">Monthly Revenue</span>
              <div className="stat-card-icon"><DollarSign size={20} /></div>
            </div>
            <div className="stat-card-value">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat-card-detail">This month</div>
          </div>

          <div className="stat-card purple">
            <div className="stat-card-header">
              <span className="stat-card-label">Monthly Profit</span>
              <div className="stat-card-icon"><TrendingUp size={20} /></div>
            </div>
            <div className="stat-card-value" style={{ color: stats.monthlyProfit >= 0 ? 'var(--green-600)' : 'var(--red-500)' }}>
              {formatCurrency(stats.monthlyProfit)}
            </div>
            <div className="stat-card-detail">Revenue - Expenses</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <Link href="/batches" className="quick-action-btn">
            <Plus size={16} /> New Batch
          </Link>
          <Link href="/inventory" className="quick-action-btn">
            <ShoppingCart size={16} /> Log Feed Purchase
          </Link>
          <Link href="/finances" className="quick-action-btn">
            <DollarSign size={16} /> Record Expense
          </Link>
          <Link href="/finances" className="quick-action-btn">
            <Package size={16} /> Record Sale
          </Link>
        </div>

        {/* FCR Dashboard */}
        {batchFCRs.length > 0 && (
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">📊 Feed Conversion Ratio (FCR)</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {batchFCRs.map((batch, i) => (
                  <div key={i} style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{batch.name}</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: getFCRColor(batch.fcr) }}>
                      {batch.fcr.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: getFCRColor(batch.fcr), fontWeight: 600 }}>{getFCRLabel(batch.fcr)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{batch.weight}kg avg</span>
                    </div>
                    {/* FCR bar indicator */}
                    <div style={{ marginTop: '8px', height: '4px', borderRadius: '2px', background: 'var(--border-color)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (1 / batch.fcr) * 100)}%`, borderRadius: '2px', background: getFCRColor(batch.fcr), transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                💡 FCR = Feed consumed ÷ Weight gained. Lower is better. Broiler target: &lt; 1.8
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="content-grid">
          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            <div className="card-body">
              {recentActivity.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Bird size={28} /></div>
                  <h3>No activity yet</h3>
                  <p>Start by creating your first batch of birds!</p>
                  <Link href="/batches" className="btn btn-primary">
                    <Plus size={16} /> Create Batch
                  </Link>
                </div>
              ) : (
                <ul className="activity-list">
                  {recentActivity.map((item, i) => (
                    <li key={i} className="activity-item animate-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className={`activity-dot ${item.color}`} />
                      <div>
                        <div className="activity-text">{item.text}</div>
                        <div className="activity-time">{formatRelativeDate(item.time)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Farm Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Farm Overview</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Active Birds</span>
                  <span style={{ fontWeight: 700 }}>{formatNumber(stats.totalBirds)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Active Batches</span>
                  <span style={{ fontWeight: 700 }}>{stats.activeBatches}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Mortality Rate</span>
                  <span style={{ fontWeight: 700, color: Number(stats.mortalityRate) > 5 ? 'var(--red-500)' : 'var(--green-600)' }}>{stats.mortalityRate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Monthly Expenses</span>
                  <span style={{ fontWeight: 700, color: 'var(--red-500)' }}>{formatCurrency(stats.totalExpenses)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Feed Stock</span>
                  <span style={{ fontWeight: 700 }}>{formatNumber(stats.feedStock)} kg</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
