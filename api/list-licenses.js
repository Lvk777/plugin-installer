const { createClient } = require('@supabase/supabase-js');

function checkAuth(req) {
  const password = req.headers['x-admin-password'];
  return password && password === process.env.ADMIN_PASSWORD;
}

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ licenses: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
