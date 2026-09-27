# Node.js: спостереження за змінами (`fs.watch` / `fs.watchFile`)

```js
const fs = require("fs"); // fs.watch/watchFile — у кореневому модулі fs (не /promises)
const fsPromises = require("fs/promises");
const os = require("os");
const path = require("path");
const demoFilePath = path.join(os.tmpdir(), "fs-watch-demo.txt");

await fsPromises.writeFile(demoFilePath, "initial content");
```

## 1. `fs.watch()` — підписка на події файлової системи (на рівні ОС)

`fs.watch()` використовує рідні (native) механізми операційної системи для спостереження за змінами (inotify на Linux, FSEvents на macOS, ReadDirectoryChangesW на Windows) — це робить його швидким (сповіщення майже миттєве), але й «нестабільним» між різними ОС (детально пастки — розділ 3):

```js
const watcher = fs.watch(demoFilePath, (eventType, filename) => {
  console.log(`fs.watch: event "${eventType}" for file "${filename}"`);
});

// даємо час watcher'у «зареєструватись» в ОС перед зміною файлу
// (у реальному коді це не потрібно — тут лише щоб демонстрація
// гарантовано спрацювала в один прогін скрипта):
await new Promise((resolve) => setTimeout(resolve, 100));

await fsPromises.writeFile(demoFilePath, "changed content #1");
await new Promise((resolve) => setTimeout(resolve, 200)); // чекаємо на подію

watcher.close(); // обов'язково закривати watcher, інакше процес не
                    // завершиться сам (watcher тримає event loop «живим»)
```

## 2. `fs.watchFile()` — альтернатива через опитування (polling)

На відміну від `fs.watch()` (подієвий, залежить від ОС), `fs.watchFile()` періодично (за замовчуванням — раз на 5 секунд, налаштовується через `{ interval }`) порівнює `stat()` файлу з попереднім знімком — це повільніше (затримка між реальною зміною і виявленням), але набагато стабільніше між різними ОС і файловими системами (особливо мережевими дисками, де inotify-подібні механізми часто не працюють надійно):

```js
const watchFileListener = (curr, prev) => {
  console.log(`fs.watchFile: mtime changed from ${prev.mtimeMs} to ${curr.mtimeMs}`);
};
fs.watchFile(demoFilePath, { interval: 100 }, watchFileListener);

await fsPromises.writeFile(demoFilePath, "changed content #2");
await new Promise((resolve) => setTimeout(resolve, 300)); // чекаємо наступного опитування

fs.unwatchFile(demoFilePath, watchFileListener); // теж обов'язково «відписатись»
```

## 3. Чому `fs.watch()` офіційно позначений як «не повністю узгоджений» між ОС

Офіційна документація Node.js прямо попереджає: поведінка `fs.watch()` «варіюється значно між платформами»:

- на macOS/Windows `filename` зазвичай надійно передається;
- на деяких Linux-конфігураціях/мережевих файлових системах (NFS, деякі Docker-volume-монтування) `filename` може бути `null`, а події можуть узагалі не спрацьовувати надійно;
- одна «логічна» зміна файлу (наприклад, збереження у текстовому редакторі) може згенерувати кілька подій `"change"` поспіль (редактори часто пишуть у тимчасовий файл, а потім перейменовують його — це виглядає як `"rename"`, а не `"change"`).

Саме через це в реальних проєктах (build-тули, dev-сервери з hot-reload) зазвичай використовують сторонні бібліотеки (chokidar — найпоширеніша), які «згладжують» ці розбіжності й додають debouncing (детально сама ідея debounce — нотатка про асинхронний код), а не `fs.watch()` напряму.

## 4. `eventType`: `"change"` проти `"rename"` — що це реально означає

- `"change"` — змінився вміст або метадані існуючого файлу;
- `"rename"` — файл створено, видалено, або перейменовано (Node.js не розрізняє ці три випадки на рівні `eventType` — усі вони позначаються однаково як `"rename"`).

Це означає: якщо файл видалили, watcher покаже `"rename"`, а не `"delete"` (такої події взагалі немає) — щоб зрозуміти, що саме сталося, треба додатково перевірити, чи файл ще існує:

```js
const renameDemoPath = path.join(os.tmpdir(), "fs-watch-rename-demo.txt");
await fsPromises.writeFile(renameDemoPath, "temporary file");

const renameWatcher = fs.watch(renameDemoPath, async (eventType) => {
  if (eventType === "rename") {
    try {
      await fsPromises.access(renameDemoPath);
      console.log("rename event: file still EXISTS (renamed/recreated)");
    } catch {
      console.log("rename event: file no longer exists (deleted)");
    }
  }
});

await new Promise((resolve) => setTimeout(resolve, 100));
await fsPromises.rm(renameDemoPath); // видалення теж дає eventType === "rename"!
await new Promise((resolve) => setTimeout(resolve, 200));
renameWatcher.close();
```

## 5. Асинхронний ітератор: `for await...of` по `fs.promises.watch()`

`fs/promises` також дає `watch()` як асинхронний ітератор (детально сам механізм `for await...of` і `Symbol.asyncIterator` — нотатка про асинхронний код) — зручніше для `async`/`await`-коду, ніж callback-стиль звичайного `fs.watch()`:

```js
await fsPromises.writeFile(demoFilePath, "for the async iterator");

async function watchWithAsyncIterator() {
  const ac = new AbortController(); // детально AbortController — нотатка про асинхронний код
  const watcher = fsPromises.watch(demoFilePath, { signal: ac.signal });

  setTimeout(async () => {
    await fsPromises.writeFile(demoFilePath, "trigger for the iterator");
  }, 100);
  setTimeout(() => ac.abort(), 400); // зупиняємо спостереження через AbortController,
                                        // інакше for await...of чекав би назавжди

  try {
    for await (const event of watcher) {
      console.log("async iterator saw event:", event.eventType);
    }
  } catch (err) {
    if (err.name !== "AbortError") throw err; // AbortError — очікуваний результат abort()
  }
}
await watchWithAsyncIterator();
```

## Прибирання

```js
await fsPromises.rm(demoFilePath, { force: true });
```

## Підсумок

- `fs.watch()` — подієве спостереження через рідні механізми ОС (inotify/FSEvents/ReadDirectoryChangesW) — швидке, але поведінка помітно відрізняється між платформами й файловими системами.
- `fs.watchFile()` — polling (періодична перевірка `stat()`) — повільніше (затримка = `interval`), але значно стабільніше між ОС, особливо для мережевих файлових систем.
- Watcher обов'язково треба закривати (`watcher.close()` / `fs.unwatchFile()`) — інакше він тримає event loop «живим», і процес не завершиться сам.
- `eventType` має лише два значення: `"change"` (змінився вміст/метадані) і `"rename"` (створення, видалення й перейменування — усі три під однією назвою!) — щоб розрізнити видалення від перейменування, треба додатково перевірити, чи файл ще існує.
- Для реальних проєктів (build-тули, hot-reload) типово використовують сторонню бібліотеку (chokidar), що згладжує міжплатформні розбіжності й додає debouncing, а не `fs.watch()` напряму.
- `fs/promises.watch()` дає той самий механізм як асинхронний ітератор (`for await...of`) — зупиняється через `AbortController`, природніше поєднується з `async`/`await`-кодом.
