-- BOSSE | Historial privado de BorderBro por usuario y negocio
-- Ejecutar SOLO en la base de datos apropiada, después de tener respaldo.
BEGIN;
CREATE TABLE IF NOT EXISTS borderbro_conversaciones_bosse (
  id UUID PRIMARY KEY,
  negocio_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  titulo VARCHAR(140) NOT NULL DEFAULT 'Nueva conversación',
  contexto_adicional TEXT NOT NULL DEFAULT '',
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT borderbro_contexto_limite CHECK (length(contexto_adicional) <= 4000)
);
CREATE INDEX IF NOT EXISTS idx_borderbro_conv_dueno
  ON borderbro_conversaciones_bosse(negocio_id,usuario_id,actualizada_en DESC);
CREATE TABLE IF NOT EXISTS borderbro_mensajes_bosse (
  id BIGSERIAL PRIMARY KEY,
  conversacion_id UUID NOT NULL REFERENCES borderbro_conversaciones_bosse(id) ON DELETE CASCADE,
  negocio_id INTEGER NOT NULL,
  usuario_id INTEGER NOT NULL,
  rol VARCHAR(12) NOT NULL CHECK (rol IN ('user','assistant')),
  texto TEXT NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  evidencia JSONB NOT NULL DEFAULT '[]'::jsonb,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT borderbro_mensaje_limite CHECK (length(texto) <= 24000)
);
CREATE INDEX IF NOT EXISTS idx_borderbro_mensajes_dueno
  ON borderbro_mensajes_bosse(conversacion_id,negocio_id,usuario_id,id);
COMMIT;
