import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar-profile',
  imports: [MatIconModule],
  templateUrl: './sidebar-profile.html',
  styleUrl: './sidebar-profile.css',
})
export class SidebarProfile {
@Input() avatar!: string;
@Input() name!: string;
@Input() role!: string;
}
