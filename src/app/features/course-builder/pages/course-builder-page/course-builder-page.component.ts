import { Component, OnInit, signal, inject, computed, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PublishCourseButtonComponent } from '../../components/publish-course-button/publish-course-button';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CoursesService } from '../../../../core/services/courses';
import { CourseStatus } from '../../../../core/enums/course-status';
import { PageSkeletonComponent } from '../../../../shared/components/loading';

@Component({
  selector: 'app-create-course-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CourseHeaderComponent,
    RouterOutlet,
    PageSkeletonComponent,
    PublishCourseButtonComponent
  ],
  templateUrl: './course-builder-page.component.html',
  styleUrl: './course-builder-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseBuilderPageComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  currentStep = signal(1);
  courseId = signal<string | null>(null);
  courseTitle = signal<string | null>(null);
  courseStatus = signal<CourseStatus>(CourseStatus.DRAFT);
  courseDuration = signal<number>(0);
  loadingCourse = signal<boolean>(false);
  courseData = signal<any>(null);

  canPublish = computed(() => !!this.courseId() && this.courseStatus() === CourseStatus.DRAFT);

  coursesService = inject(CoursesService);

  ngOnInit() {
    this.coursesService.courseStatusChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ courseId, status }) => {
        // BUG 2 FIX: Normalize courseId comparison to handle format/type mismatches
        const incoming = String(courseId ?? '').trim();
        const current = String(this.courseId() ?? '').trim();
        
        console.log(`[COURSE-BUILDER] Received status change: incoming=${incoming}, current=${current}, status=${status}`);
        
        if (incoming && current && incoming === current) {
          console.log(`[COURSE-BUILDER] IDs match! Updating course status to ${status}`);
          this.courseStatus.set(status);

          // Update courseData so anything reading course() (e.g. the publish button) updates too
          this.courseData.update(course => {
            if (course) {
              // Create a NEW object reference to ensure Angular detects the change
              const updatedCourse = { 
                ...course, 
                courseStatus: status,
                __lastUpdate: Date.now()
              };
              return updatedCourse;
            }
            return course;
          });
          
          // Trigger change detection for OnPush strategy
          this.cdr.markForCheck();
        } else {
          console.log(`[COURSE-BUILDER] ID mismatch - skipping update`);
        }
      });

    this.updateStep(this.router.url);

    const urlParts = this.router.url.split('/');

    const possibleId = urlParts[2];

    const isRealId =
      possibleId &&
      possibleId !== 'basic' &&
      possibleId !== 'sections' &&
      possibleId !== 'lessons';

    this.courseId.set(isRealId ? possibleId : null);

    const currentId = this.courseId();
    if (!currentId || currentId === 'null' || currentId === 'undefined') {
      // console.warn('No valid courseId in URL');
    } else {
      this.fetchCourseData();
    }

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateStep(event.urlAfterRedirects);

        const match = event.urlAfterRedirects.match(/course-builder\/([^\/]+)/);
        const possibleId = match?.[1] ?? null;

        const isRealId =
          possibleId &&
          possibleId !== 'basic' &&
          possibleId !== 'sections' &&
          possibleId !== 'lessons' &&
          possibleId !== 'null' &&
          possibleId !== 'undefined';

        this.courseId.set(isRealId ? possibleId : null);

        if (this.courseId()) {
          this.fetchCourseData();
        }
      });
  }

  public refreshCourseData() {
  this.fetchCourseData();
}

  private fetchCourseData() {
    const id = this.courseId();
    if (!id) return;
    this.loadingCourse.set(true);

    this.coursesService.getCourseById(id).subscribe({
      next: (course) => {
        this.courseData.set(course);
        this.courseTitle.set(course.title);
        this.courseStatus.set(this.mapCourseStatus(course.courseStatus));

        const totalSeconds = (course.sections || []).reduce((sectionTotal: number, section: any) => {
          return sectionTotal + (section.lessons || []).reduce((lessonTotal: number, lesson: any) => {
            return lessonTotal + (lesson.videoDuration || 0);
          }, 0);
        }, 0);

        this.courseDuration.set(totalSeconds);
        this.loadingCourse.set(false);
      },
      error: (err) => {
        console.error('getCourseById failed:', err);
        this.loadingCourse.set(false);
      }
    });
  }

  onCourseCreated(id: string) {
    this.router.navigate(['/course-builder', id, 'sections']);
  }

  navigateToStep(step: number) {
    if (step === 1) {
      this.router.navigate(['/course-builder', this.courseId() || '']);
    } else if (step === 2) {
      this.router.navigate(['/course-builder', this.courseId() || '', 'sections']);
    }
  }

  private updateStep(url: string) {
    // Reduced to 2 steps: 1 = course-basic-info, 2 = sections-builder (includes lessons & quizzes)
    if (url.includes('sections') || url.includes('lessons') || url.includes('quiz-config')) {
      this.currentStep.set(2);
    } else {
      this.currentStep.set(1);
    }
  }

  private mapCourseStatus(status: string): CourseStatus {
    const normalized = (status || '').toLowerCase().replace(/-/g, '_');
    switch (normalized) {
      case 'under_review':
        return CourseStatus.UNDER_REVIEW;
      case 'rejected':
        return CourseStatus.REJECTED;
      case 'published':
        return CourseStatus.PUBLISHED;
      case 'archived':
        return CourseStatus.ARCHIVED;
      default:
        return CourseStatus.DRAFT;
    }
  }
}