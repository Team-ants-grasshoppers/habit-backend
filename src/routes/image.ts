const express = require('express')
const router = express.Router();
import { uploadImage } from "../controllers/imageController";
import { ensureAuthorization } from "../middlewares/authMiddleware";
import multer from 'multer';

router.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
router.post('/', ensureAuthorization, upload.single('img'), uploadImage)

module.exports = router;