import { CourseLevel } from "../../../core/enums/course-level.enum";
import { Section } from "../../../core/models/section.model";

export interface CourseBuilderModel {
  title: string;
  description: string;
  category: string;
  level: CourseLevel;
  price: number | null;
  thumbnail: string | null;
  goals: string[];
  requirements: string[];
  sections: Section[];
}