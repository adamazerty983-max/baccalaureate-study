import { describe, expect, it } from 'vitest';
import { isSafeGithubUrl, renderSanitizedReleaseNotes } from './releaseNotesSanitizer';
import React from 'react';

describe('releaseNotesSanitizer: isSafeGithubUrl', () => {
  it('accepts safe https github.com URLs', () => {
    expect(isSafeGithubUrl('https://github.com/adamazerty983-max/baccalaureate-study/releases')).toBe(true);
    expect(isSafeGithubUrl('https://api.github.com/repos/test')).toBe(true);
  });

  it('rejects non-https protocols', () => {
    expect(isSafeGithubUrl('http://github.com/something')).toBe(false);
    expect(isSafeGithubUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeGithubUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects untrusted domains', () => {
    expect(isSafeGithubUrl('https://evil-site.com')).toBe(false);
    expect(isSafeGithubUrl('https://github.com.attacker.com')).toBe(false);
    expect(isSafeGithubUrl('https://google.com')).toBe(false);
  });
});

describe('releaseNotesSanitizer: renderSanitizedReleaseNotes', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(renderSanitizedReleaseNotes('')).toBeNull();
    expect(renderSanitizedReleaseNotes('   \n  ')).toBeNull();
    expect(renderSanitizedReleaseNotes(undefined)).toBeNull();
  });

  it('parses GitHub API HTML release notes and renders React elements', () => {
    const htmlInput = `
      <h2>v1.0.1 Release</h2>
      <p>Bug fixes and performance improvements.</p>
      <ul>
        <li>Fixed study timer accuracy</li>
        <li>Optimized <strong>offline caching</strong></li>
      </ul>
      <p>Source: <a href="https://github.com/adamazerty983-max/baccalaureate-study/releases/tag/v1.0.1">GitHub Release</a></p>
    `;

    const result = renderSanitizedReleaseNotes(htmlInput) as React.ReactElement;
    expect(result).not.toBeNull();
    expect(result.type).toBe('div');
    expect(React.isValidElement(result)).toBe(true);
  });

  it('completely strips script, style, and iframe tags', () => {
    const maliciousHtml = `
      <p>Safe text</p>
      <script>window.pwned = true;</script>
      <iframe src="https://evil.com"></iframe>
      <style>body { display: none; }</style>
    `;

    const result = renderSanitizedReleaseNotes(maliciousHtml) as React.ReactElement;
    expect(result).not.toBeNull();

    // Verify none of the children are script, iframe, or style
    const children = React.Children.toArray(result.props.children) as React.ReactElement[];
    const tagNames = children.map((c) => c.type);
    expect(tagNames).not.toContain('script');
    expect(tagNames).not.toContain('iframe');
    expect(tagNames).not.toContain('style');
  });

  it('sanitizes untrusted links by rendering them as text spans without href', () => {
    const htmlWithBadLinks = `
      <p><a href="javascript:alert(1)">Click for free points</a></p>
      <p><a href="https://malicious-phishing.com">Phishing link</a></p>
    `;

    const result = renderSanitizedReleaseNotes(htmlWithBadLinks) as React.ReactElement;
    const children = React.Children.toArray(result.props.children) as React.ReactElement[];

    // Both paragraphs should have their links stripped of anchor functionality
    for (const p of children) {
      if (React.isValidElement(p)) {
        const pChildren = React.Children.toArray(p.props.children) as React.ReactElement[];
        for (const child of pChildren) {
          if (React.isValidElement(child)) {
            expect(child.type).not.toBe('a');
            expect(child.props.href).toBeUndefined();
          }
        }
      }
    }
  });

  it('parses Markdown changelogs into structured React elements', () => {
    const markdownInput = `
### What's New in v1.1.0
- Added Exam Simulator Chrono
- Fixed study hours chart scale
**Enjoy your preparation!**
    `;

    const result = renderSanitizedReleaseNotes(markdownInput) as React.ReactElement;
    expect(result).not.toBeNull();
    expect(React.isValidElement(result)).toBe(true);
  });
});
