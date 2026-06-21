import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DraftItem {
  id: string;
  type: 'course' | 'section' | 'lesson' | 'card';
  parentId?: string;
  data: any;
  files?: DraftFile[];
  timestamp: number;
  isDirty: boolean;
}

export interface DraftFile {
  id: string;
  name: string;
  type: string;
  size: number;
  fieldName: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DraftStateService {
  private readonly STORAGE_KEY = 'edugenie_draft_state';
  private readonly FILE_STORAGE_KEY = 'edugenie_files_metadata';

  private fileStorage = new Map<string, File>();
  private draftItems = new Map<string, DraftItem>();
  private draftChanges$ = new BehaviorSubject<Map<string, DraftItem>>(new Map());

  constructor() {
    this.loadFromStorage();
    // this.purgeStaleUploadStateKeys();
  }

  private purgeStaleUploadStateKeys(): void {
    const prefix = 'edugenie_upload_state';
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      const isCurrentFormat = key.startsWith(prefix + ':draft_');
      const isExactOldKey = key === prefix;
      if (key.startsWith(prefix) && !isCurrentFormat) {
        localStorage.removeItem(key);
      }
      if (isExactOldKey) {
        localStorage.removeItem(key);
      }
    }
  }

  saveDraft(item: Partial<DraftItem>): void {
    if (!item.id || !item.type) {
      console.warn('Draft item must have id and type');
      return;
    }

    const existingItem = this.draftItems.get(item.id);
    const draftItem: DraftItem = {
      ...existingItem,
      ...item,
      timestamp: Date.now(),
      isDirty: true,
    } as DraftItem;

    this.draftItems.set(item.id, draftItem);
    this.saveToStorage();
    this.notifyChanges();
  }

  getDraft(id: string): DraftItem | null {
    return this.draftItems.get(id) || null;
  }

  removeDraft(id: string, onCleanup?: (draft: DraftItem) => void): void {
    const draft = this.draftItems.get(id);

    if (draft && onCleanup) {
      onCleanup(draft);
    }

    this.draftItems.delete(id);
    this.saveToStorage();
    this.notifyChanges();
  }

  clearAllDrafts(): void {
    this.draftItems.clear();
    this.fileStorage.clear();
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.FILE_STORAGE_KEY);
    this.notifyChanges();
  }

  getDraftsByType(type: DraftItem['type']): DraftItem[] {
    return Array.from(this.draftItems.values())
      .filter(item => item.type === type);
  }

  getDraftsByParent(parentId: string): DraftItem[] {
    return Array.from(this.draftItems.values())
      .filter(item => item.parentId === parentId);
  }

  storeFile(draftId: string, fieldName: string, file: File): string {
    const fileId = `${draftId}_${fieldName}_${Date.now()}`;
    this.fileStorage.set(fileId, file);

    const fileMetadata: DraftFile = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      fieldName,
      status: 'pending'
    };

    const draftItem = this.getDraft(draftId);
    if (draftItem) {
      if (!draftItem.files) draftItem.files = [];
      draftItem.files = draftItem.files.filter(f => f.fieldName !== fieldName);
      draftItem.files.push(fileMetadata);
      this.saveDraft(draftItem);
    }

    this.saveFileMetadata();
    return fileId;
  }

  getFile(fileId: string): File | null {
    return this.fileStorage.get(fileId) || null;
  }

  updateFileStatus(fileId: string, status: DraftFile['status'], url?: string, error?: string): void {
    for (const [draftId, draftItem] of this.draftItems) {
      if (draftItem.files) {
        const fileIndex = draftItem.files.findIndex(f => f.id === fileId);
        if (fileIndex >= 0) {
          draftItem.files[fileIndex].status = status;
          if (url) draftItem.files[fileIndex].url = url;
          if (error) draftItem.files[fileIndex].error = error;
          this.saveDraft(draftItem);
          break;
        }
      }
    }
    this.saveFileMetadata();
  }

  removeFile(fileId: string): void {
    this.fileStorage.delete(fileId);

    for (const [draftId, draftItem] of this.draftItems) {
      if (draftItem.files) {
        draftItem.files = draftItem.files.filter(f => f.id !== fileId);
        this.saveDraft(draftItem);
      }
    }

    this.saveFileMetadata();
  }

  getFileMetadata(draftId: string, fieldName: string): DraftFile | null {
    const draftItem = this.getDraft(draftId);
    if (!draftItem?.files) return null;
    return draftItem.files.find(f => f.fieldName === fieldName) || null;
  }

  getDraftChanges(): Observable<Map<string, DraftItem>> {
    return this.draftChanges$.asObservable();
  }

  hasUnsavedChanges(id: string): boolean {
    const draft = this.getDraft(id);
    return draft ? draft.isDirty : false;
  }

  getAllDirtyItems(): DraftItem[] {
    return Array.from(this.draftItems.values())
      .filter(item => item.isDirty);
  }

  private serializeItem(item: DraftItem): object {
    return {
      ...item,
      files: item.files?.map(f => ({
        id: f.id, name: f.name, type: f.type, size: f.size,
        fieldName: f.fieldName, status: f.status, url: f.url, error: f.error
      }))
    };
  }

  private saveToStorage(): void {
    try {
      const allDrafts = Array.from(this.draftItems.values()).map(item => this.serializeItem(item));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allDrafts));
      this.saveFileMetadata();
    } catch (error) {
      console.warn('Failed to save draft state:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const drafts = JSON.parse(stored);
        if (Array.isArray(drafts)) {
          for (const item of drafts) {
            if (item && item.id) {
              this.draftItems.set(item.id, item);
            }
          }
        }
      }
      this.loadFileMetadata();
      console.log('[DraftStateService] Loaded', this.draftItems.size, 'drafts from storage');
      this.notifyChanges();
    } catch (error) {
      console.warn('Failed to load draft state:', error);
    }
  }

  private saveFileMetadata(): void {
    try {
      const fileMetadata: any[] = [];
      for (const [draftId, draftItem] of this.draftItems) {
        if (draftItem.files) {
          for (const file of draftItem.files) {
            fileMetadata.push({ draftId, ...file });
          }
        }
      }
      if (fileMetadata.length === 0) {
        localStorage.removeItem(this.FILE_STORAGE_KEY);
      } else {
        localStorage.setItem(this.FILE_STORAGE_KEY, JSON.stringify(fileMetadata));
      }
    } catch (error) {
      console.warn('Failed to save file metadata:', error);
    }
  }

  private loadFileMetadata(): void {
    // Files can't be restored from localStorage (browser security)
    // But metadata is already loaded via loadFromStorage
  }

  private notifyChanges(): void {
    this.draftChanges$.next(new Map(this.draftItems));
  }

  generateDraftId(type: string, parentId?: string): string {
    if (type === 'course') {
      const existingDraft = Array.from(this.draftItems.values())
        .find(item => item.type === 'course' && this.isDraftId(item.id));
      if (existingDraft) {
        return existingDraft.id;
      }
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `draft_${type}_${parentId || 'root'}_${timestamp}_${random}`;
  }

  isDraftId(id: string): boolean {
    return id.startsWith('draft_');
  }

  cleanupOldDrafts(): void {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    for (const [id, item] of this.draftItems) {
      if (item.timestamp < sevenDaysAgo) {
        this.removeDraft(id);
      }
    }
  }
}