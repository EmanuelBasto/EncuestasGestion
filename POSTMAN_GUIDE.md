# API de Encuestas - Guía para Postman

## Configuración Base

**URL Base:** `http://localhost:3000`

## Variables de Entorno Necesarias

Asegúrate de tener estas variables en tu archivo `.env`:
```
DATABASE_URL=tu_conexion_a_postgresql
JWT_SECRET=tu_secreto_jwt_muy_seguro
PORT=3000
```

## 1. Autenticación

### Registro de Usuario
- **Método:** POST
- **URL:** `{{base_url}}/api/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123",
  "nombre": "Juan Pérez"
}
```

### Login
- **Método:** POST
- **URL:** `{{base_url}}/api/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}
```

### Perfil del Usuario (Protegido)
- **Método:** GET
- **URL:** `{{base_url}}/api/auth/me`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`

## 2. Gestión de Encuestas (Protegido)

### Crear Encuesta
- **Método:** POST
- **URL:** `{{base_url}}/api/surveys`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "titulo": "Encuesta de Satisfacción del Cliente"
}
```

### Listar Encuestas del Usuario
- **Método:** GET
- **URL:** `{{base_url}}/api/surveys`
- **Headers:** `Authorization: Bearer {{token}}`

### Obtener Encuesta Específica
- **Método:** GET
- **URL:** `{{base_url}}/api/surveys/1`
- **Headers:** `Authorization: Bearer {{token}}`

### Actualizar Encuesta
- **Método:** PUT
- **URL:** `{{base_url}}/api/surveys/1`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "titulo": "Nuevo título de la encuesta",
  "activa": false
}
```

### Eliminar Encuesta
- **Método:** DELETE
- **URL:** `{{base_url}}/api/surveys/1`
- **Headers:** `Authorization: Bearer {{token}}`

### Estadísticas de Encuesta
- **Método:** GET
- **URL:** `{{base_url}}/api/surveys/1/stats`
- **Headers:** `Authorization: Bearer {{token}}`

## 3. Gestión de Preguntas (Protegido)

### Crear Pregunta de Selección Única
- **Método:** POST
- **URL:** `{{base_url}}/api/questions`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "encuesta_id": 1,
  "enunciado": "¿Cómo calificarías nuestro servicio?",
  "tipo": "seleccion_unica",
  "obligatoria": true,
  "opciones": [
    {"texto": "Excelente"},
    {"texto": "Bueno"},
    {"texto": "Regular"},
    {"texto": "Malo"}
  ]
}
```

### Crear Pregunta de Selección Múltiple
- **Método:** POST
- **URL:** `{{base_url}}/api/questions`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "encuesta_id": 1,
  "enunciado": "¿Qué aspectos te gustan más de nuestro producto?",
  "tipo": "seleccion_multiple",
  "obligatoria": false,
  "opciones": [
    {"texto": "Calidad"},
    {"texto": "Precio"},
    {"texto": "Diseño"},
    {"texto": "Atención al cliente"}
  ]
}
```

### Crear Pregunta de Texto Abierto
- **Método:** POST
- **URL:** `{{base_url}}/api/questions`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "encuesta_id": 1,
  "enunciado": "¿Qué sugerencias tienes para mejorar nuestro servicio?",
  "tipo": "texto_abierto",
  "obligatoria": false
}
```

### Actualizar Pregunta
- **Método:** PUT
- **URL:** `{{base_url}}/api/questions/1`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "enunciado": "Pregunta actualizada",
  "obligatoria": true,
  "opciones": [
    {"texto": "Opción 1"},
    {"texto": "Opción 2"}
  ]
}
```

### Eliminar Pregunta
- **Método:** DELETE
- **URL:** `{{base_url}}/api/questions/1`
- **Headers:** `Authorization: Bearer {{token}}`

### Reordenar Preguntas
- **Método:** PUT
- **URL:** `{{base_url}}/api/questions/reorder`
- **Headers:** 
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}`
- **Body (JSON):**
```json
{
  "encuesta_id": 1,
  "preguntas": [
    {"id": 2, "posicion": 1},
    {"id": 1, "posicion": 2},
    {"id": 3, "posicion": 3}
  ]
}
```

## 4. Respuestas Públicas

### Obtener Encuesta Pública
- **Método:** GET
- **URL:** `{{base_url}}/api/responses/survey/{{token_publico}}`

### Enviar Respuestas
- **Método:** POST
- **URL:** `{{base_url}}/api/responses/submit/{{token_publico}}`
- **Headers:** `Content-Type: application/json`
- **Body (JSON):**
```json
{
  "respuestas": [
    {
      "pregunta_id": 1,
      "opciones": [1]
    },
    {
      "pregunta_id": 2,
      "opciones": [3, 4]
    },
    {
      "pregunta_id": 3,
      "texto": "Mi sugerencia es mejorar la atención al cliente"
    }
  ]
}
```

### Ver Resultados
- **Método:** GET
- **URL:** `{{base_url}}/api/responses/results/{{token_resultados}}`

## 5. Health Check

### Verificar Estado del Servidor
- **Método:** GET
- **URL:** `{{base_url}}/health`

## Flujo de Trabajo Recomendado

1. **Registrar usuario** → Obtener token
2. **Crear encuesta** → Obtener tokens público y de resultados
3. **Agregar preguntas** a la encuesta
4. **Probar encuesta pública** usando el token público
5. **Enviar respuestas** usando el endpoint de submit
6. **Ver resultados** usando el token de resultados

## Variables de Postman

Configura estas variables en Postman:
- `base_url`: `http://localhost:3000`
- `token`: (se obtiene del login)
- `token_publico`: (se obtiene al crear una encuesta)
- `token_resultados`: (se obtiene al crear una encuesta)

## Códigos de Respuesta

- **200**: Éxito
- **201**: Creado exitosamente
- **400**: Error de validación
- **401**: No autorizado
- **404**: No encontrado
- **409**: Conflicto (ej: email ya registrado)
- **410**: Recurso no disponible (ej: encuesta expirada)
- **500**: Error interno del servidor

## Notas Importantes

1. **Autenticación**: Todas las rutas protegidas requieren el header `Authorization: Bearer {{token}}`
2. **Tokens de Encuesta**: Al crear una encuesta, se generan automáticamente dos tokens:
   - Token público: para acceder y responder la encuesta
   - Token de resultados: para ver las estadísticas
3. **Sesiones**: El sistema previene respuestas duplicadas usando huellas de sesión
4. **Validación**: Todas las entradas son validadas antes de procesarse
5. **CORS**: Configurado para permitir peticiones desde cualquier origen en desarrollo
