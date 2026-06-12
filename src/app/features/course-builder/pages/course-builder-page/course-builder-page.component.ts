import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterOutlet } from '@angular/router';
import { PublishCourseButtonComponent } from '../../components/publish-course-button/publish-course-button';

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


  courseId = signal<string | null>(null);

  // course-builder-page.component.ts

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('courseId');
    if (id) {
      this.courseId.set(id);

      // Check if the URL contains 'curriculum' to decide the step
      const isCurriculum = this.router.url.includes('curriculum');
    }
  }


  onCourseCreated(id: string) {
    this.courseId.set(id);
    this.router.navigate(['/course-builder', id, 'curriculum']);
  }
}