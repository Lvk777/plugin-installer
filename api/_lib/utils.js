const { getSupabase } = require('./supabase');

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = 'LT-';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function getLicenseDefaults(tipo, maxAtivacoes) {
  let expiresAt = null;
  let max = Number(maxAtivacoes) || 1;

  if (tipo === 'unique') {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    max = 1;
  } else if (tipo === 'multi') {
    expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    max = Number(maxAtivacoes) || 3;
  } else if (tipo === 'lifetime') {
    expiresAt = null;
    max = Number(maxAtivacoes) || 1;
  } else {
    throw new Error('Tipo de licença inválido');
  }

  return { expiresAt, max };
}

async function logAction(action, details = {}) {
  try {
    const supabase = getSupabase();
    await supabase.from('admin_logs').insert({
      action,
      details
    });
  } catch (_) {}
}

module.exports = { generateKey, getLicenseDefaults, logAction };
