const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { getProfile } from "../controllers/memberController";
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";

router.use(express.json());

router.get('/profile', ensureAuthorization, getProfile);

module.exports = router;