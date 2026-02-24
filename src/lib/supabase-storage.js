// Supabase data access layer — async replacement for localStorage storage.js
// All functions are async and work with Supabase table names directly.

import { getSupabase } from './supabase';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert camelCase JS object keys to snake_case for Supabase columns.
 * e.g. { batchId: '123', unitCost: 5 } → { batch_id: '123', unit_cost: 5 }
 */
function toSnakeCase(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        result[snakeKey] = value;
    }
    return result;
}

/**
 * Convert snake_case Supabase row keys to camelCase for JS consumption.
 * e.g. { batch_id: '123', unit_cost: 5 } → { batchId: '123', unitCost: 5 }
 */
function toCamelCase(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = value;
    }
    return result;
}

/**
 * Convert an array of snake_case rows to camelCase.
 */
function rowsToCamel(rows) {
    return (rows || []).map(toCamelCase);
}

/**
 * Convert empty strings to null for columns that don't accept them
 * (uuid, numeric, integer, date, etc.). Safe for text columns too —
 * Postgres treats null and '' differently but forms often leave '' for optional fields.
 */
function sanitizeRow(row) {
    const textColumns = new Set(['name', 'breed', 'source', 'pen', 'notes', 'description',
        'category', 'feed_type', 'supplier', 'cause', 'phone', 'address', 'type',
        'status', 'caption', 'photo']);
    for (const key of Object.keys(row)) {
        if (row[key] === '' && !textColumns.has(key)) {
            row[key] = null;
        }
    }
    return row;
}

// ─── CRUD Operations ────────────────────────────────────────────────────────

/**
 * Fetch all rows from a table.
 * @param {string} table — Supabase table name (e.g. 'batches')
 * @param {object} [options] — { orderBy: 'created_at', ascending: false, filters: { batch_id: '...' } }
 * @returns {Promise<Array>} rows in camelCase
 */
export async function getItems(table, options = {}) {
    const supabase = getSupabase();
    if (!supabase) return [];
    let query = supabase.from(table).select('*');

    // Apply filters
    if (options.filters) {
        for (const [col, val] of Object.entries(options.filters)) {
            query = query.eq(col, val);
        }
    }

    // Apply ordering
    const orderCol = options.orderBy || 'created_at';
    const ascending = options.ascending ?? false;
    query = query.order(orderCol, { ascending });

    const { data, error } = await query;
    if (error) {
        console.error(`getItems(${table}):`, error.message);
        return [];
    }
    return rowsToCamel(data);
}

/**
 * Fetch a single row by ID.
 * @param {string} table
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getItemById(table, id) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) {
        console.error(`getItemById(${table}, ${id}):`, error.message);
        return null;
    }
    return toCamelCase(data);
}

/**
 * Insert a new row. Returns the created row (camelCase).
 * Automatically converts camelCase keys → snake_case.
 * @param {string} table
 * @param {object} item — camelCase field names
 * @returns {Promise<object|null>}
 */
export async function addItem(table, item) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const row = toSnakeCase(item);
    // Remove id if empty string (let Supabase generate UUID)
    if (row.id === '' || row.id === undefined) delete row.id;
    // Remove createdAt/updatedAt — Supabase handles these via defaults
    delete row.created_at;
    delete row.updated_at;
    sanitizeRow(row);

    // Auto-inject user_id from auth session
    const { data: { user } } = await supabase.auth.getUser();
    if (user) row.user_id = user.id;

    const { data, error } = await supabase.from(table).insert(row).select().single();
    if (error) {
        console.error(`addItem(${table}):`, error.message);
        return null;
    }
    return toCamelCase(data);
}

/**
 * Insert multiple rows at once. Returns the created rows (camelCase).
 * @param {string} table
 * @param {Array<object>} items — array of camelCase objects
 * @returns {Promise<Array>}
 */
export async function addItems(table, items) {
    const supabase = getSupabase();
    if (!supabase) return [];

    // Auto-inject user_id from auth session
    const { data: { user } } = await supabase.auth.getUser();

    const rows = items.map((item) => {
        const row = toSnakeCase(item);
        if (row.id === '' || row.id === undefined) delete row.id;
        delete row.created_at;
        delete row.updated_at;
        if (user) row.user_id = user.id;
        sanitizeRow(row);
        return row;
    });

    const { data, error } = await supabase.from(table).insert(rows).select();
    if (error) {
        console.error(`addItems(${table}):`, error.message);
        return [];
    }
    return rowsToCamel(data);
}

/**
 * Update a row by ID. Returns the updated row (camelCase).
 * @param {string} table
 * @param {string} id
 * @param {object} updates — camelCase field names
 * @returns {Promise<object|null>}
 */
export async function updateItem(table, id, updates) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const row = toSnakeCase(updates);
    delete row.id;
    delete row.created_at;
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single();
    if (error) {
        console.error(`updateItem(${table}, ${id}):`, error.message);
        return null;
    }
    return toCamelCase(data);
}

/**
 * Delete a row by ID.
 * @param {string} table
 * @param {string} id
 * @returns {Promise<boolean>} true if deleted successfully
 */
export async function deleteItem(table, id) {
    const supabase = getSupabase();
    if (!supabase) return false;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        console.error(`deleteItem(${table}, ${id}):`, error.message);
        return false;
    }
    return true;
}

/**
 * Delete all rows from a table (used by Reports import to clear before re-importing).
 * @param {string} table
 * @returns {Promise<boolean>}
 */
export async function clearTable(table) {
    const supabase = getSupabase();
    if (!supabase) return false;
    // Supabase requires a filter for delete; use neq on id to match all rows
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
        console.error(`clearTable(${table}):`, error.message);
        return false;
    }
    return true;
}

// ─── Table name constants (mirrors old STORAGE_KEYS for easy migration) ─────

export const TABLES = {
    BATCHES: 'batches',
    FEED_PURCHASES: 'feed_purchases',
    FEED_CONSUMPTION: 'feed_consumption',
    EXPENSES: 'expenses',
    REVENUE: 'revenue',
    WEIGHT_LOGS: 'weight_logs',
    MORTALITY_LOGS: 'mortality_logs',
    VACCINATIONS: 'vaccinations',
    CUSTOMERS: 'customers',
    PHOTO_LOGS: 'photo_logs',
};
