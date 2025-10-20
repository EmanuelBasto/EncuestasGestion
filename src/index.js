import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import surveysRoutes from './routes/surveys.js';
import questionsRoutes from './routes/questions.js';
import responsesRoutes from './routes/responses.js';

dotenv.config();
const app = express();

// Configuración para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

// Rutas para páginas HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Healthcheck
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, status: 'up' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/responses', responsesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor funcionando en http://localhost:${PORT}`);
  console.log('');
  console.log('📱 PÁGINAS WEB:');
  console.log(`  - http://localhost:${PORT}/ - Página de Login`);
  console.log(`  - http://localhost:${PORT}/login - Página de Login`);
  console.log(`  - http://localhost:${PORT}/register - Página de Registro`);
  console.log(`  - http://localhost:${PORT}/reset-password - Reset de Contraseña`);
  console.log(`  - http://localhost:${PORT}/dashboard - Dashboard Principal`);
  console.log('');
  console.log('🔐 API DE AUTENTICACIÓN:');
  console.log('  - POST /api/auth/register - Registro simple (email, nombre, contraseña)');
  console.log('  - POST /api/auth/login - Login de usuario');
  console.log('  - GET /api/auth/me - Perfil del usuario autenticado (requiere token)');
  console.log('  - POST /api/auth/forgot-password - Solicitar reset de contraseña por correo');
  console.log('  - POST /api/auth/reset-password - Reset de contraseña con token');
  console.log('  - GET /api/auth/validate-reset-token - Validar token de reset');
  console.log('');
  console.log('📊 API DE ENCUESTAS:');
  console.log('  - POST /api/surveys - Crear encuesta (requiere token)');
  console.log('  - GET /api/surveys - Listar encuestas del usuario (requiere token)');
  console.log('  - GET /api/surveys/:id - Obtener encuesta específica (requiere token)');
  console.log('  - PUT /api/surveys/:id - Actualizar encuesta (requiere token)');
  console.log('  - DELETE /api/surveys/:id - Eliminar encuesta (requiere token)');
  console.log('  - GET /api/surveys/:id/stats - Estadísticas de encuesta (requiere token)');
  console.log('  - POST /api/questions - Crear pregunta (requiere token)');
  console.log('  - PUT /api/questions/:id - Actualizar pregunta (requiere token)');
  console.log('  - DELETE /api/questions/:id - Eliminar pregunta (requiere token)');
  console.log('  - PUT /api/questions/reorder - Reordenar preguntas (requiere token)');
  console.log('  - GET /api/responses/survey/:token - Obtener encuesta pública');
  console.log('  - POST /api/responses/submit/:token - Enviar respuestas');
  console.log('  - GET /api/responses/results/:token - Ver resultados');
  console.log('');
  console.log('✨ CARACTERÍSTICAS DEL FRONTEND:');
  console.log('  - Diseño idéntico a las imágenes proporcionadas');
  console.log('  - Formularios con validación en tiempo real');
  console.log('  - Recuperación de contraseña por correo');
  console.log('  - Interfaz responsive y moderna');
  console.log('  - Integración completa con la API');
});
