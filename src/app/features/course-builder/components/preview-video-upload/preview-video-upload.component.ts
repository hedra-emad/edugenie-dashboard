import {
    Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormGroup, AbstractControl } from '@angular/forms';
import { Subject, Observable, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CloudinaryService, VideoUploadEvent } from '../../../../core/services/cloudinary';
import { FileDraftService } from '../../../../core/services/file-draft.service';
import {
    PreviewVideoUploadSnapshot,
    initialSnapshot,
} from './preview-video-upload.model';

@Component({
    selector: 'app-preview-video-upload',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './preview-video-upload.component.html',
    styleUrl: './preview-video-upload.component.css'
})
export class PreviewVideoUploadComponent implements OnInit, OnDestroy {
    /** 'course' or 'section' — determines the Cloudinary folder */
    @Input({ required: true }) resourceType!: 'course' | 'section';
    /** The courseId or sectionId (used as draftId as well) */
    @Input({ required: true }) ownerId!: string;
    /** Parent form containing previewVideoUrl and previewVideoPublicId controls */
    @Input({ required: true }) parentForm!: FormGroup;

    /** Emits the upload progress (0–100) while uploading is active. Emits -1 on error. */
    @Output() uploadStarted = new EventEmitter<void>();
    /** Emits the current upload progress percentage (0–100). */
    @Output() uploadProgress = new EventEmitter<number>();
    /** Emits when the upload completes successfully. */
    @Output() uploadComplete = new EventEmitter<void>();
    /** Emits when the upload fails. */
    @Output() uploadError = new EventEmitter<void>();

    private cloudinaryService = inject(CloudinaryService);
    private fileDraftService = inject(FileDraftService);
    private destroy$ = new Subject<void>();

    expanded = signal(false);
    videoError: string | null = null;

    // Drag-and-drop state
    isDragging = signal(false);
    private dragCounter = 0;

    // Local state / file
    selectedFile: File | null = null;
    localPreviewUrl: string | null = null;

    // Backup for undo functionality
    private backupSelectedFile: File | null = null;
    private backupLocalPreviewUrl: string | null = null;

    /**
     * Snapshot of the currently-saved video (url + publicId), captured the
     * moment a replacement file is selected — BEFORE the form gets overwritten
     * with the placeholder filename. Exists solely so discardReplacement() can
     * restore the true saved state. Null whenever there is no pending replacement.
     */
    private originalSavedVideo: { url: string; publicId: string } | null = null;

    /**
     * Tracks the public ID of the OLD video that should be deleted from Cloudinary
     * AFTER a successful save. Populated when the user replaces or removes a video.
     * The parent component reads this after its API call succeeds.
     */
    pendingDeletePublicId: string | null = null;

    /**
     * Pure UI flag: the user clicked "Remove Video" but the form has NOT been saved yet.
     * When true, the video player is shown greyed-out with an undo option.
     * The form controls are NOT touched — only the parent save flow reads this flag
     * to decide whether to send null in the payload.
     */
    markedForDeletion = signal(false);

    // State machine snapshot
    private snapshotState = signal<PreviewVideoUploadSnapshot>(initialSnapshot());

    get snapshot(): PreviewVideoUploadSnapshot {
        return this.snapshotState();
    }

    get previewVideoUrlControl(): AbstractControl | null {
        return this.parentForm?.get('previewVideoUrl');
    }

    get previewVideoPublicIdControl(): AbstractControl | null {
        return this.parentForm?.get('previewVideoPublicId');
    }

    get hasVideo(): boolean {
        return !!this.previewVideoUrlControl?.value || !!this.selectedFile;
    }

    /** Check if there's a saved video in the database (not just a locally selected file) */
    get hasSavedVideo(): boolean {
        const url = this.previewVideoUrlControl?.value;
        const publicId = this.previewVideoPublicIdControl?.value;
        // A saved video has both URL and publicId from the database
        // If we only have a local file (selectedFile), it's not saved yet
        return !!(url && publicId && !this.selectedFile);
    }

    /** The URL to display in the video player (local blob or remote URL). */
    get previewUrl(): string | null {
        if (this.localPreviewUrl) return this.localPreviewUrl;
        return this.previewVideoUrlControl?.value || null;
    }

