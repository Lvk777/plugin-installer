const crypto = require('crypto');
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

function buildBatContent({ domain }) {
  return `@echo off
title Lvktool Installer
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm '${domain}/install-plugin.ps1' | iex"
pause`;
}

async function logAction(action, details = {}) {
  try {
    const supabase = getSupabase();
    await supabase.from('admin_logs').insert({ action, details });
  } catch (_) {}
}

module.exports = {
  generateKey,
  generateToken,
  computeExpiresAt,
  getMaxActivations,
  buildBatContent,
  logAction
};
