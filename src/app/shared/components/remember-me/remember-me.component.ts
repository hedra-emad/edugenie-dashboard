import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-remember-me',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RememberMeComponent),
      multi: true
    }
  ],
  templateUrl: './remember-me.component.html',
  styleUrl: './remember-me.component.css'
})
export class RememberMeComponent implements ControlValueAccessor {
  value = false;
  onChange: any = () => {};
  onTouch: any = () => {};

  toggle(event: Event) {
    const target = event.target as HTMLInputElement;
    this.value = target.checked;
    this.onChange(this.value);
    this.onTouch();
  }

  writeValue(obj: any): void {
    if (obj !== undefined) {
      this.value = obj;
    }
  }
  
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }
}
