const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import passport from 'passport';
import { login, register, socialLoginCallback } from "../controllers/authController";
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";

router.use(express.json());

// 로그인 API
router.post('/login', [
        check('user_id').notEmpty().withMessage("문자열 입력 필요"),
        check('password').notEmpty().withMessage('문자열 입력 필요'),
        validate
    ], login)

// 회원가입 API
router.post('/join', [
    check('user_id').notEmpty().isString().withMessage("문자열 입력 필요"),
    check('password').notEmpty().isString().withMessage('문자열 입력 필요'),
    check('nickname').notEmpty().isString().withMessage('문자열 입력 필요'),
    validate
], register)


// 소셜 로그인 시작 (세션 사용 안 함)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/kakao', passport.authenticate('kakao', { session: false }));
router.get('/naver', passport.authenticate('naver', { session: false }));

// 소셜 로그인 콜백 (세션 없이 stateless JWT 방식)
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/' }), socialLoginCallback);
router.get('/kakao/callback', passport.authenticate('kakao', { session: false, failureRedirect: '/' }), socialLoginCallback);
router.get('/naver/callback', passport.authenticate('naver', { session: false, failureRedirect: '/' }), socialLoginCallback);

// 보호된 라우트 (JWT 인증 미들웨어 적용)
router.get('/profile', (req: any, res: any) => {
  return res.status(200).json({ message: '인증된 사용자입니다.', user: req.user });
});

// 로그아웃 (쿠키 제거)
router.get('/logout', (req: any , res: any) => {
  res.clearCookie('token');
  res.status(200).json({ message: '로그아웃되었습니다.' });
});

module.exports = router;