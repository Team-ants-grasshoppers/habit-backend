import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import dotenv from 'dotenv';
const connection = require('../config/database')
dotenv.config();

const opts = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    (req) => req && req.cookies ? req.cookies.token : null,
  ]),
  secretOrKey: process.env.PRIVATE_KEY as string,
};

export default new JwtStrategy(opts, (payload, done) => {
  const query = "SELECT id, user_id, nickname, login_type FROM Members WHERE user_id = ?";
  connection.query(query, [payload.user_id], (err: any, results: any) => {
    if (err) return done(err, false);
    if (results.length > 0) return done(null, results[0]);
    return done(null, false);
  });
});