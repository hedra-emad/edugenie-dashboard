import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject, Observable, catchError, finalize,
  forkJoin, map, of, tap
} from 'rxjs';
import { CourseApproval, Category, AdminStats } from '../models/course-approval.model';
import { ToastrService } from 'ngx-toastr';

type ApprovalStatus = 'pending' | 'published' | 'rejected' | 'draft' | 'archived';

export interface PendingPage {
  courses: CourseApproval[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class CourseApprovalService {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  private readonly coursesApiUrl = '/courses';
  private readonly adminCoursesApiUrl = '/admin/courses';
  private readonly categoriesApiUrl = '/categories';

  private readonly coursesSubject = new BehaviorSubject<CourseApproval[]>([]);
  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);
  private readonly statsSubject = new BehaviorSubject<AdminStats | null>(null);
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  private readonly actionLoadingSubject = new BehaviorSubject<Record<string, boolean>>({});
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly successSubject = new BehaviorSubject<string | null>(null);

  /** Emits the latest pending-page metadata (total, page, limit) */
  private readonly pendingPageSubject = new BehaviorSubject<Omit<PendingPage, 'courses'>>({
    total: 0, page: 1, limit: 10
  });

  // Store last-used pagination params for refreshPendingSummary
  private lastPendingPage = 1;
  private lastPendingLimit = 10;
  private lastPendingSearch = '';
  private isPendingTabActive = false;

  readonly courses$ = this.coursesSubject.asObservable();
  readonly categories$ = this.categoriesSubject.asObservable();
  readonly stats$ = this.statsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly actionLoading$ = this.actionLoadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly success$ = this.successSubject.asObservable();
  readonly pendingPage$ = this.pendingPageSubject.asObservable();

  // ────────────────────────────────────────────────────────────────────────────
  // Initial load — pending (page 1) + published in parallel
  // ────────────────────────────────────────────────────────────────────────────
  loadData(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const safeFetch = (url: string, forcedStatus?: ApprovalStatus) =>
      this.http.get<any>(url, { withCredentials: true }).pipe(
        map(res => {
          let courses: any[] = [];
          if (Array.isArray(res?.data)) courses = res.data;
          else if (Array.isArray(res?.data?.data)) courses = res.data.data;
          return courses.map(c => this.mapCourseApproval(c, forcedStatus));
        }),
        catchError(() => of([] as CourseApproval[]))
      );

    // Pending uses the paginated endpoint (page 1, limit 10 initially)
    const pendingUrl = `${this.adminCoursesApiUrl}/pending-review?page=1&limit=10`;
    const rejectedUrl = `${this.adminCoursesApiUrl}/rejected?page=1&limit=10`;

    forkJoin({
      pending: this.http.get<any>(pendingUrl, { withCredentials: true }).pipe(
        map(res => {
          // Backend returns { data: [...], meta: { total, page, limit, totalPages } }
          const list = Array.isArray(res?.data) ? res.data
            : Array.isArray(res?.data?.data) ? res.data.data : [];
          const total = res?.meta?.total ?? res?.data?.total ?? res?.total ?? list.length;
          const page  = res?.meta?.page  ?? res?.data?.page  ?? res?.page  ?? 1;
          const limit = res?.meta?.limit ?? res?.data?.limit ?? res?.limit ?? 10;
          this.pendingPageSubject.next({ total, page, limit });
          return list.map((c: any) => this.mapCourseApproval(c, 'pending'));
        }),
        catchError(() => of([] as CourseApproval[]))
      ),
      published: safeFetch(`${this.coursesApiUrl}`, 'published'),
      rejected: safeFetch(rejectedUrl, 'rejected'),
    }).pipe(
      finalize(() => this.loadingSubject.next(false))
    ).subscribe(({ pending, published, rejected }) => {
      const map = new Map<string, CourseApproval>();
      (published as CourseApproval[]).forEach(c => map.set(c.id, c));
      (rejected as CourseApproval[]).forEach(c => map.set(c.id, c));
      (pending as CourseApproval[]).forEach(c => map.set(c.id, c));
      
      const allCourses = Array.from(map.values());
      this.coursesSubject.next(allCourses);
    });

    this.refreshStats();
    this.refreshCategories();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Backend pagination for the Pending tab
  // ────────────────────────────────────────────────────────────────────────────
  loadPendingPage(page: number, limit: number, search = ''): void {
    // Store for later use by refreshPendingSummary
    this.lastPendingPage = page;
    this.lastPendingLimit = limit;
    this.lastPendingSearch = search;
    this.isPendingTabActive = true;

    this.loadingSubject.next(true);

    let url = `${this.adminCoursesApiUrl}/pending-review?page=${page}&limit=${limit}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    this.http.get<any>(url, { withCredentials: true }).pipe(
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: res => {
        // Backend returns { data: [...], meta: { total, page, limit, totalPages } }
        const list = Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.data?.data) ? res.data.data : [];
        const total = res?.meta?.total ?? res?.data?.total ?? res?.total ?? list.length;

        this.pendingPageSubject.next({ total, page, limit });

        // Replace only the 'pending' courses in the master list; keep others intact
        const newPending = list.map((c: any) => this.mapCourseApproval(c, 'pending'));
        const rest = this.coursesSubject.value.filter(c => c.status !== 'pending');
        const map = new Map<string, CourseApproval>();
        rest.forEach(c => map.set(c.id, c));
        newPending.forEach((c: CourseApproval) => map.set(c.id, c));
        this.coursesSubject.next(Array.from(map.values()));
      },
      error: () => { /* Handle error silently */ }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Category CRUD — all return Observable<boolean> so callers can react
  // ────────────────────────────────────────────────────────────────────────────
  addCategory(name: string): Observable<boolean> {
    if (!name.trim()) return of(false);
    const payload: any = { name: name.trim() };
    return this.http
      .post<any>(
        this.categoriesApiUrl, payload, { withCredentials: true }
      )
      .pipe(
        tap(res => {
          const data = res?.data ?? res;
          const current = this.categoriesSubject.value;
          this.categoriesSubject.next([
            ...current,
            {
              id: data?._id || data?.id || '',
              name: data?.name || name.trim(),
              // slug: data?.slug || slug?.trim() || '',
              courseCount: data?.courseCount || 0,
              order: current.length,
              createdAt: data?.createdAt || new Date().toISOString()
            }
          ]);
          this.toastr.success('Category created successfully.');
        }),
        map(() => true),
        catchError(err => {
          this.toastr.error(err.error?.message || 'Something went wrong. Please try again.');
          return of(false);
        })
      );
  }

  updateCategory(id: string, name: string): Observable<boolean> {
    if (!name.trim()) return of(false);
    const payload: any = { name: name.trim() };

    return this.http
      .patch<any>(
        `${this.categoriesApiUrl}/${id}`, payload, { withCredentials: true }
      )
      .pipe(
        tap(res => {
          // Treat any non-error HTTP response as success.
          // Some backends return { message, data } without a top-level `success` field.
          const data = res?.data ?? res;
          const updated = this.categoriesSubject.value.map(cat =>
            cat.id === id
              ? {
                ...cat,
                name: (data?.name) || name.trim(),
                // slug: (data?.slug) || slug?.trim() || cat.slug,
                createdAt: (data?.createdAt) || cat.createdAt
              }
              : cat
          );
          this.categoriesSubject.next(updated);
          this.toastr.success('Category updated successfully.');
        }),
        map(() => true),          // any successful HTTP response → true
        catchError(err => {
          this.toastr.error(err.error?.message || 'Something went wrong. Please try again.');
          return of(false);
        })
      );
  }

  deleteCategory(id: string): Observable<boolean> {
    return this.http
      .delete<any>(
        `${this.categoriesApiUrl}/${id}`, { withCredentials: true }
      )
      .pipe(
        tap(() => {
          // Update local state immediately on any non-error response
          const cat = this.categoriesSubject.value.find(c => c.id === id);
          const ordered = this.categoriesSubject.value
            .filter(c => c.id !== id)
            .map((c, i) => ({ ...c, order: i }));
          this.categoriesSubject.next(ordered);
          this.toastr.success(`Category "${cat?.name || ''}" deleted successfully.`);
        }),
        map(() => true),
        catchError(err => {
          this.toastr.error(err.error?.message || 'Something went wrong. Please try again.');
          return of(false);
        })
      );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Course actions
  // ────────────────────────────────────────────────────────────────────────────
  getCourseById(courseId: string): Observable<any> {
    return this.http
      .get<{ success: boolean; data: any }>(
        `${this.coursesApiUrl}/${courseId}`, { withCredentials: true }
      )
      .pipe(
        map(res => {
          if (res.success && res.data) return res.data;
          throw new Error('Course not found');
        })
      );
  }

  approveCourse(courseId: string): Observable<boolean> {
    this.setActionLoading(courseId, true);
    return this.http
      .patch<any>(
        `${this.adminCoursesApiUrl}/${courseId}/approve`, {}, { withCredentials: true }
      )
      .pipe(
        tap(() => {
          // Any non-error HTTP response means success
          this.updateCourseStatus(courseId, 'published');
          this.refreshStats();
        }),
        map(() => true),
        catchError(err => {
          this.toastr.error(err.error?.message || 'Failed to publish course');
          return of(false);
        }),
        finalize(() => this.setActionLoading(courseId, false))
      );
  }

  rejectCourse(courseId: string, reason: string): Observable<boolean> {
    this.setActionLoading(courseId, true);
    return this.http
      .patch<any>(
        `${this.adminCoursesApiUrl}/${courseId}/reject`, { rejectionReason: reason }, { withCredentials: true }
      )
      .pipe(
        tap(() => {
          // Any non-error HTTP response means success
          this.updateCourseStatus(courseId, 'rejected');
          this.refreshStats();
        }),
        map(() => true),
        catchError(err => {
          this.toastr.error(err.error?.message || 'Failed to reject course');
          return of(false);
        }),
        finalize(() => this.setActionLoading(courseId, false))
      );
  }

  private updateCourseStatus(courseId: string, status: ApprovalStatus): void {
    const updated = this.coursesSubject.value.map(c =>
      c.id === courseId ? { ...c, status } : c
    );
    this.coursesSubject.next(updated);

    // If it's no longer pending, update pending page total so UI badges update immediately
    if (status !== 'pending') {
      const current = this.pendingPageSubject.value;
      if (current.total > 0) {
        this.pendingPageSubject.next({ ...current, total: current.total - 1 });
      }
    }
  }

  refreshStats(): void {
    this.http
      .get<{ success: boolean; data: AdminStats }>(
        `${this.coursesApiUrl}/admin/stats`, { withCredentials: true }
      )
      .subscribe({
        next: res => { if (res.success && res.data) this.statsSubject.next(res.data); }
      });
  }

  refreshCategories(): void {
    this.http
      .get<{ success: boolean; data: any[] }>(this.categoriesApiUrl, { withCredentials: true })
      .subscribe({
        next: res => {
          if (res.success && res.data) {
            const mapped = res.data
              .map(cat => ({
                id: cat._id || cat.id,
                name: cat.name,
                // slug: cat.slug || '',
                courseCount: cat.courseCount || 0,
                order: cat.order || 0,
                createdAt: cat.createdAt || ''
              }))
              .sort((a, b) => (a.order || 0) - (b.order || 0));
            this.categoriesSubject.next(mapped);
          }
        },
        error: () => { /* Handle error silently */ }
      });
  }

  private setActionLoading(courseId: string, isLoading: boolean): void {
    const current = { ...this.actionLoadingSubject.value };
    if (isLoading) { current[courseId] = true; }
    else { delete current[courseId]; }
    this.actionLoadingSubject.next(current);
  }

  public normalizeStatus(course: any, forceStatus?: string): ApprovalStatus {
    if (forceStatus) return forceStatus as ApprovalStatus;

    const cs = course.courseStatus || course.status;
    if (cs === 'rejected' || course.rejectionReason) return 'rejected';
    if (cs === 'published' || cs === 'approved') return 'published';
    if (cs === 'under_review' || cs === 'pending') return 'pending';
    if (cs === 'draft') return 'draft';
    if (cs === 'archived') return 'archived';

    return (cs || 'pending') as ApprovalStatus;
  }

  private mapCourseApproval(c: any, forceStatus?: ApprovalStatus): CourseApproval {
    const instructor = c.instructor || {};
    const status = this.normalizeStatus(c, forceStatus);
    
    return {
      _id: c._id || c.courseId,
      id: c._id || c.id || c.courseId,
      title: c.title,
      description: c.description,
      category: c.category?.name || c.category || 'Uncategorized',
      level: c.level,
      price: c.price,
      totalHours: c.totalHours,
      totalLessons: c.totalLessons,
      sectionsCount: c.totalSections ?? c.sectionsCount ?? c.sections?.length ?? 0,
      goals: c.goals || [],
      requirements: c.requirements || [],
      createdAt: c.createdAt,
      instructorName: c.instructorName || (instructor.firstName
        ? `${instructor.firstName} ${instructor.lastName}`.trim()
        : (instructor.name || 'Unknown Instructor')),
      instructorEmail: instructor.email,
      instructorAvatar: instructor.avatar,
      videoDuration: c.totalHours ? `${c.totalHours}h` : '0h',
      thumbnail: c.thumbnail?.url || c.thumbnail || c.thumbnailUrl || c.coverImage?.url || c.coverImage || c.image?.url || c.image || 'video_library',
      status: status,
      exceedsLimit: false,
      rejectionReason: c.rejectionReason,
      rejectedBy: c.rejectedBy?.firstName 
        ? `${c.rejectedBy.firstName} ${c.rejectedBy.lastName}`.trim()
        : c.rejectedBy?.name || c.rejectedBy || 'Unknown',
      rejectedAt: c.rejectedAt
    };
  }

  // Kept for backwards compatibility (drag-drop reorder)
  updateCategoriesList(categories: Category[]): void {
    this.categoriesSubject.next(categories.map((c, i) => ({ ...c, order: i })));
  }

  /**
   * Refresh stats and conditionally re-fetch pending page if it's currently active.
   * Called when a new course is submitted for review (from NotificationsService via courseSubmittedForReview$).
   */
  refreshPendingSummary(): void {
    // Always refresh stats (cheap operation, updates badge counts)
    this.refreshStats();

    // Only re-fetch pending page if the admin is currently viewing it
    if (this.isPendingTabActive) {
      this.loadPendingPage(this.lastPendingPage, this.lastPendingLimit, this.lastPendingSearch);
    }
  }

  /**
   * Call this when the pending tab becomes inactive (e.g., switching to 'all' or 'rejected').
   */
  setPendingTabInactive(): void {
    this.isPendingTabActive = false;
  }

  clearSuccess(): void { this.successSubject.next(null); }
  clearError(): void { this.errorSubject.next(null); }
}