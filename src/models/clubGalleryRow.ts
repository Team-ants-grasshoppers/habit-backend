import { RowDataPacket } from 'mysql2';

export interface ClubGalleryRow extends RowDataPacket {
  type: string;
  url: string;
  uploaded_at: Date;
  created_by: string;
}
