import { CourseLevel } from "../enums/course-level.enum";
import { CourseStatus } from "../enums/course-status";
export interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailPublicId?: string,
  level: CourseLevel;
  categoryId: string;
  goals: string[];
  requirements: string[];
  sections?: Section[];
  courseStatus: CourseStatus;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  thumbnail: string;
  thumbnailPublicId?: string;
  level: CourseLevel;
  categoryId: string | { _id: string; name?: string; slug?: string };
  goals?: string[];
  requirements?: string[];
}

export type UpdateCoursePayload =
  Partial<CreateCoursePayload>;


export interface Lesson {
  videoDuration: number;
}

export interface Section {
  lessons: Lesson[];
} 