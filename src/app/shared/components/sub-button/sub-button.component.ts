import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sub-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './sub-button.component.html',
})
export class SubButtonComponent {

  @Input() label = '';
  @Input() icon = '';
  @Input() disabled = false;
  @Input() loading = false;

  @Output() action = new EventEmitter<void>();

  onClick(): void {
    if (this.disabled || this.loading) return;
    this.action.emit();
  }
}
