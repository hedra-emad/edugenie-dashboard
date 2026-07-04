import { Component, ChangeDetectionStrategy, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  NotificationsService,
  AppNotification,
  BackendNotificationType,
} from '../../../core/services/notifications';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { RejectionReasonModalComponent } from '../rejection-reason-modal/rejection-reason-modal.component';
import { PageSkeletonComponent } from '../loading';



export interface UiNotification {
  id: string;
  title: string;
  message: string;
  reason?: string;
  courseId?: string;
  isRead: boolean;
  type: 'approved' | 'rejected' | 'system' | 'warning' | 'info';
  createdAt: string;
  relativeTime: string;
  tooltipDate: string;
  icon: string;
  link: string;
  linkText?: string;
  hasCta: boolean;
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule, MatDialogModule, PageSkeletonComponent],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.css',
})
export class NotificationsPageComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly unreadCount$: Observable<number> = this.notificationsService.unreadCount$;
  readonly loading$: Observable<boolean> = this.notificationsService.loading$;
  readonly loadingMore$: Observable<boolean> = this.notificationsService.loadingMore$;
  readonly error$: Observable<string | null> = this.notificationsService.error$;
  readonly hasNextPage$: Observable<boolean> = this.notificationsService.hasNextPage$;

  // Active filter state: limited only to 'all', 'unread', and 'read'
  private readonly filterSubject = new BehaviorSubject<'all' | 'unread' | 'read'>('all');
  readonly activeFilter$ = this.filterSubject.asObservable();

  // Derived state: filtered and mapped notifications
  readonly filteredNotifications$: Observable<UiNotification[]> = combineLatest([
    this.notificationsService.notifications$,
    this.activeFilter$
  ]).pipe(
    map(([notifications, filter]) => {
      const uiNotifications = notifications.map(n => this.mapToUiNotification(n));
      return uiNotifications.filter(n => {
        if (filter === 'unread') return !n.isRead;
        if (filter === 'read') return n.isRead;
        return true;
      });
    })
  );



  // Touch/swipe variables for mobile left-to-right swipe gesture
  private touchStartX = 0;
  private touchStartY = 0;
  private currentSwipeId: string | null = null;
  private isSwipingHorizontally = false;
  
  // Mouse drag variables for desktop
  private mouseStartX = 0;
  private currentMouseDragId: string | null = null;
  private isMouseDraggingHorizontally = false;
  
  swipeOffset: Record<string, number> = {};
  isDragging: Record<string, boolean> = {};

  ngOnInit(): void {
    this.notificationsService.getNotifications(1, 10);
  }

  retry(): void {
    this.notificationsService.getNotifications(1, 10);
  }

  loadMore(): void {
    this.notificationsService.loadMore();
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  markAsRead(id: string): void {
    this.notificationsService.markAsRead(id);
    this.cdr.markForCheck();
  }

  deleteNotification(id: string): void {
    this.notificationsService.deleteNotification(id);
  }

  deleteAllNotifications(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Clear all notifications',
        message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
        confirmLabel: 'Clear all',
        cancelLabel: 'Cancel'
      }
    }).afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.notificationsService.deleteAllNotifications();
      }
    });
  }

  setFilter(filter: 'all' | 'unread' | 'read'): void {
    this.filterSubject.next(filter);
    // Reset all swipes when filter changes
    this.swipeOffset = {};
    this.isDragging = {};
  }

  openRejectionReasonModal(notification: UiNotification): void {
    if (!notification.reason) return;
    
    // Mark as read when opening rejection reason modal
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }
    
    this.dialog.open(RejectionReasonModalComponent, {
      data: {
        reason: notification.reason,
        mode: 'instructor',
        title: 'Reason of Rejection'
      },
      panelClass: 'rejection-modal-panel'
    });
  }

  markAsReadAndNavigate(id: string): void {
    this.notificationsService.markAsRead(id);
    this.cdr.markForCheck();
  }

  // Dynamic swipe limit: 160px for unread cards (2 buttons), 80px for read cards (1 button)
  getSwipeLimit(notification: UiNotification): number {
    return notification.isRead ? 80 : 160;
  }

  // Touch handlers for mobile left-to-right swipe gesture
  onTouchStart(event: TouchEvent, id: string): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.currentSwipeId = id;
    this.isSwipingHorizontally = false;
  }

  onTouchMove(event: TouchEvent, id: string, notification: UiNotification): void {
    if (this.currentSwipeId !== id) return;

    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const deltaX = currentX - this.touchStartX;
    const deltaY = currentY - this.touchStartY;

    if (!this.isSwipingHorizontally) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        this.isSwipingHorizontally = true;
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        this.currentSwipeId = null;
        return;
      }
    }

    if (this.isSwipingHorizontally) {
      // Only allow swiping from left to right (positive deltaX)
      if (deltaX > 0) {
        event.preventDefault(); // prevent vertical page scroll
        this.isDragging[id] = true;

        let offset = deltaX;
        const limit = this.getSwipeLimit(notification);
        // Elastic resistance after limit
        if (offset > limit) {
          offset = limit + (offset - limit) * 0.3;
        }
        this.swipeOffset[id] = offset;
      } else {
        this.swipeOffset[id] = 0;
      }
    }
  }

  onTouchEnd(event: TouchEvent, id: string, notification: UiNotification): void {
    if (this.currentSwipeId !== id) return;

    this.isDragging[id] = false;
    const currentOffset = this.swipeOffset[id] || 0;
    const limit = this.getSwipeLimit(notification);

    // If swiped right past half threshold, snap to limit, else snap shut (0)
    if (currentOffset > limit / 2) {
      this.swipeOffset[id] = limit;
    } else {
      this.swipeOffset[id] = 0;
    }

    this.currentSwipeId = null;
  }

  // Mouse drag handlers for desktop (Gmail-style)
  onMouseDown(event: MouseEvent, id: string): void {
    // Only handle left mouse button
    if (event.button !== 0) return;
    
    // Don't start drag if clicking on interactive elements
    const target = event.target as HTMLElement;
    if (target.closest('.delete-btn') || target.closest('a') || target.closest('button')) {
      return;
    }
    
    this.mouseStartX = event.clientX;
    this.currentMouseDragId = id;
    this.isMouseDraggingHorizontally = false;
  }

  onMouseMove(event: MouseEvent, id: string, notification: UiNotification): void {
    if (this.currentMouseDragId !== id) return;

    const currentX = event.clientX;
    const deltaX = currentX - this.mouseStartX;

    if (!this.isMouseDraggingHorizontally) {
      // Start horizontal drag if moved more than 5px horizontally
      if (Math.abs(deltaX) > 5) {
        this.isMouseDraggingHorizontally = true;
      }
    }

    if (this.isMouseDraggingHorizontally) {
      // Only allow dragging from left to right (positive deltaX)
      if (deltaX > 0) {
        event.preventDefault();
        this.isDragging[id] = true;

        let offset = deltaX;
        const limit = this.getSwipeLimit(notification);
        // Elastic resistance after limit
        if (offset > limit) {
          offset = limit + (offset - limit) * 0.3;
        }
        this.swipeOffset[id] = offset;
      } else {
        this.swipeOffset[id] = 0;
      }
    }
  }

  onMouseUp(event: MouseEvent, id: string, notification: UiNotification): void {
    if (this.currentMouseDragId !== id) return;

    this.isDragging[id] = false;
    const currentOffset = this.swipeOffset[id] || 0;
    const limit = this.getSwipeLimit(notification);

    // If dragged right past half threshold, snap to limit, else snap shut (0)
    if (currentOffset > limit / 2) {
      this.swipeOffset[id] = limit;
    } else {
      this.swipeOffset[id] = 0;
    }

    this.currentMouseDragId = null;
    this.isMouseDraggingHorizontally = false;
  }

  // Handle mouse leave to reset drag state
  onMouseLeave(id: string): void {
    if (this.currentMouseDragId === id) {
      this.isDragging[id] = false;
      this.currentMouseDragId = null;
      this.isMouseDraggingHorizontally = false;
    }
  }

  getCardTransform(id: string): string {
    const offset = this.swipeOffset[id] || 0;
    return `translateX(${offset}px)`;
  }

  getCardTransition(id: string): string {
    return this.isDragging[id] ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  resetSwipe(id: string): void {
    this.swipeOffset[id] = 0;
    this.isDragging[id] = false;
  }

  // Helper to mark notification as read if not already read
  private ensureMarkedAsRead(notification: UiNotification): void {
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }
  }

  getCursorStyle(id: string): string {
    if (this.isDragging[id]) {
      return 'grabbing';
    }
    return 'grab';
  }

  // Calculate arrow opacity during dragging
  getArrowOpacity(id: string, notification: UiNotification): number {
    const offset = this.swipeOffset[id] || 0;
    if (offset <= 10) return 0;
    const limit = this.getSwipeLimit(notification);
    if (offset >= limit - 20) return 0;

    // Fade in between 10px and 40px, fade out as we approach the limit
    if (offset < 40) {
      return (offset - 10) / 30;
    }
    if (offset > limit - 45) {
      return (limit - 5 - offset) / 40;
    }
    return 1;
  }

  // Calculate actions opacity (boxes appear near the end of sliding)
  getActionsOpacity(id: string, notification: UiNotification): number {
    const offset = this.swipeOffset[id] || 0;
    const limit = this.getSwipeLimit(notification);
    const fadeStart = limit - 60;
    if (offset < fadeStart) return 0;
    if (offset >= limit - 20) return 1;
    return (offset - fadeStart) / 40;
  }

  onCardClick(event: MouseEvent, notification: UiNotification): void {
    const target = event.target as HTMLElement;
    // Don't mark as read on clicking buttons, anchors, or interactive elements
    if (target.closest('.delete-btn') || target.closest('a') || target.closest('button')) {
      return;
    }
    if (!notification.isRead) {
      this.markAsRead(notification.id);
    }
  }

  onCardKeydown(event: KeyboardEvent, notification: UiNotification): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!notification.isRead) {
        this.markAsRead(notification.id);
      }
    }
  }

  // Dedicated Mapper: Payload -> UI View Model
  private mapToUiNotification(n: AppNotification): UiNotification {
    let type: 'approved' | 'rejected' | 'system' | 'warning' | 'info' = 'info';
    let icon = 'info';
    let link = '/notifications';
    let linkText: string | undefined;

    const lowerType = (n.type || '').toLowerCase();
    const lowerTitle = (n.title || '').toLowerCase();

    if (lowerType === 'course_approved' || lowerTitle.includes('approved')) {
      type = 'approved';
      icon = 'check_circle';
      link = n.courseId ? `/course-builder/${n.courseId}/basic` : '/my-courses';
      linkText = 'View Course';
    } else if (lowerType === 'course_rejected' || lowerTitle.includes('rejected')) {
      type = 'rejected';
      icon = 'cancel';
      // Deep link to course-builder/basic if courseId is available
      link = n.courseId ? `/course-builder/${n.courseId}/basic` : '/my-courses';
      linkText = 'View Course';
    } else if (lowerType === 'course_submitted_for_review' || lowerTitle.includes('submitted for review')) {
      type = 'info';
      icon = 'info';
      link = '/admin/course-approvals';
      linkText = 'View Course';
    } else if (lowerType === 'system' || lowerTitle.includes('maintenance') || lowerTitle.includes('system')) {
      type = 'system';
      icon = 'notifications';
      link = '/notifications';
      linkText = undefined;
    } else if (lowerType === 'warning' || lowerTitle.includes('reported') || lowerTitle.includes('warning') || lowerTitle.includes('alert')) {
      type = 'warning';
      icon = 'warning';
      link = '/notifications';
      linkText = 'Review Report';
    } else if (lowerType === 'information' || lowerType === 'info' || lowerTitle.includes('submission') || lowerTitle.includes('new course')) {
      type = 'info';
      icon = 'menu_book';
      link = '/notifications';
      linkText = 'View Course';
    }

    // Reason parsing refactor: separate main text from rejection reason
    let message = n.message || '';
    let reason: string | undefined;
    if (message.includes('Reason: ')) {
      const parts = message.split('Reason: ');
      message = parts[0].trim();
      reason = parts[1].trim();
    }

    return {
      id: n.id,
      title: n.title,
      message,
      reason,
      courseId: n.courseId,
      isRead: n.isRead,
      type,
      createdAt: n.createdAt,
      relativeTime: this.getRelativeTime(n.createdAt),
      tooltipDate: new Date(n.createdAt).toLocaleString(),
      icon,
      link,
      linkText,
      hasCta: !!linkText
    };
  }

  private getRelativeTime(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    if (isNaN(date)) return dateStr;

    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return '2m ago';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';

    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}
