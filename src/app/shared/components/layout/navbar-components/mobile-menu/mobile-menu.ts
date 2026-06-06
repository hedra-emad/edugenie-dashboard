import {
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';
import { NavbarSearchComponent } from '../navbar-search.component/navbar-search.component';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-mobile-menu',
  standalone: true,
  imports: [
    CommonModule,
    NavbarSearchComponent,
    RouterModule,
    MatIcon
],
  templateUrl: './mobile-menu.html',
})
export class MobileMenuComponent {
  @Output() closeMenu = new EventEmitter<void>();
} 