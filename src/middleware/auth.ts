import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

interface AuthRequest extends Request {
  userId?: string;
  clientIp?: string;
}

const trustedIPs = process.env.TRUSTED_IPS ? process.env.TRUSTED_IPS.split(',') : [];

const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
  req.clientIp = (req.headers['x-forwarded-for']?.toString() || req.connection.remoteAddress || '').split(',')[0].trim();

  if (trustedIPs.includes(req.clientIp)) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Please sign in to access this resource.' });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default auth;
