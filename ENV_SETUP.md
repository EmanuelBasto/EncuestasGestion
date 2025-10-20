# Variables de Entorno - Sistema de Encuestas

Para que el sistema de autenticación funcione correctamente, necesitas configurar las siguientes variables de entorno en tu archivo `.env`:

## Base de datos
```
DATABASE_URL=postgresql://usuario:password@localhost:5432/nombre_db
```

## JWT (JSON Web Tokens)
```
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
JWT_EXPIRES_IN=7d
```

## CORS (Cross-Origin Resource Sharing)
```
CORS_ORIGIN=http://localhost:3000,http://localhost:8081
```

## Servidor
```
PORT=3000
NODE_ENV=development
```

## Correo electrónico (para reset de contraseña)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion
SMTP_FROM=no-reply@encuestas.com
```

## Frontend
```
FRONTEND_BASE=http://localhost:3000
```

## Características del Sistema

### 🔐 Autenticación Simplificada
- **Registro simple**: Solo email, nombre y contraseña
- **Validación de contraseñas**: Verifica que las contraseñas coincidan
- **IDs automáticos**: Generados por la base de datos PostgreSQL
- **Un solo tipo de usuario**: Creadores de encuestas

### 📧 Recuperación de Contraseña
- **Tokens seguros**: Generados con crypto.randomBytes()
- **Expiración**: 15 minutos
- **Correos HTML**: Diseño profesional para el reset
- **Invalidación automática**: Tokens anteriores se marcan como usados

### 🛡️ Seguridad
- **Contraseñas hasheadas**: bcrypt con salt rounds 12
- **JWT tokens**: Para autenticación de sesiones
- **Validación robusta**: express-validator para datos de entrada
- **Manejo de errores**: Respuestas consistentes y seguras

## Configuración de Gmail para SMTP

1. **Activa la verificación en 2 pasos** en tu cuenta de Google
2. **Genera una contraseña de aplicación** específica para esta aplicación
3. **Usa esa contraseña** en `SMTP_PASS`

## Endpoints de Autenticación

### Registro
```bash
POST /api/auth/register
{
  "email": "usuario@ejemplo.com",
  "nombre": "Juan Pérez",
  "password": "miContraseña123",
  "confirmPassword": "miContraseña123"
}
```

### Login
```bash
POST /api/auth/login
{
  "email": "usuario@ejemplo.com",
  "password": "miContraseña123"
}
```

### Recuperación de Contraseña
```bash
POST /api/auth/forgot-password
{
  "email": "usuario@ejemplo.com"
}
```

### Reset de Contraseña
```bash
POST /api/auth/reset-password
{
  "token": "token_del_correo",
  "password": "nuevaContraseña123",
  "confirmPassword": "nuevaContraseña123"
}
```

## Notas Importantes

- **JWT_SECRET**: Debe ser una cadena muy segura y única
- **SMTP**: Requerido para el envío de correos de recuperación
- **DATABASE_URL**: URL completa de conexión a PostgreSQL
- **CORS_ORIGIN**: URLs separadas por comas de dominios permitidos
- **Contraseñas**: Mínimo 6 caracteres (como se ve en las imágenes)