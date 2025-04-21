import { RowDataPacket } from 'mysql2';

export interface ThunderMeetingRow extends RowDataPacket {
  thunder_id: number;
  title: string;
  category: string;
  region: string;
  datetime: string;
  imgUrl: string | null;
}
