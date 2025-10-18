import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Registro
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 8 }).withMessage('Mínimo 8 caracteres'),
    body('nombre').trim().notEmpty().withMessage('Nombre requerido')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

    const { email, password, nombre } = req.body;

    const exist = await query('SELECT 1 FROM usuarios WHERE email = $1::citext', [email]);
    if (exist.rowCount) return res.status(409).json({ ok: false, message: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 12);

    const { rows } = await query(
      `INSERT INTO usuarios (email, nombre, hash_password)
       VALUES ($1::citext, $2, $3)
       RETURNING id, email, nombre, creado_en`,
      [email, nombre, hash]
    );

    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ ok: true, user, token });
  }
);

// Login
router.post(
  '/login',
  [body('email').isEmail(), body('password').isLength({ min: 8 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT id, email, nombre, hash_password FROM usuarios WHERE email = $1::citext',
      [email]
    );
    if (!rows.length) return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.hash_password);
    if (!ok) return res.status(401).json({ ok: false, message: 'Credenciales inválidas' });

    const token = signToken(user);
    res.json({ ok: true, user: { id: user.id, email: user.email, nombre: user.nombre }, token });
  }
);

// Perfil (protegido)
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    'SELECT id, email, nombre, creado_en FROM usuarios WHERE id = $1',
    [req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ ok: false, message: 'No encontrado' });
  res.json({ ok: true, user: rows[0] });
});

export default router;
