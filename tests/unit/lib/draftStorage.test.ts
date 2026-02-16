/**
 * Tests for draftStorage — file-based draft persistence
 */

import { promises as fs } from 'fs';
import path from 'path';

// Mock 'use server' directive (Next.js server actions)
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      mkdir: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn(),
      writeFile: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const mockFs = fs as jest.Mocked<typeof fs>;

import {
  getDrafts,
  saveDrafts,
  getDraftForForm,
  saveDraft,
  deleteDraft,
  cleanExpiredDrafts,
  getGlobalDrafts,
  saveGlobalDrafts,
  getGlobalDraftForForm,
  saveGlobalDraft,
  deleteGlobalDraft,
  cleanExpiredGlobalDrafts,
} from '@/lib/draftStorage';
import { FormDraft } from '@/types/form';

function createMockDraft(overrides: Partial<FormDraft> = {}): FormDraft {
  return {
    id: 'draft-1',
    formId: 'form-1',
    formVersion: 1,
    data: { name: 'Test' },
    currentPage: 0,
    fieldInteractions: {},
    startedAt: '2026-01-15T10:00:00Z',
    lastSavedAt: '2026-01-15T10:05:00Z',
    expiresAt: '2026-02-15T10:00:00Z',
    sessionId: 'session-1',
    ...overrides,
  };
}

