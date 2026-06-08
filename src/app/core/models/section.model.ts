import { Lesson } from "./lesson.model";

export interface Section {
  title: string;
  description: string;
  isBasicSection: boolean;
  expectedOutcomes: string[];
  lessons: Lesson[];
}