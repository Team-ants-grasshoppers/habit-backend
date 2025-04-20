const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";
import { createClub, joinClub, manageClubMember, viewAllClub, viewClub, viewClubMember } from '../controllers/clubController';

router.use(express.json());

// 모임 생성
router.post('/', ensureAuthorization, [
    check('name').notEmpty().withMessage("필수 항목 누락"),
    validate
], createClub);

// 모임 리스트 조회
router.get('/', viewAllClub);

// 모임 리스트 상세 조회
router.get('/:club_id', viewClub);

// 모임 회원 조회
router.get('/:club_id/members', viewClubMember);

// 모임 가입
router.post('/:club_id/join', ensureAuthorization, joinClub);

// 모임 회원 관리
router.post('/:club_id/members/manage', ensureAuthorization, manageClubMember)




module.exports = router;