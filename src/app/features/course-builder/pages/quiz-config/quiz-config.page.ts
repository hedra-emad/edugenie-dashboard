import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import {
  QuizzesService,
  QuizDifficulty,
  QuestionType,
  GeneratedQuiz,
  QuizQuestionDetail,
  EditedQuestion,
} from '../../../../core/services/quizzes';
import { BackButtonComponent } from '../../components/shared/back-button/back-button';
import { MainButtonComponent } from '../../../../shared/components/main-button/main-button.component';
import {QuizGenerationStatus} from '../../../../core/services/quizzes'
import { ChangeDetectorRef } from '@angular/core';
import { PublishCourseButtonComponent } from '../../components/publish-course-button/publish-course-button';
import { CoursesService } from '../../../../core/services/courses';
import { Course } from '../../../../core/models/course.model';

type PagePhase = 'form' | 'generating' | 'review' | 'approved';

interface ReviewQuestion extends QuizQuestionDetail {
  editing: boolean;
  draftOptions: string[];
  draftCorrectAnswers: string[];
  editError: string;
  wasEdited: boolean; // ← add this
}

@Component({
  selector: 'app-quiz-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    BackButtonComponent,
    MainButtonComponent,
    PublishCourseButtonComponent,
  ],
  templateUrl: './quiz-config.page.html',
  styleUrl: './quiz-config.page.css',
})
export class QuizConfigPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizzesService = inject(QuizzesService);
  private coursesService = inject(CoursesService);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);

  courseId!: string;
  sectionId!: string;
  course: Course | null = null; // Store course for publish button

  phase: PagePhase = 'form';
  errorMessage = '';
  approveError = '';
  approveLoading = false;
  isQuizApproved = false; // Track if quiz is already approved

  generatedQuiz: GeneratedQuiz | null = null;
  reviewQuestions: ReviewQuestion[] = [];

  readonly difficulties = Object.values(QuizDifficulty);
  readonly questionTypes = Object.values(QuestionType);

  quizForm: FormGroup = this.fb.group({
    difficulty: [QuizDifficulty.MEDIUM, Validators.required],
    numberOfQuestions: [
      10,
      [Validators.required, Validators.min(10), Validators.max(20)],
    ],
    questionType: [QuestionType.MIXED, Validators.required],
  });

ngOnInit() {
  this.courseId = this.route.snapshot.parent?.paramMap.get('courseId') ?? '';
  this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;
  this.loadCourse();
  this.loadExistingQuiz();
}

private loadCourse() {
  this.coursesService.getCourseById(this.courseId).subscribe({
    next: (course) => {
      this.course = course;
    },
    error: (err) => {
      console.error('Failed to load course', err);
    }
  });
}

private loadExistingQuiz() {
  this.quizzesService.getQuizForSection(this.sectionId).subscribe({
    next: (quiz) => {
      if (!quiz) {
        this.phase = 'form';
        this.isQuizApproved = false;
        return;
      }

      // Track if quiz is approved
      this.isQuizApproved = quiz.status === 'approved';

      // Always show the review phase for approved quizzes (with questions visible)
      // Don't show the separate 'approved' phase anymore
      if (quiz.status === 'approved' && quiz.questions.length) {
        this.generatedQuiz = quiz as unknown as GeneratedQuiz;
        this.generatedQuiz._id = quiz.quizId;
        this.reviewQuestions = this.toReviewQuestions(quiz.questions);
        this.phase = 'review';
        return;
      }

      if (quiz.generationStatus === QuizGenerationStatus.COMPLETED && quiz.questions.length) {
        this.generatedQuiz = quiz as unknown as GeneratedQuiz;
        this.generatedQuiz._id = quiz.quizId;
        this.reviewQuestions = this.toReviewQuestions(quiz.questions);
        this.phase = 'review';
        return;
      }

      // generationStatus is 'pending', 'generating', or 'failed' with no questions
      this.phase = 'form';
      this.isQuizApproved = false;
    },
    error: (err) => {
      // 404 means no section found / no access — just show the form
      console.error('LOAD QUIZ ERROR', err);
      this.phase = 'form';
    },
  });
}

  // ── Form submission → AI generation ───────────────────────────────────────

 submit() {
    if (this.quizForm.invalid) {
      this.quizForm.markAllAsTouched();
      return;
    }
    this.phase = 'generating';
    this.errorMessage = '';

    const dto = { sectionId: this.sectionId, ...this.quizForm.value };

    this.quizzesService.generateQuizConfig(dto).subscribe({
      next: (res) => {
        console.log('QUIZ RESPONSE IN COMPONENT:', res);
        console.log('QUIZ QUESTIONS:', res.quiz?.questions);
        console.log('GENERATION STATUS:', res.quiz?.generationStatus);
        
        this.generatedQuiz = res.quiz;
        
        // If quiz is still generating, poll for completion
        if (res.quiz.generationStatus === QuizGenerationStatus.GENERATING || 
            res.quiz.generationStatus === QuizGenerationStatus.PENDING) {
          console.log('Quiz is still generating, starting polling...');
          setTimeout(() => this.pollForCompletion(), 2000);
          return;
        }
        
        // If completed, show questions
        if (res.quiz.generationStatus === QuizGenerationStatus.COMPLETED && res.quiz.questions?.length) {
          this.reviewQuestions = this.toReviewQuestions(res.quiz.questions || []);
          console.log('REVIEW QUESTIONS:', this.reviewQuestions);
          this.phase = 'review';
          this.cdr.detectChanges();
          return;
        }
        
        // If failed or no questions
        this.errorMessage = 'Failed to generate quiz questions. Please try again.';
        this.phase = 'form';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to generate quiz. Please try again.';
        this.phase = 'form';
        this.cdr.detectChanges();
      },
    });
  }

