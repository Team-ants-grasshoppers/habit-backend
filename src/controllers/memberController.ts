import { Request, Response } from 'express';
const connection = require('../config/database');
import { JwtPayload } from 'jsonwebtoken';

export const getProfile = async (req: Request, res: Response) => {
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
  }
  const { user_id } = req.user as JwtPayload;

  try {
    const sql = `
      SELECT
        m.user_id,
        m.nickname,
        m.email,
        m.region,
        m.interests AS interest,
        media.url AS profileImageUrl
      FROM Members AS m
      LEFT JOIN Media AS media
        ON media.created_by = m.id
       AND media.media_usage_type = 'profile'
      WHERE m.user_id = ?
    `;
    const [rows]: any[] = await connection.promise().query(sql, [user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: '존재하지 않는 계정입니다.' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('DB 조회 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
};