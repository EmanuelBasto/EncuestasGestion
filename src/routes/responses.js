import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../db.js';
import crypto from 'crypto';

const router = Router();

// Generar huella de sesión única
function generateSessionFingerprint(req) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  const combined = `${userAgent}-${ip}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

// Obtener encuesta pública por token
router.get('/survey/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Verificar que el token existe y la encuesta está activa
    const { rows: linkRows } = await query(
      `SELECT e.id, e.titulo, e.activa, le.expira_en
       FROM enlaces_encuesta le
       JOIN encuestas e ON le.encuesta_id = e.id
       WHERE le.token = $1 AND le.tipo = 'publico'`,
      [token]
    );

    if (!linkRows.length) {
      return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
    }

    const link = linkRows[0];

    // Verificar si la encuesta está activa
    if (!link.activa) {
      return res.status(410).json({ ok: false, message: 'Esta encuesta ya no está disponible' });
    }

    // Verificar si el enlace ha expirado
    if (link.expira_en && new Date() > new Date(link.expira_en)) {
      return res.status(410).json({ ok: false, message: 'Este enlace ha expirado' });
    }

    // Obtener preguntas con opciones
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
      [link.id]
    );

    res.json({
      ok: true,
      encuesta: {
        id: link.id,
        titulo: link.titulo,
        preguntas: questionsRows
      }
    });
  } catch (error) {
    console.error('Error obteniendo encuesta pública:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

// Enviar respuestas a una encuesta
router.post(
  '/submit/:token',
  [
    body('respuestas').isArray().withMessage('Respuestas debe ser un array'),
    body('respuestas.*.pregunta_id').isInt({ min: 1 }).withMessage('ID de pregunta inválido'),
    body('respuestas.*.opciones').optional().isArray().withMessage('Opciones debe ser un array'),
    body('respuestas.*.texto').optional().isString().withMessage('Texto debe ser string')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      return res.status(400).json({ ok: false, errors: errors.array() });
    }

    const { token } = req.params;
    const { respuestas } = req.body;

    console.log('🔍 Recibiendo respuestas para token:', token.substring(0, 10) + '...');
    console.log('📊 Respuestas recibidas:', respuestas);

    try {
      // Verificar que el token existe y la encuesta está activa
      const { rows: linkRows } = await query(
        `SELECT e.id, e.titulo, e.activa, le.expira_en
         FROM enlaces_encuesta le
         JOIN encuestas e ON le.encuesta_id = e.id
         WHERE le.token = $1 AND le.tipo = 'publico'`,
        [token]
      );

      if (!linkRows.length) {
        return res.status(404).json({ ok: false, message: 'Encuesta no encontrada' });
      }

      const link = linkRows[0];
      
      console.log('🔗 Enlace encontrado:', link);
      console.log('📊 ID de encuesta:', link.id);

      // Verificar si la encuesta está activa
      if (!link.activa) {
        return res.status(410).json({ ok: false, message: 'Esta encuesta ya no está disponible' });
      }

      // Verificar si el enlace ha expirado
      if (link.expira_en && new Date() > new Date(link.expira_en)) {
        return res.status(410).json({ ok: false, message: 'Este enlace ha expirado' });
      }

      // Generar huella de sesión
      const sessionFingerprint = generateSessionFingerprint(req);

      // Verificar si ya existe un envío para esta sesión
      const { rows: existingRows } = await query(
        'SELECT id FROM envios WHERE encuesta_id = $1 AND huella_sesion = $2',
        [parseInt(link.id), sessionFingerprint]
      );

      if (existingRows.length > 0) {
        return res.status(409).json({ ok: false, message: 'Ya has respondido esta encuesta' });
      }

      // Validar respuestas
      const { rows: questionsRows } = await query(
        'SELECT id, tipo, obligatoria FROM preguntas WHERE encuesta_id = $1',
        [parseInt(link.id)]
      );

      console.log('📋 Preguntas encontradas en BD:', questionsRows);
      console.log('🔍 IDs de preguntas en BD:', questionsRows.map(q => q.id));

      const questionsMap = new Map(questionsRows.map(q => [parseInt(q.id), q]));
      const answeredQuestions = new Set();

      for (const respuesta of respuestas) {
        console.log('🔍 Buscando pregunta ID:', respuesta.pregunta_id, 'Tipo:', typeof respuesta.pregunta_id);
        const pregunta = questionsMap.get(respuesta.pregunta_id);
        console.log('📊 Pregunta encontrada:', pregunta);
        
        if (!pregunta) {
          console.log('❌ Pregunta no encontrada en mapa:', Array.from(questionsMap.keys()));
          return res.status(400).json({ ok: false, message: `Pregunta ${respuesta.pregunta_id} no existe` });
        }

        answeredQuestions.add(respuesta.pregunta_id);

        // Validar según el tipo de pregunta
        if (pregunta.tipo === 'texto_abierto') {
          if (!respuesta.texto || respuesta.texto.trim() === '') {
            return res.status(400).json({ ok: false, message: `Respuesta requerida para pregunta ${respuesta.pregunta_id}` });
          }
        } else if (pregunta.tipo === 'seleccion_unica') {
          if (!respuesta.opciones || respuesta.opciones.length !== 1) {
            return res.status(400).json({ ok: false, message: `Debe seleccionar exactamente una opción para pregunta ${respuesta.pregunta_id}` });
          }
        } else if (pregunta.tipo === 'seleccion_multiple') {
          if (!respuesta.opciones || respuesta.opciones.length === 0) {
            return res.status(400).json({ ok: false, message: `Debe seleccionar al menos una opción para pregunta ${respuesta.pregunta_id}` });
          }
        }
      }

      // Verificar preguntas obligatorias
      for (const pregunta of questionsRows) {
        if (pregunta.obligatoria && !answeredQuestions.has(pregunta.id)) {
          return res.status(400).json({ ok: false, message: `Pregunta ${pregunta.id} es obligatoria` });
        }
      }

      // Crear el envío
      const { rows: envioRows } = await query(
        'INSERT INTO envios (encuesta_id, huella_sesion) VALUES ($1, $2) RETURNING id',
        [link.id, sessionFingerprint]
      );

      const envioId = envioRows[0].id;

      // Guardar respuestas
      for (const respuesta of respuestas) {
        if (respuesta.texto) {
          // Respuesta de texto
          await query(
            'INSERT INTO respuestas_texto (envio_id, pregunta_id, texto) VALUES ($1, $2, $3)',
            [envioId, respuesta.pregunta_id, respuesta.texto]
          );
        }

        if (respuesta.opciones && respuesta.opciones.length > 0) {
          // Respuestas de opciones
          for (const opcionId of respuesta.opciones) {
            await query(
              'INSERT INTO respuestas_opcion (envio_id, pregunta_id, opcion_id) VALUES ($1, $2, $3)',
              [envioId, respuesta.pregunta_id, opcionId]
            );
          }
        }
      }

      res.status(201).json({ ok: true, message: 'Respuestas enviadas correctamente' });
    } catch (error) {
      console.error('Error enviando respuestas:', error);
      res.status(500).json({ ok: false, message: 'Error interno del servidor' });
    }
  }
);

// Obtener resultados de una encuesta (requiere token de resultados)
router.get('/results/:token', async (req, res) => {
  const { token } = req.params;

  try {
    // Verificar que el token existe
    const { rows: linkRows } = await query(
      `SELECT e.id, e.titulo, e.activa
       FROM enlaces_encuesta le
       JOIN encuestas e ON le.encuesta_id = e.id
       WHERE le.token = $1 AND le.tipo = 'resultados'`,
      [token]
    );

    if (!linkRows.length) {
      return res.status(404).json({ ok: false, message: 'Token de resultados no válido' });
    }

    const encuesta = linkRows[0];

    // Obtener estadísticas generales
    const { rows: statsRows } = await query(
      `SELECT 
         COUNT(DISTINCT env.id) as total_respuestas,
         COUNT(DISTINCT p.id) as total_preguntas
       FROM encuestas e
       LEFT JOIN preguntas p ON e.id = p.encuesta_id
       LEFT JOIN envios env ON e.id = env.encuesta_id
       WHERE e.id = $1`,
      [encuesta.id]
    );

    // Obtener resultados por pregunta
    const { rows: questionsRows } = await query(
      `SELECT p.id, p.enunciado, p.tipo, p.posicion,
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
       GROUP BY p.id, p.enunciado, p.tipo, p.posicion
       ORDER BY p.posicion`,
      [encuesta.id]
    );

    // Obtener estadísticas de opciones
    const { rows: opcionesStatsRows } = await query(
      `SELECT 
         ro.pregunta_id,
         ro.opcion_id,
         o.texto,
         COUNT(*) as total_selecciones
       FROM respuestas_opcion ro
       JOIN opciones o ON ro.opcion_id = o.id
       JOIN preguntas p ON ro.pregunta_id = p.id
       WHERE p.encuesta_id = $1
       GROUP BY ro.pregunta_id, ro.opcion_id, o.texto
       ORDER BY ro.pregunta_id, total_selecciones DESC`,
      [encuesta.id]
    );

    // Obtener respuestas de texto (muestra limitada)
    const { rows: textoStatsRows } = await query(
      `SELECT 
         rt.pregunta_id,
         rt.texto,
         COUNT(*) as frecuencia
       FROM respuestas_texto rt
       JOIN preguntas p ON rt.pregunta_id = p.id
       WHERE p.encuesta_id = $1
       GROUP BY rt.pregunta_id, rt.texto
       ORDER BY rt.pregunta_id, frecuencia DESC
       LIMIT 100`,
      [encuesta.id]
    );

    // Organizar estadísticas por pregunta
    const opcionesStatsMap = new Map();
    opcionesStatsRows.forEach(stat => {
      if (!opcionesStatsMap.has(stat.pregunta_id)) {
        opcionesStatsMap.set(stat.pregunta_id, []);
      }
      opcionesStatsMap.get(stat.pregunta_id).push(stat);
    });

    const textoStatsMap = new Map();
    textoStatsRows.forEach(stat => {
      if (!textoStatsMap.has(stat.pregunta_id)) {
        textoStatsMap.set(stat.pregunta_id, []);
      }
      textoStatsMap.get(stat.pregunta_id).push(stat);
    });

    // Combinar datos
    const preguntasConStats = questionsRows.map(pregunta => ({
      ...pregunta,
      estadisticas: {
        opciones: opcionesStatsMap.get(pregunta.id) || [],
        textos: textoStatsMap.get(pregunta.id) || []
      }
    }));

    res.json({
      ok: true,
      encuesta: {
        id: encuesta.id,
        titulo: encuesta.titulo,
        activa: encuesta.activa,
        estadisticas: statsRows[0],
        preguntas: preguntasConStats
      }
    });
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    res.status(500).json({ ok: false, message: 'Error interno del servidor' });
  }
});

export default router;
