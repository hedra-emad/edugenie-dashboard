import {
  Component, Input, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { CourseAttachmentsService, Attachment } from '../../services/course-attachments.service';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

interface SectionNode {
  sectionId: string;
  sectionTitle: string;
  sectionIndex: number;
  lessons: LessonNode[];
  attachments: Attachment[];
  state: LoadState;
  expanded: boolean;
}

interface LessonNode {
  lessonId: string;
  lessonTitle: string;
  sectionId: string;
  attachments: Attachment[];
  state: LoadState;
  expanded: boolean;
}

@Component({
  selector: 'app-course-attachments',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, DatePipe],
  templateUrl: './course-attachments.component.html',
  styleUrl: './course-attachments.component.css'
})
export class CourseAttachmentsComponent implements OnDestroy {
  private readonly attachmentsService = inject(CourseAttachmentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  @Input() set course(val: any) {
    this._course = val;
    if (val) this.buildTree(val);
  }
  get course(): any { return this._course; }
  private _course: any = null;

  // ── Top-level panel ─────────────────────────────────────────────────────
  panelOpen = false;
  courseAttachments: Attachment[] = [];
  courseState: LoadState = 'idle';

  // ── Section tree ─────────────────────────────────────────────────────────
  sections: SectionNode[] = [];

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildTree(course: any): void {
    this.sections = (course.sections || []).map((s: any, i: number) => ({
      sectionId:    s._id || s.id || `sec-${i}`,
      sectionTitle: s.title || `Section ${i + 1}`,
      sectionIndex: i,
      lessons: (s.lessons || []).map((l: any, j: number) => ({
        lessonId:    l._id || l.id || `les-${j}`,
        lessonTitle: l.title || `Lesson ${j + 1}`,
        sectionId:   s._id || s.id || `sec-${i}`,
        attachments: [],
        state:       'idle' as LoadState,
        expanded:    false
      })),
      attachments: [],
      state:       'idle' as LoadState,
      expanded:    false
    }));
  }

  // ── Panel toggle (lazy load course-level attachments) ────────────────────
  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
    if (this.panelOpen && this.courseState === 'idle') {
      this.loadCourseAttachments();
    }
    this.cdr.markForCheck();
  }

  private loadCourseAttachments(): void {
    if (!this._course?.id && !this._course?._id) return;
    const courseId = this._course._id || this._course.id;
    this.courseState = 'loading';
    this.cdr.markForCheck();

    this.attachmentsService.getCourseAttachments(courseId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          this.courseAttachments = list;
          this.courseState = 'loaded';
          this.cdr.markForCheck();
        },
        error: () => {
          this.courseState = 'error';
          this.cdr.markForCheck();
        }
      });
  }

  retryCourse(): void {
    this.courseState = 'idle';
    this.loadCourseAttachments();
  }

  // ── Section toggle ────────────────────────────────────────────────────────
  toggleSection(sec: SectionNode): void {
    sec.expanded = !sec.expanded;
    if (sec.expanded && sec.state === 'idle') {
      this.loadSectionAttachments(sec);
    }
    this.cdr.markForCheck();
  }

  private loadSectionAttachments(sec: SectionNode): void {
    if (!this._course) return;
    const courseId = this._course._id || this._course.id;
    sec.state = 'loading';
    this.cdr.markForCheck();

    this.attachmentsService.getSectionAttachments(courseId, sec.sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          sec.attachments = list;
          sec.state = 'loaded';
          this.cdr.markForCheck();
        },
        error: () => {
          sec.state = 'error';
          this.cdr.markForCheck();
        }
      });
  }

  retrySection(sec: SectionNode): void {
    sec.state = 'idle';
    this.loadSectionAttachments(sec);
  }

  // ── Lesson toggle ─────────────────────────────────────────────────────────
  toggleLesson(les: LessonNode): void {
    les.expanded = !les.expanded;
    if (les.expanded && les.state === 'idle') {
      this.loadLessonAttachments(les);
    }
    this.cdr.markForCheck();
  }

  private loadLessonAttachments(les: LessonNode): void {
    if (!this._course) return;
    const courseId = this._course._id || this._course.id;
    les.state = 'loading';
    this.cdr.markForCheck();

    this.attachmentsService.getLessonAttachments(courseId, les.sectionId, les.lessonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => {
          les.attachments = list;
          les.state = 'loaded';
          this.cdr.markForCheck();
        },
        error: () => {
          les.state = 'error';
          this.cdr.markForCheck();
        }
      });
  }

  retryLesson(les: LessonNode): void {
    les.state = 'idle';
    this.loadLessonAttachments(les);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  getFileIcon(fileType: string): string {
    if (!fileType) return 'attach_file';
    const t = fileType.toLowerCase();
    if (t.includes('pdf'))                              return 'picture_as_pdf';
    if (t.includes('image') || t.includes('png') ||
        t.includes('jpg') || t.includes('jpeg') ||
        t.includes('gif') || t.includes('webp'))        return 'image';
    if (t.includes('video') || t.includes('mp4') ||
        t.includes('mov') || t.includes('avi'))         return 'videocam';
    if (t.includes('audio') || t.includes('mp3') ||
        t.includes('wav'))                               return 'audiotrack';
    if (t.includes('zip') || t.includes('rar') ||
        t.includes('7z') || t.includes('tar'))          return 'folder_zip';
    if (t.includes('markdown') || t.includes('md'))     return 'article';
    if (t.includes('word') || t.includes('doc'))        return 'description';
    if (t.includes('excel') || t.includes('xls') ||
        t.includes('csv'))                               return 'table_chart';
    if (t.includes('powerpoint') || t.includes('ppt'))  return 'slideshow';
    if (t.includes('text') || t.includes('txt'))        return 'text_snippet';
    if (t.includes('json') || t.includes('xml') ||
        t.includes('html') || t.includes('code'))        return 'code';
    return 'attach_file';
  }

  getIconColor(fileType: string): string {
    if (!fileType) return '#6b7280';
    const t = fileType.toLowerCase();
    if (t.includes('pdf'))                   return '#ef4444';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '#10b981';
    if (t.includes('video'))                 return '#8b5cf6';
    if (t.includes('audio'))                 return '#f59e0b';
    if (t.includes('zip') || t.includes('rar')) return '#f97316';
    if (t.includes('word') || t.includes('doc')) return '#2563eb';
    if (t.includes('excel') || t.includes('csv')) return '#16a34a';
    if (t.includes('powerpoint') || t.includes('ppt')) return '#ea580c';
    return '#6b7280';
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  openFile(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  downloadFile(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  trackById(_: number, item: any): string { return item.id || item.lessonId || item.sectionId; }
}
