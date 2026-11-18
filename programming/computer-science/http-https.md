# HTTP і HTTPS

Усі виводи нижче отримані реальним запуском: Node.js 24.12.0 (`http`, `https`, `http2`, `tls`, `net`), curl 8.7.1, LibreSSL 3.3.6, самопідписаний сертифікат RSA-2048 (`CN=localhost`). Дата запусків — 30.10.2026.

## 1. Що це

**HTTP** (HyperText Transfer Protocol) — прикладний протокол «запит → відповідь» поверх надійного потоку байтів (TCP; у HTTP/3 — QUIC). Клієнт надсилає **запит**, сервер повертає **відповідь**. Протокол **без стану** (stateless): кожен запит самодостатній, сервер сам нічого не «пам'ятає» між запитами. Стан тримають cookie, токени, сесії.

**HTTPS** = HTTP **усередині TLS**. Це не окремий протокол, а той самий HTTP, байти якого шифруються й автентифікуються шаром TLS. Порти за замовчуванням: **80** (http) і **443** (https).

## 2. Шлях запиту від URL до відповіді

1. Розбір URL.
2. **DNS**: `example.com` → IP.
3. **TCP**-рукостискання (SYN, SYN-ACK, ACK).
4. Для HTTPS — **TLS**-рукостискання.
5. Надсилання HTTP-запиту.
6. Отримання відповіді, розбір, рендер.
7. З'єднання закривається або лишається для наступних запитів (keep-alive).

## 3. Анатомія URL

`https://user:pw@example.com:8443/a/b%20c?q=1&q=2#frag`

Виміряно через `new URL(...)`:
| Частина | Значення |
|---|---|
| protocol | `https:` |
| username | `user` |
| hostname | `example.com` |
| port | `8443` |
| host | `example.com:8443` |
| pathname | `/a/b%20c` |
| search | `?q=1&q=2` |
| hash | `#frag` |
| origin | `https://example.com:8443` |
| `searchParams.getAll('q')` | `['1','2']` |

- **Фрагмент `#…` на сервер не надсилається**, його обробляє браузер.
- Порт за замовчуванням прибирається: `new URL('http://example.com:80/').port === ''`, `new URL('https://example.com:443/').host === 'example.com'`.
- Відносні адреси: `new URL('/x?y=1','https://a.com/p/q').href` → `https://a.com/x?y=1`; `new URL('../z','https://a.com/p/q/r').href` → `https://a.com/p/z`.
- Не-ASCII кодується відсотками: `/привіт?к=м` → `/%D0%BF%D1%80%D0%B8%D0%B2%D1%96%D1%82?%D0%BA=%D0%BC`.
- **Origin** = схема + хост + порт; на ньому тримається політика одного походження (same-origin) і CORS.

## 4. Формат запиту

