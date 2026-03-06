const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');
const { generateToken } = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!requireAuth(req, res)) return;

  try {
    const { licenseId, hoursValid = 24 } = req.body || {};
    if (!licenseId) return res.status(400).json({ error: 'licenseId obrigatório' });

    const token = generateToken();
    const expiresAt = new Date(Date.now() + Number(hoursValid) * 60 * 60 * 1000).toISOString();

    const supabase = getSupabase();
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

    return res.status(200).json({
      success: true,
      token: data.token,
      bootstrapUrl: `${domain}/api/bootstrap?token=${data.token}`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
