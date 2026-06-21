import { Injectable, inject } from '@angular/core';
import { CanDeactivateFn, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';

/**
 * Interface for components that have pending operations
 */
export interface HasPendingOperations {
  hasPendingOperations(): boolean;
  getPendingOperationMessage(): string;
}

/**
 * Guard to prevent navigation away during pending operations (uploads, saves, etc.)
 */
@Injectable({
  providedIn: 'root'
})
export class PendingOperationsGuard {
  private dialog = inject(MatDialog);
  private router = inject(Router);

  /**
   * Check if component has pending operations and warn user
   */
  canDeactivate(component: HasPendingOperations): Observable<boolean> {
    if (!component.hasPendingOperations()) {
      return of(true);
    }

    const message = component.getPendingOperationMessage();
    
    // Show browser confirmation (works even if user tries to close tab)
    const confirmed = window.confirm(
      message + '\n\nAre you sure you want to leave? Unsaved changes may be lost.'
    );

    return of(confirmed);
  }
}

/**
 * Helper function to create CanDeactivate guard for components with pending operations
 * The generic type ensures type safety, but the guard will use the actual component instance
 */
export function createPendingOperationsGuard<T extends HasPendingOperations>(): CanDeactivateFn<T> {
  return (component: T): Observable<boolean> | boolean => {
    // Guard against case where component doesn't implement the interface
    if (!component || typeof component.hasPendingOperations !== 'function') {
      return true;
    }

    if (!component.hasPendingOperations()) {
      return true;
    }

    const message = component.getPendingOperationMessage();
    return window.confirm(
      message + '\n\nAre you sure you want to leave? Unsaved changes may be lost.'
    );
  };
}