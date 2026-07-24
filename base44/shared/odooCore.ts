export const m2o = (v) => (Array.isArray(v) ? v[1] : v || "");

function normalizeOdooUrl(url) {
  return url.trim().replace(/\/$/, "").replace(/\/(web|odoo)$/, "");
}

export async function createOdooClient(defaultLimit = 100) {
  const ODOO_URL = normalizeOdooUrl(Deno.env.get("ODOO_URL") || "");
  const ODOO_DB = Deno.env.get("ODOO_DB");
  const ODOO_USER = Deno.env.get("ODOO_USERNAME");
  const ODOO_KEY = Deno.env.get("ODOO_API_KEY");
  if (!ODOO_URL || !ODOO_DB || !ODOO_USER || !ODOO_KEY) throw new Error("Faltan credenciales de Odoo");

  let idc = 1;
  const rpc = async (endpoint, params) => {
    const res = await fetch(ODOO_URL + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "call", params, id: idc++ }),
    });
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (_) {
      throw new Error("Odoo devolvió una página web en vez de JSON. Revisá que ODOO_URL sea la URL base de la instancia, sin /web.");
    }
    if (json.error) throw new Error(JSON.stringify(json.error));
    return json.result;
  };

  const uid = await rpc("/jsonrpc", {
    service: "common",
    method: "authenticate",
    args: [ODOO_DB, ODOO_USER, ODOO_KEY, {}],
  });
  if (!uid) throw new Error("No se pudo autenticar en Odoo");

  const searchRead = async (model, domain, fields, order, lim, offset) => {
    const kwargs = { fields, limit: lim || defaultLimit };
    if (order) kwargs.order = order;
    if (offset) kwargs.offset = offset;
    return rpc("/jsonrpc", {
      service: "object",
      method: "execute_kw",
      args: [ODOO_DB, uid, ODOO_KEY, model, "search_read", [domain], kwargs],
    });
  };

  const searchReadAll = async (model, domain, fields, order, batch = 200, max = 3000) => {
    const out = [];
    let off = 0;
    while (off < max) {
      const rows = await searchRead(model, domain, fields, order, batch, off);
      out.push(...rows);
      if (rows.length < batch) break;
      off += batch;
    }
    return out;
  };

  const reportUrl = (report, ids) => `${ODOO_URL}/report/pdf/${report}/${ids.join(",")}`;
  return { ODOO_URL, ODOO_DB, ODOO_KEY, uid, rpc, searchRead, searchReadAll, m2o, reportUrl };
}

const DEFAULT_ZONAS = {
  norte: ["vicente lópez","vicente lopez","san isidro","tigre","san martín","san martin","tres de febrero","3 de febrero","pilar","escobar","malvinas argentinas","josé c. paz","jose c. paz","san miguel","zárate","zarate","campana","maschwitz","nordelta","puerto madryn","benavídez","benavidez","del viso","la lucila","olivos","martínez","martinez","acassuso","beccar","carupá","carupa"],
  sur: ["avellaneda","lanús","lanus","quilmes","berazategui","florencio varela","almirante brown","lomas de zamora","esteban echeverría","ezeiza","presidente perón","presidente peron","la plata","berisso","ensenada","cañuelas","brandsen","gutiérrez","gutierrez","don orazio","city bell","gonnet","tolosa","villa elisa","villa ballester"],
  oeste: ["morón","moron","ituzaingó","ituzaingo","hurlingham","la matanza","merlo","moreno","general las heras","marcos paz","luján","lujan","navarro","rodríguez","rodriguez","haedo","ramos mejía","ramos mejia","san justo","ciudadela","caseros","el palomar","villa luzuriaga","isidro casanova","gregorio de laferrere","rafael castillo","libertad","pasco","tristán suárez","tristan suarez"],
  caba: ["capital federal","caba","c.a.b.a.","c.a.b.a","ciudad autónoma","ciudad autonoma","buenos aires","capital","palermo","belgrano","caballito","flores","devoto","nuñez","nunez","recoleta","almagro","villa crespo","balvanera","boedo","san telmo","la boca","mataderos","liniers","versalles","villa urquiza","villa devoto","monte castro","villa real","agronomía","parque chas","colegiales","núñez"]
};

export async function createZonaResolver(base44) {
  let zonaConfig = Object.entries(DEFAULT_ZONAS).map(([k, ciudades]) => ({
    nombre: k === "norte" ? "Zona Norte" : k === "sur" ? "Zona Sur" : k === "oeste" ? "Zona Oeste" : "CABA",
    ciudades,
  }));
  try {
    const cfg = await base44.asServiceRole.entities.ZonaEntrega.list();
    if (Array.isArray(cfg) && cfg.length) {
      zonaConfig = cfg.map((z) => ({
        nombre: z.nombre,
        ciudades: (z.ciudades || "").split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean),
      }));
    }
  } catch (_) {}

  const zonaPorCiudad = (city) => {
    const c = (city || "").toLowerCase().trim();
    if (!c) return "CABA";
    for (const z of zonaConfig) {
      if (z.ciudades.some((x) => c === x || c.includes(x) || x.includes(c))) return z.nombre;
    }
    return "CABA";
  };
  const zonaDe = (city, carrier) => {
    if (/andreani|expreso|expresa|expresos|correo|oca|andreani/i.test(carrier || "")) return "Andreani/Expresos";
    return zonaPorCiudad(city);
  };
  return { zonaDe, zonaPorCiudad };
}