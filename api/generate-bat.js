const { requireAuth } = require('./_lib/auth');
const { buildBatContent } = require('./_lib/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!requireAuth(req, res)) return;

  try {
    const domain = process.env.PUBLIC_SITE_URL || 'https://plugin-installer.vercel.app';
    const content = buildBatContent({ domain });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="luatools-installer.bat"');
    return res.status(200).send(content);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
