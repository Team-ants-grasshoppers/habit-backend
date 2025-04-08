import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { Strategy as NaverStrategy } from 'passport-naver';
import dotenv from 'dotenv';
const connection = require('../config/database')

dotenv.config();

/**
 * extractEmail: 각 provider별 프로필에서 이메일 정보를 추출합니다.
 * 이메일 정보가 없으면 null을 반환합니다.
 */
const extractEmail = (profile: any): string | null => {
  if (profile.provider === 'google') {
    return profile.emails && profile.emails[0] && profile.emails[0].value ? profile.emails[0].value : null;
  } else if (profile.provider === 'kakao') {
    return profile._json && profile._json.kakao_account && profile._json.kakao_account.email ? profile._json.kakao_account.email : null;
  } else if (profile.provider === 'naver') {
    return profile._json && profile._json.response && profile._json.response.email ? profile._json.response.email : null;
  }
  return null;
};

/**
 * upsertSocialUser:
 * 소셜 프로필 정보를 이용해 Members 및 SocialLogins 테이블에서 사용자를 조회하거나,
 * 신규 등록 후 사용자 정보를 반환합니다.
 * user_id는 provider와 profile.id의 조합, login_type에는 provider 값이 들어갑니다.
 */
const upsertSocialUser = (profile: any, done: Function) => {
  // 반드시 provider와 id가 있어야 함
  if (!profile.provider) {
    return done(new Error('Provider 정보가 없습니다.'), null);
  }
  if (!profile.id) {
    // Naver의 경우 id가 _json.response.id에 있을 수 있음
    if (profile.provider === 'naver' && profile._json && profile._json.response && profile._json.response.id) {
      profile.id = profile._json.response.id;
    } else {
      return done(new Error('Profile id가 제공되지 않았습니다.'), null);
    }
  }
  const provider: string = profile.provider;  
  const userId: string = `${provider}-${profile.id}`;
  const email: string | null = extractEmail(profile); // email은 null 가능 (DB에서 허용)
  const nickname: string = profile.displayName || profile.username || '소셜사용자';
  const snsToken: string = profile.accessToken || '';

  // 디버깅 로그
  console.log(`upsertSocialUser: provider=${provider}, profile.id=${profile.id}, userId=${userId}`);

  const selectSql: string = "SELECT * FROM Members WHERE user_id = ? AND login_type = ?";
  connection.query(selectSql, [userId, provider], (err: any, results: any) => {
    if (err) return done(err);
    if (results.length > 0) {
      const user = results[0];
      const updateSocialSql = "UPDATE SocialLogins SET sns_token = ? WHERE member_id = ? AND provider = ?";
      connection.query(updateSocialSql, [snsToken, user.id, provider], (err: any) => {
        if (err) console.error('SocialLogins 업데이트 오류:', err);
        return done(null, user);
      });
    } else {
      // 닉네임 중복 처리
      const checkNicknameSql = "SELECT COUNT(*) as count FROM Members WHERE nickname = ?";
      connection.query(checkNicknameSql, [nickname], (err: any, results: any) => {
        if (err) return done(err);
        let uniqueNickname: string = nickname;
        if (results[0].count > 0) {
          uniqueNickname = `${nickname}_${Math.floor(Math.random() * 10000)}`;
        }
        const insertMemberSql = "INSERT INTO Members (user_id, nickname, password, email, login_type) VALUES (?, ?, ?, ?, ?)";
        connection.query(insertMemberSql, [userId, uniqueNickname, null, email, provider], (err: any, result: any) => {
          if (err) {
            console.error("Members 삽입 오류:", err);
            return done(err);
          }
          const newMemberId = result.insertId;
          const insertSocialSql = "INSERT INTO SocialLogins (member_id, provider, sns_token) VALUES (?, ?, ?)";
          connection.query(insertSocialSql, [newMemberId, provider, snsToken], (err: any) => {
            if (err) console.error("SocialLogins 삽입 오류:", err);
            connection.query("SELECT * FROM Members WHERE id = ?", [newMemberId], (err: any, results: any) => {
              if (err) return done(err);
              return done(null, results[0]);
            });
          });
        });
      });
    }
  });
};

// --- 구글 전략 ---
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    callbackURL: "/auth/google/callback",
  },
  (accessToken: any, refreshToken: any, profile: any, done: any) => {
    console.log("Google strategy callback - profile:", profile);
    profile.provider = 'google'; // 변경된 부분: provider 명시적으로 설정
    profile.accessToken = accessToken;
    upsertSocialUser(profile, done);
  }
));

// --- 카카오 전략 ---
passport.use(new KakaoStrategy(
  {
    clientID: process.env.KAKAO_CLIENT_ID as string,
    callbackURL: "/auth/kakao/callback",
  },
  (accessToken: any, refreshToken: any, profile: any, done: any) => {
    console.log("Kakao strategy callback - profile:", profile);
    profile.provider = 'kakao'; // 변경된 부분: provider 명시적으로 설정
    profile.accessToken = accessToken;
    upsertSocialUser(profile, done);
  }
));

// --- 네이버 전략 ---
passport.use(new NaverStrategy(
  {
    clientID: process.env.NAVER_CLIENT_ID as string,
    clientSecret: process.env.NAVER_CLIENT_SECRET as string,
    callbackURL: "/auth/naver/callback",
  },
  (accessToken: any, refreshToken: any, profile: any, done: any) => {
    console.log("Naver strategy callback - profile:", profile);
    // 변경된 부분: Naver 전략에서 provider와 id를 강제로 설정
    profile.provider = 'naver';
    // profile.id가 누락될 경우 _json.response.id 사용
    if (!profile.id && profile._json && profile._json.response && profile._json.response.id) {
      profile.id = profile._json.response.id;
    }
    profile.accessToken = accessToken;
    upsertSocialUser(profile, done);
  }
));

export default passport;
