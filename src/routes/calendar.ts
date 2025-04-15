const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { deleteCalendar, modifyCalendar, registerCalendar, viewCalendar } from "../controllers/calendarController";
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";

router.use(express.json());

// 캘린더 보기
router.get('/', viewCalendar)

// 일정 등록
router.post('/', ensureAuthorization, registerCalendar)

// 일정 수정
router.put('/:event_id', ensureAuthorization, modifyCalendar)

// 일정 삭제
router.delete('/:event_id', ensureAuthorization, deleteCalendar)

module.exports = router;