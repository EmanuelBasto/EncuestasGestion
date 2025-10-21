import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { query } from '../db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Configuración de correo
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: { 
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS 
  }
});

// URL pública del frontend
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:3000';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Registro simple para usuarios de encuestas
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6, max: 12 }).withMessage('La contraseña debe tener entre 6 y 12 caracteres')
      .matches(/[A-Z]/).withMessage('La contraseña debe contener al menos una letra mayúscula')
      .not().matches(/[!?\/$,]/).withMessage('La contraseña no puede contener caracteres especiales (!,?,/,$,)'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),
    body('nombre').trim().notEmpty().withMessage('Nombre requerido')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Datos inválidos',
        errors: errors.array() 
      });
    }

    const { email, password, nombre } = req.body;

    try {
      // Verificar si el email ya existe
      const exist = await query('SELECT id FROM usuarios WHERE email = $1::citext', [email]);
      if (exist.rows.length > 0) {
        return res.status(409).json({ 
          ok: false, 
          message: 'Este correo ya está registrado' 
        });
      }

      // Hash de la contraseña
      const hash = await bcrypt.hash(password, 12);

      // Crear usuario
      const { rows } = await query(
        `INSERT INTO usuarios (email, nombre, hash_password)
         VALUES ($1::citext, $2, $3)
         RETURNING id, email, nombre, creado_en`,
        [email, nombre, hash]
      );

      const user = rows[0];
      const token = signToken(user);

      return res.status(201).json({ 
        ok: true, 
        message: 'Usuario creado exitosamente',
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre
        },
        token 
      });
    } catch (err) {
      console.error('Error en registro:', err);
      return res.status(500).json({ 
        ok: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
);

// Login para usuarios de encuestas
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Datos inválidos',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    try {
      // Buscar usuario
      const { rows } = await query(
        'SELECT id, email, nombre, hash_password FROM usuarios WHERE email = $1::citext',
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ 
          ok: false, 
          message: 'Credenciales incorrectas' 
        });
      }

      const user = rows[0];
      
      // Verificar contraseña
      const match = await bcrypt.compare(password, user.hash_password);
      if (!match) {
        return res.status(401).json({ 
          ok: false, 
          message: 'Credenciales incorrectas' 
        });
      }

      // Generar token
      const token = signToken(user);

      return res.json({ 
        ok: true, 
        message: 'Login exitoso',
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre
        },
        token 
      });
    } catch (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ 
        ok: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
);

