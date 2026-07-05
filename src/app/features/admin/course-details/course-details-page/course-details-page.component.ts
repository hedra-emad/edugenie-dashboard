import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject
} from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, withLatestFrom, forkJoin, of, Observable } from 'rxjs';
import { finalize, catchError } from 'rxjs/operators';

import { CourseApprovalService } from '../../course-approvals/services/course-approval.service';
import { ToastrService } from 'ngx-toastr';
import { ApproveCourseDialogComponent } from '../../../../shared/components/dialogs/approve-course-dialog/approve-course-dialog.component';
import { RejectCourseDialogComponent } from '../../../../shared/components/dialogs/reject-course-dialog/reject-course-dialog.component';
import { PageSkeletonComponent, ButtonLoadingComponent } from '../../../../shared/components/loading';
import { CloudinaryThumbPipe } from '../../../../shared/pipes/cloudinary-thumb.pipe';
import { DurationPipe } from '../../../../shared/pipes/duration.pipe';
import { CourseAttachmentsService, Attachment } from '../services/course-attachments.service';

type AttachState = 'idle' | 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-course-details-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTabsModule,
    FormsModule,
    DatePipe,
    TitleCasePipe,
    ApproveCourseDialogComponent,
    RejectCourseDialogComponent,
    PageSkeletonComponent,
    ButtonLoadingComponent,
    CloudinaryThumbPipe,
    DurationPipe
  ],
  templateUrl: './course-details-page.component.html',
  styleUrl: './course-details-page.component.css'
})
export class CourseDetailsPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(CourseApprovalService);
  private readonly attachmentsService = inject(CourseAttachmentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  courseId: string | null = null;
  course: any = null;
  loading = true;
  error = false;

  // ── Per-button loading ────────────────────────────────────────────────────
  approveLoading = false;
  rejectLoading = false;

  // ── Modals ────────────────────────────────────────────────────────────────
  showApproveModal = false;
  showRejectModal = false;

  // ── Curriculum state ──────────────────────────────────────────────────────
  expandedSections: Record<number, boolean> = {};
  playingVideoLessonId: string | null = null;

  // ── Preview video ─────────────────────────────────────────────────────────
  previewPlaying = false;

  // ── Inline attachments state ──────────────────────────────────────────────
  /** course-level attachments */
  courseAttachments: Attachment[] = [];
  courseAttachState: AttachState = 'idle';
  courseAttachOpen = false;

  /** section attachments: key = sectionId */
  sectionAttachments: Record<string, Attachment[]> = {};
  sectionAttachState: Record<string, AttachState> = {};
  sectionAttachOpen: Record<string, boolean> = {};

  /** lesson attachments: key = lessonId */
  lessonAttachments: Record<string, Attachment[]> = {};
  lessonAttachState: Record<string, AttachState> = {};
  lessonAttachOpen: Record<string, boolean> = {};

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.courseId = params.get('id');
      if (this.courseId) {
        this.loadCourse(this.courseId);
      } else {
        this.router.navigate(['/admin/course-approvals']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCourse(id: string): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();

    this.service.getCourseById(id).pipe(
      withLatestFrom(this.service.courses$),
      takeUntil(this.destroy$)
    ).subscribe({
      next: ([data, courses]) => {
        const cached = courses.find(c => c.id === id);
        this.course = {
          ...data,
          status: cached?.status || this.service.normalizeStatus(data),
          rejectionReason: cached?.rejectionReason || data.rejectionReason,
          rejectedBy: cached?.rejectedBy || data.rejectedBy,
          rejectedAt: cached?.rejectedAt || data.rejectedAt
        };
        if (this.course?.sections?.length > 0) {
          this.expandedSections[0] = true;
        }
        this.loading = false;
        this.cdr.markForCheck();
        this.loadAllAttachments(id);
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.toastr.error('Failed to load course details');
        this.cdr.markForCheck();
      }
    });
  }

  private loadAllAttachments(courseId: string): void {
    if (!this.course) return;

    this.courseAttachState = 'loading';
    this.cdr.markForCheck();

    const observables: Record<string, Observable<any>> = {};

    // 1. Course attachments
    observables['course'] = this.attachmentsService.getCourseAttachments(courseId).pipe(
      catchError(() => {
        this.courseAttachState = 'error';
        this.cdr.markForCheck();
        return of(null);
      })
    );

    // 2. Sections and Lessons attachments
    const sections = this.course.sections || [];
    sections.forEach((sec: any, i: number) => {
      const secId = sec._id || sec.id || `sec-${i}`;
      this.sectionAttachState[secId] = 'loading';
      observables[`section:${secId}`] = this.attachmentsService.getSectionAttachments(courseId, sec._id || sec.id || secId).pipe(
        catchError(() => {
          this.sectionAttachState[secId] = 'error';
          this.cdr.markForCheck();
          return of(null);
        })
      );

      const lessons = sec.lessons || [];
      lessons.forEach((les: any, j: number) => {
        const lesId = les._id || les.id || `les-${j}`;
        this.lessonAttachState[lesId] = 'loading';
        observables[`lesson:${lesId}`] = this.attachmentsService.getLessonAttachments(courseId, sec._id || sec.id || secId, les._id || les.id || lesId).pipe(
          catchError(() => {
            this.lessonAttachState[lesId] = 'error';
            this.cdr.markForCheck();
            return of(null);
          })
        );
      });
    });

    if (Object.keys(observables).length === 0) {
      this.courseAttachState = 'loaded';
      this.cdr.markForCheck();
      return;
    }

    forkJoin(observables).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        // Course attachments
        if (results['course'] !== null) {
          this.courseAttachments = results['course'] || [];
          this.courseAttachState = 'loaded';
        }

        // Sections & Lessons
        sections.forEach((sec: any, i: number) => {
          const secId = sec._id || sec.id || `sec-${i}`;
          const secResult = results[`section:${secId}`];
          if (secResult !== null) {
            this.sectionAttachments[secId] = secResult || [];
            this.sectionAttachState[secId] = 'loaded';
          }

          const lessons = sec.lessons || [];
          lessons.forEach((les: any, j: number) => {
            const lesId = les._id || les.id || `les-${j}`;
            const lesResult = results[`lesson:${lesId}`];
            if (lesResult !== null) {
              this.lessonAttachments[lesId] = lesResult || [];
              this.lessonAttachState[lesId] = 'loaded';
            }
          });
        });

        this.cdr.markForCheck();
      },
      error: () => {
        this.cdr.markForCheck();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/course-approvals']);
  }

  toggleSection(index: number): void {
    this.expandedSections[index] = !this.expandedSections[index];
    this.cdr.markForCheck();
  }

  toggleVideoPreview(lessonKey: string): void {
    this.playingVideoLessonId =
      this.playingVideoLessonId === lessonKey ? null : lessonKey;
    this.cdr.markForCheck();
  }

  getTotalLessons(): number {
    if (!this.course?.sections) return 0;
    return this.course.sections.reduce(
      (total: number, section: any) => total + (section.lessons?.length || 0), 0
    );
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending Review';
      case 'under_review': return 'Pending Review'; // fallback
      case 'published': return 'Published';
      case 'rejected': return 'Rejected';
      case 'draft': return 'Draft';
      case 'archived': return 'Archived';
      default: return 'Pending Review';
    }
  }

  // ── Approve ───────────────────────────────────────────────────────────────
  openApproveModal(): void {
    if (this.approveLoading || this.rejectLoading) return;
    this.showApproveModal = true;
    this.cdr.markForCheck();
  }

  closeApproveModal(): void {
    if (this.approveLoading) return;
    this.showApproveModal = false;
    this.cdr.markForCheck();
  }

  confirmApprove(): void {
    if (!this.courseId || this.approveLoading || this.rejectLoading) return;
    this.approveLoading = true;
    this.cdr.markForCheck();

    this.service.approveCourse(this.courseId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.approveLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(success => {
        if (success) {
          this.showApproveModal = false;
          this.course = { ...this.course, status: 'published' };
          this.cdr.markForCheck();
        }
      });
  }

  // ── Reject modal ──────────────────────────────────────────────────────────

  /** Open modal — no loading starts here */
  openRejectModal(): void {
    if (this.approveLoading || this.rejectLoading) return;
    this.showRejectModal = true;
    this.cdr.markForCheck();
  }

  /** Close modal — allowed any time unless API is in-flight */
  closeRejectModal(): void {
    if (this.rejectLoading) return;
    this.showRejectModal = false;
    this.cdr.markForCheck();
  }

  /** Confirm rejection — loading starts only here, after admin submits */
  confirmReject(reason: string): void {
    if (!this.courseId || this.rejectLoading) return;

    this.rejectLoading = true;
    this.cdr.markForCheck();

    this.service.rejectCourse(this.courseId, reason)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.rejectLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe(success => {
        if (success) {
          this.showRejectModal = false;
          this.course = { ...this.course, status: 'rejected', rejectionReason: reason };
          this.cdr.markForCheck();
        }
      });
  }

  // ── Attachment helpers ────────────────────────────────────────────────────

  get previewVideoUrl(): string | null {
    return this.course?.previewVideoUrl || this.course?.previewVideo || null;
  }

  // Course-level attachments
  toggleCourseAttachments(): void {
    this.courseAttachOpen = !this.courseAttachOpen;
    if (this.courseAttachOpen && this.courseAttachState === 'idle') {
      this.loadCourseAttachments();
    }
    this.cdr.markForCheck();
  }

  private loadCourseAttachments(): void {
    const id = this.course?._id || this.course?.id;
    if (!id) return;
    this.courseAttachState = 'loading';
    this.cdr.markForCheck();
    this.attachmentsService.getCourseAttachments(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => { this.courseAttachments = list; this.courseAttachState = 'loaded'; this.cdr.markForCheck(); },
        error: () => { this.courseAttachState = 'error'; this.cdr.markForCheck(); }
      });
  }

  retryCourseAttachments(): void { this.courseAttachState = 'idle'; this.loadCourseAttachments(); }

  // Section-level attachments
  toggleSectionAttachments(sectionId: string): void {
    this.sectionAttachOpen[sectionId] = !this.sectionAttachOpen[sectionId];
    if (this.sectionAttachOpen[sectionId] && !this.sectionAttachState[sectionId]) {
      this.loadSectionAttachments(sectionId);
    }
    this.cdr.markForCheck();
  }

  private loadSectionAttachments(sectionId: string): void {
    const courseId = this.course?._id || this.course?.id;
    if (!courseId) return;
    this.sectionAttachState[sectionId] = 'loading';
    this.cdr.markForCheck();
    this.attachmentsService.getSectionAttachments(courseId, sectionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => { this.sectionAttachments[sectionId] = list; this.sectionAttachState[sectionId] = 'loaded'; this.cdr.markForCheck(); },
        error: () => { this.sectionAttachState[sectionId] = 'error'; this.cdr.markForCheck(); }
      });
  }

  retrySectionAttachments(sectionId: string): void { this.sectionAttachState[sectionId] = 'idle'; this.loadSectionAttachments(sectionId); }

  // Lesson-level attachments
  toggleLessonAttachments(sectionId: string, lessonId: string): void {
    this.lessonAttachOpen[lessonId] = !this.lessonAttachOpen[lessonId];
    if (this.lessonAttachOpen[lessonId] && !this.lessonAttachState[lessonId]) {
      this.loadLessonAttachments(sectionId, lessonId);
    }
    this.cdr.markForCheck();
  }

  private loadLessonAttachments(sectionId: string, lessonId: string): void {
    const courseId = this.course?._id || this.course?.id;
    if (!courseId) return;
    this.lessonAttachState[lessonId] = 'loading';
    this.cdr.markForCheck();
    this.attachmentsService.getLessonAttachments(courseId, sectionId, lessonId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: list => { this.lessonAttachments[lessonId] = list; this.lessonAttachState[lessonId] = 'loaded'; this.cdr.markForCheck(); },
        error: () => { this.lessonAttachState[lessonId] = 'error'; this.cdr.markForCheck(); }
      });
  }

  retryLessonAttachments(sectionId: string, lessonId: string): void { this.lessonAttachState[lessonId] = 'idle'; this.loadLessonAttachments(sectionId, lessonId); }

  // File display utilities
  getFileIcon(fileType: string): string {
    if (!fileType) return 'attach_file';
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('gif') || t.includes('webp')) return 'image';
    if (t.includes('video') || t.includes('mp4') || t.includes('mov') || t.includes('avi')) return 'videocam';
    if (t.includes('audio') || t.includes('mp3') || t.includes('wav')) return 'audiotrack';
    if (t.includes('zip') || t.includes('rar') || t.includes('7z') || t.includes('tar')) return 'folder_zip';
    if (t.includes('markdown') || t.includes('md')) return 'article';
    if (t.includes('word') || t.includes('doc')) return 'description';
    if (t.includes('excel') || t.includes('xls') || t.includes('csv')) return 'table_chart';
    if (t.includes('powerpoint') || t.includes('ppt')) return 'slideshow';
    if (t.includes('json') || t.includes('xml') || t.includes('html') || t.includes('code')) return 'code';
    return 'attach_file';
  }

  getIconColor(fileType: string): string {
    if (!fileType) return '#6b7280';
    const t = fileType.toLowerCase();
    if (t.includes('pdf')) return '#ef4444';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '#10b981';
    if (t.includes('video')) return '#8b5cf6';
    if (t.includes('audio')) return '#f59e0b';
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

  openFile(url: string): void { window.open(url, '_blank', 'noopener,noreferrer'); }

  downloadFile(url: string, filename: string): void {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── Instructor helpers ────────────────────────────────────────────────────

  getInstructorInitials(): string {
    if (!this.course?.instructor) return 'I';
    const first = this.course.instructor.firstName?.charAt(0) || '';
    const last  = this.course.instructor.lastName?.charAt(0)  || '';
    return (first + last).toUpperCase() || 'I';
  }

  getInstructorName(): string {
    if (!this.course?.instructor) return 'Unknown Instructor';
    const { firstName, lastName, name } = this.course.instructor;
    if (firstName || lastName) return `${firstName || ''} ${lastName || ''}`.trim();
    return name || 'Unknown Instructor';
  }

  getInstructorEmail(): string {
    if (!this.course?.instructor) return 'No email provided';
    return this.course.instructor.email || 'No email provided';
  }
}
