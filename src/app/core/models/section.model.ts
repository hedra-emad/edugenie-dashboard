import { Lesson } from "./lesson.model";

export interface Section {
  id: string;
  courseId: string;
  title: string;
  order: number;
  description?: string;
  isPublished: boolean;
  expectedOutcomes?: string[];
  price?: number | null;
  previewVideoUrl?: string | null;
  previewVideoPublicId?: string | null;
  lessons: Lesson[];
  hasApprovedQuiz?: boolean; // Added to track if section has an approved quiz
  createdAt: string;
  updatedAt: string;
}