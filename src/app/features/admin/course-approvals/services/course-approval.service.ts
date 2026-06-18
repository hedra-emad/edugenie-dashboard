import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, delay, map, of, tap } from 'rxjs';
import { CourseApproval, Category, ApprovalStatus } from '../models/course-approval.model';

@Injectable({
  providedIn: 'root'
})
export class CourseApprovalService {
  private readonly coursesSubject = new BehaviorSubject<CourseApproval[]>([]);
  readonly courses$ = this.coursesSubject.asObservable();

  private readonly categoriesSubject = new BehaviorSubject<Category[]>([]);
  readonly categories$ = this.categoriesSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  private readonly actionLoadingSubject = new BehaviorSubject<Record<string, boolean>>({});
  readonly actionLoading$ = this.actionLoadingSubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  readonly error$ = this.errorSubject.asObservable();

  private readonly successSubject = new BehaviorSubject<string | null>(null);
  readonly success$ = this.successSubject.asObservable();

  // Mock initial data
  private initialCourses: CourseApproval[] = [
    {
      id: 'course-1',
      title: 'Full-Stack Web Development Bootcamp',
      category: 'Development',
      instructorName: 'Dr. Angela Yu',
      instructorAvatar: 'avatar.jpg',
      videoDuration: '56:40',
      thumbnail: 'computer',
      status: 'pending',
      exceedsLimit: true
    },
    {
      id: 'course-2',
      title: 'UI/UX Design Masterclass 2026',
      category: 'Design',
      instructorName: 'Sarah Connor',
      videoDuration: '18:25',
      thumbnail: 'palette',
      status: 'pending',
      exceedsLimit: false
    },
    {
      id: 'course-3',
      title: 'Artificial Intelligence & Deep Learning',
      category: 'Development',
      instructorName: 'Prof. Andrew Ng',
      videoDuration: '28:15',
      thumbnail: 'psychology',
      status: 'pending',
      exceedsLimit: true
    },
    {
      id: 'course-4',
      title: 'Digital Marketing Strategy & Ads',
      category: 'Marketing',
      instructorName: 'Ryan Deiss',
      videoDuration: '08:45',
      thumbnail: 'campaign',
      status: 'pending',
      exceedsLimit: false
    },
    {
      id: 'course-5',
      title: 'Financial Analysis & Valuation Modeling',
      category: 'Business',
      instructorName: 'John Doe',
      videoDuration: '14:50',
      thumbnail: 'trending_up',
      status: 'pending',
      exceedsLimit: false
    }
  ];

  private initialCategories: Category[] = [
    { id: 'cat-1', name: 'Development', courseCount: 24, order: 0 },
    { id: 'cat-2', name: 'Design', courseCount: 12, order: 1 },
    { id: 'cat-3', name: 'Business', courseCount: 18, order: 2 },
    { id: 'cat-4', name: 'Marketing', courseCount: 8, order: 3 },
    { id: 'cat-5', name: 'Academics', courseCount: 15, order: 4 }
  ];

  loadData(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    
    // Simulate API fetch delay
    setTimeout(() => {
      // If we already have items in subject (edited in UI), keep them. Otherwise load defaults.
      if (this.coursesSubject.value.length === 0) {
        this.coursesSubject.next([...this.initialCourses]);
      }
      if (this.categoriesSubject.value.length === 0) {
        this.categoriesSubject.next([...this.initialCategories].sort((a, b) => a.order - b.order));
      }
      this.loadingSubject.next(false);
    }, 600);
  }

  approveCourse(courseId: string): Observable<boolean> {
    this.setActionLoading(courseId, true);
    this.successSubject.next(null);
    this.errorSubject.next(null);

    return of(true).pipe(
      delay(1000), // Simulate HTTP latency
      tap(() => {
        const updated = this.coursesSubject.value.map(course => {
          if (course.id === courseId) {
            return { ...course, status: 'approved' as ApprovalStatus };
          }
          return course;
        });
        this.coursesSubject.next(updated);
        this.setActionLoading(courseId, false);
        this.successSubject.next('Course approved successfully!');
      }),
      map(() => true)
    );
  }

  rejectCourse(courseId: string): Observable<boolean> {
    this.setActionLoading(courseId, true);
    this.successSubject.next(null);
    this.errorSubject.next(null);

    return of(true).pipe(
      delay(1000),
      tap(() => {
        const updated = this.coursesSubject.value.map(course => {
          if (course.id === courseId) {
            return { ...course, status: 'rejected' as ApprovalStatus };
          }
          return course;
        });
        this.coursesSubject.next(updated);
        this.setActionLoading(courseId, false);
        this.successSubject.next('Course rejected successfully.');
      }),
      map(() => true)
    );
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

    const current = this.categoriesSubject.value;
    const newId = `cat-${Date.now()}`;
    const newCategory: Category = {
      id: newId,
      name: name.trim(),
      courseCount: 0,
      order: current.length
    };

    this.categoriesSubject.next([...current, newCategory]);
    this.successSubject.next(`Category "${name}" added.`);
  }

  updateCategory(id: string, name: string): void {
    if (!name.trim()) return;

    const updated = this.categoriesSubject.value.map(cat => {
      if (cat.id === id) {
        return { ...cat, name: name.trim() };
      }
      return cat;
    });

    this.categoriesSubject.next(updated);
    this.successSubject.next('Category renamed successfully.');
  }

  deleteCategory(id: string): void {
    const category = this.categoriesSubject.value.find(cat => cat.id === id);
    if (!category) return;

    const filtered = this.categoriesSubject.value.filter(cat => cat.id !== id);
    
    // Re-index order
    const ordered = filtered.map((cat, idx) => ({ ...cat, order: idx }));
    this.categoriesSubject.next(ordered);
    this.successSubject.next(`Category "${category.name}" removed.`);
  }

  updateCategoriesList(categories: Category[]): void {
    // Update local subject
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
