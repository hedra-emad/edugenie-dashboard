import { Section } from "./section.model";

export interface InstructorDetails {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  level: string;
  courseStatus: string;
  goals: string[];
  requirements: string[];
  ratingAverage: number;
  totalEnrollments: number;
  totalLessons: number;
  totalHours: number;
  thumbnailPublicId: string;
  categoryId: string | null;
  totalVideos: number;
  sections: Section[];
  instructor?: any;
  instructorId?: InstructorDetails;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  thumbnail: string;
  thumbnailPublicId?: string;
  level: string;
  categoryId: string;
  goals?: string[];
  requirements?: string[];
}
