import { describe, expect, it } from 'vitest';
import { CORE_VERSION } from '../src/index.js';

describe('core scaffold', () => {
  it('exposes a version constant', () => {
    expect(CORE_VERSION).toBe('0.0.0');
  });
});
