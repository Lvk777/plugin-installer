const { requireAuth } = require('./_lib/auth');
const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (!requireAuth(req, res)) return;

  try {
    const supabase = getSupabase();

    const { data: licenses, error } = await supabase
      .from('licenses')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalLicenses = licenses.length;
    const activeLicenses = licenses.filter((x) => x.is_active).length;
    const inactiveLicenses = licenses.filter((x) => !x.is_active).length;
    const expiredLicenses = licenses.filter((x) => x.expires_at && new Date(x.expires_at) < now).length;
    const monthlySales = licenses
      .filter((x) => new Date(x.created_at) >= monthStart)
      .reduce((sum, x) => sum + Number(x.price || 0), 0);

    return res.status(200).json({
      totalLicenses,
      activeLicenses,
      inactiveLicenses,
      expiredLicenses,
      monthlySales
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
