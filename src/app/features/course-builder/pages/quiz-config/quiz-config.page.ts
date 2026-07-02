import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
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
} from '../../../../core/services/quizzes';
import { BackButtonComponent } from '../../components/shared/back-button/back-button';
import { MainButtonComponent } from '../../../../shared/components/main-button/main-button.component';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { PublishCourseButtonComponent } from '../../components/publish-course-button/publish-course-button';
import { CoursesService } from '../../../../core/services/courses';
import { Course } from '../../../../core/models/course.model';
import { PageSkeletonComponent, CardSkeletonComponent } from '../../../../shared/components/loading';

type PagePhase = 'list' | 'form' | 'generating' | 'review';

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
    MatTooltipModule,
    BackButtonComponent,
    MainButtonComponent,
    PublishCourseButtonComponent,
    PageSkeletonComponent,
    CardSkeletonComponent,
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
  private ngZone = inject(NgZone);
  private toastr = inject(ToastrService);

  courseId!: string;
  sectionId!: string;
  course: Course | null = null;

  // Quiz list
  quizzes: QuizListItem[] = [];
  totalQuizzes = 0;
  readonly MAX_QUIZZES = 5;
  readonly ENROLLMENT_THRESHOLD = 30;

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
  
  phase: PagePhase = 'list'; // Start with list view
  errorMessage = '';
  approveError = '';
  approveLoading = false;
  isQuizApproved = false;

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
  
  console.log('ngOnInit - courseId:', this.courseId, 'sectionId:', this.sectionId);
  
  // Check if we're viewing a specific quiz
  const quizId = this.route.snapshot.paramMap.get('quizId');
  console.log('ngOnInit - quizId from route:', quizId);
  
  if (quizId) {
    this.viewingQuizId = quizId;
    // Don't set phase here - let loadSpecificQuiz determine the correct phase
    // This prevents the "generating" flash when refreshing a completed quiz page
    console.log('Found quizId in route, will load specific quiz:', quizId);
  }
  
  // Subscribe to route parameter changes
  this.route.paramMap.subscribe(params => {
    const newQuizId = params.get('quizId');
    console.log('Route paramMap changed, quizId:', newQuizId, 'current viewingQuizId:', this.viewingQuizId);
    
    if (newQuizId && newQuizId !== this.viewingQuizId) {
      console.log('New quiz ID detected, loading quiz:', newQuizId);
      this.viewingQuizId = newQuizId;
      // Only set to generating if we're actually generating a new quiz
      // For existing quizzes, let loadSpecificQuiz set the correct phase
      
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
        this.loadAllQuizzes();
      }
    }
  });
  
  this.loadCourse();
  this.loadAllQuizzes();
  this.loadEnrollmentStatus();
}

private loadCourse() {
  this.coursesService.getCourseById(this.courseId).subscribe({
    next: (course) => {
      this.course = course;
      console.log('📚 Course loaded in quiz-config:', {
        courseId: course.id,
        totalLessons: course.totalLessons,
        sections: course.sections?.map(s => ({
          id: s.id,
          title: s.title,
          hasQuiz: s.hasQuiz,
          lessons: s.lessons?.length || 0
        }))
      });
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to load course', err);
    }
  });
}

private loadAllQuizzes() {
  this.quizzesService.getAllQuizzesForSection(this.sectionId).subscribe({
    next: (res: AllQuizzesResponse) => {
      this.quizzes = res.quizzes || [];
      this.totalQuizzes = res.totalQuizzes || 0;
      console.log('Loaded quizzes:', this.quizzes);
      
      // If we have a quizId in the route, load that specific quiz
      const routeQuizId = this.route.snapshot.paramMap.get('quizId');
      if (routeQuizId) {
        console.log('Route has quizId, loading specific quiz:', routeQuizId);
        this.loadSpecificQuiz(routeQuizId);
        return;
      }
      
      // Otherwise, show appropriate phase based on quiz count
      if (this.totalQuizzes === 0) {
        this.phase = 'form';
      } else {
        this.phase = 'list';
      }
    },
    error: (err) => {
      console.error('LOAD QUIZZES ERROR', err);
      // Show form on error if no specific quiz requested
      const routeQuizId = this.route.snapshot.paramMap.get('quizId');
      if (!routeQuizId) {
        this.phase = 'form';
      }
    },
  });
}

