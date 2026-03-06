const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const supabase = getSupabase();
    const { search = '', type = '', status = '' } = req.query || {};

    let query = supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (type) query = query.eq('key_type', type);
    if (status === 'active') query = query.eq('is_active', true);
    if (status === 'inactive') query = query.eq('is_active', false);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    let filtered = data || [];
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(item =>
        (item.license_key || '').toLowerCase().includes(term) ||
        (item.customer_name || '').toLowerCase().includes(term) ||
        (item.customer_contact || '').toLowerCase().includes(term)
      );
    }

    return res.status(200).json({ licenses: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