private pollForCompletion(attempt = 0) {
  const maxAttempts = 30; // ~60s at 2s interval
  this.quizzesService.getQuizForSection(this.sectionId).subscribe({
    next: (quiz) => {
      if (!quiz) {
        this.errorMessage = 'Quiz generation failed. Please try again.';
        this.phase = 'form';
        return;
      }
      if (quiz.generationStatus === QuizGenerationStatus.COMPLETED && quiz.questions.length) {
        this.generatedQuiz = { ...quiz, _id: quiz.quizId } as unknown as GeneratedQuiz;
        this.reviewQuestions = this.toReviewQuestions(quiz.questions);
        this.phase = 'review';
        return;
      }
      if (quiz.generationStatus === 'FAILED') {
        this.errorMessage = 'Quiz generation failed. Please try again.';
        this.phase = 'form';
        return;
      }
      if (attempt >= maxAttempts) {
        this.errorMessage = 'Quiz generation is taking longer than expected. Please refresh shortly.';
        this.phase = 'form';
        return;
      }
      setTimeout(() => this.pollForCompletion(attempt + 1), 2000);
    },
    error: () => {
      this.errorMessage = 'Failed to generate quiz. Please try again.';
      this.phase = 'form';
    },
  });
}

  // ── Approve ────────────────────────────────────────────────────────────────

  approve() {
    if (!this.generatedQuiz) return;
    if (this.hasOpenEdits()) {
      this.approveError =
        'Please save or discard all open edits before approving.';
      return;
    }
    this.approveError = '';
    this.approveLoading = true;

    // Only send editedQuestions if any were actually changed
    const edited = this.buildEditedQuestions();
    const dto = edited.length ? { editedQuestions: edited } : {};

    this.quizzesService.approveQuiz(this.generatedQuiz._id, dto).subscribe({
      next: () => {
        this.approveLoading = false;
        this.isQuizApproved = true; // Mark quiz as approved
        // Show success alert and stay in review phase
        this.toastr.success('Quiz has been approved and published successfully!', 'Success');
        // Stay in review phase - don't change to 'approved'
        // this.phase = 'approved';  // Removed this line
      },
      error: (err) => {
        this.approveLoading = false;
        this.approveError =
          err?.error?.message || 'Failed to approve quiz. Please try again.';
      },
    });
  }

  // ── Regenerate ─────────────────────────────────────────────────────────────

  regenerate() {
    this.generatedQuiz = null;
    this.reviewQuestions = [];
    this.approveError = '';
    this.phase = 'form';
  }

  // ── Inline editing ─────────────────────────────────────────────────────────

  startEdit(q: ReviewQuestion) {
    q.draftOptions = [...q.options.map((o) => o.text)];
    q.draftCorrectAnswers = [...q.correctAnswers];
    q.editError = '';
    q.editing = true;
  }

  cancelEdit(q: ReviewQuestion) {
    q.editing = false;
    q.editError = '';
  }

  saveEdit(q: ReviewQuestion) {
  const options = q.draftOptions.map((o) => o.trim()).filter(Boolean);
  const corrects = q.draftCorrectAnswers.filter((c) => options.includes(c));

  if (options.length < 2) {
    q.editError = 'At least 2 options are required.';
    return;
  }

  if (this.isSingleType(q) && corrects.length > 1) {
  q.editError = 'Single choice questions can only have one correct answer.';
  return;
}

  if (corrects.length === 0) {
    q.editError = 'Select at least one correct answer from the current options.';
    return;
  }

  q.options = options.map((text) => ({ optionId: text, text }));
  q.correctAnswers = corrects;
  q.wasEdited = true; // ← add this
  q.editing = false;
  q.editError = '';
}

  toggleDraftCorrect(q: ReviewQuestion, optionText: string) {
  const isSingle = q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.TRUE_FALSE;

  if (isSingle) {
    // Single-select: clicking an option always makes it the only correct one
    q.draftCorrectAnswers = [optionText];
    return;
  }

  // Multi-select: normal toggle
  const idx = q.draftCorrectAnswers.indexOf(optionText);
  if (idx === -1) {
    q.draftCorrectAnswers = [...q.draftCorrectAnswers, optionText];
  } else {
    q.draftCorrectAnswers = q.draftCorrectAnswers.filter((c) => c !== optionText);
  }
}

