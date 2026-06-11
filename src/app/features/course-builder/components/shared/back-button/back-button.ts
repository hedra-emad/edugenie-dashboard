import { CommonModule, Location } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: 'back-button.html',
})
export class BackButtonComponent {
  @Input() label = 'Back';

  private location = inject(Location);

  goBack(): void {
    this.location.back();
  }
}