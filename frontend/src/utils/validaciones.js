export function validarLogin(credenciales) {
  if (!credenciales.idCajero || !credenciales.idCajero.trim()) {
    return "Debes ingresar el ID de usuario.";
  }

  if (!credenciales.password || !credenciales.password.trim()) {
    return "Debes ingresar la contraseña.";
  }

  return null;
}

export function validarEgreso({ categoria, concepto, proveedor, monto }) {
  if (!categoria || !categoria.trim()) {
    return "Debes seleccionar una categoría.";
  }

  if (!concepto || !concepto.trim()) {
    return "Debes ingresar un concepto.";
  }

  if (!proveedor || !proveedor.trim()) {
    return "Debes ingresar un proveedor.";
  }

  if (!monto || parseFloat(monto) <= 0) {
    return "Debes ingresar un monto válido.";
  }

  return null;
}

export function validarNomina(filas) {
  if (!filas.length) {
    return "No hay empleados capturados.";
  }

  const nombres = [];

  for (const fila of filas) {
    if (!fila.nombre || !fila.nombre.trim()) {
      return "Hay empleados sin nombre.";
    }

    if (fila.total <= 0) {
      return `El empleado ${fila.nombre} tiene total inválido.`;
    }

    const nombreLower = fila.nombre.trim().toLowerCase();

    if (nombres.includes(nombreLower)) {
      return `Empleado duplicado: ${fila.nombre}`;
    }

    nombres.push(nombreLower);
  }

  return null;
}