    /**
     * True when the user has selected a local file to replace an EXISTING saved
     * video, and that replacement has not yet been uploaded. This is what
     * distinguishes "replacing a saved video" (→ show Discard) from "uploading
     * for the very first time" (→ no saved video to fall back to, so no Discard).
     */
    get hasPendingReplacement(): boolean {
        return !!this.selectedFile && !!this.originalSavedVideo;
    }

    ngOnInit() {
        const url = this.previewVideoUrlControl?.value;
        const publicId = this.previewVideoPublicIdControl?.value;

        // Restore from draft system (file selected before saving)
        const draftFile = this.fileDraftService.getFileFromDraft(this.ownerId, 'previewVideo');
        if (draftFile) {
            this.selectedFile = draftFile;
            this.localPreviewUrl = URL.createObjectURL(draftFile);
            this.updateSnapshot({ state: 'video_selected', message: 'Local video draft restored' });

            // Mark the URL control dirty so the parent "Update" button activates
            this.previewVideoUrlControl?.setValue(draftFile.name);
            this.previewVideoUrlControl?.markAsDirty();
            this.previewVideoUrlControl?.updateValueAndValidity();

            if (publicId) {
                this.pendingDeletePublicId = publicId;
            }
        } else if (url) {
            this.updateSnapshot({ state: 'saved' });
            this.expanded.set(true);
        } else {
            this.updateSnapshot({ state: 'idle' });
        }

        // React to external form value changes (e.g. form population from API)
        if (this.previewVideoUrlControl) {
            this.previewVideoUrlControl.valueChanges
                .pipe(takeUntil(this.destroy$))
                .subscribe((newUrl) => {
                    // Only transition if we aren't managing the state ourselves
                    if (newUrl && this.snapshot.state === 'idle' && !this.markedForDeletion()) {
                        this.updateSnapshot({ state: 'saved' });
                        this.expanded.set(true);
                    } else if (!newUrl && this.snapshot.state === 'saved' && !this.markedForDeletion()) {
                        this.updateSnapshot({ state: 'idle' });
                    }
                });
        }
    }

