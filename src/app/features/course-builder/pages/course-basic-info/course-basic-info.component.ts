import { Component, Input, ElementRef, signal, inject, DestroyRef, effect, OnInit, OnDestroy, ViewChild, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CategorySelectorComponent } from '../../components/category-selector/category-selector.component';
import { GoalsInputComponent } from '../../components/goals-input/goals-input.component';
import { RequirementsInputComponent } from '../../components/requirements-input/requirements-input.component';
import { Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../../../../core/services/courses';
import { CloudinaryService, SignatureResponse, CloudinaryUploadResponse } from '../../../../core/services/cloudinary';
import { FormBuilder } from '@angular/forms';
import { CreateCoursePayload } from '../../../../core/models/course.model';
import { ActionBarComponent } from "../../components/shared/action-bar/action-bar.component";
import { Subject, of, Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { takeUntil, switchMap } from 'rxjs/operators';
import { CourseLevel } from '../../../../core/enums/course-level.enum';
import { ToastrService } from 'ngx-toastr';
import { CourseBuilderPageComponent } from '../course-builder-page/course-builder-page.component';
import { AppLoader } from '../../../../shared/components/add-loader/app-loader';

import { DraftStateService } from '../../../../core/services/draft-state.service';
import { FormDraftIntegrationService } from '../../../../core/services/form-draft-integration.service';
import { FileDraftService } from '../../../../core/services/file-draft.service';
import { PreviewVideoUploadComponent } from "../../components/preview-video-upload/preview-video-upload.component";
import { AuthService } from '../../../../core/services/auth.service';


@Component({
  selector: 'app-course-basic-info',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    CategorySelectorComponent,
    GoalsInputComponent,
    RequirementsInputComponent,
    ActionBarComponent,
    AppLoader,
    PreviewVideoUploadComponent,
  ],
  templateUrl: './course-basic-info.component.html',
  styleUrl: './course-basic-info.component.css'
})

export class CourseBasicInfoComponent implements OnInit, OnDestroy {

  private coursesService = inject(CoursesService);
  router = inject(Router);
  private cloudinaryService = inject(CloudinaryService);
  isDragging = signal(false);
  private destroyRef = inject(DestroyRef);
  private draftStateService = inject(DraftStateService);
  private formDraftIntegration = inject(FormDraftIntegrationService);
  private fileDraftService = inject(FileDraftService);
 private authService = inject(AuthService);
  // Preview Video Fields
  coursePreviewVideoUrl: string | null = null;
  coursePreviewVideoPublicId: string | null = null;
  @ViewChild(PreviewVideoUploadComponent) previewVideoUploadComponent?: PreviewVideoUploadComponent;

  // ─── Thumbnail Cropper State ────────────────────────────────
  isCropperOpen = signal(false);
  selectedImageSrc: string | null = null;
  livePreviewUrl: string | null = null;
  cropTranslateX = 0;
  cropTranslateY = 0;
  cropScale = 1;
  cropRotation = 0;
  _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _translateAtDragStart = { x: 0, y: 0 };
  private _naturalW = 0;
  private _naturalH = 0;
  @ViewChild('cropImg') cropImg!: ElementRef<HTMLImageElement>;
  
  readonly CONTAINER_SIZE = 380;
  readonly CROP_WIDTH = 300;
  readonly CROP_HEIGHT = 200;

  // Lifecycle management
  private destroy$ = new Subject<void>();

  private fb = inject(FormBuilder);
  isSaving = signal(false);
  courseCreated = signal(false);
  @Output() continue = new EventEmitter<void>();

  isUploading = signal(false);
  hasThumbnail = signal(false);
  hasChanges = signal(false);
  selectedThumbnailFile: File | null = null;

  imageError: string | null = null;

  @Output() courseCreatedEvent = new EventEmitter<string>();
  thumbnailPreview = signal<string>('');
  openLevel = false;
  mode = signal<'create' | 'update'>('create');
  courseId: string | null = null;
  isLoading = signal(true);
  existingThumbnailPublicId: string | null = null;

  status = signal<'idle' | 'saving' | 'updating' | 'ready'>('idle');

  private route = inject(ActivatedRoute);
  initialValue: any = null;
  CourseLevel = CourseLevel;
  private toastr = inject(ToastrService);
  parent = inject(CourseBuilderPageComponent, { optional: true });

  // ================= Draft State =================
  draftId = '';
  hasDraftData = signal(false);
  private pendingThumbnailSignature: { sig: SignatureResponse; fetchedAt: number } | null = null;




  // Utility function to truncate names for toastr messages
  private truncateName(name: string, maxLength = 40): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  }

  constructor() {
    effect(() => {
      const course = this.parent?.courseData();
      if (course && this.mode() === 'update') {
        this.populateForm(course);
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.cleanup();
  }

  isFormPopulated = false;

  private initializeDraftSystem() {
    // Generate or get draft ID
    this.draftId = this.formDraftIntegration.generateDraftId('course', undefined, this.courseId || undefined);

    if (this.mode() === 'update' && !this.isFormPopulated) {
      // In update mode, wait until form is populated with server data before connecting
      return;
    }

    this.connectDraftSystem();
  }




// call this inside handleFile(), right after processedFile is set, non-blocking
private prefetchThumbnailSignature(userId: string) {
  const folder = `edugenie/courses/thumbnails/${userId}`;
  this.cloudinaryService.getSignature(folder).subscribe({
    next: (sig) => { this.pendingThumbnailSignature = { sig, fetchedAt: Date.now() }; },
    error: () => { this.pendingThumbnailSignature = null; } // silent — fall back to live fetch later
  });
}

private getUsableSignature(): SignatureResponse | undefined {
  if (!this.pendingThumbnailSignature) return undefined;
  const ageMs = Date.now() - this.pendingThumbnailSignature.fetchedAt;
  // Cloudinary allows ~1hr skew on signed timestamps — 10 min gives comfortable margin
  return ageMs < 10 * 60 * 1000 ? this.pendingThumbnailSignature.sig : undefined;
}


  private connectDraftSystem() {
    // Connect form to draft system
    this.formDraftIntegration.connectForm(this.courseForm, {
      draftId: this.draftId,
      type: 'course',
      excludeFields: [], // Don't exclude any fields for courses
      fileFields: [{
        fieldName: 'thumbnail',
        uploadType: 'thumbnail',
        validation: {
          maxSize: 2 * 1024 * 1024, // 2MB
          allowedTypes: ['image']
        }
      }],
      autoSave: true,
      autoSaveDelay: 1000
    });

    // Restore thumbnail file from draft if it exists
    this.restoreThumbnailFromDraft();

    // Monitor draft changes
    this.draftStateService.getDraftChanges()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateDraftState();
      });

    // Initial draft state update
    this.updateDraftState();
  }

  private restoreThumbnailFromDraft() {
    const restoredFile = this.fileDraftService.getFileFromDraft(this.draftId, 'thumbnail');
    if (restoredFile) {
      this.selectedThumbnailFile = restoredFile;
      this.hasThumbnail.set(true);
      const previewUrl = this.fileDraftService.createPreviewUrl(this.draftId, 'thumbnail');
      if (previewUrl) {
        this.thumbnailPreview.set(previewUrl);
      }
    } else {
      const draft = this.draftStateService.getDraft(this.draftId);
      const thumbnailMetadata = draft?.files?.find(f => f.fieldName === 'thumbnail');
      if (thumbnailMetadata && thumbnailMetadata.url) {
        this.thumbnailPreview.set(thumbnailMetadata.url);
        this.hasThumbnail.set(true);
      }
    }
  }

  private updateDraftState() {
    this.hasDraftData.set(this.formDraftIntegration.hasDraftData(this.draftId));
  }

  private cleanup() {
    this.destroy$.next();
    this.destroy$.complete();
    this.formDraftIntegration.disconnectForm(this.draftId);

    // If the user navigated away without making real changes,
    // remove the course draft entry from localStorage so it doesn't persist.
    if (!this.hasChanges()) {
      this.draftStateService.removeDraft(this.draftId);
    }
  }

  private clearDraftAfterSave() {
    this.formDraftIntegration.clearDraft({
      draftId: this.draftId,
      type: 'course'
    });
    this.hasDraftData.set(false);

    // In create mode, re-init so a fresh draft ID is generated for the next new course.
    // In update mode, the draftId is the real courseId — no need to re-init.
    if (this.mode() === 'create') {
      this.initializeDraftSystem();
    }
  }

  courseForm = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    thumbnail: ['', Validators.required],


    level: [null as CourseLevel | null, Validators.required],

    category: new FormControl<string | null>(null, Validators.required),
    goals: this.fb.array([]),
    requirements: this.fb.array([]),
    previewVideoUrl: [null as string | null],
    previewVideoPublicId: [null as string | null]
  });

  ngOnInit() {
    const id =
      this.route.snapshot.paramMap.get('courseId') ||
      this.route.parent?.snapshot.paramMap.get('courseId');

    if (!id) {
      this.isLoading.set(false);
    } else {
      this.courseId = id;
      this.mode.set('update');
    }

    this.initializeDraftSystem();
    this.listenToArraysChanges();
  }

  /**
 * Resize + compress an image client-side before upload.
 * Keeps thumbnails well under 300KB regardless of the original
 * file size, since Cloudinary upload time is dominated by raw
 * bytes transmitted on slow connections.
 */
