const { getSupabase } = require('./_lib/supabase');
const { generateKey, computeExpiresAt, getMaxActivations } = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const body = req.body || {};
    const provider = body.provider || 'manual';
    const status = body.status || null;

    const supabase = getSupabase();

    await supabase.from('payment_events').insert({
      provider,
      external_id: body.external_id || body.id || null,
      status,
      payload: body
    });

    if (provider === 'manual') {
      return res.status(200).json({ success: true, message: 'Evento manual registrado.' });
    }

    if (provider === 'mercadopago' && status !== 'approved') {
      return res.status(200).json({ success: true, message: 'Pagamento ainda não aprovado.' });
    }

    const tipo = body.plan || 'unique';
    const durationValue = body.durationValue || 30;
    const durationUnit = body.durationUnit || 'day';

    const licenseKey = generateKey();
    const expiresAt = computeExpiresAt(durationValue, durationUnit);
    const maxActivations = getMaxActivations(tipo);

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        key_type: tipo,
        customer_name: body.customer_name || null,
        customer_contact: body.customer_contact || null,
        payment_method: provider,
        price: body.price ? Number(body.price) : null,
        max_activations: maxActivations,
        expires_at: expiresAt,
        is_active: true,
        duration_value: Number(durationValue),
        duration_unit: durationUnit,
        hwid_change_limit: Number(body.hwidChangeLimit || 2)
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      license: data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
