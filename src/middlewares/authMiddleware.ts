// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export interface JwtPayload {
  user_id: string;
  nickname: string;
}

/**
 * express-validator 결과 검증 미들웨어
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * JWT 토큰 검증 미들웨어
 * - Authorization 헤더 또는 쿠키에서 토큰을 추출하여 검증한 후,
 *   payload({ user_id, nickname })를 req.user에 저장합니다.
 */
export const ensureAuthorization = (req: Request, res: Response, next: NextFunction) => {
  try {
    const receivedJwt = req.headers['authorization'] || req.cookies?.token;
    if (!receivedJwt) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    const token: string = typeof receivedJwt === 'string' && receivedJwt.startsWith('Bearer ')
      ? receivedJwt.split(' ')[1]
      : receivedJwt;
    
    console.log("Received JWT:", token);
    
    const decoded = jwt.verify(token, process.env.PRIVATE_KEY as string) as JwtPayload;
    console.log("Decoded JWT:", decoded);
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error("JWT 검증 에러:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};