toggleCorrect(q: ReviewQuestion, optionText: string) {
  if (this.isSingleType(q)) {
    q.correctAnswers = [optionText];
  } else {
    const idx = q.correctAnswers.indexOf(optionText);

    if (idx === -1) {
      q.correctAnswers = [...q.correctAnswers, optionText];
    } else {
      q.correctAnswers = q.correctAnswers.filter(c => c !== optionText);
    }
  }

  q.wasEdited = true;
}


isSingleType(q: ReviewQuestion): boolean {
  const t = (q.type || '').toString().toUpperCase();
  return t === 'SINGLE_CHOICE' || t === 'TRUE_FALSE';
}


  updateDraftOption(q: ReviewQuestion, index: number, value: string) {
    // If the old text was a correct answer, keep the mapping
    const old = q.draftOptions[index];
    
    // Update the array element directly instead of creating a new array
    q.draftOptions[index] = value;
    
    // Update correctAnswers to track the renamed option
    const correctIndex = q.draftCorrectAnswers.indexOf(old);
    if (correctIndex !== -1) {
      q.draftCorrectAnswers[correctIndex] = value;
    }
  }

  // Handle option text changes from ngModel
  onOptionTextChange(q: ReviewQuestion, index: number, newValue: string) {
    // ngModel has already updated q.draftOptions[index]
    // We need to look through correctAnswers and update any that match the old values
    // This is tricky because we don't have the old value anymore
    // Better approach: just don't do anything here, handle it in saveEdit
  }

  // Track by index to prevent re-rendering
  trackByIndex(index: number): number {
    return index;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goBack() {
    this.router.navigate([
      '/course-builder',
      this.courseId,
      'sections',
      this.sectionId,
      'lessons',
    ]);
  }

  goToSections() {
    this.router.navigate(['/course-builder', this.courseId, 'sections']);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  isCorrect(q: ReviewQuestion, optionText: string): boolean {
    return q.correctAnswers.includes(optionText);
  }

  isDraftCorrect(q: ReviewQuestion, optionText: string): boolean {
    return q.draftCorrectAnswers.includes(optionText);
  }

  private toReviewQuestions(
  questions: QuizQuestionDetail[]
): ReviewQuestion[] {

  return questions.map((q) => {

    let correctAnswers = [...(q.correctAnswers ?? [])];

    // Single Choice & True/False must only have one answer
    if (
      q.type === QuestionType.SINGLE_CHOICE ||
      q.type === QuestionType.TRUE_FALSE
    ) {
      correctAnswers = correctAnswers.slice(0, 1);
    }

    return {
      ...q,
      correctAnswers,
      editing: false,
      draftOptions: [],
      draftCorrectAnswers: [],
      editError: '',
      wasEdited: false,
    };
  });
}

  private hasOpenEdits(): boolean {
    return this.reviewQuestions.some((q) => q.editing);
  }

  private buildEditedQuestions(): EditedQuestion[] {
  return this.reviewQuestions
    .filter((q) => q.wasEdited) // track this flag in saveEdit()
    .map((q) => ({
      questionId: q.questionId,
      questionText: q.text,
      type: q.type,
      options: q.options.map((o) => o.text),
      correctAnswers: q.correctAnswers,
    }));
}
}