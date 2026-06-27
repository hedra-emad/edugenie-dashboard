export interface CreateLessonDto {
  title: string;
  description?: string;
  videoUrl?: string;
  videoPublicId?: string;
  duration?: number;
  videoDuration?: number;
  isFree?: boolean;
  transcript?: string;
}
