export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'draft' | 'published' | 'archived';

export interface Category {
  _id?: string;
  id: string;
  name: string;
  courseCount?: number;
  order?: number;
  createdAt?: string;
}

export interface UnifiedCourse {
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
  createdAt?: string;
  
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;

  instructorName: string;
  instructorEmail?: string;
  instructorAvatar?: string;

  videoDuration: string;
  thumbnail: string;
  status: ApprovalStatus;
  exceedsLimit: boolean;
}

/** Dedicated model for the rejected-courses endpoint response */
export interface RejectedCourse {
  courseId: string;
  title: string;
  instructorId: string;
  instructorName: string;
  rejectionReason: string;
  rejectedBy: string;
  rejectedAt: string;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AdminStats {
  totalCourses: number;
  underReview: number;
  published: number;
  rejected: number;
  draft: number;
  archived: number;
}

