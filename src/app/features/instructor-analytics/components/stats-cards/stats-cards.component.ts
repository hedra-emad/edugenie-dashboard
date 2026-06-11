import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';


@Component({
  selector: 'app-stats-cards',
  imports: [MatIconModule, MatButtonModule, CommonModule],
  templateUrl: './stats-cards.component.html',
  styleUrl: './stats-cards.component.css',
 
})
export class StatsCardsComponent {
  @Input() stats: any;
}