private async compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 720,
  quality = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file);

  let { width, height } = bitmap;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback: if canvas isn't available for some reason, use original file
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Image compression failed'))),
      'image/jpeg',
      quality
    )
  );

  // If compression somehow produced a larger file than the original
  // (rare, e.g. tiny already-optimized PNGs), just keep the original.
  if (blob.size >= file.size) {
    return file;
  }

  const newName = file.name.replace(/\.\w+$/, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg' });
}

  async handleFile(file: File) {

  this.imageError = null;

  const maxSize = 2 * 1024 * 1024;

  // 1) VALIDATION FIRST (on the original file, before compression)
  if (file.size > maxSize) {
    this.imageError = 'Image must be less than 2MB';
    this.selectedThumbnailFile = null;
    this.hasThumbnail.set(false);

    this.courseForm.get('thumbnail')?.reset();
    return;
  }

  if (!file.type.startsWith('image/')) {
    this.imageError = 'Please upload a valid image';
    this.selectedThumbnailFile = null;
    this.hasThumbnail.set(false);

    this.courseForm.get('thumbnail')?.reset();
    return;
  }

  // 2) COMPRESS before storing/uploading
  let processedFile: File;
  try {
    processedFile = await this.compressImage(file);
  } catch (err) {
    console.error('Thumbnail compression failed, using original file:', err);
    processedFile = file; // graceful fallback — don't block the user
  }

  // 3) ONLY IF VALID → SET STATE
  this.selectedThumbnailFile = processedFile;
  this.hasThumbnail.set(true);

  // Store file in draft system
  this.fileDraftService.addFileToDraft(
    this.draftId,
    'thumbnail',
    processedFile,
    {
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image']
    }
  ).subscribe({
    next: (fileId) => {
      console.log('Thumbnail stored in draft system:', fileId);
    },
    error: (error) => {
      console.error('Failed to store thumbnail in draft:', error);
    }
  });

  this.courseForm.get('thumbnail')?.setValue(processedFile.name);
  this.courseForm.get('thumbnail')?.markAsDirty();
  this.courseForm.get('thumbnail')?.updateValueAndValidity();

  // 4) preview
  const reader = new FileReader();
  reader.onload = () => {
    this.thumbnailPreview.set(reader.result as string);
  };
  reader.readAsDataURL(processedFile);
}

  async onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  // Open cropper instead of directly processing the file
  this.openThumbnailCropper(file);
}

