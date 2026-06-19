export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'draft' | 'published';

export interface Category {
  _id?: string;
  id: string;
  name: string;
  courseCount?: number;
  order?: number;
}

export interface CourseApproval {
  _id?: string;
  id: string;
  title: string;
  description?: string;
  category: string | any;
  level?: string;
  price?: number;
  totalHours?: number;
  totalLessons?: number;
  sectionsCount?: number;
  goals?: string[];
  requirements?: string[];
  createdAt?: string; // Submission Date

  instructorName: string;
  instructorEmail?: string;
  instructorAvatar?: string;

  videoDuration: string; // e.g. "24:15", "12:30"
  thumbnail: string; // e.g. placeholder, material icon name, or path
  status: ApprovalStatus;
  exceedsLimit: boolean; // Computed or flags if exceedsallowed limit (e.g. 20 hours)
}

export interface AdminStats {
  totalCourses: number;
  underReview: number;
  published: number;
  rejected: number;
  draft: number;
}
