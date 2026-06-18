export interface CreateLessonDto {
  title: string;
  description?: string;
  videoUrl?: string;
  videoPublicId?: string;
  duration?: number;
  videoDuration?: number;
  order: number;
  isFree?: boolean;
}
