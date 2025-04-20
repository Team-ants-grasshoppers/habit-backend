import { RowDataPacket } from 'mysql2';

export interface ClubDetailRow extends RowDataPacket {
  club_id: number;
  name: string;
  description: string;
  category: string;
  region: string;
  imgUrl: string | null;
}
