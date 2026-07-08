import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectorRef,
  NgZone,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of, Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
import {
  QuizzesService,
  QuizDifficulty,
  QuestionType,
  GeneratedQuiz,
  QuizQuestionDetail,
  EditedQuestion,
  QuizListItem,
  AllQuizzesResponse,
  QuizGenerationStatus,
  EnrollmentStatusResponse,
  ApproveQuizDto,
  MAX_QUESTIONS_PER_QUIZ,
  MIN_QUESTIONS_PER_QUIZ,
  QuizStats, // ← NEW
  computeQuizStats,
  CreateQuizDto, // ← NEW
} from '../../../../core/services/quizzes';
import { BackButtonComponent } from '../../components/shared/back-button/back-button';
import { MainButtonComponent } from '../../../../shared/components/main-button/main-button.component';
import { CoursesService } from '../../../../core/services/courses';
import {
  PageSkeletonComponent,
} from '../../../../shared/components/loading';
import { CourseBuilderPageComponent } from '../course-builder-page/course-builder-page.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { QuestionFilterBarComponent, QuestionFilterConfig, QuestionFilterState } from '../../components/shared/question-filter-bar/question-filter-bar.component';

type PagePhase = 'loading' | 'list' | 'mode-select' | 'form' | 'generating' | 'review';

interface DraftOption {
  text: string;
  isCorrect: boolean;
}

interface ReviewQuestion extends QuizQuestionDetail {
  editing: boolean;
  draftOptions: DraftOption[];
  draftText?: string;
  draftType?: QuestionType;
  editError: string;
  wasEdited: boolean;
  createdAt?: Date;
}