Текст, рядки розділені `\r\n`:
```
GET / HTTP/1.1\r\n
Host: x\r\n
Connection: close\r\n
\r\n
```
1. **Стартовий рядок**: метод, ціль, версія.
2. **Заголовки** `Ім'я: значення`.
3. **Порожній рядок** (`\r\n\r\n`) — кінець заголовків.
4. **Тіло** (необов'язкове).

Виміряний POST із JSON:
```
POST /post HTTP/1.1
Host: x
Content-Type: application/json
Content-Length: 7
Connection: close

{"a":1}
```
Відповідь сервера: `201 Created`, тіло `{"got":"{\"a\":1}","method":"POST","ct":"application/json"}`.

`Content-Length` — довжина тіла **в байтах**, а не символах.

## 5. Формат відповіді

Виміряна сира відповідь на `GET /`:
```
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Date: Fri, 30 Oct 2026 20:03:30 GMT
Connection: close
Content-Length: 5

hello
```
Стартовий рядок: версія, **код статусу**, фраза. Далі заголовки, порожній рядок, тіло.

### Як клієнт знає, де кінець тіла
1. `Content-Length: N` — прочитати рівно N байт.
2. `Transfer-Encoding: chunked` — тіло шматками. Виміряно для відповіді `ab` + `cd`:
   `2\r\nab\r\n2\r\ncd\r\n0\r\n\r\n` — кожен шматок: довжина в hex, дані; шматок довжини `0` завершує тіло.
3. Закриття з'єднання (HTTP/1.0).

Node сам вибирає: якщо довжина відома — `Content-Length`, якщо писали частинами через `res.write` — `chunked`.

## 6. Методи

Список із `http.METHODS` — 35 назв. Основні:
| Метод | Призначення | Безпечний | Ідемпотентний |
|---|---|---|---|
| GET | отримати ресурс | так | так |
| HEAD | те саме, що GET, але **без тіла** | так | так |
| POST | створити / виконати дію | ні | ні |
| PUT | замінити ресурс цілком | ні | так |
| PATCH | часткова зміна | ні | ні (зазвичай) |
| DELETE | видалити | ні | так |
| OPTIONS | які методи/можливості доступні (CORS preflight) | так | так |

**Безпечний** = не змінює стан на сервері. **Ідемпотентний** = повтор дає той самий результат.

Виміряно: `HEAD /` повертає ті самі заголовки (`Content-Type`, `Date`), але тіла немає. Сервер повернув `GET 200 "GET"`, `POST 200 "POST"` … `HEAD 200 ""`.

## 7. Коди статусу

| Клас | Сенс | Приклади |
|---|---|---|
| 1xx | інформаційні | 100 Continue, 101 Switching Protocols |
| 2xx | успіх | 200 OK, 201 Created, 204 No Content, 206 Partial Content |
| 3xx | перенаправлення | 301 Moved Permanently, 302 Found, 304 Not Modified, 307, 308 |
| 4xx | помилка клієнта | 400, 401, 403, 404, 405, 409, 418, 422, 429 |
| 5xx | помилка сервера | 500, 502, 503, 504 |

- **301/308** — назавжди, **302/307** — тимчасово; 307/308 зберігають метод, 301/302 історично перетворюють POST на GET.
- **401** — не автентифікований, **403** — автентифікований, але немає прав.
- `http.STATUS_CODES[418]` → `I'm a Teapot`.
- Виміряно: редірект `301 Moved Permanently` + `Location: /final`, `curl -L` пішов за ним (`redirects=1 final=https://localhost:8443/`).

## 8. Ключові заголовки

**Запит**: `Host`, `User-Agent`, `Accept`, `Accept-Encoding`, `Content-Type`, `Content-Length`, `Authorization`, `Cookie`, `Range`, `If-None-Match`, `Origin`.
**Відповідь**: `Content-Type`, `Content-Length`, `Content-Encoding`, `Set-Cookie`, `Location`, `Cache-Control`, `ETag`, `Date`, `Content-Range`, `Strict-Transport-Security`.

### Host
У HTTP/1.1 **обов'язковий** — на одній IP може жити багато сайтів (віртуальні хости). Виміряно: запит `GET / HTTP/1.1` без `Host` → `400 Bad Request`. Те саме для сміття `HELLO` → `HTTP/1.1 400 Bad Request`. HTTP/1.0 без `Host` — працює (`200 OK`).

### Content-Type
Тип і кодування тіла: `text/plain; charset=utf-8`, `application/json`, `text/html`, `application/x-www-form-urlencoded`, `multipart/form-data`.

## 9. З'єднання: keep-alive і конвеєр

HTTP/1.0 закривав з'єднання після кожної відповіді. HTTP/1.1 за замовчуванням тримає його відкритим (`Connection: keep-alive`, виміряно у відповіді curl: `Connection: keep-alive`, `Keep-Alive: timeout=5`). Виміряно: два запити, надіслані підряд в **один сокет**, дали дві відповіді `HTTP/1.1 200`. Новий TCP+TLS — це дорого, тому повторне використання з'єднання — головна оптимізація.

Проблема HTTP/1.1 — **head-of-line blocking**: відповіді йдуть у порядку запитів, повільна блокує наступні. Браузери відкривають ~6 з'єднань на хост.

## 10. Кеш і умовні запити

Перший запит:
```
200 OK
ETag: "5153dbc5"
Cache-Control: max-age=60
```
Другий з `If-None-Match: "5153dbc5"` → **`304 Not Modified`**, тіло `0` байт (виміряно: 200 з тілом 50 байт, потім 304 з 0).

- `Cache-Control: max-age=60` — 60 секунд можна брати з кешу взагалі без запиту.
- `no-cache` — перевіряти на сервері перед використанням, `no-store` — не зберігати зовсім.
- Валідатори: `ETag` (ідентифікатор версії) і `Last-Modified`.

## 11. Cookie

Сервер: `Set-Cookie: sid=abc; HttpOnly; Secure; SameSite=Lax; Path=/` і `Set-Cookie: t=1; Max-Age=60`. Клієнт у наступних запитах: `Cookie: sid=abc`. Виміряно: сервер відповів `c sid=abc`.

Атрибути:
- **HttpOnly** — недоступна з `document.cookie` (захист від викрадення через XSS).
- **Secure** — надсилається лише по HTTPS.
- **SameSite** (`Strict`/`Lax`/`None`) — обмежує міжсайтові запити (захист від CSRF).
- **Max-Age / Expires**, **Path**, **Domain**.

## 12. Стиснення та діапазони

- `Content-Encoding: gzip`: виміряно 50 байт тексту → 36 байт на дроті, після розпакування знову 50.
- `Range: bytes=0-4` → **`206 Partial Content`** з `Content-Range: bytes 0-4/50`, тіло `"hello"`. Так працюють докачування й перемотування відео.

## 13. Проблема HTTP: усе відкрито

Виміряно: прокси між клієнтом і сервером бачить на дроті
```
POST /method HTTP/1.1\r\nAuthorization: Bearer secret123\r\nHost…
```
Тобто **токен, пароль, cookie, тіло** — у відкритому тексті. Будь-хто на шляху (Wi-Fi, провайдер, проміжний вузол) може:
1. **Підслухати** (sniffing).
2. **Підмінити** вміст (вставити рекламу, шкідливий код).
3. **Видати себе за сервер** (MITM).

HTTPS закриває всі три проблеми: **конфіденційність**, **цілісність**, **автентичність сервера**.

## 14. TLS

TLS (Transport Layer Security) — наступник SSL. Версії: SSL 2/3 і TLS 1.0/1.1 **застарілі й заборонені**; використовують **TLS 1.2** і **TLS 1.3**.

### Рукостискання TLS 1.3 (спрощено)
1. **ClientHello**: версії, набори шифрів, випадкове число, **ключова частка** (ECDHE), SNI (ім'я хоста), ALPN (`h2`, `http/1.1`).
2. **ServerHello**: обраний шифр, його ключова частка. Далі все зашифровано.
3. Сервер надсилає **сертифікат** і підпис (**CertificateVerify**), потім **Finished**.
4. Клієнт перевіряє сертифікат і надсилає **Finished**.
5. Обидві сторони з ECDHE-секрету виводять **симетричні ключі** й шифрують дані (AEAD, наприклад AES-GCM).

У виводі curl видно саме цю послідовність:
```
TLS handshake, Client hello (1)
TLS handshake, Server hello (2)
TLS handshake, Unknown (8)       ← EncryptedExtensions
TLS handshake, Certificate (11)
TLS handshake, CERT verify (15)
TLS handshake, Finished (20)
TLS handshake, Finished (20)
SSL connection using TLSv1.3 / AEAD-AES256-GCM-SHA384
ALPN: server accepted http/1.1
```
Виміряно в Node: `TLSv1.3 TLS_AES_256_GCM_SHA384`, `alpn= http/1.1` (або `h2` для HTTP/2-сервера).

Ключова ідея: **асиметрична криптографія** (сертифікат, обмін ключами) лише на початку, далі швидка **симетрична** (AES-GCM / ChaCha20).

**Forward secrecy**: ключі сесії тимчасові (ECDHE), тож викрадення довгострокового ключа сервера не розшифрує старий записаний трафік.

**Затримка**: TLS 1.3 — 1 RTT (TLS 1.2 — 2 RTT); повторне з'єднання може використати 0-RTT (з ризиком повторної відправки).

### Версії
Виміряно: примусово `maxVersion: 'TLSv1.2'` → `TLSv1.2 ECDHE-RSA-AES128-GCM-SHA256`. Клієнт з `maxVersion: 'TLSv1.1'` отримав `ERR_SSL_NO_PROTOCOLS_AVAILABLE` (сучасний Node локально забороняє TLS < 1.2).

## 15. Сертифікати і довіра

Сертифікат X.509 зв'язує **відкритий ключ** з **іменем** (domain). Підписаний **центром сертифікації (CA)**. Браузер/ОС тримають список довірених кореневих CA. Перевірка:
1. Ланцюжок: сертифікат сайту → проміжний CA → кореневий CA (у списку довірених).
2. **Ім'я** збігається з доменом (поля CN / SAN).
3. Термін дії, не відкликаний (CRL/OCSP).
4. Підпис правильний.

Виміряно із самопідписаним сертифікатом:
- Node: `authorized= false DEPTH_ZERO_SELF_SIGNED_CERT`; `https.get` без опцій впав з `self-signed certificate`.
- Той самий запит з `ca: <наш сертифікат>` → `200`.
- curl без `-k`: код виходу **60** (помилка перевірки сертифіката); з `-k` — працює, але **ніякого захисту від MITM**.
- `subject: CN=localhost`, `issuer: CN=localhost` — суб'єкт і видавець збігаються, отже самопідписаний.

**Let's Encrypt** видає безкоштовні сертифікати за ACME (підтвердження володіння доменом).

## 16. Що саме шифрується в HTTPS

Шифрується **все всередині HTTP**: шлях, query, заголовки, cookie, тіло. Спостерігач на дроті бачить лише: IP-адресу, розмір і час пакетів, ім'я хоста (**SNI**, якщо немає ECH) та DNS-запит (якщо не DoH/DoT). **HTTPS не приховує, з ким ви говорите**, і не робить сайт «безпечним» за змістом: шахрайський сайт теж може мати сертифікат.

## 17. HTTP/1.1, HTTP/2, HTTP/3

| | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Формат | текст | **бінарні кадри** | бінарні кадри |
| Транспорт | TCP | TCP | **QUIC (UDP)** |
| Мультиплексування | ні (6 з'єднань) | **так, потоки в одному з'єднанні** | так |
| Стиснення заголовків | ні | HPACK | QPACK |
| Шифрування | опційно | на практиці лише TLS | TLS 1.3 вбудований |

Виміряно (Node `http2`): ALPN обрав `h2`, три запити `/a`, `/b`, `/c` виконано паралельно **в одному з'єднанні** — `h2 GET /a | h2 GET /b | h2 GET /c`. HTTP/2 вирішує head-of-line blocking на рівні HTTP, але лишає його на рівні TCP; HTTP/3 прибирає і його.

Версія узгоджується в TLS через **ALPN**.

## 18. Безпекові заголовки та HTTPS у реальності

- **HSTS** `Strict-Transport-Security: max-age=31536000; includeSubDomains` — браузер сам вимагатиме HTTPS (захист від «downgrade»).
- **Редірект http → https**: виміряно `301` з `Location: https://localhost:8443/`; перший запит все ще по HTTP, тому потрібен HSTS.
- **Mixed content**: HTTP-ресурс на HTTPS-сторінці блокується.
- **CSP**, `X-Content-Type-Options`, `Referrer-Policy` — інші захисні заголовки.
- Багато веб-API браузера (геолокація, service worker, камера, clipboard) доступні лише в **безпечному контексті** (HTTPS або localhost).

## 19. Типові помилки

1. Передавати паролі/токени по HTTP.
2. Вимикати перевірку сертифіката (`-k`, `rejectUnauthorized: false`) у продакшені.
3. Плутати 401 і 403, 301 і 302.
4. Міняти стан через GET.
5. `Content-Length` у символах замість байтів.
6. Не ставити `Secure`/`HttpOnly`/`SameSite` на сесійній cookie.
7. Забути оновити сертифікат до кінця терміну дії.
8. Змішаний вміст (http-картинки на https-сторінці).
9. Вважати, що HTTPS ховає домен.
10. Не вказувати `Host` / не вказувати SNI на сервері з кількома сайтами.
11. Кешувати відповіді з персональними даними без `private`/`no-store`.
12. Покладатися на «безпечність» сайту лише за замочком.

## 20. Алгоритм

1. Пишеш URL → браузер розбирає схему, хост, порт, шлях.
2. DNS дає IP, TCP встановлює з'єднання.
3. Для `https` — TLS: шифри, сертифікат, ключі; ALPN обирає `h2`/`http/1.1`.
4. Відправляється запит: метод, шлях, заголовки, тіло.
5. Сервер повертає статус, заголовки, тіло.
6. Кеш: `ETag`/`304`, `max-age`.
7. З'єднання лишається для наступних запитів.
8. Для безпеки: тільки HTTPS, HSTS, захищені cookie.

## Задачі для закріплення

33 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Фрагменти з `return` — тіла функцій, відповідь — повернене значення. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Розбір URL на частини.

```js
(() => { const u = new URL('https://user:pw@example.com:8443/a/b?x=1&y=2#top'); return [u.protocol, u.username, u.hostname, u.port, u.pathname, u.search, u.hash, u.origin]; })()
```

**2.** Порти за замовчуванням для `http` та `https` у `URL`.

```js
[new URL('http://a.com:80/').port, new URL('https://a.com:443/').port, new URL('http://a.com/').port, new URL('https://a.com:444/').port]
```

**3.** Що надсилає клієнт: сирий HTTP/1.1-запит і перший рядок відповіді.

```js
const s = await serve((req, res) => { res.setHeader('X-Test', '1'); res.end('hello'); });
const r = await raw(s.port, 'GET /path HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n');
s.close();
return r.split('\r\n').filter(l => !/^(Date|Connection|Keep-Alive)/.test(l));
```

**4.** Що бачить сервер у запиті: метод, шлях, заголовки.

```js
let seen;
const s = await serve((req, res) => { seen = [req.method, req.url, req.headers.host === '127.0.0.1:' + s.port, req.headers['x-custom']]; res.end('ok'); });
await fetch(s.url + '/p?a=1', { method: 'POST', headers: { 'X-Custom': 'v' }, body: 'data' });
s.close();
return seen;
```

**5.** Статуси відповіді: `fetch` не кидає помилку на 404/500.

```js
const s = await serve((req, res) => { res.statusCode = Number(req.url.slice(1)); res.end(); });
const out = [];
for (const c of [200, 201, 204, 301, 404, 500]) { const r = await fetch(s.url + '/' + c, { redirect: 'manual' }); out.push([r.status, r.statusText, r.ok]); }
s.close();
return out;
```

**6.** Перенаправлення 301/302: куди потрапляє клієнт і який метод?

```js
const s = await serve((req, res) => { if (req.url === '/old') { res.statusCode = 302; res.setHeader('Location', '/new'); return res.end(); } res.end(req.method + ' ' + req.url); });
const r = await fetch(s.url + '/old');
const t = await r.text();
s.close();
return [r.redirected, new URL(r.url).pathname, t];
```

**7.** 301/302 після POST: метод змінюється на GET; 307 зберігає.

```js
const s = await serve((req, res) => { if (req.url === '/a') { res.statusCode = 302; res.setHeader('Location', '/t'); return res.end(); } if (req.url === '/b') { res.statusCode = 307; res.setHeader('Location', '/t'); return res.end(); } res.end(req.method); });
const a = await (await fetch(s.url + '/a', { method: 'POST', body: 'x' })).text();
const b = await (await fetch(s.url + '/b', { method: 'POST', body: 'x' })).text();
s.close();
return [a, b];
```

**8.** Заголовки: регістр імен нечутливий.

```js
const s = await serve((req, res) => { res.setHeader('Content-Type', 'text/plain'); res.end('x'); });
const r = await fetch(s.url);
const out = [r.headers.get('content-type'), r.headers.get('CONTENT-TYPE'), r.headers.has('content-length')];
s.close();
return out;
```

**9.** `Content-Type` і `Content-Length` для JSON-відповіді.

```js
const body = JSON.stringify({ ок: true });
const s = await serve((req, res) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(body); });
const r = await fetch(s.url);
const out = [r.headers.get('content-type'), r.headers.get('content-length'), Buffer.byteLength(body), await r.json()];
s.close();
return out;
```

### Рівень 2. Деталі й поведінка

**10.** Методи HTTP: ідемпотентність — що повертає сервер на повторний PUT та POST?

```js
let n = 0, items = [];
const s = await serve((req, res) => { if (req.method === 'POST') items.push(++n); res.end(String(items.length)); });
const out = [];
for (const m of ['POST', 'POST', 'PUT', 'PUT']) out.push(await (await fetch(s.url, { method: m })).text());
s.close();
return out;
```

**11.** Метод `HEAD`: заголовки без тіла.

```js
const s = await serve((req, res) => { res.setHeader('Content-Length', '5'); res.end(req.method === 'HEAD' ? undefined : 'hello'); });
const r = await fetch(s.url, { method: 'HEAD' });
const out = [r.status, r.headers.get('content-length'), (await r.text()).length];
s.close();
return out;
```

**12.** `OPTIONS` та заголовок `Allow`.

```js
const s = await serve((req, res) => { if (req.method === 'OPTIONS') { res.setHeader('Allow', 'GET, POST, OPTIONS'); res.statusCode = 204; return res.end(); } res.end('x'); });
const r = await fetch(s.url, { method: 'OPTIONS' });
const out = [r.status, r.headers.get('allow')];
s.close();
return out;
```

**13.** Кеш: `ETag` та умовний запит `If-None-Match` → 304.

```js
const etag = '"v1"';
const s = await serve((req, res) => { res.setHeader('ETag', etag); if (req.headers['if-none-match'] === etag) { res.statusCode = 304; return res.end(); } res.end('body'); });
const a = await fetch(s.url);
const t = await a.text();
const b = await fetch(s.url, { headers: { 'If-None-Match': a.headers.get('etag') } });
const out = [a.status, t, b.status, (await b.text()).length];
s.close();
return out;
```

**14.** `Cache-Control: max-age` та `no-store` — які значення бачить клієнт?

```js
const s = await serve((req, res) => { res.setHeader('Cache-Control', req.url === '/a' ? 'public, max-age=3600' : 'no-store'); res.end('x'); });
const a = await fetch(s.url + '/a'), b = await fetch(s.url + '/b');
const out = [a.headers.get('cache-control'), b.headers.get('cache-control')];
s.close();
return out;
```

**15.** Cookie: `Set-Cookie` від сервера та надсилання клієнтом.

```js
const s = await serve((req, res) => { if (!req.headers.cookie) { res.setHeader('Set-Cookie', ['sid=abc123; HttpOnly; Path=/', 'theme=dark; Max-Age=60']); return res.end('new'); } res.end('cookie=' + req.headers.cookie); });
const a = await fetch(s.url);
const cookies = a.headers.getSetCookie();
const b = await fetch(s.url, { headers: { Cookie: cookies.map(c => c.split(';')[0]).join('; ') } });
const out = [cookies, await b.text()];
s.close();
return out;
```

**16.** Стиснення: `Accept-Encoding: gzip` та розмір тіла.

```js
const text = 'abc'.repeat(1000);
const s = await serve((req, res) => { if ((req.headers['accept-encoding'] || '').includes('gzip')) { const z = zlib.gzipSync(text); res.setHeader('Content-Encoding', 'gzip'); res.setHeader('Content-Length', z.length); return res.end(z); } res.end(text); });
const r = await fetch(s.url, { headers: { 'Accept-Encoding': 'gzip' } });
const body = await r.text();
const out = [r.headers.get('content-encoding'), body.length, Number(r.headers.get('content-length')) < 100];
s.close();
return out;
```

**17.** Діапазони: `Range` → `206 Partial Content`.

```js
const data = Buffer.from('0123456789');
const s = await serve((req, res) => { const m = /bytes=(\d+)-(\d+)/.exec(req.headers.range || ''); if (m) { const [a, b] = [+m[1], +m[2]]; res.statusCode = 206; res.setHeader('Content-Range', `bytes ${a}-${b}/${data.length}`); return res.end(data.subarray(a, b + 1)); } res.end(data); });
const r = await fetch(s.url, { headers: { Range: 'bytes=2-5' } });
const out = [r.status, r.headers.get('content-range'), await r.text()];
s.close();
return out;
```

**18.** Keep-alive: скільки TCP-з'єднань для трьох послідовних запитів?

```js
let conns = 0;
const s = await serve((req, res) => res.end('x'));
s.s.on('connection', () => conns++);
const agent = new http.Agent({ keepAlive: true });
for (let i = 0; i < 3; i++) await new Promise((ok) => http.get(s.url, { agent }, (r) => { r.resume(); r.on('end', ok); }));
agent.destroy();
const c1 = conns;
conns = 0;
const agent2 = new http.Agent({ keepAlive: false });
for (let i = 0; i < 3; i++) await new Promise((ok) => http.get(s.url, { agent: agent2, headers: { Connection: 'close' } }, (r) => { r.resume(); r.on('end', ok); }));
const out = [c1, conns];
s.close();
return out;
```

### Рівень 3. Нюанси та пастки

**19.** Помилковий запит: сервер Node відповідає 400 на некоректний рядок запиту.

```js
const s = await serve((req, res) => res.end('ok'));
const r = await raw(s.port, 'THIS IS NOT HTTP\r\n\r\n');
s.close();
return r.split('\r\n')[0];
```

**20.** `Host` обов'язковий у HTTP/1.1: що відповідає Node без нього?

```js
const s = await serve((req, res) => res.end('ok'));
const r = await raw(s.port, 'GET / HTTP/1.1\r\nConnection: close\r\n\r\n');
s.close();
return r.split('\r\n')[0];
```

**21.** Chunked-передача: заголовок `Transfer-Encoding` та склеювання частин.

```js
const s = await serve((req, res) => { res.write('part1,'); setTimeout(() => { res.write('part2,'); res.end('end'); }, 5); });
const r = await fetch(s.url);
const out = [r.headers.get('transfer-encoding'), r.headers.get('content-length'), await r.text()];
s.close();
return out;
```

**22.** Тіло POST: `application/json` проти `application/x-www-form-urlencoded`.

```js
let got = [];
const s = await serve((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => { got.push([req.headers['content-type'], b]); res.end(); }); });
await fetch(s.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: 1 }) });
await fetch(s.url, { method: 'POST', body: new URLSearchParams({ a: '1 2', b: 'x&y' }) });
s.close();
return got;
```

**23.** Заголовок `Authorization: Basic` — що це за кодування?

```js
const h = 'Basic ' + Buffer.from('user:pass').toString('base64');
return [h, Buffer.from(h.slice(6), 'base64').toString()];
```

**24.** `Location` і `201 Created`.

```js
const s = await serve((req, res) => { res.statusCode = 201; res.setHeader('Location', '/items/7'); res.end(); });
const r = await fetch(s.url, { method: 'POST' });
const out = [r.status, r.headers.get('location')];
s.close();
return out;
```

**25.** `Retry-After` і код `429`.

```js
const s = await serve((req, res) => { res.statusCode = 429; res.setHeader('Retry-After', '30'); res.end(); });
const r = await fetch(s.url);
const out = [r.status, r.headers.get('retry-after'), r.ok];
s.close();
return out;
```

**26.** Класи кодів статусу.

```js
[100, 200, 301, 404, 503].map(c => ({ 1: 'інформаційні', 2: 'успіх', 3: 'перенаправлення', 4: 'помилка клієнта', 5: 'помилка сервера' }[Math.floor(c / 100)]))
```

**27.** Стандартні тексти статусів у Node.

```js
(() => { const { STATUS_CODES } = process.getBuiltinModule('node:http'); return [200, 201, 204, 301, 304, 400, 401, 403, 404, 418, 500, 502, 503].map(c => c + ' ' + STATUS_CODES[c]); })()
```

### Рівень 4. Практика

**28.** Методи, що вважаються безпечними й ідемпотентними.

```js
({ safe: ['GET', 'HEAD', 'OPTIONS'], idempotent: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'], nonIdempotent: ['POST', 'PATCH'] })
```

**29.** HTTPS-запит до порту, де слухає звичайний HTTP: яка помилка?

```js
const s = await serve((req, res) => res.end('x'));
try { await fetch('https://127.0.0.1:' + s.port); } catch (e) { s.close(); return [e.name, e.cause?.code ?? e.cause?.message]; }
```

**30.** Чим HTTP відрізняється від HTTPS?

**31.** Що відбувається під час TLS-рукостискання?

**32.** Чим HTTP/2 відрізняється від HTTP/1.1?

**33.** Чому `GET` не повинен змінювати стан сервера?

### Відповіді

1. `['https:', 'user', 'example.com', '8443', '/a/b', '?x=1&y=2', '#top', 'https://example.com:8443']`
2. `['', '', '', '444']`
3. `['HTTP/1.1 200 OK', 'X-Test: 1', 'Content-Length: 5', '', 'hello']`
4. `['POST', '/p?a=1', true, 'v']`
5. `[[200, 'OK', true], [201, 'Created', true], [204, 'No Content', true], [301, 'Moved Permanently', false], [404, 'Not Found', false], [500, 'Internal Server Error', false]]`
6. `[true, '/new', 'GET /new']`
7. `['GET', 'POST']`
8. `['text/plain', 'text/plain', true]`
9. `['application/json; charset=utf-8', '13', 13, { 'ок': true }]`
10. `['1', '2', '2', '2']`
11. `[200, '5', 0]`
12. `[204, 'GET, POST, OPTIONS']`
13. `[200, 'body', 304, 0]`
14. `['public, max-age=3600', 'no-store']`
15. `[['sid=abc123; HttpOnly; Path=/', 'theme=dark; Max-Age=60'], 'cookie=sid=abc123; theme=dark']`
16. `['gzip', 3000, true]`
17. `[206, 'bytes 2-5/10', '2345']`
18. `[1, 3]`
19. `'HTTP/1.1 400 Bad Request'`
20. `'HTTP/1.1 400 Bad Request'`
21. `['chunked', null, 'part1,part2,end']`
22. `[['application/json', '{"a":1}'], ['application/x-www-form-urlencoded;charset=UTF-8', 'a=1+2&b=x%26y']]`
23. `['Basic dXNlcjpwYXNz', 'user:pass']`
24. `[201, '/items/7']`
25. `[429, '30', false]`
26. `['інформаційні', 'успіх', 'перенаправлення', 'помилка клієнта', 'помилка сервера']`
27. `['200 OK', '201 Created', '204 No Content', '301 Moved Permanently', '304 Not Modified', '400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found', '418 I'm a Teapot', '500 Internal Server Error', '502 Bad Gateway', '503 Service Unavailable']`
28. `{ safe: ['GET', 'HEAD', 'OPTIONS'], idempotent: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'], nonIdempotent: ['POST', 'PATCH'] }`
29. `['TypeError', 'ERR_SSL_PACKET_LENGTH_TOO_LONG']`
30. HTTPS — це HTTP поверх TLS: трафік шифрується, сервер автентифікується сертифікатом, а цілісність даних захищена від підміни
31. Клієнт і сервер узгоджують версію та шифри, сервер надсилає сертифікат, сторони обчислюють спільний ключ сеансу (ECDHE), далі дані шифруються симетрично
32. Бінарний формат, мультиплексування багатьох запитів в одному з'єднанні, стиснення заголовків (HPACK), серверні push (застаріли); HTTP/3 використовує QUIC поверх UDP
33. Він має бути безпечним: проміжні вузли можуть кешувати, повторювати й попередньо завантажувати `GET`-запити
