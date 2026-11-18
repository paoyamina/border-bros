const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : 'https://border-bros-api.onrender.com');
export async function apiFetch(input, options={}) {
  const headers=new Headers(options.headers || {});
  const token=sessionStorage.getItem('bosse_catalog_token');
  if(token)headers.set('Authorization',`Bearer ${token}`);
  const business=sessionStorage.getItem('bosse_negocio');
  if(business)headers.set('X-BOSSE-Negocio',business);
  const response=await window.fetch(input,{...options,headers});
  // Solo las respuestas 401 de una ruta protegida indican un token vencido.
  // Los errores 403 o 503 deben conservar la sesión: pueden ser permisos o fallos de Neon.
  const url=String(input?.url||input||'');
  const isLogin=/\/api\/login(?:[?#]|$)/.test(url);
  if(token && response.status===401 && !isLogin){
    sessionStorage.removeItem('bosse_catalog_token');
    sessionStorage.removeItem('bosse_negocio');
    window.dispatchEvent(new Event('bosse:sesion-expirada'));
  }
  return response;
}
export const API_ENDPOINTS = Object.fromEntries(Object.entries({login:'login',guardarReporte:'guardar-reporte',proveedores:'proveedores',categorias:'categorias',cortes:'cortes'}).map(([key,path])=>[key,`${API_BASE_URL}/api/${path}`]));
export default API_BASE_URL;
