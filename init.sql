CREATE EXTENSION IF NOT EXISTS citext;

-- USUARIOS (creador)
CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT NOT NULL UNIQUE,
  nombre TEXT,
  hash_password TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENCUESTAS
CREATE TABLE encuestas (
  id BIGSERIAL PRIMARY KEY,
  propietario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  titulo TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENLACES (URL para responder / ver resultados)
CREATE TABLE enlaces_encuesta (
  id BIGSERIAL PRIMARY KEY,
  encuesta_id BIGINT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('publico','resultados')),
  token TEXT NOT NULL UNIQUE,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en TIMESTAMPTZ
);
CREATE UNIQUE INDEX ux_enlaces_tipo ON enlaces_encuesta(encuesta_id, tipo);

-- PREGUNTAS
CREATE TABLE preguntas (
  id BIGSERIAL PRIMARY KEY,
  encuesta_id BIGINT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  enunciado TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('seleccion_unica','seleccion_multiple','texto_abierto')),
  obligatoria BOOLEAN NOT NULL DEFAULT FALSE,
  posicion INT NOT NULL
);
CREATE INDEX ix_preguntas_encuesta ON preguntas(encuesta_id);

-- OPCIONES (para selección)
CREATE TABLE opciones (
  id BIGSERIAL PRIMARY KEY,
  pregunta_id BIGINT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  posicion INT NOT NULL
);
CREATE INDEX ix_opciones_pregunta ON opciones(pregunta_id);

-- ENVIOS (participaciones anónimas)
CREATE TABLE envios (
  id BIGSERIAL PRIMARY KEY,
  encuesta_id BIGINT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  huella_sesion TEXT NOT NULL,                      -- hash cookie/localStorage
  CONSTRAINT ux_un_envio_por_sesion UNIQUE (encuesta_id, huella_sesion)
);
CREATE INDEX ix_envios_encuesta ON envios(encuesta_id);
CREATE INDEX ix_envios_tiempo   ON envios(enviado_en);

-- RESPUESTAS
CREATE TABLE respuestas_opcion (
  envio_id BIGINT NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  pregunta_id BIGINT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  opcion_id BIGINT NOT NULL REFERENCES opciones(id) ON DELETE RESTRICT,
  PRIMARY KEY (envio_id, pregunta_id, opcion_id)   -- soporta múltiple
);
CREATE INDEX ix_resopc_pregunta_opcion ON respuestas_opcion(pregunta_id, opcion_id);

CREATE TABLE respuestas_texto (
  envio_id BIGINT NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  pregunta_id BIGINT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  PRIMARY KEY (envio_id, pregunta_id)
);
CREATE INDEX ix_restxt_pregunta ON respuestas_texto(pregunta_id);
