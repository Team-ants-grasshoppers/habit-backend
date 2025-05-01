const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { banThunderMember, createThunderMeeting, deleteThunder, getMyThunders, getThunderDetail, joinThunder, listThunders, modifyThunder, viewThunderMembers, withdrawThunder } from "../controllers/thunderController";
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";

router.use(express.json());

// 번개 모임 생성
router.post('/', [
    check('title').notEmpty(),
    check('description').notEmpty(),
    check('category').notEmpty(),
    check('region').notEmpty(),
    check('time').notEmpty(),
    check('img_id').notEmpty(),
], ensureAuthorization, createThunderMeeting);

// 번개 모임 리스트
router.get('/', listThunders);

// 번개 모임 상세
router.get('/:thunder_id', getThunderDetail);

// 번개 모임 가입
router.post('/:thunder_id/join', ensureAuthorization, joinThunder);

// 번개 모임 탈퇴
router.delete('/:thunder_id/leave', ensureAuthorization, withdrawThunder);

// 번개 모임 삭제
router.delete('/:thunder_id', ensureAuthorization, deleteThunder)

// 번개 모임 수정
router.put('/:thunder_id', ensureAuthorization, modifyThunder)

// 번개 모임 회원 조회
router.get('/:thunder_id/members', ensureAuthorization, viewThunderMembers)

// 번개 모임 회원 추방
router.delete('/:thunder_id/ban', ensureAuthorization, banThunderMember)

// 내가 참여중인 번개모임 조회
router.get('/joined', ensureAuthorization, getMyThunders)

module.exports = router;