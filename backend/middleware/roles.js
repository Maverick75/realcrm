function normalizeRole(user) {
  if (!user) return null;
  if (typeof user.normalizedRole === 'function') return user.normalizedRole();
  return user.role === 'sales' ? 'agent' : user.role;
}

function requireRole(...roles) {
  const allowed = roles.map((r) => (r === 'sales' ? 'agent' : r));
  return (req, res, next) => {
    const role = normalizeRole(req.user);
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
}

module.exports = { requireRole, normalizeRole };
