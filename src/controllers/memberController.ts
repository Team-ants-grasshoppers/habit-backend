import { Request, Response } from 'express';
const connection = require('../config/database');
import { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

// 내 정보 수정
export const updateProfile = async (req: Request, res: Response) => {
  const { user_id } = req.user as JwtPayload;

  const {
    nickname,
    profile_image,   // Media.id
    password,        // 새로 설정할 비밀번호
    email,
    region,
    interest,
  } = req.body;

  try {
    const [rows]: any[] = await connection
      .promise()
      .query(
        `SELECT id FROM Members WHERE user_id = ?`,
        [user_id]
      );
    if (rows.length === 0) {
      return res.status(401).json({ error: '미인증 사용자' });
    }
    const memberId = rows[0].id;

    const [dup]: any[] = await connection
      .promise()
      .query(
        `SELECT id FROM Members WHERE nickname = ? AND id != ?`,
        [nickname, memberId]
      );
    if (dup.length > 0) {
      return res.status(409).json({ error: '이미 사용중인 닉네임입니다' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection
      .promise()
      .query(
        `UPDATE Members
           SET nickname         = ?,
               email            = ?,
               region           = ?,
               interests        = ?,
               profile_media_id = ?,
               password         = ?
         WHERE user_id = ?`,
        [nickname, email, region, interest, profile_image, hashedPassword, user_id]
      );
    return res.status(200).json({ message: '회원정보 수정 성공' });
  } catch (err) {
    console.error('updateProfile 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
};

// 내 모임 관리 조회
export const getMyClubs = async (req: Request, res: Response) => {
  const { user_id } = req.user as JwtPayload;

  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    if (memberRows.length === 0) {
      return res.status(401).json({ error: '미인증 사용자' });
    }
    const memberId = memberRows[0].id;

    const [managed]: any[] = await connection
      .promise()
      .query(
        `SELECT
           c.id   AS club_id,
           c.name,
           cm.role
         FROM ClubMembers cm
         JOIN Clubs c
           ON c.id = cm.club_id
         WHERE cm.member_id = ? AND cm.role = 'admin'`,
        [memberId]
      );

    const [joined]: any[] = await connection
      .promise()
      .query(
        `SELECT
           c.id   AS club_id,
           c.name,
           cm.role
         FROM ClubMembers cm
         JOIN Clubs c
           ON c.id = cm.club_id
         WHERE cm.member_id = ? AND cm.role = 'member'`,
        [memberId]
      );

    return res.status(200).json({
      managed_clubs: managed,
      joined_clubs: joined,
    });
  } catch (err) {
    console.error('getMyClubs 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};