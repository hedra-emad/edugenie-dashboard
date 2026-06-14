import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';


@Component({
  selector: 'app-sales-table',
  imports: [MatIconModule, MatButtonModule, CommonModule, MatChipsModule],
  templateUrl: './sales-table.component.html',
  styleUrl: './sales-table.component.css',
})
export class SalesTableComponent {
  @Input() recentSales: any[] | undefined = [];
}
