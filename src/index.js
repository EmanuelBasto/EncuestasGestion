import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import surveysRoutes from './routes/surveys.js';
import questionsRoutes from './routes/questions.js';
import responsesRoutes from './routes/responses.js';

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log('  - POST /api/auth/register - Registro de usuario');
  console.log('  - POST /api/auth/login - Login de usuario');
  console.log('  - GET /api/auth/me - Perfil del usuario (requiere token)');
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
});
