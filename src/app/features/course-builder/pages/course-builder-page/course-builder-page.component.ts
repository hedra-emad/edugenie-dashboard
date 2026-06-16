import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PublishCourseButtonComponent } from '../../components/publish-course-button/publish-course-button';
import { filter } from 'rxjs';
import { CoursesService } from '../../../../core/services/courses';
import { CourseStatus } from '../../../../core/enums/course-status';

@Component({
  selector: 'app-create-course-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CourseHeaderComponent,
    RouterOutlet,
    PublishCourseButtonComponent
  ],
  templateUrl: './course-builder-page.component.html',
  styleUrl: './course-builder-page.component.css'
})
export class CourseBuilderPageComponent implements OnInit {
  private router = inject(Router);
  currentStep = signal(1);
  courseId: string | null = null;
  courseTitle: string | null = null;
  courseStatus: CourseStatus = CourseStatus.DRAFT;
  coursesService = inject(CoursesService);

  ngOnInit() {
    this.updateStep(this.router.url);

    const urlParts = this.router.url.split('/');

    const possibleId = urlParts[2];

    const isRealId =
      possibleId &&
      possibleId !== 'basic' &&
      possibleId !== 'sections' &&
      possibleId !== 'lessons';

    this.courseId = isRealId ? possibleId : null;

    if (!this.courseId || this.courseId === 'null' || this.courseId === 'undefined') {
      console.warn('No valid courseId in URL');
      return;
    }

    this.coursesService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        this.courseTitle = course.title;
        this.courseStatus = this.mapCourseStatus(course.courseStatus);
      },
      error: (err) => {
        console.error('getCourseById failed:', err);
      }
    });

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.updateStep(event.urlAfterRedirects);

        const match = event.urlAfterRedirects.match(/course-builder\/([^\/]+)/);
        this.courseId = match?.[1] ?? null;
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