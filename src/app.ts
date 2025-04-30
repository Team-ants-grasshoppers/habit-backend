const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser')
import './strategies/passportStrategies';
import passport from './strategies/passportStrategies';
import jwtStrategy from './strategies/jwtStrategy';
dotenv.config();

const allowedOrigins = [
  process.env.FE_LOCAL,
  process.env.FRONTEND,
  process.env.ADMIN_FRONTEND,
  process.env.BACKEND
];

// 1) 먼저 Preflight만 무조건 통과시키는 핸들러
app.options('*', cors({
  origin: true,
  credentials: true
}));

// 2) 그 다음에 실제 요청(GET/POST…)에 한해 엄격히 검사하는 CORS
app.use(cors({
  origin: (origin: any, callback: any) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('허용되지 않은 Origin:', origin);
    return callback(null, false);            // ★ 에러 던지지 말고, false로 처리
  },
  credentials: true,
  allowedHeaders: ['Content-Type','Authorization'],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(passport.initialize());
passport.use(jwtStrategy);

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is listening on port ${port}`);
});

const authRouter = require("./routes/auth");
const memberRouter = require("./routes/member");
const clubRouter = require("./routes/club");
const imageRouter = require("./routes/image");
const calendarRouter = require("./routes/calendar");
const thunderRouter = require("./routes/thunder");
const videoRouter = require("./routes/video");

app.use("/auth", authRouter);
app.use("/api/members", memberRouter);
app.use("/api/clubs", clubRouter);
app.use("/api/upload-image", imageRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/thunders", thunderRouter);
app.use("/api/media", videoRouter);

export default app;