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
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-expansion-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    DragDropModule
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
  @Input() showLessonsButton = false;
  @Input() lessonsButtonDisabled = false;
  @Input() showMobileMenu = false;
  @Input() hideMobileExpansionIndicator = false;

  // ================= Outputs =================
  @Output() expandedChange = new EventEmitter<boolean>();
  @Output() deleteClicked = new EventEmitter<void>();
  @Output() moveUpClicked = new EventEmitter<void>();
  @Output() moveDownClicked = new EventEmitter<void>();
  @Output() lessonsClicked = new EventEmitter<void>();

  @ViewChild('panel') panel!: MatExpansionPanel;

  // ================= Internal Methods =================
  togglePanel(event: Event, panel: MatExpansionPanel) {
    event.stopPropagation();
    event.preventDefault();
    panel.toggle();
  }

  preventHeaderToggle(event: Event) {
    if (window.innerWidth < 640) {
      event.stopPropagation();
    }
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
}