private loadSpecificQuiz(quizId: string) {
  console.log('loadSpecificQuiz called with quizId:', quizId);
  this.viewingQuizId = quizId;
  
  // Find quiz in the loaded list to get metadata
  const quiz = this.quizzes.find(q => q.quizId === quizId);
  console.log('Found quiz in list:', quiz);
  
  if (quiz) {
    // Use the complete quiz data from the list (has all metadata)
    this.generatedQuiz = {
      _id: quiz.quizId,
      sectionId: quiz.sectionId,
      difficulty: quiz.difficulty,
      numberOfQuestions: quiz.numberOfQuestions,
      questionType: quiz.questionType,
      generationStatus: quiz.generationStatus as any,
      status: quiz.status as any,
      questions: [], // Will be loaded if needed
    } as GeneratedQuiz;
    
    this.isQuizApproved = quiz.status === 'approved';
    console.log('Quiz status:', quiz.status, 'generationStatus:', quiz.generationStatus, 'isApproved:', this.isQuizApproved);
    
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
            questionType: quizDetail.questionType,
            generationStatus: quizDetail.generationStatus as any,
            status: quizDetail.status as any,
            questions: quizDetail.questions as any,
          } as GeneratedQuiz;
          this.isQuizApproved = quizDetail.status === 'approved';
        }
        
        // Use questions from API
        this.reviewQuestions = this.toReviewQuestions(quizDetail.questions);
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
  this.enrollmentStatusLoading.set(true);
  this.quizzesService.getEnrollmentStatus(this.sectionId).subscribe({
    next: (status) => {
      this.enrollmentStatus = status;
      this.enrollmentStatusLoading.set(false);
      console.log('Enrollment Status loaded:', status);
      console.log('Loading status set to false:', this.enrollmentStatusLoading());
    },
    error: (err) => {
      console.error('Failed to load enrollment status:', err);
      this.enrollmentStatus = null;
      this.enrollmentStatusLoading.set(false);
      console.log('Loading status set to false (error):', this.enrollmentStatusLoading());
    },
  });
}

// Get approved quizzes count
get approvedQuizzesCount(): number {
  return this.quizzes.filter(q => q.status === 'approved').length;
}

// Check if instructor can generate a new quiz (both enrollment and quiz count limits)
get canGenerateNewQuiz(): boolean {
  const withinQuizLimit = this.totalQuizzes < this.MAX_QUIZZES;
  const hasEnoughEnrollments = this.enrollmentStatus?.canGenerateQuiz ?? false;
  return withinQuizLimit && hasEnoughEnrollments;
}

