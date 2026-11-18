-- BOSSE / Administración inteligente (2026-11-16)
-- Ejecutar en una copia de Neon y revisar antes de producción.
-- Sólo se agregan objetos; no se modifican datos financieros existentes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.solicitudes_proveedores_bosse (
  id BIGSERIAL PRIMARY KEY,
  negocio_id INTEGER NOT NULL,
  nombre_solicitado VARCHAR(250) NOT NULL,
  nombre_normalizado VARCHAR(250) NOT NULL,
  solicitante_id INTEGER NOT NULL,
  estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estatus IN ('PENDIENTE','APROBADO','RECHAZADO')),
  proveedor_id INTEGER,
  motivo TEXT,
  revisor_id INTEGER,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revisada_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_solicitudes_proveedores_bosse_estado
  ON public.solicitudes_proveedores_bosse (negocio_id,estatus,creada_en DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_proveedor_pendiente
  ON public.solicitudes_proveedores_bosse(negocio_id,nombre_normalizado)
  WHERE estatus='PENDIENTE';

ALTER TABLE public.egresos ADD COLUMN IF NOT EXISTS solicitud_proveedor_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_egresos_proveedor_pendiente
 ON public.egresos(negocio_id,solicitud_proveedor_id) WHERE solicitud_proveedor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.proveedor_alias_bosse (
 id BIGSERIAL PRIMARY KEY,
 negocio_id INTEGER NOT NULL,
 proveedor_id INTEGER NOT NULL REFERENCES public.proveedores(id),
 nombre_alias VARCHAR(250) NOT NULL,
 nombre_normalizado VARCHAR(250) NOT NULL,
 aprobado_por INTEGER NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE (negocio_id,nombre_normalizado)
);
CREATE INDEX IF NOT EXISTS idx_alias_proveedor ON public.proveedor_alias_bosse(negocio_id,proveedor_id);

CREATE TABLE IF NOT EXISTS public.proveedor_memoria_bosse (
 id BIGSERIAL PRIMARY KEY,
 negocio_id INTEGER NOT NULL,
 proveedor_id INTEGER NOT NULL REFERENCES public.proveedores(id),
 categoria_id INTEGER NOT NULL REFERENCES public.categorias(id),
 concepto VARCHAR(250) NOT NULL,
 prioridad SMALLINT NOT NULL DEFAULT 1 CHECK(prioridad BETWEEN 1 AND 5),
 aprobado_por INTEGER NOT NULL,
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_proveedor_memoria_combo
 ON public.proveedor_memoria_bosse(negocio_id,proveedor_id,categoria_id,LOWER(TRIM(concepto)));
CREATE INDEX IF NOT EXISTS idx_proveedor_memoria_activa
 ON public.proveedor_memoria_bosse(negocio_id,proveedor_id,activo,prioridad DESC);
-- Categorías operativas necesarias para la regla de corte; no altera gastos existentes.
INSERT INTO public.categorias(negocio_id,nombre)
SELECT n.id,'Servicios' FROM public.negocios n
WHERE NOT EXISTS (SELECT 1 FROM public.categorias c
  WHERE c.negocio_id=n.id AND LOWER(TRIM(c.nombre))='servicios');
INSERT INTO public.categorias(negocio_id,nombre)
SELECT n.id,'Gastos Corte' FROM public.negocios n
WHERE NOT EXISTS (SELECT 1 FROM public.categorias c
  WHERE c.negocio_id=n.id AND LOWER(TRIM(c.nombre)) IN ('gastos corte','gastos de corte'));

CREATE TABLE IF NOT EXISTS public.proveedor_fusiones_bosse (
 id BIGSERIAL PRIMARY KEY,
 negocio_id INTEGER NOT NULL,
 origen_id INTEGER NOT NULL,
 destino_id INTEGER NOT NULL,
 usuario_id INTEGER NOT NULL,
 nombre_origen TEXT NOT NULL,
 nombre_destino TEXT NOT NULL,
 egresos_afectados INTEGER NOT NULL DEFAULT 0,
 detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
 creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT ck_fusion_distintos CHECK(origen_id<>destino_id)
);
COMMIT;
