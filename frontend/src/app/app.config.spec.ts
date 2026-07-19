import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { OverlayContainer, FullscreenOverlayContainer } from '@angular/cdk/overlay';
import { appConfig } from './app.config';

// US1 / contract C1: the app registers Angular CDK's FullscreenOverlayContainer so every CDK
// overlay (confirm dialog, conflict dialog, future overlays) re-parents into the fullscreen
// element while fullscreen is active — otherwise popups are invisible over the fullscreen canvas.
describe('appConfig overlay container provider', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  it('binds OverlayContainer to FullscreenOverlayContainer', () => {
    expect(TestBed.inject(OverlayContainer)).toBeInstanceOf(FullscreenOverlayContainer);
  });
});
