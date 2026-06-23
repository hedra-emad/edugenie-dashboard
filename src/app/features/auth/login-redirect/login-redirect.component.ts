import { Component } from '@angular/core';


@Component({ standalone: true, template: '' })
export class LoginRedirectComponent {
  constructor() {
    window.location.href = `${import.meta.env.NG_APP_STUDENT_APP_URL}/login`;
  }
}
