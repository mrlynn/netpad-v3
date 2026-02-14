/**
 * Tests for Google Forms to NetPad Mapper
 *
 * Tests: mapGoogleFormToNetPad, getMappingSummary
 */
import { mapGoogleFormToNetPad, getMappingSummary } from '@/lib/integrations/googleForms/mapper';
import { GoogleForm, GoogleFormItem } from '@/types/googleFormsImport';

// ============================================
// Helpers
// ============================================

function createForm(items: GoogleFormItem[] = []): GoogleForm {
  return {
    formId: 'test_form_123',
    info: { title: 'Test Form', description: 'A test form' },
    items,
    revisionId: 'rev_1',
    responderUri: 'https://example.com/form',
  };
}

function textItem(title: string, opts: { required?: boolean; paragraph?: boolean } = {}): GoogleFormItem {
  return {
    itemId: `item_${title.replace(/\s/g, '_')}`,
    title,
    questionItem: {
      question: {
        questionId: `q_${title.replace(/\s/g, '_')}`,
        required: opts.required || false,
        textQuestion: { paragraph: opts.paragraph || false },
      },
    },
  };
}

function choiceItem(
  title: string,
  type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN',
  options: string[],
  opts: { required?: boolean; shuffle?: boolean; hasOther?: boolean } = {}
): GoogleFormItem {
  const choiceOptions = options.map(v => ({ value: v }));
  if (opts.hasOther) choiceOptions.push({ value: 'Other', isOther: true } as any);
  return {
    itemId: `item_${title.replace(/\s/g, '_')}`,
    title,
    questionItem: {
      question: {
        questionId: `q_${title.replace(/\s/g, '_')}`,
        required: opts.required || false,
        choiceQuestion: { type, options: choiceOptions, shuffle: opts.shuffle },
      },
    },
  };
}

function scaleItem(title: string, low: number, high: number, labels?: { low?: string; high?: string }): GoogleFormItem {
  return {
    itemId: `item_${title.replace(/\s/g, '_')}`,
    title,
    questionItem: {
      question: {
        questionId: `q_${title.replace(/\s/g, '_')}`,
        required: false,
        scaleQuestion: {
          low,
          high,
          lowLabel: labels?.low,
          highLabel: labels?.high,
        },
      },
    },
  };
}

function dateItem(title: string, includeTime = false): GoogleFormItem {
  return {
    itemId: `item_${title.replace(/\s/g, '_')}`,
    title,
    questionItem: {
      question: {
        questionId: `q_${title.replace(/\s/g, '_')}`,
        required: false,
        dateQuestion: { includeTime },
      },
    },
  };
}

function pageBreakItem(title: string): GoogleFormItem {
  return { itemId: `page_${title}`, title, pageBreakItem: {} };
}

// ============================================
// mapGoogleFormToNetPad
// ============================================

