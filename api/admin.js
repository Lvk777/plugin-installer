const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function requireAuth(req, res) {
  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Não autorizado' });
    return false;
  }
  return true;
}

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = 'LT-';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function computeExpiresAt(durationValue, durationUnit) {
  if (!durationValue || !durationUnit || durationUnit === 'lifetime') return null;

  const value = Number(durationValue);
  const now = Date.now();

  const map = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000
  };

  if (!map[durationUnit]) return null;
  return new Date(now + value * map[durationUnit]).toISOString();
}

function getMaxActivations(tipo) {
  if (tipo === 'multi') return 3;
  return 1;
}

function buildBatContent() {
  const domain = process.env.PUBLIC_SITE_URL || 'https://plugin-installer.vercel.app';
  return `@echo off
title Luatools Installer
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm '${domain}/install-plugin.ps1' | iex"
pause`;
}

async function sendDiscord(message) {
  const webhook = process.env.DISCORD_WEBHOOK;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });
  } catch (_) {}
}

async function logAction(action, details = {}) {
  try {
    await supabase.from('admin_logs').insert({ action, details });
  } catch (_) {}
}

function buildCustomerMessage(licenseKey) {
  return `========================================
   LUATOOLS PLUGIN INSTALLER
========================================

1. Baixe o arquivo .bat
2. Execute o instalador
3. Quando ele pedir, digite sua licença

Sua licença:
${licenseKey}

Guarde essa chave com cuidado.`;
}

async function handleDashboardStats(req, res) {
  const { data: licenses, error } = await supabase.from('licenses').select('*');
  if (error) return res.status(500).json({ error: error.message });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalLicenses = licenses.length;
  const activeLicenses = licenses.filter(x => x.is_active).length;
  const inactiveLicenses = licenses.filter(x => !x.is_active).length;
  const expiredLicenses = licenses.filter(
    x => x.expires_at && new Date(x.expires_at) < now
  ).length;
  const vpnDetectedLicenses = licenses.filter(x => x.last_vpn).length;
  const monthlySales = licenses
    .filter(x => new Date(x.created_at) >= monthStart)
    .reduce((sum, x) => sum + Number(x.price || 0), 0);

  return res.status(200).json({
    totalLicenses,
    activeLicenses,
    inactiveLicenses,
    expiredLicenses,
    vpnDetectedLicenses,
    monthlySales
  });
}

async function handleListLicenses(req, res) {
  const search = String(req.query.search || '').toLowerCase();
  const type = String(req.query.type || '');
  const status = String(req.query.status || '');

  let query = supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (type) query = query.eq('key_type', type);
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'inactive') query = query.eq('is_active', false);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let filtered = data || [];

  if (search) {
    filtered = filtered.filter(item =>
      (item.license_key || '').toLowerCase().includes(search) ||
      (item.customer_name || '').toLowerCase().includes(search) ||
      (item.customer_contact || '').toLowerCase().includes(search) ||
      (item.customer_email || '').toLowerCase().includes(search)
    );
  }

  return res.status(200).json({ licenses: filtered });
}

async function handleGenerateLicense(req, res) {
  const {
    tipo,
    durationValue,
    durationUnit,
    customerName,
    customerContact,
    customerEmail,
    paymentMethod,
    price,
    notes,
    hwidChangeLimit
  } = req.body || {};

  const licenseKey = generateKey();
  const expiresAt = computeExpiresAt(durationValue, durationUnit);
  const maxActivations = getMaxActivations(tipo);

  const { data, error } = await supabase
    .from('licenses')
    .insert({
      license_key: licenseKey,
      key_type: tipo || 'unique',
      customer_name: customerName || null,
      customer_contact: customerContact || null,
      customer_email: customerEmail || null,
      payment_method: paymentMethod || 'manual',
      price: price ? Number(price) : null,
      notes: notes || null,
      max_activations: maxActivations,
      expires_at: expiresAt,
      is_active: true,
      hwid_change_limit: Number(hwidChangeLimit || 2),
      duration_value: durationValue ? Number(durationValue) : null,
      duration_unit: durationUnit || null
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await sendDiscord(
    `🔑 Nova licença gerada\n` +
    `Cliente: ${customerName || customerContact || customerEmail || 'N/A'}\n` +
    `Tipo: ${tipo || 'unique'}\n` +
    `Valor: ${price || 'N/A'}\n` +
    `Licença: ${licenseKey}`
  );

  await logAction('generate_license', {
    license_key: licenseKey,
    customer_name: customerName || null
  });

  return res.status(200).json({
    success: true,
    license: data,
    batContent: buildBatContent(),
    batFileName: 'luatools-installer.bat'
  });
}

async function handleToggleLicense(req, res) {
  const { id, is_active } = req.body || {};

  const { error } = await supabase
    .from('licenses')
    .update({ is_active: !!is_active })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await logAction('toggle_license', { id, is_active: !!is_active });
  return res.status(200).json({ success: true });
}

async function handleDeleteLicense(req, res) {
  const { id } = req.body || {};

  const { error } = await supabase
    .from('licenses')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await logAction('delete_license', { id });
  return res.status(200).json({ success: true });
}

async function handleResetActivations(req, res) {
  const { id } = req.body || {};

  await supabase.from('activations').delete().eq('license_id', id);

  const { error } = await supabase
    .from('licenses')
    .update({
      current_activations: 0,
      reset_count: 1
    })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await logAction('reset_activations', { id });
  return res.status(200).json({ success: true });
}

async function handleResetHwidChanges(req, res) {
  const { id } = req.body || {};

  const { error } = await supabase
    .from('licenses')
    .update({ hwid_change_count: 0 })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });

  await logAction('reset_hwid_changes', { id });
  return res.status(200).json({ success: true });
}

