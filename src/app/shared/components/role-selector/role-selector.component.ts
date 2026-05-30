import { Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-role-selector',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RoleSelectorComponent),
      multi: true
    }
  ],
  templateUrl: './role-selector.component.html',
  styleUrl: './role-selector.component.css'
})
export class RoleSelectorComponent implements ControlValueAccessor {
  value: 'student' | 'instructor' = 'student';
  onChange: any = () => {};
  onTouch: any = () => {};

  selectRole(role: 'student' | 'instructor') {
    this.value = role;
    this.onChange(this.value);
    this.onTouch();
  }

  writeValue(obj: any): void {
    if (obj) {
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
