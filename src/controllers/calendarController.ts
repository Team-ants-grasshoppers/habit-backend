import { Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
const connection = require('../config/database')
import dotenv from 'dotenv';
dotenv.config();

// 캘린더 보기
export const viewCalendar = (req: Request, res: Response) => {
  const { club_id, thunder_id } = req.query;
  
  try {
    let sql = `SELECT id AS event_id, title, description, event_date FROM CalendarEvents`;
    let params: any[] = [];
    
    if (club_id && thunder_id) {
      sql += ` WHERE club_id = ? OR thunder_id = ?`;
      params.push(club_id, thunder_id);
    } else if (club_id) {
      sql += ` WHERE club_id = ?`;
      params.push(club_id);
    } else if (thunder_id) {
      sql += ` WHERE thunder_id = ?`;
      params.push(thunder_id);
    } else {
      return res.status(404).json({ error: "등록된 일정이 없습니다" });
    }
    
    connection.query(sql, params, (err: any, results: any) => {
      if (err) {
        console.error("DB 쿼리 에러:", err);
        return res.status(500).json({ error: "서버 오류" });
      }
      
      if (!results || results.length === 0) {
        return res.status(404).json({ error: "등록된 일정이 없습니다" });
      }
      
      return res.status(200).json({ events: results });
    });
    
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
};

// 일정 등록
export const registerCalendar = (req: Request, res: Response) => {
  if (!req.user || typeof req.user === 'string') {
    return res.status(401).json({ message: '인증되지 않은 사용자입니다.' });
  }
  const { user_id } = req.user as JwtPayload;
  if (!user_id) {
    return res.status(404).json({ message: "존재하지 않는 계정입니다." });
  }
  const { club_id, thunder_id, title, description, event_date } = req.body;
  try {
    if (club_id != null) {
      // 해당 클럽의 생성자와 현재 회원이 일치하는지 확인
      const selectClubSql = "SELECT created_by FROM Clubs WHERE id = ?";
      connection.query(selectClubSql, [club_id], (selectErr: any, clubResults: any) => {
        if (selectErr) {
          console.error("Club 조회 에러:", selectErr);
          return res.status(500).json({ error: "서버 오류" });
        }
        if (!clubResults || clubResults.length === 0) {
          return res.status(404).json({ error: "해당 일정을 찾을 수 없습니다" });
        }
        const club = clubResults[0];
        if (club.created_by !== user_id) {
          return res.status(403).json({ error: "등록 권한이 없습니다" });
        }

        // 클럽 일정 INSERT
        const insertSql = `INSERT INTO CalendarEvents (club_id, thunder_id, title, description, event_date, created_by)
                           VALUES (?, ?, ?, ?, ?, ?)`;
        connection.query(
          insertSql,
          [club_id, null, title, description, event_date, user_id],
          (insertErr: any, insertResults: any) => {
            if (insertErr) {
              console.error("일정 등록 INSERT 에러:", insertErr);
              return res.status(500).json({ error: "서버 오류" });
            }
            return res.status(200).json({ message: "일정 등록 성공" });
          }
        );
      });
    } else if (thunder_id != null) {
      // 번개모임 일정 등록: 해당 번개모임의 생성자와 현재 회원이 일치하는지 확인
      const selectThunderSql = "SELECT created_by FROM ThunderMeetings WHERE id = ?";
      connection.query(selectThunderSql, [thunder_id], (selectErr: any, thunderResults: any) => {
        if (selectErr) {
          console.error("ThunderMeeting 조회 에러:", selectErr);
          return res.status(500).json({ error: "서버 오류" });
        }
        if (!thunderResults || thunderResults.length === 0) {
          return res.status(404).json({ error: "해당 일정을 찾을 수 없습니다" });
        }
        const thunder = thunderResults[0];
        if (thunder.created_by !== user_id) {
          return res.status(403).json({ error: "등록 권한이 없습니다" });
        }

        // 번개모임 일정 INSERT
        const insertSql = `INSERT INTO CalendarEvents (club_id, thunder_id, title, description, event_date, created_by)
                           VALUES (?, ?, ?, ?, ?, ?)`;
        connection.query(
          insertSql,
          [null, thunder_id, title, description, event_date, user_id],
          (insertErr: any, insertResults: any) => {
            if (insertErr) {
              console.error("일정 등록 INSERT 에러:", insertErr);
              return res.status(500).json({ error: "서버 오류" });
            }
            return res.status(200).json({ message: "일정 등록 성공" });
          }
        );
      });
    } else {
      // club_id와 thunder_id가 모두 제공되지 않은 경우
      return res.status(404).json({ error: "해당 일정을 찾을 수 없습니다" });
    }
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
};

// 일정 수정
export const modifyCalendar = (req: Request, res: Response) => {
  const { user_id } = req.user as JwtPayload;
  const { event_id } = req.params;
  const { title, description, event_date } = req.body;
  try {
    // 1. 해당 event_id의 일정 조회
    const selectSql = "SELECT created_by FROM CalendarEvents WHERE id = ?";
    connection.query(selectSql, [event_id], (selectErr: any, results: any) => {
      if (selectErr) {
        console.error("DB 조회 에러:", selectErr);
        return res.status(500).json({ error: "서버 오류" });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: "해당 일정을 찾을 수 없습니다" });
      }

      const event = results[0];
      // 2. 수정 권한 체크: 일정 생성자와 현재 회원이 일치하는지 확인
      if (event.created_by !== user_id) {
        return res.status(403).json({ error: "수정 권한이 없습니다" });
      }

      // 3. 일정 수정: title, description, event_date 업데이트
      const updateSql = "UPDATE CalendarEvents SET title = ?, description = ?, event_date = ? WHERE id = ?";
      connection.query(updateSql, [title, description, event_date, event_id], (updateErr: any, updateResults: any) => {
        if (updateErr) {
          console.error("DB 업데이트 에러:", updateErr);
          return res.status(500).json({ error: "서버 오류" });
        }
        return res.status(200).json({ message: "일정 수정 성공" });
      });
    });
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
}

// 일정 삭제
export const deleteCalendar = (req: Request, res: Response) => {
  const { user_id } = req.user as JwtPayload;
  const { event_id } = req.params;

  try {
    const selectSql = "SELECT created_by FROM CalendarEvents WHERE id = ?";
    connection.query(selectSql, [event_id], (selectErr: any, results: any) => {
      if (selectErr) {
        console.error("DB 조회 에러:", selectErr);
        return res.status(500).json({ error: "서버 오류" });
      }
      if (!results || results.length === 0) {
        return res.status(404).json({ error: "해당 일정을 찾을 수 없습니다" });
      }

      const calendarEvent = results[0];
      // 일정 생성자와 현재 사용자가 일치해야 함
      if (calendarEvent.created_by !== user_id) {
        return res.status(403).json({ error: "삭제 권한이 없습니다" });
      }

      const deleteSql = "DELETE FROM CalendarEvents WHERE id = ?";
      connection.query(deleteSql, [event_id], (deleteErr: any, deleteResults: any) => {
        if (deleteErr) {
          console.error("DB 삭제 에러:", deleteErr);
          return res.status(500).json({ error: "서버 오류" });
        }
        return res.status(200).json({ message: "일정 삭제 성공" });
      });
    });
  } catch (error) {
    console.error("예상치 못한 오류:", error);
    return res.status(500).json({ error: "서버 오류" });
  }
}