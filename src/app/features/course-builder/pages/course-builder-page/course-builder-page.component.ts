import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PublishCourseButtonComponent } from '../../components/publish-course-button/publish-course-button';
import { filter } from 'rxjs';
import { CoursesService } from '../../../../core/services/courses';

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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  currentStep = signal(1);
  courseId: string | null = null;
  courseTitle: string | null = null;
  coursesService = inject(CoursesService);


  // course-builder-page.component.ts

  ngOnInit() {
    this.updateStep(this.router.url);

    const match = this.router.url.match(/course-builder\/([^\/]+)/);
    this.courseId = match?.[1] ?? null;
    if (this.courseId) {
      this.coursesService.getCourseById(this.courseId).subscribe(course => {
        this.courseTitle = course.title;
      });
    }

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
}