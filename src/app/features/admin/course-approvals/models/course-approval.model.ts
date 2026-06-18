export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Category {
  id: string;
  name: string;
  courseCount: number;
  order: number;
}

export interface CourseApproval {
  id: string;
  title: string;
  category: string;
  instructorName: string;
  instructorAvatar?: string;
  videoDuration: string; // e.g. "24:15", "12:30"
  thumbnail: string; // e.g. placeholder, material icon name, or path
  status: ApprovalStatus;
  exceedsLimit: boolean; // Computed or flags if exceedsallowed limit (e.g. 20 hours)
}