describe('draftStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // Session-scoped drafts
  // ============================================
  describe('getDrafts', () => {
    it('returns empty array when file does not exist', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const drafts = await getDrafts('session-1');
      expect(drafts).toEqual([]);
    });

    it('returns parsed drafts from file', async () => {
      const mockDrafts = [createMockDraft()];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDrafts));
      const drafts = await getDrafts('session-1');
      expect(drafts).toHaveLength(1);
      expect(drafts[0].formId).toBe('form-1');
    });

    it('ensures data directory exists', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      await getDrafts('session-1');
      expect(mockFs.mkdir).toHaveBeenCalled();
    });
  });

  describe('saveDrafts', () => {
    it('writes drafts to file as JSON', async () => {
      const drafts = [createMockDraft()];
      await saveDrafts('session-1', drafts);
      expect(mockFs.writeFile).toHaveBeenCalled();
      const [filePath, content] = (mockFs.writeFile as jest.Mock).mock.calls[0];
      expect(filePath).toContain('session-1');
      expect(filePath).toContain('form-drafts.json');
      const parsed = JSON.parse(content as string);
      expect(parsed).toHaveLength(1);
    });

    it('creates session directory', async () => {
      await saveDrafts('session-1', []);
      expect(mockFs.mkdir).toHaveBeenCalledTimes(2); // ensureDataDir + sessionDir
    });
  });

  describe('getDraftForForm', () => {
    it('returns matching draft', async () => {
      const drafts = [
        createMockDraft({ formId: 'form-1' }),
        createMockDraft({ id: 'draft-2', formId: 'form-2' }),
      ];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const draft = await getDraftForForm('session-1', 'form-2');
      expect(draft).not.toBeNull();
      expect(draft!.formId).toBe('form-2');
    });

    it('returns null when no match', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([createMockDraft()]));
      const draft = await getDraftForForm('session-1', 'nonexistent');
      expect(draft).toBeNull();
    });
  });

  describe('saveDraft', () => {
    it('adds new draft when none exists for the form', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      const draft = createMockDraft({ formId: 'form-new' });
      await saveDraft('session-1', draft);
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(1);
      expect(written[0].formId).toBe('form-new');
      expect(written[0].lastSavedAt).toBeDefined();
    });

    it('updates existing draft for same form', async () => {
      const existing = [createMockDraft({ formId: 'form-1', data: { name: 'Old' } })];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existing));
      const updated = createMockDraft({ formId: 'form-1', data: { name: 'New' } });
      await saveDraft('session-1', updated);
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(1);
      expect(written[0].data.name).toBe('New');
    });

    it('sets lastSavedAt timestamp', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      const before = new Date().toISOString();
      await saveDraft('session-1', createMockDraft());
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(new Date(written[0].lastSavedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      );
    });
  });

  describe('deleteDraft', () => {
    it('removes draft for specified form', async () => {
      const drafts = [
        createMockDraft({ formId: 'form-1' }),
        createMockDraft({ id: 'draft-2', formId: 'form-2' }),
      ];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const result = await deleteDraft('session-1', 'form-1');
      expect(result).toBe(true);
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(1);
      expect(written[0].formId).toBe('form-2');
    });

    it('returns false when draft not found', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify([createMockDraft()]));
      const result = await deleteDraft('session-1', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('cleanExpiredDrafts', () => {
    it('removes expired drafts', async () => {
      const drafts = [
        createMockDraft({ formId: 'form-1', expiresAt: '2020-01-01T00:00:00Z' }),
        createMockDraft({ id: 'draft-2', formId: 'form-2', expiresAt: '2030-01-01T00:00:00Z' }),
      ];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const count = await cleanExpiredDrafts('session-1');
      expect(count).toBe(1);
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(1);
      expect(written[0].formId).toBe('form-2');
    });

    it('keeps drafts without expiresAt', async () => {
      const drafts = [createMockDraft({ expiresAt: undefined as any })];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const count = await cleanExpiredDrafts('session-1');
      expect(count).toBe(0);
    });

    it('returns 0 when no drafts are expired', async () => {
      const drafts = [createMockDraft({ expiresAt: '2030-12-31T23:59:59Z' })];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const count = await cleanExpiredDrafts('session-1');
      expect(count).toBe(0);
    });
  });

  // ============================================
  // Global drafts
  // ============================================
  describe('getGlobalDrafts', () => {
    it('returns empty array when file does not exist', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('ENOENT'));
      const drafts = await getGlobalDrafts();
      expect(drafts).toEqual([]);
    });

    it('returns parsed global drafts', async () => {
      const mockDrafts = [createMockDraft()];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockDrafts));
      const drafts = await getGlobalDrafts();
      expect(drafts).toHaveLength(1);
    });
  });

  describe('saveGlobalDrafts', () => {
    it('writes to global drafts file', async () => {
      await saveGlobalDrafts([createMockDraft()]);
      expect(mockFs.writeFile).toHaveBeenCalled();
      const [filePath] = (mockFs.writeFile as jest.Mock).mock.calls[0];
      expect(filePath).toContain('global-form-drafts.json');
    });
  });

  describe('getGlobalDraftForForm', () => {
    it('matches by fingerprint', async () => {
      const drafts = [createMockDraft({ formId: 'form-1', fingerprint: 'fp-123' })];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const draft = await getGlobalDraftForForm('form-1', 'fp-123');
      expect(draft).not.toBeNull();
      expect(draft!.fingerprint).toBe('fp-123');
    });

    it('matches by sessionId', async () => {
      const drafts = [createMockDraft({ formId: 'form-1', sessionId: 'sess-abc' })];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const draft = await getGlobalDraftForForm('form-1', 'sess-abc');
      expect(draft).not.toBeNull();
    });

    it('returns null for no match', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      const draft = await getGlobalDraftForForm('form-1', 'unknown');
      expect(draft).toBeNull();
    });
  });

  describe('saveGlobalDraft', () => {
    it('adds new global draft', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      await saveGlobalDraft(createMockDraft({ fingerprint: 'fp-new' }));
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(1);
    });

    it('updates existing global draft by fingerprint', async () => {
      const existing = [createMockDraft({ formId: 'form-1', fingerprint: 'fp-1', data: { old: true } })];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existing));
      await saveGlobalDraft(createMockDraft({ formId: 'form-1', fingerprint: 'fp-1', data: { new: true } }));
      const written = JSON.parse((mockFs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(written).toHaveLength(1);
      expect(written[0].data.new).toBe(true);
    });
  });

  describe('deleteGlobalDraft', () => {
    it('removes matching global draft', async () => {
      const drafts = [
        createMockDraft({ formId: 'form-1', fingerprint: 'fp-1' }),
        createMockDraft({ id: 'd2', formId: 'form-2', fingerprint: 'fp-2' }),
      ];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const result = await deleteGlobalDraft('form-1', 'fp-1');
      expect(result).toBe(true);
    });

    it('returns false when no match', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('[]');
      const result = await deleteGlobalDraft('form-1', 'unknown');
      expect(result).toBe(false);
    });
  });

  describe('cleanExpiredGlobalDrafts', () => {
    it('removes expired global drafts', async () => {
      const drafts = [
        createMockDraft({ expiresAt: '2020-01-01T00:00:00Z' }),
        createMockDraft({ id: 'd2', formId: 'f2', expiresAt: '2030-01-01T00:00:00Z' }),
      ];
      (mockFs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(drafts));
      const count = await cleanExpiredGlobalDrafts();
      expect(count).toBe(1);
    });

    it('returns 0 when nothing expired', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify([createMockDraft({ expiresAt: '2030-12-31T23:59:59Z' })])
      );
      const count = await cleanExpiredGlobalDrafts();
      expect(count).toBe(0);
    });
  });
});
