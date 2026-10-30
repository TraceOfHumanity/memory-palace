# `fetch` у JavaScript

Усі виводи нижче отримані реальним запуском: **Node.js 24.12.0** (`fetch` — це вбудований undici), локальний `http`-сервер, `https`-сервер із самопідписаним сертифікатом, а також реальний `https://example.com`. Позначка **[виміряно]** — перевірено запуском. Позначка **[довідково]** — стандарт Fetch / поведінка браузера, яку в Node перевірити неможливо (CORS, cookie, кеш браузера тощо); вона не тестувалась.

Пов'язане: [http-https.md](../../computer-science/http-https.md) (сам протокол), [asynchronous.md](asynchronous/asynchronous.md) (проміси, `async/await`, `AbortController`).

---

## 1. Що це

`fetch()` — глобальна функція Web API для **HTTP-запитів**. Замінила `XMLHttpRequest`. Працює на промісах, у браузерах (усі сучасні), у Node.js (з v18 вбудовано, стабільно з v21), Deno, Bun, Cloudflare Workers.

```js
const response = await fetch(url, options);
const data = await response.json();
```

**[виміряно]** Усі глобальні сутності доступні без імпорту: `fetch`, `Headers`, `Request`, `Response`, `FormData`, `AbortController`, `AbortSignal.timeout`, `structuredClone` — усі мають тип `function`.

Сигнатура: `fetch(resource, init?) → Promise<Response>`
- `resource` — рядок, об'єкт `URL` або об'єкт `Request`.
- `init` — необов'язковий об'єкт налаштувань.

**[виміряно]** `fetch(url)` повертає `Promise` (`[object Promise]`), а не `Response`.

## 2. Два етапи: заголовки і тіло

Проміс `fetch` **виконується, щойно прийшли статус і заголовки**, а не все тіло. Тіло читається окремо.

**[виміряно]** для відповіді, що надсилає тіло частинами протягом ~100 мс: `fetch` розв'язався майже миттєво (~0 мс), після чого `await r.body.cancel()`. Тобто:
1. `await fetch(...)` → `Response` (є статус, заголовки, тіло ще «в дорозі»).
2. `await response.json()` / `.text()` / … → дочекатись і розібрати тіло.

Тому дві `await` у ланцюжку — не помилка, а два етапи.

## 3. Об'єкт `Response`

**[виміряно]** для `GET /json` (200):
```
r.constructor.name  → "Response"
r.status            → 200
r.statusText        → "OK"
r.ok                → true      (status 200–299)
r.type              → "basic"
r.redirected        → false
r.bodyUsed          → false     (до читання)
r.url               → повний фінальний URL
```

| Властивість | Сенс |
|---|---|
| `status` | числовий код (200, 404 …) |
| `statusText` | фраза («OK», «Not Found») |
| `ok` | `true`, якщо `status` у діапазоні **200–299** |
| `headers` | об'єкт `Headers` |
| `url` | URL після редіректів |
| `redirected` | чи були редіректи |
| `type` | `basic`, `cors`, `opaque`, `opaqueredirect`, `error` |
| `body` | `ReadableStream` (або `null`) |
| `bodyUsed` | чи вже прочитано тіло |

**[виміряно]** `r.body.constructor.name` → `ReadableStream`, `r.body.locked` → `false`. Для `HEAD`-запиту `r.body === null`.

### 3.1. `type` (для довідки, [довідково])
- `basic` — той самий origin.
- `cors` — крос-доменний запит, доступний за CORS.
- `opaque` — відповідь на `mode: 'no-cors'`: статус 0, тіла й заголовків не видно.
- `opaqueredirect` — результат `redirect: 'manual'` у браузері.
- `error` — мережева помилка (`Response.error()`).

**[виміряно]** `Response.error()` → `type: 'error'`, `status: 0`. У Node `redirect: 'manual'` повернув `type: 'basic'`, `status: 302` і доступний заголовок `Location` (поведінка відрізняється від браузера, де відповідь `opaqueredirect`).

## 4. Найважливіша пастка: HTTP-помилки не відхиляють проміс

**[виміряно]**
```
GET /404  → r.ok = false, r.status = 404, statusText "Not Found"  — проміс НЕ відхилено
GET /500  → r.ok = false, r.status = 500, "Internal Server Error" — проміс НЕ відхилено
```
`fetch` відхиляє проміс **лише при мережевій помилці** (немає зв'язку, DNS не знайшов, відмова в з'єднанні, помилка TLS, скасування, таймаут), але **не** коли сервер відповів кодом 4xx/5xx.

