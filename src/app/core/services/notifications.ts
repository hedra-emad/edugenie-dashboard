import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, finalize, catchError, of, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export type BackendNotificationType = 'COURSE_APPROVED' | 'COURSE_REJECTED';

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
export class NotificationsService {
    private readonly http = inject(HttpClient);
    private readonly toastr = inject(ToastrService);
    private readonly base = '/notifications'; // interceptor prepends environment.apiUrl + withCredentials

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

    private currentPage = 1;
    private readonly pageSize = 10;

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