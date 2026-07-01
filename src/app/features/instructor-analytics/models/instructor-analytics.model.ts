export interface InstructorAnalyticsResponse {
  totalEarnings: number;
  earningsChangePercent: number;
  totalStudents: number;
  newStudentsThisWeek: number;
  averageRating: number;
  totalCourses: number;
  pendingPayouts: number;
  nextPayoutDate: string | Date;
}
