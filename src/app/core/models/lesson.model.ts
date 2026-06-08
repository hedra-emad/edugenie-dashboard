export interface Lesson {
  title: string;
  videoFile: string | null;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error' | 'videoTooLong';
  uploadProgress: number;
}