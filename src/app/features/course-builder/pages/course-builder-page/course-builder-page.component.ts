import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { CourseBasicInfoComponent } from '../course-basic-info/course-basic-info.component';
import { SectionBuilderComponent } from '../../pages/section-builder/section-builder.component';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-create-course-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CourseHeaderComponent,
    CourseBasicInfoComponent,
    SectionBuilderComponent,
  ],
  templateUrl: './course-builder-page.component.html',
  styleUrl: './course-builder-page.component.css'
})
export class CourseBuilderPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  
  currentStep = signal(1);
  courseId = signal<string | null>(null);

  // course-builder-page.component.ts

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.courseId.set(id);

      // Check if the URL contains 'curriculum' to decide the step
      const isCurriculum = this.router.url.includes('curriculum');
      this.currentStep.set(isCurriculum ? 2 : 1);
    }
  }

  nextStep() {
    this.currentStep.update(s => s + 1);
  }

  previousStep() {
    this.currentStep.update(s => s - 1);
  }

  onCourseCreated(id: string) {
    this.courseId.set(id);
    this.router.navigate(['/course-builder', id, 'curriculum']);
  }
}