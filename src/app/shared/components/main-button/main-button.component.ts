import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppLoader } from '../add-loader/app-loader';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-main-button',
  standalone: true,
  imports: [CommonModule, AppLoader, MatIconModule],
  templateUrl: './main-button.component.html'
})
export class MainButtonComponent {
  @Input() label = '';
  @Input() icon?: string;
  @Input() loading = false;
  @Input() disabled = false;

  @Output() action = new EventEmitter<void>();

  handleClick(): void {
    if (this.disabled || this.loading) return;
    this.action.emit();
  }
}
