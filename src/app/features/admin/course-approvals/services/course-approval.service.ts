import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { CourseApproval, Category, AdminStats } from '../models/course-approval.model';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class CourseApprovalService {
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);

  private readonly coursesApiUrl = 'https://edugenie-api.vercel.app/courses';
  private readonly categoriesApiUrl = 'https://edugenie-api.vercel.app/categories';

  private readonly coursesSubject = new BehaviorSubject<CourseApproval[]>([]);
  readonly courses$ = this.coursesSubject.asObservable();

  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);
  readonly categories$ = this.categoriesSubject.asObservable();

  private readonly statsSubject = new BehaviorSubject<AdminStats | null>(null);
  readonly stats$ = this.statsSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private readonly actionLoadingSubject = new BehaviorSubject<Record<string, boolean>>({});
  readonly actionLoading$ = this.actionLoadingSubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  readonly error$ = this.errorSubject.asObservable();

  // Backward compatibility properties
  private readonly successSubject = new BehaviorSubject<string | null>(null);
  readonly success$ = this.successSubject.asObservable();

  loadData(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Load Pending Courses
    this.http.get<{ success: boolean, data: any[] }>(`${this.coursesApiUrl}/pending-review`, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const mappedCourses = res.data.map(c => this.mapCourseApproval(c));
          this.coursesSubject.next(mappedCourses);
        }
      },
      error: (err) => {
        console.error('Failed to load courses', err);
        this.errorSubject.next('Failed to load pending courses');
      }
    });

    // Load Stats
    this.refreshStats();

    // Load Categories
    this.http.get<{ success: boolean, data: any[] }>(this.categoriesApiUrl, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const mappedCategories = res.data.map(cat => ({
            id: cat._id || cat.id,
            name: cat.name,
            courseCount: cat.courseCount || 0,
            order: cat.order || 0
          })).sort((a, b) => (a.order || 0) - (b.order || 0));
          this.categoriesSubject.next(mappedCategories);
        }
      },
      error: (err) => {
        console.error('Failed to load categories', err);
      },
      complete: () => {
        this.loadingSubject.next(false);
      }
    });
  }

  getCourseById(courseId: string): Observable<any> {
    return this.http.get<{ success: boolean, data: any }>(`${this.coursesApiUrl}/${courseId}`, { withCredentials: true }).pipe(
      map(res => {
        if (res.success && res.data) {
          // Keep raw data since it contains sections & lessons needed for details page
          return res.data;
        }
        throw new Error('Course not found');
      })
    );
  }

  private mapCourseApproval(c: any): CourseApproval {
    const instructor = c.instructor || {};
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

      instructorName: instructor.firstName ? `${instructor.firstName} ${instructor.lastName}` : (instructor.name || 'Unknown Instructor'),
      instructorEmail: instructor.email,
      instructorAvatar: instructor.avatar,

      videoDuration: c.totalHours ? `${c.totalHours}h` : '0h',
      thumbnail: c.thumbnail?.url || c.thumbnail || 'video_library',
      status: c.status || 'pending',
      exceedsLimit: false
    };
  }

  approveCourse(courseId: string): Observable<boolean> {
    this.setActionLoading(courseId, true);
    return this.http.patch<{ success: boolean }>(`${this.coursesApiUrl}/${courseId}/approve`, {}, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success) {
          this.removeCourseFromList(courseId);
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
    return this.http.patch<{ success: boolean }>(`${this.coursesApiUrl}/${courseId}/reject`, { reason }, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.success) {
          this.removeCourseFromList(courseId);
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

  private removeCourseFromList(courseId: string) {
    const updated = this.coursesSubject.value.filter(c => c.id !== courseId);
    this.coursesSubject.next(updated);
  }

  private refreshStats() {
    this.http.get<{ success: boolean, data: AdminStats }>(`${this.coursesApiUrl}/admin/stats`, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.statsSubject.next(res.data);
        }
      }
    });
  }

  private setActionLoading(courseId: string, isLoading: boolean): void {
    const current = { ...this.actionLoadingSubject.value };
    if (isLoading) {
      current[courseId] = true;
    } else {
      delete current[courseId];
    }
    this.actionLoadingSubject.next(current);
  }

  addCategory(name: string): void {
    if (!name.trim()) return;
    this.http.post<{ success: boolean, data: any }>(this.categoriesApiUrl, { name: name.trim() }, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const current = this.categoriesSubject.value;
          const newCategory: Category = {
            id: res.data._id || res.data.id,
            name: res.data.name,
            courseCount: res.data.courseCount || 0,
            order: current.length
          };
          this.categoriesSubject.next([...current, newCategory]);
          this.toastr.success(`Category "${name}" added.`);
        }
      },
      error: (err) => this.toastr.error(err.error?.message || 'Failed to add category')
    });
  }

  updateCategory(id: string, name: string): void {
    if (!name.trim()) return;
    this.http.patch<{ success: boolean, data: any }>(`${this.categoriesApiUrl}/${id}`, { name: name.trim() }, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success) {
          const updated = this.categoriesSubject.value.map(cat => {
            if (cat.id === id) {
              return { ...cat, name: name.trim() };
            }
            return cat;
          });
          this.categoriesSubject.next(updated);
          this.toastr.success('Category renamed successfully.');
        }
      },
      error: (err) => this.toastr.error(err.error?.message || 'Failed to rename category')
    });
  }

  deleteCategory(id: string): void {
    this.http.delete<{ success: boolean }>(`${this.categoriesApiUrl}/${id}`, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success) {
          const category = this.categoriesSubject.value.find(cat => cat.id === id);
          const filtered = this.categoriesSubject.value.filter(cat => cat.id !== id);
          const ordered = filtered.map((cat, idx) => ({ ...cat, order: idx }));
          this.categoriesSubject.next(ordered);
          this.toastr.success(`Category "${category?.name || 'deleted'}" removed.`);
        }
      },
      error: (err) => this.toastr.error(err.error?.message || 'Failed to delete category')
    });
  }

  updateCategoriesList(categories: Category[]): void {
    const ordered = categories.map((cat, index) => ({ ...cat, order: index }));
    this.categoriesSubject.next(ordered);
  }

  clearSuccess(): void {
    this.successSubject.next(null);
  }

  clearError(): void {
    this.errorSubject.next(null);
  }
}
