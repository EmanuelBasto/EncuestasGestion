import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db.js';
import requireAuth from '../middleware/requireAuth.js';
import crypto from 'crypto';

const router = Router();

// Generar token único para enlaces
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Crear nueva encuesta
router.post(
  '/',
  requireAuth,
  [
    body('titulo').trim().notEmpty().withMessage('Título requerido'),
    body('titulo').isLength({ max: 200 }).withMessage('Título muy largo')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { titulo } = req.body;
    const propietario_id = req.user.id;

    try {
      // Crear la encuesta
      const { rows: surveyRows } = await query(
        `INSERT INTO encuestas (propietario_id, titulo)
         VALUES ($1, $2)
         RETURNING id, titulo, activa, creada_en`,
        [propietario_id, titulo]
      );

      const encuesta = surveyRows[0];

      // Crear enlaces automáticamente
      const publicToken = generateToken();
      const resultsToken = generateToken();

      await query(
        `INSERT INTO enlaces_encuesta (encuesta_id, tipo, token)
         VALUES ($1, 'publico', $2), ($1, 'resultados', $3)`,
        [encuesta.id, publicToken, resultsToken]
      );

      res.status(201).json({
        ok: true,
        encuesta: {
          ...encuesta,
          enlaces: {
            publico: publicToken,
            resultados: resultsToken
          }
        }
      });
    } catch (error) {
      console.error('Error creando encuesta:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
  }
);

// Obtener todas las encuestas del usuario
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT e.id, e.titulo, e.activa, e.creada_en,
              COUNT(DISTINCT p.id) as total_preguntas,
              COUNT(DISTINCT env.id) as total_respuestas
       FROM encuestas e
       LEFT JOIN preguntas p ON e.id = p.encuesta_id
       LEFT JOIN envios env ON e.id = env.encuesta_id
       WHERE e.propietario_id = $1
       GROUP BY e.id, e.titulo, e.activa, e.creada_en
       ORDER BY e.creada_en DESC`,
      [req.user.id]
    );

    res.json({ ok: true, encuestas: rows });
  } catch (error) {
    console.error('Error obteniendo encuestas:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

// Obtener una encuesta específica con sus preguntas
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que la encuesta pertenece al usuario
    const { rows: surveyRows } = await query(
      'SELECT * FROM encuestas WHERE id = $1 AND propietario_id = $2',
      [id, req.user.id]
    );

    if (!surveyRows.length) {
      return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
    }

    const encuesta = surveyRows[0];

    // Obtener enlaces de la encuesta
    const { rows: linksRows } = await query(
      `SELECT tipo, token FROM enlaces_encuesta WHERE encuesta_id = $1`,
      [id]
    );

    // Organizar enlaces por tipo
    const enlaces = {};
    linksRows.forEach(link => {
      enlaces[link.tipo] = link.token;
    });

    // Obtener preguntas con sus opciones
    const { rows: questionsRows } = await query(
      `SELECT p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion, p.respuesta_correcta,
              COALESCE(
                json_agg(
                  json_build_object('id', o.id, 'texto', o.texto, 'posicion', o.posicion, 'es_correcta', o.es_correcta)
                  ORDER BY o.posicion
                ) FILTER (WHERE o.id IS NOT NULL),
                '[]'
              ) as opciones
       FROM preguntas p
       LEFT JOIN opciones o ON p.id = o.pregunta_id
       WHERE p.encuesta_id = $1
       GROUP BY p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion, p.respuesta_correcta
       ORDER BY p.posicion`,
      [id]
    );

    res.json({
      ok: true,
      encuesta: {
        ...encuesta,
        enlaces: enlaces,
        preguntas: questionsRows
      }
    });
  } catch (error) {
    console.error('Error obteniendo encuesta:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

// Actualizar encuesta
router.put(
  '/:id',
  requireAuth,
  [
    body('titulo').optional().trim().notEmpty().withMessage('Título requerido'),
    body('titulo').optional().isLength({ max: 200 }).withMessage('Título muy largo'),
    body('activa').optional().isBoolean().withMessage('Estado activa debe ser booleano')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { titulo, activa } = req.body;

    try {
      // Verificar que la encuesta pertenece al usuario
      const { rows: surveyRows } = await query(
        'SELECT * FROM encuestas WHERE id = $1 AND propietario_id = $2',
        [id, req.user.id]
      );

      if (!surveyRows.length) {
        return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
      }

      // Construir query dinámicamente
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (titulo !== undefined) {
        updates.push(`titulo = $${paramCount}`);
        values.push(titulo);
        paramCount++;
      }

      if (activa !== undefined) {
        updates.push(`activa = $${paramCount}`);
        values.push(activa);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ ok: false, message: 'No hay campos para actualizar' });
      }

      values.push(id, req.user.id);

      const { rows } = await query(
        `UPDATE encuestas 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount} AND propietario_id = $${paramCount + 1}
         RETURNING id, titulo, activa, creada_en`,
        values
      );

      res.json({ ok: true, encuesta: rows[0] });
    } catch (error) {
      console.error('Error actualizando encuesta:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
  }
);

// Eliminar encuesta
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await query(
      'DELETE FROM encuestas WHERE id = $1 AND propietario_id = $2',
      [id, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
    }

    res.json({ ok: true, message: 'Encuesta eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando encuesta:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

// Actualizar versión confirmada de la encuesta (para notificar cambios solo cuando se guarda)
router.post('/:id/confirm-version', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que la encuesta pertenece al usuario
    const { rows: surveyRows } = await query(
      'SELECT * FROM encuestas WHERE id = $1 AND propietario_id = $2',
      [id, req.user.id]
    );

    if (!surveyRows.length) {
      return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
    }

    // Obtener preguntas con opciones para calcular el hash
    const { rows: questionsRows } = await query(
      `SELECT p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion,
              COALESCE(
                json_agg(
                  json_build_object('id', o.id, 'texto', o.texto, 'posicion', o.posicion)
                  ORDER BY o.posicion
                ) FILTER (WHERE o.id IS NOT NULL),
                '[]'
              ) as opciones
       FROM preguntas p
       LEFT JOIN opciones o ON p.id = o.pregunta_id
       WHERE p.encuesta_id = $1
       GROUP BY p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion
       ORDER BY p.posicion`,
      [id]
    );

    // Generar hash de versión
    const version = crypto.createHash('sha256')
      .update(JSON.stringify(questionsRows))
      .digest('hex');

    // Intentar agregar columna version_confirmada si no existe
    try {
      await query(
        `ALTER TABLE encuestas ADD COLUMN IF NOT EXISTS version_confirmada TEXT`
      );
    } catch (error) {
      // Si falla, continuar (la columna ya existe o no se puede agregar)
      console.log('Nota: No se pudo agregar columna version_confirmada:', error.message);
    }

    // Actualizar la versión confirmada en la tabla encuestas
    await query(
      `UPDATE encuestas 
       SET version_confirmada = $1
       WHERE id = $2`,
      [version, id]
    );
    
    res.json({
      ok: true,
      version: version,
      message: 'Versión confirmada actualizada'
    });
  } catch (error) {
    console.error('Error confirmando versión:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de una encuesta
router.get('/:id/stats', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que la encuesta pertenece al usuario
    const { rows: surveyRows } = await query(
      'SELECT * FROM encuestas WHERE id = $1 AND propietario_id = $2',
      [id, req.user.id]
    );

    if (!surveyRows.length) {
      return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
    }

    // Obtener estadísticas básicas
    const { rows: statsRows } = await query(
      `SELECT 
         COUNT(DISTINCT env.id) as total_respuestas,
         COUNT(DISTINCT p.id) as total_preguntas,
         MIN(env.enviado_en) as primera_respuesta,
         MAX(env.enviado_en) as ultima_respuesta
       FROM encuestas e
       LEFT JOIN preguntas p ON e.id = p.encuesta_id
       LEFT JOIN envios env ON e.id = env.encuesta_id
       WHERE e.id = $1`,
      [id]
    );

    res.json({ ok: true, estadisticas: statsRows[0] });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

export default router;
