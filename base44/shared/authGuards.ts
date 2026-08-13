export async function requireAuthenticated(base44) {
  let user = null;
  try {
    user = await base44.auth.me();
  } catch (_) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!user) return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user };
}

export async function requireAdmin(base44) {
  const auth = await requireAuthenticated(base44);
  if (auth.response) return auth;
  if (auth.user.role !== "admin") return { response: Response.json({ error: "Forbidden: se requiere rol admin" }, { status: 403 }) };
  return auth;
}