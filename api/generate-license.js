const { createClient } = require('@supabase/supabase-js');

function checkAuth(req) {
  const password = req.headers['x-admin-password'];
  return password && password === process.env.ADMIN_PASSWORD;
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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const {
      tipo,
      maxAtivacoes,
      customerName,
      customerContact,
      paymentMethod,
      price,
      notes
    } = req.body || {};

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const licenseKey = generateKey();

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
      return res.status(400).json({ error: 'Tipo inválido' });
    }

    const payload = {
      license_key: licenseKey,
      key_type: tipo,
      max_activations: max,
      current_activations: 0,
      expires_at: expiresAt,
      is_active: true,
      customer_name: customerName || null,
      customer_contact: customerContact || null,
      payment_method: paymentMethod || 'PIX',
      price: price ? Number(price) : null,
      notes: notes || null
    };

    const { data, error } = await supabase
      .from('licenses')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (process.env.DISCORD_WEBHOOK_URL) {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:
            `🔑 **Nova licença gerada**\n` +
            `**Cliente:** ${customerName || 'Não informado'}\n` +
            `**Contato:** ${customerContact || 'Não informado'}\n` +
            `**Plano:** ${tipo}\n` +
            `**Preço:** ${price ? `R$ ${Number(price).toFixed(2)}` : 'Não informado'}\n` +
            `**Pagamento:** ${paymentMethod || 'PIX'}\n` +
            `**Key:** \`${licenseKey}\``
        })
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      license: data
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