// Recuperación de contraseña por correo
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Email requerido' 
      });
    }

    // Buscar usuario
    const { rows } = await query(
      'SELECT id, email, nombre FROM usuarios WHERE email = $1::citext LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        message: 'No existe una cuenta con este correo' 
      });
    }

    const user = rows[0];
    
    // Generar token seguro
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Expira en 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    console.log('🕐 Token creado a las:', new Date().toISOString());
    console.log('⏰ Token expira a las:', expiresAt.toISOString());

    // Guardar token en base de datos
    await query(
      'INSERT INTO tokens_reset (user_id, token_hash, expiracion, usado) VALUES ($1, $2, $3, false)',
      [user.id, tokenHash, expiresAt]
    );

    // Invalidar tokens anteriores del mismo usuario
    await query(
      'UPDATE tokens_reset SET usado = true WHERE user_id = $1 AND token_hash <> $2',
      [user.id, tokenHash]
    );

    // Crear enlace de reset
    const resetLink = `${FRONTEND_BASE}/reset-password?token=${token}`;

    // Configurar correo
    const mailOptions = {
      from: process.env.SMTP_FROM || 'no-reply@encuestas.com',
      to: user.email,
      subject: 'Restablece tu contraseña - Sistema de Encuestas',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Hola ${user.nombre},</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en el sistema de encuestas.</p>
          <div style="background-color: #ffebee; border: 2px solid #f44336; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #d32f2f; font-size: 18px; font-weight: bold;">
              ⏰ ESTE ENLACE EXPIRA EN EXACTAMENTE 5 MINUTOS ⏰
            </p>
            <p style="margin: 10px 0 0 0; color: #d32f2f; font-size: 14px;">
              Después de 5 minutos deberás solicitar un nuevo enlace
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;">
              🔐 RESTABLECER CONTRASEÑA AHORA
            </a>
          </div>
          <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
          <p><strong>⚠️ IMPORTANTE: Si el enlace expira, deberás solicitar uno nuevo.</strong></p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${resetLink}">${resetLink}</a>
          </p>
        </div>
      `
    };

    // Enviar correo
    try {
      await transporter.sendMail(mailOptions);
      console.log('Correo enviado exitosamente a:', user.email);
    } catch (emailError) {
      console.error('Error al enviar correo:', emailError);
      
      // En desarrollo, mostrar el enlace en la consola
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 ENLACE DE RESET (DESARROLLO):', resetLink);
        console.log('📧 Email que se habría enviado a:', user.email);
      }
      
      return res.status(500).json({ 
        ok: false, 
        message: 'Error al enviar el correo. En desarrollo, revisa la consola del servidor para el enlace.' 
      });
    }

    return res.json({ 
      ok: true, 
      message: 'Se ha enviado un correo con las instrucciones para restablecer tu contraseña' 
    });
  } catch (err) {
    console.error('Error en forgot-password:', err);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error al enviar el correo' 
    });
  }
});

// Reset de contraseña con token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Token, contraseña y confirmación son requeridos' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Las contraseñas no coinciden' 
      });
    }

    // Validar nueva contraseña
    if (password.length < 6 || password.length > 12) {
      return res.status(400).json({ 
        ok: false, 
        message: 'La contraseña debe tener entre 6 y 12 caracteres' 
      });
    }
    
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'La contraseña debe contener al menos una letra mayúscula' 
      });
    }
    
    if (/[!?\/$,]/.test(password)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'La contraseña no puede contener caracteres especiales (!,?,/,$,)' 
      });
    }

    // Hash del token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar token válido
    console.log('🔍 Validando token a las:', new Date().toISOString());
    const { rows } = await query(
      `SELECT tr.user_id, u.email, u.nombre, tr.expiracion
       FROM tokens_reset tr
       JOIN usuarios u ON u.id = tr.user_id
       WHERE tr.token_hash = $1
         AND tr.usado = false
         AND tr.expiracion > NOW()
       LIMIT 1`,
      [tokenHash]
    );
    
    if (rows.length > 0) {
      console.log('✅ Token válido encontrado, expira a las:', rows[0].expiracion);
    } else {
      console.log('❌ Token no válido o expirado');
    }

    if (rows.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        message: 'El enlace de recuperación ha expirado. Los enlaces solo son válidos por 5 minutos. Por favor, solicita un nuevo enlace.' 
      });
    }

    const userId = rows[0].user_id;

    // Verificar que no sea la misma contraseña
    const { rows: userRows } = await query(
      'SELECT hash_password FROM usuarios WHERE id = $1',
      [userId]
    );

    const samePassword = await bcrypt.compare(password, userRows[0].hash_password);
    if (samePassword) {
      return res.status(400).json({ 
        ok: false, 
        message: 'La nueva contraseña debe ser diferente a la actual' 
      });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Actualizar contraseña
    await query(
      'UPDATE usuarios SET hash_password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    // Marcar token como usado
    await query(
      'UPDATE tokens_reset SET usado = true WHERE token_hash = $1',
      [tokenHash]
    );

    return res.json({ 
      ok: true, 
      message: 'Contraseña restablecida exitosamente' 
    });
  } catch (err) {
    console.error('Error en reset-password:', err);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Validar token de reset
router.get('/validate-reset-token', async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Token requerido' 
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await query(
      `SELECT 1 FROM tokens_reset
       WHERE token_hash = $1
         AND usado = false
         AND expiracion > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        message: 'El enlace de recuperación ha expirado. Los enlaces solo son válidos por 5 minutos. Por favor, solicita un nuevo enlace.' 
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Error en validate-reset-token:', err);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error interno del servidor' 
    });
  }
});

// Perfil del usuario autenticado
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, email, nombre, creado_en FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Usuario no encontrado' 
      });
    }

    return res.json({ 
      ok: true, 
      user: rows[0] 
    });
  } catch (err) {
    console.error('Error en /me:', err);
    return res.status(500).json({ 
      ok: false, 
      message: 'Error interno del servidor' 
    });
  }
});

export default router;
