import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject, timer, of } from 'rxjs';
import { takeUntil, finalize, take, switchMap, takeWhile, filter, catchError } from 'rxjs/operators';

import { DraftStateService } from '../../../../core/services/draft-state.service';
import { FormDraftIntegrationService } from '../../../../core/services/form-draft-integration.service';
import { FileDraftService } from '../../../../core/services/file-draft.service';
import { LessonsService } from '../../../../core/services/lessons';
import { CloudinaryService } from '../../../../core/services/cloudinary';
import { ActionBarComponent } from '../shared/action-bar/action-bar.component';
import { ExpansionPanelComponent } from '../shared/expansion-panel/expansion-panel.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';
import { SubButtonComponent } from '../../../../shared/components/sub-button/sub-button.component';
import { ToastrService } from 'ngx-toastr';

// ─────────────────────────────────────────────────────────────
// Single source of truth for all upload/save lifecycle states
// ─────────────────────────────────────────────────────────────
export type LessonUploadState =
  | 'idle' // nothing happening
  | 'video_selected' // file chosen, not yet uploading
  | 'uploading' // binary transfer to Cloudinary in progress
  | 'upload_stalled' // upload stalled (no progress for timeout period)
  | 'uploading_recovered' // recovered from interrupted upload (show UI, allow retry)
  | 'upload_success' // Cloudinary accepted the file (has URL/publicId)
  | 'saving' // DB create/update request in flight
  | 'saving_recovered' // recovered from interrupted save
  | 'save_failed' // DB call failed, Cloudinary asset exists
  | 'retrying' // retry DB call in flight
  | 'saved' // DB accepted → terminal success
  | 'upload_error' // Cloudinary rejected the file
  | 'max_retries_exceeded' // 3 DB retries all failed → asset cleaned up
  | 'deleting'; // delete in progress


  

interface UploadSnapshot {
  state: LessonUploadState;
  /** Progress 0-100 (only meaningful during `uploading`) */
  progress: number;
  /** Retries already attempted (max = MAX_RETRIES) */
  retryCount: number;
  /** Cloudinary URL – preserved from upload_success onward */
  videoUrl: string | null;
  /** Cloudinary public_id – preserved for delete calls */
  videoPublicId: string | null;
  /** User-visible message (errors, warnings) */
  message: string;
}

function initialSnapshot(): UploadSnapshot {
  return {
    state: 'idle',
    progress: 0,
    retryCount: 0,
    videoUrl: null,
    videoPublicId: null,
    message: '',
  };
}

