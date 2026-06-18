import { CourseLevel } from "../../../core/enums/course-level.enum";
import { CourseStatus } from "../../../core/enums/course-status";
import { Section } from "../../../core/models/section.model";

export interface CourseBuilderModel {
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: CourseLevel;
  categoryId: string;
  goals: string[];
  requirements: string[];
  courseStatus: CourseStatus;
}