import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.css'
})
export class NotFoundPageComponent {
  constructor(private router: Router) {}

  goBack(): void {
    window.history.back();
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
}