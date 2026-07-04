import { Injectable, inject, OnDestroy, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, finalize, catchError, of, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Pusher, { Channel } from 'pusher-js';
import { environment } from '../../../environments/environment';
// import { AuthService } from './auth.service'; // adjust path if needed
import { CoursesService } from './courses';
import { CourseStatus } from '../enums/course-status';

// notifications.ts (frontend)
export type BackendNotificationType =
    | 'COURSE_APPROVED'
    | 'COURSE_REJECTED'
    | 'COURSE_SUBMITTED_FOR_REVIEW'
    | 'NEW_ENROLLMENT'
    | 'NEW_REVIEW'
    | 'LOW_RATING'
    | 'PURCHASE_COMPLETED'
    | 'PAYMENT_FAILED'
    | 'COURSE_COMPLETED'
    | 'CERTIFICATE_EARNED'
    | 'REPORT_RESOLVED'
    | 'EARNING_RECORDED'
    | 'CONTENT_REMOVED'
    | 'INACTIVITY_REMINDER'
    | 'NEW_CONTENT_PUBLISHED'
    | 'GOAL_MILESTONE'
    | 'NEW_LOGIN_ATTEMPT'
    | 'WEEKLY_SUMMARY'
    | 'MONTHLY_SUMMARY'
    | 'MILESTONE_REACHED'
    | 'REMEDIATION_READY'
    | 'QUIZ_GENERATION_AVAILABLE';


export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    isRead: boolean;
    type: BackendNotificationType;
    courseId?: string;
    createdAt: string;
    updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService implements OnDestroy {
    private readonly http = inject(HttpClient);
    private readonly toastr = inject(ToastrService);
    // private readonly authService = inject(AuthService);
    private readonly base = '/notifications';
    private readonly ngZone = inject(NgZone);

    private readonly notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
    private readonly unreadCountSubject = new BehaviorSubject<number>(0);
    private readonly loadingSubject = new BehaviorSubject<boolean>(false);
    private readonly loadingMoreSubject = new BehaviorSubject<boolean>(false);
    private readonly errorSubject = new BehaviorSubject<string | null>(null);
    private readonly hasNextPageSubject = new BehaviorSubject<boolean>(false);

    readonly notifications$ = this.notificationsSubject.asObservable();
    readonly unreadCount$ = this.unreadCountSubject.asObservable();
    readonly loading$ = this.loadingSubject.asObservable();
    readonly loadingMore$ = this.loadingMoreSubject.asObservable();
    readonly error$ = this.errorSubject.asObservable();
    readonly hasNextPage$ = this.hasNextPageSubject.asObservable();

    // Dedicated observables for high-impact real-time events
    private readonly courseSubmittedForReviewSource = new BehaviorSubject<{ courseId: string } | null>(null);
    readonly courseSubmittedForReview$ = this.courseSubmittedForReviewSource.asObservable();

    private readonly courseApprovedSource = new BehaviorSubject<{ courseId: string } | null>(null);
    readonly courseApproved$ = this.courseApprovedSource.asObservable();

    private readonly courseRejectedSource = new BehaviorSubject<{ courseId: string; reason: string } | null>(null);
    readonly courseRejected$ = this.courseRejectedSource.asObservable();

    private readonly newEnrollmentSource = new BehaviorSubject<{ courseId: string } | null>(null);
    readonly newEnrollment$ = this.newEnrollmentSource.asObservable();

    private readonly certificateEarnedSource = new BehaviorSubject<{ courseId: string } | null>(null);
    readonly certificateEarned$ = this.certificateEarnedSource.asObservable();

    private readonly milestoneReachedSource = new BehaviorSubject<{ message: string } | null>(null);
    readonly milestoneReached$ = this.milestoneReachedSource.asObservable();

    private currentPage = 1;
    private readonly pageSize = 10;

    // Pusher
    private pusher: Pusher | null = null;
    private channel: Channel | null = null;
    private connectedUserId: string | null = null;
    private readonly coursesService = inject(CoursesService);

    // ─── Call this once after the user logs in ───────────────────────────────
    connectPusher(userId: string): void {
        console.log(`[PUSHER-CONNECT] Connecting Pusher for user: ${userId}`);
        // Guard: already connected for this exact user — do nothing.
        if (this.pusher && this.channel && this.connectedUserId === userId) {
            console.log(`[PUSHER-CONNECT] Already connected for this user, skipping`);
            return;
        }

        // If switching users (or stale partial state), tear down first.
        this.disconnectPusher();

        this.pusher = new Pusher(environment.pusherKey, {
            cluster: environment.pusherCluster,
        });

        const channelName = `user-${userId}`;
        console.log(`[PUSHER-CONNECT] Subscribing to channel: ${channelName}`);
        this.channel = this.pusher.subscribe(channelName);
        this.connectedUserId = userId;

        this.channel.bind('new-notification', (notification: AppNotification) => {
    this.ngZone.run(() => {
        console.log('[PUSHER-RX] Received notification:', notification);
        this.notificationsSubject.next([
            notification,
            ...this.notificationsSubject.value,
        ]);
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
        this.showToast(notification);

        // Emit dedicated observables for high-impact events
        const type = (notification.type || '').toUpperCase();
        const normalizedCourseId = notification.courseId ? String(notification.courseId).trim() : '';
        
        console.log(`[COURSE-STATUS] Received notification: type=${type}, courseId=${normalizedCourseId}`);
        
        // Course-related events that need UI updates
        if (type === 'COURSE_APPROVED' && normalizedCourseId) {
            this.coursesService.notifyCourseStatusChanged(normalizedCourseId, CourseStatus.PUBLISHED);
            this.courseApprovedSource.next({ courseId: normalizedCourseId });
        } else if (type === 'COURSE_REJECTED' && normalizedCourseId) {
            this.coursesService.notifyCourseStatusChanged(normalizedCourseId, CourseStatus.REJECTED);
            const reason = notification.message || '';
            this.courseRejectedSource.next({ courseId: normalizedCourseId, reason });
        } else if (type === 'COURSE_SUBMITTED_FOR_REVIEW' && normalizedCourseId) {
            this.coursesService.notifyCourseStatusChanged(normalizedCourseId, CourseStatus.UNDER_REVIEW);
            this.courseSubmittedForReviewSource.next({ courseId: normalizedCourseId });
        }
        
        // Enrollment and achievement events
        if (type === 'NEW_ENROLLMENT' && normalizedCourseId) {
            this.newEnrollmentSource.next({ courseId: normalizedCourseId });
        } else if (type === 'CERTIFICATE_EARNED' && normalizedCourseId) {
            this.certificateEarnedSource.next({ courseId: normalizedCourseId });
        } else if (type === 'MILESTONE_REACHED') {
            this.milestoneReachedSource.next({ message: notification.message });
        }
    });
});
    }


    // ─── Call this on logout ─────────────────────────────────────────────────
    disconnectPusher(): void {
        this.channel?.unbind_all();
        this.pusher?.disconnect();
        this.pusher = null;
        this.channel = null;
        this.connectedUserId = null;
    }

    ngOnDestroy(): void {
        this.disconnectPusher();
    }

    // ─── Toast routing by notification type ─────────────────────────────────
    private showToast(notification: AppNotification): void {
        const type = (notification.type || '').toUpperCase();
        const title = notification.title;
        const message = notification.message?.split('Reason:')[0].trim() ?? '';

        // Success toasts (green)
        if (['COURSE_APPROVED', 'PURCHASE_COMPLETED', 'CERTIFICATE_EARNED', 'NEW_ENROLLMENT', 
             'MILESTONE_REACHED', 'EARNING_RECORDED', 'QUIZ_GENERATION_AVAILABLE'].includes(type)) {
            this.toastr.success(message, title);
            return;
        }

        // Error toasts (red)
        if (['COURSE_REJECTED', 'PAYMENT_FAILED', 'LOW_RATING', 'CONTENT_REMOVED'].includes(type)) {
            this.toastr.error(message, title);
            return;
        }

        // Warning toasts (orange)
        if (['INACTIVITY_REMINDER', 'NEW_LOGIN_ATTEMPT'].includes(type)) {
            this.toastr.warning(message, title);
            return;
        }

        // Info toasts (blue) - default for all other types
        this.toastr.info(message, title);
    }

    // ─── Existing HTTP methods (unchanged) ───────────────────────────────────
    getNotifications(page = 1, limit = this.pageSize, append = false): void {
        const loadingFlag = append ? this.loadingMoreSubject : this.loadingSubject;
        loadingFlag.next(true);
        if (!append) this.errorSubject.next(null);

        this.http.get<any>(`${this.base}?page=${page}&limit=${limit}`)
            .pipe(finalize(() => loadingFlag.next(false)))
            .subscribe({
                next: (res) => {
                    const payload = res?.data ?? res;
                    const list: AppNotification[] = payload?.data ?? [];
                    const meta = payload?.meta ?? {};

                    this.currentPage = page;
                    this.hasNextPageSubject.next(Boolean(meta.hasNextPage));
                    this.unreadCountSubject.next(payload?.unreadCount ?? 0);

                    this.notificationsSubject.next(
                        append ? [...this.notificationsSubject.value, ...list] : list
                    );
                },
                error: (err) => this.errorSubject.next(err.error?.message || 'Failed to load notifications'),
            });
    }

    loadMore(): void {
        this.getNotifications(this.currentPage + 1, this.pageSize, true);
    }

    markAsRead(id: string): void {
        this.http.patch<any>(`${this.base}/${id}/read`, {})
            .pipe(
                tap(() => {
                    const wasUnread = this.notificationsSubject.value.find(n => n.id === id && !n.isRead);
                    this.notificationsSubject.next(
                        this.notificationsSubject.value.map(n => n.id === id ? { ...n, isRead: true } : n)
                    );
                    if (wasUnread) this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
                }),
                catchError((err) => { this.toastr.error(err.error?.message || 'Failed to mark as read'); return of(null); })
            ).subscribe();
    }

    markAllAsRead(): void {
        this.http.patch<any>(`${this.base}/mark-all-read`, {})
            .pipe(
                tap(() => {
                    this.notificationsSubject.next(this.notificationsSubject.value.map(n => ({ ...n, isRead: true })));
                    this.unreadCountSubject.next(0);
                    this.toastr.success('All notifications marked as read');
                }),
                catchError((err) => { this.toastr.error(err.error?.message || 'Failed to mark all as read'); return of(null); })
            ).subscribe();
    }

    deleteNotification(id: string): void {
        this.http.delete<any>(`${this.base}/${id}`)
            .pipe(
                tap(() => {
                    const wasUnread = this.notificationsSubject.value.find(n => n.id === id && !n.isRead);
                    this.notificationsSubject.next(this.notificationsSubject.value.filter(n => n.id !== id));
                    if (wasUnread) this.unreadCountSubject.next(Math.max(0, this.unreadCountSubject.value - 1));
                    this.toastr.success('Notification removed');
                }),
                catchError((err) => { this.toastr.error(err.error?.message || 'Failed to delete notification'); return of(null); })
            ).subscribe();
    }

    deleteAllNotifications(): void {
        this.http.delete<any>(this.base)
            .pipe(
                tap(() => {
                    this.notificationsSubject.next([]);
                    this.unreadCountSubject.next(0);
                    this.hasNextPageSubject.next(false);
                    this.toastr.success('All notifications cleared');
                }),
                catchError((err) => { this.toastr.error(err.error?.message || 'Failed to clear notifications'); return of(null); })
            ).subscribe();
    }


    
}