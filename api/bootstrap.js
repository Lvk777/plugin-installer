const { getSupabase } = require('./_lib/supabase');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).send('Token obrigatório');

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('install_tokens')
      .select('*, licenses(*)')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (error || !data) return res.status(404).send('Token inválido');

    if (data.used_at) return res.status(403).send('Token já utilizado');

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(403).send('Token expirado');
    }

    await supabase
      .from('install_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', data.id);

    const scriptPath = path.join(process.cwd(), 'public', 'install-plugin.ps1');
    let script = fs.readFileSync(scriptPath, 'utf8');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(script);
  } catch (err) {
    return res.status(500).send(err.message || 'Erro interno');
  }
};
