const SATISFECHO_MAX = 2;

export const esEntregada = (entrega) =>
  ["entregada", "completada", "completado"].includes(String(entrega.estado || "").toLowerCase());

export const mesClave = (fecha) => String(fecha || "").slice(0, 7);

export const mesLabel = (clave) => {
  if (!clave) return "Sin mes";
  return new Date(`${clave}-01T00:00:00`).toLocaleDateString("es-AR", { month: "short", year: "numeric" });
};

export const crearResumenMensual = (entregas, respuestas) => {
  const entregadas = entregas.filter((e) => esEntregada(e) && mesClave(e.fecha_entrega));
  const respondidas = respuestas.filter((r) => Number(r.nivel) >= 1 && Number(r.nivel) <= 4 && mesClave(r.fecha));
  const claves = Array.from(new Set([...entregadas.map((e) => mesClave(e.fecha_entrega)), ...respondidas.map((r) => mesClave(r.fecha))])).sort();

  return claves.map((clave) => {
    const entregasMes = entregadas.filter((e) => mesClave(e.fecha_entrega) === clave).length;
    const respuestasMes = respondidas.filter((r) => mesClave(r.fecha) === clave);
    const satisfechas = respuestasMes.filter((r) => Number(r.nivel) <= SATISFECHO_MAX).length;
    const satisfaccion = respuestasMes.length ? Math.round((satisfechas / respuestasMes.length) * 100) : 0;
    return { mes: mesLabel(clave), clave, entregas: entregasMes, respuestas: respuestasMes.length, satisfaccion };
  });
};

export const calcularIndicadores = (rows) => {
  const actual = rows[rows.length - 1] || { entregas: 0, respuestas: 0, satisfaccion: 0 };
  const anterior = rows[rows.length - 2] || null;
  const variacionEntregas = anterior ? actual.entregas - anterior.entregas : 0;
  return { actual, anterior, variacionEntregas };
};