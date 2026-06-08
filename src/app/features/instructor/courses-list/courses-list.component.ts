import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { InstructorCoursesService } from '../services/instructor-courses.service';
import { InstructorCourse } from '../models/instructor-course.model';

// Angular Material
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-courses-list',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './courses-list.component.html',
  styleUrls: ['./courses-list.component.css'],
})
export class CoursesListComponent implements OnInit {
  private coursesService = inject(InstructorCoursesService);

  courses: InstructorCourse[] = [];
  isLoading = true;
  error = false;

  ngOnInit(): void {
    this.coursesService
      .getMyCourses()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.courses = data;
        },
        error: () => {
          this.error = true;
        },
      });
  }
}

