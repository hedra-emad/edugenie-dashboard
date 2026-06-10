import { CourseLevel } from "../enums/course-level.enum";

export interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: CourseLevel;
  categoryId: string;
  courseStatus: 'draft' | 'published';
}