Тому завжди перевіряйте `response.ok`:
```js
const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
const data = await res.json();
```
Типова утиліта:
```js
async function getJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = await res.text().catch(() => "");
    throw err;
  }
  return res.json();
}
```

## 5. Читання тіла

Методи `Response` (і `Request`), усі повертають проміси:

| Метод | Результат |
|---|---|
| `.json()` | розібраний JSON (`JSON.parse`) |
| `.text()` | рядок (**завжди UTF-8**) |
| `.arrayBuffer()` | `ArrayBuffer` |
| `.blob()` | `Blob` |
| `.formData()` | `FormData` |
| `.bytes()` | `Uint8Array` (нові версії; у Node 24 є — виміряно) |

**[виміряно]**
```
.json()        → { a: 1, b: [ 1, 2 ] }
.text()        → "héllo"
.arrayBuffer() → 6 байт   («é» у UTF-8 = 2 байти, «h,l,l,o» = 4)
.blob()        → size 6, type "" (сервер не вказав Content-Type)
.formData()    → [['a','1'],['b','x y']]  (для application/x-www-form-urlencoded)
```

### 5.1. Тіло можна прочитати лише один раз
**[виміряно]**
```
await r.json();           // ok, bodyUsed = true
await r.json();           // TypeError: Body is unusable: Body has already been read
```
Щоб прочитати двічі — `response.clone()` **до** читання:
```js
const copy = res.clone();
const data = await res.json();
const raw  = await copy.text();   // виміряно: працює
```
Клон має сенс, якщо потрібно, наприклад, залогувати текст помилки й розібрати JSON. Не клонуйте без потреби: клон буферизує тіло (для великих відповідей — пам'ять).

### 5.2. Помилки розбору
**[виміряно]**
```
.json() на {oops          → SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
.json() на порожнє тіло (204) → SyntaxError: Unexpected end of JSON input
.text() на 204            → ""
```
Тому для 204 No Content не викликайте `.json()`. Перевіряйте статус або `Content-Type`:
```js
if (res.status === 204) return null;
const ct = res.headers.get("content-type") ?? "";
return ct.includes("application/json") ? res.json() : res.text();
```

### 5.3. Кодування
**[виміряно]** `text()` **завжди** декодує як UTF-8, ігноруючи `charset=iso-8859-1` у заголовку: байт `0xE9` перетворився на `�`. Для інших кодувань: `new TextDecoder("iso-8859-1").decode(await res.arrayBuffer())`.

### 5.4. Стиснення
**[виміряно]** сервер надіслав `Content-Encoding: gzip` — `fetch` **сам розпаковує**: `text()` повернув `compressed hello`. Заголовок `content-encoding: gzip` у `Response` лишається. `Accept-Encoding` за замовчуванням виставляється автоматично (у Node виміряно: `gzip, deflate`).

## 6. Мережеві помилки

**[виміряно]**
| Ситуація | Що отримали |
|---|---|
| Порт закритий | `TypeError: fetch failed`, `cause: Error, code: 'ECONNREFUSED'` (є `errno`, `syscall`, `address`, `port`) |
| Домен не існує | `TypeError: fetch failed`, `cause.code: 'ENOTFOUND'`, `cause.hostname` |
| Самопідписаний сертифікат | `TypeError: fetch failed`, `cause.code: 'DEPTH_ZERO_SELF_SIGNED_CERT'` |
| Відносний URL у Node | `TypeError: Failed to parse URL from /relative`, `cause.code: 'ERR_INVALID_URL'` |
| Сміття замість URL | `TypeError: Failed to parse URL from not a url` |
| Порт 1 (заборонений) | `cause.message: 'bad port'` |
| `file:` URL | `TypeError: fetch failed`, `cause: not implemented... yet...` |

Ключове: **усі мережеві помилки — `TypeError`** (у браузері — з текстом на кшталт «Failed to fetch» без деталей, щоб не розкривати інформацію), а справжня причина лежить у `error.cause` (у Node). Відрізняти їх — за `error.cause?.code`.

`data:` URL працює: **[виміряно]** `fetch('data:text/plain;base64,aGk=')` → `hi`.

Відносні URL: у браузері `fetch('/api/x')` працює (відносно сторінки), у Node — **ні**, потрібен повний URL.

## 7. Запит: метод, заголовки, тіло

### 7.1. Налаштування за замовчуванням
**[виміряно]** (Node) простий `fetch(url)`:
```
method: GET
user-agent: node
accept: */*
accept-encoding: gzip, deflate
(тіла немає)
```
У браузері User-Agent, Accept-Language, Cookie, Origin, Referer додає сам браузер.

### 7.2. Метод
`fetch(url, { method: 'POST' })`.
**[виміряно]**
- `get`, `post`, `put`, `delete`, `head`, `options` у нижньому регістрі — **нормалізуються** до верхнього.
- **`patch` в нижньому регістрі НЕ нормалізується** — сервер отримав `patch` і відповів `400`; у Node ще й попередження `UNDICI-FETCH-patch`. `PATCH` у верхньому регістрі працює (`200`). Завжди пишіть метод **великими літерами**.
- `GET` / `HEAD` **з тілом** → `TypeError: Request with GET/HEAD method cannot have body.`

### 7.3. Заголовки
Передаються як: простий об'єкт, масив пар, або `Headers`. **[виміряно]** усі три форми дають однаковий результат.
```js
headers: { "Authorization": "Bearer t", "X-Req": "1" }
```
**[виміряно]** сервер побачив `authorization` і `x-req`, а також `User-Agent: my-app` (у Node можна змінити). Спроба задати `Host: evil.test` — **проігнорована**, сервер отримав справжній `127.0.0.1:PORT`. У браузері є список **forbidden header names** (`Host`, `Cookie`, `Origin`, `Referer`, `Content-Length`, `Accept-Encoding`…) — їх змінити не можна [довідково].

### 7.4. Тіло і автоматичний `Content-Type`
Тип `body` визначає, який `Content-Type` виставить `fetch`. **[виміряно]**

| `body` | Виставлений `Content-Type` |
|---|---|
| рядок | `text/plain;charset=UTF-8` |
| рядок + ваш `Content-Type` | ваш |
| `URLSearchParams` | `application/x-www-form-urlencoded;charset=UTF-8` (тіло `a=1&b=x+y`) |
| `FormData` | `multipart/form-data; boundary=----…` (межу генерує сам fetch) |
| `Blob` | `blob.type` (приклад: `text/x-custom`) |
| `Uint8Array` / `ArrayBuffer` | **не виставляється** |
| `ReadableStream` | **не виставляється**, потрібно `duplex: 'half'` [довідково] |

`Content-Length` для рядка й байтів виставляється сам (**[виміряно]**: `7` для `{"x":1}`, `3` для трьох байтів).

**Головна пастка:** `JSON.stringify(obj)` — це **рядок**, тому без явного заголовка піде `text/plain` і багато серверів не розпарсять JSON.
```js
await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ x: 1 }),
});
```
**Не** ставте `Content-Type` вручну для `FormData` — тоді втратиться `boundary` і сервер не розбере multipart.

### 7.5. Параметри запиту
`fetch` не вміє формувати query сам. Використовуйте `URL`/`URLSearchParams`:
```js
const url = new URL("https://api.example.com/search");
url.searchParams.set("q", "кіт");      // кодується автоматично
url.searchParams.set("page", 2);
await fetch(url);
```

## 8. Об'єкт `Headers`

**[виміряно]**
```js
const h = new Headers({ "Content-Type": "text/plain" });
h.append("X-A", "1"); h.append("x-a", "2"); h.set("X-B", "b");
[...h]          // [['content-type','text/plain'], ['x-a','1, 2'], ['x-b','b']]
h.get("x-a")    // "1, 2"
h.has("X-B")    // true
h.delete("x-b") // → ключі: ['content-type','x-a']
```
- Імена **нечутливі до регістру** (виводяться в нижньому), ітерація відсортована за ім'ям.
- `append` для вже існуючого імені **склеює значення через `, `**.
- Методи: `get`, `set`, `append`, `has`, `delete`, `forEach`, `keys`, `values`, `entries`, `getSetCookie`.
- **`Set-Cookie` — особливий випадок.** **[виміряно]** сервер надіслав два `Set-Cookie`: `headers.get('set-cookie')` → `"a=1, b=2"` (склеєно, дані неможливо надійно розділити), а `headers.getSetCookie()` → `['a=1','b=2']` — правильний спосіб.
- Багатозначний `X-Test`: `get('x-test')` → `"one, two"`.

## 9. Редіректи

Параметр `redirect`: `"follow"` (за замовчуванням), `"manual"`, `"error"`.

**[виміряно]**
```
follow (302 → /json):  status 200, redirected: true, url = кінцевий
manual:                status 302, Location: /json (Node: type 'basic')
error:                 TypeError: fetch failed, cause: "unexpected redirect"
307 з POST:            метод і тіло збереглися (повторно POST)
```
Максимум редіректів у браузерах — 20. 301/302 для POST традиційно перетворюють метод на GET; 307/308 — зберігають.

## 10. Скасування і таймаут

### 10.1. AbortController
```js
const ac = new AbortController();
const p = fetch(url, { signal: ac.signal });
ac.abort();
```
**[виміряно]**
```
abort()                        → DOMException  name "AbortError", message "This operation was aborted", code 20; signal.aborted = true
abort(new Error("custom"))     → відхилення з ТІЄЮ помилкою (name "Error", message "custom reason")
уже скасований signal до fetch → відразу відхиляється, запит не йде
```
### 10.2. `AbortSignal.timeout(ms)`
**[виміряно]** `fetch(url, { signal: AbortSignal.timeout(100) })` на повільний ендпоінт → `TimeoutError`, message `The operation was aborted due to timeout`, code `23`. Це **не** `AbortError` — розрізняйте:
```js
try { await fetch(url, { signal }); }
catch (e) {
  if (e.name === "TimeoutError") … // таймаут
  else if (e.name === "AbortError") … // ручне скасування
  else … // мережа
}
```
### 10.3. Комбінація
**[виміряно]** `AbortSignal.any([AbortSignal.timeout(80), userController.signal])` — скасується від першого з них (отримано `TimeoutError`).

### 10.4. Що скасування не робить
Скасування рве з'єднання на боці клієнта; **сервер може вже виконати запит** (POST). Скасування під час читання тіла теж відхиляє `await res.json()`. Власного таймауту в `fetch` **немає** — без `signal` запит може висіти дуже довго (ліміти ставить рантайм/ОС).

## 11. Стрімінг тіла

`response.body` — `ReadableStream`. **[виміряно]** сервер надсилав `one\n`, `two\n`, `three\n` із паузами по ~50 мс — клієнт отримував їх **частинами** з відповідною затримкою:
```js
const reader = res.body.getReader();
const dec = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();   // value — Uint8Array
  if (done) break;
  console.log(dec.decode(value));
}
```
Виміряно: `chunk 1 "one\n" +0ms`, `chunk 2 "two\n" +50ms`, `chunk 3 "three\n" +100ms`.

Зручніше — `for await` + `TextDecoderStream`:
```js
for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) { … }
// виміряно: "one\ntwo\nthree\n"
```
### 11.1. Прогрес завантаження
Тіло можна рахувати по частинах. **[виміряно]** `content-length: 1000000` → `for await (const ch of res.body)` порахував рівно `1000000` байт.
```js
const total = +res.headers.get("content-length");
let got = 0;
for await (const ch of res.body) { got += ch.length; progress(got / total); }
```
(Якщо стиснення gzip — `content-length` стислого розміру не збігається з розпакованим.)

### 11.2. NDJSON / SSE-подібний потік
**[виміряно]** рядки JSON, що приходять частинами й обриваються посеред об'єкта, — накопичуйте буфер і розрізайте за `\n`:
```js
let buf = "";
for await (const part of res.body.pipeThrough(new TextDecoderStream())) {
  buf += part; let i;
  while ((i = buf.indexOf("\n")) >= 0) { handle(JSON.parse(buf.slice(0, i))); buf = buf.slice(i + 1); }
}
// отримано [{i:1},{i:2},{i:3}]
```
### 11.3. Завантаження (upload) прогресу
`fetch` **не дає події прогресу відправки** (на відміну від `XMLHttpRequest.upload.onprogress`). Варіанти: `XMLHttpRequest`, або стрім-тіло з `duplex: 'half'` (підтримка обмежена) [довідково].

## 12. `Request` і `Response` як конструктори

**[виміряно]** (Request створено з `POST`, у `init` передано `PUT` — сервер отримав `PUT`):
```js
const rq = new Request(url, { method: "PUT", body: "q" });   // rq.method "PUT", rq.bodyUsed false
await fetch(rq);                                             // передаємо як ресурс
await fetch(rq, { method: "POST" });                         // init перекриває поля Request

const rs = new Response("hello", { status: 201, statusText: "Made", headers: { "X-K": "v" } });
rs.ok                       // true (201)
Response.json({ a: 1 }, { status: 202 })  // content-type: application/json, тіло {"a":1}
Response.error()            // type "error", status 0
```
`new Response(...)` важливий у **Service Worker** і тестах (мок відповіді). Також існує `Response.redirect(url, status)`.

`fetch` приймає і `URL`: **[виміряно]** `fetch(new URL('/echo', base))` → 200.

## 13. Паралельні запити

`await` у циклі — **послідовно**, `Promise.all` — паралельно. **[виміряно]** (три операції по 100 мс): послідовно ~300 мс, паралельно ~100 мс; для трьох повільних `fetch` по 1 с — загалом **~1 с**.
```js
const [a, b, c] = await Promise.all(urls.map((u) => fetch(u).then((r) => r.json())));
```
- `Promise.all` відхиляється на **першій** помилці (інші запити не скасовуються автоматично!).
- `Promise.allSettled` — **[виміряно]** `[ 'fulfilled', 'rejected' ]`, не падає на одному збої.
- `Promise.race` — перший результат (програші не скасовуються — додайте `AbortController`).
- Для великої кількості URL обмежуйте паралелізм (черга/пул), щоб не перевантажити сервер і браузерний ліміт з'єднань на домен (~6 для HTTP/1.1) [довідково].

## 14. Повтор (retry) із backoff

**[виміряно]** (сервер повертав `503, 503, 200`):
```
attempt 1 → 503
attempt 2 → 503
G retry: ok after 3
```
```js
async function fetchRetry(url, init, { retries = 3, base = 300 } = {}) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || ![429, 502, 503, 504].includes(res.status)) return res;
    } catch (e) {
      if (e.name === "AbortError" || i >= retries) throw e;
    }
    if (i >= retries) throw new Error("gave up");
    await new Promise((r) => setTimeout(r, base * 2 ** i + Math.random() * 100)); // експоненційний backoff + jitter
  }
}
```
Повторюйте лише **ідемпотентні** запити (GET, PUT, DELETE) або ті, де є `Idempotency-Key`. POST без захисту може виконатися двічі.

## 15. Браузерні особливості [довідково]

Цю частину в Node перевірити неможливо: **[виміряно]** Node приймає опції `mode`, `credentials`, `cache`, `referrerPolicy`, `keepalive` без помилки й нічого з ними не робить (відповідь `200`, `type: basic`).

### 15.1. CORS і `mode`
- `mode: "cors"` (за замовчуванням) — крос-доменні запити дозволені, лише якщо сервер відповів потрібними `Access-Control-Allow-*`. Відповідь без дозволу → `TypeError: Failed to fetch`, а в консолі — помилка CORS. Деталі **недоступні** коду.
- «Прості» запити йдуть одразу; решта (методи не `GET/HEAD/POST`, довільні заголовки, `Content-Type: application/json`) спершу викликають **preflight** — автоматичний `OPTIONS`.
- `mode: "same-origin"` — тільки свій origin; `"no-cors"` — дозволяє відправити запит, але відповідь **opaque** (читати нічого не можна).
- CORS — захист **браузера**; Node/curl його не мають. Обхід — налаштувати сервер, а не «виправити fetch».

### 15.2. Cookie і `credentials`
- `"same-origin"` (за замовчуванням) — cookie лише для свого origin.
- `"include"` — слати/приймати cookie й для крос-доменних запитів (сервер має віддати `Access-Control-Allow-Credentials: true` і конкретний origin, а не `*`).
- `"omit"` — ніколи.

### 15.3. Кеш (`cache`)
`default`, `no-store`, `reload`, `no-cache`, `force-cache`, `only-if-cached` — керують взаємодією з HTTP-кешем браузера (`ETag`, `Cache-Control`, див. [http-https.md](../../computer-science/http-https.md)).

### 15.4. `keepalive`
`keepalive: true` дозволяє запиту дожити після закриття сторінки (аналітика, `sendBeacon`-подібні) — ліміт тіла ~64 КБ.

### 15.5. Інші опції
`referrer`, `referrerPolicy`, `integrity` (Subresource Integrity), `priority` (`high`/`low`/`auto`), `duplex`.

## 16. `fetch` у Node.js

- У Node 18+ вбудовано на базі **undici**; у Node 24 — виміряно: `typeof fetch === "function"`.
- Немає cookie jar, CORS, кешу, відносних URL.
- **Самопідписаний сертифікат** відхиляється. Власний CA у undici налаштовується через `Agent` із `connect: { ca }` (з пакета `undici`) або змінну `NODE_EXTRA_CA_CERTS` [довідково]. `rejectUnauthorized: false` — лише для розробки.
- Проксі, пул з'єднань, таймаути: `undici.Agent`/`setGlobalDispatcher`.
- У Node 18 перші версії друкували `ExperimentalWarning` [довідково]; у Node 24.12 попереджень не було (виміряно).
- **[виміряно]** реальний `fetch('https://example.com')` у Node 24: `status 200`, `content-type: text/html; charset=utf-8`, `url https://example.com/`, тіло прочитано.

## 17. Порівняння з `XMLHttpRequest` і Axios

| | `XMLHttpRequest` | `fetch` | Axios |
|---|---|---|---|
| API | колбеки/події | проміси | проміси |
| HTTP 4xx/5xx | не помилка | **не помилка** (`ok`) | **помилка** (відхиляє) |
| JSON | вручну | `.json()` | автоматично (`data`) |
| Таймаут | `timeout` | `AbortSignal.timeout` | `timeout` |
| Прогрес відправки | є | **немає** | є (через XHR/адаптери) |
| Скасування | `abort()` | `AbortController` | `AbortController` |
| Інтерсептори | ні | ні (обгортка) | **є** |
| Додаткова залежність | ні | ні | так |

## 18. Типові обгортки

```js
// API-клієнт
const api = (base) => async (path, { json, ...init } = {}) => {
  const res = await fetch(new URL(path, base), {
    ...init,
    headers: { ...(json && { "Content-Type": "application/json" }), ...init.headers },
    body: json ? JSON.stringify(json) : init.body,
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status, res });
  return res.status === 204 ? null : res.json();
};
```
У React — не викликайте `fetch` у тілі компонента; використовуйте `useEffect` з `AbortController` у cleanup (див. [useEffect.md](../react-js/useEffect.md)) або бібліотеки (TanStack Query, SWR). Захист від **гонки відповідей**: скасовуйте попередній запит або ігноруйте застарілий.

## 19. Типові помилки

1. Не перевіряти `res.ok` — 404/500 «проходять успішно».
2. Забути `await res.json()` (отримати `Promise` замість даних).
3. Читати тіло двічі (`Body is unusable`) — потрібен `clone()`.
4. `JSON.stringify` без `Content-Type: application/json`.
5. Ставити `Content-Type` вручну для `FormData`.
6. Метод `patch` у нижньому регістрі.
7. `.json()` на порожню відповідь (204/HEAD).
8. Очікувати, що `fetch` відхилиться при 4xx/5xx.
9. Не обробити `TimeoutError`/`AbortError` окремо від мережевої помилки.
10. `await` у циклі замість `Promise.all` (послідовність: ~300 мс замість ~100 мс).
11. Не скасовувати застарілі запити → «гонка» відповідей і витоки.
12. Покладатися на `res.text()` для кодувань, відмінних від UTF-8.
13. Відносний URL у Node.
14. Передавати параметри в рядок без `encodeURIComponent` / `URLSearchParams`.
15. Користувацька `Host`/`Cookie`/`Origin` у браузері — ігнорується.
16. Вимикати перевірку сертифіката в продакшені.
17. Очікувати прогресу відправки від `fetch`.
18. Повторювати небезпечні (неідемпотентні) запити без ключа ідемпотентності.
19. Лишати запит без таймауту.
20. Плутати CORS-помилку з помилкою сервера (вони мають однаковий вигляд `Failed to fetch`).

## 20. Алгоритм

1. Побудуй URL через `new URL` + `searchParams`.
2. Вибери метод (великими літерами) і тіло; для JSON — `JSON.stringify` + `Content-Type: application/json`.
3. Додай `signal: AbortSignal.timeout(ms)` (і своє скасування через `AbortSignal.any`).
4. `const res = await fetch(url, init)` у `try/catch` (мережа, таймаут, скасування).
5. Перевір `res.ok`; якщо ні — кинь помилку з `status` і, за потреби, текстом тіла.
6. Розбери тіло **один раз**: `json()` / `text()` / `blob()` / стрім; для 204 — нічого не парсь.
7. Паралельні запити — `Promise.all` / `allSettled`; нестабільні — retry з backoff лише для ідемпотентних.
8. Великі потоки — `res.body` + `TextDecoderStream`.
