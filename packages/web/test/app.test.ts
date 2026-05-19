import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import App from '../src/App.svelte';

describe('App (web shell)', () => {
  it('renders the brand title', () => {
    const { container } = render(App);
    const brand = container.querySelector('.brand');
    expect(brand?.textContent?.trim()).toBe('markdown-board');
  });

  it('renders an empty-state placeholder before a vault is opened', () => {
    const { container } = render(App);
    const emptyTitle = container.querySelector('.empty-title');
    expect(emptyTitle?.textContent?.trim()).toBe('No vault open');
  });
});
