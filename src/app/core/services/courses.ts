import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map } from 'rxjs';
import { Course, CreateCoursePayload } from '../models/course.model';
import { CourseStatus } from '../enums/course-status';


@Injectable({ providedIn: 'root' })
export class CoursesService {
  private http = inject(HttpClient);
  private baseUrl = '/courses';

  private courseStatusChangedSource = new Subject<{ courseId: string; status: CourseStatus }>();
  courseStatusChanged$ = this.courseStatusChangedSource.asObservable();

  notifyCourseStatusChanged(courseId: string, status: CourseStatus) {
    this.courseStatusChangedSource.next({ courseId, status });
  }

  createCourse(payload: CreateCoursePayload): Observable<Course> {
    return this.http
      .post<{ success: boolean; data: Course }>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }


  getCourseById(id: string): Observable<Course> {
    return this.http
      .get<{ success: boolean; data: Course }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  getMyCourses(): Observable<Course[]> {
    return this.http
      .get<{ success: boolean; data: Course[] }>(`${this.baseUrl}/my-courses`)
      .pipe(map((res) => res.data));
  }

  findOne(id: string): Observable<Course> {
    return this.http
      .get<{ success: boolean; data: Course }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => res.data));
  }

  updateCourse(id: string, payload: Partial<CreateCoursePayload>) {
    return this.http
      .patch<{ success: boolean; data: Course }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  deleteCourse(id: string) {
    return this.http.delete(
      `${this.baseUrl}/${id}`
    );
  }

  submitForReview(courseId: string): Observable<{ success: boolean; data: Course }> {
    return this.http.patch<{
      success: boolean;
      data: Course;
    }>(
      `${this.baseUrl}/${courseId}/submit-for-review`,
      {}
    );
  }

  /**
   * Check if a course can be submitted for review
   * Returns true if:
   * 1. Course has at least one lesson
   * 2. All sections have approved quizzes
   */
  canSubmitForReview(course: Course): { canSubmit: boolean; missingQuizSections: string[]; hasNoLessons: boolean } {
    if (!course.sections || course.sections.length === 0) {
      return { canSubmit: false, missingQuizSections: [], hasNoLessons: true };
    }

    // Check if course has at least one lesson
    const totalLessons = course.sections.reduce((count, section) => {
      return count + (section.lessons?.length || 0);
    }, 0);

    if (totalLessons === 0) {
      return { canSubmit: false, missingQuizSections: [], hasNoLessons: true };
    }

    // Check if ALL sections have approved quizzes
    const sectionsWithoutQuiz = course.sections.filter(section => {
      return !section.hasApprovedQuiz;
    });

    return {
      canSubmit: sectionsWithoutQuiz.length === 0,
      missingQuizSections: sectionsWithoutQuiz.map(s => s.title),
      hasNoLessons: false
    };
  }

}