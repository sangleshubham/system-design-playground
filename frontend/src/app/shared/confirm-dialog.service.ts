import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';
import { ConfirmDialogComponent, type ConfirmOptions } from './confirm-dialog.component.js';

/** Opens a centered, backdrop-dimmed confirm dialog. Resolves true/false. */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly overlay = inject(Overlay);

  confirm(options: ConfirmOptions): Promise<boolean> {
    const overlayRef = this.overlay.create({
      hasBackdrop: true,
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    });
    const ref = overlayRef.attach(new ComponentPortal(ConfirmDialogComponent));
    ref.setInput('data', options);

    return new Promise<boolean>((resolve) => {
      const finish = (result: boolean) => {
        overlayRef.dispose();
        resolve(result);
      };
      ref.instance.confirmed.subscribe(() => finish(true));
      ref.instance.cancelled.subscribe(() => finish(false));
      overlayRef.backdropClick().subscribe(() => finish(false));
    });
  }
}
