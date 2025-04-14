const express = require('express')
const router = express.Router();
const { check } = require('express-validator');
import { ensureAuthorization, validate } from "../middlewares/authMiddleware";

router.use(express.json());

router.post()

module.exports = router;