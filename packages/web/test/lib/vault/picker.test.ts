import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FileSystemAccessUnsupportedError,
  VaultPickerCancelledError,
  isFileSystemAccessSupported,
  pickVaultDirectory,
} from '../../../src/lib/vault/picker.js';

type WindowWithPicker = Window & {
  showDirectoryPicker?: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<unknown>;
};

function installPicker(impl: (opts?: { mode?: 'read' | 'readwrite' }) => Promise<unknown>): void {
  (window as WindowWithPicker).showDirectoryPicker = impl;
}

function removePicker(): void {
  delete (window as WindowWithPicker).showDirectoryPicker;
}

describe('vault picker', () => {
  afterEach(() => {
    removePicker();
  });

  describe('isFileSystemAccessSupported', () => {
    it('returns false when showDirectoryPicker is missing', () => {
      expect(isFileSystemAccessSupported()).toBe(false);
    });

    it('returns true when showDirectoryPicker is present', () => {
      installPicker(async () => ({}));
      expect(isFileSystemAccessSupported()).toBe(true);
    });
  });

  describe('pickVaultDirectory', () => {
    it('throws FileSystemAccessUnsupportedError when the API is missing', async () => {
      await expect(pickVaultDirectory()).rejects.toBeInstanceOf(FileSystemAccessUnsupportedError);
    });

    it('returns the directory handle on success', async () => {
      const handle = { kind: 'directory', name: 'vault' };
      installPicker(async () => handle);
      const result = await pickVaultDirectory();
      expect(result).toBe(handle);
    });

    it('passes mode: "readwrite" to the picker', async () => {
      const picker = vi.fn(async () => ({ kind: 'directory' }));
      installPicker(picker);
      await pickVaultDirectory();
      expect(picker).toHaveBeenCalledWith({ mode: 'readwrite' });
    });

    it('converts AbortError DOMException into VaultPickerCancelledError', async () => {
      installPicker(async () => {
        throw new DOMException('User dismissed the picker.', 'AbortError');
      });
      await expect(pickVaultDirectory()).rejects.toBeInstanceOf(VaultPickerCancelledError);
    });

    it('propagates other errors unchanged', async () => {
      installPicker(async () => {
        throw new Error('disk on fire');
      });
      await expect(pickVaultDirectory()).rejects.toThrow('disk on fire');
    });
  });
});

describe('error class shapes', () => {
  beforeEach(() => {
    removePicker();
  });

  it('VaultPickerCancelledError has a stable name', () => {
    const err = new VaultPickerCancelledError();
    expect(err.name).toBe('VaultPickerCancelledError');
    expect(err).toBeInstanceOf(Error);
  });

  it('FileSystemAccessUnsupportedError has a stable name and human message', () => {
    const err = new FileSystemAccessUnsupportedError();
    expect(err.name).toBe('FileSystemAccessUnsupportedError');
    expect(err.message).toMatch(/File System Access API/);
  });
});
