import { Request, Response } from 'express';
import { RowDataPacket, FieldPacket } from 'mysql2';
const connection = require('../config/database')
import { JwtPayload } from 'jsonwebtoken';
import { ThunderMeetingRow } from '../models/thunderMeetingRow';
import dotenv from 'dotenv';
dotenv.config();

export const createThunderMeeting = async (req: Request, res: Response) => {
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
  }
  const { user_id } = req.user as JwtPayload;
  const { title, description, category, region, time, img_id } = req.body;
  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    const memberId = memberRows[0].id;

    const [result]: any = await connection
      .promise()
      .query(
        `INSERT INTO ThunderMeetings
           (title, description, category, region, meeting_datetime, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, description, category, region, time, memberId]
      );
    const thunderId = result.insertId;

    await connection
      .promise()
      .query(
        `INSERT INTO ThunderMeetingMedia
           (thunder_id, media_id)
         VALUES (?, ?)`,
        [thunderId, img_id]
      );

    return res.status(200).json({
      thunder_id: thunderId,
      message: '번개모임 생성 성공'
    });
  } catch (err) {
    console.error('createThunderMeeting 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};


// 번개모임 리스트 조회
export const listThunders = async (req: Request, res: Response) => {
    const category = req.query.category as string | undefined;
    const region = req.query.region as string | undefined;
    const date = req.query.date as string | undefined; // ex. "2025.4.19"
    try {
        let sql = `
      SELECT
        t.id AS thunder_id,
        t.title,
        t.category,
        t.region,
        DATE_FORMAT(t.meeting_datetime, '%Y.%c.%e.%k.%i') AS datetime,
        media.url AS imgUrl
      FROM ThunderMeetings t
      LEFT JOIN ThunderMeetingMedia tmm ON tmm.thunder_id = t.id
      LEFT JOIN Media media ON media.id = tmm.media_id
    `;
        const conditions: string[] = [];
        const params: (string | number)[] = [];

        if (category) {
            conditions.push('t.category = ?');
            params.push(category);
        }
        if (region) {
            conditions.push('t.region = ?');
            params.push(region);
        }
        if (date) {
            conditions.push("DATE_FORMAT(t.meeting_datetime, '%Y.%c.%e') = ?");
            params.push(date);
        }
        if (conditions.length) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY t.meeting_datetime';

        const [rows] = (await connection
            .promise()
            .query(sql, params)) as [ThunderMeetingRow[], FieldPacket[]];

        if (rows.length === 0) {
            return res
                .status(404)
                .json({ error: '조건에 맞는 번개모임이 없습니다' });
        }

        const seen = new Set<number>();
        const thunders = rows.filter(r => {
            if (seen.has(r.thunder_id)) return false;
            seen.add(r.thunder_id);
            return true;
        });

        return res.status(200).json({ thunders });
    } catch (err) {
        console.error('listThunders 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
    }
};

// 번개모임 상세 조회
export const getThunderDetail = async (req: Request, res: Response) => {
    const thunderId = Number(req.params.thunder_id);
    try {
        const sql = `
      SELECT
        t.id               AS thunder_id,
        t.title,
        t.description,
        t.category,
        t.region,
        DATE_FORMAT(t.meeting_datetime, '%Y-%m-%d-%H:%i') AS datetime,
        media.url          AS img_url
      FROM ThunderMeetings t
      LEFT JOIN ThunderMeetingMedia tmm
        ON tmm.thunder_id = t.id
      LEFT JOIN Media media
        ON media.id = tmm.media_id
      WHERE t.id = ?
      LIMIT 1
    `;
        const [rows] = (await connection
            .promise()
            .query(sql, [thunderId])) as [RowDataPacket[] & {
                thunder_id: number;
                title: string;
                description: string;
                category: string;
                region: string;
                datetime: string;
                img_url: string | null;
            }[], FieldPacket[]];

        if (rows.length === 0 || !rows[0].thunder_id) {
            return res.status(404).json({ error: '번개모임을 찾을 수 없습니다' });
        }

        const row = rows[0];
        return res.status(200).json({
            thunder_id: row.thunder_id,
            title: row.title,
            description: row.description,
            category: row.category,
            region: row.region,
            img_url: row.img_url,
            datetime: row.datetime,
        });
    } catch (err) {
        console.error('getThunderDetail 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
    }
};

// 번개모임 가입 신청
export const joinThunder = async (req: Request, res: Response) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
    }
    const { user_id } = req.user as JwtPayload;

    const thunderId = Number(req.params.thunder_id);
    try {
        const [memberRows]: any[] = await connection
            .promise()
            .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
        const memberId = memberRows[0].id;

        const [existing]: any[] = await connection
            .promise()
            .query(
                'SELECT id FROM ThunderMembers WHERE thunder_id = ? AND member_id = ?',
                [thunderId, memberId]
            );
        if (existing.length > 0) {
            return res.status(409).json({ error: '이미 번개모임에 가입되어 있습니다' });
        }

        await connection
            .promise()
            .query(
                `INSERT INTO ThunderMembers
           (thunder_id, member_id, role, status)
         VALUES
           (?, ?, 'member', 'approved')`,
                [thunderId, memberId]
            );
        return res.status(200).json({ message: '가입 신청 완료' });
    } catch (err) {
        console.error('joinThunder 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
    }
};


// 번개모임 탈퇴
export const withdrawThunder = async (req: Request, res: Response) => {
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
  }
  const { user_id } = req.user as JwtPayload;
  const thunderId = Number(req.params.thunder_id);
  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    const memberId = memberRows[0].id;
    const [existing]: any[] = await connection
      .promise()
      .query(
        'SELECT id FROM ThunderMembers WHERE thunder_id = ? AND member_id = ?',
        [thunderId, memberId]
      );
    if (existing.length === 0) {
      return res.status(400).json({ error: '가입되지 않은 번개모임입니다' });
    }

    await connection
      .promise()
      .query(
        'DELETE FROM ThunderMembers WHERE thunder_id = ? AND member_id = ?',
        [thunderId, memberId]
      );

    return res.status(200).json({ message: '번개모임 탈퇴 완료' });
  } catch (err) {
    console.error('withdrawThunder 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};

// 번개모임 삭제
export const deleteThunder = async (req: Request, res: Response) => {
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
  }
  const { user_id } = req.user as JwtPayload;
  const thunderId = Number(req.params.thunder_id);

  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    const memberId = memberRows[0].id;
    const [thunderRows]: any[] = await connection
      .promise()
      .query(
        'SELECT created_by FROM ThunderMeetings WHERE id = ?',
        [thunderId]
      );
    if (thunderRows.length === 0) {
      return res.status(404).json({ error: '번개모임을 찾을 수 없습니다' });
    }
    const creatorId = thunderRows[0].created_by;

    let isAuthorized = (creatorId === memberId);
    if (!isAuthorized) {
      const [adminRows]: any[] = await connection
        .promise()
        .query(
          `SELECT id 
             FROM ThunderMembers 
            WHERE thunder_id = ? 
              AND member_id = ? 
              AND role = 'admin'`,
          [thunderId, memberId]
        );
      if (adminRows.length > 0) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: '삭제 권한이 없습니다' });
    }

    await connection
      .promise()
      .query('DELETE FROM ThunderMeetings WHERE id = ?', [thunderId]);

    return res.status(200).json({ message: '번개모임이 삭제되었습니다' });
  } catch (err) {
    console.error('deleteThunder 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};

// 번개모임 수정
export const modifyThunder = async (req: Request, res: Response) => {
  // 1) 인증 확인
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
  }
  const { user_id } = req.user as JwtPayload;

  // 2) 파라미터 및 바디 파싱
  const thunderId = Number(req.params.thunder_id);
  const { title, description, region, date, id: imageId } = req.body;

  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    if (memberRows.length === 0) {
      return res.status(403).json({ error: '수정 권한이 없습니다' });
    }
    const memberId = memberRows[0].id;

    const [thunderRows]: any[] = await connection
      .promise()
      .query('SELECT created_by FROM ThunderMeetings WHERE id = ?', [thunderId]);
    if (thunderRows.length === 0) {
      return res.status(403).json({ error: '수정 권한이 없습니다' });
    }
    const creatorId = thunderRows[0].created_by;

    let isAuthorized = creatorId === memberId;
    if (!isAuthorized) {
      const [adminRows]: any[] = await connection
        .promise()
        .query(
          `SELECT id FROM ThunderMembers 
           WHERE thunder_id = ? AND member_id = ? AND role = 'admin'`,
          [thunderId, memberId]
        );
      isAuthorized = adminRows.length > 0;
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: '수정 권한이 없습니다' });
    }

    const [y, m, d, h, mi] = date.split('-');
    const meetingDatetime = `${y}-${m}-${d} ${h}:${mi}:00`;

    await connection
      .promise()
      .query(
        `UPDATE ThunderMeetings
            SET title = ?, description = ?, region = ?, meeting_datetime = ?
          WHERE id = ?`,
        [title, description, region, meetingDatetime, thunderId]
      );

    await connection
      .promise()
      .query('DELETE FROM ThunderMeetingMedia WHERE thunder_id = ?', [thunderId]);
    await connection
      .promise()
      .query(
        `INSERT INTO ThunderMeetingMedia (thunder_id, media_id)
         VALUES (?, ?)`,
        [thunderId, imageId]
      );
    return res.status(200).json({ message: '번개모임 수정 완료' });
  } catch (err) {
    console.error('modifyThunder 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};

// 번개모임 회원 조회
export const viewThunderMembers = async (req: Request, res: Response) => {
  const thunderId = Number(req.params.thunder_id);

  try {
    const [thunderRows]: any[] = await connection
      .promise()
      .query(
        'SELECT id FROM ThunderMeetings WHERE id = ?',
        [thunderId]
      );
    if (thunderRows.length === 0) {
      return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
    }
    const [members]: any[] = await connection
      .promise()
      .query(
        `
        SELECT
          m.id       AS member_id,
          m.nickname,
          tm.role
        FROM ThunderMembers tm
        JOIN Members m
          ON tm.member_id = m.id
        WHERE tm.thunder_id = ?
        `,
        [thunderId]
      );

    return res.status(200).json({ members });
  } catch (err) {
    console.error('viewThunderMembers 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};

// 번개모임 회원 추방
export const banThunderMember = async (req: Request, res: Response) => {
  const { user_id } = req.user as JwtPayload;
  const thunderId = Number(req.params.thunder_id);
  const targetMemberId = Number(req.body.target_member_id);

  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    const currentMemberId = memberRows[0].id;

    const [thunderRows]: any[] = await connection
      .promise()
      .query(
        'SELECT created_by FROM ThunderMeetings WHERE id = ?',
        [thunderId]
      );
    if (thunderRows.length === 0) {
      return res.status(404).json({ error: '번개모임을 찾을 수 없습니다' });
    }
    const creatorId = thunderRows[0].created_by;

    let isAuthorized = creatorId === currentMemberId;
    if (!isAuthorized) {
      const [adminRows]: any[] = await connection
        .promise()
        .query(
          `SELECT id FROM ThunderMembers
           WHERE thunder_id = ? AND member_id = ? AND role = 'admin'`,
          [thunderId, currentMemberId]
        );
      isAuthorized = adminRows.length > 0;
    }
    if (!isAuthorized) {
      return res.status(403).json({ error: '운영자만 가능한 기능입니다' });
    }

    const [existing]: any[] = await connection
      .promise()
      .query(
        'SELECT id FROM ThunderMembers WHERE thunder_id = ? AND member_id = ?',
        [thunderId, targetMemberId]
      );
    if (existing.length === 0) {
      return res.status(400).json({ error: '가입되지 않은 번개모임입니다' });
    }

    await connection
      .promise()
      .query(
        'DELETE FROM ThunderMembers WHERE thunder_id = ? AND member_id = ?',
        [thunderId, targetMemberId]
      );

    return res.status(200).json({ message: '추방 처리가 완료되었습니다' });
  } catch (err) {
    console.error('banThunderMember 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};

// 내가 참여 중인 번개모임 조회
export const getMyThunders = async (req: Request, res: Response) => {
  const { user_id } = req.user as JwtPayload;

  try {
    const [memberRows]: any[] = await connection
      .promise()
      .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
    if (memberRows.length === 0) {
      return res.status(401).json({ error: '미인증 사용자' });
    }
    const memberId = memberRows[0].id;

    const sql = `
      SELECT
        t.id AS thunder_id,
        t.title AS name,
        (
          SELECT m.url
          FROM ThunderMeetingMedia tmm
          JOIN Media m ON m.id = tmm.media_id
          WHERE tmm.thunder_id = t.id
          LIMIT 1
        ) AS img_url
      FROM ThunderMembers tm
      JOIN ThunderMeetings t
        ON tm.thunder_id = t.id
      WHERE tm.member_id = ?
        AND tm.status = 'approved'
    `;
    const [rows]: any[] = await connection
      .promise()
      .query(sql, [memberId]);
    
    return res.status(200).json(rows);
  } catch (err) {
    console.error('getMyThunders 오류:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
};