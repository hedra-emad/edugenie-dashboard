import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    BackButtonComponent,
    MainButtonComponent,
  ],
  templateUrl: './quiz-config.page.html',
  styleUrl: './quiz-config.page.css',
})
export class QuizConfigPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizzesService = inject(QuizzesService);
  private cdr = inject(ChangeDetectorRef);

  courseId!: string;
  sectionId!: string;

  phase: PagePhase = 'form';
  errorMessage = '';
  approveError = '';
  approveLoading = false;

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
  this.courseId = this.route.snapshot.parent?.paramMap.get('courseId')!;
  this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;
  this.loadExistingQuiz();
}

private loadExistingQuiz() {
  this.quizzesService.getQuizForSection(this.sectionId).subscribe({
    next: (quiz) => {
      if (!quiz) {
        this.phase = 'form';
        return;
      }

      if (quiz.status === 'approved') {
        this.phase = 'approved';
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
        this.generatedQuiz = res.quiz;
        this.reviewQuestions = this.toReviewQuestions(res.quiz.questions);
        this.phase = 'review';
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
        this.phase = 'approved';
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
    q.draftOptions = q.draftOptions.map((o, i) => (i === index ? value : o));
    // Update correctAnswers to track the renamed option
    q.draftCorrectAnswers = q.draftCorrectAnswers.map((c) =>
      c === old ? value : c
    );
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