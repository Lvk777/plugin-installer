const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const { id } = req.query || {};
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('activations')
      .select('*')
      .eq('license_id', id)
      .order('activated_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ activations: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
