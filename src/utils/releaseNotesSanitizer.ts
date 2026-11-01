import React from 'react';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Strict element allowlist for release notes rendering.
 * All other HTML tags are either unwrapped (text preserved) or dropped.
 */
const ALLOWED_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4',
  'P', 'UL', 'OL', 'LI',
  'STRONG', 'B', 'EM', 'I',
  'CODE', 'PRE', 'BR', 'A', 'SPAN', 'DIV'
]);

/**
 * Tags whose entire subtree (including text content) must be dropped.
 */
const FORBIDDEN_SUBTREE_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT'
]);

/**
 * Validates external link safety: https protocol and github.com host allowlist only.
 */
export function isSafeGithubUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== 'string') return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'github.com' || host.endsWith('.github.com');
  } catch {
    return false;
  }
}

/**
 * Opens a validated URL via the system browser (avoiding opening in Electron window).
 */
export function openExternalLink(url: string): void {
  if (!isSafeGithubUrl(url)) return;
  if (typeof window !== 'undefined' && window.electronAPI?.updater?.openExternal) {
    window.electronAPI.updater.openExternal(url).catch(() => {});
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Simple structural markdown to HTML converter for local changelog format.
 * Converts headings, list items, bold and inline code.
 */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      continue;
    }

    // Unordered lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      const itemContent = line.slice(2).trim();
      out.push(`<li>${itemContent}</li>`);
      continue;
    }

    if (inList) {
      out.push('</ul>');
      inList = false;
    }

    // Headings
    if (line.startsWith('#### ')) {
      out.push(`<h4>${line.slice(5)}</h4>`);
    } else if (line.startsWith('### ')) {
      out.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith('# ')) {
      out.push(`<h1>${line.slice(2)}</h1>`);
    } else {
      out.push(`<p>${line}</p>`);
    }
  }

  if (inList) {
    out.push('</ul>');
  }

  let html = out.join('');
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
}

const tagStyles: Record<string, string> = {
  H1: 'text-lg font-bold text-slate-900 dark:text-white mt-3 mb-1.5',
  H2: 'text-base font-bold text-slate-900 dark:text-white mt-2.5 mb-1',
  H3: 'text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1',
  H4: 'text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5 mb-0.5',
  P: 'text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2',
  UL: 'list-disc list-inside space-y-1 mb-2.5 text-xs text-slate-600 dark:text-slate-300 ps-2',
  OL: 'list-decimal list-inside space-y-1 mb-2.5 text-xs text-slate-600 dark:text-slate-300 ps-2',
  LI: 'leading-relaxed',
  STRONG: 'font-semibold text-slate-900 dark:text-white',
  B: 'font-semibold text-slate-900 dark:text-white',
  EM: 'italic text-slate-700 dark:text-slate-200',
  I: 'italic text-slate-700 dark:text-slate-200',
  CODE: 'px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-teal-600 dark:text-teal-400 border border-slate-200 dark:border-slate-700',
  PRE: 'p-2.5 rounded-lg text-xs font-mono bg-slate-900 text-slate-100 overflow-x-auto my-2',
  BR: '',
  SPAN: '',
  DIV: '',
};

/**
 * Recursively walks an inert DOM Node tree and converts allowed elements into React nodes.
 * Strictly avoids dangerouslySetInnerHTML.
 */
function walkNode(node: any, keyPrefix: string): React.ReactNode {
  if (node.nodeType === TEXT_NODE) {
    return node.textContent || '';
  }

  if (node.nodeType !== ELEMENT_NODE) {
    return null;
  }

  const tagName = (node.tagName || node.nodeName || '').toUpperCase();

  // Completely drop dangerous subtrees
  if (FORBIDDEN_SUBTREE_TAGS.has(tagName)) {
    return null;
  }

  // Process children
  const childNodes = Array.from(node.childNodes || []);
  const children: React.ReactNode[] = childNodes
    .map((child, index) => walkNode(child, `${keyPrefix}-${index}`))
    .filter((child) => child !== null && child !== '');

  // If tag is not in allowlist, return unwrapped children (text is preserved, tag dropped)
  if (!ALLOWED_TAGS.has(tagName)) {
    return children.length > 0 ? children : null;
  }

  // Special handling for links: strictly enforce https and github.com
  if (tagName === 'A') {
    const rawHref = typeof node.getAttribute === 'function' ? node.getAttribute('href') || '' : '';
    if (isSafeGithubUrl(rawHref)) {
      return React.createElement(
        'a',
        {
          key: keyPrefix,
          href: rawHref,
          target: '_blank',
          rel: 'noopener noreferrer',
          onClick: (e: React.MouseEvent) => {
            e.preventDefault();
            openExternalLink(rawHref);
          },
          className: 'text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 font-medium',
        },
        children
      );
    }
    // Disallowed link: render as safe plain text children without the <a> tag
    return React.createElement('span', { key: keyPrefix }, children);
  }

  const reactTag = tagName.toLowerCase();
  const className = tagStyles[tagName] || '';

  return React.createElement(
    reactTag,
    {
      key: keyPrefix,
      ...(className ? { className } : {}),
    },
    children.length > 0 ? children : undefined
  );
}

/**
 * Safely parses and renders release notes (HTML or Markdown) as React elements.
 * Uses inert DOMParser and element allowlisting. Never uses dangerouslySetInnerHTML.
 */
export function renderSanitizedReleaseNotes(rawNotes?: string): React.ReactNode {
  if (!rawNotes || !rawNotes.trim()) {
    return null;
  }

  // Detect whether notes are HTML or Markdown
  const isLikelyHtml = /<[a-z][\s\S]*>/i.test(rawNotes);
  const htmlToParse = isLikelyHtml ? rawNotes : markdownToHtml(rawNotes);

  let ParserClass: any = typeof DOMParser !== 'undefined' ? DOMParser : null;
  if (!ParserClass) {
    try {
      // Node/Vitest test runner fallback using @xmldom/xmldom
      const xmldom = require('@xmldom/xmldom');
      ParserClass = xmldom.DOMParser;
    } catch {
      // Ignored
    }
  }

  if (!ParserClass) {
    return rawNotes;
  }

  const parser = new ParserClass();
  const wrapped = `<div>${htmlToParse}</div>`;
  const doc = parser.parseFromString(wrapped, 'text/html');

  const container = doc.body?.firstElementChild || doc.documentElement;
  const childNodes = Array.from(container ? container.childNodes : []);

  const renderedNodes = childNodes
    .map((node, i) => walkNode(node, `release-node-${i}`))
    .filter((node) => node !== null && node !== '');

  return React.createElement(
    'div',
    { className: 'space-y-1.5' },
    renderedNodes
  );
}
