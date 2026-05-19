// Vault directory picker — wraps the File System Access API's
// `showDirectoryPicker` with feature detection and a typed cancel-vs-
// unsupported-vs-error split so the shell can branch on the failure
// shape without sniffing DOM error names.

export class VaultPickerCancelledError extends Error {
  override readonly name = 'VaultPickerCancelledError';
  constructor() {
    super('Vault picker was cancelled by the user.');
  }
}

export class FileSystemAccessUnsupportedError extends Error {
  override readonly name = 'FileSystemAccessUnsupportedError';
  constructor() {
    super(
      'This browser does not support the File System Access API. ' +
        'Use Chrome, Edge, or another Chromium-based browser.',
    );
  }
}

type ShowDirectoryPickerOptions = {
  mode?: 'read' | 'readwrite';
};

type ShowDirectoryPicker = (
  options?: ShowDirectoryPickerOptions,
) => Promise<FileSystemDirectoryHandle>;

interface PickerCapableWindow extends Window {
  showDirectoryPicker: ShowDirectoryPicker;
}

function hasPicker(w: Window): w is PickerCapableWindow {
  return 'showDirectoryPicker' in w;
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && hasPicker(window);
}

export async function pickVaultDirectory(): Promise<FileSystemDirectoryHandle> {
  if (typeof window === 'undefined' || !hasPicker(window)) {
    throw new FileSystemAccessUnsupportedError();
  }
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new VaultPickerCancelledError();
    }
    throw err;
  }
}
