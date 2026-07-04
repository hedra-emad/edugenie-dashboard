import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Observable, Subject, debounceTime, takeUntil } from 'rxjs';
import { DraftStateService, DraftItem } from './draft-state.service';
import { FileDraftService } from './file-draft.service';
import { CloudinaryDraftCleanupService } from './cloudinary-draft-cleanup.service.ts';

export interface FormDraftConfig {
  draftId: string;
  type: 'course' | 'section' | 'lesson' | 'card';
  parentId?: string;
  excludeFields?: string[];
  fileFields?: {
    fieldName: string;
    uploadType: 'thumbnail' | 'video';
    validation?: {
      maxSize?: number;
      allowedTypes?: string[];
      maxDuration?: number;
    };
  }[];
  autoSave?: boolean;
  autoSaveDelay?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FormDraftIntegrationService {
  private formSubscriptions = new Map<string, Subject<void>>();
  private originalFormValues = new Map<string, any>();

  constructor(
    private draftStateService: DraftStateService,
    private fileDraftService: FileDraftService,
    private cloudinaryCleanup: CloudinaryDraftCleanupService,
  ) {}

  // ═══════════════════════════════════════
  // FORM INTEGRATION
  // ═══════════════════════════════════════

  /**
   * Connect form to draft system
   */
  connectForm(form: FormGroup, config: FormDraftConfig): void {
    // Clean up existing subscription if any
    this.disconnectForm(config.draftId);

    // Create destroy subject for this form
    const destroy$ = new Subject<void>();
    this.formSubscriptions.set(config.draftId, destroy$);

    // Store original form values before loading draft
    this.originalFormValues.set(config.draftId, form.getRawValue());

    // Load existing draft data
    this.loadDraftToForm(form, config);

    // Set up form change listeners
    if (config.autoSave !== false) {
      this.setupFormChangeListener(form, config, destroy$);
    }

    // Set up file field listeners
    if (config.fileFields) {
      this.setupFileFieldListeners(form, config, destroy$);
    }
  }

  /**
   * Disconnect form from draft system
   */
  disconnectForm(draftId: string): void {
    const destroy$ = this.formSubscriptions.get(draftId);
    if (destroy$) {
      destroy$.next();
      destroy$.complete();
      this.formSubscriptions.delete(draftId);
    }
    this.originalFormValues.delete(draftId);
  }

  /**
   * Save form data to draft immediately
   */
  saveDraftNow(form: FormGroup, config: FormDraftConfig): void {
    const formData = this.getFormDataForDraft(form, config);

    this.draftStateService.saveDraft({
      id: config.draftId,
      type: config.type,
      parentId: config.parentId,
      data: formData,
    });
  }

  /**
   * Load draft data into form
   */
  loadDraftToForm(form: FormGroup, config: FormDraftConfig): void {
    const draft = this.draftStateService.getDraft(config.draftId);
    if (!draft || !draft.data) return;

    try {
      // Load regular form data
      Object.keys(draft.data).forEach((key) => {
        if (form.contains(key) && !this.isExcludedField(key, config)) {
          const control = form.get(key);
          if (control) {
            control.setValue(draft.data[key], { emitEvent: false });
          }
        }
      });

      // Handle file fields separately
      if (config.fileFields && draft.files) {
        for (const fileField of config.fileFields) {
          const fileMetadata = draft.files.find((f) => f.fieldName === fileField.fieldName);
          if (fileMetadata) {
            this.handleFileRestore(form, fileField.fieldName, fileMetadata, config);
          }
        }
      }

      // Mark form as dirty or pristine depending on draft state
      if (draft.isDirty) {
        form.markAsDirty();
        // Also mark controls populated from draft as dirty, but ONLY if they actually have a value
        Object.keys(draft.data).forEach((key) => {
          if (form.contains(key) && !this.isExcludedField(key, config)) {
            const val = draft.data[key];
            // Only mark as dirty if it has a non-empty value, or it's a number/boolean
            if (val !== null && val !== undefined && val !== '') {
              form.get(key)?.markAsDirty();
            }
          }
        });
      } else {
        form.markAsPristine();
      }
    } catch (error) {
      console.warn('Failed to load draft data to form:', error);
    }
  }

  /**
   * Clear draft data for form
   */
  clearDraft(config: FormDraftConfig): void {
    const draft = this.draftStateService.getDraft(config.draftId);

    if (draft) {
      // const cleanup = inject(CloudinaryDraftCleanupService);
      this.cloudinaryCleanup.cleanupDraft(draft);
    }

    this.draftStateService.removeDraft(config.draftId);
    this.disconnectForm(config.draftId);
  }

  /**
   * Handle file upload for draft
   */
  handleFileUpload(
    form: FormGroup,
    config: FormDraftConfig,
    fieldName: string,
    file: File,
  ): Observable<string> {
    const fileField = config.fileFields?.find((f) => f.fieldName === fieldName);
    if (!fileField) {
      throw new Error(`File field ${fieldName} not configured in draft config`);
    }

    return this.fileDraftService.addFileToDraft(
      config.draftId,
      fieldName,
      file,
      fileField.validation,
    );
  }

  /**
   * Upload files from draft
   */
  uploadDraftFiles(
    config: FormDraftConfig,
    courseId?: string,
    sectionId?: string,
  ): Observable<Record<string, string>> {
    return new Observable((observer) => {
      const draft = this.draftStateService.getDraft(config.draftId);
      if (!draft?.files || draft.files.length === 0) {
        observer.next({});
        observer.complete();
        return;
      }

      const results: Record<string, string> = {};
      const uploadPromises: Promise<void>[] = [];

      for (const fileMetadata of draft.files) {
        if (fileMetadata.status === 'uploaded' && fileMetadata.url) {
          results[fileMetadata.fieldName] = fileMetadata.url;
          continue;
        }

        if (fileMetadata.status === 'pending') {
          const fileField = config.fileFields?.find((f) => f.fieldName === fileMetadata.fieldName);
          if (fileField) {
            const uploadPromise = this.fileDraftService
              .uploadFile(fileMetadata.id, fileField.uploadType, courseId, sectionId)
              .toPromise()
              .then((url) => {
                if (url) {
                  results[fileMetadata.fieldName] = url;
                }
              })
              .catch((error) => {
                console.error(`Failed to upload file ${fileMetadata.fieldName}:`, error);
              });

            uploadPromises.push(uploadPromise);
          }
        }
      }

      if (uploadPromises.length === 0) {
        observer.next(results);
        observer.complete();
      } else {
        Promise.all(uploadPromises)
          .then(() => {
            observer.next(results);
            observer.complete();
          })
          .catch((error) => {
            observer.error(error);
          });
      }
    });
  }

  /**
   * Check if form has draft data
   */
  hasDraftData(draftId: string): boolean {
    return this.draftStateService.hasUnsavedChanges(draftId);
  }

  /**
   * Get draft item
   */
  getDraftItem(draftId: string): DraftItem | null {
    return this.draftStateService.getDraft(draftId);
  }

  // ═══════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════

  private setupFormChangeListener(
    form: FormGroup,
    config: FormDraftConfig,
    destroy$: Subject<void>,
  ): void {
    const delay = config.autoSaveDelay || 1000;

    const checkAndSaveDraft = () => {
      const originalValue = this.originalFormValues.get(config.draftId);
      const currentValue = form.getRawValue();

      let hasChanges = false;

      Object.keys(currentValue).forEach((key) => {
        if (!this.isExcludedField(key, config)) {
          const normalize = (v: any) =>
            v === null || v === undefined || v === '' ? null : JSON.stringify(v);
          const isChanged = normalize(currentValue[key]) !== normalize(originalValue?.[key]);

          if (isChanged) {
            hasChanges = true;
          } else {
            // Reverted to original value -> mark as pristine
            const control = form.get(key);
            if (control?.dirty) {
              control.markAsPristine();
            }
          }
        }
      });

      if (hasChanges) {
        if (form.dirty) {
          this.saveDraftNow(form, config);
        }
      } else {
        // Form is fully reverted to original state
        form.markAsPristine();
        this.draftStateService.removeDraft(config.draftId);
      }
    };

    form.valueChanges.pipe(debounceTime(delay), takeUntil(destroy$)).subscribe(() => {
      checkAndSaveDraft();
    });

    // Also save on status changes (validation state changes)
    form.statusChanges.pipe(debounceTime(delay), takeUntil(destroy$)).subscribe(() => {
      checkAndSaveDraft();
    });
  }

  private setupFileFieldListeners(
    form: FormGroup,
    config: FormDraftConfig,
    destroy$: Subject<void>,
  ): void {
    // Listen for file changes in file fields
    for (const fileField of config.fileFields!) {
      const control = form.get(fileField.fieldName);
      if (control) {
        control.valueChanges.pipe(takeUntil(destroy$)).subscribe((value) => {
          // Update draft when file field changes
          this.saveDraftNow(form, config);
        });
      }
    }
  }

  private getFormDataForDraft(form: FormGroup, config: FormDraftConfig): any {
    const formData = { ...form.getRawValue() };

    // Remove excluded fields
    if (config.excludeFields) {
      for (const field of config.excludeFields) {
        delete formData[field];
      }
    }

    // Remove file fields from regular data (handled separately)
    if (config.fileFields) {
      for (const fileField of config.fileFields) {
        delete formData[fileField.fieldName];
      }
    }

    return formData;
  }

  private isExcludedField(fieldName: string, config: FormDraftConfig): boolean {
    if (config.excludeFields?.includes(fieldName)) return true;
    if (config.fileFields?.some((f) => f.fieldName === fieldName)) return true;
    return false;
  }

  private handleFileRestore(
    form: FormGroup,
    fieldName: string,
    fileMetadata: any,
    config: FormDraftConfig,
  ): void {
    // Check if file still exists in memory
    const file = this.fileDraftService.getFileFromDraft(config.draftId, fieldName);

    if (file) {
      // File exists, create preview URL if needed
      const previewUrl = this.fileDraftService.createPreviewUrl(config.draftId, fieldName);

      // Update form with file information
      const control = form.get(fieldName);
      if (control) {
        control.setValue(
          {
            file: file,
            preview: previewUrl,
            metadata: fileMetadata,
          },
          { emitEvent: false },
        );
      }
    } else {
      // File doesn't exist in memory, show message to user
      console.warn(`File ${fileMetadata.name} not found in memory. User needs to re-upload.`);

      // Could emit an event here to show notification to user
      // or set a flag in the form to show missing file indicator
    }
  }

  // ═══════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════

  /**
   * Generate draft ID for form
   */
  generateDraftId(type: string, parentId?: string, existingId?: string): string {
    if (existingId && !this.draftStateService.isDraftId(existingId)) {
      return existingId; // Use existing real ID
    }

    return this.draftStateService.generateDraftId(type, parentId);
  }

  /**
   * Clean up all form subscriptions
   */
  cleanup(): void {
    for (const [draftId, destroy$] of this.formSubscriptions) {
      destroy$.next();
      destroy$.complete();
    }
    this.formSubscriptions.clear();
  }
}
