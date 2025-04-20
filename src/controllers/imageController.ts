import { Request, Response } from 'express';
const connection = require('../config/database')
import dotenv from 'dotenv';
dotenv.config();
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (req: Request, res: Response) => {
    try {
        if (!req.user || typeof req.user === 'string') {
            return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
        }
        const { user_id } = req.user as JwtPayload;
        if (!user_id) {
            return res.status(404).json({ message: "존재하지 않는 계정입니다." });
        }

        if (!req.file) {
            return res.status(400).json({ error: "이미지 파일이 업로드되지 않았습니다." });
        }

        const mediaUsageType: string = req.body.media_usage_type;
        const validUsageTypes = ['profile', 'background', 'gallery'];
        if (!mediaUsageType || !validUsageTypes.includes(mediaUsageType)) {
            return res.status(400).json({ error: "유효한 media_usage_type (profile, background, gallery)을 지정해주세요." });
        }

        const storage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GCP_KEY_FILE,
        });
        const bucketName = process.env.GCP_BUCKET as string;
        const bucket = storage.bucket(bucketName);

        const fileName = `${uuidv4()}_${req.file.originalname}`;

        const blob = bucket.file(fileName);
        await new Promise<void>((resolve, reject) => {
            const blobStream = blob.createWriteStream({
                resumable: false,
                metadata: {
                    contentType: req.file!.mimetype,
                },
            });

            blobStream.on('error', (err: any) => {
                console.error("버킷 업로드 에러:", err);
                reject(err);
            });

            blobStream.on('finish', () => {
                resolve();
            });

            blobStream.end(req.file!.buffer);
        });

        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

        connection.query(
            'INSERT INTO Media (url, media_type, media_usage_type, created_by) VALUES (?, ?, ?, ?)',
            [publicUrl, 'image', mediaUsageType, user_id],
            (dbError: any, result: any) => {
                if (dbError) {
                    console.error("DB 저장 에러:", dbError);
                    return res.status(500).json({ error: "서버 내부 오류" });
                }
                // 성공 시 업로드된 이미지의 URL을 클라이언트에 반환
                return res.status(200).json({ id: result.insertId });
            }
        );
    } catch (error) {
        console.error("서버 내부 오류:", error);
        return res.status(500).json({ error: "서버 내부 오류" });
    }
};