import TurndownService from 'turndown';
import { marked } from 'marked';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndownService.keep(['pre', 'code']);
turndownService.escape = (str) => str;

marked.setOptions({
  breaks: true,
  gfm: true,
});

export function markdownToHtml(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return marked.parse(markdown, { async: false }) as string;
}

export function htmlToMarkdown(html: string): string {
  if (!html) {
    return '';
  }
  const markdown = turndownService.turndown(html);
  return markdown.replace(/\\_/g, '_');
}
