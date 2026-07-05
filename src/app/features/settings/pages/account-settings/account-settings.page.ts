import {
  Component, ElementRef, HostListener, OnDestroy,
  OnInit, ViewChild, inject, ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { UserProfile } from '../../../../core/models/user-profile.model';
import { ToastrService } from 'ngx-toastr';
import { PageSkeletonComponent, ButtonLoadingComponent } from '../../../../shared/components/loading';
import { Subject, forkJoin, of, throwError, Observable } from 'rxjs';
import { catchError, switchMap, tap, takeUntil, finalize, map } from 'rxjs/operators';

@Component({
  selector: 'app-account-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PageSkeletonComponent, ButtonLoadingComponent],
  templateUrl: './account-settings.page.html',
  styleUrls: ['./account-settings.page.css']
})
export class AccountSettingsPageComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  private readonly destroy$ = new Subject<void>();

  // Password visibility flags
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  // ─── Profile state ───────────────────────────────────────────────────────
  profileForm!: FormGroup;
  securityForm!: FormGroup;
  originalProfile: { firstName: string, lastName: string } | null = null;
  isLoadingProfile = true;
  isSaving = false;
  emailNotifications = true;
  publicProfile = false;

  // ─── Avatar state ────────────────────────────────────────────────────────
  /** URL shown in the avatar circle — either from the server or a local crop preview */
  avatarPreview: string | null = null;
  /** Cropped blob waiting to be uploaded on Save Changes — null if unchanged */
  private _pendingAvatarBlob: Blob | null = null;
  /** Whether the user explicitly clicked "Remove Image" */
  avatarDeleted = false;
  /** True while the save request that includes an avatar upload is in-flight */
  isUploadingAvatar = false;
  showAvatarOptions = false;

  // ─── Remove-avatar confirmation dialog ───────────────────────────────────
  showRemoveAvatarDialog = false;
  isRemovingAvatar = false;

  openRemoveAvatarDialog() {
    this.showRemoveAvatarDialog = true;
    this.cdr.markForCheck();
  }

  closeRemoveAvatarDialog() {
    if (this.isRemovingAvatar) return;
    this.showRemoveAvatarDialog = false;
    this.cdr.markForCheck();
  }

  confirmRemoveAvatar() {
    if (this.isRemovingAvatar) return;
    // Execute the existing removePhoto logic exactly as-is
    this.removePhoto();
    this.showRemoveAvatarDialog = false;
    this.cdr.markForCheck();
  }

  // ─── Cropper state ───────────────────────────────────────────────────────
  isCropperOpen = false;
  selectedImageSrc: string | null = null;
  livePreviewUrl: string | null = null;

  cropTranslateX = 0;
  cropTranslateY = 0;
  cropScale = 1;
  cropRotation = 0;
  /** Minimum scale that exactly covers the crop circle — computed per image */
  _minScale = 1;

  _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _translateAtDragStart = { x: 0, y: 0 };
  private _naturalW = 0;
  private _naturalH = 0;
  private _selectedFile: File | null = null;
  private _previewObjectUrl: string | null = null;

  readonly CONTAINER_SIZE = 380;
  readonly CROP_RADIUS = 155;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cropImg') cropImg!: ElementRef<HTMLImageElement>;

  constructor() { this.initForms(); }
  ngOnInit() { this.loadProfile(); }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeSelectedImage();
    // local preview blobs are data: URLs — nothing to revoke
    if (this.avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.avatarPreview);
    }
  }

  // ─── Forms ────────────────────────────────────────────────────────────────
  private passwordMatchValidator = (g: FormGroup) => {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  };

  private initForms() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]]
    });
    this.securityForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.securityForm.get('newPassword')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.securityForm.get('confirmPassword')?.updateValueAndValidity({ emitEvent: false });
        this.cdr.markForCheck();
      });
  }

  // ─── Profile load ─────────────────────────────────────────────────────────
  loadProfile() {
    this.isLoadingProfile = true;
    this.authService.getProfile().subscribe({
      next: (r) => {
        if (r.data) this.populateForm(r.data);
        this.isLoadingProfile = false;
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to load profile.');
        this.isLoadingProfile = false;
      }
    });
  }

  private populateForm(user: UserProfile) {
    this.profileForm.patchValue({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || ''
    });
    this.originalProfile = {
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    };
    this.avatarPreview = user.avatar || null;
    this._pendingAvatarBlob = null;
    this.avatarDeleted = false;
    // Cache initials so the template never recomputes it on every CD cycle
    this._cachedInitials = this.computeInitials();
    this.cdr.markForCheck();
  }

  // Cached initials — recomputed only when the form is populated/reset
  _cachedInitials = 'U';

  private computeInitials(): string {
    const f = this.profileForm.get('firstName')?.value || '';
    const l = this.profileForm.get('lastName')?.value || '';
    if (!f && !l) return 'U';
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }

  getInitials(): string {
    return this._cachedInitials;
  }

  get hasUnsavedChanges(): boolean {
    if (this.avatarDeleted || this._pendingAvatarBlob) return true;
    if (!this.originalProfile) return false;

    const currentFirstName = this.profileForm.get('firstName')?.value;
    const currentLastName = this.profileForm.get('lastName')?.value;

    const profileChanged = currentFirstName !== this.originalProfile.firstName ||
      currentLastName !== this.originalProfile.lastName;

    const currentPassword = this.securityForm.get('currentPassword')?.value;
    const newPassword = this.securityForm.get('newPassword')?.value;
    const confirmPassword = this.securityForm.get('confirmPassword')?.value;
    const passwordFieldsChanged = !!(currentPassword || newPassword || confirmPassword);

    return profileChanged || passwordFieldsChanged;
  }

  get isSubmitDisabled(): boolean {
    if (this.isSaving || this.isUploadingAvatar || !this.hasUnsavedChanges) {
      return true;
    }

    const currentFirstName = this.profileForm.get('firstName')?.value;
    const currentLastName = this.profileForm.get('lastName')?.value;
    const profileChanged = this.avatarDeleted || !!this._pendingAvatarBlob ||
      currentFirstName !== (this.originalProfile?.firstName ?? '') ||
      currentLastName !== (this.originalProfile?.lastName ?? '');

    const currentPassword = this.securityForm.get('currentPassword')?.value;
    const newPassword = this.securityForm.get('newPassword')?.value;
    const confirmPassword = this.securityForm.get('confirmPassword')?.value;
    const passwordChanged = !!(currentPassword || newPassword || confirmPassword);

    if (profileChanged && this.profileForm.invalid) {
      return true;
    }

    if (passwordChanged && this.securityForm.invalid) {
      return true;
    }

    return false;
  }

  private saveProfileChanges(): Observable<any> {
    const firstName = this.profileForm.get('firstName')?.value as string;
    const lastName = this.profileForm.get('lastName')?.value as string;

    if (this.avatarDeleted) {
      return this.authService.removeAvatar().pipe(
        switchMap(() => this.authService.updateProfile({ firstName, lastName })),
        tap({
          next: (r) => {
            this.toastr.success('Profile updated successfully.');
            if (r.data) this.populateForm(r.data);
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Failed to update profile.');
          }
        })
      );
    } else if (this._pendingAvatarBlob) {
      this.isUploadingAvatar = true;
      this.cdr.markForCheck();
      return this.authService.uploadAvatar(this._pendingAvatarBlob).pipe(
        switchMap(() => this.authService.updateProfile({ firstName, lastName })),
        tap({
          next: (r2) => {
            this.isUploadingAvatar = false;
            this.toastr.success('Profile updated successfully.');
            if (r2.data) this.populateForm(r2.data);
          },
          error: (err) => {
            this.isUploadingAvatar = false;
            this.toastr.error(err.error?.message || 'Failed to update profile fields.');
          }
        }),
        catchError((err) => {
          this.isUploadingAvatar = false;
          this.toastr.error(err.error?.message || 'Avatar upload failed. Please try again.');
          return throwError(() => err);
        })
      );
    } else {
      return this.authService.updateProfile({ firstName, lastName }).pipe(
        tap({
          next: (r) => {
            this.toastr.success('Profile updated successfully.');
            if (r.data) this.populateForm(r.data);
          },
          error: (err) => {
            this.toastr.error(err.error?.message || 'Failed to update profile.');
          }
        })
      );
    }
  }

  onSaveChanges() {
    if (this.isSubmitDisabled) return;
    this.isSaving = true;
    this.cdr.markForCheck();

    const currentFirstName = this.profileForm.get('firstName')?.value;
    const currentLastName = this.profileForm.get('lastName')?.value;
    const profileChanged = this.avatarDeleted || !!this._pendingAvatarBlob ||
      currentFirstName !== (this.originalProfile?.firstName ?? '') ||
      currentLastName !== (this.originalProfile?.lastName ?? '');

    const currentPassword = this.securityForm.get('currentPassword')?.value;
    const newPassword = this.securityForm.get('newPassword')?.value;
    const confirmPassword = this.securityForm.get('confirmPassword')?.value;
    const passwordChanged = !!(currentPassword || newPassword || confirmPassword);

    const profile$ = profileChanged 
      ? this.saveProfileChanges().pipe(
          map(res => ({ type: 'profile', success: true, res })),
          catchError(err => of({ type: 'profile', success: false, err }))
        )
      : of(null);

    const password$ = passwordChanged
      ? this.authService.changePassword(currentPassword, newPassword).pipe(
          map(res => ({ type: 'password', success: true, res })),
          catchError(err => of({ type: 'password', success: false, err }))
        )
      : of(null);

    // Disable forms during saving
    this.profileForm.disable();
    this.securityForm.disable();

    forkJoin([profile$, password$])
      .pipe(
        finalize(() => {
          this.isSaving = false;
          // Re-enable forms
          this.profileForm.enable();
          this.profileForm.get('email')?.disable(); // Keep email disabled
          this.securityForm.enable();
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(([profileResult, passwordResult]) => {
        if (passwordResult) {
          const passRes = passwordResult as any;
          if (passRes.success) {
            const msg = passRes.res?.data?.message || 'Password changed successfully';
            this.handlePasswordSuccess(msg);
          } else {
            this.handlePasswordError(passRes.err);
          }
        }
      });
  }

  private handlePasswordSuccess(message: string) {
    this.toastr.success(message || 'Password changed successfully');
    this.securityForm.reset();
    this.showCurrentPassword = false;
    this.showNewPassword = false;
    this.showConfirmPassword = false;
  }

  private handlePasswordError(err: any) {
    const errorMsg = err.error?.message || 'Failed to change password';
    if (err.status === 401 || errorMsg === 'Current password is incorrect') {
      const currentPasswordControl = this.securityForm.get('currentPassword');
      currentPasswordControl?.setErrors({ serverIncorrect: true });
      this.toastr.error('Current password is incorrect');
    } else if (err.error?.message && Array.isArray(err.error.message)) {
      const msgs = err.error.message;
      let hasNewPasswordError = false;
      msgs.forEach((msg: string) => {
        if (msg.includes('newPassword')) {
          this.securityForm.get('newPassword')?.setErrors({ serverValidationError: msg });
          hasNewPasswordError = true;
        }
      });
      if (!hasNewPasswordError) {
        this.toastr.error(msgs.join(', '));
      }
    } else {
      this.toastr.error(errorMsg);
    }
  }

  toggleEmailNotifications() { this.emailNotifications = !this.emailNotifications; }
  togglePublicProfile() { this.publicProfile = !this.publicProfile; }

  // ─── Avatar dropdown ──────────────────────────────────────────────────────
  toggleAvatarOptions() { this.showAvatarOptions = !this.showAvatarOptions; }

  triggerFileInput() {
    this.showAvatarOptions = false;
    this.fileInput.nativeElement.click();
  }

  removePhoto() {
    this.showAvatarOptions = false;
    this.avatarPreview = null;
    this._pendingAvatarBlob = null;
    this.avatarDeleted = true;
    this.fileInput.nativeElement.value = '';
  }

  // ─── File selection ───────────────────────────────────────────────────────
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this._selectedFile = input.files[0];
    input.value = '';

    this.revokeSelectedImage();
    this.selectedImageSrc = URL.createObjectURL(this._selectedFile);
    this.showAvatarOptions = false;
    this.isCropperOpen = true;
  }

  // ─── Cropper: image load ──────────────────────────────────────────────────
  onCropImageLoaded(event: Event) {
    const img = event.target as HTMLImageElement;
    this._naturalW = img.naturalWidth;
    this._naturalH = img.naturalHeight;

    // Compute minimum scale: the image must cover the full crop diameter.
    // The crop circle has diameter = CROP_RADIUS * 2.
    // We scale from the image's natural dimensions, so the smaller side
    // must reach (CROP_RADIUS * 2) pixels at the chosen scale.
    this._minScale = (this.CROP_RADIUS * 2) / Math.min(this._naturalW, this._naturalH);

    // Start at exactly the cover scale so the circle is always filled.
    this.cropScale = this._minScale;
    this.cropTranslateX = 0;
    this.cropTranslateY = 0;
    this.cropRotation = 0;

    setTimeout(() => this.refreshPreview(), 50);
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

  // ─── Cropper: drag ────────────────────────────────────────────────────────
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
    if (!this._isDragging || !this.isCropperOpen) return;
    event.preventDefault();
    const pt = this.getPoint(event);
    this.cropTranslateX = this._translateAtDragStart.x + (pt.x - this._dragStartX);
    this.cropTranslateY = this._translateAtDragStart.y + (pt.y - this._dragStartY);
    this.refreshPreview();
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDocumentUp() { this._isDragging = false; }

  // ─── Cropper: wheel zoom ──────────────────────────────────────────────────
  onCropWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    this.cropScale = Math.min(10, Math.max(this._minScale, this.cropScale + delta));
    this.refreshPreview();
  }

  // ─── Cropper: controls ────────────────────────────────────────────────────
  zoomIn() { this.cropScale = Math.min(10, +(this.cropScale + 0.1).toFixed(2)); this.refreshPreview(); }
  zoomOut() { this.cropScale = Math.max(this._minScale, +(this.cropScale - 0.1).toFixed(2)); this.refreshPreview(); }

  updateZoom(e: Event) {
    const raw = parseFloat((e.target as HTMLInputElement).value);
    this.cropScale = Math.max(this._minScale, Math.min(10, raw));
    this.refreshPreview();
  }

  rotateLeft() { this.cropRotation -= 90; this.refreshPreview(); }
  rotateRight() { this.cropRotation += 90; this.refreshPreview(); }

  resetCropTransform() {
    this.cropScale = this._minScale;
    this.cropTranslateX = 0;
    this.cropTranslateY = 0;
    this.cropRotation = 0;
    this.refreshPreview();
  }

  // ─── Cropper: live preview ────────────────────────────────────────────────
  refreshPreview() {
    if (!this.cropImg?.nativeElement?.complete) return;
    const img = this.cropImg.nativeElement;
    const size = this.CROP_RADIUS * 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    this.drawToCanvas(ctx, img, size);
    this.livePreviewUrl = canvas.toDataURL('image/png');
  }

  private drawToCanvas(ctx: CanvasRenderingContext2D, img: HTMLImageElement, size: number) {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2 + this.cropTranslateX, size / 2 + this.cropTranslateY);
    ctx.rotate(this.cropRotation * Math.PI / 180);
    ctx.scale(this.cropScale, this.cropScale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }

  // ─── Cropper: confirm ────────────────────────────────────────────────────
  /**
   * Renders the crop to a 500×500 canvas, stores the blob locally,
   * and sets an instant local preview.  NO upload happens here.
   * The actual upload goes via the backend when the user clicks Save Changes.
   */
  confirmCrop() {
    const img = this.cropImg?.nativeElement;
    if (!img) return;

    const OUT = 500;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext('2d')!;

    const scale = OUT / (this.CROP_RADIUS * 2);
    ctx.save();
    ctx.translate(
      OUT / 2 + this.cropTranslateX * scale,
      OUT / 2 + this.cropTranslateY * scale
    );
    ctx.rotate(this.cropRotation * Math.PI / 180);
    ctx.scale(this.cropScale * scale, this.cropScale * scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    canvas.toBlob(blob => {
      if (!blob) { this.toastr.error('Failed to process image.'); return; }

      // Store blob for upload on Save Changes — no Cloudinary call here
      this._pendingAvatarBlob = blob;
      this.avatarDeleted = false;

      // Show the crop result as an instant local preview
      this.avatarPreview = this.livePreviewUrl ?? canvas.toDataURL('image/png');
      this.isCropperOpen = false;
      this.revokeSelectedImage();
    }, 'image/png', 1);
  }

  cancelCrop() {
    this.isCropperOpen = false;
    this.revokeSelectedImage();
    this.fileInput.nativeElement.value = '';
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (e instanceof TouchEvent && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  private revokeSelectedImage() {
    if (this._previewObjectUrl) {
      URL.revokeObjectURL(this._previewObjectUrl);
      this._previewObjectUrl = null;
    }
    if (this.selectedImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(this.selectedImageSrc);
    }
    this.selectedImageSrc = null;
  }

}
