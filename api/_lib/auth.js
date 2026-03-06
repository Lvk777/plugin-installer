function getAdminPassword(req) {
  return req.headers['x-admin-password'] || '';
}

function isAuthorized(req) {
  return getAdminPassword(req) === process.env.ADMIN_PASSWORD;
}

function requireAuth(req, res) {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: 'Não autorizado' });
    return false;
  }
  return true;
}

module.exports = { requireAuth, isAuthorized };
