import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { QuizzesService, QuizDifficulty, QuestionType } from '../../../../core/services/quizzes';
import { BackButtonComponent } from '../../components/shared/back-button/back-button';
import { MainButtonComponent } from '../../../../shared/components/main-button/main-button.component';
import { SubButtonComponent } from '../../../../shared/components/sub-button/sub-button.component';

@Component({
  selector: 'app-quiz-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    BackButtonComponent,
    MainButtonComponent,
    SubButtonComponent,
  ],
  templateUrl: './quiz-config.page.html',
  styleUrl: './quiz-config.page.css',
})
export class QuizConfigPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizzesService = inject(QuizzesService);

  courseId!: string;
  sectionId!: string;

  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';

  readonly difficulties = Object.values(QuizDifficulty);
  readonly questionTypes = Object.values(QuestionType);

  quizForm: FormGroup = this.fb.group({
    difficulty: [QuizDifficulty.MEDIUM, Validators.required],
    numberOfQuestions: [10, [Validators.required, Validators.min(10), Validators.max(20)]],
    questionType: [QuestionType.MIXED, Validators.required],
  });

  ngOnInit() {
    this.courseId = this.route.snapshot.parent?.paramMap.get('courseId')!;
    this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;
  }

  submit() {
    if (this.quizForm.invalid) {
      this.quizForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const dto = {
      sectionId: this.sectionId,
      ...this.quizForm.value,
    };

    this.quizzesService.generateQuizConfig(dto).subscribe({
      next: (res) => {
        this.loading = false;
        this.submitted = true;
        this.successMessage = res.message;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to save quiz configuration.';
      },
    });
  }

  goBack() {
    this.router.navigate(
      ['/course-builder', this.courseId, 'sections', this.sectionId, 'lessons']
    );
  }

  goToSections() {
    this.router.navigate(['/course-builder', this.courseId, 'sections']);
  }
}
