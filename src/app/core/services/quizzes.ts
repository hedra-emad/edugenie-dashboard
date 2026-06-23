import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


export enum QuizDifficulty { EASY = 'EASY', MEDIUM = 'MEDIUM', HARD = 'HARD' }
export enum QuestionType { SINGLE_CHOICE = 'SINGLE_CHOICE', MULTI_CHOICE = 'MULTI_CHOICE', TRUE_FALSE = 'TRUE_FALSE', MIXED = 'MIXED' }

export interface CreateQuizDto {
  sectionId: string;
  difficulty: QuizDifficulty;
  numberOfQuestions: number; // min 10, max 20
  questionType: QuestionType;
}

export interface QuizConfigResponse {
  message: string;
  quiz: {
    _id: string;
    sectionId: string;
    difficulty: QuizDifficulty;
    numberOfQuestions: number;
    questionType: QuestionType;
    generationStatus: 'pending' | 'completed' | 'failed';
    questions: any[];
  };
}

@Injectable({ providedIn: 'root' })
export class QuizzesService {
  private http = inject(HttpClient);
  private base = `${import.meta.env.NG_APP_API_URL}/quizzes`;

  generateQuizConfig(dto: CreateQuizDto): Observable<QuizConfigResponse> {
    return this.http.post<QuizConfigResponse>(`${this.base}/generate`, dto, { withCredentials: true });
  }
}
