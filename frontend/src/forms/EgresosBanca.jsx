import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import estilos from "../styles/estilos";
import { validarEgreso } from "../utils/validaciones";
import API_BASE_URL, { API_ENDPOINTS } from "../config/api";

function EgresosBanca({ usuarioActivo, usuarioId, rol, onVolver }) {

  const [fechaEgreso, setFechaEgreso] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [montoEgreso, setMontoEgreso] = useState("");
  const [categoriaEgreso, setCategoriaEgreso] = useState("");
  const [conceptoEgreso, setConceptoEgreso] = useState("");
  const [beneficiarioEgreso, setBeneficiarioEgreso] = useState("");
  const [bancoOrigen, setBancoOrigen] = useState("BBVA");
  const [referencia, setReferencia] = useState("");
  const [fotosEgreso, setFotosEgreso] = useState([]);
  const [proveedoresExistentes, setProveedoresExistentes] = useState([]);
const [categoriasExistentes, setCategoriasExistentes] = useState([]);
const puedeAgregarCategoria = ["contador", "socio", "gobernador"].includes(
  String(rol || "").trim().toLowerCase()
);

  const [listaCategorias, setListaCategorias] = useState([
    "Proveedores",
    "Nómina / Anticipos",
    "Gastos Operativos",
    "Mantenimiento",
  ]);

  useEffect(() => {

  const cargarProveedores = async () => {

    try {

      const respuesta = await fetch(
  `${API_BASE_URL}/api/proveedores`
);

      const resultado = await respuesta.json();

      if (resultado.success) {
        setProveedoresExistentes(resultado.proveedores);
      }

    } catch (error) {
      console.error("Error cargando proveedores:", error);
    }
  };

  const cargarCategorias = async () => {

    try {

      const respuesta = await fetch(
        `${API_BASE_URL}/api/categorias`
      );

      const resultado = await respuesta.json();

      if (resultado.success) {
        setCategoriasExistentes(resultado.categorias);
      }

    } catch (error) {
      console.error("Error cargando categorías:", error);
    }
  };

  cargarProveedores();
  cargarCategorias();

}, []);

 const agregarProveedor = async () => {
  const nuevo = prompt("Nombre del nuevo proveedor:");

  if (!nuevo?.trim()) return;

  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/proveedores/buscar-o-crear`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nuevo.trim(),
          usuario_id: usuarioId,
        }),
      }
    );

    const resultado = await respuesta.json();

    if (!resultado.success) {
      throw new Error(
        resultado.error || "No se pudo guardar el proveedor."
      );
    }

    const proveedorGuardado = resultado.proveedor;

    setProveedoresExistentes((prev) => {
      const yaExiste = prev.some(
        (proveedor) => proveedor.id === proveedorGuardado.id
      );

      if (yaExiste) return prev;

      return [...prev, proveedorGuardado].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es")
      );
    });

    setBeneficiarioEgreso(proveedorGuardado.nombre);

    alert("✅ Proveedor agregado correctamente.");
  } catch (error) {
    alert("🚨 Error al agregar proveedor: " + error.message);
  }
};

  const agregarCategoria = () => {
    const nueva = prompt("Nombre de la nueva categoría:");

    if (!nueva?.trim()) return;

    if (!listaCategorias.includes(nueva.trim())) {
      setListaCategorias([...listaCategorias, nueva.trim()]);
    }

    setCategoriaEgreso(nueva.trim());
  };

const descargarExcelBanca = () => {
  const filas = [
    ["EGRESO BANCOS - BOSSE"],
    [],
    ["Fecha:", fechaEgreso],
    ["Operador:", usuarioActivo],
    ["Banco origen:", bancoOrigen],
    ["Referencia:", referencia],
    ["Proveedor:", beneficiarioEgreso],
    ["Categoría:", categoriaEgreso],
    ["Concepto:", conceptoEgreso],
    ["Monto:", parseFloat(montoEgreso) || 0],
  ];

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro, hoja, "Egreso Banca");

  XLSX.writeFile(
    libro,
    `Egreso_Banca_BOSSE_${fechaEgreso}_${referencia || "SinReferencia"}.xlsx`
  );
};

  const registrarEgreso = async () => {

  const errorValidacion = validarEgreso({
    categoria: categoriaEgreso,
    concepto: conceptoEgreso,
    proveedor: beneficiarioEgreso,
    monto: montoEgreso,
  });

  if (errorValidacion) {
    alert(`⚠️ ${errorValidacion}`);
    return;
  }

  if (fotosEgreso.length === 0) {

      const continuar = window.confirm(
        "⚠️ No agregaste comprobante. ¿Deseas continuar?"
      );

      if (!continuar) return;
    }

    const confirmar = window.confirm(`
¿REGISTRAR ESTE EGRESO BANCARIO?

Banco: ${bancoOrigen}
Proveedor: ${beneficiarioEgreso}
Monto: $${parseFloat(montoEgreso).toLocaleString()}
`);

    if (!confirmar) return;
    try {

  const formData = new FormData();

  formData.append(
    "nombreCarpeta",
    `EGRESO_BANCA_${fechaEgreso}_${beneficiarioEgreso}`
  );

  formData.append("usuario", usuarioActivo);

  formData.append(
    "detalles",
    JSON.stringify({
      tipo: "EGRESO_BANCA",
      fecha: fechaEgreso,
      banco: bancoOrigen,
      referencia,
      categoria: categoriaEgreso,
      concepto: conceptoEgreso,
      proveedor: beneficiarioEgreso,
      monto: parseFloat(montoEgreso) || 0,
    })
  );

  fotosEgreso.forEach((file) => {
    formData.append("fotos", file);
  });

  const respuesta = await fetch(API_ENDPOINTS.guardarReporte, {
    method: "POST",
    body: formData,
  });

  const resultado = await respuesta.json();

  if (!resultado.success) {
    throw new Error(resultado.error || "Error desconocido.");
  }

  const respuestaProveedor = await fetch(`${API_BASE_URL}/api/proveedores/buscar-o-crear`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: beneficiarioEgreso,
    usuario_id: usuarioId,
  }),
});

const resultadoProveedor = await respuestaProveedor.json();

if (!resultadoProveedor.success) {
  throw new Error(resultadoProveedor.error || "Error al guardar proveedor.");
}

const proveedorId = resultadoProveedor.proveedor.id;

const respuestaCategoria = await fetch(`${API_BASE_URL}/api/categorias/buscar-o-crear`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: categoriaEgreso,
  }),
});

const resultadoCategoria = await respuestaCategoria.json();

if (!resultadoCategoria.success) {
  throw new Error(resultadoCategoria.error || "Error al guardar categoría.");
}

const categoriaId = resultadoCategoria.categoria.id;

const montoNumerico = parseFloat(montoEgreso) || 0;

const respuestaBD = await fetch(`${API_BASE_URL}/api/egresos`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tipo_egreso: "banca",
    fecha: fechaEgreso,
    divisa: "MXN",
    tipo_cambio: 1,
    monto_original: montoNumerico,
    monto_mxn: montoNumerico,
    categoria_id: categoriaId,
    proveedor_id: proveedorId,
    concepto: conceptoEgreso,
    referencia: referencia || null,
    usuario_crea_id: usuarioId,
    drive_folder_id: resultado.folderId,
    drive_folder_url: resultado.folderUrl,
    estatus: "REGISTRADO",
  }),
});

const resultadoBD = await respuestaBD.json();

if (!resultadoBD.success) {
  throw new Error(resultadoBD.error || "Error al guardar en base de datos.");
}

descargarExcelBanca();

alert("✅ Egreso banca registrado correctamente y Excel descargado.");
onVolver();

  alert("✅ Egreso banca registrado correctamente.");

  onVolver();

} catch (error) {

  console.error("Error egreso bancos:", error);

  alert("🚨 Error al registrar egreso banca: " + error.message);
}
  };

  return (
    <div style={estilos.container}>
      <div style={estilos.card}>

        <button
          onClick={onVolver}
          style={{
            background: "none",
            border: "none",
            color: "#888",
            cursor: "pointer",
            marginBottom: "20px",
            fontSize: "12px",
            textTransform: "uppercase",
          }}
        >
          ← Volver al menú
        </button>

        <div style={estilos.logoSpace}>
          <img
            src="/Logo_BOSSE.png"
            alt="BOSSE"
            style={{
              maxHeight: "100px",
              marginBottom: "15px",
              display: "block",
              margin: "0 auto",
            }}
          />

          <h1 style={estilos.h1}>Egresos Banca</h1>

          <p style={estilos.p}>
            Operador: {usuarioActivo}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "15px",
            }}
          >

            <div>
              <label style={estilos.panelLabel}>
                FECHA DEL EGRESO
              </label>

              <input
                type="date"
                value={fechaEgreso}
                onChange={(e) => setFechaEgreso(e.target.value)}
                style={{ ...estilos.input, width: "100%" }}
              />
            </div>

            <div>
              <label style={estilos.panelLabel}>
                BANCO ORIGEN
              </label>

              <select
                value={bancoOrigen}
                onChange={(e) => setBancoOrigen(e.target.value)}
                style={{
                  ...estilos.input,
                  width: "100%",
                  height: "42px",
                }}
              >
                <option>Kueski</option>
              </select>
            </div>

          </div>

          <div style={estilos.section}>

            <label style={estilos.panelLabel}>
              CATEGORÍA
            </label>

            <div style={{ display: "flex", gap: "5px" }}>

              <select
                value={categoriaEgreso}
                onChange={(e) => setCategoriaEgreso(e.target.value)}
                style={{
                  ...estilos.input,
                  flex: 1,
                  height: "42px",
                }}
              >
                <option value="">-- Selecciona --</option>

                {categoriasExistentes.map((cat) => (
  <option key={cat.id} value={cat.nombre}>
    {cat.nombre}
  </option>
))}

              </select>

              {puedeAgregarCategoria && (
  <button
    type="button"
    style={estilos.btnAdd}
    onClick={agregarCategoria}
  >
    +
  </button>
)}

            </div>

          </div>

          <div style={estilos.section}>

            <label style={estilos.panelLabel}>
              DETALLES DEL PAGO
            </label>

            <input
              placeholder="Concepto del egreso"
              value={conceptoEgreso}
              onChange={(e) => setConceptoEgreso(e.target.value)}
              style={{
                ...estilos.input,
                width: "100%",
                marginBottom: "10px",
              }}
            />

            <div style={{ display: "flex", gap: "5px" }}>

              <input
                list="proveedores-data"
                placeholder="Proveedor / Beneficiario"
                value={beneficiarioEgreso}
                onChange={(e) => setBeneficiarioEgreso(e.target.value)}
                style={{
                  ...estilos.input,
                  flex: 1,
                }}
              />

              <datalist id="proveedores-data">
  {proveedoresExistentes.map((proveedor) => (
    <option key={proveedor.id} value={proveedor.nombre} />
  ))}
</datalist>

              <button
                type="button"
                style={estilos.btnAdd}
                onClick={agregarProveedor}
              >
                +
              </button>

            </div>

          </div>

          <div style={estilos.section}>

            <label style={estilos.panelLabel}>
              REFERENCIA / FOLIO BANCARIO
            </label>

            <input
              placeholder="Ej. Transferencia 88492"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              style={{
                ...estilos.input,
                width: "100%",
              }}
            />

          </div>

          <div
            style={{
              background: "#fafafa",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #eee",
              textAlign: "center",
            }}
          >

            <label
              style={{
                ...estilos.panelLabel,
                color: "#333",
              }}
            >
              MONTO TOTAL PAGADO
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >

              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "300",
                }}
              >
                $
              </span>

              <input
                type="number"
                placeholder="0.00"
                value={montoEgreso}
                onChange={(e) => setMontoEgreso(e.target.value)}
                style={{
                  ...estilos.input,
                  width: "150px",
                  fontSize: "28px",
                  fontWeight: "700",
                  border: "none",
                  background: "none",
                  textAlign: "center",
                }}
              />

            </div>

          </div>

          <div
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              border: "1px dashed #ddd",
            }}
          >

            <label style={estilos.panelLabel}>
              COMPROBANTE / PDF / FOTO
            </label>

            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) =>
                setFotosEgreso(Array.from(e.target.files))
              }
              style={{
                fontSize: "12px",
                marginTop: "10px",
              }}
            />

          </div>

          <button
            onClick={registrarEgreso}
            disabled={!montoEgreso || !conceptoEgreso || !categoriaEgreso}
            style={{
              ...estilos.btnSubmit,
              marginTop: "10px",
              background:
  !montoEgreso || !conceptoEgreso || !categoriaEgreso
    ? "#ccc"
    : "#000",
            }}
          >
            REGISTRAR EGRESO BANCARIO
          </button>

        </div>

      </div>
    </div>
  );
}

export default EgresosBanca;