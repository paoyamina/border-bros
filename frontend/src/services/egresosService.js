import API_BASE_URL from "../config/api.js";

export async function obtenerEgresos(negocioId, filtros = {}) {
  if (!negocioId) {
    throw new Error("No se encontró el negocio activo.");
  }

  const parametros = new URLSearchParams({
    negocio_id: negocioId,
  });

  Object.entries(filtros).forEach(([clave, valor]) => {
    if (
      valor !== undefined &&
      valor !== null &&
      String(valor).trim() !== ""
    ) {
      parametros.append(clave, valor);
    }
  });

  const respuesta = await fetch(
    `${API_BASE_URL}/api/egresos?${parametros.toString()}`
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok || !resultado.success) {
    throw new Error(
      resultado.error || "No se pudieron cargar los egresos."
    );
  }

  return resultado.egresos || [];
}

export const editarEgreso = async (egresoId, datosEgreso) => {
  const respuesta = await fetch(
    `${API_BASE_URL}/api/egresos/${egresoId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosEgreso),
    }
  );

  let resultado;

  try {
    resultado = await respuesta.json();
  } catch {
    throw new Error(
      "El servidor devolvió una respuesta que no se pudo interpretar."
    );
  }

  if (!respuesta.ok || !resultado.success) {
    throw new Error(
      resultado.error || "No fue posible actualizar el egreso."
    );
  }

  return resultado.egreso;
};