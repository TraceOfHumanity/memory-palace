# Асинхронний код у JavaScript — усі підходи і як це працює під капотом

## 0. Чому існує асинхронність: JS — однопотоковий

У JS є **один** потік виконання (call stack) — два шматки JS-коду ніколи не виконуються буквально одночасно (Web Workers / `worker_threads` — окремі потоки з окремою пам'яттю). Але операції, що вимагають **очікування** (мережевий запит, таймер, читання файлу), не повинні «заморожувати» цей потік — інакше сторінка чи сервер зависають. Тому такі операції передаються середовищу (браузеру / Node.js), а JS-потік тим часом виконує інший код. Коли операція завершується, її колбек стає в **чергу** і виконується, коли call stack звільниться. Модель «call stack + черги завдань + event loop» — фундамент усього нижче.

Приклади цієї нотатки запускаються одним файлом, тому їхній вивід перемішується в часі. Коментар біля кожного `console.log` показує, що виведе саме цей рядок.

## Спосіб 1: callback

### 1. Що таке callback

Callback — функція, яку передають іншій функції, щоб та викликала її **пізніше**, коли асинхронна операція завершиться:

```js
function loadUserCallback(id, onSuccess, onError) {
  setTimeout(() => {
    if (id <= 0) {
      onError(new Error("Invalid id"));
      return;
    }
    onSuccess({ id, name: "Ivan" });
  }, 500);
}

loadUserCallback(
  1,
  (user) => console.log("user loaded:", user), // user loaded: { id: 1, name: 'Ivan' }
  (err) => console.log("error:", err.message),
);
```

### 2. Callback hell — «піраміда приреченості»

Коли кожна операція залежить від результату попередньої, колбеки вкладаються один в одного: код «з'їжджає» вправо, а помилки доводиться перевіряти на кожному рівні окремо.

```js
function loadUser(id, cb) {
  setTimeout(() => cb(null, { id, name: "Ivan" }), 100);
}
function loadPosts(userId, cb) {
  setTimeout(() => cb(null, [{ id: 1, title: "Post 1" }]), 100);
}
function loadComments(postId, cb) {
  setTimeout(() => cb(null, ["Comment 1"]), 100);
}

loadUser(1, (err1, user) => {
  if (err1) return console.log(err1);
  loadPosts(user.id, (err2, posts) => {
    if (err2) return console.log(err2);
    loadComments(posts[0].id, (err3, comments) => {
      if (err3) return console.log(err3);
      console.log("callback hell result:", comments); // callback hell result: [ 'Comment 1' ]
    });
  });
});
```

### 3. Node.js error-first callback

Історичний стандарт Node.js: перший аргумент колбека зарезервований під помилку (`err`), або `null`, якщо все гаразд. Саме так побудовані `loadUser`/`loadPosts`/`loadComments` вище.

```js
function readFileNodeStyle(path, callback) {
  const fakeFileSystem = { "/config.json": '{"debug": true}' };
  setTimeout(() => {
    if (!(path in fakeFileSystem)) {
      callback(new Error(`File ${path} not found`));
      return;
    }
    callback(null, fakeFileSystem[path]);
  }, 50);
}
readFileNodeStyle("/config.json", (err, content) => {
  if (err) return console.log("error:", err.message);
  console.log("file content:", content); // file content: {"debug": true}
});
```

Ще одна пастка колбеків — **Zalgo**: функція, що викликає колбек то синхронно, то асинхронно, робить порядок виконання непередбачуваним. Promise цю проблему знімає: `.then` завжди асинхронний (розділ 7).

## Спосіб 2: Promise (ES2015)

### 4. Що таке Promise і три його стани

Promise — об'єкт, що представляє значення, яке **буде** (або не буде) доступне в майбутньому. Стани:

- `pending` — початковий, результат ще невідомий;
- `fulfilled` — операція успішна, є значення;
- `rejected` — операція провалилась, є причина.

Перехід односторонній: з `pending` у `fulfilled` або `rejected` — і більше ніколи не змінюється (повторні `resolve`/`reject` ігноруються). `fulfilled` і `rejected` разом називають **settled**.

```js
const pendingPromise = new Promise((resolve, reject) => {
  // executor виконується СИНХРОННО й одразу — у момент створення Promise
  console.log("executor runs immediately"); // executor runs immediately
  setTimeout(() => {
    const success = true;
    if (success) {
      resolve("success value"); // → fulfilled
    } else {
      reject(new Error("rejection reason")); // → rejected
    }
  }, 300);
});
console.log("this line runs BEFORE the setTimeout callback inside"); // this line runs BEFORE the setTimeout callback inside
```

Якщо executor кидає виняток, Promise стає `rejected` з цим винятком.

### 5. `.then()` / `.catch()` / `.finally()`

```js
pendingPromise
  .then((value) => {
    console.log("fulfilled:", value); // fulfilled: success value
    return value.toUpperCase(); // повернене значення стає значенням НАСТУПНОГО .then()
  })
  .then((upperValue) => {
    console.log("after transform:", upperValue); // after transform: SUCCESS VALUE
  })
  .catch((error) => {
    console.log("caught:", error.message); // спрацює при reject у БУДЬ-ЯКОМУ кроці вище
  })
  .finally(() => {
    console.log("finally: always runs"); // finally: always runs
  });
```

`finally` не отримує значення і не змінює його: ланцюжок далі передає той самий результат (якщо сам `finally` не кинув помилку).

### 6. Ланцюжки — вихід із callback hell

Кожен `.then()` повертає **новий** Promise, тож виклики з'єднуються в **плоский** ланцюжок. Звичайне значення з колбека загортається в Promise автоматично; якщо колбек повертає Promise — ланцюжок чекає на нього (unwrapping).

```js
function loadUserPromise(id) {
  return new Promise((resolve) => setTimeout(() => resolve({ id, name: "Ivan" }), 100));
}
function loadPostsPromise(userId) {
  return new Promise((resolve) => setTimeout(() => resolve([{ id: 1, title: "Post 1" }]), 100));
}
function loadCommentsPromise(postId) {
  return new Promise((resolve) => setTimeout(() => resolve(["Comment 1"]), 100));
}

loadUserPromise(1)
  .then((user) => loadPostsPromise(user.id)) // повертаємо Promise — ланцюжок його дочекається
  .then((posts) => loadCommentsPromise(posts[0].id))
  .then((comments) => console.log("promise chain result:", comments)) // promise chain result: [ 'Comment 1' ]
  .catch((err) => console.log("error from ANY step:", err));
```

Один `.catch()` у кінці ловить помилку з будь-якого попереднього кроку. Поширена помилка — забути `return` усередині `.then`: тоді наступний крок отримає `undefined` і не чекатиме на вкладений Promise.

### 7. `Promise.resolve()` / `Promise.reject()`

```js
console.log(0); // 0
Promise.resolve(1).then((data) => console.log("Promise.resolve:", data)); // Promise.resolve: 1
console.log(2); // 2
```

Навіть якщо Promise **вже** виконаний, `.then()` завжди спрацьовує асинхронно (мікрозадача, розділ 15) — тому порядок: `0`, `2`, `Promise.resolve: 1`.

```js
Promise.reject(new Error("rejected right away")).catch((e) => console.log(e.message)); // rejected right away

// якщо value вже є «рідним» Promise, Promise.resolve повертає його ж, а не обгортку:
const original = Promise.resolve(42);
console.log(Promise.resolve(original) === original); // true
```

## 8. Комбінатори для кількох Promise

```js
const fastPromise = new Promise((r) => setTimeout(() => r("fast"), 100));
const slowPromise = new Promise((r) => setTimeout(() => r("slow"), 300));
const failingPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("failure")), 200));
```

Комбінатори **не запускають** операцій — усі три таймери вже стартували в момент створення Promise. `Promise.all` лише чекає на них разом, тому робота йде паралельно.

### 8.1. `Promise.all()` — усі успішні, або перша помилка

`fulfilled` лише якщо всі успішні (масив результатів — у порядку **вхідного** масиву, а не завершення); якщо хоча б один `rejected` — одразу `reject` з першою помилкою (решта продовжують виконуватись, але їхні результати ігноруються).

```js
Promise.all([fastPromise, slowPromise]).then((results) => console.log("Promise.all:", results)); // Promise.all: [ 'fast', 'slow' ]

Promise.all([fastPromise, failingPromise, slowPromise]).catch((err) =>
  console.log("Promise.all rejected by one failure:", err.message), // Promise.all rejected by one failure: failure
);
```

### 8.2. `Promise.allSettled()` — чекає на всі, ніколи не «падає» (ES2020)

Завжди `fulfilled` масивом об'єктів `{ status: "fulfilled", value }` або `{ status: "rejected", reason }` — коли треба знати результат кожної операції:

```js
Promise.allSettled([fastPromise, failingPromise]).then((results) => {
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      console.log("settled ok:", result.value); // settled ok: fast
    } else {
      console.log("settled failed:", result.reason.message); // settled failed: failure
    }
  });
});
```

### 8.3. `Promise.race()` — перший, хто завершиться (успіхом чи помилкою)

```js
Promise.race([fastPromise, slowPromise]).then((result) => console.log("Promise.race:", result)); // Promise.race: fast
Promise.race([failingPromise, slowPromise]).catch((err) => console.log("race ended with error:", err.message)); // race ended with error: failure
```

Типове застосування — timeout для будь-якої операції:

```js
function withTimeout(promise, ms) {
  let timerId;
  const timeout = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timerId)); // прибираємо таймер-переможений
}
withTimeout(slowPromise, 50).catch((err) => console.log(err.message)); // Timed out after 50ms
```

`race` не скасовує «програлу» операцію — `slowPromise` все одно виконається до кінця. Справжнє скасування — `AbortController` (розділ 20). Для `fetch` є готове `AbortSignal.timeout(ms)`.

### 8.4. `Promise.any()` — перший успішний (ES2021)

`fulfilled`, щойно хоч один успішний; `reject` лише якщо **всі** провалились — з `AggregateError`, що містить усі причини:

```js
Promise.any([failingPromise, slowPromise]).then((result) => console.log("Promise.any:", result)); // Promise.any: slow

Promise.any([failingPromise, Promise.reject(new Error("another failure"))]).catch((err) => {
  console.log("Promise.any, all failed:", err instanceof AggregateError, err.errors.length); // Promise.any, all failed: true 2
});
```

| Комбінатор | Чекає | `fulfilled`, коли | `rejected`, коли |
|---|---|---|---|
| `all` | до першої помилки | усі успішні | перша помилка |
| `allSettled` | усі | завжди | ніколи |
| `race` | перший settled | перший — успіх | перший — помилка |
| `any` | до першого успіху | перший успіх | усі помилки (`AggregateError`) |

## Спосіб 3: async/await (ES2017)

### 9. `async`-функція завжди повертає Promise

`await` можна використовувати лише всередині `async`-функції (виняток — top-level await в ES-модулях, розділ 14). `await` призупиняє **лише цю функцію**, не блокуючи потік, доки Promise не стане settled.

```js
async function loadUserAsync(id) {
  console.log("loading started"); // loading started — синхронно, до першого await
  const user = await loadUserPromise(id);
  console.log("user ready:", user); // user ready: { id: 1, name: 'Ivan' }
  return user; // автоматично загортається в Promise
}

const returnedPromise = loadUserAsync(1);
console.log(returnedPromise instanceof Promise); // true — навіть без явного new Promise
returnedPromise.then((user) => console.log("received outside:", user.name)); // received outside: Ivan
```

Код `async`-функції **до першого** `await` виконується синхронно — тому «loading started» з'являється одразу.

### 10. Ланцюжок через await — читається як синхронний код

```js
async function loadEverything() {
  try {
    const user = await loadUserPromise(1);
    const posts = await loadPostsPromise(user.id);
    const comments = await loadCommentsPromise(posts[0].id);
    console.log("async/await result:", comments); // async/await result: [ 'Comment 1' ]
    return { user, posts, comments };
  } catch (error) {
    // один try/catch ловить помилку з будь-якого await вище
    console.log("error somewhere in the chain:", error.message);
    throw error; // можна прокинути далі — виклик поверне rejected Promise
  } finally {
    console.log("finally runs always"); // finally runs always
  }
}
loadEverything();
```

### 11. Послідовно vs паралельно — класична пастка

Кожен `await` чекає завершення попереднього. Якщо операції **незалежні**, послідовні `await` марнують час (сума всіх затримок). Правильно — запустити всі одразу і чекати `Promise.all`:

```js
const delay = (ms, value) => new Promise((r) => setTimeout(() => r(value), ms));

async function sequentialSlow() {
  const start = Date.now();
  const a = await delay(300, "A");
  const b = await delay(300, "B"); // стартує лише ПІСЛЯ завершення першого
  console.log("sequential ~600ms:", Date.now() - start >= 590); // sequential ~600ms: true
  return [a, b];
}

async function parallelFast() {
  const start = Date.now();
  const promiseA = delay(300, "A"); // стартувало одразу
  const promiseB = delay(300, "B"); // теж одразу, не чекаючи promiseA
  const [a, b] = await Promise.all([promiseA, promiseB]);
  console.log("parallel ~300ms:", Date.now() - start < 450); // parallel ~300ms: true
  return [a, b];
}
sequentialSlow();
parallelFast();
```

### 12. Помилки в async/await

```js
async function willThrow() {
  throw new Error("something went wrong"); // → повернений Promise стає rejected
}
willThrow().catch((err) => console.log("caught outside:", err.message)); // caught outside: something went wrong
```

Без `.catch()`/`try-catch` помилка стає **unhandled rejection**. У Node.js ≥ 15 це за замовчуванням **завершує процес** з помилкою; у браузері — лише повідомлення в консолі. Для логування є глобальні події:

```js norun
process.on("unhandledRejection", (reason) => console.log("unhandled:", reason)); // Node.js
window.addEventListener("unhandledrejection", (event) => console.log(event.reason)); // браузер
```

Ще одна пастка — `return promise` проти `return await promise` усередині `try`: без `await` rejection **не** потрапить у `catch` цієї функції, бо функція вже повернула Promise:

```js
async function withoutAwait() {
  try {
    return Promise.reject(new Error("escaped"));
  } catch {
    return "caught inside";
  }
}
async function withAwait() {
  try {
    return await Promise.reject(new Error("escaped"));
  } catch {
    return "caught inside";
  }
}
withoutAwait().catch((e) => console.log("withoutAwait:", e.message)); // withoutAwait: escaped
withAwait().then((v) => console.log("withAwait:", v)); // withAwait: caught inside
```

### 13. await у циклах

```js
async function processSequentially(ids) {
  const results = [];
  for (const id of ids) {
    const user = await loadUserPromise(id); // кожна ітерація чекає попередню
    results.push(user.id);
  }
  return results;
}

async function processInParallel(ids) {
  const promises = ids.map((id) => loadUserPromise(id)); // усі запити стартують одразу
  return (await Promise.all(promises)).map((user) => user.id);
}
processSequentially([1, 2, 3]).then((r) => console.log("sequential:", r)); // sequential: [ 1, 2, 3 ] — через ~300ms
processInParallel([1, 2, 3]).then((r) => console.log("parallel:", r)); // parallel: [ 1, 2, 3 ] — через ~100ms
```

`forEach` з `async`-колбеком — класична пастка: `forEach` ігнорує повернені Promise, тож не чекає на жоден `await` усередині:

```js
async function brokenForEachDemo(ids) {
  ids.forEach(async (id) => {
    const user = await loadUserPromise(id);
    console.log("from forEach:", user.id); // from forEach: 1 / from forEach: 2 — вже ПІСЛЯ рядка нижче
  });
  console.log("this line runs BEFORE any await inside forEach finishes"); // this line runs BEFORE any await inside forEach finishes
}
brokenForEachDemo([1, 2]);
```

## 14. Top-level await (ES2022)

В ES-модулях (`.mjs`, `"type": "module"`, `<script type="module">`) `await` можна писати прямо на верхньому рівні, без `async`-обгортки. У CommonJS і класичних скриптах — ні.

```js norun
// config.mjs (ES-модуль):
const response = await fetch("https://api.example.com/config");
export const config = await response.json();
// модуль, що імпортує config.mjs, чекатиме завершення цих await перед власним виконанням
```

## 15. Event loop: мікрозадачі vs макрозадачі

Саме це пояснює «неочікуваний» порядок виконання. Окрім call stack є дві черги:

- **microtask queue** — колбеки `.then`/`.catch`/`.finally`, продовження після `await`, `queueMicrotask()`;
- **task (macrotask) queue** — `setTimeout`, `setInterval`, події UI, I/O у Node.js.

Правило: після кожної макрозадачі (і після синхронного коду скрипту) рушій **повністю** спорожняє чергу мікрозадач — включно з тими, що додались під час їх виконання — і лише потім бере **одну** наступну макрозадачу. (У браузері між макрозадачами ще може відбутися рендеринг.)

Щоб вивід цього розділу не змішувався з таймерами з попередніх розділів, запускаємо його пізніше:

```js
setTimeout(() => {
  console.log("1 (sync)"); // 1 (sync)
  setTimeout(() => console.log("4 (macrotask: setTimeout)"), 0); // 4 (macrotask: setTimeout)
  Promise.resolve().then(() => console.log("3 (microtask: Promise.then)")); // 3 (microtask: Promise.then)
  console.log("2 (sync)"); // 2 (sync)
}, 1500);
```

Порядок: `1`, `2`, `3`, `4` — спершу весь синхронний код, потім **усі** мікрозадачі, лише потім макрозадача, навіть з таймером `0`.

### 16. Чому `setTimeout(fn, 0)` не виконується «одразу»

```js
setTimeout(() => {
  setTimeout(() => console.log("macrotask with 0ms"), 0); // macrotask with 0ms — останній
  Promise.resolve()
    .then(() => console.log("microtask #1")) // microtask #1
    .then(() => console.log("microtask #2")) // microtask #2 — додана ПІД ЧАС обробки черги
    .then(() => console.log("microtask #3")); // microtask #3
  console.log("sync code first"); // sync code first
}, 1600);
```

Усі мікрозадачі (навіть додані одна за одною) виконуються раніше за будь-яку макрозадачу. Звідси й ризик: нескінченний ланцюжок мікрозадач «заморозить» event loop так само, як нескінченний цикл.

У Node.js є ще одна черга з вищим пріоритетом за Promise — `process.nextTick`:

```js
setTimeout(() => {
  Promise.resolve().then(() => console.log("promise microtask")); // promise microtask — другим
  process.nextTick(() => console.log("process.nextTick")); // process.nextTick — першим
}, 1700);
```

### 17. `queueMicrotask()` — явне додавання в чергу мікрозадач

```js
setTimeout(() => {
  console.log("before queueMicrotask"); // before queueMicrotask
  queueMicrotask(() => console.log("inside queueMicrotask")); // inside queueMicrotask — третім
  console.log("after queueMicrotask"); // after queueMicrotask — другим
}, 1800);
```

## Спосіб 4: генератори (історичний попередник async/await)

### 18. `function*` + `yield` + «раннер»

До async/await «синхронно виглядаючий» стиль будували на генераторах і раннері (бібліотека `co`): генератор призупиняється на `yield` Promise, а раннер продовжує його, коли Promise виконається (генератори — [iterator.md](../data-structures/iterator/iterator.md)).

```js
function runGenerator(generatorFn) {
  const iterator = generatorFn();
  function step(input) {
    const { value, done } = iterator.next(input);
    if (done) return Promise.resolve(value);
    return Promise.resolve(value).then(step); // чекаємо Promise і відправляємо результат назад у генератор
  }
  return step();
}

function* loadEverythingGenerator() {
  const user = yield loadUserPromise(1); // «призупинились», доки Promise не виконається
  const posts = yield loadPostsPromise(user.id);
  const comments = yield loadCommentsPromise(posts[0].id);
  return comments;
}

runGenerator(loadEverythingGenerator).then((result) => console.log("generator + runner:", result)); // generator + runner: [ 'Comment 1' ]
```

(Спрощений раннер не пробрасує помилки назад у генератор — справжній `co` викликає `iterator.throw(err)`, щоб працював `try/catch` усередині.) Сьогодні async/await робить те саме вбудовано; генератори для асинхронності корисні переважно для розуміння механізму і в бібліотеках на кшталт Redux-Saga.

## Асинхронна ітерація: `for await...of` і `Symbol.asyncIterator`

### 19. Асинхронні ітератори

`Symbol.iterator` робить об'єкт iterable для `for...of`, а `Symbol.asyncIterator` — «асинхронно ітерованим»: `next()` повертає **Promise** `{ value, done }`.

```js
const asyncCounter = {
  from: 1,
  to: 3,
  [Symbol.asyncIterator]() {
    let current = this.from;
    const last = this.to;
    return {
      next() {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(current <= last ? { value: current++, done: false } : { value: undefined, done: true });
          }, 100); // імітуємо затримку для кожного значення
        });
      },
    };
  },
};

async function consumeAsyncIterable() {
  for await (const value of asyncCounter) {
    console.log("async iteration:", value); // async iteration: 1 / 2 / 3 — з паузою між ними
  }
}
consumeAsyncIterable();
```

Простіше писати асинхронним генератором — `async function*` повертає готовий async iterable:

```js
async function* countTo(n) {
  for (let i = 1; i <= n; i++) {
    await delay(50);
    yield i;
  }
}
(async () => {
  const collected = [];
  for await (const n of countTo(3)) collected.push(n);
  console.log("async generator:", collected); // async generator: [ 1, 2, 3 ]
})();
```

Типове застосування — пагіновані API (кожен `next` — окремий запит) і стріми (у Node.js readable stream — async iterable).

## Скасування: AbortController

### 20. `AbortController` / `AbortSignal`

Promise не мають вбудованого скасування — розпочавшись, операція рано чи пізно завершиться. `AbortController` — стандартний механізм (не частина ECMAScript, а Web API; у Node.js — з версії 15): сигнал передається в операцію (наприклад, у `fetch`), а `.abort()` просить її зупинитись.

```js
function cancellableDelay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason); // сигнал міг бути скасований ще до старту
    const timeoutId = setTimeout(() => resolve(`done after ${ms}ms`), ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(signal.reason); // DOMException з name "AbortError" за замовчуванням
      },
      { once: true },
    );
  });
}

const controller = new AbortController();
cancellableDelay(1000, controller.signal)
  .then((result) => console.log(result))
  .catch((err) => console.log("cancelled:", err.name)); // cancelled: AbortError

setTimeout(() => controller.abort(), 100); // скасовуємо задовго до 1000ms
```

Той самий `signal` передається напряму в `fetch`, а для таймауту є готовий сигнал:

```js norun
const response = await fetch("https://api.example.com/data", { signal: AbortSignal.timeout(5000) });
```

## Практичні патерни

### 21. Retry — повторна спроба при провалі

```js
async function withRetry(fn, retriesLeft = 3, delayMs = 200) {
  try {
    return await fn(); // саме return await — щоб помилку зловив catch нижче (розділ 12)
  } catch (error) {
    if (retriesLeft <= 0) throw error;
    console.log(`retrying after "${error.message}", attempts left: ${retriesLeft}`);
    // retrying after "attempt #1 failed", attempts left: 3
    // retrying after "attempt #2 failed", attempts left: 2
    await delay(delayMs);
    return withRetry(fn, retriesLeft - 1, delayMs);
  }
}

let attemptCount = 0;
function unreliableOperation() {
  attemptCount++;
  return attemptCount < 3
    ? Promise.reject(new Error(`attempt #${attemptCount} failed`))
    : Promise.resolve("success on the third attempt");
}
withRetry(unreliableOperation).then((result) => console.log(result)); // success on the third attempt
```

У реальному коді затримку збільшують з кожною спробою (exponential backoff) і додають випадковий jitter, щоб клієнти не «били» сервер одночасно.

### 22. Обмеження кількості одночасних операцій (concurrency limit)

Коли завдань багато, але запускати всі одразу не можна (наприклад, щоб не перевантажити сервер сотнями паралельних запитів):

```js
async function mapWithConcurrencyLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++; // безпечно: між читанням і ++ немає await, а потік один
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