async onDrop(event: DragEvent) {
  event.preventDefault();
  this.isDragging.set(false);

  const file = event.dataTransfer?.files?.[0];
  if (!file) return;

  await this.handleFile(file);
}

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  // ─── Thumbnail Cropper Methods ─────────────────────────────────────────────
  private openThumbnailCropper(file: File) {
    this.selectedImageSrc = URL.createObjectURL(file);
    this.isCropperOpen.set(true);
  }

  onCropImageLoaded(event: Event) {
    const img = event.target as HTMLImageElement;
    this._naturalW = img.naturalWidth;
    this._naturalH = img.naturalHeight;

    const coverWidth = this.CROP_WIDTH / this._naturalW;
    const coverHeight = this.CROP_HEIGHT / this._naturalH;
    const cover = Math.max(coverWidth, coverHeight);
    this.cropScale = cover;
    this.cropTranslateX = 0;
    this.cropTranslateY = 0;
    this.cropRotation = 0;

    setTimeout(() => this.refreshThumbnailPreview(), 50);
  }

  get cropImageStyle(): Record<string, string> {
    return {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${this._naturalW}px`,
      height: `${this._naturalH}px`,
      'max-width': 'none',
      'transform-origin': 'center center',
      transform: `translate(calc(-50% + ${this.cropTranslateX}px), calc(-50% + ${this.cropTranslateY}px)) rotate(${this.cropRotation}deg) scale(${this.cropScale})`,
      'will-change': 'transform',
      'user-select': 'none',
      'pointer-events': 'none'
    };
  }

  onCropPointerDown(event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this._isDragging = true;
    const pt = this.getPoint(event);
    this._dragStartX = pt.x;
    this._dragStartY = pt.y;
    this._translateAtDragStart = { x: this.cropTranslateX, y: this.cropTranslateY };
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onDocumentMove(event: MouseEvent | TouchEvent) {
    if (!this._isDragging || !this.isCropperOpen()) return;
    event.preventDefault();
    const pt = this.getPoint(event);
    this.cropTranslateX = this._translateAtDragStart.x + (pt.x - this._dragStartX);
    this.cropTranslateY = this._translateAtDragStart.y + (pt.y - this._dragStartY);
    this.refreshThumbnailPreview();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDocumentUp() { this._isDragging = false; }

  onCropWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    this.cropScale = Math.min(10, Math.max(0.1, this.cropScale + delta));
    this.refreshThumbnailPreview();
  }

  zoomIn() { 
    this.cropScale = Math.min(10, +(this.cropScale + 0.1).toFixed(2)); 
    this.refreshThumbnailPreview(); 
  }

  zoomOut() { 
    this.cropScale = Math.max(0.1, +(this.cropScale - 0.1).toFixed(2)); 
    this.refreshThumbnailPreview(); 
  }

  updateZoom(e: Event) {
    this.cropScale = parseFloat((e.target as HTMLInputElement).value);
    this.refreshThumbnailPreview();
  }

  rotateLeft() { 
    this.cropRotation -= 90; 
    this.refreshThumbnailPreview(); 
  }

  rotateRight() { 
    this.cropRotation += 90; 
    this.refreshThumbnailPreview(); 
  }

  resetCropTransform() {
    const coverWidth = this.CROP_WIDTH / (this._naturalW || 1);
    const coverHeight = this.CROP_HEIGHT / (this._naturalH || 1);
    const cover = Math.max(coverWidth, coverHeight);
    this.cropScale = cover;
    this.cropTranslateX = 0;
    this.cropTranslateY = 0;
    this.cropRotation = 0;
    this.refreshThumbnailPreview();
  }

  refreshThumbnailPreview() {
    if (!this.cropImg?.nativeElement?.complete) return;
    const img = this.cropImg.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = this.CROP_WIDTH;
    canvas.height = this.CROP_HEIGHT;
    const ctx = canvas.getContext('2d')!;
    this.drawToCanvas(ctx, img, this.CROP_WIDTH, this.CROP_HEIGHT);
    this.livePreviewUrl = canvas.toDataURL('image/png');
  }

  private drawToCanvas(ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + this.cropTranslateX, height / 2 + this.cropTranslateY);
    ctx.rotate(this.cropRotation * Math.PI / 180);
    ctx.scale(this.cropScale, this.cropScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }

  confirmThumbnailCrop() {
    const img = this.cropImg?.nativeElement;
    if (!img) return;

    const OUT_W = 1280;
    const OUT_H = 720;
    const canvas = document.createElement('canvas');
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext('2d')!;

    const scaleX = OUT_W / this.CROP_WIDTH;
    const scaleY = OUT_H / this.CROP_HEIGHT;
    ctx.save();
    ctx.translate(
      OUT_W / 2 + this.cropTranslateX * scaleX,
      OUT_H / 2 + this.cropTranslateY * scaleY
    );
    ctx.rotate(this.cropRotation * Math.PI / 180);
    ctx.scale(this.cropScale * scaleX, this.cropScale * scaleY);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    canvas.toBlob(async (blob) => {
      if (!blob) { this.toastr.error('Failed to process image.'); return; }

      const croppedFile = new File([blob], 'thumbnail-cropped.jpg', { type: 'image/jpeg' });
      await this.handleFile(croppedFile);
      this.isCropperOpen.set(false);
      this.revokeCropImage();
    }, 'image/jpeg', 0.85);
  }

  cancelThumbnailCrop() {
    this.isCropperOpen.set(false);
    this.revokeCropImage();
  }

  private revokeCropImage() {
    if (this.selectedImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedImageSrc);
    }
    this.selectedImageSrc = null;
  }

  private getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (e instanceof TouchEvent && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  selectLevel(level: CourseLevel) {
    this.getControl('level').setValue(level);
    this.openLevel = false;
  }

  getControl(name: string): FormControl {
    return this.courseForm.get(name) as FormControl;
  }

  isInvalid(name: string) {
    const control = this.getControl(name);
    return control.touched && control.invalid;

  }

  isValid(name: string) {
    const control = this.getControl(name);
    return control.touched && control.valid;
  }

  private setBaseline(baselineValue?: any) {
    this.initialValue = baselineValue || this.normalize(this.courseForm.getRawValue());

    const current = this.normalize(this.courseForm.getRawValue());
    this.hasChanges.set(
      JSON.stringify(current) !== JSON.stringify(this.initialValue)
    );

    this.courseForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const currentVal = this.normalize(this.courseForm.getRawValue());

        this.hasChanges.set(
          JSON.stringify(currentVal) !== JSON.stringify(this.initialValue)
        );
      });
  }

  private normalize(value: any) {
    return {
      title: value.title,
      description: value.description,
      thumbnail: value.thumbnail,
      level: value.level,
      category: value.category,
      goals: [...(value.goals || [])],
      requirements: [...(value.requirements || [])],
      previewVideoUrl: value.previewVideoUrl || null,
      previewVideoPublicId: value.previewVideoPublicId || null
    };
  }

  populateForm(course: any) {
    if (this.isFormPopulated) return;
    this.isFormPopulated = true;

    this.courseForm.patchValue({
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      level: course.level,
      category:
        course.categoryId?._id ||
        course.categoryId?.id ||
        course.categoryId ||
        course.category?._id ||
        course.category?.id ||
        course.category,
      previewVideoUrl: course.previewVideoUrl || null,
      previewVideoPublicId: course.previewVideoPublicId || null
    }, { emitEvent: false });

    if (course.thumbnail) {
      this.thumbnailPreview.set(course.thumbnail);
      this.hasThumbnail.set(true);
    }

    if (course.previewVideoUrl) {
      this.coursePreviewVideoUrl = course.previewVideoUrl;
      this.coursePreviewVideoPublicId = course.previewVideoPublicId ?? null;
    }

    this.setArray('goals', course.goals || []);
    this.setArray('requirements', course.requirements || []);

    // Get baseline value from form right now (pure server data)
    const baselineVal = this.normalize(this.courseForm.getRawValue());

    // Connect to draft system now that server data is populated
    this.connectDraftSystem();

    setTimeout(() => {
      this.setBaseline(baselineVal);
    });
  }

  isButtonDisabled(): boolean {
    if (this.status() === 'saving' || this.status() === 'updating') {
      return true;
    }

    if (this.mode() === 'create') {
      // Find invalid controls
      const invalidControls = Object.keys(this.courseForm.controls).filter(key => {
        return this.courseForm.get(key)?.invalid;
      });
      if (invalidControls.length > 0) {
        // console.log('Invalid controls:', invalidControls);
      }
      if (!this.selectedThumbnailFile) {
        // console.log('Thumbnail file missing');
      }

      return this.courseForm.invalid || !this.selectedThumbnailFile;
    }

    if (this.mode() === 'update') {
      return this.courseForm.invalid;
    }

    return false;
  }

  setGoals(goals: string[]) {
    const arr = this.courseForm.get('goals') as FormArray;
    arr.clear();

    goals.forEach(goal => {
      arr.push(this.fb.control(goal));
    });
  }

  setRequirements(reqs: string[]) {
    const arr = this.courseForm.get('requirements') as FormArray;
    arr.clear();

    reqs.forEach(req => {
      arr.push(this.fb.control(req));
    });
  }

  setArray(name: string, values: string[]) {
    const arr = this.courseForm.get(name) as FormArray;
    arr.clear();

    values.forEach(v => {
      arr.push(new FormControl(v));
    });
  }


  get goalsArray(): FormArray {
    return this.courseForm.get('goals') as FormArray;
  }

  get requirementsArray(): FormArray {
    return this.courseForm.get('requirements') as FormArray;
  }


  getButtonIcon(): string {

    if (this.mode() === 'create') {
      if (this.status() === 'saving') return 'hourglass_top';
      return 'arrow_forward';
    }

    if (this.mode() === 'update') {
      if (this.status() === 'updating') return 'hourglass_top';

      // Always show arrow forward in update mode
      return 'arrow_forward';
    }


    return 'arrow_forward';
  }


  getButtonLabel(): string {

    if (this.mode() === 'update') {

      if (this.status() === 'updating') return 'Saving...';

      // ⭐ Always show Next in update mode
      return 'Next';
    }

    if (this.mode() === 'create') {
      if (this.status() === 'saving') return 'Saving...';
      return 'Next';
    }

    return '';
  }

  onMainAction() {
    if (this.mode() === 'create') {
      this.createCourse();
      return;
    }

    if (this.mode() === 'update') {
      // Always update first if there are changes OR if preview video is marked for deletion
      const previewMarkedForDeletion = this.previewVideoUploadComponent?.markedForDeletion() || false;
      
      if (this.hasChanges() || previewMarkedForDeletion) {
        this.updateCourse();
      } else {
        // If no changes, navigate directly
        this.router.navigate([
          '/course-builder',
          this.courseId,
          'sections'
        ]);
      }
    }
  }



    updateCourse() {
    if (this.courseForm.invalid) {
      this.courseForm.markAllAsTouched();
      return;
    }

    this.status.set('updating');

    const formValue = this.courseForm.getRawValue() as {
      title: string;
      description: string;
      thumbnail: string;
      level: CourseLevel;
      category: string | { _id: string };
      goals: string[];
      requirements: string[];
      previewVideoUrl: string | null;
      previewVideoPublicId: string | null;
    };
    const categoryId =
      typeof formValue.category === 'string'
        ? formValue.category
        : (formValue.category as any)?._id || (formValue.category as any)?.id;

    const payload: any = {
      title: formValue.title,
      description: formValue.description,
      level: formValue.level,
      categoryId: categoryId,
      goals: formValue.goals || [],
      requirements: formValue.requirements || [],
    };

    const userId = this.authService.currentUserSignal()?.id;
    const thumbnailUpload$: Observable<CloudinaryUploadResponse | null> = this.selectedThumbnailFile && userId
      ? this.cloudinaryService.uploadThumbnail(
          this.selectedThumbnailFile,
          userId,
          this.existingThumbnailPublicId,
        )
      : of<CloudinaryUploadResponse | null>(null);

    // Sequential: thumbnail (small, fast) first, then video (large, slow).
    thumbnailUpload$
      .pipe(
        switchMap((thumbRes) => {
          if (thumbRes) {
            payload.thumbnail = thumbRes.secure_url;
            payload.thumbnailPublicId = thumbRes.public_id;
            this.existingThumbnailPublicId = thumbRes.public_id;
          } else {
            payload.thumbnail = formValue.thumbnail;
          }

          const previewComp = this.previewVideoUploadComponent;
          return previewComp ? previewComp.upload() : of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (videoRes: any) => {
          const previewComp = this.previewVideoUploadComponent;

          if (videoRes) {
            payload.previewVideoUrl = videoRes.url;
            payload.previewVideoPublicId = videoRes.publicId;
            this.coursePreviewVideoUrl = videoRes.url;
            this.coursePreviewVideoPublicId = videoRes.publicId;

            this.courseForm.patchValue({
              previewVideoUrl: videoRes.url,
              previewVideoPublicId: videoRes.publicId
            }, { emitEvent: false });
          } else if (previewComp?.markedForDeletion()) {
            payload.previewVideoUrl = null;
            payload.previewVideoPublicId = null;
          } else {
            payload.previewVideoUrl = formValue.previewVideoUrl;
            payload.previewVideoPublicId = formValue.previewVideoPublicId;
          }

          this.sendUpdate(payload);
        },
        error: (err: unknown) => {
          this.status.set('ready');
          console.error('Update upload failed:', err);
        }
      });
    }


  sendUpdate(payload: any) {
    this.coursesService.updateCourse(this.courseId!, payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.status.set('ready');
        this.hasChanges.set(false);

        // Reset preview video component state and handle deferred Cloudinary deletion
        if (this.previewVideoUploadComponent) {
          const comp = this.previewVideoUploadComponent;

          // If user removed the video, commit the null values into the form now
          if (comp.markedForDeletion()) {
            this.courseForm.patchValue(
              { previewVideoUrl: null, previewVideoPublicId: null },
              { emitEvent: false }
            );
          }

          // Delete the old Cloudinary asset now that the DB save succeeded
          if (comp.pendingDeletePublicId) {
            this.cloudinaryService.deleteAsset(comp.pendingDeletePublicId, 'video').subscribe();
          }

          comp.resetAfterSave();
        }

        this.initialValue = this.normalize(this.courseForm.getRawValue());

        this.courseForm.markAsPristine();

        // Clear draft state after successful update
        this.clearDraftAfterSave();

        const courseTitle = this.courseForm.get('title')?.value || 'Course';
        const truncatedTitle = this.truncateName(courseTitle);
        this.toastr.success(`"${truncatedTitle}" updated successfully`);

        // Navigate to sections builder after update
        this.router.navigate([
          '/course-builder',
          this.courseId,
          'sections'
        ]);
      },
      error: () => {
        this.isSaving.set(false);
        this.status.set('ready');
        const courseTitle = this.courseForm.get('title')?.value || 'course';
        const truncatedTitle = this.truncateName(courseTitle);
        this.toastr.error(`Failed to update "${truncatedTitle}". Please try again.`);
      }
    });
  }

  createCourse() {
  if (this.courseForm.invalid || !this.selectedThumbnailFile) {
    this.courseForm.markAllAsTouched();
    if (!this.selectedThumbnailFile) {
      this.imageError = 'Thumbnail is required';
    }
    return;
  }

  this.status.set('saving');
  this.isSaving.set(true);

  const form = this.courseForm.getRawValue();

  if (!form.title || !form.description || !form.level || !form.category) {
    this.courseForm.markAllAsTouched();
    this.status.set('idle');
    this.isSaving.set(false);
    return;
  }

  const userId = this.authService.currentUserSignal()?.id;
if (!userId) {
  this.status.set('idle');
  this.isSaving.set(false);
  this.imageError = 'You must be logged in to upload a thumbnail';
  return;
}

  // ─────────────────────────────────────────────────────────
  // Single upload: folder is keyed by userId, so no staging/
  // re-upload dance is needed.
  // ─────────────────────────────────────────────────────────
  this.cloudinaryService
    .uploadThumbnail(this.selectedThumbnailFile!, userId)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (uploadRes) => {
        this.existingThumbnailPublicId = uploadRes.public_id;

        const payload: CreateCoursePayload = {
          title: form.title!.trim(),
          description: form.description!.trim(),
          level: form.level as CourseLevel,
          categoryId: form.category as string,
          goals: (form.goals || []).map((g: any) =>
            typeof g === 'string' ? g : g?.value
          ),
          requirements: (form.requirements || []).map((r: any) =>
            typeof r === 'string' ? r : r?.value
          ),
          thumbnail: uploadRes.secure_url,
          thumbnailPublicId: uploadRes.public_id,
        };

        this.coursesService.createCourse(payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (course) => {
              this.courseId = course.id;
              this.finalizeCourseCreation(course.id);
            },
            error: (err) => {
              console.error('CREATE COURSE ERROR:', err);
              this.status.set('idle');
              this.isSaving.set(false);
            }
          });
      },
      error: (err) => {
        console.error('THUMBNAIL UPLOAD ERROR:', err);
        this.status.set('idle');
        this.isSaving.set(false);
        this.imageError = 'Failed to upload thumbnail';
      }
    });
}

  /** Shared finalization after all phases of course creation succeed */
  private finalizeCourseCreation(courseId: string) {
    this.status.set('ready');
    this.isSaving.set(false);
    this.mode.set('update');
    this.initialValue = this.normalize(this.courseForm.getRawValue());
    this.hasChanges.set(false);
    this.setBaseline();

    // Clear draft state after successful course creation
    this.clearDraftAfterSave();

    this.courseCreatedEvent.emit(courseId);
    const courseTitle = this.courseForm.get('title')?.value || 'Course';
    const truncatedTitle = this.truncateName(courseTitle);
    this.toastr.success(`"${truncatedTitle}" created successfully`);

    // Navigate to sections builder after course creation
    this.router.navigate([
      '/course-builder',
      courseId,
      'sections'
    ]);
  }

  formatLevel(level: string): string {
    if (!level) return '';
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  get goalsInvalid(): boolean {
    return this.goalsArray.invalid;
  }

  get requirementsInvalid(): boolean {
    return this.requirementsArray.invalid;
  }

  private listenToArraysChanges() {
    this.goalsArray.statusChanges.subscribe(() => {
      this.courseForm.updateValueAndValidity({ emitEvent: false });
    });

    this.requirementsArray.statusChanges.subscribe(() => {
      this.courseForm.updateValueAndValidity({ emitEvent: false });
    });
  }

  get isGoalsInvalid(): boolean {
    return this.goalsArray.controls.some(c => c.invalid);
  }

  get isRequirementsInvalid(): boolean {
    return this.requirementsArray.controls.some(c => c.invalid);
  }

  get isFormWithArraysInvalid(): boolean {
    return (
      this.courseForm.invalid ||
      this.isGoalsInvalid ||
      this.isRequirementsInvalid ||
      !this.selectedThumbnailFile
    );
  }

  get isSubmitDisabled(): boolean {
    return (
      this.courseForm.invalid ||
      this.status() === 'saving' ||
      this.status() === 'updating'
    );
  }

  onPreviewVideoUploaded(event: { url: string; publicId: string }) {
    this.coursePreviewVideoUrl = event.url;
    this.coursePreviewVideoPublicId = event.publicId;

    this.coursesService.updateCourse(this.courseId!, {
      previewVideoUrl: event.url,
      previewVideoPublicId: event.publicId
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.toastr.success('Preview video saved'),
      error: () => this.toastr.error('Failed to save preview video')
    });
  }

  onPreviewVideoRemoved() {
    const oldPublicId = this.coursePreviewVideoPublicId;
    this.coursePreviewVideoUrl = null;
    this.coursePreviewVideoPublicId = null;

    this.coursesService.updateCourse(this.courseId!, {
      previewVideoUrl: null,
      previewVideoPublicId: null
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastr.success('Preview video removed');
        if (oldPublicId) {
          this.cloudinaryService.deleteAsset(oldPublicId, 'video').subscribe();
        }
      },
      error: () => this.toastr.error('Failed to remove preview video')
    });
  }
}
