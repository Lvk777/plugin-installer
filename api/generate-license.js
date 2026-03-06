const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');
const { generateKey, getLicenseDefaults, logAction } = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!requireAuth(req, res)) return;

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

    const { expiresAt, max } = getLicenseDefaults(tipo, maxAtivacoes);
    const licenseKey = generateKey();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        key_type: tipo,
        customer_name: customerName || null,
        customer_contact: customerContact || null,
        payment_method: paymentMethod || 'PIX',
        price: price ? Number(price) : null,
        max_activations: max,
        current_activations: 0,
        expires_at: expiresAt,
        is_active: true,
        notes: notes || null
      })
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

    await logAction('generate_license', {
      license_key: licenseKey,
      key_type: tipo,
      customer_name: customerName || null
    });

    return res.status(200).json({ success: true, license: data });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
