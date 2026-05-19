export { loadVault, loadArchive, type LoadedVault } from './load.js';
export { saveLibraryFile } from './library.js';
export {
  FileSystemAccessUnsupportedError,
  VaultPickerCancelledError,
  isFileSystemAccessSupported,
  pickVaultDirectory,
} from './picker.js';
export { Autosaver, type AutosaverOptions } from './autosave.js';
export { ExternalChangeWatcher, type ExternalChangeWatcherOptions } from './watcher.js';
export {
  addSection,
  addSubtask,
  addTaskToSection,
  allProjects,
  cycleTaskPriority,
  deleteTask,
  ensureUniqueTaskIds,
  moveColumn,
  moveTask,
  renameSection,
  setSubtaskText,
  setTask,
  setTaskDay,
  setTaskNote,
  setTaskPriority,
  setTaskProject,
  setTaskTitle,
  toggleSubtask,
  type AddSectionResult,
  type ColumnMove,
  type TaskMove,
  type TaskTarget,
} from './mutate.js';
export {
  ARCHIVE_PATH,
  appendArchiveEntry,
  findTask,
  removeTask,
  unresolveTask,
  type AppendArchiveEntryOptions,
  type UnresolveFailure,
  type UnresolveSuccess,
  type UnresolveTaskResult,
} from './resolve.js';
