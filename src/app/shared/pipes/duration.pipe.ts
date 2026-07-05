import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a raw duration value into a human-readable string.
 *
 * Input can be:
 *   - A number treated as SECONDS (raw lesson/video duration): 22, 45, 176, 3600
 *   - A string ending in 'h' treated as hours: "0.38h", "2h", "1.5h"
 *   - A string ending in 's' or 'sec': "3600s", "3600 sec"
 *   - null / undefined / NaN / 0 / '0h': returns 'N/A'
 *
 * Output examples:
 *   < 60 sec    →  "22 sec", "45 sec"
 *   1–59 min    →  "2 min", "18 min", "59 min"
 *   ≥ 60 min    →  "1 hr", "1 hr 20 min", "2 hrs", "3 hrs 15 min"
 */
@Pipe({
  name: 'duration',
  standalone: true,
  pure: true
})
export class DurationPipe implements PipeTransform {

  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '' || value === 0 || value === '0h' || value === '0') {
      return 'N/A';
    }

    const totalSeconds = this.toSeconds(value);
    if (totalSeconds === null || isNaN(totalSeconds) || totalSeconds <= 0) return 'N/A';

    // < 60 seconds: show seconds
    if (totalSeconds < 60) {
      return `${Math.round(totalSeconds)} sec`;
    }

    const totalMinutes = totalSeconds / 60;
    const hours   = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);

    if (hours === 0) {
      return `${Math.round(totalMinutes)} min`;
    }

    const hrLabel = hours === 1 ? 'hr' : 'hrs';
    if (minutes === 0) {
      return `${hours} ${hrLabel}`;
    }
    return `${hours} ${hrLabel} ${minutes} min`;
  }

  /**
   * Always returns total seconds.
   * - String ending in 'h'  → parsed as hours → converted to seconds
   * - String ending in 's' or 'sec' → parsed as seconds
   * - Plain number/string   → treated as seconds directly
   */
  private toSeconds(value: number | string): number | null {
    const raw = String(value).trim().toLowerCase();

    // Explicit hours string: "2h", "1.5h", "0.38h"
    if (raw.endsWith('h') && !raw.endsWith('hrs')) {
      const num = parseFloat(raw);
      if (isNaN(num)) return null;
      return num * 3600; // hours → seconds
    }

    // Explicit seconds string: "3600s", "3600 sec", "3600sec"
    if (raw.endsWith('sec') || (raw.endsWith('s') && !raw.endsWith('hrs'))) {
      const num = parseFloat(raw.replace(/[^\d.]/g, ''));
      if (isNaN(num)) return null;
      return num;
    }

    // Plain number — always treat as seconds
    const num = parseFloat(raw);
    if (isNaN(num)) return null;
    return num;
  }
}
