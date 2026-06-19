import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule],
  templateUrl: './users.page.html',
})
export class AdminUsersPageComponent {
  users = [
    {
      name: 'Sarah Jenkins',
      joined: 'Joined 2 mos ago',
      email: 's.jenkins@edu.co',
      role: 'Student',
      status: 'Active',
      avatar: 'https://i.pravatar.cc/150?u=sarah'
    },
    {
      name: 'Dr. Marcus Chen',
      joined: 'Joined 1 yr ago',
      email: 'm.chen@edu.co',
      role: 'Instructor',
      status: 'Active',
      avatar: 'https://i.pravatar.cc/150?u=marcus'
    },
    {
      name: 'Elena Rodriguez',
      joined: 'Joined 3 yrs ago',
      email: 'e.rodriguez@edu.co',
      role: 'Admin',
      status: 'Inactive',
      avatar: 'https://i.pravatar.cc/150?u=elena'
    }
  ];
}
