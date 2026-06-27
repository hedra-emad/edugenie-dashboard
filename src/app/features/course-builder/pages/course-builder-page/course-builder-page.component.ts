import { Component, OnInit, signal, inject, computed, DestroyRef } from '@angular/core';
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
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';

@Component({
  selector: 'app-create-course-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CourseHeaderComponent,
    RouterOutlet,
    AppLoader
  ],
  templateUrl: './course-builder-page.component.html',
  styleUrl: './course-builder-page.component.css'
})
export class CourseBuilderPageComponent implements OnInit {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
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
        if (courseId === this.courseId()) {
          this.courseStatus.set(status);
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

  private updateStep(url: string) {
    if (url.includes('lessons')) {
      this.currentStep.set(3);
    } else if (url.includes('sections')) {
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