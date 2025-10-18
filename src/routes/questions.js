import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();

// Crear nueva pregunta
router.post(
  '/',
  requireAuth,
  [
    body('encuesta_id').isInt({ min: 1 }).withMessage('ID de encuesta inválido'),
    body('enunciado').trim().notEmpty().withMessage('Enunciado requerido'),
    body('tipo').isIn(['seleccion_unica', 'seleccion_multiple', 'texto_abierto']).withMessage('Tipo inválido'),
    body('obligatoria').optional().isBoolean().withMessage('Obligatoria debe ser booleano'),
    body('posicion').optional().isInt({ min: 1 }).withMessage('Posición debe ser un número positivo'),
    body('opciones').optional().isArray().withMessage('Opciones debe ser un array')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { encuesta_id, enunciado, tipo, obligatoria = false, posicion, opciones = [] } = req.body;

    try {
      // Verificar que la encuesta pertenece al usuario
      const { rows: surveyRows } = await query(
        'SELECT * FROM encuestas WHERE id = $1 AND propietario_id = $2',
        [encuesta_id, req.user.sub]
      );

      if (!surveyRows.length) {
        return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
      }

      // Si no se especifica posición, obtener la siguiente
      let preguntaPosicion = posicion;
      if (!preguntaPosicion) {
        const { rows: posRows } = await query(
          'SELECT COALESCE(MAX(posicion), 0) + 1 as next_pos FROM preguntas WHERE encuesta_id = $1',
          [encuesta_id]
        );
        preguntaPosicion = posRows[0].next_pos;
      }

      // Crear la pregunta
      const { rows: questionRows } = await query(
        `INSERT INTO preguntas (encuesta_id, enunciado, tipo, obligatoria, posicion)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, enunciado, tipo, obligatoria, posicion`,
        [encuesta_id, enunciado, tipo, obligatoria, preguntaPosicion]
      );

      const pregunta = questionRows[0];

      // Si es pregunta de selección, crear las opciones
      if ((tipo === 'seleccion_unica' || tipo === 'seleccion_multiple') && opciones.length > 0) {
        const opcionesValues = opciones.map((opcion, index) => 
          `($1, $${index * 2 + 2}, $${index * 2 + 3})`
        ).join(', ');

        const opcionesParams = [pregunta.id];
        opciones.forEach((opcion, index) => {
          opcionesParams.push(opcion.texto, index + 1);
        });

        await query(
          `INSERT INTO opciones (pregunta_id, texto, posicion) VALUES ${opcionesValues}`,
          opcionesParams
        );
      }

      // Obtener la pregunta completa con opciones
      const { rows: completeQuestionRows } = await query(
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
         WHERE p.id = $1
         GROUP BY p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion`,
        [pregunta.id]
      );

      res.status(201).json({
        ok: true,
        pregunta: completeQuestionRows[0]
      });
    } catch (error) {
      console.error('Error creando pregunta:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
  }
);

// Actualizar pregunta
router.put(
  '/:id',
  requireAuth,
  [
    body('enunciado').optional().trim().notEmpty().withMessage('Enunciado requerido'),
    body('tipo').optional().isIn(['seleccion_unica', 'seleccion_multiple', 'texto_abierto']).withMessage('Tipo inválido'),
    body('obligatoria').optional().isBoolean().withMessage('Obligatoria debe ser booleano'),
    body('posicion').optional().isInt({ min: 1 }).withMessage('Posición debe ser un número positivo'),
    body('opciones').optional().isArray().withMessage('Opciones debe ser un array')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { enunciado, tipo, obligatoria, posicion, opciones } = req.body;

    try {
      // Verificar que la pregunta pertenece a una encuesta del usuario
      const { rows: questionRows } = await query(
        `SELECT p.* FROM preguntas p
         JOIN encuestas e ON p.encuesta_id = e.id
         WHERE p.id = $1 AND e.propietario_id = $2`,
        [id, req.user.sub]
      );

      if (!questionRows.length) {
        return res.status(404).json({ ok: false, message: 'Pregunta no encontrada' });
      }

      const preguntaActual = questionRows[0];

      // Construir query dinámicamente para actualizar pregunta
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (enunciado !== undefined) {
        updates.push(`enunciado = $${paramCount}`);
        values.push(enunciado);
        paramCount++;
      }

      if (tipo !== undefined) {
        updates.push(`tipo = $${paramCount}`);
        values.push(tipo);
        paramCount++;
      }

      if (obligatoria !== undefined) {
        updates.push(`obligatoria = $${paramCount}`);
        values.push(obligatoria);
        paramCount++;
      }

      if (posicion !== undefined) {
        updates.push(`posicion = $${paramCount}`);
        values.push(posicion);
        paramCount++;
      }

      if (updates.length > 0) {
        values.push(id);
        await query(
          `UPDATE preguntas SET ${updates.join(', ')} WHERE id = $${paramCount}`,
          values
        );
      }

      // Si se proporcionan opciones, actualizarlas
      if (opciones !== undefined) {
        // Eliminar opciones existentes
        await query('DELETE FROM opciones WHERE pregunta_id = $1', [id]);

        // Crear nuevas opciones si las hay
        if (opciones.length > 0) {
          const opcionesValues = opciones.map((opcion, index) => 
            `($1, $${index * 2 + 2}, $${index * 2 + 3})`
          ).join(', ');

          const opcionesParams = [id];
          opciones.forEach((opcion, index) => {
            opcionesParams.push(opcion.texto, index + 1);
          });

          await query(
            `INSERT INTO opciones (pregunta_id, texto, posicion) VALUES ${opcionesValues}`,
            opcionesParams
          );
        }
      }

      // Obtener la pregunta actualizada
      const { rows: updatedQuestionRows } = await query(
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
         WHERE p.id = $1
         GROUP BY p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion`,
        [id]
      );

      res.json({ ok: true, pregunta: updatedQuestionRows[0] });
    } catch (error) {
      console.error('Error actualizando pregunta:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
  }
);

// Eliminar pregunta
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar que la pregunta pertenece a una encuesta del usuario
    const { rows: questionRows } = await query(
      `SELECT p.* FROM preguntas p
       JOIN encuestas e ON p.encuesta_id = e.id
       WHERE p.id = $1 AND e.propietario_id = $2`,
      [id, req.user.sub]
    );

    if (!questionRows.length) {
      return res.status(404).json({ ok: false, message: 'Pregunta no encontrada' });
    }

    // Eliminar pregunta (las opciones se eliminan por CASCADE)
    await query('DELETE FROM preguntas WHERE id = $1', [id]);

    res.json({ ok: true, message: 'Pregunta eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando pregunta:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

// Reordenar preguntas
router.put(
  '/reorder',
  requireAuth,
  [
    body('encuesta_id').isInt({ min: 1 }).withMessage('ID de encuesta inválido'),
    body('preguntas').isArray().withMessage('Preguntas debe ser un array'),
    body('preguntas.*.id').isInt({ min: 1 }).withMessage('ID de pregunta inválido'),
    body('preguntas.*.posicion').isInt({ min: 1 }).withMessage('Posición inválida')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { encuesta_id, preguntas } = req.body;

    try {
      // Verificar que la encuesta pertenece al usuario
      const { rows: surveyRows } = await query(
        'SELECT * FROM encuestas WHERE id = $1 AND propietario_id = $2',
        [encuesta_id, req.user.sub]
      );

      if (!surveyRows.length) {
        return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
      }

      // Actualizar posiciones
      for (const pregunta of preguntas) {
        await query(
          'UPDATE preguntas SET posicion = $1 WHERE id = $2 AND encuesta_id = $3',
          [pregunta.posicion, pregunta.id, encuesta_id]
        );
      }

      res.json({ ok: true, message: 'Preguntas reordenadas correctamente' });
    } catch (error) {
      console.error('Error reordenando preguntas:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
  }
);

export default router;
