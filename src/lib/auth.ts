import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'reel-vault-secret-key-123';

export interface AuthData {
  userId: string;
  email: string;
}

export function getAuthFromRequest(req: Request): AuthData | null {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthData;
    
    return decoded;
  } catch {
    return null;
  }
}

export function getUserIdFromRequest(req: Request): string | null {
  const auth = getAuthFromRequest(req);
  return auth ? auth.userId : null;
}
