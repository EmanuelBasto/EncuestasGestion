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
        [encuesta_id, req.user.id]
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
        `INSERT INTO preguntas (encuesta_id, enunciado, tipo, obligatoria, posicion, respuesta_correcta)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, enunciado, tipo, obligatoria, posicion, respuesta_correcta`,
        [encuesta_id, enunciado, tipo, obligatoria, preguntaPosicion, tipo === 'texto_abierto' ? (opciones[0]?.respuesta_correcta || null) : null]
      );

      const pregunta = questionRows[0];

      // Si es pregunta de selección, crear las opciones
      if ((tipo === 'seleccion_unica' || tipo === 'seleccion_multiple') && opciones.length > 0) {
        const opcionesValues = opciones.map((opcion, index) => 
          `($1, $${index * 3 + 2}, $${index * 3 + 3}, $${index * 3 + 4})`
        ).join(', ');

        const opcionesParams = [pregunta.id];
        opciones.forEach((opcion, index) => {
          opcionesParams.push(opcion.texto, index + 1, opcion.es_correcta || false);
        });

        await query(
          `INSERT INTO opciones (pregunta_id, texto, posicion, es_correcta) VALUES ${opcionesValues}`,
          opcionesParams
        );
      }

      // Obtener la pregunta completa con opciones
      const { rows: completeQuestionRows } = await query(
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
         WHERE p.id = $1
         GROUP BY p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion, p.respuesta_correcta`,
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
    body('opciones').optional().isArray().withMessage('Opciones debe ser un array'),
    body('opciones.*.texto').optional().trim().notEmpty().withMessage('Texto de opción requerido'),
    body('opciones.*.es_correcta').optional().isBoolean().withMessage('es_correcta debe ser booleano'),
    body('opciones.*.posicion').optional().isInt({ min: 1 }).withMessage('Posición de opción debe ser un número positivo')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { enunciado, tipo, obligatoria, posicion, opciones, respuesta_correcta } = req.body;

    try {
      console.log('Actualizando pregunta ID:', id);
      console.log('Datos recibidos:', req.body);
      console.log('Usuario:', req.user.id);

      // Verificar que la pregunta pertenece a una encuesta del usuario
      const { rows: questionRows } = await query(
        `SELECT p.* FROM preguntas p
         JOIN encuestas e ON p.encuesta_id = e.id
         WHERE p.id = $1 AND e.propietario_id = $2`,
        [id, req.user.id]
      );

      if (!questionRows.length) {
        console.log('Pregunta no encontrada para usuario:', req.user.id);
        return res.status(404).json({ ok: false, message: 'Pregunta no encontrada' });
      }

      const preguntaActual = questionRows[0];
      console.log('Pregunta actual:', preguntaActual);

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

      if (respuesta_correcta !== undefined) {
        updates.push(`respuesta_correcta = $${paramCount}`);
        values.push(respuesta_correcta);
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
        console.log('Actualizando opciones:', opciones);
        // Obtener el tipo actual de la pregunta si no se proporciona en la actualización
        const preguntaTipo = tipo || preguntaActual.tipo;
        console.log('Tipo de pregunta:', preguntaTipo);
        
        // Solo eliminar opciones si el tipo es texto_abierto
        if (preguntaTipo === 'texto_abierto') {
          console.log('Eliminando opciones para texto abierto');
          await query('DELETE FROM opciones WHERE pregunta_id = $1', [id]);
        } else {
          console.log('Procesando opciones para selección');
          
          // Obtener opciones existentes
          const { rows: existingOptions } = await query(
            'SELECT id FROM opciones WHERE pregunta_id = $1 ORDER BY posicion',
            [id]
          );
          
          console.log('Opciones existentes:', existingOptions);
          
          // Actualizar opciones existentes
          for (let i = 0; i < opciones.length; i++) {
            const opcion = opciones[i];
            if (existingOptions[i]) {
              // Actualizar opción existente
              console.log(`Actualizando opción ${existingOptions[i].id}:`, opcion);
              await query(
                'UPDATE opciones SET texto = $1, posicion = $2, es_correcta = $3 WHERE id = $4',
                [opcion.texto, opcion.posicion || (i + 1), opcion.es_correcta || false, existingOptions[i].id]
              );
            } else {
              // Crear nueva opción si no existe
              console.log(`Creando nueva opción:`, opcion);
              await query(
                'INSERT INTO opciones (pregunta_id, texto, posicion, es_correcta) VALUES ($1, $2, $3, $4)',
                [id, opcion.texto, opcion.posicion || (i + 1), opcion.es_correcta || false]
              );
            }
          }
          
          // Eliminar opciones sobrantes si hay menos opciones que antes
          if (opciones.length < existingOptions.length) {
            const idsToDelete = existingOptions.slice(opciones.length).map(opt => opt.id);
            if (idsToDelete.length > 0) {
              console.log('Eliminando opciones sobrantes:', idsToDelete);
              await query(
                `DELETE FROM opciones WHERE id IN (${idsToDelete.map((_, i) => `$${i + 1}`).join(', ')})`,
                idsToDelete
              );
            }
          }
        }
      }

      // Obtener la pregunta actualizada
      const { rows: updatedQuestionRows } = await query(
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
         WHERE p.id = $1
         GROUP BY p.id, p.enunciado, p.tipo, p.obligatoria, p.posicion, p.respuesta_correcta`,
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
      [id, req.user.id]
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
        [encuesta_id, req.user.id]
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
