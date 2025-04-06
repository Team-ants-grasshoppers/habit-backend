import { Request, Response } from 'express';
const conn = require('../db');
const bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config()

export const login = (req: Request, res: Response) => { // 로그인 기능
    const { user_id, password } = req.body;
    try {
        let sql = 'SELECT user_id, password, nickname FROM users WHERE user_id = ?';
        let values = [user_id]
        conn.query(sql, values, async function (err: any, results: any) {
            if (err) {
                console.log("사용자 없음")
                return res.status(400).end()
            }

            var loginUser = results[0];
            if (!loginUser) {
                console.log(err)
                return res.status(400).end()
            }

            const isPasswordValid = await bcrypt.compare(password, loginUser.user_password);
            if (isPasswordValid) {
                const token = jwt.sign(
                    {
                        user_id: loginUser.user_id,
                        user_name: loginUser.user_name,
                    },
                    process.env.PRIVATE_KEY,
                    {
                        expiresIn: '1h', // 1시간 뒤 만료
                        issuer: 'pyeonhaeng',
                    }
                );

                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite : "none",
                    maxAge: 7 * 24 * 60 * 60 * 1000, // 쿠키 유효 시간 7일
                });

                res.status(200).json({
                    message: `${loginUser.user_name}님, 로그인 되었습니다.`
                })
            } else {
                res.status(401).json({
                    message: "이메일 또는 비밀번호가 틀렸습니다."
                })
            }
        })
    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ message: "서버 내부 오류" });
    }
}   

export const register = async (req: Request, res: Response) => { // 회원가입
    const { user_id, password, nickname, email } = req.body;
    try {
        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 데이터베이스에 사용자 정보 저장
        const sql = 'INSERT INTO users (user_id, password, nickname, email) VALUES (?, ?, ?)';
        const values = [user_id, hashedPassword, nickname, email];

        conn.query(sql, values, (err: any, results: any) => {
            if (err) {
                console.log(err)
                return res.status(409).end() // 중복된 아이디 혹은 비밀번호
            }
            res.status(201).json(results)
        })
    } catch (error) {
        console.error("예상치 못한 오류:", error);
        return res.status(500).json({ message: "서버 내부 오류" });
    }
}