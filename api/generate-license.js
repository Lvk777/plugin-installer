const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');
const {
  generateKey,
  computeExpiresAt,
  getMaxActivations,
  buildBatContent,
  logAction
} = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!requireAuth(req, res)) return;

  try {
    const {
      tipo,
      durationValue,
      durationUnit,
      customerName,
      customerContact,
      paymentMethod,
      price,
      notes,
      hwidChangeLimit
    } = req.body || {};

    const licenseKey = generateKey();
    const expiresAt = computeExpiresAt(durationValue, durationUnit);
    const maxActivations = getMaxActivations(tipo);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        key_type: tipo || 'unique',
        customer_name: customerName || null,
        customer_contact: customerContact || null,
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

    const domain = process.env.PUBLIC_SITE_URL || 'https://plugin-installer.vercel.app';
    const batContent = buildBatContent({ domain, licenseKey });

    await logAction('generate_license', { license_key: licenseKey, customer_name: customerName || null });

    return res.status(200).json({
      success: true,
      license: data,
      batContent,
      batFileName: `luatools-${licenseKey}.bat`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
