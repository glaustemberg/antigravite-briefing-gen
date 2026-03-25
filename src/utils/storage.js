// localStorage persistence for clients, briefings, and settings

const STORAGE_KEYS = {
  CLIENTS: 'briefing_clients',
  BRIEFINGS: 'briefing_list',
  SETTINGS: 'briefing_settings',
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ===== CLIENTS =====
export function getClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CLIENTS)) || []
  } catch { return [] }
}

export function saveClient(client) {
  const clients = getClients()
  if (client.id) {
    const idx = clients.findIndex(c => c.id === client.id)
    if (idx >= 0) clients[idx] = { ...clients[idx], ...client, updatedAt: new Date().toISOString() }
  } else {
    client.id = generateId()
    client.createdAt = new Date().toISOString()
    client.updatedAt = new Date().toISOString()
    clients.unshift(client)
  }
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients))
  return client
}

export function deleteClient(id) {
  const clients = getClients().filter(c => c.id !== id)
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients))
}

// ===== BRIEFINGS =====
export function getBriefings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.BRIEFINGS)) || []
  } catch { return [] }
}

export function saveBriefing(briefing) {
  const briefings = getBriefings()
  if (briefing.id) {
    const idx = briefings.findIndex(b => b.id === briefing.id)
    if (idx >= 0) briefings[idx] = { ...briefings[idx], ...briefing, updatedAt: new Date().toISOString() }
  } else {
    briefing.id = generateId()
    briefing.createdAt = new Date().toISOString()
    briefing.updatedAt = new Date().toISOString()
    briefings.unshift(briefing)
  }
  localStorage.setItem(STORAGE_KEYS.BRIEFINGS, JSON.stringify(briefings))
  return briefing
}

export function deleteBriefing(id) {
  const briefings = getBriefings().filter(b => b.id !== id)
  localStorage.setItem(STORAGE_KEYS.BRIEFINGS, JSON.stringify(briefings))
}

export function getBriefingsByClient(clientId) {
  return getBriefings().filter(b => b.clientId === clientId)
}

// ===== SETTINGS =====
export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || {}
  } catch { return {} }
}

export function saveSettings(settings) {
  const current = getSettings()
  const updated = { ...current, ...settings }
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
  return updated
}
