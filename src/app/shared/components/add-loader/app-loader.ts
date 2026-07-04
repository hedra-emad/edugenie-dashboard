import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-loader.html',
  styleUrls: ['./app-loader.css']
})
export class AppLoader {
  @Input() size = 40;
  @Input() color = '#00B0FF';
  @Input() fullScreen = false;
  @Input() text = '';
}