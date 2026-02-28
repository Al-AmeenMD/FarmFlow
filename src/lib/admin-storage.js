// Admin data access layer — uses Supabase RPC functions
// All functions require the caller to be an admin (checked server-side in Postgres)

import { getSupabase } from './supabase';

/**
 * Check if the current user is an admin
 */
export async function checkIsAdmin() {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('admin_check');
    if (error) return false;
    return data === true;
}

/**
 * Get platform-wide statistics
 * Returns: { total_users, total_batches, total_birds, total_revenue, total_expenses, total_customers }
 */
export async function getPlatformStats() {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('admin_get_platform_stats');
    if (error) { console.error('admin_get_platform_stats error:', error); return null; }
    return data;
}

/**
 * Get all users with their activity stats
 * Returns: [{ id, email, is_admin, signup_date, last_sign_in_at, batch_count, revenue_entries, expense_entries }]
 */
export async function getUsers() {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('admin_get_users');
    if (error) { console.error('admin_get_users error:', error); return []; }
    return data || [];
}

/**
 * Get row counts for all tables
 * Returns: { profiles, batches, customers, expenses, revenue, ... }
 */
export async function getTableCounts() {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc('admin_get_table_counts');
    if (error) { console.error('admin_get_table_counts error:', error); return null; }
    return data;
}

/**
 * Get recent activity across all users (latest 25 entries)
 * Returns: [{ type, label, user_email, created_at }]
 */
export async function getRecentActivity() {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('admin_get_recent_activity');
    if (error) { console.error('admin_get_recent_activity error:', error); return []; }
    return data || [];
}
