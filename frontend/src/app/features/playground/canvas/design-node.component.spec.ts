import { describe, it, expect } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FFlowModule } from '@foblex/flow';
import { DesignNodeComponent } from './design-node.component';
import { COMPONENT_ICONS } from '../../../shared/component-icon.registry';
import type { Component as CatalogComponent, DesignNode } from '../../../core/models';

// jsdom has no ResizeObserver, which Foblex Flow relies on (mirrors canvas.component.spec.ts).
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver ??= ResizeObserverStub;

// DesignNodeComponent uses Foblex's fNodeInput/fNodeOutput directives, which inject an
// FMediator that only exists inside an <f-flow><f-canvas>...</f-canvas></f-flow> tree (the
// same reason canvas.component.spec.ts always renders it through the full CanvasComponent
// rather than TestBed.createComponent(DesignNodeComponent) directly — that throws NG0201).
// This minimal host reproduces just enough Foblex scaffolding to mount one node and exposes
// signals the test can drive, then inspects the DesignNodeComponent instance/DOM directly.
@Component({
  standalone: true,
  imports: [FFlowModule, DesignNodeComponent],
  template: `
    <f-flow>
      <f-canvas>
        <div fNode [fNodeId]="hostNode().id" [fNodePosition]="{ x: 0, y: 0 }">
          <app-design-node [node]="hostNode()" [component]="hostComponent()" />
        </div>
      </f-canvas>
    </f-flow>
  `,
})
class DesignNodeHostComponent {
  readonly hostNode = signal<DesignNode>(makeNode());
  readonly hostComponent = signal<CatalogComponent | undefined>(undefined);
}

function makeNode(overrides: Partial<DesignNode> = {}): DesignNode {
  return {
    id: 'n1',
    componentId: 'dns',
    displayName: 'DNS',
    note: '',
    x: 0,
    y: 0,
    ...overrides,
  };
}

const dns: CatalogComponent = {
  id: 'dns',
  name: 'DNS',
  tech: 'Route 53',
  category: 'networking',
  description: 'domain name resolution',
  costPerHr: 0.05,
  latencyMs: 5,
  icon: 'aws-route-53',
};

const bogusCompute: CatalogComponent = {
  id: 'weird-compute',
  name: 'Weird Compute',
  tech: 'Mystery',
  category: 'compute',
  description: 'unrecognized icon id',
  costPerHr: 0.1,
  latencyMs: 10,
  icon: 'bogus',
};

function mountDesignNode(node: DesignNode, component: CatalogComponent | undefined) {
  TestBed.configureTestingModule({ imports: [DesignNodeHostComponent] });
  const fixture = TestBed.createComponent(DesignNodeHostComponent);
  fixture.componentInstance.hostNode.set(node);
  fixture.componentInstance.hostComponent.set(component);
  fixture.detectChanges();
  const designNodeDebugEl = fixture.debugElement.query(By.directive(DesignNodeComponent));
  const designNode = designNodeDebugEl.componentInstance as DesignNodeComponent;
  return { fixture, designNode };
}

describe('DesignNodeComponent', () => {
  it('resolves iconName to aws-route-53 for a dns component and renders that SVG', () => {
    const { fixture, designNode } = mountDesignNode(makeNode(), dns);

    expect(designNode.iconName()).toBe('aws-route-53');

    // Rendered <app-icon name="aws-route-53"> injects COMPONENT_ICONS['aws-route-53'] via
    // innerHTML; compare with whitespace collapsed since the DOM serializer may reflow the
    // template literal's line breaks without changing its actual markup.
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    const iconHtml = (fixture.nativeElement as HTMLElement).querySelector('.icon .app-icon')?.innerHTML ?? '';
    expect(normalize(iconHtml)).toBe(normalize(COMPONENT_ICONS['aws-route-53']));
  });

  it('falls back to fallback-services when component is undefined (default category path)', () => {
    const { designNode } = mountDesignNode(makeNode({ componentId: 'ghost' }), undefined);

    expect(designNode.iconName()).toBe('fallback-services');
  });

  it('falls back to fallback-compute for an unknown icon id with a known category', () => {
    const { designNode } = mountDesignNode(
      makeNode({ id: 'n2', componentId: 'weird-compute', displayName: 'Weird Compute' }),
      bogusCompute,
    );

    expect(designNode.iconName()).toBe('fallback-compute');
  });
});