    toggle() {
        this.expanded.set(!this.expanded());
    }

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        this.handleFile(file);
        (event.target as HTMLInputElement).value = '';
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter = 0;
        this.isDragging.set(false);
        const file = event.dataTransfer?.files?.[0];
        if (!file) return;
        this.handleFile(file);
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging.set(true);
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter--;
        if (this.dragCounter === 0) {
            this.isDragging.set(false);
        }
    }

    onDragEnter(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.dragCounter++;
        this.isDragging.set(true);
    }

    private handleFile(file: File) {
        this.videoError = null;

        if (!file.type.startsWith('video/')) {
            this.videoError = 'Please upload a valid video file.';
            return;
        }

        const maxSize = 200 * 1024 * 1024; // 200 MB
        if (file.size > maxSize) {
            this.videoError = 'Video must be less than 200 MB.';
            return;
        }

        // Revoke previous local preview
        if (this.localPreviewUrl) {
            URL.revokeObjectURL(this.localPreviewUrl);
        }

        // Capture the currently-saved video BEFORE this call overwrites the form,
        // but only the first time — if a replacement is already pending, keep the
        // original backup so re-selecting a different file doesn't lose the true
        // saved state.
        if (!this.originalSavedVideo && this.hasSavedVideo) {
            const savedUrl = this.previewVideoUrlControl?.value;
            const savedPublicId = this.previewVideoPublicIdControl?.value;
            if (savedUrl && savedPublicId) {
                this.originalSavedVideo = { url: savedUrl, publicId: savedPublicId };
            }
        }

        this.selectedFile = file;
        this.localPreviewUrl = URL.createObjectURL(file);

        // If user was in "remove" state, cancel it — they chose a new file instead
        this.markedForDeletion.set(false);

        // Track old public ID for deferred Cloudinary deletion
        const currentPublicId = this.previewVideoPublicIdControl?.value;
        if (currentPublicId) {
            this.pendingDeletePublicId = currentPublicId;
        }

        // Persist file in draft system so it survives a page refresh
        this.fileDraftService.addFileToDraft(this.ownerId, 'previewVideo', file, {
            maxSize: 200 * 1024 * 1024,
            allowedTypes: ['video']
        }).subscribe();

        this.updateSnapshot({ state: 'video_selected', progress: 0, message: 'Video selected' });

        // Set a placeholder value and mark dirty so the parent "Update" button activates
        this.previewVideoUrlControl?.setValue(file.name);
        this.previewVideoUrlControl?.markAsDirty();
        this.previewVideoUrlControl?.updateValueAndValidity();
    }

    /**
     * Marks the video for removal WITHOUT touching the form controls.
     * The actual payload (null values) is set by the parent at save time.
     * The Cloudinary DELETE call is also deferred to after a successful save.
     */
    removeVideo() {
        // If there's no saved video in DB, just clear the local state and return to idle
        if (!this.hasSavedVideo) {
            // Clear local file and preview
            if (this.selectedFile) {
                this.fileDraftService.removeFileFromDraft(this.ownerId, 'previewVideo');
                this.selectedFile = null;
            }
            if (this.localPreviewUrl) {
                URL.revokeObjectURL(this.localPreviewUrl);
                this.localPreviewUrl = null;
            }

            // Clear form values and return to idle state
            this.previewVideoUrlControl?.setValue(null);
            this.previewVideoUrlControl?.markAsPristine();
            this.previewVideoUrlControl?.updateValueAndValidity();
            
            this.previewVideoPublicIdControl?.setValue(null);
            this.previewVideoPublicIdControl?.markAsPristine();
            this.previewVideoPublicIdControl?.updateValueAndValidity();

            this.originalSavedVideo = null;
            this.updateSnapshot({ state: 'idle', message: '' });
            return;
        }

        // If there's a saved video, mark it for deletion (with undo option)
        // Record the public ID to be deleted later (after save)
        const currentPublicId = this.previewVideoPublicIdControl?.value;
        if (currentPublicId) {
            this.pendingDeletePublicId = currentPublicId;
        }

        // Backup current state before clearing for undo functionality
        this.backupSelectedFile = this.selectedFile;
        this.backupLocalPreviewUrl = this.localPreviewUrl;

        // Clear any local draft file (but don't remove from draft service yet, for undo)
        this.selectedFile = null;
        this.localPreviewUrl = null;

        // Mark the FORM dirty so the "Update" button activates,
        // but keep the actual values intact — they'll only be cleared
        // in the payload at save time, not in the form itself.
        this.previewVideoUrlControl?.markAsDirty();
        this.previewVideoUrlControl?.updateValueAndValidity();

        this.originalSavedVideo = null;
        this.markedForDeletion.set(true);
        this.updateSnapshot({ state: 'saved' });
    }

    /** Undo a pending removal before the user hits Save. */
    undoRemoveVideo() {
        this.pendingDeletePublicId = null;
        this.markedForDeletion.set(false);

        // Restore backed up file and preview URL
        if (this.backupSelectedFile && this.backupLocalPreviewUrl) {
            this.selectedFile = this.backupSelectedFile;
            this.localPreviewUrl = this.backupLocalPreviewUrl;
            this.updateSnapshot({ state: 'video_selected', message: 'Video restored' });
        } else {
            // If there was a saved video in the form (no local file), just restore the state
            const url = this.previewVideoUrlControl?.value;
            this.updateSnapshot({ state: url ? 'saved' : 'idle' });
        }

        // Clear backups
        this.backupSelectedFile = null;
        this.backupLocalPreviewUrl = null;

        // No need to restore controls — they were never cleared
        this.previewVideoUrlControl?.markAsPristine();
        this.previewVideoUrlControl?.updateValueAndValidity();
    }

    /**
     * Discards a PENDING REPLACEMENT ONLY. Restores the original saved video's
     * form values exactly as they were before the user picked a replacement file.
     * Does NOT mark anything for deletion, does NOT call Cloudinary, does NOT
     * touch pendingDeletePublicId beyond clearing it, and does NOT affect the
     * saved video in the database in any way. No-op if there is no pending
     * replacement (defensive guard).
     */
    discardReplacement() {
        if (!this.hasPendingReplacement || !this.originalSavedVideo) {
            return;
        }

        this.videoError = null;

        // Drop the pending local file from the draft system entirely.
        this.fileDraftService.removeFileFromDraft(this.ownerId, 'previewVideo');

        if (this.localPreviewUrl) {
            URL.revokeObjectURL(this.localPreviewUrl);
        }
        this.selectedFile = null;
        this.localPreviewUrl = null;

        // Restore the form to exactly what was saved before the replacement began.
        this.previewVideoUrlControl?.setValue(this.originalSavedVideo.url);
        this.previewVideoUrlControl?.markAsPristine();
        this.previewVideoUrlControl?.updateValueAndValidity();

        this.previewVideoPublicIdControl?.setValue(this.originalSavedVideo.publicId);
        this.previewVideoPublicIdControl?.markAsPristine();
        this.previewVideoPublicIdControl?.updateValueAndValidity();

        // Nothing needs to be deleted from Cloudinary — the replacement never happened.
        this.pendingDeletePublicId = null;

        this.originalSavedVideo = null;

        this.updateSnapshot({ state: 'saved', progress: 0, message: 'Replacement discarded' });
    }

    /**
     * Called by the parent AFTER a successful save.
     * Clears transient state so the component reflects the newly persisted data.
     */
    resetAfterSave() {
        this.markedForDeletion.set(false);
        this.pendingDeletePublicId = null;
        
        // Clear backups since save is complete
        this.backupSelectedFile = null;
        this.backupLocalPreviewUrl = null;
        this.originalSavedVideo = null;

        // If video was marked for deletion and saved, actually remove from draft now
        if (!this.previewVideoUrlControl?.value) {
            this.fileDraftService.removeFileFromDraft(this.ownerId, 'previewVideo');
        }

        const url = this.previewVideoUrlControl?.value;
        this.updateSnapshot({ state: url ? 'saved' : 'idle' });
    }

    /**
     * Uploads the selected file to Cloudinary.
     * Returns an Observable that emits { url, publicId } on success, or null if
     * no upload is needed (no file selected, or marked for deletion).
     * Called by the parent just before it sends the save/update API request.
     */
    upload(): Observable<{ url: string; publicId: string } | null> {
        if (!this.selectedFile) {
            return of(null);
        }

        this.updateSnapshot({ state: 'uploading', progress: 0, message: 'Uploading preview video...' });
        this.uploadStarted.emit();
        this.uploadProgress.emit(0);

        return new Observable<{ url: string; publicId: string } | null>((subscriber) => {
            this.cloudinaryService.uploadPreviewVideo(
                this.selectedFile!,
                this.resourceType,
                this.ownerId,
                this.pendingDeletePublicId || undefined
            )
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (event: VideoUploadEvent) => {
                    if (event.progress !== undefined) {
                        this.updateSnapshot({ progress: event.progress });
                        this.uploadProgress.emit(event.progress);
                    }
                    if (event.response) {
                        const url = event.response.secure_url;
                        const publicId = event.response.public_id;

                        this.updateSnapshot({ state: 'saved', progress: 100, message: 'Upload Complete' });
                        this.uploadProgress.emit(100);
                        this.uploadComplete.emit();

                        this.fileDraftService.removeFileFromDraft(this.ownerId, 'previewVideo');
                        this.selectedFile = null;
                        this.originalSavedVideo = null;
                        if (this.localPreviewUrl) {
                            URL.revokeObjectURL(this.localPreviewUrl);
                            this.localPreviewUrl = null;
                        }

                        subscriber.next({ url, publicId });
                        subscriber.complete();
                    }
                },
                error: (err) => {
                    this.updateSnapshot({ state: 'upload_error', message: 'Upload failed. Please try again.' });
                    this.uploadProgress.emit(-1);
                    this.uploadError.emit();
                    subscriber.error(err);
                }
            });
        });
    }

    private updateSnapshot(changes: Partial<PreviewVideoUploadSnapshot>) {
        this.snapshotState.update(current => ({ ...current, ...changes }));
    }

    ngOnDestroy() {
        if (this.localPreviewUrl) {
            URL.revokeObjectURL(this.localPreviewUrl);
        }
        this.destroy$.next();
        this.destroy$.complete();
    }
}