const { requireAuth } = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!requireAuth(req, res)) return;

  try {
    const { customerName, licenseKey } = req.body || {};

    const message = `========================================
   LUATOOLS PLUGIN INSTALLER
========================================

1. Baixe o arquivo .bat
2. Execute o instalador
3. Quando ele pedir, digite sua licença

Sua licença:
${licenseKey}

Guarde essa chave com cuidado.`;

    return res.status(200).json({ success: true, message });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
