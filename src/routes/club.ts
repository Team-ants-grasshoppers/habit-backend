const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";
import { banMemberClub, createClub, deleteClub, joinClub, manageClubMember, modifyClub, viewAllClub, viewClub, viewClubGallery, viewClubMember, withdrawClub } from '../controllers/clubController';

router.use(express.json());

// 모임 생성
router.post('/', ensureAuthorization, [
    check('name').notEmpty().withMessage("필수 항목 누락"),
    validate
], createClub);

// 모임 리스트 조회
router.get('/', viewAllClub);

// 모임 리스트 상세 조회
router.get('/:club_id', ensureAuthorization, viewClub);

// 모임 회원 조회
router.get('/:club_id/members', ensureAuthorization, viewClubMember);

// 모임 가입
router.post('/:club_id/join', ensureAuthorization, joinClub);

// 모임 회원 관리
router.post('/:club_id/members/manage', ensureAuthorization, manageClubMember)

// 모임 탈퇴
router.delete('/:club_id/leave', ensureAuthorization, withdrawClub)

// 모임 삭제
router.delete('/:club_id', ensureAuthorization, deleteClub)

// 모임 수정
router.put('/:club_id', ensureAuthorization, modifyClub)

// 모임 회원 추방
router.delete('/:club_id/members/ban', ensureAuthorization, banMemberClub)

// 모임 갤러리 조회
router.get('/:club_id/gallery', ensureAuthorization, viewClubGallery)

module.exports = router;