@Component({
  selector: 'app-lesson-card',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    ActionBarComponent,
    ExpansionPanelComponent,
    AppLoader,
    SubButtonComponent,
  ],
  templateUrl: './lesson-card.component.html',
  styleUrl: './lesson-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonCardComponent implements OnInit, OnDestroy {
  @Input({ required: true }) lessonForm!: FormGroup;
  @Input() index = 0;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input({ required: true }) courseId!: string;
  @Input({ required: true }) sectionId!: string;

  @Output() delete = new EventEmitter<void>();
  @Output() moveUp = new EventEmitter<void>();
  @Output() moveDown = new EventEmitter<void>();
  @Output() durationChanged = new EventEmitter<void>();
  @Output() lessonCreated = new EventEmitter<{ index: number; id: string }>();

  // ── Services ──────────────────────────────────────────────
  private lessonsService = inject(LessonsService);
  private cloudinaryService = inject(CloudinaryService);
  private cdr = inject(ChangeDetectorRef);
  private dialog = inject(MatDialog);
  private draftStateService = inject(DraftStateService);
  private formDraftInteg = inject(FormDraftIntegrationService);
  private fileDraftService = inject(FileDraftService);
  private toastr = inject(ToastrService);

  private destroy$ = new Subject<void>();
  private ignoreRestore = false;

  // ── Constants ─────────────────────────────────────────────
  readonly MAX_DURATION = 15 * 60; // seconds
  readonly MAX_RETRIES = 3;
  readonly UPLOAD_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes timeout
  private readonly UPLOAD_STATE_KEY = 'edugenie_upload_state';

  isStalled = false; // For template to show stall warning
  private isPermanentlyDeleted = false;

  // ── Transcript Polling ───────────────────────────────────
  private transcriptPollInterval: any = null;
  private transcriptPollStartTime = 0;
  private readonly TRANSCRIPT_POLL_INTERVAL_MS = 5000;
  // No timeout - poll indefinitely until transcript is ready
  isPollingTranscript = false; // For template binding

  // ── Video drop-zone flags ─────────────────────────────────
  videoTouched = false;
  isDraggingVideo = false;

  // ── Draft ─────────────────────────────────────────────────
  draftId = '';
  hasDraftData = false;

  // ── Local video file (in-memory only) ────────────────────
  selectedVideoFile: File | null = null;
  selectedVideoUrl: string | null = null; // blob URL for preview
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  // ── Misc UI ───────────────────────────────────────────────
  isDeleting = false; // Kept for template compatibility
  private saveLock = false;
  /** Snapshot of form values as of the last successful save — used to detect real changes */
  private savedSnapshot: { title: string } | null = null;

  // ── THE ONE STATE ─────────────────────────────────────────
  snap: UploadSnapshot = initialSnapshot();

  // ── Upload Progress Tracking ─────────────────────────────
  private lastProgressTime = 0;
  private progressCheckInterval: any = null;

  // ── Transcript Polling ─────────────────────────────────────
  // private transcriptPollInterval: any = null;
  // private readonly TRANSCRIPT_POLL_INTERVAL_MS = 5000;
  // private readonly TRANSCRIPT_POLL_TIMEOUT_MS = 5 * 60 * 1000;
  // isPollingTranscript = false; // for template binding

  // ── Upload State Persistence ───────────────────────────────
  private persistUploadState(): void {
    if (!this.draftId || this.isPermanentlyDeleted) return;
    if (this.snap.state === 'saved' || this.snap.state === 'idle') return;
    try {
      const snapshot = {
        state: this.snap.state,
        progress: this.snap.progress,
        retryCount: this.snap.retryCount,
        videoUrl: this.snap.videoUrl,
        videoPublicId: this.snap.videoPublicId,
        message: this.snap.message,
        timestamp: Date.now()
      };
      localStorage.setItem(this.getUploadStateKey(), JSON.stringify(snapshot));
    } catch (e) {
      console.warn('[LessonCard] Failed to persist upload state:', e);
    }
  }

  private getRecoveredState(): any {
    if (!this.draftId) return null;
    try {
      const stored = localStorage.getItem(this.getUploadStateKey());
      if (!stored) return null;
      const saved = JSON.parse(stored);

      const STALE_MS = 24 * 60 * 60 * 1000;
      if (Date.now() - saved.timestamp > STALE_MS) {
        localStorage.removeItem(this.getUploadStateKey());
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  }

  private getStoredUploadStates(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.UPLOAD_STATE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }


  private clearPersistedUploadState(): void {
    if (!this.draftId) return;
    try {
      localStorage.removeItem(this.getUploadStateKey());
    } catch (e) {
      console.warn('[LessonCard] Failed to clear upload state:', e);
    }
  }

  private readonly UPLOAD_STATE_PREFIX = 'edugenie_upload_state:';
  private getUploadStateKey(): string {
    return this.UPLOAD_STATE_PREFIX + this.draftId;
  }

  // ─────────────────────────────────────────────────────────
  // Helpers – transition the state machine and trigger CD
  // ─────────────────────────────────────────────────────────
  private setState(patch: Partial<UploadSnapshot>, forceSkipPersist = false): void {
    // Prevent ANY state persistence after permanent delete
    if (this.isPermanentlyDeleted && !forceSkipPersist) {
      // console.log('[STATE] Blocked write after delete:', patch.state);
      // Still update in-memory state for UI, but don't persist
      this.snap = { ...this.snap, ...patch };
      this.cdr.markForCheck();
      return;
    }

    const oldState = this.snap.state;
    this.snap = { ...this.snap, ...patch };
    // console.log(
    //   '[STATE]',
    //   oldState,
    //   '→',
    //   this.snap.state,
    //   patch
    // );
    this.persistUploadState();
    this.cdr.markForCheck();
  }

  // ─────────────────────────────────────────────────────────
  // Upload Progress Tracking & Timeout Detection
  // ─────────────────────────────────────────────────────────
  private startProgressTracking(): void {
    this.lastProgressTime = Date.now();
    this.isStalled = false;

    // Clear any existing interval
    if (this.progressCheckInterval) {
      clearInterval(this.progressCheckInterval);
    }

    // Check for stalled uploads every 10 seconds
    this.progressCheckInterval = setInterval(() => {
      if (this.s === 'uploading') {
        const timeSinceLastProgress = Date.now() - this.lastProgressTime;
        if (timeSinceLastProgress > this.UPLOAD_TIMEOUT_MS) {
          this.isStalled = true;
          this.setState({ state: 'upload_stalled' });
        }
      }
    }, 10000);
  }

  private stopProgressTracking(): void {
    if (this.progressCheckInterval) {
      clearInterval(this.progressCheckInterval);
      this.progressCheckInterval = null;
    }
    this.isStalled = false;
  }

  private onUploadProgress(progress: number): void {
    this.lastProgressTime = Date.now();
    this.isStalled = false;
  }

  // ─────────────────────────────────────────────────────────
  // Convenience getters used in the template
  // ─────────────────────────────────────────────────────────
  get s(): LessonUploadState {
    return this.snap.state;
  }

  get isWorking(): boolean {
    return this.s === 'uploading' || this.s === 'saving' || this.s === 'retrying' || this.s === 'deleting';
  }

  get isDeletingState(): boolean {
    return this.s === 'deleting';
  }

  get isUpdateMode(): boolean {
    const v = this.lessonForm.get('id')?.value;
    return !!v && !String(v).startsWith('draft_');
  }

  get isVideoValid(): boolean {
    return !!this.selectedVideoFile || !!this.lessonForm.get('videoUrl')?.value;
  }

  get isFormValid(): boolean {
    return !!(this.lessonForm.get('title')?.valid && this.isVideoValid);
  }

  get hasFormChanges(): boolean {
    // A newly selected video always counts as a change.
    if (this.selectedVideoFile) return true;

    // No saved snapshot yet (e.g. brand-new lesson, not yet created) —
    // fall back to dirty-flag behavior so create mode isn't affected.
    if (!this.savedSnapshot) {
      return this.lessonForm.dirty;
    }

    const currentTitle = (this.lessonForm.get('title')?.value || '').trim();
    const savedTitle = (this.savedSnapshot.title || '').trim();

    return currentTitle !== savedTitle;
  }

  get shouldDisableButton(): boolean {
    if (this.s === 'upload_error' || this.s === 'max_retries_exceeded') {
      return false;
    }
    if (this.s === 'saved') {
      // Disabled until the user changes something relative to the last save;
      // re-disabled automatically if they revert back to the saved values.
      return !this.hasFormChanges;
    }
    if (this.isWorking || this.isDeleting) return true;
    if (this.s === 'save_failed') return false; // retry via save button
    if (!this.isUpdateMode) return !this.isFormValid;
    return !this.hasFormChanges || !this.isFormValid;
  }

  getButtonLabel(): string {
    switch (this.s) {
      case 'uploading':
        return 'Uploading…';
      case 'uploading_recovered':
        return 'Select Video';
      case 'saving':
      case 'retrying':
        return this.isUpdateMode ? 'Updating…' : 'Creating…';
      case 'saving_recovered':
        return 'Retry Saving';
      case 'save_failed':
        return 'Retry Save';
      case 'upload_error':
        return 'Try Again';
      case 'max_retries_exceeded':
        return 'Select Video';
      default:
        break;
    }
    if (!this.isUpdateMode) return 'Create Lesson';
    return this.hasFormChanges ? 'Update Lesson' : 'No Changes';
  }

  // ─────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────
  ngOnInit() {
    this.initDraft();

    this.lessonForm.get('videoPublicId')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      filter(v => !!v),
      take(1),
    ).subscribe(() => {
      const rawId = this.lessonForm.get('id')?.value as string | null;
      const isRealLesson = !!rawId && !rawId.startsWith('draft_');
      const transcript = this.lessonForm.get('transcript')?.value as string | null;

      if (isRealLesson && !transcript) {
        this.startTranscriptPolling(rawId!);
      }
    });
  }
  ngOnDestroy() {
    this.teardown();
  }

  private initDraft() {
    const previousDraftId = this.draftId;
    let lessonId = this.lessonForm.get('id')?.value;
    if (!lessonId) {
      lessonId = this.formDraftInteg.generateDraftId('lesson', this.sectionId);
      this.lessonForm.get('id')?.setValue(lessonId, { emitEvent: false });
    }
    this.draftId = lessonId;

    if (previousDraftId && previousDraftId !== this.draftId) {
      try {
        localStorage.removeItem(this.UPLOAD_STATE_PREFIX + previousDraftId);
      } catch { }
    }



    this.formDraftInteg.connectForm(this.lessonForm, {
      draftId: this.draftId,
      type: 'lesson',
      parentId: this.sectionId,
      excludeFields: ['id', 'expanded'],
      fileFields: [
        {
          fieldName: 'video',
          uploadType: 'video',
          validation: {
            maxSize: 500 * 1024 * 1024,
            allowedTypes: ['video'],
            maxDuration: this.MAX_DURATION,
          },
        },
      ],
      autoSave: true,
      autoSaveDelay: 1000,
    });
    this.restoreFromDraft();

    this.draftStateService
      .getDraftChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.hasDraftData = this.formDraftInteg.hasDraftData(this.draftId);
        this.cdr.markForCheck();
      });

    this.hasDraftData = this.formDraftInteg.hasDraftData(this.draftId);
  }

  /** Determine initial state from persisted draft/form data */
  private restoreFromDraft() {
    if (this.s === 'saved') return;
    // First, check for recovered upload state
    const recoveredState = this.getRecoveredState();
    const draftUrl = this.lessonForm.get('videoUrl')?.value as string | null;
    const draftPublicId = this.lessonForm.get('videoPublicId')?.value as string | null;
    const hasCloudinary = !!draftUrl && !!draftPublicId;

    // CASE A: Upload was in progress (recovered from storage but file not available)
    if (recoveredState &&
      (recoveredState.state === 'uploading' || recoveredState.state === 'uploading_recovered')) {
      // File is lost (browser security), but we can show recovered UI
      this.setState({
        state: 'uploading_recovered',
        progress: recoveredState.progress || 0,
        retryCount: recoveredState.retryCount || 0,
        videoUrl: draftUrl,
        videoPublicId: draftPublicId,
        // message: 'Upload was in progress. File is no longer available, but you can retry with a new video.'
      });
      return;
    }

    // console.log(
    //   'RESTORING',
    //   this.draftId,
    //   this.draftStateService.getDraft(this.draftId)
    // );

    // CASE B: Save was in progress/recovered
    if (recoveredState &&
      (recoveredState.state === 'saving' || recoveredState.state === 'saving_recovered')) {
      this.setState({
        state: 'saving_recovered',
        progress: recoveredState.progress || 95,
        retryCount: recoveredState.retryCount || 0,
        videoUrl: draftUrl,
        videoPublicId: draftPublicId,
        message: 'Saving was interrupted. Click to retry.'
      });
      return;
    }



    // CASE C: Has Cloudinary URL (completed upload, possibly failed save)
    if (hasCloudinary) {
      const rawId = this.lessonForm.get('id')?.value as string;
      const isDbSaved = rawId && !rawId.startsWith('draft_');

      if (isDbSaved) {
        this.savedSnapshot = { title: this.lessonForm.get('title')?.value || '' };
        this.setState({ state: 'saved', videoUrl: draftUrl, videoPublicId: draftPublicId });
      } else {
        // Cloudinary success but DB never saved → recover save_failed
        this.setState({
          state: 'save_failed',
          videoUrl: draftUrl,
          videoPublicId: draftPublicId,
          message: 'Upload succeeded but saving failed. Please retry.',
        });
      }
      return;
    }

    // Try in-memory file
    const restoredFile = this.fileDraftService.getFileFromDraft(this.draftId, 'video');
    if (restoredFile) {
      this.selectedVideoFile = restoredFile;
      this.selectedVideoUrl = this.fileDraftService.createPreviewUrl(this.draftId, 'video');
      this.setState({ state: 'video_selected' });
      return;
    }

    // Stale file reference (never reached Cloudinary)
    const draft = this.draftStateService.getDraft(this.draftId);
    const hasFileRef = draft?.files && draft.files.length > 0;
    if (hasFileRef) {
      if (draft.files) {
        draft.files = [];
        this.draftStateService.saveDraft(draft);
      }
      this.setState({
        state: 'idle',
        message: 'The original video file is no longer available. Please select the video again.',
      });
    }
    // else state stays 'idle' with no message
  }

  private teardown() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTranscriptPolling();
    this.formDraftInteg.disconnectForm(this.draftId);
    if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
    if (this.s !== 'saved' && !this.isPermanentlyDeleted) {
      this.clearPersistedUploadState();
    }
  }

  // ─────────────────────────────────────────────────────────
  // File selection
  // ─────────────────────────────────────────────────────────
  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    // Reset immediately so re-selecting the same file (or any file after rejection)
    // always triggers a fresh `change` event and the picker opens normally.
    input.value = '';
    await this.processSelectedFile(file);
  }

  private async processSelectedFile(file: File): Promise<void> {
    this.videoTouched = true;

    // MIME-type and extension check
    const allowedExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isVideoMime = !!(file.type && file.type.startsWith('video/'));
    const isVideoExtension = allowedExtensions.includes(fileExtension);

    if (!isVideoMime && !isVideoExtension) {
      this.selectedVideoFile = null;
      if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
      this.selectedVideoUrl = null;
      this.setState({
        state: 'idle',
        message: 'Please select a valid video file (e.g. MP4, MOV, WEBM). Images and other file types are not supported.',
      });
      return;
    }

    // Delete any unsaved Cloudinary asset before replacing
    if (this.snap.videoPublicId && this.s !== 'saved') {
      this.cloudinaryService.deleteAsset(this.snap.videoPublicId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    // Reset form Cloudinary fields
    this.lessonForm.patchValue({ videoUrl: null, videoPublicId: null, videoDuration: 0 });

    // Release old blob URL
    if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
    this.selectedVideoUrl = URL.createObjectURL(file);

    try {
      const duration = await this.getVideoDuration(file);

      if (duration <= 0) {
        this.selectedVideoFile = null;
        if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
        this.selectedVideoUrl = null;
        this.setState({
          state: 'idle',
          message: 'Could not read video duration or the file is corrupted. Please try another video file.',
          videoUrl: null,
          videoPublicId: null,
          progress: 0,
          retryCount: 0,
        });
        return;
      }

      if (duration > this.MAX_DURATION) {
        this.selectedVideoFile = null;
        URL.revokeObjectURL(this.selectedVideoUrl!);
        this.selectedVideoUrl = null;
        this.setState({
          state: 'idle',
          message: 'Video must not exceed 15 minutes',
          videoUrl: null,
          videoPublicId: null,
          progress: 0,
          retryCount: 0,
        });
        return;
      }

      this.selectedVideoFile = file;
      this.lessonForm.patchValue({ videoDuration: duration });

      // Store metadata reference in draft (NOT the binary file itself)
      this.fileDraftService
        .addFileToDraft(this.draftId, 'video', file, {
          maxSize: 500 * 1024 * 1024,
          allowedTypes: ['video'],
          maxDuration: this.MAX_DURATION,
        })
        .subscribe();

      this.setState({
        state: 'video_selected',
        message: '',
        videoUrl: null,
        videoPublicId: null,
        progress: 0,
        retryCount: 0,
      });
    } catch {
      this.selectedVideoFile = null;
      if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
      this.selectedVideoUrl = null;
      this.setState({ state: 'upload_error', message: 'Could not read video file.' });
    }
  }

  onVideoDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingVideo = true;
  }

  onVideoDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingVideo = false;
  }

  onVideoDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingVideo = false;
    const files = event.dataTransfer?.files;
    if (!files?.length) return;
    this.processSelectedFile(files[0]);
  }

  removeSelectedVideo() {
    // Clean up Cloudinary video if exists and not saved
    this.videoTouched = true;
    this.stopTranscriptPolling();
    const publicId = this.lessonForm.get('videoPublicId')?.value || this.snap.videoPublicId;
    if (publicId && this.s !== 'saved') {
      this.cloudinaryService.deleteAsset(publicId, 'video')
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }

    // Reset form to use draft ID (no placeholder to delete)
    const newDraftId = this.formDraftInteg.generateDraftId('lesson', this.sectionId);
    this.lessonForm.patchValue({ id: newDraftId });
    this.draftId = newDraftId;

    this.selectedVideoFile = null;
    if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);

    this.selectedVideoUrl = null;
    this.setState(initialSnapshot());
  }

  // ─────────────────────────────────────────────────────────
  // Save entry-point (main action button)
  // ─────────────────────────────────────────────────────────
  saveLesson() {
    if (this.isWorking || this.isDeleting || this.saveLock) return;

    if (this.s === 'upload_error' || this.s === 'max_retries_exceeded') {
      this.fileInputRef.nativeElement.click();
      return;
    }

    // Recover from save_failed: skip upload, go straight to DB
    if (this.s === 'save_failed') {
      this.saveLock = true;
      this.executeDbSave();
      return;
    }

    // Recover from recovery states
    if (this.s === 'uploading_recovered' || this.s === 'saving_recovered') {
      this.retryFromRecovery();
      return;
    }

    if (this.shouldDisableButton) return;

    this.saveLock = true;
    this.lessonForm.markAllAsTouched();
    this.videoTouched = true;
    if (!this.isFormValid) {
      this.saveLock = false;
      return;
    }

    this.runPipeline();
  }

  // ─────────────────────────────────────────────────────────
  // Retry button (inside video card UI)
  // ─────────────────────────────────────────────────────────
  retrySave() {
    if (this.s !== 'save_failed' || this.isWorking) return;

    if (this.snap.retryCount >= this.MAX_RETRIES) {
      this.handleMaxRetriesExceeded();
      return;
    }

    this.setState({ state: 'retrying', retryCount: this.snap.retryCount + 1 });
    this.saveLock = true;
    this.executeDbSave();
  }

  private handleMaxRetriesExceeded() {
    if (this.snap.videoPublicId) {
      this.cloudinaryService.deleteAsset(this.snap.videoPublicId)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
    this.selectedVideoFile = null;
    if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
    this.selectedVideoUrl = null;
    this.lessonForm.patchValue({ videoUrl: null, videoPublicId: null, videoDuration: 0 });
    this.saveLock = false;
    this.setState({
      ...initialSnapshot(),
      state: 'max_retries_exceeded',
      message: 'We couldn\'t save this lesson after multiple attempts. Please select the video again and try once more.',
    });
  }

  // ─────────────────────────────────────────────────────────
  // Upload pipeline
  // ─────────────────────────────────────────────────────────
  private runPipeline() {
    if (this.selectedVideoFile) {
      // Double-check duration before upload
      this.getVideoDuration(this.selectedVideoFile).then((dur) => {
        if (dur <= 0) {
          this.selectedVideoFile = null;
          this.saveLock = false;
          this.setState({ state: 'idle', message: 'Could not read video duration or the file is corrupted. Please try another video file.' });
          return;
        }
        if (dur > this.MAX_DURATION) {
          this.selectedVideoFile = null;
          this.saveLock = false;
          this.setState({ state: 'idle', message: 'Video must not exceed 15 minutes.' });
          return;
        }
        // Directly upload video - lesson will be created after upload completes
        this.startCloudinaryUpload();
      });
    } else {
      // Already have Cloudinary URL from form values
      this.executeDbSave();
    }
  }

  /**
   * Uploads video to Cloudinary directly without creating a placeholder first.
   * The lesson will be created in MongoDB only after the upload completes successfully.
   */
  private startCloudinaryUpload() {
    this.setState({ state: 'uploading', progress: 0, message: '' });
    this.startProgressTracking();
    this.toastr.warning(
      'Please stay on this page while the video is uploading. Refreshing, closing the tab, or navigating away may interrupt the upload.',
      'Uploading video',
      {
        toastClass: 'ngx-toastr toast-mauve-warning',
      }
    );

    // No placeholder lesson ID - lesson will be created after upload completes
    // We don't pass lessonId to Cloudinary since there's no placeholder to update

    this.cloudinaryService
      .uploadVideo(this.selectedVideoFile!, this.courseId, this.sectionId, undefined)
      .subscribe({
        next: ({ progress, response }) => {
          if (progress !== undefined) {
            // Track progress for stall detection
            this.onUploadProgress(progress);
            // Scale 0-95 during upload phase
            this.setState({ progress: Math.round(progress * 0.95) });
          }

          if (response) {
            this.stopProgressTracking();
            const patchData: any = {
              videoUrl: response.secure_url,
              videoPublicId: response.public_id,
            };
            if (response.duration && isFinite(response.duration)) {
              patchData.videoDuration = Math.max(1, Math.round(response.duration));
            }
            this.lessonForm.patchValue(patchData);
            this.lessonForm.markAsDirty();

            // Persist Cloudinary ref in draft BEFORE DB call
            this.formDraftInteg.saveDraftNow(this.lessonForm, {
              draftId: this.draftId,
              type: 'lesson',
              parentId: this.sectionId,
              excludeFields: ['id', 'expanded'],
            });

            this.durationChanged.emit();

            // Release local blob
            this.selectedVideoFile = null;
            if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
            this.selectedVideoUrl = null;

            this.setState({
              state: 'upload_success',
              progress: 95,
              videoUrl: response.secure_url,
              videoPublicId: response.public_id,
              message: '',
            });

            this.executeDbSave();
          }
        },
        error: (err) => {
          this.stopProgressTracking();
          console.error('[LessonCard] Cloudinary upload failed:', err);

          const title = this.lessonForm.get('title')?.value || 'lesson';
          this.toastr.error(`Video upload failed for "${this.trunc(title)}"`);

          // No placeholder to clean up - lesson is only created after upload succeeds
          // Just reset the form to use draft ID
          const newDraftId = this.formDraftInteg.generateDraftId('lesson', this.sectionId);
          this.lessonForm.patchValue({ id: newDraftId });
          this.draftId = newDraftId;

          this.selectedVideoFile = null;
          if (this.selectedVideoUrl) URL.revokeObjectURL(this.selectedVideoUrl);
          this.selectedVideoUrl = null;

          this.setState({
            state: 'upload_error',
            progress: 0,
            message: 'We couldn\'t upload the video to Cloudinary. Please check your connection and try again.',
          });
        },
      });
  }

  // ─────────────────────────────────────────────────────────
  // DB save (create or update)
  // ─────────────────────────────────────────────────────────
  private executeDbSave() {
    const rawId = this.lessonForm.get('id')?.value;
    const isDraft = rawId && String(rawId).startsWith('draft_');
    const lessonId = isDraft ? null : rawId;

    let dur = Number(this.lessonForm.get('videoDuration')?.value);
    if (!isFinite(dur) || isNaN(dur)) dur = 0;
    const finalDuration = Math.max(1, Math.round(dur));

    const payload = {
      title: this.lessonForm.get('title')?.value,
      videoUrl: this.lessonForm.get('videoUrl')?.value,
      videoPublicId: this.lessonForm.get('videoPublicId')?.value,
      videoDuration: finalDuration,
      duration: finalDuration,
      isFree: false,
    };

    // Transition to `saving` unless we're already in `retrying`
    if (this.s !== 'retrying') {
      this.setState({ state: 'saving', progress: 95 });
    }

    const req = lessonId
      ? this.lessonsService.updateLesson(this.courseId, this.sectionId, lessonId, payload)
      : this.lessonsService.addLesson(this.courseId, this.sectionId, payload);

    req
      .pipe(
        finalize(() => {
          this.saveLock = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (res: any) => {
          this.ignoreRestore = true;
          let newId: string | null = null;

          if (!lessonId) {
  newId = res.createdLessonId ?? null;

  if (newId) {
    this.lessonForm.patchValue({ id: newId });

    this.lessonForm.get('id')?.updateValueAndValidity();

    this.lessonCreated.emit({
      index: this.index,
      id: newId,
    });

    
  }
}

          this.lessonForm.markAsPristine();
          this.lessonForm.markAsUntouched();

          // Capture the just-saved values so future edits are compared against this,
          // not the one-way `dirty` flag.
          this.savedSnapshot = {
            title: this.lessonForm.get('title')?.value || '',
          };

          // Clear persisted upload state on success
          // Success — full progress + terminal saved state
          this.setState({
            state: 'saved',
            progress: 100,
            retryCount: 0,
            message: '',
            videoUrl: null,
            videoPublicId: null,
          });

          // Kick off transcript polling if this lesson has a video but no transcript yet
          const finalLessonId = lessonId || newId;
          const currentPublicId = this.lessonForm.get('videoPublicId')?.value || payload.videoPublicId;
          if (finalLessonId && currentPublicId && !this.lessonForm.get('transcript')?.value) {
            this.startTranscriptPolling(finalLessonId);
          }

          this.clearDraftAfterSave();

          // Reconnect form for future editing (for create mode, draftId now has real lesson ID)
          if (!lessonId && newId) {
            // Create mode: reconnect with new real ID so future edits work
            this.draftId = newId;
            this.formDraftInteg.connectForm(this.lessonForm, {
              draftId: this.draftId,
              type: 'lesson',
              parentId: this.sectionId,
              excludeFields: ['id', 'expanded'],
              fileFields: [
                {
                  fieldName: 'video',
                  uploadType: 'video',
                  validation: {
                    maxSize: 500 * 1024 * 1024,
                    allowedTypes: ['video'],
                    maxDuration: this.MAX_DURATION,
                  },
                },
              ],
              autoSave: true,
              autoSaveDelay: 1000,
            });
          }

          this.formDraftInteg.clearDraft({
            draftId: this.draftId,
            type: 'lesson',
            parentId: this.sectionId,
          });
          // this.initDraft();

          const title = this.lessonForm.get('title')?.value || 'Lesson';
          this.toastr.success(
            lessonId
              ? `"${this.trunc(title)}" updated successfully`
              : `"${this.trunc(title)}" created successfully`
          );

        },
        error: (err) => {
          console.error('[LessonCard] DB save failed:', err);

          const hasAsset = !!(this.snap.videoUrl || this.lessonForm.get('videoUrl')?.value);

          if (hasAsset) {
            const url = this.snap.videoUrl || this.lessonForm.get('videoUrl')?.value;
            const pid = this.snap.videoPublicId || this.lessonForm.get('videoPublicId')?.value;

            // Persist draft so recovery works after page reload
            this.formDraftInteg.saveDraftNow(this.lessonForm, {
              draftId: this.draftId,
              type: 'lesson',
              parentId: this.sectionId,
              excludeFields: ['id', 'expanded'],
            });

            this.setState({
              state: 'save_failed',
              videoUrl: url,
              videoPublicId: pid,
              message: 'Upload succeeded but saving failed. Please retry.',
            });
          } else {
            this.setState({ state: 'idle', message: '' });
          }

          const title = this.lessonForm.get('title')?.value || 'lesson';
          this.toastr.error(`Failed to save "${this.trunc(title)}". Please try again.`);
        },
      });
  }

  // ─────────────────────────────────────────────────────────
  // Delete
  // ─────────────────────────────────────────────────────────
  deleteLesson() {
    // console.log('id is:', this.lessonForm.get('id')?.value, 's is:', this.s);
    if (this.isDeleting || this.isPermanentlyDeleted) return;

    const rawId = this.lessonForm.get('id')?.value;
    const isDraft = rawId && String(rawId).startsWith('draft_');
    const lessonId = isDraft ? null : rawId;

    const hasAssetOrContent =
      !!this.snap.videoUrl ||
      !!this.lessonForm.get('videoUrl')?.value ||
      !!this.lessonForm.get('title')?.value ||
      !!this.selectedVideoFile ||
      this.s === 'save_failed';

    if (!lessonId && !hasAssetOrContent) {
      // genuinely nothing to lose — safe to skip confirm/cleanup
      this.isPermanentlyDeleted = true;
      this.isDeleting = true;
      this.clearPersistedUploadState();
      this.clearDraftAfterSave();
      this.delete.emit();

      // Reset state without persisting
      this.snap = { state: 'idle', progress: 0, retryCount: 0, videoUrl: null, videoPublicId: null, message: '' };
      this.isDeleting = false;
      this.cdr.markForCheck();
      return;
    }



    // If no saved lesson, just emit delete and clear draft
    // If no saved lesson, just emit delete and clear draft
    if (!lessonId) {
      // No real DB row can exist here (forceFail is test-only; in prod a failed
      // addLesson() means the POST never committed). But a Cloudinary asset or
      // unsaved content may still exist, so confirm before discarding it.
      const publicId = this.lessonForm.get('videoPublicId')?.value || this.snap.videoPublicId;

      if (!hasAssetOrContent) {
        // Nothing to lose at all — shouldn't normally reach here given the
        // earlier check, but keep this safe no-confirm path just in case.
        this.isPermanentlyDeleted = true;
        this.isDeleting = true;
        this.clearPersistedUploadState();
        this.clearDraftAfterSave();
        this.delete.emit();
        this.snap = { state: 'idle', progress: 0, retryCount: 0, videoUrl: null, videoPublicId: null, message: '' };
        this.isDeleting = false;
        this.cdr.markForCheck();
        return;
      }

      const ref = this.dialog.open(ConfirmDialogComponent, {
        data: { title: 'Delete Lesson?', message: 'This cannot be undone.' },
      });

      ref.afterClosed().pipe(take(1)).subscribe((result) => {
        if (result !== 'confirm') return;

        this.isPermanentlyDeleted = true;
        this.clearPersistedUploadState();
        this.setState({ state: 'deleting' });
        this.isDeleting = true;
        this.cdr.markForCheck();

        const finish = () => {
          this.clearPersistedUploadState();
          this.clearDraftAfterSave();
          this.delete.emit();
          this.isDeleting = false;
          this.snap = { state: 'idle', progress: 0, retryCount: 0, videoUrl: null, videoPublicId: null, message: '' };
          this.isPermanentlyDeleted = false;
          this.cdr.markForCheck();
        };

        if (publicId) {
          this.cloudinaryService.deleteAsset(publicId, 'video')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => console.log('[LessonCard] Cloudinary asset deleted:', publicId),
              error: (err) => console.warn('[LessonCard] Cloudinary delete failed (continuing):', err),
              complete: () => finish(),
            });
        } else {
          finish();
        }
      });
      return;
    }


    const publicId = this.lessonForm.get('videoPublicId')?.value || this.snap.videoPublicId;

    // Show confirmation dialog
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Lesson?', message: 'This cannot be undone.' },
    });

    ref.afterClosed().pipe(take(1)).subscribe((result) => {
      if (result !== 'confirm') return;

      // Mark as permanently deleted FIRST (before any async operations)
      this.isPermanentlyDeleted = true;
      this.clearPersistedUploadState();   // remove any existing entry now

      this.setState({ state: 'deleting' }); // updates in-memory snap/UI only, no localStorage write
      this.isDeleting = true;
      this.cdr.markForCheck();

      // First, try to delete Cloudinary asset if exists (non-blocking)
      const cloudinaryDelete$ = publicId
        ? this.cloudinaryService.deleteAsset(publicId, 'video')
        : null;

      // Execute delete
      const executeDelete = () => {
        this.lessonsService
          .deleteLesson(this.courseId, this.sectionId, lessonId)
          .pipe(
            takeUntil(this.destroy$),
            finalize(() => {
              // Reset UI state WITHOUT persisting anything
              this.isDeleting = false;
              this.snap = { state: 'idle', progress: 0, retryCount: 0, videoUrl: null, videoPublicId: null, message: '' };
              this.isPermanentlyDeleted = false;
              this.cdr.markForCheck();
            })
          )
          .subscribe({
            next: () => {
              this.clearPersistedUploadState();
              this.clearDraftAfterSave();
              this.delete.emit();
            },
            error: (err) => {
              console.error('[LessonCard] Delete lesson failed:', err);
              this.clearPersistedUploadState();
              this.clearDraftAfterSave();
              this.delete.emit();
            }
          });
      };

      // If Cloudinary delete exists, wait for it then proceed with DB delete
      if (cloudinaryDelete$) {
        cloudinaryDelete$
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              console.log('[LessonCard] Cloudinary asset deleted:', publicId);
            },
            error: (err) => {
              console.warn('[LessonCard] Failed to delete Cloudinary asset (continuing anyway):', err);
            },
            complete: () => {
              // Always proceed with DB delete regardless of Cloudinary result
              executeDelete();
            }
          });
      } else {
        executeDelete();
      }
    });
  }

  // ─────────────────────────────────────────────────────────
  // Draft helpers
  // ─────────────────────────────────────────────────────────
  clearDraftAfterSave() {
    this.formDraftInteg.clearDraft({
      draftId: this.draftId,
      type: 'lesson',
      parentId: this.sectionId,
    });

    this.hasDraftData = false;
  }

  // ─────────────────────────────────────────────────────────
  // Misc
  // ─────────────────────────────────────────────────────────
  onMoveUp(e: Event) {
    e.stopPropagation();
    this.moveUp.emit();
  }
  onMoveDown(e: Event) {
    e.stopPropagation();
    this.moveDown.emit();
  }

  isExpanded(): boolean {
    return this.lessonForm.get('expanded')?.value;
  }
  setExpanded(v: boolean) {
    this.lessonForm.get('expanded')?.setValue(v);
  }

  formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration || 0));
      };
      video.onerror = () => resolve(0);
    });
  }

  private trunc(name: string, max = 40): string {
    return name.length <= max ? name : name.substring(0, max) + '…';
  }

  // ─────────────────────────────────────────────────────────
  // Template-facing computed props
  // ─────────────────────────────────────────────────────────
  get showUploadingPanel(): boolean {
    return (
      this.s === 'uploading' ||
      this.s === 'upload_stalled' ||
      this.s === 'uploading_recovered' ||
      this.s === 'upload_success' ||
      this.s === 'saving' ||
      this.s === 'saving_recovered' ||
      this.s === 'retrying'
    );
  }

  get showRetryBlock(): boolean {
    return this.s === 'save_failed';
  }

  get canRetry(): boolean {
    return this.snap.retryCount < this.MAX_RETRIES;
  }

  /** Map state to the progress-bar colour class */
  get progressBarClass(): string {
    if (this.s === 'saved') return 'bg-green-500';
    if (this.s === 'save_failed' || this.s === 'upload_error' || this.s === 'max_retries_exceeded') return 'bg-red-500';
    if (this.s === 'upload_stalled') return 'bg-amber-500';
    // Return empty string - use inline style for primary color
    return '';
  }

  /** Get progress bar background color based on state */
  get progressBarStyle(): { [key: string]: string } {
    if (this.s === 'uploading' || this.s === 'uploading_recovered' || 
        this.s === 'saving' || this.s === 'saving_recovered' || this.s === 'retrying' || 
        this.s === 'upload_success') {
      return { 'background-color': 'var(--color-primary)' };
    }
    return {};
  }

  /** Whether to show a recovery message for the user */
  get isRecoveredState(): boolean {
    return this.s === 'uploading_recovered' || this.s === 'saving_recovered';
  }

  /** Label shown below the progress bar */
  get progressLabel(): string {
    switch (this.s) {
      case 'uploading':
        return `Uploading video… ${this.snap.progress}%`;
      case 'uploading_recovered':
        return 'Upload interrupted. File unavailable.';
      case 'upload_stalled':
        return 'Upload appears to be taking longer than expected. Please check your connection.';
      case 'upload_error':
        return 'We couldn\'t upload the video to Cloudinary. Please check your connection and try again.';
      case 'upload_success':
        return 'Upload complete, saving…';
      case 'saving':
        return 'Saving lesson…';
      case 'saving_recovered':
        return 'Save was interrupted. Click to retry.';
      case 'retrying':
        return 'Retrying…';
      case 'saved':
        return 'Lesson saved successfully ✓';
      case 'save_failed':
        return 'Video uploaded but lesson could not be saved. You can retry without uploading again.';
      case 'max_retries_exceeded':
        return 'We couldn\'t save this lesson after multiple attempts. Please select the video again and try once more.';
      default:
        return '';
    }
  }

  // ─────────────────────────────────────────────────────────
  // Pending Operations (for navigation guard)
  // ─────────────────────────────────────────────────────────
  hasPendingOperations(): boolean {
    return this.isWorking ||
      this.isDeleting ||
      this.s === 'uploading' ||
      this.s === 'saving' ||
      this.s === 'retrying' ||
      this.s === 'uploading_recovered' ||
      this.s === 'saving_recovered';
  }

  // ─────────────────────────────────────────────────────────
  // Recovery Actions
  // ─────────────────────────────────────────────────────────
  retryFromRecovery() {
    if (this.s === 'uploading_recovered') {
      // File is lost, user needs to select new file
      // Clear the recovered state and let user start fresh
      this.clearPersistedUploadState();
      this.setState({
        ...initialSnapshot(),
        message: 'Please select a video to upload.'
      });
    } else if (this.s === 'saving_recovered') {
      // We have the video URL/ID, just retry the save
      this.saveLock = true;
      this.executeDbSave();
    }
  }

  getPendingOperationMessage(): string {
    switch (this.s) {
      case 'uploading':
        return 'You have a video upload in progress. Leaving now may cancel the upload and leave orphaned files on Cloudinary.';
      case 'saving':
        return 'You have a lesson save in progress. Leaving now may lose your changes.';
      case 'retrying':
        return 'You have a retry operation in progress. Leaving now may leave the lesson in an inconsistent state.';
      case 'deleting':
        return 'You have a delete operation in progress. Please wait for it to complete.';
      default:
        return 'You have unsaved changes. Leaving now may lose your work.';
    }
  }

  // transcript
  // ─────────────────────────────────────────────────────────
  // Transcript Polling (RxJS-based)
  // ─────────────────────────────────────────────────────────
  private startTranscriptPolling(lessonId: string): void {
    this.stopTranscriptPolling(); // safety: clear any existing poll
    this.isPollingTranscript = true;
    this.cdr.markForCheck();

    timer(0, this.TRANSCRIPT_POLL_INTERVAL_MS).pipe(
      takeUntil(this.destroy$),
      switchMap(() =>
        this.lessonsService.getTranscriptionStatus(this.courseId, this.sectionId, lessonId).pipe(
          catchError((err) => {
            console.error('[Transcript Poll] HTTP error', err.status, err.error, {
              courseId: this.courseId,
              sectionId: this.sectionId,
              lessonId,
            });
            return of({ videoReady: true, transcriptReady: false, transcript: null });
          })
        )
      ),
      takeWhile(status => !status.transcriptReady || !status.transcript, true),
      filter(status => status.transcriptReady && !!status.transcript),
    ).subscribe({
      next: (status) => {
        if (status.transcript) {
          this.lessonForm.patchValue({ transcript: status.transcript }, { emitEvent: false });
          this.stopTranscriptPolling();
          this.toastr.success('Transcript generated successfully');
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('[LessonCard] Transcript poll failed (will retry):', err);
      },
    });
  }

  private stopTranscriptPolling(): void {
    if (this.transcriptPollInterval) {
      clearInterval(this.transcriptPollInterval);
      this.transcriptPollInterval = null;
    }
    this.isPollingTranscript = false;
  }
}