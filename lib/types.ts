export type Photo = {
  id: string;
  storage_path: string;
  thumb_path: string | null;
  original_filename: string | null;
  taken_at: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};
