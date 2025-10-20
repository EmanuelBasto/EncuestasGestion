import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  
  if (!token) {
    return res.status(401).json({ 
      ok: false, 
      message: 'Falta token de autorización' 
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, rol, iat, exp }
    next();
  } catch (err) {
    console.error('Error de autenticación:', err.message);
    return res.status(401).json({ 
      ok: false, 
      message: 'Token inválido o expirado' 
    });
  }
}
