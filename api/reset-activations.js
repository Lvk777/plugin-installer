const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!requireAuth(req, res)) return;

  try {
    const { id } = req.body || {};
    const supabase = getSupabase();

    await supabase.from('activations').delete().eq('license_id', id);

    const { error } = await supabase
      .from('licenses')
      .update({
        current_activations: 0,
        reset_count: 1
      })
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
