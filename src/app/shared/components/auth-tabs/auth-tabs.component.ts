import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-tabs.component.html',
  styleUrl: './auth-tabs.component.css'
})
export class AuthTabsComponent {
  @Input() activeTab: 'signin' | 'signup' = 'signin';
  @Output() onTabChange = new EventEmitter<'signin' | 'signup'>();

  selectTab(tab: 'signin' | 'signup') {
    this.onTabChange.emit(tab);
  }
}