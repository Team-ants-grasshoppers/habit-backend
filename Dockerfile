# Node.js 최신 LTS 버전 사용
FROM node:20-alpine

# 작업 디렉터리 설정
WORKDIR /usr/src/app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 소스코드 전체 복사
COPY . .

# 타입스크립트 빌드
RUN npm run build

# 사용할 포트 설정
EXPOSE 8080

# 앱 실행
CMD ["node", "dist/app.js"]