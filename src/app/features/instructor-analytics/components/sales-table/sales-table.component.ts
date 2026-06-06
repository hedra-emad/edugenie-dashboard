import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sales-table',
  imports: [MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './sales-table.component.html',
  styleUrl: './sales-table.component.css',
  
})
export class SalesTableComponent {

}
