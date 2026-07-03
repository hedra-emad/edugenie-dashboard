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
  hasQuiz?: boolean; // Set by backend to indicate if section has an approved quiz with questions  
  hasApprovedQuiz?: boolean; // Legacy field - use hasQuiz instead
  createdAt: string;
  updatedAt: string;
}