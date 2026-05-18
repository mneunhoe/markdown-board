import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ProjectPill from '../../src/components/ProjectPill.svelte';
import { projectColor } from '../../src/lib/project.js';

describe('ProjectPill', () => {
  it('renders nothing when project is null', () => {
    const { container } = render(ProjectPill, { project: null });
    expect(container.querySelector('.project-pill')).toBeNull();
    expect(container.textContent?.trim()).toBe('');
  });

  it('renders the short form of a simple project tag', () => {
    const { container } = render(ProjectPill, { project: 'PSD_GAN' });
    const pill = container.querySelector('.project-pill');
    expect(pill).not.toBeNull();
    expect(pill?.textContent?.trim()).toBe('PSD_GAN');
  });

  it('shortens em-dash-suffixed project tags', () => {
    const { container } = render(ProjectPill, { project: 'PSD_GAN — open decisions' });
    expect(container.querySelector('.project-pill')?.textContent?.trim()).toBe('PSD_GAN');
  });

  it('sets the --project-color CSS variable to the hashed colour', () => {
    const { container } = render(ProjectPill, { project: 'PSD_GAN' });
    const pill = container.querySelector<HTMLElement>('.project-pill');
    expect(pill?.style.getPropertyValue('--project-color')).toBe(projectColor('PSD_GAN'));
  });

  it('surfaces the full tag as the title attribute when it differs from the short form', () => {
    const { container } = render(ProjectPill, { project: 'PSD_GAN — open decisions' });
    expect(container.querySelector('.project-pill')?.getAttribute('title')).toBe(
      'PSD_GAN — open decisions',
    );
  });

  it('omits the title attribute when the full tag equals the short form', () => {
    const { container } = render(ProjectPill, { project: 'PSD_GAN' });
    expect(container.querySelector('.project-pill')?.hasAttribute('title')).toBe(false);
  });

  it('exposes an aria-label naming the project', () => {
    const { container } = render(ProjectPill, { project: 'PSD_GAN — open decisions' });
    expect(container.querySelector('.project-pill')?.getAttribute('aria-label')).toBe(
      'project PSD_GAN',
    );
  });
});
