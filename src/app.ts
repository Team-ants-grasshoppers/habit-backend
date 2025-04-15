const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser')
import './strategies/passportStrategies';
import passport from './strategies/passportStrategies';
import jwtStrategy from './strategies/jwtStrategy';
dotenv.config();

const corsOptions = {
  origin: [process.env.FRONTEND, process.env.FE_LOCAL],
  credentials: true,
};
// CORS 미들웨어 (라우터 등록 전에 적용)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 모든 OPTIONS 요청에 대해 CORS 처리

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport 초기화 (세션을 사용하지 않으므로 passport.session()는 사용하지 않음)
app.use(passport.initialize());
// JWT 전략 등록
passport.use(jwtStrategy);

const authRouter = require("./routes/auth");
const memberRouter = require("./routes/member");
const clubRouter = require("./routes/club")
const imageRouter = require("./routes/image")
const calendarRouter = require("./routes/calendar")

app.use("/auth", authRouter);
app.use("/api/members", memberRouter);
app.use("/api/clubs", clubRouter);
app.use("/api/upload-image", imageRouter)
app.use("/api/calendar")

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is listening on port ${port}`);
});

export default app;