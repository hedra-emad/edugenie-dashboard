import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: 'back-button.html',
})
export class BackButtonComponent {
  @Input() label = 'Back';
  @Output() back = new EventEmitter<void>();

  goBack(): void {
    this.back.emit();
  }
}