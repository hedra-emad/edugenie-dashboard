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
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}