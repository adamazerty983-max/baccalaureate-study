# التحقق اليدوي من أصوات StudyOS

**الحالة:** التحقق التفاعلي الفعلي **[غير متحقق]**. مشغل Playwright فشل لأن Chromium headless غير مثبت. ومحاولة standalone باستخدام Chrome المثبت وصلت إلى المتصفح لكنها مُنعت من فتح خادم Vite بسبب عزل الشبكة. لا توجد أعداد أصوات runtime مدعاة هنا. نفّذ الخطوات أدناه محليًا.

الأخطاء كما ظهرت:

```text
browserType.launch: Executable doesn't exist at C:\Users\Hp\AppData\Local\Packages\sandbox.{58683521-804d-43cf-99d4-4525c73cbfd8}\AC\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```

```text
page.goto: net::ERR_NETWORK_ACCESS_DENIED at http://localhost:3001/
Call log:
  - navigating to "http://localhost:3001/", waiting until "domcontentloaded"
```

## تجهيز التسجيل في DevTools

شغّل الموقع محليًا (`npm run dev`)، افتح Console، ثم الصق المقتطف التالي قبل الاختبار. يسجل `playChime` المقبول، ووقت/حالة AudioContext، وعدد استدعاءات `start()` القريبة من كل فعل. لا يغير ملفات المشروع:

```js
(() => {
  const engine = window.__studyAudioEngine;
  if (!engine || typeof engine.playChime !== 'function') {
    console.warn('No engine debug hook is exposed. Use the temporary source spy steps below.');
    return;
  }
  window.__chimeLog = [];
  window.__audioStarts = [];
  window.__audioAction = '(label action before each test)';
  const original = engine.playChime.bind(engine);
  engine.playChime = (id, options) => {
    const context = engine.ctx;
    window.__chimeLog.push({
      action: window.__audioAction,
      id,
      actionId: options?.actionId ?? null,
      at: performance.now(),
      visibility: document.visibilityState,
      contextState: context?.state ?? 'not-created',
    });
    return original(id, options);
  };
  const startProto = AudioScheduledSourceNode.prototype;
  const originalStart = startProto.start;
  startProto.start = function (...args) {
    const context = this.context;
    window.__audioStarts.push({
      action: window.__audioAction,
      at: performance.now(),
      node: this.constructor?.name,
      visibility: document.visibilityState,
      contextState: context?.state,
    });
    return originalStart.apply(this, args);
  };
  window.__restoreAudioCheck = () => {
    engine.playChime = original;
    startProto.start = originalStart;
  };
  console.info('Audio spies installed. Restore with __restoreAudioCheck().');
})();
```

The application does not expose `window.__studyAudioEngine` in production. For a development-only check, temporarily add `window.__studyAudioEngine = chimePlayer` immediately after the singleton export in `src/utils/audio.ts`, reload, test, then remove that one line and confirm it is absent from the diff before any commit. This temporary hook must never ship.

Before every interaction set `window.__audioAction = 'describe action'` and clear the logs if desired:

```js
window.__chimeLog = [];
window.__audioStarts = [];
window.__audioAction = 'complete one task';
```

Afterward copy:

```js
console.table(window.__chimeLog);
console.table(window.__audioStarts);
copy(JSON.stringify({ chimes: window.__chimeLog, starts: window.__audioStarts }, null, 2));
```

## Checklist

Run each action separately; use test data only. Do not click repeatedly during the minimum-gap interval.

| Action | Expected intent ID (legacy call may be logged before alias resolution) | Check |
|---|---|---|
| Complete then undo a task, homework, goal, habit, quiz, and Planner item | `item_completed`, `item_undone` | One accepted sound for each action; undo must not inherit the completion cue. |
| Add an item in Dashboard, Tasks, Homework, Goals, Habits, Quizzes, Notes, Revision, Quick Add, Planner | `item_added` | One cue after a successful save only. |
| Delete one item in each relevant list; delete a grade | `item_deleted` | One quiet cue; confirmation toast must not add another. |
| Save one grade; save weekly and monthly review | `grade_saved` / `item_completed` where source calls completion | One cue per save. |
| Start, pause, resume, then finish a short focus timer | `focus_start`, `focus_pause`, `focus_resume`, `focus_end_alarm` | No per-second sound; one finish alarm. |
| Trigger a scheduled reminder while visible, then while hidden after audio has unlocked | `reminder` | Record visibility, context state, and any background delay. |
| Cause one submitted Planner validation/optimizer error | `error` | One gentle error cue per submitted failure; typing itself stays silent. |
| Trigger standalone warning and info toast | `warning`, info is silent | Warning once; info has no sound. |
| Trigger an achievement/streak threshold | `milestone` | One reward only at the actual threshold. |
| Use an explicitly opted-in `data-sound="ui_tick"` control if present | `ui_tick` | It is optional and very quiet; ordinary buttons stay silent. |
| Switch tabs, use keyboard shortcuts, natural-text Planner input, language/theme, copy/export/import, hover, fields, sliders, scroll | silent by default | No cue except an existing semantic action after successful submit. |

## Paste results

Please paste raw console output in this format; do not summarize counts from memory:

```text
Browser/version:
App URL/build:
Temporary dev hook used: yes/no

| Action | IDs logged, in order | actionId | Web Audio starts | Node types | visibilityState | AudioContext.state | Delay/notes |
|---|---|---|---:|---|---|---|---|
```

Actual runtime call counts, sound audibility, and background timer timing remain **[unverified]** until these logs are returned or a browser run succeeds.
