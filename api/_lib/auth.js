function requireAuth(req, res) {
  const password = req.headers['x-admin-password'];
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Não autorizado' });
    return false;
  }
  return true;
}

module.exports = { requireAuth };
