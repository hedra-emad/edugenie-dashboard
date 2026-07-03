import { Injectable, inject } from '@angular/core';
import { Observable, Subject, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, finalize, map, tap, filter } from 'rxjs/operators';
import { CloudinaryService } from './cloudinary';
import { DraftStateService, DraftFile } from './draft-state.service';

export interface FileUploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileDraftService {
  private cloudinaryService = inject(CloudinaryService);
  private draftStateService = inject(DraftStateService);

  // Upload progress tracking
  private uploadProgress$ = new BehaviorSubject<Map<string, FileUploadProgress>>(new Map());
  private uploadEvents$ = new Subject<FileUploadProgress>();

  constructor() {}

  // ═══════════════════════════════════════
  // FILE DRAFT OPERATIONS
  // ═══════════════════════════════════════

  /**
   * Add file to draft with validation
   */
  addFileToDraft(
    draftId: string, 
    fieldName: string, 
    file: File,
    validation?: {
      maxSize?: number;
      allowedTypes?: string[];
      maxDuration?: number; // for videos
    }
  ): Observable<string> {
    return new Observable(observer => {
      try {
        // Validate file if validation rules provided
        if (validation) {
          const validationError = this.validateFile(file, validation);
          if (validationError) {
            observer.error(new Error(validationError));
            return;
          }
        }

        // Store file and get file ID
        const fileId = this.draftStateService.storeFile(draftId, fieldName, file);
        
        // Initialize progress tracking
        this.initializeUploadProgress(fileId, file.name);
        
        observer.next(fileId);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Get file from draft
   */
  getFileFromDraft(draftId: string, fieldName: string): File | null {
    const fileMetadata = this.draftStateService.getFileMetadata(draftId, fieldName);
    if (!fileMetadata) return null;
    
    return this.draftStateService.getFile(fileMetadata.id);
  }

  /**
   * Remove file from draft
   */
  removeFileFromDraft(draftId: string, fieldName: string): void {
    const fileMetadata = this.draftStateService.getFileMetadata(draftId, fieldName);
    if (fileMetadata) {
      this.draftStateService.removeFile(fileMetadata.id);
      this.removeUploadProgress(fileMetadata.id);
    }
  }

  /**
   * Upload file to Cloudinary
   */
  uploadFile(
  fileId: string, 
  uploadType: 'thumbnail' | 'video', 
  ownerId?: string,
  sectionId?: string
): Observable<string> {
  const file = this.draftStateService.getFile(fileId);
  if (!file) {
    return throwError(() => new Error('File not found in draft storage'));
  }

  this.updateUploadProgress(fileId, { status: 'uploading', progress: 0 });
  this.draftStateService.updateFileStatus(fileId, 'uploading');

  let uploadObservable: Observable<any>;

  switch (uploadType) {
    case 'thumbnail':
      if (!ownerId) {
        return throwError(() => new Error('User ID required for thumbnail upload'));
      }
      uploadObservable = this.cloudinaryService.uploadThumbnail(file, ownerId);
      break;
    case 'video':
      if (!ownerId || !sectionId) {
        return throwError(() => new Error('Course ID and Section ID required for video upload'));
      }
      uploadObservable = this.cloudinaryService.uploadVideo(file, ownerId, sectionId, undefined).pipe(
        tap(event => {
          if (event.progress !== undefined) {
            this.updateUploadProgress(fileId, {
              status: 'uploading',
              progress: event.progress
            });
          }
        }),
        filter(event => !!event.response),
        map(event => event.response!)
      );
      break;
    default:
      return throwError(() => new Error('Invalid upload type'));
  }

  return uploadObservable.pipe(
    map(response => {
      const url = response.secure_url;
      this.updateUploadProgress(fileId, { status: 'uploaded', progress: 100, url });
      this.draftStateService.updateFileStatus(fileId, 'uploaded', url);
      return url;
    }),
    catchError(error => {
      const errorMessage = error?.message || 'Upload failed';
      this.updateUploadProgress(fileId, { status: 'error', progress: 0, error: errorMessage });
      this.draftStateService.updateFileStatus(fileId, 'error', undefined, errorMessage);
      return throwError(() => new Error(errorMessage));
    })
  );
}

  /**
   * Get upload progress observable
   */
  getUploadProgress(): Observable<Map<string, FileUploadProgress>> {
    return this.uploadProgress$.asObservable();
  }

  /**
   * Get upload events stream
   */
  getUploadEvents(): Observable<FileUploadProgress> {
    return this.uploadEvents$.asObservable();
  }

  /**
   * Check if file exists in draft
   */
  hasFileInDraft(draftId: string, fieldName: string): boolean {
    const fileMetadata = this.draftStateService.getFileMetadata(draftId, fieldName);
    if (!fileMetadata) return false;
    
    const file = this.draftStateService.getFile(fileMetadata.id);
    return !!file;
  }

  /**
   * Get file info from draft
   */
  getFileInfo(draftId: string, fieldName: string): DraftFile | null {
    return this.draftStateService.getFileMetadata(draftId, fieldName);
  }

  /**
   * Create blob URL for preview
   */
  createPreviewUrl(draftId: string, fieldName: string): string | null {
    const file = this.getFileFromDraft(draftId, fieldName);
    if (!file) return null;
    
    return URL.createObjectURL(file);
  }

  /**
   * Validate video duration
   */
  validateVideoDuration(file: File, maxDuration: number): Observable<boolean> {
    return new Observable(observer => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.src = URL.createObjectURL(file);
        
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          const isValid = video.duration <= maxDuration;
          observer.next(isValid);
          observer.complete();
        };
        
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          observer.next(false);
          observer.complete();
        };
      } else {
        observer.next(true);
        observer.complete();
      }
    });
  }