describe('mapGoogleFormToNetPad', () => {
  describe('text questions', () => {
    it('should map short answer to text', () => {
      const form = createForm([textItem('Full Name')]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.success).toBe(true);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].type).toBe('text');
      expect(result.fields[0].label).toBe('Full Name');
    });

    it('should map paragraph to long_text', () => {
      const form = createForm([textItem('Comments', { paragraph: true })]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('long_text');
    });

    it('should preserve required flag', () => {
      const form = createForm([textItem('Email', { required: true })]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].required).toBe(true);
    });
  });

  describe('choice questions', () => {
    it('should map radio to radio with options', () => {
      const form = createForm([choiceItem('Color', 'RADIO', ['Red', 'Blue', 'Green'])]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('radio');
      expect(result.fields[0].validation?.options).toHaveLength(3);
      expect(result.fields[0].validation?.options?.[0]).toEqual({ label: 'Red', value: 'Red' });
    });

    it('should map checkbox to checkbox', () => {
      const form = createForm([choiceItem('Hobbies', 'CHECKBOX', ['Reading', 'Sports'])]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('checkbox_group');
    });

    it('should map dropdown to dropdown', () => {
      const form = createForm([choiceItem('Country', 'DROP_DOWN', ['US', 'UK', 'CA'])]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('dropdown');
    });

    it('should handle "Other" option', () => {
      const form = createForm([choiceItem('Fruit', 'RADIO', ['Apple', 'Banana'], { hasOther: true })]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].validation?.allowOther).toBe(true);
    });

    it('should handle shuffle option', () => {
      const form = createForm([choiceItem('Pick', 'RADIO', ['A', 'B'], { shuffle: true })]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].validation?.randomizeOptions).toBe(true);
    });
  });

  describe('scale questions', () => {
    it('should map linear scale to rating', () => {
      const form = createForm([scaleItem('Satisfaction', 1, 10, { low: 'Bad', high: 'Great' })]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('rating');
      expect(result.fields[0].validation?.min).toBe(1);
      expect(result.fields[0].validation?.max).toBe(10);
      expect(result.fields[0].validation?.lowLabel).toBe('Bad');
      expect(result.fields[0].validation?.highLabel).toBe('Great');
    });
  });

  describe('date questions', () => {
    it('should map date to date', () => {
      const form = createForm([dateItem('Birthday')]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('date');
    });

    it('should map date with time to datetime', () => {
      const form = createForm([dateItem('Appointment', true)]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('datetime');
    });
  });

  describe('page breaks', () => {
    it('should handle page breaks', () => {
      const form = createForm([
        textItem('Page 1 Field'),
        pageBreakItem('Section 2'),
        textItem('Page 2 Field'),
      ]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields).toHaveLength(2);
      expect(result.statistics.pageCount).toBe(2);
    });
  });

  describe('unsupported items', () => {
    it('should track image items as unsupported', () => {
      const form = createForm([
        { itemId: 'img_1', title: 'Photo', imageItem: { image: { sourceUri: 'https://example.com/img.png' } } } as any,
      ]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.unsupportedItems).toHaveLength(1);
      expect(result.unsupportedItems[0].googleType).toBe('IMAGE');
    });

    it('should track video items as unsupported', () => {
      const form = createForm([
        { itemId: 'vid_1', title: 'Video', videoItem: { video: { youtubeUri: 'https://youtube.com/watch?v=x' } } } as any,
      ]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.unsupportedItems).toHaveLength(1);
      expect(result.unsupportedItems[0].googleType).toBe('VIDEO');
    });
  });

  describe('text items', () => {
    it('should skip text items (section headers)', () => {
      const form = createForm([
        { itemId: 'text_1', title: 'Section Header', textItem: {} } as any,
        textItem('Actual Question'),
      ]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].label).toBe('Actual Question');
    });
  });

  describe('empty form', () => {
    it('should handle form with no items', () => {
      const form = createForm();
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields).toHaveLength(0);
      expect(result.statistics.totalItems).toBe(0);
    });
  });

  describe('path generation', () => {
    it('should generate unique paths for duplicate titles', () => {
      const form = createForm([
        textItem('Name'),
        textItem('Name'),
      ]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].path).not.toBe(result.fields[1].path);
    });
  });

  describe('import source metadata', () => {
    it('should include _importSource on mapped fields', () => {
      const form = createForm([textItem('Email')]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0]._importSource).toBeDefined();
      expect(result.fields[0]._importSource?.platform).toBe('google_forms');
    });
  });

  describe('text validation', () => {
    it('should handle NUMBER validation → number type', () => {
      const form = createForm([{
        itemId: 'num_1',
        title: 'Age',
        questionItem: {
          question: {
            questionId: 'q_num_1',
            required: false,
            textQuestion: {},
            textValidation: { type: 'NUMBER' },
          },
        },
      }]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('number');
    });

    it('should handle TEXT_EMAIL validation → email type', () => {
      const form = createForm([{
        itemId: 'email_1',
        title: 'Email',
        questionItem: {
          question: {
            questionId: 'q_email_1',
            required: false,
            textQuestion: {},
            textValidation: { type: 'TEXT_EMAIL' },
          },
        },
      }]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('email');
    });

    it('should handle TEXT_URL validation → url type', () => {
      const form = createForm([{
        itemId: 'url_1',
        title: 'Website',
        questionItem: {
          question: {
            questionId: 'q_url_1',
            required: false,
            textQuestion: {},
            textValidation: { type: 'TEXT_URL' },
          },
        },
      }]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('url');
    });

    it('should handle LENGTH_MINIMUM validation', () => {
      const form = createForm([{
        itemId: 'minlen_1',
        title: 'Bio',
        questionItem: {
          question: {
            questionId: 'q_minlen_1',
            required: false,
            textQuestion: { paragraph: true },
            textValidation: { type: 'LENGTH_MINIMUM', number: 50 },
          },
        },
      }]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].validation?.minLength).toBe(50);
    });

    it('should handle REGEX validation', () => {
      const form = createForm([{
        itemId: 'regex_1',
        title: 'Code',
        questionItem: {
          question: {
            questionId: 'q_regex_1',
            required: false,
            textQuestion: {},
            textValidation: { type: 'REGEX', text: '^[A-Z]{3}$' },
          },
        },
      }]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].validation?.pattern).toBe('^[A-Z]{3}$');
    });
  });

  describe('file upload', () => {
    it('should map file upload with constraints', () => {
      const form = createForm([{
        itemId: 'file_1',
        title: 'Resume',
        questionItem: {
          question: {
            questionId: 'q_file_1',
            required: false,
            fileUploadQuestion: {
              maxFiles: 3,
              maxFileSize: '10MB',
              types: ['PDF', 'DOCUMENT'],
            },
          },
        },
      }]);
      const result = mapGoogleFormToNetPad(form);
      expect(result.fields[0].type).toBe('file');
      expect(result.fields[0].validation?.maxFiles).toBe(3);
      expect(result.fields[0].validation?.maxSize).toBe(10);
      expect(result.fields[0].validation?.multiple).toBe(true);
      expect(result.fields[0].validation?.allowedTypes).toContain('application/pdf');
    });
  });
});

// ============================================
// getMappingSummary
// ============================================

describe('getMappingSummary', () => {
  it('should generate readable summary', () => {
    const form = createForm([
      textItem('Name'),
      choiceItem('Color', 'RADIO', ['Red', 'Blue']),
    ]);
    const result = mapGoogleFormToNetPad(form);
    const summary = getMappingSummary(result);
    expect(summary).toContain('Mapped 2 of 2 items');
    expect(summary).toContain('Exact mappings:');
  });

  it('should include warnings in summary', () => {
    const form = createForm([
      { itemId: 'img_1', title: 'Photo', imageItem: { image: {} } } as any,
      textItem('Name'),
    ]);
    const result = mapGoogleFormToNetPad(form);
    const summary = getMappingSummary(result);
    expect(summary).toContain('Unsupported');
  });

  it('should handle empty results', () => {
    const form = createForm();
    const result = mapGoogleFormToNetPad(form);
    const summary = getMappingSummary(result);
    expect(summary).toContain('Mapped 0 of 0');
  });
});
