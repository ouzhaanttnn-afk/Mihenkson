import { describe, expect, it } from 'vitest';

import { isolateModal } from './useModalSurface';

class FakeElement {
  parentElement: FakeElement | null = null;
  children: FakeElement[] = [];
  inert = false;
  private readonly attributes = new Map<string, string>();

  append(...children: FakeElement[]): this {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
    return this;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

describe('modal arka plan izolasyonu', () => {
  it('modal dalı dışını inert yapar ve önceki değerleri kapanışta aynen geri yükler', () => {
    const dialog = new FakeElement();
    const scrim = new FakeElement().append(dialog);
    const game = new FakeElement();
    const nav = new FakeElement();
    const device = new FakeElement().append(game, nav, scrim);
    const frameSibling = new FakeElement();
    const frame = new FakeElement().append(device, frameSibling);
    const bodySibling = new FakeElement();
    const body = new FakeElement().append(frame, bodySibling);

    nav.inert = true;
    nav.setAttribute('aria-hidden', 'false');

    const elementDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'HTMLElement');
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'HTMLElement', {
      configurable: true,
      value: FakeElement,
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { body },
    });

    try {
      const restore = isolateModal(dialog as unknown as HTMLElement);

      expect(dialog.inert).toBe(false);
      expect(scrim.inert).toBe(false);
      for (const outside of [game, nav, frameSibling, bodySibling]) {
        expect(outside.inert).toBe(true);
        expect(outside.getAttribute('aria-hidden')).toBe('true');
      }

      restore();

      expect(game.inert).toBe(false);
      expect(game.getAttribute('aria-hidden')).toBeNull();
      expect(nav.inert).toBe(true);
      expect(nav.getAttribute('aria-hidden')).toBe('false');
      expect(frameSibling.inert).toBe(false);
      expect(frameSibling.getAttribute('aria-hidden')).toBeNull();
      expect(bodySibling.inert).toBe(false);
      expect(bodySibling.getAttribute('aria-hidden')).toBeNull();
    } finally {
      if (elementDescriptor) Object.defineProperty(globalThis, 'HTMLElement', elementDescriptor);
      else Reflect.deleteProperty(globalThis, 'HTMLElement');
      if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
      else Reflect.deleteProperty(globalThis, 'document');
    }
  });
});
