import { Request, Response } from 'express';
const connection = require('../config/database')
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * 로컬 로그인 (Local Login)
 */
export const login = (req: Request, res: Response) => {
  const { user_id, password } = req.body;
  try {
    const sql = "SELECT user_id, password, nickname FROM Members WHERE user_id = ? AND login_type = 'local'";
    connection.query(sql, [user_id], async (err: any, results: any) => {
      if (err) {
        console.error("DB 조회 오류:", err);
        return res.status(500).json({ message: "서버 내부 오류" });
      }
      const loginUser = results[0];
      if (!loginUser) {
        return res.status(400).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }
      const isPasswordValid = await bcrypt.compare(password, loginUser.password);
      if (isPasswordValid) {
        const token = jwt.sign(
          { user_id: loginUser.user_id, nickname: loginUser.nickname },
          process.env.PRIVATE_KEY as string,
          { expiresIn: '1h', issuer: 'habit' }
        );
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({ message: `${loginUser.nickname}님, 로그인 되었습니다.` });
      } else {
        return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }
    });
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ message: "서버 내부 오류" });
  }
};

/**
 * 회원가입 (Register)
 */
export const register = async (req: Request, res: Response) => {
  const { user_id, password, nickname, email } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO Members (user_id, nickname, password, email, login_type) VALUES (?, ?, ?, ?, ?)";
    connection.query(sql, [user_id, nickname, hashedPassword, email, 'local'], (err: any, results: any) => {
      if (err) {
        console.error("회원가입 오류:", err);
        return res.status(409).json({ message: "회원가입 중 중복된 아이디 혹은 오류 발생" });
      }
      return res.status(201).json({ message: "회원가입이 완료되었습니다.", results });
    });
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ message: "서버 내부 오류" });
  }
};

/**
 * 소셜 로그인 콜백 (Social Login Callback)
 * Passport의 소셜 로그인 전략이 실행되어 upsertSocialUser를 통해
 * DB에 사용자 정보가 생성되거나 업데이트된 후, req.user에 해당 정보가 저장됩니다.
 * 따라서, 여기서는 단순히 req.user의 값으로 JWT 토큰을 생성합니다.
 */
export const socialLoginCallback = (req: Request, res: Response) => {
  const socialUser: any = req.user;
  if (!socialUser) {
    return res.status(400).json({ message: "소셜 사용자 정보가 없습니다." });
  }
  // 이미 passportStrategies.ts의 upsertSocialUser가 실행되어,
  // user 정보가 req.user에 담겨있습니다.
  generateAndSendToken(socialUser.user_id, socialUser.nickname, res);
};

const generateAndSendToken = (user_id: string, nickname: string, res: Response) => {
  const token = jwt.sign(
    { user_id, nickname },
    process.env.PRIVATE_KEY as string,
    { expiresIn: '1h', issuer: 'habit' }
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return res.status(200).json({ message: `${nickname}님, 소셜 로그인이 완료되었습니다.` });
};


export const memberWithdraw = (req: Request, res: Response) => {
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ message: '유효한 사용자 정보가 없습니다.' });
  }

  const { user_id } = req.user as JwtPayload;
  const { password } = req.body;

  if (!user_id) {
    return res.status(404).json({ message: "존재하지 않는 계정입니다." });
  }

  try {
    let sql = `
            SELECT password
            FROM Members
            WHERE user_id = ?
        `
    const value = [user_id]
    connection.query(sql, value, (err: any, results: any) => {
      if (err) {
        console.error("DB 조회 오류:", err);
        return res.status(500).json({ message: "서버 오류 발생" });
      }

      // 사용자가 없는 경우
      if (results.length === 0) {
        return res.status(404).json({ message: "존재하지 않는 계정입니다." });
      }

      const hashedPassword = results[0].password
      const isPasswordValid = bcrypt.compare(password, hashedPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." })
      }
    })

    sql = `
            DELETE FROM Members
            WHERE user_id = ?;
        `
    connection.query(sql, value, (err: any, results: any) => {
      if (err) {
        console.error("회원 삭제 오류:", err);
        return res.status(500).json({ message: "회원 삭제 중 오류 발생" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "존재하지 않는 계정입니다." });
      }

      return res.status(200).json({ message: "회원 탈퇴가 완료되었습니다." });
    })
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ message: "서버 내부 오류 발생" });
  }
}