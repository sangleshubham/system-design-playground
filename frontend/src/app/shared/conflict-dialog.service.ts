import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { ConflictDialogComponent, type ConflictChoice } from './conflict-dialog.component.js';

/**
 * Opens the stale-write conflict dialog (FR-011). Resolves to the chosen action, or `null`
 * when the user dismisses it (backdrop click) — which the caller treats as "leave the canvas
 * untouched and unsaved". Modeled on ConfirmDialogService but with two distinct actions.
 */
@Injectable({ providedIn: 'root' })
export class ConflictDialogService {
  private readonly overlay = inject(Overlay);

  open(): Promise<ConflictChoice | null> {
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });
    const ref = overlayRef.attach(new ComponentPortal(ConflictDialogComponent));

    return new Promise<ConflictChoice | null>((resolve) => {
      const finish = (result: ConflictChoice | null) => {
        overlayRef.dispose();
        resolve(result);
      };
      ref.instance.chosen.subscribe((choice) => finish(choice));
      overlayRef.backdropClick().subscribe(() => finish(null));
    });
  }
}
