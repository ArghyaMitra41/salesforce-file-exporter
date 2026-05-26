import { create } from 'zustand';
import type { FileRecord, ExportJob, ExportProgress, ExportConfig } from '../../types/export';

interface ExportState {
  job: ExportJob | null;
  files: FileRecord[];
  progress: ExportProgress;
}

interface ExportActions {
  startJob: (config: ExportConfig) => ExportJob;
  setFiles: (files: FileRecord[]) => void;
  updateProgress: (update: Partial<ExportProgress>) => void;
  updateFileStatus: (fileId: string, status: FileRecord['status'], errorMessage?: string) => void;
  cancelJob: () => void;
  resetJob: () => void;
  appendLog: (entry: string) => void;
}

const initialProgress: ExportProgress = {
  phase: 'idle',
  totalFiles: 0,
  completedFiles: 0,
  errorFiles: 0,
  totalBytes: 0,
  downloadedBytes: 0,
  currentFileName: undefined,
  errorMessage: undefined,
  log: [],
};

export const useExportStore = create<ExportState & ExportActions>()((set, get) => ({
  job: null,
  files: [],
  progress: { ...initialProgress },

  startJob: (config: ExportConfig) => {
    const abortController = new AbortController();
    const job: ExportJob = {
      id: crypto.randomUUID(),
      config,
      createdAt: new Date().toISOString(),
      abortController,
    };
    set({
      job,
      files: [],
      progress: { ...initialProgress, phase: 'resolving', log: ['[Export started]'] },
    });
    return job;
  },

  setFiles: (files: FileRecord[]) => {
    const totalBytes = files.reduce((sum, f) => sum + (f.contentSize || 0), 0);
    set({
      files,
      progress: {
        ...get().progress,
        totalFiles: files.length,
        totalBytes,
      },
    });
  },

  updateProgress: (update: Partial<ExportProgress>) => {
    set((state) => ({
      progress: { ...state.progress, ...update },
    }));
  },

  updateFileStatus: (fileId: string, status: FileRecord['status'], errorMessage?: string) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, status, errorMessage } : f
      ),
    }));
  },

  cancelJob: () => {
    const { job } = get();
    if (job) {
      job.abortController.abort();
    }
    set((state) => ({
      progress: { ...state.progress, phase: 'cancelled' },
    }));
  },

  resetJob: () => {
    set({
      job: null,
      files: [],
      progress: { ...initialProgress },
    });
  },

  appendLog: (entry: string) => {
    set((state) => ({
      progress: {
        ...state.progress,
        log: [...state.progress.log, entry],
      },
    }));
  },
}));