let running = 0;
let maxRunning = 0;
mapWithConcurrencyLimit([1, 2, 3, 4, 5], 2, async (id) => {
  running++;
  maxRunning = Math.max(maxRunning, running);
  const user = await loadUserPromise(id);
  running--;
  return user.id;
}).then((all) => console.log("limited:", all, "max in flight:", maxRunning)); // limited: [ 1, 2, 3, 4, 5 ] max in flight: 2
```

### 23. Debounce для асинхронних викликів

Типовий випадок — пошук під час набору тексту: реальний запит має піти лише після паузи в наборі.

```js
function debounceAsync(fn, delayMs) {
  let timeoutId;
  let rejectPrevious;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    rejectPrevious?.(new Error("debounced")); // інакше попередні Promise висіли б вічно
    return new Promise((resolve, reject) => {
      rejectPrevious = reject;
      timeoutId = setTimeout(() => {
        rejectPrevious = undefined;
        resolve(fn(...args));
      }, delayMs);
    });
  };
}

const debouncedSearch = debounceAsync((query) => {
  console.log("real search request for:", query); // real search request for: Java — лише один раз
  return Promise.resolve([`result for "${query}"`]);
}, 300);

const ignore = (err) => err.message; // скасовані виклики просто ігноруємо
debouncedSearch("J").catch(ignore);
debouncedSearch("Ja").catch(ignore);
debouncedSearch("Java").then((r) => console.log(r)); // [ 'result for "Java"' ]
```

> [!note] Виправлення відносно попередньої версії
> У простій реалізації без `rejectPrevious` Promise від скасованих викликів (`"J"`, `"Ja"`) ніколи не виконуються — `await debouncedSearch("J")` завис би назавжди. Тут вони відхиляються з помилкою `"debounced"`.

### 24. Callback → Promise: `promisify`

```js
function promisify(fn) {
  return function promisified(...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}
const readFilePromise = promisify(readFileNodeStyle); // readFileNodeStyle — з розділу 3
readFilePromise("/config.json").then((content) => console.log("via promisify:", content)); // via promisify: {"debug": true}
readFilePromise("/missing.json").catch((err) => console.log("via promisify:", err.message)); // via promisify: File /missing.json not found
```

У Node.js для цього є вбудований `util.promisify()`, а більшість API має готові Promise-версії (`fs/promises`, `timers/promises`).

## Підсумок

- JS виконує код в одному потоці; асинхронність — це делегування очікування середовищу і черги колбеків, які обробляє event loop.
- Callback — базовий рівень; проблеми: вкладеність (callback hell), ручна обробка помилок на кожному рівні, непередбачуваність sync/async-викликів.
- Promise — «значення в майбутньому» зі станами `pending` → `fulfilled`/`rejected` (незворотно); `.then` повертає новий Promise, тож ланцюжки плоскі, а один `.catch` ловить помилку з будь-якого кроку.
- Комбінатори: `all` (усі або перша помилка), `allSettled` (усі, без падіння), `race` (перший settled), `any` (перший успіх, інакше `AggregateError`); вони не запускають операцій і не скасовують «програлих».
- async/await — синтаксис над Promise; незалежні операції запускай одразу і чекай `Promise.all`, а не послідовними `await`; `forEach` не чекає `async`-колбеків.
- У `try` пиши `return await`, інакше rejection обійде `catch`; необроблений rejection у Node.js завершує процес.
- Event loop: після кожної макрозадачі повністю спорожняється черга мікрозадач (Promise, `await`, `queueMicrotask`); у Node.js `process.nextTick` — ще раніше.
- Генератори + раннер — історичний механізм, на якому концептуально побудовано async/await; `async function*` + `for await...of` — для послідовностей асинхронних значень.
- `AbortController` — стандартне скасування (Web API, не ECMAScript); `AbortSignal.timeout()` — готовий таймаут.
- Патерни retry, concurrency limit, debounce, promisify будуються поверх Promise і async/await.