@Component({
  selector: 'app-quiz-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    BackButtonComponent,
    MainButtonComponent,
    PageSkeletonComponent,
    QuestionFilterBarComponent,
  ],
  templateUrl: './quiz-config.page.html',
  styleUrl: './quiz-config.page.css',
})
export class QuizConfigPageComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizzesService = inject(QuizzesService);
  private coursesService = inject(CoursesService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);
  private parent = inject(CourseBuilderPageComponent, { optional: true });

  courseId!: string;
  sectionId!: string;

  // Quiz list
  quizzes: QuizListItem[] = [];
  totalQuizzes = 0;
  readonly MAX_QUIZZES = 5;
  readonly MAX_QUESTIONS_PER_QUIZ = MAX_QUESTIONS_PER_QUIZ;
  readonly MIN_QUESTIONS_PER_QUIZ = MIN_QUESTIONS_PER_QUIZ;
  readonly ENROLLMENT_THRESHOLD = 30;
  isManualMode = false;
  generationIntent: 'replace' | 'append' = 'replace'; // NEW: decides append vs replace on submit()
  selectedQuizId: string | null = null; // For 3-dot menu context in quiz list

  // Enrollment status
  enrollmentStatus: EnrollmentStatusResponse | null = null;
  enrollmentStatusLoading = signal(false);

  // Currently viewing/editing quiz
  viewingQuizId: string | null = null;

  // Regeneration state
  isRegenerating = false;
  previousQuizData: GeneratedQuiz | null = null;
  previousReviewQuestions: ReviewQuestion[] = [];

  // Loading state for initial quiz load
  isLoadingQuiz = false;

  phase: PagePhase = 'loading'; // Start with loading state
  errorMessage = '';
  approveError = '';
  approveLoading = false;
  isQuizApproved = false;
  // isManualMode = false; // true when the instructor chose "Manually" on the mode-select screen

  generatedQuiz: GeneratedQuiz | null = null;
  reviewQuestions: ReviewQuestion[] = [];

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly AUTOSAVE_DEBOUNCE_MS = 1500;
  private hasPendingChanges = false;
  autosaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  readonly difficulties = Object.values(QuizDifficulty);
  readonly questionTypesList = Object.values(QuestionType);

  quizForm: FormGroup = this.fb.group({
    difficulty: [QuizDifficulty.MEDIUM, Validators.required],
    numberOfQuestions: [5, [Validators.required, Validators.min(1), Validators.max(MAX_QUESTIONS_PER_QUIZ)]],
    questionTypes: [[QuestionType.SINGLE_CHOICE], Validators.required],
  });

  // Question Filter Configuration
  questionFilterConfig: QuestionFilterConfig = {
    typeOptions: [
      { value: 'SINGLE_CHOICE', label: 'Single Choice' },
      { value: 'MULTI_CHOICE', label: 'Multiple Choice' },
      { value: 'TRUE_FALSE', label: 'True/False' }
    ],
    sourceOptions: [
      { value: 'AI', label: 'AI Generated' },
      { value: 'INSTRUCTOR', label: 'Instructor' }
    ],
    sortOptions: [
      { value: 'newest', label: 'Newest First' },
      { value: 'oldest', label: 'Oldest First' },
      { value: 'ai_first', label: 'AI First' },
      { value: 'manual_first', label: 'Manual First' }
    ]
  };

  filteredReviewQuestions: ReviewQuestion[] = [];
  currentQuestionFilters: QuestionFilterState = {
    searchTerm: '',
    selectedTypes: [],
    selectedSources: [],
    selectedSort: 'newest'
  };

  get remainingQuestionSlots(): number {
    return Math.max(0, MAX_QUESTIONS_PER_QUIZ - this.reviewQuestions.length);
  }

  getMinQuestions(): number {
    return 1;
  }

  getMaxQuestions(): number {
    return this.isRegenerating ? MAX_QUESTIONS_PER_QUIZ : this.remainingQuestionSlots;
  }

  toggleQuestionType(type: QuestionType) {
    const currentTypes = (this.quizForm.get('questionTypes')?.value as QuestionType[]) || [];
    let newTypes: QuestionType[];
    if (currentTypes.includes(type)) {
      if (currentTypes.length <= 1) {
        this.toastr.warning('At least one question type must be selected.');
        return;
      }
      newTypes = currentTypes.filter((t) => t !== type);
    } else {
      newTypes = [...currentTypes, type];
    }
    this.quizForm.get('questionTypes')?.setValue(newTypes);
    this.quizForm.get('questionTypes')?.updateValueAndValidity();
  }

  isQuestionTypeSelected(type: QuestionType): boolean {
    const currentTypes = (this.quizForm.get('questionTypes')?.value as QuestionType[]) || [];
    return currentTypes.includes(type);
  }

  ngOnInit() {
    this.courseId = this.route.snapshot.parent?.paramMap.get('courseId') ?? '';
    this.sectionId = this.route.snapshot.paramMap.get('sectionId')!;

    console.log('ngOnInit - courseId:', this.courseId, 'sectionId:', this.sectionId);

    // Check if we're viewing a specific quiz
    const quizId = this.route.snapshot.paramMap.get('quizId');
    console.log('ngOnInit - quizId from route:', quizId);

    if (quizId) {
      this.viewingQuizId = quizId;
      console.log('Found quizId in route, will load specific quiz:', quizId);
    }

    // Load all quizzes first
    this.loadCourse();
    this.loadAllQuizzes();
    this.loadEnrollmentStatus();

    // Subscribe to route parameter changes AFTER initial load
    this.route.paramMap.subscribe((params) => {
      const newQuizId = params.get('quizId');
      console.log(
        'Route paramMap changed, quizId:',
        newQuizId,
        'current viewingQuizId:',
        this.viewingQuizId,
      );

      if (newQuizId && newQuizId !== this.viewingQuizId) {
        console.log('New quiz ID detected, loading quiz:', newQuizId);
        this.viewingQuizId = newQuizId;
        // If quizzes are already loaded, load the specific quiz immediately
        if (this.quizzes.length > 0) {
          this.loadSpecificQuiz(newQuizId);
        }
      } else if (!newQuizId && this.viewingQuizId) {
        // No quizId in route - back to list
        console.log('No quizId in route, returning to list');
        this.clearCurrentQuizData();
        this.phase = 'list';
        // Reload quizzes to ensure fresh data
        if (this.quizzes.length === 0) {
          this.loadAllQuizzes(false);
        }
      }
    });
  }

  private loadCourse() {
    this.coursesService.getCourseById(this.courseId).subscribe({
      next: (course) => {
        console.log('📚 Course loaded in quiz-config:', {
          courseId: course.id,
          totalLessons: course.totalLessons,
          sections: course.sections?.map((s) => ({
            id: s.id,
            title: s.title,
            hasQuiz: s.hasQuiz,
            lessons: s.lessons?.length || 0,
          })),
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load course', err);
      },
    });
  }

  private loadAllQuizzes(autoRedirectIfEmpty: boolean = true) {
    this.quizzesService.getAllQuizzesForSection(this.sectionId).subscribe({
      next: (res: AllQuizzesResponse) => {
        this.quizzes = res.quizzes || [];
        this.totalQuizzes = res.totalQuizzes || 0;
        console.log('Loaded quizzes:', this.quizzes, 'Total:', this.totalQuizzes);

        const routeQuizId = this.route.snapshot.paramMap.get('quizId');
        if (routeQuizId) {
          console.log('Route has quizId, loading specific quiz:', routeQuizId);
          this.loadSpecificQuiz(routeQuizId);
          return;
        }

        // Only auto-redirect to mode-select if there are truly no quizzes AND we're told to auto-redirect
        if (this.totalQuizzes === 0 && autoRedirectIfEmpty) {
          console.log('No quizzes found, redirecting to mode-select');
          this.phase = 'mode-select';
        } else {
          console.log('Quizzes found or auto-redirect disabled, showing list phase. Total:', this.totalQuizzes);
          this.phase = 'list';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('LOAD QUIZZES ERROR', err);
        this.quizzes = [];
        this.totalQuizzes = 0;
        const routeQuizId = this.route.snapshot.paramMap.get('quizId');
        if (!routeQuizId && autoRedirectIfEmpty) {
          console.log('Error loading quizzes, redirecting to mode-select');
          this.phase = 'mode-select';
        }
        this.cdr.detectChanges();
      },
    });
  }

  private loadSpecificQuiz(quizId: string) {
    console.log('loadSpecificQuiz called with quizId:', quizId);
    this.viewingQuizId = quizId;

    // Find quiz in the loaded list to get metadata
    const quiz = this.quizzes.find((q) => q.quizId === quizId);
    console.log('Found quiz in list:', quiz);

    if (quiz) {
      // Use the complete quiz data from the list (has all metadata)
      this.generatedQuiz = {
        _id: quiz.quizId,
        sectionId: quiz.sectionId,
        difficulty: quiz.difficulty,
        numberOfQuestions: quiz.numberOfQuestions,
        questionTypes: quiz.questionTypes,
        generationStatus: quiz.generationStatus as any,
        status: quiz.status as any,
        questions: [], // Will be loaded if needed
      } as GeneratedQuiz;

      this.isQuizApproved = quiz.status === 'approved';
      this.inferManualModeFromQuiz(quiz);
      console.log(
        'Quiz status:',
        quiz.status,
        'generationStatus:',
        quiz.generationStatus,
        'isApproved:',
        this.isQuizApproved,
      );

      // Load the questions directly - this should go straight to review phase for completed quizzes
      this.loadQuizQuestions(quiz.quizId);
    } else if (this.quizzes.length === 0) {
      // If quizzes haven't loaded yet, wait a bit and try again
      console.log('Quizzes not loaded yet, waiting...');
      setTimeout(() => {
        if (this.quizzes.length > 0) {
          this.loadSpecificQuiz(quizId);
        } else {
          // Still no quizzes, try loading directly by ID
          this.loadQuizQuestions(quizId);
        }
      }, 500);
    } else {
      console.log('Quiz not found in list');
      this.toastr.error('Quiz not found');
      this.navigateBackToList();
    }
  }

  private loadQuizQuestions(quizId: string) {
    console.log('Calling getQuizById for:', quizId);
    this.isLoadingQuiz = true;

    this.quizzesService.getQuizById(quizId).subscribe({
      next: (quizDetail) => {
        console.log('getQuizById response:', quizDetail);
        this.isLoadingQuiz = false;

        if (quizDetail && quizDetail.questions && quizDetail.questions.length > 0) {
          // Create generatedQuiz from the detail if we don't have it
          if (!this.generatedQuiz) {
            this.generatedQuiz = {
              _id: quizDetail.quizId,
              sectionId: this.sectionId,
              difficulty: quizDetail.difficulty,
              numberOfQuestions: quizDetail.numberOfQuestions,
              questionTypes: quizDetail.questionTypes,
              generationStatus: quizDetail.generationStatus as any,
              status: quizDetail.status as any,
              questions: quizDetail.questions as any,
            } as GeneratedQuiz;
            this.isQuizApproved = quizDetail.status === 'approved';
            this.inferManualModeFromQuiz(quizDetail);
          }

          // Use questions from API
          this.reviewQuestions = this.toReviewQuestions(quizDetail.questions);
          // Initialize filtered questions with the full list
          this.filteredReviewQuestions = [...this.reviewQuestions];
          this.applyQuestionFilters();
          this.generatedQuiz!.questions = quizDetail.questions as any;
          console.log('Setting phase to review with', this.reviewQuestions.length, 'questions');
          this.phase = 'review';
          // Force change detection
          this.cdr.detectChanges();
        } else {
          console.log('No questions found in quiz detail response');
          this.toastr.error('Quiz questions not found');
          this.navigateBackToList();
        }
      },
      error: (err) => {
        console.error('Error loading quiz questions', err);
        this.isLoadingQuiz = false;
        this.toastr.error('Failed to load quiz questions');
        this.navigateBackToList();
      },
    });
  }

  private loadEnrollmentStatus() {
    // Enrollment checks are no longer needed - quiz generation is unrestricted by enrollment count
    // Keeping this method stub for backwards compatibility
  }

  // Get approved quizzes count
  get approvedQuizzesCount(): number {
    return this.quizzes.filter((q) => q.status === 'approved').length;
  }

  // Check if instructor can generate a new quiz (only check quiz count limit)
  get canGenerateNewQuiz(): boolean {
    return this.totalQuizzes < this.MAX_QUIZZES;
  }

  // Get enrollment information for display (removed - no longer needed)
  get enrollmentInfo() {
    return {
      canGenerate: true,
      message: 'Ready to generate quiz',
      showProgress: false,
    };
  }

  // Get the enrollment count from the most recent approved quiz
  get lastApprovalEnrollmentCount(): number {
    const approved = this.approvedQuizzes;
    if (approved.length === 0) return 0;
    // Sort by quizGenerationNumber descending to get the latest
    const sorted = [...approved].sort((a, b) => b.quizGenerationNumber - a.quizGenerationNumber);
    return sorted[0]?.enrollmentCountAtApproval || sorted[0]?.enrollmentCountAtGeneration || 0;
  }

  // Get pending review quizzes
  get pendingQuizzes(): QuizListItem[] {
    return this.quizzes.filter((q) => q.status === 'pending_review');
  }

  // Get approved quizzes
  get approvedQuizzes(): QuizListItem[] {
    return this.quizzes.filter((q) => q.status === 'approved');
  }

  // Open quiz for viewing/editing
  viewQuiz(quiz: QuizListItem) {
    console.log('viewQuiz called with quiz:', quiz.quizId, 'status:', quiz.generationStatus);
    // Navigate to the dedicated quiz route instead of changing phase
    this.router.navigate([
      '/course-builder',
      this.courseId,
      'sections',
      this.sectionId,
      'quiz-config',
      quiz.quizId,
    ]);
  }

  private inferManualModeFromQuiz(quiz: {
    difficulty?: QuizDifficulty | null;
    questionTypes?: QuestionType[];
    questions?: QuizQuestionDetail[];
  }): void {
    if (quiz.difficulty != null) {
      this.isManualMode = false;
      return;
    }
    const questions = quiz.questions ?? [];
    if (questions.length === 0) {
      this.isManualMode = true;
      return;
    }
    this.isManualMode = questions.every((q) => q.createdBy === 'INSTRUCTOR');
  }

  backToList() {
    this.flushPendingAutosave().subscribe(() => {
      const currentQuizId = this.route.snapshot.paramMap.get('quizId');
      if (currentQuizId) {
        this.navigateBackToList();
      } else {
        this.clearCurrentQuizData();
        this.phase = 'list';
        this.loadAllQuizzes(false);
        this.loadEnrollmentStatus();
      }
    });
  }

  // Clears in-memory quiz state. Callers that may have unsaved manual draft edits
  // must run flushPendingAutosave() first — this method only resets local UI state.
  private clearCurrentQuizData() {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    this.autosaveStatus.set('idle');
    this.hasPendingChanges = false;
    this.viewingQuizId = null;
    this.generatedQuiz = null;
    this.reviewQuestions = [];
    this.isRegenerating = false;
    this.previousQuizData = null;
    this.previousReviewQuestions = [];
  }

  // Helper method to navigate back to the quiz list
  private navigateBackToList() {
    console.log('navigateBackToList called');

    // Clear current quiz data first
    this.clearCurrentQuizData();

    // Navigate to quiz list route
    console.log('Navigating to quiz list...');
    this.router
      .navigate(['/course-builder', this.courseId, 'sections', this.sectionId, 'quiz-config'])
      .then((success) => {
        console.log('Navigation success:', success);
        if (success) {
          this.loadAllQuizzes(false);
          this.loadEnrollmentStatus();
          setTimeout(() => {
            this.phase = 'list';
            this.cdr.detectChanges();
          }, 50);
        }
      })
      .catch((error) => {
        console.error('Navigation error:', error);
        // Fallback: just clear data and set phase
        this.phase = 'list';
        this.cdr.detectChanges();
      });
  }

  // Show mode-select screen
  showGenerateForm() {
    this.isManualMode = false;
    this.phase = 'mode-select';
  }

  // User chose "Manually"
  selectManualMode() {
    this.isManualMode = true;
    // Create a stub quiz object so the review template has something to bind to
    this.generatedQuiz = {
      _id: '',
      sectionId: this.sectionId,
      difficulty: null,
      numberOfQuestions: 0,
      questionTypes: [],
      generationStatus: 'COMPLETED' as any,
      status: 'pending_review' as any,
      questions: [],
    } as GeneratedQuiz;
    this.reviewQuestions = [];
    this.isQuizApproved = false;
    this.phase = 'review';
    // Immediately open a blank question card so the instructor can start typing
    this.addNewQuestion();
  }

  // User chose "By AI"
  selectAiMode() {
    if (this.phase !== 'review') {
      this.isManualMode = false;
      this.generationIntent = 'replace';
    } else {
      // Called from within review (manual quiz) — append the AI batch
      this.generationIntent = 'append';
    }

    // Set dynamic validation: min 1, max = remaining slots (up to MAX_QUESTIONS_PER_QUIZ)
    const maxVal = this.getMaxQuestions();
    const defaultVal = Math.min(MAX_QUESTIONS_PER_QUIZ, maxVal);

    // Ensure difficulty and questionTypes have valid defaults
    const difficulty = this.generatedQuiz?.difficulty 
      ? this.generatedQuiz.difficulty 
      : QuizDifficulty.MEDIUM;
    const questionTypes = this.generatedQuiz?.questionTypes && this.generatedQuiz.questionTypes.length > 0
      ? this.generatedQuiz.questionTypes
      : [QuestionType.SINGLE_CHOICE];

    this.quizForm
      .get('numberOfQuestions')
      ?.setValidators([Validators.required, Validators.min(1), Validators.max(maxVal)]);
    this.quizForm.patchValue({
      difficulty: difficulty,
      numberOfQuestions: defaultVal,
      questionTypes: questionTypes,
    });
    this.quizForm.get('numberOfQuestions')?.updateValueAndValidity();
    this.quizForm.get('difficulty')?.updateValueAndValidity();
    this.quizForm.get('questionTypes')?.updateValueAndValidity();

    this.phase = 'form';
  }

  // Cancel generate and go back to list
  cancelGenerate() {
    this.cancelRegenerate(); // Use the unified cancel logic
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

    // If in append mode (adding AI to manual quiz), save manual draft first to ensure quizId is set
    if (this.generationIntent === 'append' && this.generatedQuiz?._id !== undefined) {
      console.log('Append mode: ensuring manual quiz is saved, then appending AI questions...');
      const manualQuizId = this.generatedQuiz._id === '' ? null : this.generatedQuiz._id;
      
      // Map reviewQuestions to EditedQuestion format (extract option text from objects)
      const questions: EditedQuestion[] = this.reviewQuestions.map(q => ({
        questionId: (q as any)._id || undefined, // Only include if it's an existing question from DB
        questionText: q.text,
        type: q.type,
        options: q.options.map(opt => (typeof opt === 'string' ? opt : opt.text)),
        correctAnswers: q.correctAnswers,
      }));

      // Save manual draft to ensure it's persisted and get the quizId
      this.quizzesService.saveManualDraft(manualQuizId, this.sectionId, questions).subscribe({
        next: (res) => {
          if (res.quizId) {
            // Now generate AI questions and append them to this quiz
            dto.quizId = res.quizId;
            this.generateNewQuiz(dto);
          } else {
            this.errorMessage = 'Failed to save manual quiz. Please try again.';
            this.phase = 'form';
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Failed to save manual draft:', err);
          const errorMsg = err?.error?.message || 'Failed to save manual quiz. Please try again.';
          this.errorMessage = errorMsg;
          this.phase = 'form';
          this.cdr.detectChanges();
        }
      });
      return;
    }

    // If regenerating, delete the old quiz first
    if (this.isRegenerating && this.generatedQuiz?._id) {
      this.quizzesService.deletePendingQuiz(this.generatedQuiz._id).subscribe({
        next: () => {
          console.log('Old quiz deleted, generating new quiz...');
          this.generateNewQuiz(dto);
        },
        error: (err) => {
          console.error('Failed to delete old quiz:', err);
          // Continue anyway - generate the new quiz
          this.generateNewQuiz(dto);
        }
      });
    } else {
      this.generateNewQuiz(dto);
    }
  }

  private generateNewQuiz(dto: CreateQuizDto) {
    this.quizzesService.generateQuizConfig(dto).subscribe({
      next: (res) => {
        console.log('QUIZ RESPONSE IN COMPONENT:', res);

        this.generatedQuiz = res.quiz;
        this.viewingQuizId = res.quiz._id;

        // Clear regeneration state since we have new quiz
        if (this.isRegenerating) {
          this.isRegenerating = false;
          this.previousQuizData = null;
          this.previousReviewQuestions = [];
        }

        // If quiz is still generating, poll for completion
        if (
          res.quiz.generationStatus === QuizGenerationStatus.GENERATING ||
          res.quiz.generationStatus === QuizGenerationStatus.PENDING
        ) {
          console.log('Quiz is still generating, starting polling...');
          setTimeout(() => this.pollForCompletion(), 2000);
          return;
        }

        // If completed, show questions
        if (
          res.quiz.generationStatus === QuizGenerationStatus.COMPLETED &&
          res.quiz.questions?.length
        ) {
          const incoming = this.toReviewQuestions(res.quiz.questions || []);
          if (this.generationIntent === 'append') {
            // Append to whatever is already in the quiz — AI, manual, or both
            this.reviewQuestions = [...this.reviewQuestions, ...incoming];
          } else {
            this.reviewQuestions = incoming;
          }
          // Initialize filtered questions with the new list
          this.filteredReviewQuestions = [...this.reviewQuestions];
          this.applyQuestionFilters();
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
        console.error('Quiz generation error:', err);

        // Handle different error response formats
        let errorMsg = 'Failed to generate quiz. Please try again.';

        if (err.status === 403) {
          // Forbidden - the section has hit the maximum quizzes-per-section limit
          errorMsg =
            err.error?.message ||
            err.error?.error ||
            `This section has reached the maximum limit of ${this.MAX_QUIZZES} quizzes.`;
        } else if (err.status === 0 || err.status === -1) {
          // Network error or CORS
          errorMsg = 'Unable to connect to server. Please check your connection.';
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }

        this.errorMessage = errorMsg;
        this.phase = 'form';
        this.cdr.detectChanges();
      },
    });
  }

  private pollForCompletion(attempt = 0) {
    const maxAttempts = 30; // ~60s at 2s interval

    // For generating quizzes, we need to check the current quiz for the section
    // since the quiz ID might change during generation
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
          // Initialize filtered questions with the full list
          this.filteredReviewQuestions = [...this.reviewQuestions];
          this.applyQuestionFilters();
          this.viewingQuizId = quiz.quizId; // Update to the final quiz ID
          this.phase = 'review';
          this.cdr.detectChanges();
          return;
        }
        if (quiz.generationStatus === 'FAILED') {
          this.errorMessage = 'Quiz generation failed. Please try again.';
          this.phase = 'form';
          return;
        }
        if (attempt >= maxAttempts) {
          this.errorMessage =
            'Quiz generation is taking longer than expected. Please refresh shortly.';
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
      this.approveError = 'Please save or discard all open edits before approving.';
      return;
    }
    if (this.activeQuestionsCount < this.MIN_QUESTIONS_PER_QUIZ) {
      this.approveError = `A quiz must have at least ${this.MIN_QUESTIONS_PER_QUIZ} questions to be approved.`;
      return;
    }
    this.approveError = '';
    this.approveLoading = true;

    // We always send all remaining questions to support hard delete
    const edited = this.buildEditedQuestions();
    const dto: ApproveQuizDto = { editedQuestions: edited };
    if (this.isManualMode || !this.generatedQuiz._id) {
      dto.sectionId = this.sectionId;
    }

    this.quizzesService.approveQuiz(this.generatedQuiz._id, dto).subscribe({
      next: (res) => {
        // Ensure this runs inside Angular zone for proper change detection
        this.ngZone.run(() => {
          if (res && res.quizId) {
            this.generatedQuiz!._id = res.quizId;
            this.viewingQuizId = res.quizId;
          }
          console.log('✅ Quiz approved, quiz ID:', this.generatedQuiz?._id);

          // Show success toast first
          this.toastr.success('Quiz has been approved and published successfully!', 'Success');

          // Clear loading and update state
          this.approveLoading = false;
          this.isQuizApproved = true;

          // Disable editing for approved quiz
          this.reviewQuestions.forEach((q) => (q.editing = false));

          // Force immediate change detection
          this.cdr.detectChanges();

          // Small delay to ensure backend has processed the quiz approval before reloading course
          setTimeout(() => {
            this.loadEnrollmentStatus();
            this.loadAllQuizzes();
            this.parent?.refreshCourseData(); // Updates course data in parent, keeping publish button in sync
          }, 500);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          console.error('❌ Quiz approval failed:', err);
          this.approveLoading = false;
          this.approveError = err?.error?.message || 'Failed to approve quiz. Please try again.';
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ── Regenerate (for current quiz being viewed) ────────────────────────────

  regenerate() {
    this.generationIntent = 'replace'; // NEW — explicit, full quiz replacement

    this.previousQuizData = { ...this.generatedQuiz! };
    this.previousReviewQuestions = [...this.reviewQuestions];
    this.isRegenerating = true;

    // Reset form validators to full range since we are replacing the entire quiz
    this.quizForm
      .get('numberOfQuestions')
      ?.setValidators([
        Validators.required,
        Validators.min(1),
        Validators.max(MAX_QUESTIONS_PER_QUIZ),
      ]);

    // Ensure difficulty and questionTypes have valid defaults
    const difficulty = this.generatedQuiz?.difficulty 
      ? this.generatedQuiz.difficulty 
      : QuizDifficulty.MEDIUM;
    const questionTypes = this.generatedQuiz?.questionTypes && this.generatedQuiz.questionTypes.length > 0
      ? this.generatedQuiz.questionTypes
      : [QuestionType.SINGLE_CHOICE];

    // Reset form to default values
    this.quizForm.patchValue({
      difficulty: difficulty,
      numberOfQuestions: this.generatedQuiz?.numberOfQuestions || MAX_QUESTIONS_PER_QUIZ,
      questionTypes: questionTypes,
    });
    this.quizForm.get('numberOfQuestions')?.updateValueAndValidity();
    this.quizForm.get('difficulty')?.updateValueAndValidity();
    this.quizForm.get('questionTypes')?.updateValueAndValidity();

    // Show form phase
    this.phase = 'form';
  }

  // Cancel regeneration and restore previous quiz
  cancelRegenerate() {
    if (this.isRegenerating && this.previousQuizData) {
      // Full replace — restore previous quiz data
      this.generatedQuiz = { ...this.previousQuizData };
      this.reviewQuestions = [...this.previousReviewQuestions];
      // Re-initialize filtered list
      this.filteredReviewQuestions = [...this.reviewQuestions];
      this.applyQuestionFilters();
      this.isRegenerating = false;
      this.previousQuizData = null;
      this.previousReviewQuestions = [];
      this.phase = 'review';
    } else if (this.generationIntent === 'append' && this.reviewQuestions.length > 0) {
      // Appending more questions (manual→AI, or AI→AI) — just go back, nothing changed yet
      this.phase = 'review';
    } else {
      // Normal cancel from form (first quiz creation)
      if (this.totalQuizzes > 0) {
        this.navigateBackToList();
      } else {
        this.goBack();
      }
    }
  }

  // ── Inline editing ─────────────────────────────────────────────────────────

  startEdit(q: ReviewQuestion) {
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

    q.draftOptions = q.options.map((o) => ({
      text: o.text,
      isCorrect: q.correctAnswers.includes(o.text),
    }));
    q.draftText = q.text;
    q.draftType = q.type;
    q.editError = '';
    q.editing = true;
  }

  cancelEdit(q: ReviewQuestion) {
    if (q.questionId === undefined && !q.text) {
      // It's a new unsaved question, remove it completely from reviewQuestions
      this.reviewQuestions = this.reviewQuestions.filter((question) => question !== q);
      // Re-apply filters to keep filtered list in sync
      this.applyQuestionFilters();
    } else {
      q.editing = false;
      q.editError = '';
    }
  }

  saveEdit(q: ReviewQuestion) {
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

    const draftText = q.draftText?.trim();
    if (!draftText) {
      q.editError = 'Please enter the question text.';
      return;
    }

    const validOptions = q.draftOptions
      .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }))
      .filter((o) => o.text !== '');

    if (validOptions.length < 2) {
      q.editError = 'At least 2 options are required.';
      return;
    }

    const corrects = validOptions.filter((o) => o.isCorrect).map((o) => o.text);
    const isSingle =
      q.draftType === QuestionType.SINGLE_CHOICE || q.draftType === QuestionType.TRUE_FALSE;

    if (isSingle && corrects.length > 1) {
      q.editError = 'Single choice questions can only have one correct answer.';
      return;
    }

    if (corrects.length === 0) {
      q.editError = 'Select at least one correct answer from the current options.';
      return;
    }

    q.text = draftText;
    q.type = q.draftType || q.type;
    q.options = validOptions.map((o) => ({ optionId: o.text, text: o.text }));
    q.correctAnswers = corrects;
    q.wasEdited = true;
    q.editing = false;
    q.editError = '';
    if (!this.isQuizApproved) {
      this.scheduleAutosave();
    }
  }

  // ── Instructor: hard delete a question ───────────────────────────────────────
  deleteQuestion(q: ReviewQuestion) {
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }
    this.reviewQuestions = this.reviewQuestions.filter((question) => question !== q);
    // Re-apply filters to keep filtered list in sync
    this.applyQuestionFilters();
    this.toastr.success('Question removed. Click "Approve & Publish" to save changes.');
    this.cdr.detectChanges();
    if (!this.isQuizApproved) {
      this.scheduleAutosave();
    }
  }

  // Count of questions that will actually be shown to students / scored
  get activeQuestionsCount(): number {
    return this.reviewQuestions.length;
  }

  // ── Instructor: author a brand-new question ────────────────────────────
  addNewQuestion() {
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

    if (this.remainingQuestionSlots <= 0) {
      this.toastr.warning(`Maximum quiz size of ${MAX_QUESTIONS_PER_QUIZ} questions reached.`);
      return;
    }

    const defaultOptions = [
      { text: 'Option 1', isCorrect: true },
      { text: 'Option 2', isCorrect: false },
    ];

    const newQ: ReviewQuestion = {
      questionId: undefined, // omitted on purpose — signals a NEW question to the backend
      text: '',
      type: QuestionType.SINGLE_CHOICE,
      options: defaultOptions.map((opt) => ({ optionId: opt.text, text: opt.text })),
      correctAnswers: ['Option 1'],
      createdBy: 'INSTRUCTOR',
      isIgnored: false,
      editing: true, // opens directly in edit mode
      draftOptions: [...defaultOptions],
      draftText: '',
      draftType: QuestionType.SINGLE_CHOICE,
      editError: '',
      wasEdited: true,
      createdAt: new Date(),
    };

    this.reviewQuestions.push(newQ);
    // Re-apply filters to keep filtered list in sync
    this.applyQuestionFilters();
    this.cdr.detectChanges();
    if (!this.isQuizApproved) {
      this.scheduleAutosave();
    }
  }

  // Choose / toggle question type dynamically
  onDraftTypeChange(q: ReviewQuestion, newType: string) {
    const typeEnum = newType as QuestionType;
    q.draftType = typeEnum;

    // 1. Handle single-choice / true-false vs multi-choice constraints
    if (typeEnum === QuestionType.SINGLE_CHOICE || typeEnum === QuestionType.TRUE_FALSE) {
      // Ensure at most one correct option is set
      let foundCorrect = false;
      q.draftOptions.forEach((opt) => {
        if (opt.isCorrect) {
          if (foundCorrect) {
            opt.isCorrect = false;
          } else {
            foundCorrect = true;
          }
        }
      });
      // If none is correct, make the first one correct
      if (!foundCorrect && q.draftOptions.length > 0) {
        q.draftOptions[0].isCorrect = true;
      }
    }

    // 2. If changing to TRUE_FALSE, enforce exactly True and False options
    if (typeEnum === QuestionType.TRUE_FALSE) {
      const isTrueCorrect = q.draftOptions.some(
        (o) => o.text.toLowerCase() === 'true' && o.isCorrect,
      );
      const isFalseCorrect = q.draftOptions.some(
        (o) => o.text.toLowerCase() === 'false' && o.isCorrect,
      );

      q.draftOptions = [
        { text: 'True', isCorrect: isTrueCorrect || !isFalseCorrect },
        { text: 'False', isCorrect: isFalseCorrect && !isTrueCorrect },
      ];
    }
  }

  // Add draft option dynamically
  addDraftOption(q: ReviewQuestion) {
    if (q.draftOptions.length >= 6) {
      this.toastr.warning('Maximum 6 options allowed');
      return;
    }
    q.draftOptions.push({ text: '', isCorrect: false });
  }

  // Remove draft option dynamically
  removeDraftOption(q: ReviewQuestion, index: number) {
    if (q.draftOptions.length <= 2) {
      this.toastr.warning('At least 2 options are required');
      return;
    }
    const wasCorrect = q.draftOptions[index].isCorrect;
    q.draftOptions.splice(index, 1);

    // If the removed option was the only correct one in a single choice, make another one correct
    const isSingle =
      q.draftType === QuestionType.SINGLE_CHOICE || q.draftType === QuestionType.TRUE_FALSE;
    if (wasCorrect && isSingle && q.draftOptions.length > 0) {
      q.draftOptions[0].isCorrect = true;
    }
  }

  toggleDraftCorrect(q: ReviewQuestion, optionIndex: number) {
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

    const isSingle =
      q.draftType === QuestionType.SINGLE_CHOICE || q.draftType === QuestionType.TRUE_FALSE;

    if (isSingle) {
      // Mark only this option as correct, others as incorrect
      q.draftOptions.forEach((opt, idx) => {
        opt.isCorrect = idx === optionIndex;
      });
    } else {
      // Multi-choice: toggle this option
      q.draftOptions[optionIndex].isCorrect = !q.draftOptions[optionIndex].isCorrect;
    }
  }

  toggleCorrect(q: ReviewQuestion, optionText: string) {
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

    if (this.isSingleType(q)) {
      q.correctAnswers = [optionText];
    } else {
      const idx = q.correctAnswers.indexOf(optionText);

      if (idx === -1) {
        q.correctAnswers = [...q.correctAnswers, optionText];
      } else {
        q.correctAnswers = q.correctAnswers.filter((c) => c !== optionText);
      }
    }

    q.wasEdited = true;
  }

  isSingleType(q: ReviewQuestion): boolean {
    const t = (q.editing && q.draftType ? q.draftType : q.type || '').toString().toUpperCase();
    return t === 'SINGLE_CHOICE' || t === 'TRUE_FALSE';
  }

  isTrueFalseType(q: ReviewQuestion): boolean {
    const t = (q.editing && q.draftType ? q.draftType : q.type || '').toString().toUpperCase();
    return t === 'TRUE_FALSE';
  }

  // Track by index to prevent re-rendering
  trackByIndex(index: number): number {
    return index;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  goBack() {
    this.flushPendingAutosave().subscribe(() => {
      this.router.navigate(
        ['/course-builder', this.courseId, 'sections'],
        {
          queryParams: {
            highlight: this.sectionId,
            expand: this.sectionId
          }
        }
      );
    });
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    if (this.hasPendingChanges && !this.isQuizApproved) {
      const questionsToSave = this.buildEditedQuestions().filter((q) => q.questionText?.trim());
      if (questionsToSave.length > 0) {
        this.quizzesService
          .saveManualDraft(this.generatedQuiz?._id || null, this.sectionId, questionsToSave)
          .subscribe({
            error: (err) => console.error('Final autosave on destroy failed', err),
          });
      }
    }
  }

  goToSections() {
    this.router.navigate(['/course-builder', this.courseId, 'sections']);
  }

  /**
   * Handle question filter changes
   */
  onQuestionFilterChange(state: QuestionFilterState): void {
    this.currentQuestionFilters = state;
    this.applyQuestionFilters();
  }

  /**
   * Clear question filters
   */
  onClearQuestionFilters(): void {
    this.currentQuestionFilters = {
      searchTerm: '',
      selectedTypes: [],
      selectedSources: [],
      selectedSort: 'newest'
    };
    this.applyQuestionFilters();
  }

  /**
   * Apply filters and sorting to questions
   */
  private applyQuestionFilters(): void {
    let filtered = [...this.reviewQuestions];

    // Apply search
    if (this.currentQuestionFilters.searchTerm.trim()) {
      const term = this.currentQuestionFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(q => q.text.toLowerCase().includes(term));
    }

    // Apply type filter
    if (this.currentQuestionFilters.selectedTypes.length > 0) {
      filtered = filtered.filter(q => 
        this.currentQuestionFilters.selectedTypes.includes(q.type)
      );
    }

    // Apply source filter
    if (this.currentQuestionFilters.selectedSources.length > 0) {
      filtered = filtered.filter(q =>
        this.currentQuestionFilters.selectedSources.includes(q.createdBy || 'AI')
      );
    }

    // Apply sorting
    switch (this.currentQuestionFilters.selectedSort) {
      case 'oldest':
        // Oldest first = keep original order (AI generates in order, manual are added in order)
        // Don't sort if no createdAt (preserve array order which represents creation order)
        if (filtered.some(q => q.createdAt)) {
          filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateA - dateB;
          });
        }
        break;
      case 'ai_first':
        filtered.sort((a, b) => {
          const aIsAI = a.createdBy === 'AI' ? 0 : 1;
          const bIsAI = b.createdBy === 'AI' ? 0 : 1;
          return aIsAI - bIsAI;
        });
        break;
      case 'manual_first':
        filtered.sort((a, b) => {
          const aIsManual = a.createdBy === 'INSTRUCTOR' ? 0 : 1;
          const bIsManual = b.createdBy === 'INSTRUCTOR' ? 0 : 1;
          return aIsManual - bIsManual;
        });
        break;
      case 'newest':
      default:
        // Newest first = reverse order
        if (filtered.some(q => q.createdAt)) {
          filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
        } else {
          // No createdAt timestamps, so reverse the array (last added is newest)
          filtered = filtered.reverse();
        }
        break;
    }

    this.filteredReviewQuestions = filtered;
    this.cdr.detectChanges();
  }

  /**
   * Delete a pending review quiz. Only allows deletion of pending quizzes, not approved ones.
   */
  deletePendingQuiz(quizId: string): void {
    const quiz = this.quizzes.find((q) => q.quizId === quizId);
    
    if (!quiz) {
      this.toastr.error('Quiz not found');
      return;
    }

    if (quiz.status === 'approved') {
      this.toastr.error('Cannot delete an approved quiz');
      return;
    }

    // Open confirmation dialog
    const quizNumber = quiz.quizGenerationNumber || '?';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Delete Quiz ?`,
        message: 'This pending quiz will be permanently deleted. This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      }
    });

    // Handle dialog result
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return; // User clicked Cancel
      }

      this.quizzesService.deletePendingQuiz(quizId).subscribe({
        next: (res) => {
          if (res.success) {
            // Remove from quiz list
            this.quizzes = this.quizzes.filter((q) => q.quizId !== quizId);
            this.totalQuizzes = this.quizzes.length;
            
            this.toastr.success('Pending quiz deleted successfully');
            this.cdr.detectChanges();

            // If no quizzes left, go to mode-select
            if (this.totalQuizzes === 0) {
              this.phase = 'mode-select';
            }
          }
        },
        error: (err) => {
          console.error('Delete quiz error:', err);
          const errorMsg = err?.error?.message || 'Failed to delete quiz. Please try again.';
          this.toastr.error(errorMsg);
        },
      });
    });
  }

  // ── Page Title & Description ───────────────────────────────────────────────

  getPageTitle(): string {
    switch (this.phase) {
      case 'list':
        return 'Quizzes';
      case 'mode-select':
        return 'Create a Quiz';
      case 'form':
        return this.isRegenerating ? 'Regenerate Quiz' : 'Generate Quiz with AI';
      case 'generating':
        return this.isRegenerating ? 'Regenerating Quiz...' : 'Generating Quiz...';
      case 'review':
        return this.isQuizApproved
          ? 'Quiz Approved'
          : this.isManualMode
            ? 'Build Your Quiz'
            : 'Review Generated Quiz';
      default:
        return 'Quiz Configuration';
    }
  }

  getPageDescription(): string {
    switch (this.phase) {
      case 'list':
        return this.totalQuizzes === 0
          ? 'No quizzes yet. Generate your first quiz to test student knowledge.'
          : `You have ${this.totalQuizzes} quiz(es) for this section. Maximum ${this.MAX_QUIZZES} quizzes allowed.`;
      case 'mode-select':
        return 'Choose how you want to create this quiz.';
      case 'form':
        return this.isRegenerating
          ? 'Update the quiz parameters to regenerate with new questions'
          : 'Set up AI-generated quiz parameters for this section';
      case 'generating':
        return this.isRegenerating
          ? 'Please wait while the AI regenerates your quiz...'
          : 'Please wait while the AI generates your quiz...';
      case 'review':
        return this.isQuizApproved
          ? 'This quiz is live for enrolled students.'
          : this.isManualMode
            ? 'Add questions manually. You can also generate AI questions to append.'
            : 'Check the AI-generated questions, edit if needed, then approve to publish.';
      default:
        return '';
    }
  }

  // ── Formatters ──────────────────────────────────────────────────────────────

  formatQuestionTypes(types: string[] | undefined): string {
    if (!types || types.length === 0) return 'Manual';
    return types
      .map((t) => {
        const typeStr = t.toUpperCase();
        switch (typeStr) {
          case 'TRUE_FALSE':
            return 'True/False';
          case 'SINGLE_CHOICE':
            return 'Single Choice';
          case 'MULTI_CHOICE':
            return 'Multi Choice';
          default:
            return t;
        }
      })
      .join(', ');
  }

  formatQuestionType(type: string): string {
    const t = type?.toUpperCase() || '';
    switch (t) {
      case 'TRUE_FALSE':
        return 'True/False';
      case 'SINGLE_CHOICE':
        return 'Single Choice';
      case 'MULTI_CHOICE':
        return 'Multi Choice';
      default:
        return type;
    }
  }

  formatQuestionTypeButton(type: string): string {
    const t = type?.toUpperCase() || '';
    switch (t) {
      case 'TRUE_FALSE':
        return 'True / False';
      case 'SINGLE_CHOICE':
        return 'Single Choice';
      case 'MULTI_CHOICE':
        return 'Multi Choice';
      default:
        return type;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  isCorrect(q: ReviewQuestion, optionText: string): boolean {
    return q.correctAnswers.includes(optionText);
  }

  private toReviewQuestions(questions: QuizQuestionDetail[]): ReviewQuestion[] {
    return questions.map((q) => {
      let correctAnswers = [...(q.correctAnswers ?? [])];

      // Single Choice & True/False must only have one answer
      if (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.TRUE_FALSE) {
        correctAnswers = correctAnswers.slice(0, 1);
      }

      return {
        ...q,
        correctAnswers,
        editing: false,
        draftOptions: [],
        draftCorrectAnswers: [],
        draftType: q.type, // ← IMPORTANT: Initialize draftType from q.type
        draftText: q.text, // ← Initialize draftText as well
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
      .filter((q) => q.text && q.text.trim() !== '')
      .map((q) => {
        // Use draftType if it exists (from edit mode), otherwise use type
        const questionType = q.draftType || q.type;
        
        // Ensure the type is one of the valid enum values
        if (!questionType || !Object.values(QuestionType).includes(questionType)) {
          console.warn('Warning: Question has invalid or missing type, defaulting to SINGLE_CHOICE:', {
            questionText: q.text,
            type: questionType
          });
          // Default to SINGLE_CHOICE if type is missing
          const finalType = QuestionType.SINGLE_CHOICE;
          return {
            questionId: q.questionId,
            questionText: q.text,
            type: finalType,
            options: q.options.map((o) => o.text),
            correctAnswers: q.correctAnswers,
            isIgnored: q.isIgnored,
            createdBy: q.createdBy ?? 'AI',
          };
        }
        
        return {
          questionId: q.questionId,
          questionText: q.text,
          type: questionType,
          options: q.options.map((o) => o.text),
          correctAnswers: q.correctAnswers,
          isIgnored: q.isIgnored,
          createdBy: q.createdBy ?? 'AI',
        };
      });
  }

  // ── Statistics (single source of truth) ──────────────────────────────────

  /** Live stats for the quiz currently being reviewed. Always derived from
   *  reviewQuestions, so it updates instantly on add/delete/edit/regenerate. */
  get quizStats(): QuizStats {
    return computeQuizStats(this.reviewQuestions);
  }

  /** Live stats for a quiz card in the list. Uses the quiz's live `questions`
   *  array when the backend provides it; falls back to the legacy
   *  generation-time numbers only if that data isn't available yet. */
  getQuizCardStats(quiz: QuizListItem): QuizStats {
    if (quiz.questions && quiz.questions.length > 0) {
      return computeQuizStats(quiz.questions);
    }
    console.warn(
      `getQuizCardStats: quiz ${quiz.quizId} has no live questions array — falling back to legacy fields`,
    );
    return {
      total: quiz.numberOfQuestions,
      aiCount: 0,
      manualCount: 0,
      typeCounts: {},
    };
  }

  private scheduleAutosave(): void {
    if (this.isQuizApproved) return;
    if (this.generatedQuiz?.difficulty != null) return;
    this.hasPendingChanges = true;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.runAutosave(), this.AUTOSAVE_DEBOUNCE_MS);
  }

  private flushPendingAutosave(): Observable<void> {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    if (this.isQuizApproved || !this.hasPendingChanges) {
      return of(undefined);
    }
    const questionsToSave = this.buildEditedQuestions().filter((q) => q.questionText?.trim());
    if (questionsToSave.length === 0) {
      this.hasPendingChanges = false;
      return of(undefined);
    }
    this.autosaveStatus.set('saving');
    return this.quizzesService
      .saveManualDraft(this.generatedQuiz?._id || null, this.sectionId, questionsToSave)
      .pipe(
        tap((res) => {
          if (res.quizId && this.generatedQuiz) {
            this.generatedQuiz._id = res.quizId;
            this.viewingQuizId = res.quizId;
          } else if (!res.quizId && this.generatedQuiz) {
            this.generatedQuiz._id = '';
            this.viewingQuizId = null;
          }
          this.hasPendingChanges = false;
          this.autosaveStatus.set('saved');
        }),
        map(() => undefined),
        catchError((err) => {
          console.error('Flush autosave failed before navigation', err);
          this.autosaveStatus.set('error');
          return of(undefined);
        }),
      );
  }

  private runAutosave(): void {
    const questionsToSave = this.buildEditedQuestions().filter((q) => q.questionText?.trim());
    if (questionsToSave.length === 0) {
      this.hasPendingChanges = false;
      this.autosaveStatus.set('idle');
      return;
    }
    this.autosaveStatus.set('saving');
    this.quizzesService
      .saveManualDraft(this.generatedQuiz?._id || null, this.sectionId, questionsToSave)
      .subscribe({
        next: (res) => {
          if (res.quizId && this.generatedQuiz) {
            this.generatedQuiz._id = res.quizId;
            this.viewingQuizId = res.quizId;
          } else if (!res.quizId && this.generatedQuiz) {
            this.generatedQuiz._id = '';
            this.viewingQuizId = null;
          }
          this.hasPendingChanges = false;
          this.autosaveStatus.set('saved');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Autosave failed', err);
          this.autosaveStatus.set('error');
          this.cdr.detectChanges();
        },
      });
  }

  /** Ordered [type, count] pairs for template iteration, in a fixed, friendly order. */
  typeCountEntries(
    typeCounts: Partial<Record<QuestionType, number>>,
  ): Array<{ type: QuestionType; count: number }> {
    const order = [QuestionType.SINGLE_CHOICE, QuestionType.MULTI_CHOICE, QuestionType.TRUE_FALSE];
    return order
      .filter((t) => (typeCounts[t] ?? 0) > 0)
      .map((t) => ({ type: t, count: typeCounts[t]! }));
  }

  // Generate additional AI questions and APPEND them to the current quiz,
  // without touching existing questions (AI or manual).
  generateMore() {
    if (this.remainingQuestionSlots <= 0) {
      this.toastr.warning(`Maximum quiz size of ${MAX_QUESTIONS_PER_QUIZ} questions reached.`);
      return;
    }

    this.generationIntent = 'append';

    const maxVal = this.remainingQuestionSlots;
    const defaultVal = Math.min(MAX_QUESTIONS_PER_QUIZ, maxVal);

    this.quizForm
      .get('numberOfQuestions')
      ?.setValidators([Validators.required, Validators.min(1), Validators.max(maxVal)]);
    
    // Ensure difficulty and questionTypes have valid defaults
    const difficulty = this.generatedQuiz?.difficulty 
      ? this.generatedQuiz.difficulty 
      : QuizDifficulty.MEDIUM;
    const questionTypes = this.generatedQuiz?.questionTypes && this.generatedQuiz.questionTypes.length > 0
      ? this.generatedQuiz.questionTypes
      : [QuestionType.SINGLE_CHOICE];

    this.quizForm.patchValue({
      difficulty: difficulty,
      numberOfQuestions: defaultVal,
      questionTypes: questionTypes,
    });
    
    this.quizForm.get('numberOfQuestions')?.updateValueAndValidity();
    this.quizForm.get('difficulty')?.updateValueAndValidity();
    this.quizForm.get('questionTypes')?.updateValueAndValidity();

    this.phase = 'form';
  }
}