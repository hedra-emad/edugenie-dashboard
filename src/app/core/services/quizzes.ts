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
  MIXED = 'MIXED',
}

export interface CreateQuizDto {
  sectionId: string;
  difficulty: QuizDifficulty;
  numberOfQuestions: number;
  questionType: QuestionType;
}

export interface QuizQuestionOption {
  optionId: string;
  text: string;
}

export interface QuizQuestionDetail {
  questionId: string;
  text: string;                 // ← backend sends "questionText"
  options: QuizQuestionOption[]; // ← backend sends string[], not {optionId, text}[]
  correctAnswers: string[];
  type: QuestionType;
}

export interface GeneratedQuiz {
  _id: string;
  sectionId: string;
  difficulty: QuizDifficulty;
  numberOfQuestions: number;
  questionType: QuestionType;
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
  questionId: string;     // useful even if backend doesn't match on it yet — future-proofing
  questionText: string;
  type: QuestionType;     // real enum value now, not questionId
  options: string[];
  correctAnswers: string[];
}

export interface ApproveQuizDto {
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
  difficulty: QuizDifficulty;
  numberOfQuestions: number;
  questionType: QuestionType;
  generationStatus: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  status: 'pending_review' | 'approved';
  questions: QuizQuestionDetail[];
}

export interface QuizListItem {
  quizId: string;
  sectionId: string;
  difficulty: QuizDifficulty;
  numberOfQuestions: number;
  questionType: QuestionType;
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

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private http = inject(HttpClient);
  private base = '/quizzes';
  private instructorBase = '/instructor/quizzes';

  generateQuizConfig(dto: CreateQuizDto): Observable<QuizConfigResponse> {
  return this.http.post<any>(
    `${this.base}/generate`,
    dto,
    { withCredentials: true }
  ).pipe(
    map((res) => {
      console.log('RAW BACKEND RESPONSE', res); // ← add this
      return {
        message: res.message,
        quiz: {
          ...res.quiz,
          _id: res.quiz.id ?? res.quiz._id,
          questions: (res.quiz.questions ?? []).map((q: any) => ({
            questionId: this.extractId(q._id),
            text: q.questionText ?? q.text,
            type: q.type,
            correctAnswers: q.correctAnswers ?? [],
            options: (q.options ?? []).map((opt: any) =>
              typeof opt === 'string'
                ? { optionId: opt, text: opt }
                : opt
            ),
          })),
        },
      };
    })
  );
}

private extractId(idField: any): string {
  if (typeof idField === 'string') return idField;
  if (idField?.buffer?.data) {
    return idField.buffer.data
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

  approveQuiz(quizId: string, dto: ApproveQuizDto = {}): Observable<ApproveQuizResponse> {
    return this.http.patch<ApproveQuizResponse>(
      `${this.instructorBase}/${quizId}/approve`,
      dto,
      { withCredentials: true }
    );
  }

  getQuizForSection(sectionId: string): Observable<QuizDetailResponse | null> {
  return this.http.get<any>(
    `${this.instructorBase}/section/${sectionId}`,
    { withCredentials: true }
  ).pipe(
    map((res) => {
      if (!res) return null;
      return {
        quizId: res.quizId,
        sectionId: res.sectionId,
        difficulty: res.difficulty,
        numberOfQuestions: res.numberOfQuestions,
        questionType: res.questionType,
        generationStatus: res.generationStatus,
        status: res.status,
        questions: (res.questions ?? []).map((q: any) => ({
          questionId: q.questionId,
          text: q.text,
          type: q.type,
          correctAnswers: q.correctAnswers ?? [],
          options: (q.options ?? []).map((opt: any) =>
            typeof opt === 'string' ? { optionId: opt, text: opt } : opt
          ),
        })),
      };
    })
  );
}

getAllQuizzesForSection(sectionId: string): Observable<AllQuizzesResponse> {
  return this.http.get<any>(
    `${this.instructorBase}/section/${sectionId}/all`,
    { withCredentials: true }
  ).pipe(
    map((res) => {
      return {
        sectionId: res.sectionId,
        totalQuizzes: res.totalQuizzes,
        quizzes: (res.quizzes ?? []).map((q: any) => ({
          quizId: q.quizId,
          sectionId: res.sectionId,
          difficulty: q.difficulty,
          numberOfQuestions: q.numberOfQuestions,
          questionType: q.questionType,
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
    })
  );
}

getQuizById(quizId: string): Observable<QuizDetailResponse | null> {
  return this.http.get<any>(
    `${this.instructorBase}/${quizId}`,
    { withCredentials: true }
  ).pipe(
    map((res) => {
      if (!res) return null;
      return {
        quizId: res.quizId,
        sectionId: res.sectionId,
        difficulty: res.difficulty,
        numberOfQuestions: res.numberOfQuestions,
        questionType: res.questionType,
        generationStatus: res.generationStatus,
        status: res.status,
        questions: (res.questions ?? []).map((q: any) => ({
          questionId: q.questionId,
          text: q.text,
          type: q.type,
          correctAnswers: q.correctAnswers ?? [],
          options: (q.options ?? []).map((opt: any) =>
            typeof opt === 'string' ? { optionId: opt, text: opt } : opt
          ),
        })),
      };
    })
  );
}

getEnrollmentStatus(sectionId: string): Observable<EnrollmentStatusResponse> {
  return this.http.get<EnrollmentStatusResponse>(
    `${this.instructorBase}/section/${sectionId}/enrollment-status`,
    { withCredentials: true }
  );
}
}