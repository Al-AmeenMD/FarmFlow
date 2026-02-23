// localStorage helper functions for the Broiler Farm Management App

const STORAGE_KEYS = {
  BATCHES: 'farm_batches',
  FEED_PURCHASES: 'farm_feed_purchases',
  FEED_CONSUMPTION: 'farm_feed_consumption',
  EXPENSES: 'farm_expenses',
  REVENUE: 'farm_revenue',
  INVENTORY: 'farm_inventory',
  WEIGHT_LOGS: 'farm_weight_logs',
  MORTALITY_LOGS: 'farm_mortality_logs',
  VACCINATIONS: 'farm_vaccinations',
  CUSTOMERS: 'farm_customers',
  PHOTO_LOGS: 'farm_photo_logs',
  THEME: 'farm_theme',
};

function getItem(key) {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setItem(key, data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function addItem(key, item) {
  const items = getItem(key);
  const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
  items.push(newItem);
  setItem(key, items);
  return newItem;
}

function updateItem(key, id, updates) {
  const items = getItem(key);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    setItem(key, items);
    return items[index];
  }
  return null;
}

function deleteItem(key, id) {
  const items = getItem(key);
  const filtered = items.filter(item => item.id !== id);
  setItem(key, filtered);
  return filtered;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export {
  STORAGE_KEYS,
  getItem,
  setItem,
  addItem,
  updateItem,
  deleteItem,
  generateId,
};
