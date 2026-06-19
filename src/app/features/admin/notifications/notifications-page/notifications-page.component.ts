import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  link?: string;
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css'
})
export class NotificationsPageComponent {
  // Placeholder Data
  notifications: NotificationItem[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Action Required: Pending Approvals',
      message: 'You have 4 new courses waiting for administrative review.',
      timeAgo: '10 mins ago',
      isRead: false,
      link: '/admin/course-approvals'
    },
    {
      id: '2',
      type: 'info',
      title: 'New Instructor Registration',
      message: 'Sarah Jenkins has applied to become an instructor on the platform.',
      timeAgo: '1 hour ago',
      isRead: false
    },
    {
      id: '3',
      type: 'success',
      title: 'System Update Completed',
      message: 'The scheduled database maintenance was completed successfully.',
      timeAgo: 'Yesterday',
      isRead: true
    },
    {
      id: '4',
      type: 'alert',
      title: 'High Refund Rate Alert',
      message: 'The course "Introduction to React" has exceeded the 5% refund threshold this week.',
      timeAgo: '2 days ago',
      isRead: true
    }
  ];

  get unreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  markAllAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
  }

  markAsRead(id: string): void {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
  }

  deleteNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
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
