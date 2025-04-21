const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { createThunderMeeting, deleteThunder, getThunderDetail, joinThunder, listThunders, withdrawThunder } from "../controllers/thunderController";
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
], createThunderMeeting);

// 번개 모임 리스트
router.get('/', listThunders);

// 번개 모임 상세
router.get('/:thunder_id', getThunderDetail);

// 번개 모임 가입
router.post('/:thunder_id/join', joinThunder);

// 번개 모임 탈퇴
router.delete('/:thunder_id/leave', withdrawThunder);

// 번개 모임 삭제
router.delete('/:thunder_id', deleteThunder)

// 번개 모임 수정
router.put('/:thunder_id')

// 번개 모임 회원 조회
router.get('/:thunder_id/members')

// 번개 모임 회원 추방
router.delete('/:thunder_id/ban')

module.exports = router;