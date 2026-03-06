const crypto = require('crypto');
const { getSupabase } = require('./_lib/supabase');
const {
  generateKey,
  computeExpiresAt,
  getMaxActivations,
  buildBatContent
} = require('./_lib/utils');

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

function verifyMercadoPagoSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const signature = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.body?.data?.id || '';

  if (!signature) return false;

  const ts = signature.split(',').find(x => x.trim().startsWith('ts='))?.split('=')[1] || '';
  const v1 = signature.split(',').find(x => x.trim().startsWith('v1='))?.split('=')[1] || '';

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  return hash === v1;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const supabase = getSupabase();

    if (req.body?.provider === 'manual') {
      const {
        customer_name,
        customer_contact,
        customer_email,
        price,
        tipo = 'unique',
        durationValue = 30,
        durationUnit = 'day',
        hwidChangeLimit = 2
      } = req.body;

      const licenseKey = generateKey();
      const expiresAt = computeExpiresAt(durationValue, durationUnit);
      const maxActivations = getMaxActivations(tipo);

      const { data, error } = await supabase
        .from('licenses')
        .insert({
          license_key: licenseKey,
          key_type: tipo,
          customer_name: customer_name || null,
          customer_contact: customer_contact || null,
          customer_email: customer_email || null,
          payment_method: 'manual',
          price: price ? Number(price) : null,
          max_activations: maxActivations,
          expires_at: expiresAt,
          is_active: true,
          hwid_change_limit: Number(hwidChangeLimit),
          duration_value: Number(durationValue),
          duration_unit: durationUnit
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await sendDiscord(
        `💰 Venda manual criada\nCliente: ${customer_name || customer_contact || customer_email || 'N/A'}\nLicença: ${licenseKey}`
      );

      return res.status(200).json({
        success: true,
        license: data
      });
    }

    const validSignature = verifyMercadoPagoSignature(req);
    if (!validSignature) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    await supabase.from('payment_events').insert({
      provider: 'mercadopago',
      external_id: req.body?.data?.id || null,
      status: req.body?.type || null,
      payload: req.body
    });

    await sendDiscord(
      `📩 Webhook Mercado Pago recebido\nType: ${req.body?.type || 'N/A'}\nID: ${req.body?.data?.id || 'N/A'}`
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
