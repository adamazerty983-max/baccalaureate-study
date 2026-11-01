# Changelog

All notable changes to the **Baccalaureate Study Hub** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Real-time study hours visualization chart with multi-zoom buckets (Days, Weeks, Months).
- Exam Simulator Chrono specifically designed for Moroccan national exam subjects (Math, Physics, SVT, English, Philosophy).
- Unified resilient auto-update system across Desktop (Electron) and Web (PWA).
- Safe inert DOMParser release-notes sanitizer supporting headings, lists, bold text, code, and allowlisted GitHub links.
- Fault-tolerant service worker precache with 3-second network-first navigation timeout and Cloudflare Pages redirect sanitization.

### Changed
- Converted desktop update system to publish as GitHub Release drafts first for manual validation.
- Desktop service workers and caches are purged automatically on launch without touching student study data (IndexedDB and localStorage).
- Electron main process acts as the single source of truth for update preferences, preventing startup race conditions.

---

## [1.0.0] - 2026-09-28

### Added
- Trilingual interface supporting French, Arabic (RTL), and English.
- Pomodoro and focus session timer with audio chimes.
- Offline-first PWA architecture with local storage and IndexedDB backup.
- Firebase Firestore and Supabase cloud synchronization.
- Academic year countdown tracker and subject coefficient customization for Moroccan Baccalaureate tracks.
