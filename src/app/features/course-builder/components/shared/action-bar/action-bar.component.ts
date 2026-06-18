import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MainButtonComponent } from '../../../../../shared/components/main-button/main-button.component';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  imports: [CommonModule, MainButtonComponent],
  templateUrl: './action-bar.component.html'
})
export class ActionBarComponent {
  @Input() backLabel?: string;
  @Input() showBack = true;
  @Input() actionLabel!: string;
  @Input() actionIcon?: string;
  @Input() loading = false;
  @Input() disabled = false;

  @Output() back = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
}