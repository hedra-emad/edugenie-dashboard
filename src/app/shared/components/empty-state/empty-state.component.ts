import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css'
})
export class EmptyStateComponent {
  @Input() icon: string = 'folder_open';
  @Input() title: string = 'Nothing here yet';
  @Input() description: string = 'Get started by adding your first item.';
  @Input() actionLabel: string = 'Add Item';
  @Input() showAction: boolean = true;
  
  @Output() actionClicked = new EventEmitter<void>();

  onActionClick(): void {
    this.actionClicked.emit();
  }
}