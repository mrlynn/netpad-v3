import { validateCreateReaction, validateUpdateReaction, validateExecuteReaction } from './validation';

describe('validateCreateReaction', () => {
  const valid = { name: 'Test', workflowId: 'wf_123' };

  it('accepts valid input', () => {
    expect(validateCreateReaction(valid).valid).toBe(true);
  });

  it('rejects non-object', () => {
    expect(validateCreateReaction(null).valid).toBe(false);
    expect(validateCreateReaction('str').valid).toBe(false);
  });

  it('requires name', () => {
    const r = validateCreateReaction({ workflowId: 'wf' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('name'))).toBe(true);
  });

  it('rejects name > 100 chars', () => {
    const r = validateCreateReaction({ ...valid, name: 'a'.repeat(101) });
    expect(r.valid).toBe(false);
  });

  it('rejects empty name', () => {
    const r = validateCreateReaction({ ...valid, name: '   ' });
    expect(r.valid).toBe(false);
  });

  it('requires workflowId', () => {
    const r = validateCreateReaction({ name: 'Test' });
    expect(r.valid).toBe(false);
  });

  // Trigger validation
  it('rejects non-object trigger', () => {
    const r = validateCreateReaction({ ...valid, trigger: 'bad' });
    expect(r.errors.some(e => e.includes('trigger must be an object'))).toBe(true);
  });

  it('rejects non-array trigger.fields', () => {
    const r = validateCreateReaction({ ...valid, trigger: { fields: 'bad' } });
    expect(r.errors.some(e => e.includes('trigger.fields must be an array'))).toBe(true);
  });

  it('rejects non-string items in trigger.fields', () => {
    const r = validateCreateReaction({ ...valid, trigger: { fields: [123] } });
    expect(r.errors.some(e => e.includes('strings'))).toBe(true);
  });

  it('rejects invalid trigger.event', () => {
    const r = validateCreateReaction({ ...valid, trigger: { event: 'invalid' } });
    expect(r.errors.some(e => e.includes('trigger.event'))).toBe(true);
  });

  it('accepts valid trigger.event', () => {
    const r = validateCreateReaction({ ...valid, trigger: { event: 'change' } });
    expect(r.valid).toBe(true);
  });

  it('validates trigger.debounceMs range', () => {
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: -1 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: 31000 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: 1.5 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { debounceMs: 500 } }).valid).toBe(true);
  });

  it('validates trigger.condition', () => {
    expect(validateCreateReaction({ ...valid, trigger: { condition: 'bad' } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { condition: {} } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, trigger: { condition: { expression: 'x > 1' } } }).valid).toBe(true);
  });

  // Execution validation
  it('rejects invalid execution.mode', () => {
    const r = validateCreateReaction({ ...valid, execution: { mode: 'bad' } });
    expect(r.valid).toBe(false);
  });

  it('accepts valid execution.mode', () => {
    for (const mode of ['sync', 'async', 'auto']) {
      expect(validateCreateReaction({ ...valid, execution: { mode } }).valid).toBe(true);
    }
  });

  it('validates execution.timeoutMs', () => {
    expect(validateCreateReaction({ ...valid, execution: { timeoutMs: 500 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, execution: { timeoutMs: 31000 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, execution: { timeoutMs: 5000 } }).valid).toBe(true);
  });

  // Feedback validation
  it('validates feedback.loadingStyle', () => {
    expect(validateCreateReaction({ ...valid, feedback: { loadingStyle: 'bad' } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, feedback: { loadingStyle: 'overlay' } }).valid).toBe(true);
  });

  it('validates feedback.errorStyle', () => {
    expect(validateCreateReaction({ ...valid, feedback: { errorStyle: 'bad' } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, feedback: { errorStyle: 'toast' } }).valid).toBe(true);
  });

  it('validates feedback durations', () => {
    expect(validateCreateReaction({ ...valid, feedback: { successDuration: -1 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, feedback: { highlightDuration: -1 } }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, feedback: { successDuration: 3000 } }).valid).toBe(true);
  });

  // Enabled flag
  it('validates enabled flag', () => {
    expect(validateCreateReaction({ ...valid, enabled: 'yes' }).valid).toBe(false);
    expect(validateCreateReaction({ ...valid, enabled: true }).valid).toBe(true);
  });
});

describe('validateUpdateReaction', () => {
  it('rejects non-object', () => {
    expect(validateUpdateReaction(null).valid).toBe(false);
  });

  it('requires at least one updateable field', () => {
    const r = validateUpdateReaction({ randomField: 'x' });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('At least one field'))).toBe(true);
  });

  it('accepts valid partial update', () => {
    expect(validateUpdateReaction({ name: 'New Name' }).valid).toBe(true);
    expect(validateUpdateReaction({ enabled: false }).valid).toBe(true);
  });

  it('validates name if provided', () => {
    expect(validateUpdateReaction({ name: 123 }).valid).toBe(false);
    expect(validateUpdateReaction({ name: '' }).valid).toBe(false);
  });

  it('validates workflowId type if provided', () => {
    expect(validateUpdateReaction({ workflowId: 123 }).valid).toBe(false);
  });

  it('validates trigger config in update', () => {
    expect(validateUpdateReaction({ trigger: { event: 'invalid' } }).valid).toBe(false);
  });
});

describe('validateExecuteReaction', () => {
  const valid = {
    reactionId: 'r_1',
    triggerField: 'name',
    triggerEvent: 'change',
    formData: { name: 'Alice' },
  };

  it('accepts valid input', () => {
    expect(validateExecuteReaction(valid).valid).toBe(true);
  });

  it('rejects non-object', () => {
    expect(validateExecuteReaction(null).valid).toBe(false);
  });

  it('requires reactionId', () => {
    const { reactionId, ...rest } = valid;
    expect(validateExecuteReaction(rest).valid).toBe(false);
  });

  it('requires triggerField', () => {
    const { triggerField, ...rest } = valid;
    expect(validateExecuteReaction(rest).valid).toBe(false);
  });

  it('requires valid triggerEvent', () => {
    expect(validateExecuteReaction({ ...valid, triggerEvent: 'bad' }).valid).toBe(false);
  });

  it('requires formData as object', () => {
    expect(validateExecuteReaction({ ...valid, formData: 'bad' }).valid).toBe(false);
    expect(validateExecuteReaction({ ...valid, formData: [1] }).valid).toBe(false);
  });

  it('validates executionMode', () => {
    expect(validateExecuteReaction({ ...valid, executionMode: 'bad' }).valid).toBe(false);
    expect(validateExecuteReaction({ ...valid, executionMode: 'sync' }).valid).toBe(true);
  });

  it('rejects oversized payload', () => {
    const big = { ...valid, formData: { x: 'a'.repeat(1_100_000) } };
    const r = validateExecuteReaction(big);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('1MB'))).toBe(true);
  });
});
