export interface InstructorAnalyticsResponse {
  stats: {
    totalEarnings: number;
    totalStudents: number;
    pendingPayouts: number;
    nextPayoutDate: string | Date;
  };
  revenueChart: {
    labels: string[];
    data: number[];
  };
  recentSales: {
    student: string;
    course: string;
    date: string | Date;
    amount: number;
    status: 'COMPLETED' | 'REFUNDED';
  }[];
}
