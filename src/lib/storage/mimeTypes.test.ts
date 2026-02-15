import { IMAGE_MIME_TYPES, DOCUMENT_MIME_TYPES, ALL_ALLOWED_MIME_TYPES } from './mimeTypes';

describe('mimeTypes', () => {
  it('IMAGE_MIME_TYPES contains common image types', () => {
    expect(IMAGE_MIME_TYPES).toContain('image/jpeg');
    expect(IMAGE_MIME_TYPES).toContain('image/png');
    expect(IMAGE_MIME_TYPES).toContain('image/gif');
    expect(IMAGE_MIME_TYPES).toContain('image/webp');
  });

  it('DOCUMENT_MIME_TYPES contains PDF and CSV', () => {
    expect(DOCUMENT_MIME_TYPES).toContain('application/pdf');
    expect(DOCUMENT_MIME_TYPES).toContain('text/csv');
  });

  it('ALL_ALLOWED_MIME_TYPES is union of images and documents', () => {
    expect(ALL_ALLOWED_MIME_TYPES).toEqual([...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES]);
  });

  it('ALL_ALLOWED_MIME_TYPES has correct length', () => {
    expect(ALL_ALLOWED_MIME_TYPES.length).toBe(IMAGE_MIME_TYPES.length + DOCUMENT_MIME_TYPES.length);
  });

  it('all entries are strings', () => {
    ALL_ALLOWED_MIME_TYPES.forEach(t => expect(typeof t).toBe('string'));
  });
});
