import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export enum QuizDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum QuestionType {
  SINGLE_CHOICE = 'SINGLE_CHOICE',
  MULTI_CHOICE = 'MULTI_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
}

/**
 * Maximum number of questions a single quiz may contain.
 * Applies to all questions regardless of origin (AI, instructor, or mixed).
 * All frontend validations must reference this constant — never hardcode 5.
 */
export const MAX_QUESTIONS_PER_QUIZ = 20;
export const MIN_QUESTIONS_PER_QUIZ = 5;

export interface CreateQuizDto {
  sectionId: string;
  difficulty: QuizDifficulty;
  numberOfQuestions: number;
  /** AI generation type configuration — must contain at least one type. */
  questionTypes: QuestionType[];
}

export interface QuizQuestionOption {
  optionId: string;
  text: string;
}

export interface QuizQuestionDetail {
  questionId?: string; // ← optional: brand-new instructor-authored questions have no id until saved
  text: string; // ← backend sends "questionText"
  options: QuizQuestionOption[]; // ← backend sends string[], not {optionId, text}[]
  correctAnswers: string[];
  type: QuestionType;
  isIgnored?: boolean; // ← soft-delete / hide flag from backend
  createdBy?: 'AI' | 'INSTRUCTOR'; // ← question provenance from backend
}

export interface GeneratedQuiz {
  _id: string;
  sectionId: string;
  difficulty: QuizDifficulty | null;
  numberOfQuestions: number;
  /** AI generation type configuration — records what types were requested. */
  questionTypes: QuestionType[];
  generationStatus: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  status: 'pending_review' | 'approved';
  questions: QuizQuestionDetail[];
}

export enum QuizGenerationStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface QuizConfigResponse {
  message: string;
  quiz: GeneratedQuiz;
}

export interface EditedQuestion {
  questionId?: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  correctAnswers: string[];
  isIgnored?: boolean;
  createdBy?: 'AI' | 'INSTRUCTOR'; // ← NEW: preserve provenance on save
}

export interface ApproveQuizDto {
  sectionId?: string;
  editedQuestions?: EditedQuestion[];
}

export interface ApproveQuizResponse {
  quizId: string;
  status: string;
  approvedAt: Date;
}

export interface QuizDetailResponse {
  quizId: string;
  sectionId: string;
  difficulty: QuizDifficulty | null;
  numberOfQuestions: number;
  /** AI generation type configuration. Empty array for manual quizzes. */
  questionTypes: QuestionType[];
  generationStatus: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  status: 'pending_review' | 'approved';
  questions: QuizQuestionDetail[];
}

export interface QuizListItem {
  quizId: string;
  sectionId: string;
  difficulty: QuizDifficulty | null;
  numberOfQuestions: number; // legacy/generation-time only — do not use for display
  /** AI generation type configuration. Empty array for manual quizzes. */
  questionTypes: QuestionType[]; // legacy/generation-time only
  questions?: QuizQuestionDetail[]; // live questions array from backend
  generationStatus: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  status: 'pending_review' | 'approved';
  timeLimit: number;
  passingScore: number;
  maxAttempts: number;
  enrollmentCountAtGeneration: number;
  enrollmentCountAtApproval: number;
  quizGenerationNumber: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AllQuizzesResponse {
  sectionId: string;
  totalQuizzes: number;
  quizzes: QuizListItem[];
}

export interface EnrollmentStatusResponse {
  sectionId: string;
  currentEnrollmentCount: number;
  baselineEnrollmentCount: number;
  newEnrollmentsSinceLastApproval: number;
  enrollmentThreshold: number;
  enrollmentsNeeded: number;
  canGenerateQuiz: boolean;
  hasApprovedQuiz: boolean;
  lastApprovedQuizGeneration: number;
}

// Add near the other interfaces in quizzes.ts

export interface QuizStats {
  total: number;
  aiCount: number;
  manualCount: number;
  typeCounts: Partial<Record<QuestionType, number>>;
}

/**
 * Single source of truth for quiz statistics.
 * Always derive counts from the CURRENT questions array — never from
 * stored generation-time metadata (numberOfQuestions, questionTypes),
 * since questions can be added, deleted, edited, or regenerated after
 * generation.
 */
export function computeQuizStats(
  questions: Array<{ type: QuestionType; createdBy?: 'AI' | 'INSTRUCTOR' }> | undefined | null,
): QuizStats {
  const stats: QuizStats = { total: 0, aiCount: 0, manualCount: 0, typeCounts: {} };
  if (!questions || questions.length === 0) return stats;

  for (const q of questions) {
    stats.total++;
    if (q.createdBy === 'INSTRUCTOR') {
      stats.manualCount++;
    } else {
      stats.aiCount++; // default to AI if createdBy is missing (legacy data)
    }
    stats.typeCounts[q.type] = (stats.typeCounts[q.type] ?? 0) + 1;
  }
  return stats;
}

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private http = inject(HttpClient);
  private base = '/quizzes';
  private instructorBase = '/instructor/quizzes';

  generateQuizConfig(dto: CreateQuizDto): Observable<QuizConfigResponse> {
    return this.http.post<any>(`${this.base}/generate`, dto, { withCredentials: true }).pipe(
      map((res) => {
        console.log('RAW BACKEND RESPONSE', res); // ← add this
        return {
          message: res.message,
          quiz: {
            ...res.quiz,
            _id: res.quiz.id ?? res.quiz._id,
            difficulty: res.quiz.difficulty ?? null,
            questionTypes: res.quiz.questionTypes ?? [],
            questions: (res.quiz.questions ?? []).map((q: any) => ({
              questionId: this.extractId(q._id),
              text: q.questionText ?? q.text,
              type: q.type,
              correctAnswers: q.correctAnswers ?? [],
              options: (q.options ?? []).map((opt: any) =>
                typeof opt === 'string' ? { optionId: opt, text: opt } : opt,
              ),
              isIgnored: q.isIgnored ?? false,
              createdBy: q.createdBy ?? 'AI',
            })),
          },
        };
      }),
    );
  }

