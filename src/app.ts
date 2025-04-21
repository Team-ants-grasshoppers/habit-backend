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
  process.env.FRONTEND
];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.options('*', cors({ origin: allowedOrigins, allowedHeaders: ['Content-Type','Authorization'], credentials: true }));

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

app.use("/auth", authRouter);
app.use("/api/members", memberRouter);
app.use("/api/clubs", clubRouter);
app.use("/api/upload-image", imageRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/thunders", thunderRouter);

export default app;