import { Pipe, PipeTransform } from '@angular/core';

/**
 * Rewrites a Cloudinary image URL to serve an optimized, right-sized thumbnail
 * instead of the full-resolution original — the single biggest LCP win for
 * course-card grids.
 *
 * It ONLY touches Cloudinary `/image/upload/` URLs and is idempotent (won't
 * double-insert). Any non-Cloudinary URL (placeholders, external images, empty
 * values) is returned verbatim, so the displayed image is always the same one —
 * just delivered as auto-format (WebP/AVIF), auto-quality, and capped width.
 *
 * Pure pipe: recomputes only when the input URL changes.
 *
 * Usage: [src]="course.thumbnail | cloudinaryThumb"
 *        [src]="course.thumbnail | cloudinaryThumb:400"
 */
@Pipe({
  name: 'cloudinaryThumb',
  standalone: true,
})
export class CloudinaryThumbPipe implements PipeTransform {
  transform(url: string | null | undefined, width = 600): string | null | undefined {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
    // Already carries a transformation (e.g. f_auto) — leave it alone.
    if (url.includes('/image/upload/f_auto')) return url;

    const transform = `f_auto,q_auto,w_${width},c_limit`;
    return url.replace('/image/upload/', `/image/upload/${transform}/`);
  }
}