async function handleBlockHwid(req, res) {
  const { hwid, reason } = req.body || {};
  if (!hwid) return res.status(400).json({ error: 'HWID obrigatório' });

  const { error } = await supabase
    .from('blacklist')
    .insert({
      hwid,
      reason: reason || 'Bloqueado manualmente'
    });

  if (error) return res.status(500).json({ error: error.message });

  await logAction('block_hwid', { hwid, reason: reason || null });
  return res.status(200).json({ success: true });
}

async function handleLicenseActivations(req, res) {
  const { id } = req.query || {};
  if (!id) return res.status(400).json({ error: 'ID obrigatório' });

  const { data, error } = await supabase
    .from('activations')
    .select('*')
    .eq('license_id', id)
    .order('activated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ activations: data || [] });
}

async function handleGenerateInstallToken(req, res) {
  const { licenseId, hoursValid = 24 } = req.body || {};
  if (!licenseId) return res.status(400).json({ error: 'licenseId obrigatório' });

  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + Number(hoursValid) * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('install_tokens')
    .insert({
      token,
      license_id: licenseId,
      expires_at: expiresAt,
      is_active: true
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const domain = process.env.PUBLIC_SITE_URL || 'https://plugin-installer.vercel.app';

  await logAction('generate_install_token', { licenseId, token });

  return res.status(200).json({
    success: true,
    token: data.token,
    bootstrapUrl: `${domain}/api/bootstrap?token=${data.token}`
  });
}

async function handleSendLicenseMessage(req, res) {
  const { licenseKey } = req.body || {};
  if (!licenseKey) return res.status(400).json({ error: 'licenseKey obrigatório' });

  const message = buildCustomerMessage(licenseKey);
  return res.status(200).json({ success: true, message });
}

async function handleGenerateBat(req, res) {
  const content = buildBatContent();
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="luatools-installer.bat"');
  return res.status(200).send(content);
}

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  const action = req.query.action;

  try {
    if (action === 'dashboard-stats' && req.method === 'GET') {
      return await handleDashboardStats(req, res);
    }

    if (action === 'list-licenses' && req.method === 'GET') {
      return await handleListLicenses(req, res);
    }

    if (action === 'generate-license' && req.method === 'POST') {
      return await handleGenerateLicense(req, res);
    }

    if (action === 'toggle-license' && req.method === 'POST') {
      return await handleToggleLicense(req, res);
    }

    if (action === 'delete-license' && req.method === 'POST') {
      return await handleDeleteLicense(req, res);
    }

    if (action === 'reset-activations' && req.method === 'POST') {
      return await handleResetActivations(req, res);
    }

    if (action === 'reset-hwid-changes' && req.method === 'POST') {
      return await handleResetHwidChanges(req, res);
    }

    if (action === 'block-hwid' && req.method === 'POST') {
      return await handleBlockHwid(req, res);
    }

    if (action === 'license-activations' && req.method === 'GET') {
      return await handleLicenseActivations(req, res);
    }

    if (action === 'generate-install-token' && req.method === 'POST') {
      return await handleGenerateInstallToken(req, res);
    }

    if (action === 'send-license-message' && req.method === 'POST') {
      return await handleSendLicenseMessage(req, res);
    }

    if (action === 'generate-bat' && req.method === 'GET') {
      return await handleGenerateBat(req, res);
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
