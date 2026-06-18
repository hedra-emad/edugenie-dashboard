import { Lesson } from "./lesson.model";

export interface Section {
  id: string;
  title: string;
  description: string;
  price: number | null;
  isBasicSection: boolean;
  expectedOutcomes: string[];
  lessons: Lesson[];
  createdAt: string;
  updatedAt: string;
}