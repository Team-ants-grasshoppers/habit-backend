const express = require('express')
const router = express.Router();
import { uploadVideo } from "../controllers/videoController";
import { ensureAuthorization } from "../middlewares/authMiddleware";
import multer from 'multer';

router.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
router.post(
  '/',
  ensureAuthorization,
  upload.single('file'),
  uploadVideo
);

module.exports = router;