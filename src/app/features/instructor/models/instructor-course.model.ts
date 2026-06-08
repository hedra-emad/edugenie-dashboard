export interface InstructorCourse {
  _id: string;
  title: string;
  description: string;
  price: number;
  thumbnail: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  courseStatus: 'draft' | 'published';
  totalEnrollments: number;
  totalLessons: number;
  totalHours: number;
  createdAt: string;
  updatedAt: string;
}
