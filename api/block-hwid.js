const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!requireAuth(req, res)) return;

  try {
    const { hwid, reason } = req.body || {};
    if (!hwid) return res.status(400).json({ error: 'HWID obrigatório' });

    const supabase = getSupabase();
    const { error } = await supabase
      .from('blacklist')
      .insert({
        hwid,
        reason: reason || 'Bloqueado manualmente'
      });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
