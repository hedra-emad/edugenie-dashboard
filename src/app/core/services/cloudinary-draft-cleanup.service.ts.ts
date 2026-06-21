import { Injectable, inject } from '@angular/core';
import { CloudinaryService } from './cloudinary';
import { DraftItem } from './draft-state.service';

@Injectable({ providedIn: 'root' })
export class CloudinaryDraftCleanupService {
  private cloudinary = inject(CloudinaryService);

  cleanupDraft(draft: DraftItem): void {
    if (!draft.files?.length) return;

    for (const file of draft.files) {
      if (file.status === 'uploaded' && file.url) {
        const publicId = this.extractPublicId(file.url);

        if (publicId) {
          this.cloudinary.deleteAsset(publicId).subscribe({
            error: (err) => {
              console.warn('[cleanup] failed deleting cloudinary asset', err);
            }
          });
        }
      }
    }
  }

  private extractPublicId(url: string): string | null {
    try {
      // .../upload/v1234567890/edugenie/courses/videos/abc/sections/def/filename.mp4
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}