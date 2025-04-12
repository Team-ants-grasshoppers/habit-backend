import { Request, Response } from 'express';
const connection = require('../config/database')
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// 모임 생성
export const createClub = async (req: Request, res: Response) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
    }

    const { user_id } = req.user as JwtPayload;

    if (!user_id) {
        return res.status(404).json({ message: "존재하지 않는 계정입니다." });
    }
    const { name, description, category, region } = req.body;

    try {
        const [rows] = await connection.promise().query(
            `SELECT id FROM Members WHERE user_id = ?`,
            user_id
        )
        const id = rows[0].id
        let sql = `
            INSERT INTO Clubs (name, description, category, region, created_by)
            VALUES (?, ?, ?, ?, ?);
        `
        const values = [name, description, category, region, id];
        connection.query(sql, values, (err: any, results: any) => {
            if (err) {
                console.log(err);
                return res.status(409).json({
                    message: "이미 존재하는 모임 이름입니다."
                }) 
            };
            res.status(200).json({ message: "모임 생성 성공" });
        })
    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
}

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

// 모임 리스트 상세 조회
export const viewClub = async (req: Request, res: Response) => {
    const { club_id } = req.params;
    try {
        // club_id에 해당하는 모임 상세 정보를 조회
        const [clubRows]: any = await connection.promise().query(
            "SELECT id AS club_id, name, description, category, region FROM Clubs WHERE id = ?",
            [club_id]
        );

        // 조회된 결과가 없으면 404 응답
        if (!clubRows || clubRows.length === 0) {
            return res.status(404).json({ error: "모임을 찾을 수 없습니다" });
        }

        // 조회 결과에서 첫번째 행 반환
        const club = clubRows[0];
        return res.status(200).json(club);
    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ error: "서버 오류" });
    }
};

// 모임 회원 조회
export const viewClubMember = async (req: Request, res: Response) => {
  const { club_id } = req.params;
  try {
    // 1. club_id로 Clubs 테이블에서 모임 존재 여부 확인
    const [clubRows]: any = await connection.promise().query(
      "SELECT id FROM Clubs WHERE id = ?",
      [club_id]
    );

    if (!clubRows || clubRows.length === 0) {
      return res.status(404).json({ error: "모임을 찾을 수 없습니다" });
    }

    // 2. 해당 club_id에 속한 모임 회원 조회 (ClubMembers와 Members 테이블 JOIN)
    const [members]: any = await connection.promise().query(
      `SELECT m.id AS member_id, m.nickname, cm.role
       FROM ClubMembers cm
       JOIN Members m ON cm.member_id = m.id
       WHERE cm.club_id = ?`,
      [club_id]
    );

    // 3. 조회 결과가 있다면 200 OK와 함께 회원 목록 반환
    return res.status(200).json({ members });
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
}

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

        // 1. 해당 회원이 이미 모임에 가입했는지 확인 (이미 가입 또는 요청 중인 경우)
        const [existingRows]: any = await connection.promise().query(
            "SELECT id FROM ClubMembers WHERE club_id = ? AND member_id = ?",
            [club_id, id]
        );
    
        if (existingRows && existingRows.length > 0) {
            return res.status(409).json({ error: "이미 가입된 회원입니다" });
        }
    
        // 2. 가입 요청 생성: role은 'member' 기본, status는 'pending'
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