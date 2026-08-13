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
  if (!Array.isArray(filas) || filas.length === 0) {
    return "No hay empleados capturados.";
  }

  const filasConEmpleado = filas.filter(
    (fila) => fila.empleado_id && fila.nombre?.trim()
  );

  if (filasConEmpleado.length === 0) {
    return "Debes capturar al menos un empleado.";
  }

  const nombres = [];

  for (const fila of filasConEmpleado) {
    const nombre = fila.nombre?.trim() || "Empleado";
    const nombreLower = nombre.toLowerCase();

    // Evitar empleados duplicados
    if (nombres.includes(nombreLower)) {
      return `Empleado duplicado: ${nombre}`;
    }

    nombres.push(nombreLower);

    // Validar método de pago
    if (
      !["Efectivo", "Banco", "Banca"].includes(
        fila.metodo_pago_nomina
      )
    ) {
      return `Selecciona un método de pago válido para ${nombre}.`;
    }

    // ==================================================
    // POR MESA
    // ==================================================
    if (fila.modalidad_pago === "POR_MESA") {
      const mesas = Array.isArray(fila.mesas)
        ? fila.mesas
        : [];

      for (const mesa of mesas) {
        if (!mesa.fecha) {
          return `${nombre} tiene una fecha de mesas sin capturar.`;
        }

        const cantidadMesas =
          Number(mesa.cantidad_mesas) || 0;

        const tarifaMesa =
          Number(mesa.tarifa_mesa) || 0;

        if (cantidadMesas < 0) {
          return `${nombre} tiene una cantidad de mesas inválida.`;
        }

        if (cantidadMesas > 0 && tarifaMesa <= 0) {
          return `${nombre} tiene mesas capturadas sin una tarifa válida.`;
        }
      }
    }

    // ==================================================
    // DIARIO / SEMANAL
    // ==================================================
    else {
      const cantidad = Number(fila.cantidad) || 0;
      const tarifa = Number(fila.tarifa) || 0;

      if (cantidad < 0) {
        return `${nombre} tiene una cantidad inválida.`;
      }

      if (cantidad > 0 && tarifa <= 0) {
        return `${nombre} tiene una tarifa inválida.`;
      }
    }

    // Permitimos total 0 por empleado,
    // pero nunca un total negativo
    if (Number(fila.total) < 0) {
      return `El total de ${nombre} no puede ser negativo.`;
    }
  }

  const totalNomina = filasConEmpleado.reduce(
    (acumulado, fila) =>
      acumulado + (Number(fila.total) || 0),
    0
  );

  // La prenómina completa sí debe tener algún monto
  if (totalNomina <= 0) {
    return "El total de la prenómina debe ser mayor a cero.";
  }

  return null;
}