  private extractId(idField: any): string {
    if (typeof idField === 'string') return idField;
    if (idField?.buffer?.data) {
      return idField.buffer.data.map((b: number) => b.toString(16).padStart(2, '0')).join('');
    }
    return '';
  }

  approveQuiz(quizId: string, dto: ApproveQuizDto = {}): Observable<ApproveQuizResponse> {
    const finalQuizId = quizId && quizId !== 'undefined' ? quizId : 'new';
    return this.http.patch<ApproveQuizResponse>(
      `${this.instructorBase}/${finalQuizId}/approve`,
      dto,
      { withCredentials: true },
    );
  }

  getQuizForSection(sectionId: string): Observable<QuizDetailResponse | null> {
    return this.http
      .get<any>(`${this.instructorBase}/section/${sectionId}`, { withCredentials: true })
      .pipe(
        map((res) => {
          if (!res) return null;
          return {
            quizId: res.quizId,
            sectionId: res.sectionId,
            difficulty: res.difficulty ?? null,
            numberOfQuestions: res.numberOfQuestions,
            questionTypes: res.questionTypes ?? [],
            generationStatus: res.generationStatus,
            status: res.status,
            questions: (res.questions ?? []).map((q: any) => ({
              questionId: q.questionId,
              text: q.text,
              type: q.type,
              correctAnswers: q.correctAnswers ?? [],
              options: (q.options ?? []).map((opt: any) =>
                typeof opt === 'string' ? { optionId: opt, text: opt } : opt,
              ),
              isIgnored: q.isIgnored ?? false,
              createdBy: q.createdBy ?? 'AI',
            })),
          };
        }),
      );
  }

  getAllQuizzesForSection(sectionId: string): Observable<AllQuizzesResponse> {
    return this.http
      .get<any>(`${this.instructorBase}/section/${sectionId}/all`, { withCredentials: true })
      .pipe(
        map((res) => {
          return {
            sectionId: res.sectionId,
            totalQuizzes: res.totalQuizzes,
            quizzes: (res.quizzes ?? []).map((q: any) => ({
              quizId: q.quizId,
              sectionId: res.sectionId,
              difficulty: q.difficulty ?? null,
              numberOfQuestions: q.numberOfQuestions,
              questionTypes: q.questionTypes ?? [],
              // NEW: map live questions if the backend provides them
              questions: (q.questions ?? []).map((qq: any) => ({
                questionId: qq.questionId,
                text: qq.text,
                type: qq.type,
                correctAnswers: qq.correctAnswers ?? [],
                options: (qq.options ?? []).map((opt: any) =>
                  typeof opt === 'string' ? { optionId: opt, text: opt } : opt,
                ),
                isIgnored: qq.isIgnored ?? false,
                createdBy: qq.createdBy ?? 'AI',
              })),
              generationStatus: q.generationStatus,
              status: q.status,
              timeLimit: q.timeLimit,
              passingScore: q.passingScore,
              maxAttempts: q.maxAttempts,
              enrollmentCountAtGeneration: q.enrollmentCountAtGeneration,
              enrollmentCountAtApproval: q.enrollmentCountAtApproval,
              quizGenerationNumber: q.quizGenerationNumber,
              createdAt: q.createdAt ? new Date(q.createdAt) : null,
              updatedAt: q.updatedAt ? new Date(q.updatedAt) : null,
            })),
          };
        }),
      );
  }

  getQuizById(quizId: string): Observable<QuizDetailResponse | null> {
    return this.http.get<any>(`${this.instructorBase}/${quizId}`, { withCredentials: true }).pipe(
      map((res) => {
        if (!res) return null;
        return {
          quizId: res.quizId,
          sectionId: res.sectionId,
          difficulty: res.difficulty ?? null,
          numberOfQuestions: res.numberOfQuestions,
          questionTypes: res.questionTypes ?? [],
          generationStatus: res.generationStatus,
          status: res.status,
          questions: (res.questions ?? []).map((q: any) => ({
            questionId: q.questionId,
            text: q.text,
            type: q.type,
            correctAnswers: q.correctAnswers ?? [],
            options: (q.options ?? []).map((opt: any) =>
              typeof opt === 'string' ? { optionId: opt, text: opt } : opt,
            ),
            isIgnored: q.isIgnored ?? false,
            createdBy: q.createdBy ?? 'AI',
          })),
        };
      }),
    );
  }

  getEnrollmentStatus(sectionId: string): Observable<EnrollmentStatusResponse> {
    return this.http.get<EnrollmentStatusResponse>(
      `${this.instructorBase}/section/${sectionId}/enrollment-status`,
      { withCredentials: true },
    );
  }

  saveManualDraft(
    quizId: string | null,
    sectionId: string,
    questions: EditedQuestion[],
  ): Observable<{ quizId: string | null }> {
    const dto = { sectionId, questions };
    if (!quizId || quizId === 'new' || quizId === 'undefined') {
      return this.http.post<{ quizId: string | null }>(`${this.instructorBase}/manual-draft`, dto, {
        withCredentials: true,
      });
    }
    return this.http.patch<{ quizId: string | null }>(
      `${this.instructorBase}/${quizId}/manual-draft`,
      dto,
      { withCredentials: true },
    );
  }

  deletePendingQuiz(quizId: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(
      `${this.instructorBase}/${quizId}/delete`,
      {},
      { withCredentials: true },
    );
  }
}
