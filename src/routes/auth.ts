const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { register } from "module";
import { login } from "../controllers/authController";
import { ensureAuthorization, validate } from "../middlewares/middlewares";

router.use(express.json());

// 로그인 API
router.post('/login', [
        check('user_id').notEmpty().isString().withMessage("문자열 입력 필요"),
        check('user_password').notEmpty().isString().withMessage('문자열 입력 필요'),
        validate
    ], login)

// 회원가입 API
router.post('/join', [
    check('user_id').notEmpty().isString().withMessage("문자열 입력 필요"),
    check('user_password').notEmpty().isString().withMessage('문자열 입력 필요'),
    check('user_name').notEmpty().isString().withMessage('문자열 입력 필요'),
    validate
], register)