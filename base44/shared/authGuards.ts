export async function requireAdmin(base44) {
  let user = null;
  try {
    user = await base44.auth.me();
  } catch (_) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!user) return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (user.role !== "admin") return { response: Response.json({ error: "Forbidden: se requiere rol admin" }, { status: 403 }) };
  return { user };
}