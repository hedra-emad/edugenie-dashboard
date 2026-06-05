import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-sidebar-menu-item',
  imports: [MatIconModule, CommonModule],
  templateUrl: './sidebar-menu-item.html',
  styleUrl: './sidebar-menu-item.css',
})
export class SidebarMenuItem {
@Input() label!: string;
@Input() icon!: string;
@Input() active = false;
}
