const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = 'LT-';

  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) key += '-';
    key += chars[Math.floor(Math.random() * chars.length)];
  }

  return key;
}

module.exports = async (req, res) => {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {

    const body = req.body;

    const status = body.status;
    const customer = body.customer_name || null;
    const contact = body.customer_contact || null;
    const price = body.price || null;
    const tipo = body.plan || 'unique';

    if (status !== 'paid') {
      return res.status(200).json({ success: true });
    }

    const licenseKey = generateKey();

    let expiresAt = null;
    let maxActivations = 1;

    if (tipo === 'unique') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      maxActivations = 1;
    }

    if (tipo === 'multi') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      maxActivations = 3;
    }

    if (tipo === 'lifetime') {
      expiresAt = null;
      maxActivations = 1;
    }

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        key_type: tipo,
        max_activations: maxActivations,
        expires_at: expiresAt,
        is_active: true,
        customer_name: customer,
        customer_contact: contact,
        price: price,
        payment_method: 'PIX'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      license_key: licenseKey
    });

  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }
};
