import { parseBlockFromRaw } from '../yaml';

describe('label generation', () => {
  it('generates metadata title without prefix', () => {
    const raw = `metadata:\n  title: My Interview\n`;
    const block = parseBlockFromRaw(raw, 0);
    expect(block.label).toBe('My Interview');
    expect(block.label).not.toContain('•');
  });

  it('generates code first line without prefix', () => {
    const raw = `code:\n  code: |\n    print(\"Hello world\")\n`;
    const block = parseBlockFromRaw(raw, 0);
    expect(block.label).toBe('print(\"Hello world\")');
    expect(block.label).not.toContain('•');
  });

  it('generates attachment name without prefix', () => {
    const raw = `attachment:\n  name: agreement.pdf\n`;
    const block = parseBlockFromRaw(raw, 0);
    expect(block.label).toBe('agreement.pdf');
    expect(block.label).not.toContain('•');
  });

  it('generates question first line without prefix', () => {
    const raw = `question: What is your name?\n`;
    const block = parseBlockFromRaw(raw, 0);
    expect(block.label).toBe('What is your name?');
    expect(block.label).not.toContain('•');
  });

  it('returns undefined label for unknown types and empty values', () => {
    const raw = `code:\n  code: ''\n`;
    const block = parseBlockFromRaw(raw, 0);
    expect(block.label).toBeUndefined();
  });
});
