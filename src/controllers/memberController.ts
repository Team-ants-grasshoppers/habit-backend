import { Request, Response } from 'express';
const connection = require('../config/database')
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const getProfile = (req: Request, res: Response) => {
    if (!req.user || typeof req.user === 'string') {
        return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
    }

    const { user_id } = req.user as JwtPayload;

    if (!user_id) {
        return res.status(404).json({ message: "존재하지 않는 계정입니다." });
    }
    
    try {
        let sql = `
            SELECT user_id, nickname, email, region, profile_media_id
            FROM Members
            WHERE user_id = ?
    `
        connection.query(sql, [user_id], (err: any, results: any) => {
            if (err) {
                console.error("DB 조회 오류:", err);
                return res.status(500).json({ message: "서버 오류 발생" });
            }
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ message: "서버 오류" });
    }
};