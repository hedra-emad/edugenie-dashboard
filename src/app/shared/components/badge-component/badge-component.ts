import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseStatus } from '../../../core/enums/course-status';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge-component.html',
  styleUrl: './badge-component.css'
})
export class BadgeComponent {
  @Input() status: CourseStatus = CourseStatus.DRAFT;

  get badgeConfig(): { label: string; cssClass: string } {
    switch (this.status) {
      case CourseStatus.UNDER_REVIEW:
        return { label: 'Under Review', cssClass: 'under-review' };
      case CourseStatus.REJECTED:
        return { label: 'Rejected', cssClass: 'rejected' };
      case CourseStatus.PUBLISHED:
        return { label: 'Published', cssClass: 'published' };
      case CourseStatus.ARCHIVED:
        return { label: 'Archived', cssClass: 'archived' };
      case CourseStatus.DRAFT:
      default:
        return { label: 'Draft', cssClass: 'draft' };
    }
  }
}