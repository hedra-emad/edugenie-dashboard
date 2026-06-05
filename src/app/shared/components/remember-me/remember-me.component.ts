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

  onChange: (value: boolean) => void = () => {};
  onTouched: () => void = () => {};

  toggle(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.value = checked;

    this.onChange(checked);
    this.onTouched();
  }

  writeValue(value: boolean): void {
    this.value = !!value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // optional improvement
  }
}
