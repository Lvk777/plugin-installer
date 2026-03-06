const { getSupabase } = require('./_lib/supabase');
const { generateKey, getLicenseDefaults, logAction } = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body || {};
    const { status, external_id, customer_name, customer_contact, price, tipo = 'unique' } = body;

    const supabase = getSupabase();

    await supabase.from('payment_events').insert({
      provider: body.provider || 'custom',
      external_id: external_id || null,
      status: status || null,
      payload: body
    });

    if (status !== 'paid') {
      return res.status(200).json({ success: true, message: 'Evento recebido sem geração de licença.' });
    }

    const licenseKey = generateKey();
    const { expiresAt, max } = getLicenseDefaults(tipo, tipo === 'multi' ? 3 : 1);

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        key_type: tipo,
        customer_name: customer_name || null,
        customer_contact: customer_contact || null,
        payment_method: 'PIX',
        price: price ? Number(price) : null,
        max_activations: max,
        expires_at: expiresAt,
        is_active: true
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await logAction('payment_auto_license', {
      external_id,
      license_key: licenseKey,
      customer_name
    });

    return res.status(200).json({
      success: true,
      license: data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
