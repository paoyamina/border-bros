import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import estilos from "../styles/estilos";
import { validarEgreso } from "../utils/validaciones";
import API_BASE_URL, { API_ENDPOINTS } from "../config/api";

function EgresosEfectivo({
  usuarioActivo,
  usuarioId,
  rol,
  onVolver
}) {
  const [fechaEgreso, setFechaEgreso] = useState(new Date().toISOString().split("T")[0]);
  const [tcEgreso, setTcEgreso] = useState(18.5);
  const [montoEgreso, setMontoEgreso] = useState("");
  const [divisaEgreso, setDivisaEgreso] = useState("MXN");
  const [categoriaEgreso, setCategoriaEgreso] = useState("Gastos Operativos");
  const [conceptoEgreso, setConceptoEgreso] = useState("");
  const [beneficiarioEgreso, setBeneficiarioEgreso] = useState("");
  const [fotosEgreso, setFotosEgreso] = useState([]);
  const [proveedoresExistentes, setProveedoresExistentes] = useState([]);
const [categoriasExistentes, setCategoriasExistentes] = useState([]);
const [conceptosExistentes, setConceptosExistentes] = useState([]);
const [guardando, setGuardando] = useState(false);
const puedeAgregarCategoria = ["contador", "socio", "gobernador"].includes(
  String(rol || "").trim().toLowerCase()
);
  useEffect(() => {

  const cargarProveedores = async () => {

    try {

      const respuesta = await fetch(
        `${API_BASE_URL}/api/proveedores`
      );

      const resultado = await respuesta.json();
      console.log("RESPUESTA DRIVE:", resultado);

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

const cargarConceptos = async () => {
  try {
    const respuesta = await fetch(
      `${API_BASE_URL}/api/egresos/conceptos`
    );

    const resultado = await respuesta.json();

    if (resultado.success) {
      setConceptosExistentes(resultado.conceptos || []);
    }
  } catch (error) {
    console.error("Error cargando conceptos:", error);
  }
};

  cargarProveedores();
  cargarCategorias();
  cargarConceptos();


  
}, []);
 

  const montoNumerico = parseFloat(montoEgreso) || 0;
  const montoMXN = divisaEgreso === "USD" ? montoNumerico * tcEgreso : montoNumerico;

  const agregarProveedor = () => {
  const nuevo = prompt("Nombre del nuevo proveedor:");

  if (!nuevo?.trim()) return;

  setBeneficiarioEgreso(nuevo.trim());
};

   const agregarCategoria = () => {
  const nueva = prompt("Nombre de la nueva categoría:");

  if (!nueva?.trim()) return;

  setCategoriaEgreso(nueva.trim());
};

const limpiarFormulario = () => {
  // Conservamos la fecha para capturar varios egresos del mismo día.
  setMontoEgreso("");
  setDivisaEgreso("MXN");
  setTcEgreso(18.5);
  setCategoriaEgreso("");
  setConceptoEgreso("");
  setBeneficiarioEgreso("");
  setFotosEgreso([]);
};

const descargarExcelEgreso = () => {

  const filas = [
    ["EGRESO EFECTIVO - BOSSE"],
    [],
    ["Fecha:", fechaEgreso],
    ["Operador:", usuarioActivo],
    ["Proveedor:", beneficiarioEgreso],
    ["Categoría:", categoriaEgreso],
    ["Concepto:", conceptoEgreso],
    ["Divisa:", divisaEgreso],
    ["Tipo de cambio:", divisaEgreso === "USD" ? tcEgreso : ""],
    ["Monto original:", montoNumerico],
    ["Monto MXN:", montoMXN],
  ];

  const hoja = XLSX.utils.aoa_to_sheet(filas);

  const libro = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(libro, hoja, "Egreso Efectivo");

  XLSX.writeFile(
    libro,
    `Egreso_Efectivo_BOSSE_${fechaEgreso}_${beneficiarioEgreso || "SinProveedor"}.xlsx`
  );
};
  const enviarEgresoADrive = async () => {

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
        "⚠️ No agregaste comprobante. ¿Deseas continuar de todos modos?"
      );
      if (!continuar) return;
    }

    const confirmar = window.confirm(`
¿ESTÁS SEGURO DE REGISTRAR ESTE EGRESO?

Proveedor: ${beneficiarioEgreso}
Categoría: ${categoriaEgreso}
Concepto: ${conceptoEgreso}
Monto: ${
      divisaEgreso === "USD"
        ? `${montoNumerico} USD ($${montoMXN.toFixed(2)} MXN)`
        : `$${montoNumerico.toFixed(2)} MXN`
    }
`);

  if (!confirmar) return;

if (guardando) return;

setGuardando(true);

try {
  const formData = new FormData();

  formData.append(
    "nombreCarpeta",
    `EGRESO_EFECTIVO_${fechaEgreso}_${categoriaEgreso}_${beneficiarioEgreso}`
  );

  formData.append("usuario", usuarioActivo);

  formData.append(
    "detalles",
    JSON.stringify({
      tipo: "EGRESO_EFECTIVO",
      fecha: fechaEgreso,
      monto: montoNumerico,
      divisa: divisaEgreso,
      tc: tcEgreso,
      montoMXN,
      categoria: categoriaEgreso,
      concepto: conceptoEgreso,
      proveedor: beneficiarioEgreso,
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

  console.log("RESPUESTA REAL DRIVE:", resultado);

  if (!resultado.success) {
    throw new Error(resultado.error || "Error desconocido en servidor.");
  }

  console.log("USUARIO ID EN EGRESO:", usuarioId);
  const respuestaProveedor = await fetch(`${API_BASE_URL}/api/proveedores/buscar-o-crear`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
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
  const respuestaBD = await fetch(`${API_BASE_URL}/api/egresos`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
  tipo_egreso: "efectivo",
  fecha: fechaEgreso,
  divisa: divisaEgreso,
  tipo_cambio: divisaEgreso === "USD" ? tcEgreso : 1,
  monto_original: montoNumerico,
  monto_mxn: montoMXN,
  proveedor_id: proveedorId,
  concepto: conceptoEgreso,
  referencia: null,
  usuario_crea_id: usuarioId,
  drive_folder_id: resultado.folderId,
  drive_folder_url: resultado.folderUrl,
  estatus: "REGISTRADO",
}),
});

const resultadoBD = await respuestaBD.json();

console.log("RESPUESTA BD:", resultadoBD);

if (!resultadoBD.success) {
  throw new Error(resultadoBD.error || "Error al guardar en base de datos.");
}

// Safari: la descarga ocurre solamente después de confirmar
// que la base de datos guardó correctamente.
descargarExcelEgreso();

limpiarFormulario();

alert(
  "✅ Egreso efectivo registrado correctamente. Ya puedes capturar otro gasto."
);
} catch (error) {
  console.error("Error al registrar egreso efectivo:", error);
  alert("🚨 Error al registrar egreso efectivo: " + error.message);
} finally {
  setGuardando(false);
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
          <h1 style={estilos.h1}>Egresos (Efectivo)</h1>
          <p style={estilos.p}>Operador: {usuarioActivo}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div>
              <label style={estilos.panelLabel}>FECHA DEL GASTO</label>
              <input
                type="date"
                value={fechaEgreso}
                onChange={(e) => setFechaEgreso(e.target.value)}
                style={{ ...estilos.input, width: "100%" }}
              />
            </div>

            <div>
              <label style={estilos.panelLabel}>DIVISA</label>
              <select
                value={divisaEgreso}
                onChange={(e) => setDivisaEgreso(e.target.value)}
                style={{ ...estilos.input, width: "100%", height: "42px" }}
              >
                <option value="MXN">MXN (Pesos)</option>
                <option value="USD">USD (Dólares)</option>
              </select>
            </div>
          </div>

          {divisaEgreso === "USD" && (
            <div
              style={{
                background: "#fff9e6",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #ffeeba",
              }}
            >
              <label style={estilos.panelLabel}>TIPO DE CAMBIO (USD/MXN)</label>
              <input
                type="number"
                value={tcEgreso}
                onChange={(e) => setTcEgreso(parseFloat(e.target.value))}
                style={{ ...estilos.input, width: "100px" }}
              />
            </div>
          )}

          <div style={estilos.section}>
            <label style={estilos.panelLabel}>CATEGORÍA</label>
            <div style={{ display: "flex", gap: "5px" }}>
              <select
                value={categoriaEgreso}
                onChange={(e) => setCategoriaEgreso(e.target.value)}
                style={{ ...estilos.input, flex: 1, height: "42px" }}
              >
                <option value="">-- Selecciona --</option>
                {categoriasExistentes.map((cat) => (
                  <option key={cat.id} value={cat.nombre}>
  {cat.nombre}
</option>
                ))}
              </select>

              {puedeAgregarCategoria && (
            <button type="button" style={estilos.btnAdd} onClick={agregarCategoria}>
            +
            </button>
                        )}
            </div>
          </div>

          <div style={estilos.section}>
            <label style={estilos.panelLabel}>DETALLES DEL PAGO</label>

            <input
  list="conceptos-egresos-efectivo"
  placeholder="Concepto del egreso"
  value={conceptoEgreso}
  onChange={(e) => setConceptoEgreso(e.target.value)}
  style={{
    ...estilos.input,
    width: "100%",
    marginBottom: "10px",
  }}
/>

<datalist id="conceptos-egresos-efectivo">
  {conceptosExistentes.map((concepto) => (
    <option key={concepto} value={concepto} />
  ))}
</datalist>

            <div style={{ display: "flex", gap: "5px" }}>
              <select
  value={beneficiarioEgreso}
  onChange={(e) => setBeneficiarioEgreso(e.target.value)}
  style={{
    ...estilos.input,
    width: "100%",
  }}
>
  <option value="">-- Selecciona proveedor --</option>

  {proveedoresExistentes.map((proveedor) => (
    <option key={proveedor.id} value={proveedor.nombre}>
      {proveedor.nombre}
    </option>
  ))}
</select>

              <button type="button" style={estilos.btnAdd} onClick={agregarProveedor}>
                +
              </button>
            </div>
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
            <label style={{ ...estilos.panelLabel, color: "#333" }}>
              MONTO TOTAL PAGADO
            </label>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span style={{ fontSize: "24px", fontWeight: "300" }}>
                {divisaEgreso === "MXN" ? "$" : "USD"}
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

            {divisaEgreso === "USD" && montoNumerico > 0 && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "8px",
                  background: "#e7f3ff",
                  borderRadius: "5px",
                  color: "#004085",
                  fontSize: "14px",
                }}
              >
                Equivale a:{" "}
                <b>
                  ${montoMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                </b>
                <br />
                <small>(Tipo de cambio: ${tcEgreso})</small>
              </div>
            )}
          </div>

          <div
            style={{
              background: "#fff",
              padding: "15px",
              borderRadius: "8px",
              border: "1px dashed #ddd",
            }}
          >
            <label style={estilos.panelLabel}>FOTO O PDF DEL COMPROBANTE</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFotosEgreso(Array.from(e.target.files))}
              style={{ fontSize: "12px", marginTop: "10px" }}
            />
          </div>

          <button
            onClick={enviarEgresoADrive}
            disabled={!montoEgreso || !conceptoEgreso}
            style={{
              ...estilos.btnSubmit,
              marginTop: "10px",
              background: !montoEgreso || !conceptoEgreso ? "#ccc" : "#000",
            }}
          >
            REGISTRAR EGRESO DE CAJA
          </button>
        </div>
      </div>
    </div>
  );}

export default EgresosEfectivo;   