  // ═══════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════

  private validateFile(
    file: File, 
    validation: {
      maxSize?: number;
      allowedTypes?: string[];
      maxDuration?: number;
    }
  ): string | null {
    // Check file size
    if (validation.maxSize && file.size > validation.maxSize) {
      const maxSizeMB = Math.round(validation.maxSize / (1024 * 1024));
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    // Check file type
    if (validation.allowedTypes && validation.allowedTypes.length > 0) {
      const isAllowed = validation.allowedTypes.some(type => {
        if (type.includes('/')) {
          return file.type === type;
        } else {
          return file.type.startsWith(type + '/');
        }
      });
      
      if (!isAllowed) {
        return `File type not allowed. Allowed types: ${validation.allowedTypes.join(', ')}`;
      }
    }

    return null;
  }

  private initializeUploadProgress(fileId: string, fileName: string): void {
    const progress: FileUploadProgress = {
      fileId,
      progress: 0,
      status: 'pending'
    };
    
    const currentProgress = this.uploadProgress$.value;
    currentProgress.set(fileId, progress);
    this.uploadProgress$.next(new Map(currentProgress));
    
    this.uploadEvents$.next(progress);
  }

  private updateUploadProgress(fileId: string, update: Partial<FileUploadProgress>): void {
    const currentProgress = this.uploadProgress$.value;
    const existing = currentProgress.get(fileId);
    
    if (existing) {
      const updated = { ...existing, ...update };
      currentProgress.set(fileId, updated);
      this.uploadProgress$.next(new Map(currentProgress));
      
      this.uploadEvents$.next(updated);
    }
  }

  private removeUploadProgress(fileId: string): void {
    const currentProgress = this.uploadProgress$.value;
    currentProgress.delete(fileId);
    this.uploadProgress$.next(new Map(currentProgress));
  }

  // ═══════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════

  /**
   * Get human readable file size
   */
  getReadableFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if file type is video
   */
  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  /**
   * Check if file type is image
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Clean up blob URLs to prevent memory leaks
   */
  revokePreviewUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}