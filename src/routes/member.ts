const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { getMyClubs, getProfile, updateProfile } from "../controllers/memberController";
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";

router.use(express.json());

router.get('/profile', ensureAuthorization, getProfile);

router.put('/profile', ensureAuthorization, updateProfile);

router.get('/my-clubs', ensureAuthorization, getMyClubs);

module.exports = router;