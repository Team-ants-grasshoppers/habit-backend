import { Request, Response } from 'express';
const connection = require('../config/database')
import dotenv from 'dotenv';
dotenv.config();
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

// 비디오 업로드
export const uploadVideo = async (req: Request, res: Response) => {
  try {
    const { user_id } = req.user as JwtPayload;

    if (!req.file) {
      return res.status(400).json({ error: '비디오 파일이 업로드되지 않았습니다.' });
    }

    const mediaType: string = req.body.media_type;
    const mediaUsageType: string = req.body.media_usage_type;
    if (mediaType !== 'video') {
      return res.status(400).json({ error: 'media_type 은 "video" 여야 합니다.' });
    }
    const validUsageTypes = ['profile', 'background', 'gallery'];
    if (!mediaUsageType || !validUsageTypes.includes(mediaUsageType)) {
      return res.status(400).json({
        error: '유효한 media_usage_type (profile, background, gallery)을 지정해주세요.',
      });
    }

    const storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE,
    });
    const bucketName = process.env.GCP_BUCKET as string;
    const bucket = storage.bucket(bucketName);

    const filename = `${uuidv4()}_${req.file.originalname}`;
    const blob = bucket.file(filename);

    await new Promise<void>((resolve, reject) => {
      const stream = blob.createWriteStream({
        resumable: false,
        metadata: { contentType: req.file!.mimetype },
      });
      stream.on('error', (err: any) => {
        console.error('버킷 업로드 에러:', err);
        reject(err);
      });
      stream.on('finish', () => resolve());
      stream.end(req.file!.buffer);
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

    connection.query(
      `INSERT INTO Media (url, media_type, media_usage_type, created_by)
       VALUES (?, ?, ?, ?)`,
      [publicUrl, 'video', mediaUsageType, user_id],
      (dbError: any, result: any) => {
        if (dbError) {
          console.error('DB 저장 에러:', dbError);
          return res.status(500).json({ error: '서버 내부 오류' });
        }
        // 6) 성공 응답: 새로 생성된 Media.id 반환
        return res.status(200).json({ id: result.insertId });
      }
    );
  } catch (error) {
    console.error('uploadVideo 오류:', error);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
};