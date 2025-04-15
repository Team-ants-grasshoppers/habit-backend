import { Request, Response } from 'express';
const connection = require('../config/database')
import dotenv from 'dotenv';
dotenv.config();
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

export const uploadImage = async (req: Request, res: Response) => {
    try {
        // 1. 파일 존재 여부 확인
        if (!req.file) {
            return res.status(400).json({ error: "이미지 파일이 업로드되지 않았습니다." });
        }

        // 2. media_usage_type 값 검증 (profile, background, gallery 중 하나)
        const mediaUsageType: string = req.body.media_usage_type;
        const validUsageTypes = ['profile', 'background', 'gallery'];
        if (!mediaUsageType || !validUsageTypes.includes(mediaUsageType)) {
            return res.status(400).json({ error: "유효한 media_usage_type (profile, background, gallery)을 지정해주세요." });
        }

        // 3. GCP Storage 클라이언트 생성 및 버킷 객체 획득
        const storage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            keyFilename: process.env.GCP_KEY_FILE,
        });
        const bucketName = process.env.GCP_BUCKET as string;
        const bucket = storage.bucket(bucketName);

        // 4. 고유한 파일명 생성 (UUID와 원본 파일명을 결합)
        const fileName = `${uuidv4()}_${req.file.originalname}`;

        // 5. GCP 버킷에 파일 업로드
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

        // 6. 업로드 후 public URL 생성
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

        // 7. MySQL Media 테이블에 파일 정보 저장 (media_type은 'image'로 고정)
        connection.query(
            'INSERT INTO Media (url, media_type, media_usage_type) VALUES (?, ?, ?)',
            [publicUrl, 'image', mediaUsageType],
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