import API_BASE_URL from "../config/api";

export async function obtenerHistorialCorte(corteId) {
  if (!corteId) {
    throw new Error("No se recibió el ID del corte.");
  }

  const respuesta = await fetch(
    `${API_BASE_URL}/api/cortes/${corteId}/historial`
  );

  const resultado = await respuesta.json();

  if (!respuesta.ok || !resultado.success) {
    throw new Error(
      resultado.error || "No se pudo cargar el historial del corte."
    );
  }

  return resultado.historial || [];
}