// Get enrollment information for display
get enrollmentInfo() {
  console.log('enrollmentInfo getter called. Loading:', this.enrollmentStatusLoading(), 'Status:', this.enrollmentStatus);
  
  if (this.enrollmentStatusLoading()) {
    return {
      canGenerate: false,
      message: 'Loading enrollment status...',
      showProgress: false
    };
  }

  if (!this.enrollmentStatus) {
    return {
      canGenerate: false,
      message: 'Unable to load enrollment information',
      showProgress: false
    };
  }

  // Check if this is truly the first quiz (no quizzes at all, not just no approved quizzes)
  if (!this.enrollmentStatus.hasApprovedQuiz && this.totalQuizzes === 0) {
    return {
      canGenerate: true,
      message: 'Generate your first quiz for this section',
      showProgress: false,
      currentEnrollments: this.enrollmentStatus.currentEnrollmentCount
    };
  }

  const { enrollmentsNeeded, canGenerateQuiz, currentEnrollmentCount, enrollmentThreshold } = this.enrollmentStatus;

  if (canGenerateQuiz) {
    return {
      canGenerate: true,
      message: `You have enough enrollments to generate a new quiz!`,
      showProgress: true,
      currentEnrollments: currentEnrollmentCount,
      enrollmentsNeeded: 0
    };
  }

  return {
    canGenerate: false,
    message: `You need ${enrollmentsNeeded} more enrollment${enrollmentsNeeded > 1 ? 's' : ''} to generate another quiz.`,
    showProgress: true,
    currentEnrollments: currentEnrollmentCount,
    enrollmentsNeeded,
    enrollmentThreshold
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
  return this.quizzes.filter(q => q.status === 'pending_review');
}

// Get approved quizzes
get approvedQuizzes(): QuizListItem[] {
  return this.quizzes.filter(q => q.status === 'approved');
}

// Open quiz for viewing/editing
viewQuiz(quiz: QuizListItem) {
  console.log('viewQuiz called with quiz:', quiz.quizId, 'status:', quiz.generationStatus);
  // Navigate to the dedicated quiz route instead of changing phase
  this.router.navigate(['/course-builder', this.courseId, 'sections', this.sectionId, 'quiz-config', quiz.quizId]);
}

// Back to list from review
backToList() {
  console.log('backToList called, current phase:', this.phase);
  
  // If we're currently viewing a specific quiz (have quizId in route), navigate to list
  const currentQuizId = this.route.snapshot.paramMap.get('quizId');
  if (currentQuizId) {
    console.log('Currently viewing specific quiz, navigating to list');
    this.navigateBackToList();
  } else {
    // Already on list route, just change phase and clear data
    console.log('Already on list route, clearing data and setting list phase');
    this.clearCurrentQuizData();
    this.phase = 'list';
    this.loadAllQuizzes();
    this.loadEnrollmentStatus();
  }
}

private clearCurrentQuizData() {
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
  this.router.navigate(['/course-builder', this.courseId, 'sections', this.sectionId, 'quiz-config']).then(success => {
    console.log('Navigation success:', success);
    if (success) {
      // Force change detection after navigation
      setTimeout(() => {
        this.phase = 'list';
        this.cdr.detectChanges();
      }, 50);
    }
  }).catch(error => {
    console.error('Navigation error:', error);
    // Fallback: just clear data and set phase
    this.phase = 'list';
    this.cdr.detectChanges();
  });
}

// Show generate form
showGenerateForm() {
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
        console.error('Quiz generation error:', err);
        
        // Handle different error response formats
        let errorMsg = 'Failed to generate quiz. Please try again.';
        
        if (err.status === 403) {
          // Forbidden - likely enrollment threshold not met
          let baseMessage = err.error?.message || err.error?.error || 'You do not have enough enrollments to generate a new quiz.';
          
          // Add helpful context with current enrollment status
          if (this.enrollmentStatus && this.enrollmentStatus.hasApprovedQuiz) {
            const needed = this.enrollmentStatus.enrollmentsNeeded;
            const current = this.enrollmentStatus.newEnrollmentsSinceLastApproval;
            const threshold = this.enrollmentStatus.enrollmentThreshold;
            baseMessage += `\n\nCurrent new enrollments: ${current} / ${threshold} required\nYou need ${needed} more enrollment${needed > 1 ? 's' : ''}.`;
          }
          
          errorMsg = baseMessage;
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
        this.viewingQuizId = quiz.quizId; // Update to the final quiz ID
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
        // Ensure this runs inside Angular zone for proper change detection
        this.ngZone.run(() => {
          console.log('✅ Quiz approved, quiz ID:', this.generatedQuiz?._id);
          
          // Show success toast first
          this.toastr.success('Quiz has been approved and published successfully!', 'Success');
          
          // Clear loading and update state
          this.approveLoading = false;
          this.isQuizApproved = true;
          
          // Disable editing for approved quiz
          this.reviewQuestions.forEach(q => q.editing = false);
          
          // Force immediate change detection
          this.cdr.detectChanges();
          
          // Small delay to ensure backend has processed the quiz approval before reloading course
          setTimeout(() => {
            console.log('⏳ Reloading course data after quiz approval...');
            this.loadEnrollmentStatus();
            this.loadAllQuizzes(); 
            this.loadCourse();
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
    // Save current quiz data before showing form
    this.previousQuizData = { ...this.generatedQuiz! };
    this.previousReviewQuestions = [...this.reviewQuestions];
    this.isRegenerating = true;
    
    // Reset form to default values
    this.quizForm.patchValue({
      difficulty: this.generatedQuiz?.difficulty || QuizDifficulty.MEDIUM,
      numberOfQuestions: this.generatedQuiz?.numberOfQuestions || 10,
      questionType: this.generatedQuiz?.questionType || QuestionType.MIXED,
    });
    
    // Show form phase
    this.phase = 'form';
  }

  // Cancel regeneration and restore previous quiz
  cancelRegenerate() {
    if (this.isRegenerating && this.previousQuizData) {
      // Restore previous quiz data
      this.generatedQuiz = { ...this.previousQuizData };
      this.reviewQuestions = [...this.previousReviewQuestions];
      this.isRegenerating = false;
      this.previousQuizData = null;
      this.previousReviewQuestions = [];
      
      // Go back to review phase
      this.phase = 'review';
    } else {
      // Normal cancel from form (when creating first quiz)
      if (this.totalQuizzes > 0) {
        this.navigateBackToList();
      } else {
        this.goBack(); // Go to lessons if no quizzes exist
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
    
    // Don't allow editing of True/False questions
    if (this.isTrueFalseType(q)) {
      this.toastr.info('True/False questions cannot be edited');
      return;
    }
    
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
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

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
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

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
  // Don't allow editing of approved quizzes
  if (this.isQuizApproved) {
    this.toastr.warning('Cannot edit approved quiz questions');
    return;
  }
  
  // Don't allow editing of True/False questions
  if (this.isTrueFalseType(q)) {
    this.toastr.info('True/False questions cannot be edited');
    return;
  }
  
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

isTrueFalseType(q: ReviewQuestion): boolean {
  const t = (q.type || '').toString().toUpperCase();
  return t === 'TRUE_FALSE';
}


  updateDraftOption(q: ReviewQuestion, index: number, value: string) {
    // Don't allow editing of approved quizzes
    if (this.isQuizApproved) {
      this.toastr.warning('Cannot edit approved quiz questions');
      return;
    }

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

  // ── Page Title & Description ───────────────────────────────────────────────

  getPageTitle(): string {
    switch (this.phase) {
      case 'list': return 'Quizzes';
      case 'form': return this.isRegenerating ? 'Regenerate Quiz' : 'Generate New Quiz';
      case 'generating': return this.isRegenerating ? 'Regenerating Quiz...' : 'Generating Quiz...';
      case 'review': return this.isQuizApproved ? 'Quiz Approved' : 'Review Generated Quiz';
      default: return 'Quiz Configuration';
    }
  }

  getPageDescription(): string {
    switch (this.phase) {
      case 'list': 
        return this.totalQuizzes === 0 
          ? 'No quizzes yet. Generate your first quiz to test student knowledge.'
          : `You have ${this.totalQuizzes} quiz(es) for this section. Maximum ${this.MAX_QUIZZES} quizzes allowed.`;
      case 'form': 
        return this.isRegenerating 
          ? 'Update the quiz parameters to regenerate with new questions'
          : 'Set up AI-generated quiz parameters for this section';
      case 'generating': 
        return this.isRegenerating 
          ? 'Please wait while the AI regenerates your quiz...'
          : 'Please wait while the AI generates your quiz...';
      case 'review': return this.isQuizApproved 
          ? 'This quiz is live for enrolled students.'
          : 'Check the AI-generated questions, edit if needed, then approve to publish.';
      default: return '';
    }
  }

  // ── Formatters ──────────────────────────────────────────────────────────────

  formatQuestionType(type: string): string {
    const t = type?.toUpperCase() || '';
    switch (t) {
      case 'TRUE_FALSE': return 'True/False';
      case 'SINGLE_CHOICE': return 'Single Choice';
      case 'MULTI_CHOICE': return 'Multi Choice';
      case 'MIXED': return 'Mixed';
      default: return type;
    }
  }

  formatQuestionTypeButton(type: string): string {
    const t = type?.toUpperCase() || '';
    switch (t) {
      case 'TRUE_FALSE': return 'True / False';
      case 'SINGLE_CHOICE': return 'Single Choice';
      case 'MULTI_CHOICE': return 'Multi Choice';
      case 'MIXED': return 'Mixed';
      default: return type;
    }
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