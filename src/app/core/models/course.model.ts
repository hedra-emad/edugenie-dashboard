import { CourseLevel } from "../enums/course-level.enum";
import { Section } from "./section.model";

export interface Course {
  _id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: CourseLevel;
  categoryId: string;
  courseStatus: 'draft' | 'published';
  goals: string[];
  requirements: string[];
  sections: Section[];
}