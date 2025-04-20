import { Request, Response } from 'express';
const connection = require('../config/database')
import { JwtPayload } from 'jsonwebtoken';
import { FieldPacket } from 'mysql2';
import dotenv from 'dotenv';
import { ClubDetailRow } from '../models/clubDetailRow';
dotenv.config();

// 모임 생성
export const createClub = async (req: Request, res: Response) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
    }
    const { user_id } = req.user as JwtPayload;
    const { name, description, category, region, image_id } = req.body;
    try {
        const [memberRows]: any[] = await connection
            .promise()
            .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);

        const member = memberRows[0];
        const memberId = member.id;

        const [clubResult]: any[] = await connection
            .promise()
            .query(
                `INSERT INTO Clubs (name, description, category, region, created_by)
         VALUES (?, ?, ?, ?, ?)`,
                [name, description, category, region, memberId]
            );

        const newClubId = clubResult.insertId;
        await connection
            .promise()
            .query(
                `INSERT INTO ClubGallery (club_id, media_id)
         VALUES (?, ?)`,
                [newClubId, image_id]
            );
        return res.status(200).json({ message: '모임 생성 성공' });
    } catch (err: any) {
        console.error('모임 생성 오류:', err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: '이미 존재하는 모임 이름입니다' });
        }
        return res.status(500).json({ error: '서버 오류' });
    }
};

// 모임 리스트 조회
export const viewAllClub = async (req: Request, res: Response) => {
    const { category, region } = req.query;
    try {
        let sql = ""
        let params: any[] = [];
        
        if (category && region) { // 둘 다 있는 경우
            sql = "SELECT id AS club_id, name, category FROM Clubs WHERE category = ? AND region = ?";
            params.push(category, region);
        } else if (category && !region) { // 카테고리만 있는 경우
            sql = "SELECT id AS club_id, name, category FROM Clubs WHERE category = ?";
            params.push(category);
        } else if (!category && region) { // 리전만 있는 경우
            sql = "SELECT id AS club_id, name, category FROM Clubs WHERE region = ?";
            params.push(region);
        } else { // 둘 다 없는 경우
            sql = "SELECT id AS club_id, name, category FROM Clubs";
        }
        
        const [clubs]: any = await connection.promise().query(sql, params);

        if (!clubs || clubs.length === 0) {
            return res.status(404).json({ error: "조건에 맞는 모임이 없습니다" });
        }

        return res.status(200).json({ clubs });

    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
};

// 모임 상세 조회
export const viewClub = async (req: Request, res: Response) => {
    const clubId = Number(req.params.club_id);
    if (isNaN(clubId)) {
        return res.status(400).json({ error: '잘못된 모임 ID입니다' });
    }

    try {
        const sql = `
      SELECT 
        c.id              AS club_id,
        c.name,
        c.description,
        c.category,
        c.region,
        media.url         AS imgUrl
      FROM Clubs AS c
      LEFT JOIN ClubGallery AS cg
        ON cg.club_id = c.id
      LEFT JOIN Media AS media
        ON media.id = cg.media_id
       AND media.media_usage_type = 'background'
      WHERE c.id = ?
    `;

        const [rows, _fields] = (await connection
            .promise()
            .query(sql, [clubId])) as [ClubDetailRow[], FieldPacket[]];

        if (rows.length === 0) {
            return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
        }

        const { club_id, name, description, category, region } = rows[0];
        const imgUrl = rows
            .map(r => r.imgUrl)
            .filter((url): url is string => url !== null);

        return res.status(200).json({
            club_id,
            name,
            description,
            category,
            region,
            imgUrl,
        });
    } catch (err) {
        console.error('DB 조회 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
    }
};

export const viewClubMember = async (req: Request, res: Response) => {
    const clubId = Number(req.params.club_id);
    try {
        const [clubRows]: any[] = await connection.promise().query(
            'SELECT id FROM Clubs WHERE id = ?',
            [clubId]
        );
        if (clubRows.length === 0) {
            return res.status(404).json({ error: '모임을 찾을 수 없습니다' });
        }

        const [members]: any[] = await connection.promise().query(
            `SELECT
         m.id        AS member_id,
         m.nickname,
         cm.role,
         cm.status
       FROM ClubMembers cm
       JOIN Members m
         ON cm.member_id = m.id
       WHERE cm.club_id = ?`,
            [clubId]
        );
        return res.status(200).json({ members });
    } catch (err) {
        console.error('viewClubMember 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
    }
};


// 모임 가입
export const joinClub = async (req: Request, res: Response) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
    }
    const { user_id } = req.user as JwtPayload;
    if (!user_id) {
        return res.status(404).json({ message: "존재하지 않는 계정입니다." });
    }
    const { club_id } = req.params;
    try {
        const [rows] = await connection.promise().query(`
            SELECT id FROM Members where user_id = ?`
            , [user_id]);
        const id = rows[0].id;

        const [existingRows]: any = await connection.promise().query(
            "SELECT id FROM ClubMembers WHERE club_id = ? AND member_id = ?",
            [club_id, id]
        );
    
        if (existingRows && existingRows.length > 0) {
            return res.status(409).json({ error: "이미 가입된 회원입니다" });
        }
    
        await connection.promise().query(
            "INSERT INTO ClubMembers (club_id, member_id, role, status) VALUES (?, ?, 'member', 'pending')",
            [club_id, id]
        );
    
        return res.status(200).json({ message: "가입 요청이 전송되었습니다" });
    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ error: "서버 오류" });
    }
};

// 모임 회원 관리
export const manageClubMember = async (req: Request, res: Response) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ error: '인증되지 않은 사용자입니다' });
    }
    const { user_id } = req.user as JwtPayload;

    const clubId = Number(req.params.club_id);
    const { target_member_id, action } = req.body;

    if (
        typeof target_member_id !== 'number' ||
        !['approve', 'reject'].includes(action)
    ) {
        return res.status(400).json({ error: '지원하지 않는 action 값입니다' });
    }
    try {
        const [memberRows]: any[] = await connection
            .promise()
            .query('SELECT id FROM Members WHERE user_id = ?', [user_id]);
        const currentMemberId = memberRows[0].id;
        const [adminRows]: any[] = await connection
            .promise()
            .query(
                'SELECT role FROM ClubMembers WHERE club_id = ? AND member_id = ?',
                [clubId, currentMemberId]
        );
        if (adminRows.length === 0 || adminRows[0].role !== 'admin') {
            return res.status(403).json({ error: '운영자만 가능한 기능입니다' });
        }
        // 상태값이 pending 일 시에만 처리
        const [pendingRows]: any[] = await connection
            .promise()
            .query(
                'SELECT status FROM ClubMembers WHERE club_id = ? AND member_id = ?',
                [clubId, target_member_id]
            );
        if (pendingRows.length === 0 || pendingRows[0].status !== 'pending') {
            return res.status(400).json({ error: '처리할 가입 요청이 없습니다' });
        }

        await connection
            .promise()
            .query(
                'UPDATE ClubMembers SET status = ? WHERE club_id = ? AND member_id = ?',
                [action, clubId, target_member_id]
            );

        return res.status(200).json({ message: '처리가 완료되었습니다' });
    } catch (err) {
        console.error('manageClubMember 오류:', err);
        return res.status(500).json({ error: '서버 오류' });
    }
};