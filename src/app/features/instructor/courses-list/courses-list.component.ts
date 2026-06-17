import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  private router = inject(Router);

  courses: InstructorCourse[] = [];
  isLoading = true;
  error = false;

  readonly pageSize = 6;
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.courses.length / this.pageSize);
  }

  get pagedCourses(): InstructorCourse[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.courses.slice(start, start + this.pageSize);
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  loadPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    const el = document.getElementById('page-top');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  ngOnInit(): void {
    this.coursesService
      .getMyCourses()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (data) => {
          this.courses = data;
          this.currentPage = 1;
        },
        error: () => {
          this.error = true;
        },
      });
  }

  editCourse(id: string) {
    this.router.navigate(['/course-builder', id]);
  }
}
