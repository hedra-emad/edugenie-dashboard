import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject, Observable, catchError, finalize,
  forkJoin, map, of, tap
} from 'rxjs';
import { UnifiedCourse, Category, AdminStats, RejectedCourse, PageMeta } from '../models/course-approval.model';
import { ToastrService } from 'ngx-toastr';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'draft' | 'published' | 'archived';

export interface PendingPage {
  courses: UnifiedCourse[];
  total:   number;
  page:    number;
  limit:   number;
}

@Injectable({ providedIn: 'root' })
export class CourseApprovalService {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  private readonly coursesApiUrl    = 'https://edugenie-api.vercel.app/courses';
  private readonly adminApiUrl      = 'https://edugenie-api.vercel.app/admin/courses';
  private readonly categoriesApiUrl = 'https://edugenie-api.vercel.app/categories';

  private readonly coursesSubject         = new BehaviorSubject<UnifiedCourse[]>([]);
  private readonly categoriesSubject      = new BehaviorSubject<Category[]>([]);
  private readonly statsSubject           = new BehaviorSubject<AdminStats | null>(null);
  private readonly loadingSubject         = new BehaviorSubject<boolean>(false);
  private readonly actionLoadingSubject   = new BehaviorSubject<Record<string, boolean>>({});
  private readonly errorSubject           = new BehaviorSubject<string | null>(null);
  private readonly successSubject         = new BehaviorSubject<string | null>(null);
  private readonly pendingPageSubject     = new BehaviorSubject<Omit<PendingPage, 'courses'>>({ total: 0, page: 1, limit: 10 });

  private readonly rejectedPageSubject    = new BehaviorSubject<PageMeta>({
    total: 0, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false
  });

