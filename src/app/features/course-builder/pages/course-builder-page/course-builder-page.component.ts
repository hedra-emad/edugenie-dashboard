import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { CourseHeaderComponent } from '../../components/course-header/course-header.component';
import { CourseBasicInfoComponent } from '../course-basic-info/course-basic-info.component';
import { SectionBuilderComponent } from '../../pages/section-builder/section-builder.component';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';

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

export class CourseBuilderPageComponent {
  private route = inject(ActivatedRoute);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.courseId.set(id);
    }
  }

  currentStep = signal(1);
  courseId = signal<string | null>(null);

  nextStep() {
    this.currentStep.update(s => s + 1);
  }

  previousStep() {
    this.currentStep.update(s => s - 1);
  }

  onCourseCreated(id: string) {
    this.courseId.set(id);
    this.currentStep.set(2);
  }
}
