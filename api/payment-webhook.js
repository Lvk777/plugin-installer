module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  return res.status(200).json({
    success: true,
    message: 'Webhook recebido. Integração PIX será implementada na próxima etapa.'
  });
};
