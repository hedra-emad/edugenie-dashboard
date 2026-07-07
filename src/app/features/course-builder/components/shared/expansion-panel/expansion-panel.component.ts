import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DraftIndicatorComponent, DraftIndicatorType } from '../../../../../shared/components/draft-indicator/draft-indicator.component';
import { DraftStateService } from '../../../../../core/services/draft-state.service';
import { AppLoader } from '../../../../../shared/components/add-loader/app-loader';
import { inject } from '@angular/core';

@Component({
  selector: 'app-expansion-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    DragDropModule,
    DraftIndicatorComponent,
    AppLoader
  ],
  templateUrl: './expansion-panel.component.html',
  styleUrl: './expansion-panel.component.css',
  encapsulation: ViewEncapsulation.None
})
export class ExpansionPanelComponent {

  // ================= Inputs =================
  @Input() expanded = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = 'folder_open';
  @Input() index = 0;
  @Input() highlight = false;
  @Input() panelClass = '';
  @Input() showDragHandle = false;
  @Input() showMoveButtons = false;
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() showDeleteButton = true;
  @Input() isDeleting = false;
  /** When true, ALL header buttons are disabled (saving / uploading lock). */
  @Input() isLocked = false;
  @Input() showLessonsButton = false;
  @Input() lessonsButtonDisabled = false;
  @Input() showMobileMenu = false;
  @Input() hideMobileExpansionIndicator = false;
  @Input() showQuizButton = false;
  @Input() quizButtonDisabled = false;
  @Input() quizButtonLabel = 'Generate Quiz'; // Add quiz button label input
  @Input() showUnsavedIndicator = false;
  @Input() showModifiedIndicator = false;
  @Input() isEmpty = false; // New: indicates if section has no lessons
  
  // New unified draft indicator inputs
  @Input() draftId?: string;
  @Input() draftIndicatorType?: DraftIndicatorType;
  @Input() customTooltip?: string;
  @Input() autoDetectDraftState = false;
  
  // Failed state indicators
  @Input() hasSaveFailed = false;
  @Input() hasUploadError = false;
  
  // Section has failed lessons indicator
  @Input() hasFailedLessons = false;

  // ================= Outputs =================
  @Output() expandedChange = new EventEmitter<boolean>();
  @Output() deleteClicked = new EventEmitter<void>();
  @Output() moveUpClicked = new EventEmitter<void>();
  @Output() moveDownClicked = new EventEmitter<void>();
  @Output() lessonsClicked = new EventEmitter<void>();
  @Output() quizClicked = new EventEmitter<void>();

  @ViewChild('panel') panel!: MatExpansionPanel;

  // ================= Internal Methods =================
  
  get shouldShowDraftIndicator(): boolean {
    // Explicit type always wins — it already encodes failure states.
    if (this.draftIndicatorType) {
      return true;
    }
    if (this.hasSaveFailed || this.hasUploadError) {
      return false;
    }
    // Show new unified indicator if draftId is provided
    if (this.draftId) {
      return true;
    }
    // Fallback to legacy indicators
    return this.showUnsavedIndicator || this.showModifiedIndicator;
  }
  
  private draftStateService = inject(DraftStateService);

  get currentDraftType(): DraftIndicatorType | null {
    // Explicit type from parent always takes priority over auto-detect.
    if (this.draftIndicatorType) return this.draftIndicatorType;

    if (this.draftId && this.autoDetectDraftState) {
      const draft = this.draftStateService.getDraft(this.draftId);
      if (draft) {
        const hasCloudinaryData = draft.data?.videoUrl && draft.data?.videoPublicId;
        if (hasCloudinaryData && (this.draftStateService.isDraftId(this.draftId) || draft.isDirty)) {
          return 'uploaded_unsaved';
        }
        if (draft.isDirty) {
          if (this.draftStateService.isDraftId(this.draftId)) {
            return 'unsaved';
          }
          return 'modified';
        }
      }
      return null;
    }
    
    if (this.showUnsavedIndicator) return 'unsaved';
    if (this.showModifiedIndicator) return 'modified';
    
    return null;
  }
  
  get legacyIndicatorType(): DraftIndicatorType {
    if (this.showUnsavedIndicator) return 'unsaved';
    if (this.showModifiedIndicator) return 'modified';
    return 'unsaved';
  }

  get panelBorderClass(): string {
    if (this.hasSaveFailed || this.hasUploadError) {
      return 'border-red-500 !shadow-[0_0_8px_rgba(239,68,68,0.25)]';
    }
    switch (this.currentDraftType) {
      case 'unsaved': return 'border-blue-400 !shadow-[0_0_8px_rgba(37,99,235,0.2)]';
      case 'modified': return 'border-[var(--color-primary)] !shadow-[0_0_8px_rgba(59,24,146,0.2)]';
     case 'uploaded_unsaved': return 'border-[var(--color-primary)] !shadow-[0_0_8px_rgba(59,24,146,0.2)]';
      case 'uploading': return 'border-sky-400 !shadow-[0_0_8px_rgba(14,165,233,0.2)]';
      case 'saving': return 'border-indigo-500 !shadow-[0_0_8px_rgba(99,102,241,0.2)]';
      case 'save_failed': return 'border-red-600 !shadow-[0_0_8px_rgba(220,38,38,0.25)]';
      case 'recovered': return 'border-amber-400 !shadow-[0_0_8px_rgba(245,158,11,0.2)]';
      case 'error': return 'border-red-500 !shadow-[0_0_8px_rgba(239,68,68,0.25)]';
      default: return 'border-[var(--color-border)]';
    }
  }
  
  togglePanel(event: Event, panel: MatExpansionPanel) {
    event.stopPropagation();
    event.preventDefault();
    panel.toggle();
  }

  preventHeaderToggle(event: Event) {
    event.stopPropagation();
  }

  onOpened() {
    this.expandedChange.emit(true);
  }

  onClosed() {
    this.expandedChange.emit(false);
  }

  onDeleteClicked(event: Event) {
    event.stopPropagation();
    this.deleteClicked.emit();
  }

  onLessonsClicked(event: Event) {
    event.stopPropagation();
    this.lessonsClicked.emit();
  }

  onMoveUpClicked(event: Event) {
    event.stopPropagation();
    this.moveUpClicked.emit();
  }

  onMoveDownClicked(event: Event) {
    event.stopPropagation();
    this.moveDownClicked.emit();
  }

  onQuizClicked(event: Event) {
    event.stopPropagation();
    this.quizClicked.emit();
  }
}
