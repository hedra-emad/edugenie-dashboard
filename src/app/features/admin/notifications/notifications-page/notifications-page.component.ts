import { Component, ChangeDetectionStrategy, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../../core/services/auth.service';

interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  link?: string;
  roles?: string[]; // Which roles should see this notification
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css'
})
export class NotificationsPageComponent implements OnInit {
  private authService = inject(AuthService);
  
  // All notifications (admin and instructor specific)
  private allNotifications: NotificationItem[] = [
    // Admin-specific notifications
    {
      id: '1',
      type: 'warning',
      title: 'Action Required: Pending Approvals',
      message: 'You have 4 new courses waiting for administrative review.',
      timeAgo: '10 mins ago',
      isRead: false,
      link: '/admin/course-approvals',
      roles: ['admin']
    },
    {
      id: '2',
      type: 'info',
      title: 'New Instructor Registration',
      message: 'Sarah Jenkins has applied to become an instructor on the platform.',
      timeAgo: '1 hour ago',
      isRead: false,
      roles: ['admin']
    },
    {
      id: '7',
      type: 'alert',
      title: 'High Refund Rate Alert',
      message: 'The course "Introduction to React" has exceeded the 5% refund threshold this week.',
      timeAgo: '2 days ago',
      isRead: true,
      roles: ['admin']
    },
    
    // Instructor-specific notifications
    {
      id: '3',
      type: 'success',
      title: 'Course Published Successfully',
      message: 'Your course "Advanced JavaScript Techniques" has been approved and published.',
      timeAgo: '2 hours ago',
      isRead: false,
      link: '/my-courses',
      roles: ['instructor']
    },
    {
      id: '4',
      type: 'info',
      title: 'New Student Enrollment',
      message: '5 new students have enrolled in your "React Fundamentals" course.',
      timeAgo: '1 day ago',
      isRead: false,
      roles: ['instructor']
    },
    {
      id: '5',
      type: 'warning',
      title: 'Course Under Review',
      message: 'Your submitted course "Node.js Masterclass" is currently under administrative review.',
      timeAgo: '3 days ago',
      isRead: true,
      roles: ['instructor']
    },
    
    // General notifications (visible to all users)
    {
      id: '6',
      type: 'info',
      title: 'Platform Update',
      message: 'New features have been added to the course builder. Check them out!',
      timeAgo: 'Yesterday',
      isRead: true,
      roles: ['admin', 'instructor']
    },
    {
      id: '8',
      type: 'success',
      title: 'System Maintenance Completed',
      message: 'Scheduled maintenance was completed successfully. All services are now running normally.',
      timeAgo: '1 week ago',
      isRead: true,
      roles: ['admin', 'instructor']
    }
  ];

  // Computed property to filter notifications based on user role
  notifications = computed(() => {
    const currentUser = this.authService.currentUserSignal();
    if (!currentUser) return [];
    
    const userRole = currentUser.role;
    return this.allNotifications.filter(notification => 
      !notification.roles || notification.roles.includes(userRole)
    );
  });

  get unreadCount(): number {
    return this.notifications().filter(n => !n.isRead).length;
  }

  get currentUserRole(): string {
    return this.authService.currentUserSignal()?.role || '';
  }

  ngOnInit(): void {
    // Component initialization if needed
  }

  markAllAsRead(): void {
    // In a real app, this would call an API
    this.allNotifications = this.allNotifications.map(n => ({ ...n, isRead: true }));
  }

  markAsRead(id: string): void {
    // In a real app, this would call an API
    this.allNotifications = this.allNotifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
  }

  deleteNotification(id: string): void {
    // In a real app, this would call an API
    this.allNotifications = this.allNotifications.filter(n => n.id !== id);
  }

  getIconForType(type: string): string {
    switch (type) {
      case 'warning': return 'pending_actions';
      case 'success': return 'check_circle';
      case 'alert': return 'error';
      default: return 'info';
    }
  }
}
