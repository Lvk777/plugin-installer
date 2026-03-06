const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');
const { logAction } = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (!requireAuth(req, res)) return;

  try {
    const { id } = req.body || {};
    const supabase = getSupabase();

    const { error } = await supabase
      .from('licenses')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAction('delete_license', { id });

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
