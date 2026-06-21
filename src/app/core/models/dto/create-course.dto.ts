export interface CreateCourseDto {
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: string;
  categoryId: string;
  courseStatus: string;
  goals?: string[];
  requirements?: string[];
  transcript?: string;
}
