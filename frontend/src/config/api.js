const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://border-bros-api.onrender.com";

export const API_ENDPOINTS = {
  login: `${API_BASE_URL}/api/login`,
  guardarReporte: `${API_BASE_URL}/api/guardar-reporte`,
  proveedores: `${API_BASE_URL}/api/proveedores`,
  categorias: `${API_BASE_URL}/api/categorias`,
};

export default API_BASE_URL;