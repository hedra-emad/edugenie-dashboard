import {
    Component, Input, Output, EventEmitter,
    signal, inject, OnDestroy, ChangeDetectionStrategy,
    ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CloudinaryService, VideoUploadEvent } from '../../../../core/services/cloudinary';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';

export interface PreviewVideoResult {
    url: string;
    publicId: string;
}

@Component({
    selector: 'app-preview-video-upload',
    standalone: true,
    imports: [CommonModule, MatIconModule, AppLoader],
    templateUrl: './preview-video-upload.component.html',
    styleUrl: './preview-video-upload.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewVideoUploadComponent implements OnDestroy {
    @Input({ required: true }) resourceType!: 'course' | 'section';
    @Input({ required: true }) ownerId!: string;
    @Input() existingUrl: string | null = null;
    @Input() existingPublicId: string | null = null;

    /** Emitted when a file is selected (before upload) — parent marks form dirty */
    @Output() fileSelected = new EventEmitter<File>();
    /** Emitted after a successful Cloudinary upload */
    @Output() uploaded = new EventEmitter<PreviewVideoResult>();
    /** Emitted when the user removes the existing/uploaded preview */
    @Output() removed = new EventEmitter<void>();

    private cloudinaryService = inject(CloudinaryService);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    expanded = signal(false);

    // Upload state (mirrors lesson-card pattern)
    uploadState: 'idle' | 'uploading' | 'upload_error' | 'done' = 'idle';
    uploadProgress = 0;
    uploadError: string | null = null;
    videoError: string | null = null;

    // Selected file (not yet uploaded)
    selectedFile: File | null = null;
    selectedFileUrl: string | null = null; // blob preview URL

    get hasVideo(): boolean {
        return !!this.existingUrl;
    }

    get isUploading(): boolean {
        return this.uploadState === 'uploading';
    }

    toggle() {
        this.expanded.set(!this.expanded());
    }

    onFileSelected(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        (event.target as HTMLInputElement).value = ''; // reset so same file can be re-selected
        if (!file) return;
        this.handleFile(file);
    }

    private handleFile(file: File) {
        this.videoError = null;
        this.uploadError = null;
        this.uploadState = 'idle';

        if (!file.type.startsWith('video/')) {
            this.videoError = 'Please upload a valid video file (MP4, MOV…)';
            this.cdr.markForCheck();
            return;
        }

        const maxSize = 200 * 1024 * 1024;
        if (file.size > maxSize) {
            this.videoError = 'Video must be less than 200MB';
            this.cdr.markForCheck();
            return;
        }

        // Release old blob URL
        if (this.selectedFileUrl) URL.revokeObjectURL(this.selectedFileUrl);
        this.selectedFile = file;
        this.selectedFileUrl = URL.createObjectURL(file);

        // Notify parent to mark form dirty — actual upload happens on save
        this.fileSelected.emit(file);
        this.cdr.markForCheck();
    }

    removeFile() {
        if (this.selectedFileUrl) URL.revokeObjectURL(this.selectedFileUrl);
        this.selectedFile = null;
        this.selectedFileUrl = null;
        this.uploadState = 'idle';
        this.uploadError = null;
        this.videoError = null;
        this.cdr.markForCheck();
    }

    removeExisting() {
        this.removed.emit();
    }

    /**
     * Called by the PARENT (course-basic-info / section-card) on save.
     * Returns a Promise that resolves with the upload result or null if no file.
     */
    uploadIfNeeded(): Promise<PreviewVideoResult | null> {
        if (!this.selectedFile) return Promise.resolve(null);

        return new Promise((resolve, reject) => {
            this.uploadState = 'uploading';
            this.uploadProgress = 0;
            this.uploadError = null;
            this.cdr.markForCheck();

            this.cloudinaryService.uploadPreviewVideo(
                this.selectedFile!,
                this.resourceType,
                this.ownerId,
                this.existingPublicId
            )
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (event: VideoUploadEvent) => {
                        if (event.progress !== undefined) {
                            this.uploadProgress = event.progress;
                            this.cdr.markForCheck();
                        }
                        if (event.response) {
                            this.uploadState = 'done';
                            this.uploadProgress = 100;

                            // Release blob URL
                            if (this.selectedFileUrl) URL.revokeObjectURL(this.selectedFileUrl);
                            this.selectedFile = null;
                            this.selectedFileUrl = null;

                            const result: PreviewVideoResult = {
                                url: event.response.secure_url,
                                publicId: event.response.public_id,
                            };

                            this.existingUrl = result.url;
                            this.existingPublicId = result.publicId;
                            this.uploaded.emit(result);
                            this.cdr.markForCheck();
                            resolve(result);
                        }
                    },
                    error: () => {
                        this.uploadState = 'upload_error';
                        this.uploadError = 'Preview video upload failed. Please try again.';
                        this.cdr.markForCheck();
                        reject(new Error(this.uploadError!));
                    }
                });
        });
    }

    ngOnDestroy() {
        if (this.selectedFileUrl) URL.revokeObjectURL(this.selectedFileUrl);
        this.destroy$.next();
        this.destroy$.complete();
    }
}