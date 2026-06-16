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
  @Input() size: number = 40;
  @Input() color: string = '#00B0FF';
  @Input() fullScreen: boolean = false;
  @Input() text: string = '';
}