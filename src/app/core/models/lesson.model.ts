export interface Lesson {
  id: string;
  title: string;
  videoUrl?: string;
  videoPublicId?: string;
  videoDuration?: number;
  transcript?: string;
  createdAt: string;
  updatedAt: string;
  
  // Frontend state tracking
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error' | 'videoTooLong';
  uploadProgress?: number;
}