  readonly courses$          = this.coursesSubject.asObservable();
  readonly categories$       = this.categoriesSubject.asObservable();
  readonly stats$            = this.statsSubject.asObservable();
  readonly loading$          = this.loadingSubject.asObservable();
  readonly actionLoading$    = this.actionLoadingSubject.asObservable();
  readonly error$            = this.errorSubject.asObservable();
  readonly success$          = this.successSubject.asObservable();
  readonly pendingPage$      = this.pendingPageSubject.asObservable();
  readonly rejectedPage$     = this.rejectedPageSubject.asObservable();

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
        catchError(err => { console.error(`Failed to fetch ${url}`, err); return of([] as UnifiedCourse[]); })
      );

    // Pending uses the paginated endpoint (page 1, limit 10 initially)
    const pendingUrl = `${this.coursesApiUrl}/pending-review?page=1&limit=10`;

    forkJoin({
      pending: this.http.get<any>(pendingUrl, { withCredentials: true }).pipe(
        map(res => {
          // Backend may return { data: [...], total, page, limit } or { data: { data:[...], total } }
          const raw = res?.data;
          const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
          const total = raw?.total ?? res?.total ?? list.length;
          const page = raw?.page ?? res?.page ?? 1;
          const limit = raw?.limit ?? res?.limit ?? 10;
          this.pendingPageSubject.next({ total, page, limit });
          return list.map((c: any) => this.mapCourseApproval(c, 'pending'));
        }),
        catchError(() => of([] as UnifiedCourse[]))
      ),
      published: safeFetch(`${this.coursesApiUrl}`, 'approved'),
      rejected: this.http.get<any>(`${this.adminApiUrl}/rejected?page=1&limit=50`, { withCredentials: true }).pipe(
        map(res => {
          const list = res?.data ?? [];
          return list.map((c: any) => ({
            id: c.courseId,
            title: c.title,
            instructorName: c.instructorName,
            instructorId: c.instructorId,
            status: 'rejected',
            rejectionReason: c.rejectionReason,
            rejectedBy: c.rejectedBy,
            rejectedAt: c.rejectedAt,
            category: 'Uncategorized',
            videoDuration: '0h',
            thumbnail: 'video_library',
            exceedsLimit: false
          } as UnifiedCourse));
        }),
        catchError(() => of([] as UnifiedCourse[]))
      )
    }).pipe(
      finalize(() => this.loadingSubject.next(false))
    ).subscribe(({ pending, published, rejected }) => {
      const map = new Map<string, UnifiedCourse>();
      (published as UnifiedCourse[]).forEach(c => map.set(c.id, c));
      (pending   as UnifiedCourse[]).forEach(c => map.set(c.id, c));
      (rejected  as UnifiedCourse[]).forEach(c => map.set(c.id, c));
      const merged = Array.from(map.values());
      merged.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.rejectedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.rejectedAt || 0).getTime();
        return dateB - dateA;
      });
      this.coursesSubject.next(merged);
    });

    this.refreshStats();
    this.refreshCategories();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Backend pagination for the Pending tab
  // ────────────────────────────────────────────────────────────────────────────
  loadPendingPage(page: number, limit: number, search = ''): void {
    this.loadingSubject.next(true);

    let url = `${this.coursesApiUrl}/pending-review?page=${page}&limit=${limit}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

    this.http.get<any>(url, { withCredentials: true }).pipe(
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: res => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const total = raw?.total ?? res?.total ?? list.length;

        this.pendingPageSubject.next({ total, page, limit });

        // Replace only the 'pending' courses in the master list; keep others intact
        const newPending = list.map((c: any) => this.mapCourseApproval(c, 'pending'));
        const rest = this.coursesSubject.value.filter(c => c.status !== 'pending');
        const map  = new Map<string, UnifiedCourse>();
        rest.forEach(c      => map.set(c.id, c));
        newPending.forEach((c: UnifiedCourse) => map.set(c.id, c));
        this.coursesSubject.next(Array.from(map.values()));
      },
      error: err => console.error('Failed to load pending page', err)
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Backend pagination for the Rejected tab — lazy, only loads when tab is opened
  // GET /admin/courses/rejected?page=X&limit=Y
  // ────────────────────────────────────────────────────────────────────────────
  loadRejectedPage(page: number, limit: number): void {
    this.loadingSubject.next(true);

    const url = `${this.adminApiUrl}/rejected?page=${page}&limit=${limit}`;

    this.http.get<any>(url, { withCredentials: true }).pipe(
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: res => {
        const data = res?.data ?? [];
        const meta: PageMeta = res?.meta ?? {
          total: data.length, page, limit,
          totalPages: Math.ceil(data.length / limit),
          hasNextPage: false, hasPrevPage: false
        };
        
        const mappedRejected = data.map((c: any) => ({
          id: c.courseId,
          title: c.title,
          instructorName: c.instructorName,
          instructorId: c.instructorId,
          status: 'rejected',
          rejectionReason: c.rejectionReason,
          rejectedBy: c.rejectedBy,
          rejectedAt: c.rejectedAt,
          category: 'Uncategorized',
          videoDuration: '0h',
          thumbnail: 'video_library',
          exceedsLimit: false
        } as UnifiedCourse));

        this.rejectedPageSubject.next(meta);
        
        // Merge into courses map
        const map = new Map<string, UnifiedCourse>();
        this.coursesSubject.value.filter(c => c.status !== 'rejected').forEach(c => map.set(c.id, c));
        mappedRejected.forEach((c: UnifiedCourse) => map.set(c.id, c));
        const merged = Array.from(map.values());
        merged.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.rejectedAt || 0).getTime();
          const dateB = new Date(b.createdAt || b.rejectedAt || 0).getTime();
          return dateB - dateA;
        });
        this.coursesSubject.next(merged);
      },
      error: err => console.error('Failed to load rejected courses', err)
    });
  }
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
      .patch<{ success: boolean }>(
        `${this.coursesApiUrl}/${courseId}/approve`, {}, { withCredentials: true }
      )
      .pipe(
        tap(res => {
          if (res.success) {
            this.updateCourseStatus(courseId, 'approved');
            this.toastr.success('Course approved successfully');
            this.refreshStats();
          }
        }),
        map(res => res.success),
        catchError(err => {
          this.toastr.error(err.error?.message || 'Failed to approve course');
          return of(false);
        }),
        finalize(() => this.setActionLoading(courseId, false))
      );
  }

  rejectCourse(courseId: string, reason: string): Observable<boolean> {
    this.setActionLoading(courseId, true);
    return this.http
      .patch<{ success: boolean }>(
        `${this.coursesApiUrl}/${courseId}/reject`, { rejectionReason: reason }, { withCredentials: true }
      )
      .pipe(
        tap(res => {
          if (res.success) {
            this.updateCourseStatus(courseId, 'rejected');
            this.toastr.success('Course rejected successfully');
            this.refreshStats();
          }
        }),
        map(res => res.success),
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
        error: err => console.error('Failed to load categories', err)
      });
  }

  private setActionLoading(courseId: string, isLoading: boolean): void {
    const current = { ...this.actionLoadingSubject.value };
    if (isLoading) { current[courseId] = true; }
    else { delete current[courseId]; }
    this.actionLoadingSubject.next(current);
  }

  private mapCourseApproval(c: any, forceStatus?: ApprovalStatus): UnifiedCourse {
    const instructor = c.instructor || {};
    let rawStatus  = c.status || c.courseStatus || 'pending';
    if (rawStatus === 'under_review') rawStatus = 'pending';
    return {
      _id: c._id,
      id: c._id || c.id,
      title: c.title,
      description: c.description,
      category: c.category?.name || c.category || 'Uncategorized',
      level: c.level,
      price: c.price,
      totalHours: c.totalHours,
      totalLessons: c.totalLessons,
      sectionsCount: c.sections?.length || 0,
      goals: c.goals || [],
      requirements: c.requirements || [],
      createdAt: c.createdAt,
      instructorName: instructor.firstName
        ? `${instructor.firstName} ${instructor.lastName}`.trim()
        : (instructor.name || 'Unknown Instructor'),
      instructorEmail: instructor.email,
      instructorAvatar: instructor.avatar,
      videoDuration: c.totalHours ? `${c.totalHours}h` : '0h',
      thumbnail: c.thumbnail?.url || c.thumbnail || 'video_library',
      status: forceStatus ?? rawStatus,
      exceedsLimit: false
    };
  }

  // Kept for backwards compatibility (drag-drop reorder)
  updateCategoriesList(categories: Category[]): void {
    this.categoriesSubject.next(categories.map((c, i) => ({ ...c, order: i })));
  }

  clearSuccess(): void { this.successSubject.next(null); }
  clearError(): void { this.errorSubject.next(null); }
}
