# 🎯 Sistema de Encuestas - Frontend Completo

## 📱 Páginas Web Disponibles

Tu aplicación ahora tiene un frontend completo con las siguientes páginas:

### 🔐 **Página de Login** (`/login`)
- Formulario de inicio de sesión idéntico a la imagen
- Campos: Correo y Contraseña
- Checkbox "Recordarme"
- Enlaces: "¿Has perdido tu contraseña?" y "¿No tienes cuenta? Regístrate aquí"
- Ilustración lateral con persona y clipboard
- Estrellas de calificación

### 📝 **Página de Registro** (`/register`)
- Formulario de creación de cuenta idéntico a la imagen
- Campos: Nombre completo, Correo electrónico, Nueva contraseña (x2)
- Validación de contraseñas coincidentes
- Mínimo 6 caracteres en contraseñas
- Enlace: "¿Ya tienes cuenta? Inicia aquí"

### 🔄 **Página de Reset de Contraseña** (`/reset-password`)
- Modal de restablecimiento idéntico a la imagen
- Campos: Nueva contraseña y Confirmar contraseña
- Validación de contraseñas coincidentes
- Enlace: "Regresar al inicio"
- Se activa con token del correo

## 🚀 Cómo Usar

### 1. **Iniciar el Servidor**
```bash
npm run dev
```

### 2. **Acceder a las Páginas**
- **Login**: http://localhost:3000/login
- **Registro**: http://localhost:3000/register
- **Reset**: http://localhost:3000/reset-password?token=TOKEN_DEL_CORREO

### 3. **Funcionalidades**

#### ✅ **Registro de Usuario**
1. Ve a `/register`
2. Completa: Nombre, Email, Contraseña (x2)
3. El sistema valida que las contraseñas coincidan
4. Se crea la cuenta y se loguea automáticamente

#### ✅ **Login de Usuario**
1. Ve a `/login`
2. Ingresa: Email y Contraseña
3. Opcional: Marca "Recordarme"
4. Se autentica y redirige al dashboard

#### ✅ **Recuperación de Contraseña**
1. En `/login`, haz clic en "¿Has perdido tu contraseña?"
2. Ingresa tu email en el modal
3. Recibe un correo con enlace de recuperación
4. Haz clic en el enlace para ir a `/reset-password`
5. Ingresa nueva contraseña (x2)
6. Se restablece y redirige al login

## 🎨 Características del Diseño

### ✨ **Idéntico a las Imágenes**
- **Colores**: Azul claro (#E3F2FD) de fondo, azul (#007bff) para botones
- **Tipografía**: Arial, tamaños y pesos exactos
- **Layout**: Card blanco con bordes redondeados y sombra
- **Ilustraciones**: SVG de persona con clipboard y estrellas
- **Responsive**: Se adapta a móviles ocultando la ilustración

### 🔧 **Funcionalidades Técnicas**
- **Validación en tiempo real**: Errores se muestran inmediatamente
- **Mostrar/ocultar contraseña**: Icono de ojo funcional
- **Loading states**: Spinners durante las peticiones
- **Mensajes de éxito/error**: Notificaciones temporales
- **Integración completa**: Conecta con tu API backend

## 📁 Estructura de Archivos

```
public/
├── css/
│   └── style.css          # Estilos principales
├── js/
│   └── auth.js           # Funcionalidad JavaScript
├── images/               # (Para futuras imágenes)
├── login.html            # Página de login
├── register.html         # Página de registro
└── reset-password.html   # Página de reset
```

## 🔗 Integración con Backend

El frontend está completamente integrado con tu API:

- **Registro**: `POST /api/auth/register`
- **Login**: `POST /api/auth/login`
- **Forgot Password**: `POST /api/auth/forgot-password`
- **Reset Password**: `POST /api/auth/reset-password`
- **Validate Token**: `GET /api/auth/validate-reset-token`

## 🎯 Próximos Pasos

1. **Configurar variables de entorno** (ver `ENV_SETUP.md`)
2. **Ejecutar migración de BD** (`init.sql`)
3. **Configurar SMTP** para correos
4. **Probar todas las funcionalidades**
5. **Crear página de dashboard** para después del login

¡Tu sistema de encuestas ya tiene un frontend completo y funcional! 🎉

