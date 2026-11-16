# Адресний рядок браузера: URL, параметри, заголовки, кодування, Fetch і Axios

Нотатка для тих, хто ніколи не працював з цією темою: від «що я пишу в адресному рядку» до «як з коду надіслати запит із заголовками й параметрами та як усе правильно закодувати». Протокол HTTP і HTTPS докладно описано в [http-https.md](../../computer-science/http-https.md), загальну картину мережі — в [internet.md](../../computer-science/internet.md), `fetch` до дрібниць — у [fetch.md](../common/fetch.md); тут — те, що пов'язує їх між собою.

---

## 1. Що таке адресний рядок і URL

**Адресний рядок** — поле угорі вікна браузера. Те, що ви в нього вводите, браузер перетворює на **URL** (*Uniform Resource Locator*, «єдиний локатор ресурсу») — рядок, який однозначно вказує, **де** лежить ресурс і **як** його отримати.

Найпростіша аналогія — поштова адреса:

| Поштова адреса | URL |
|---|---|
| спосіб доставки (кур'єр, пошта) | **схема** — `https` |
| країна, місто, вулиця | **хост** — `example.com` |
| під'їзд | **порт** — `:8080` |
| квартира | **шлях** — `/shop/cart` |
| «передати вкладку з коробкою» | **параметри** — `?id=5&color=red` |
| «відкрити на третій сторінці» | **фрагмент** — `#reviews` |

Що саме робить браузер, коли ви натискаєте Enter:

1. **Вирішує, що ви ввели:** адресу чи пошуковий запит. Текст на кшталт `example.com/page` або `https://…` — це адреса; текст із пробілами чи без крапок (`кіт та пес`) — запит, який передається пошуковій системі як параметр її власного URL.
2. Якщо схему не вказано, **додає її** (`https://` або `http://`).
3. **Розбирає** адресу на частини (розділ 2) і **кодує** небезпечні символи (розділ 8).
4. **Знаходить сервер:** перетворює ім'я хоста на IP-адресу через DNS.
5. **Відкриває з'єднання** (для `https` — із шифруванням TLS) і **надсилає HTTP-запит**, у якому є метод, шлях із параметрами та **заголовки** (розділ 9).
6. **Отримує відповідь** (код статусу, заголовки, тіло), відображає сторінку, а до адресного рядка записує **кінцеву** адресу (після всіх перенаправлень).

Адресний рядок вміє лише одне — надсилати **GET-запит** за адресою. Заголовки, метод `POST` і тіло запиту з нього задати **неможливо**: для цього потрібен код (`fetch`, Axios), форма на сторінці або інструмент на кшталт `curl`.

## 2. Анатомія URL

Повний приклад:

```
https://user:pass@example.com:8080/a/b/index.html?x=1&y=two%20words#section-2
```

| Частина | Значення в прикладі | Правила |
|---|---|---|
| **схема** (scheme, protocol) | `https` | завершується `:`; визначає протокол |
| **userinfo** | `user:pass` | логін і пароль перед `@`; застарілий і небезпечний спосіб, у сучасних браузерах блокується або приховується |
| **хост** (hostname) | `example.com` | ім'я сервера або IP; **регістр не важливий** |
| **порт** | `8080` | необов'язковий; для `http` типовий 80, для `https` — 443 |
| **шлях** (pathname) | `/a/b/index.html` | ієрархія ресурсів, починається з `/`; **регістр важливий** (залежить від сервера) |
| **параметри** (query, search) | `?x=1&y=two%20words` | після `?`, пари `ключ=значення`, розділені `&` |
| **фрагмент** (hash, fragment) | `#section-2` | після `#`; **ніколи не надсилається на сервер** |

Розбір цієї адреси в `new URL(...)`:

| Властивість | Значення |
|---|---|
| `protocol` | `https:` (з двокрапкою) |
| `username` / `password` | `user` / `pass` |
| `host` | `example.com:8080` (хост разом із портом) |
| `hostname` | `example.com` |
| `port` | `8080` (рядок, не число) |
| `origin` | `https://example.com:8080` (схема + хост + порт) |
| `pathname` | `/a/b/index.html` |
| `search` | `?x=1&y=two%20words` (з `?`) |
| `hash` | `#section-2` (з `#`) |
| `href` | повна адреса |

**Origin** (походження) — трійка «схема + хост + порт». Саме за нею браузер вирішує, чи дві сторінки «свої» одна для одної (політика same-origin, розділ 11): `http://localhost:4200` і `http://localhost:4201` мають **різні** origin, бо різні порти.

### 2.1. Що йде на сервер, а що ні

Запит до `https://example.com:8080/a?x=1#top` виглядає для сервера так:

```
GET /a?x=1 HTTP/1.1
Host: example.com:8080
```

Схема визначає, як відкрити з'єднання, хост і порт — куди; на сервер передаються **шлях і параметри**. Фрагмент `#top` залишається в браузері: перевірено, що `fetch('http://localhost:4201/open?a=1#frag')` дійшов на сервер як `/open?a=1`. Тому фрагмент використовують для навігації всередині сторінки (якорі, стан односторінкового застосунку), а не для даних, які потрібні серверу.

### 2.2. Різні схеми

| Схема | Приклад | Для чого |
|---|---|---|
| `http` / `https` | `https://example.com/` | веб |
| `file` | `file:///Users/x/a.txt` | локальний файл |
| `mailto` | `mailto:a@b.com` | відкрити поштовий клієнт |
| `tel` | `tel:+380671234567` | набрати номер |
| `data` | `data:text/plain;base64,SGk=` | дані **всередині** адреси (тут `Hi`) |
| `blob` | `blob:http://localhost:4200/uuid` | тимчасовий URL для файлу в пам'яті (`URL.createObjectURL`) |
| `ws` / `wss` | `wss://example.com/socket` | WebSocket |
| `javascript` | `javascript:alert(1)` | виконати код (небезпечно, не використовувати) |

Для схем без ієрархії (`mailto`, `tel`, `data`, `file`) `new URL(...).origin` дає `'null'`, а `pathname` містить усе після схеми. Для `blob:` origin береться з вмісту: `new URL('blob:https://a.com/uuid').origin` → `https://a.com`. `fetch` у браузері приймає й `data:`, і `blob:` адреси: `fetch('data:text/plain;base64,SGk=')` → текст `Hi`.

### 2.3. Відносні адреси

У HTML і в `fetch` адресу часто записують **коротко**, а браузер добудовує її відносно поточної сторінки (її ще називають **base**). Для бази `https://a.com/b/c/d`:

| Запис | Результат | Правило |
|---|---|---|
| `../x?y=1` | `https://a.com/b/x?y=1` | піднятися на рівень вище від **каталогу** (`/b/c/`) |
| `/root` | `https://a.com/root` | від кореня сайту |
| `//cdn.com/f.js` | `https://cdn.com/f.js` | та сама схема, інший хост |
| `?q=2` (база `https://a.com/p?q=1`) | `https://a.com/p?q=2` | змінити лише параметри |
| `#h` (база `https://a.com/p?q=1`) | `https://a.com/p?q=1#h` | змінити лише фрагмент |

```js
new URL('../x?y=1', 'https://a.com/b/c/d').href
new URL('/no-base')
```

Другий виклик без бази кидає `TypeError: Invalid URL` (`code: 'ERR_INVALID_URL'`). Безпечна перевірка без винятку: `URL.canParse('nonsense')` → `false`, `URL.parse('nonsense')` → `null`.

### 2.4. Нормалізація: що браузер виправляє сам

`new URL(...)` приводить адресу до єдиного вигляду:

| Вхід | Результат |
|---|---|
| `HTTPS://ExAmPle.CoM/Path` | `https://example.com/Path` (схема й хост — малими, шлях — без змін) |
| `https://example.com:443/path` | `https://example.com/path` (типовий порт прибирається) |
| `http://a.com:8080/` | `http://a.com:8080/` (нетиповий порт лишається) |
| `/a/b/../../c/./d` | `/c/d` (крапкові сегменти згортаються) |
| `https://a.com` | `https://a.com/` (порожній шлях стає `/`) |
| `/x` і `/x/` | **різні** адреси: кінцевий слеш має значення |
| `/a b` | `/a%20b` (пробіл кодується) |
| `https://київ.укр/` | хост `xn--b1alf1j.xn--j1amh` (**punycode**) |
| `https://Müller.de` | хост `xn--mller-kva.de` |

**Punycode** — спосіб записати ім'я з не-ASCII літерами латинкою з префіксом `xn--`. У адресному рядку ви бачите `київ.укр`, але DNS отримує `xn--b1alf1j.xn--j1amh`.

## 3. Як читати й змінювати адресу в JavaScript (браузер)

### 3.1. Об'єкт `location`

На сторінці `http://localhost:4200/a/b/page.html?x=1&y=two%20words&x=3#section-2`:

| Вираз | Значення |
|---|---|
| `location.href` | повна адреса |
| `location.origin` | `http://localhost:4200` |
| `location.protocol` | `http:` |
| `location.host` | `localhost:4200` |
| `location.hostname` | `localhost` |
| `location.port` | `4200` |
| `location.pathname` | `/a/b/page.html` |
| `location.search` | `?x=1&y=two%20words&x=3` |
| `location.hash` | `#section-2` |
| `document.baseURI` | поточна адреса сторінки (база для відносних URL) |
| `document.referrer` | адреса сторінки, з якої прийшли (порожній рядок, якщо відкрили напряму) |

Параметри з адресного рядка: `Object.fromEntries(new URLSearchParams(location.search))` → `{ x: '3', y: 'two words' }` (повторний ключ `x` перезаписується останнім значенням; щоб зберегти всі — `getAll('x')`).

### 3.2. Перехід на іншу адресу

| Дія | Що відбувається |
|---|---|
| `location.href = '/other'` або `location.assign('/other')` | перехід із записом в історію, сторінка перезавантажується |
| `location.replace('/other')` | перехід **без** запису в історію (кнопка «Назад» не повертає) |
| `location.reload()` | перезавантажити |
| `location.hash = 'top'` | змінює лише фрагмент: **без** перезавантаження, додає запис в історію |

### 3.3. History API: змінити адресу без перезавантаження

Односторінкові застосунки (React, Vue) змінюють адресний рядок, не завантажуючи сторінку наново:

```js
history.pushState({ a: 1 }, '', '/pushed/path?z=9#h')
history.replaceState(null, '', '?replaced=1')
```

| Метод | Дія |
|---|---|
| `pushState(state, '', url)` | додає запис в історію й змінює адресу; запит на сервер **не** надсилається |
| `replaceState(state, '', url)` | змінює адресу в поточному записі |
| `history.state` | об'єкт стану, переданий у `pushState` (`{ a: 1 }`) |
| подія `popstate` | спрацьовує при «Назад»/«Вперед» |

Адреса в `pushState` має бути того ж origin, що й сторінка. Спробувавши перекинути на чужий домен, отримаєте `SecurityError`.

## 4. Клас `URL`: розбір і побудова адрес

`URL` працює однаково в браузері й у Node.js.

```js
const u = new URL('https://api.example.com/search')
u.searchParams.set('q', 'a b/ü?')
u.searchParams.set('lang', 'uk')
u.href
```

→ `https://api.example.com/search?q=a+b%2F%C3%BC%3F&lang=uk`. Усе закодовано автоматично.

Властивості можна **змінювати**, і `href` перебудується:

| Присвоєння | Результат у `href` |
|---|---|
| `u.pathname = '/привіт мир'` | `/%D0%BF%D1%80%D0%B8%D0%B2%D1%96%D1%82%20%D0%BC%D0%B8%D1%80` |
| `u.hash = 'top'` | додає `#top` |
| `u.protocol = 'https'` для `http://a.com` | `https://a.com/` |
| `u.port = '443'` для `https://a.com` | `https://a.com/` (типовий порт зникає) |

`origin` — лише для читання: `u.origin = 'z'` кидає `TypeError: Cannot set property origin of [object URL] which has only a getter`.

Інші корисні факти:
- `String(u)` і `JSON.stringify(u)` дають `href`; `u.toJSON()` — те саме.
- Порт — **рядок**: `typeof new URL('https://a.com:8080').port` → `'string'`.
- IPv6: `new URL('http://[::1]:3000/x').host` → `[::1]:3000`.
- Порожній знак питання зберігається: `new URL('https://a.com/?').href` → `https://a.com/?`, але `search` порожній.
- Фрагмент не потрапляє в параметри: `new URL('https://a.com/?a=1#b=2').searchParams.get('b')` → `null`.

## 5. Параметри запиту (query string)

**Параметри** передають серверові додаткові дані в самій адресі: пошуковий рядок, номер сторінки, фільтри.

```
https://shop.com/search?q=phone&page=2&sort=price
```

Правила запису:
- починаються після першого `?`;
- кожна пара — `ключ=значення`;
- пари розділяються `&`;
- спеціальні символи в ключах і значеннях **кодуються** (розділ 8);
- ключ може повторюватись: `?tag=a&tag=b`;
- ключ без значення (`?debug`) — допустимий; значення порожнє.

### 5.1. `URLSearchParams`

```js
const sp = new URLSearchParams({ q: 'кіт & пес', page: 2 })
sp.toString()
```

→ `q=%D0%BA%D1%96%D1%82+%26+%D0%BF%D0%B5%D1%81&page=2`.

| Метод | Що робить | Приклад → результат |
|---|---|---|
| `new URLSearchParams('?a=1&b=2')` | з рядка (початковий `?` необов'язковий) | пари `a=1`, `b=2` |
| `new URLSearchParams({ a: 1 })` | з об'єкта | `a=1` |
| `new URLSearchParams([['a','1'],['a','2']])` | з масиву пар | `a=1&a=2` |
| `.get('x')` | **перше** значення ключа або `null` | `'1'` |
| `.getAll('x')` | усі значення | `['1', '3']` |
| `.has('y')` | чи є ключ | `true` / `false` |
| `.append('tag', 'a')` | **додає** пару (не замінює) | `tag=a&tag=b` |
| `.set('a', '9')` | **замінює** всі `a` одним значенням | `a=9` |
| `.delete('b')` | видаляє ключ | — |
| `.sort()` | сортує за ключами | `b=2&a=1` → `a=1&b=2` |
| `.size` | кількість пар | `3` |
| `.toString()` | рядок для адреси | `a=1&b=2` |
| `[...sp]`, `sp.entries()`, `.keys()`, `.values()`, `.forEach()` | перебір | `[['x','1'],['y','two words'],['x','3']]` |

Особливості, які дивують:
- Усі значення — **рядки**; число `2` стає `'2'`.
- Масив у конструкторі-об'єкті **склеюється через кому**: `new URLSearchParams({ a: [1, 2] }).toString()` → `a=1%2C2` (тобто `a=1,2`), а не `a=1&a=2`. Для кількох значень — кілька `append`.
- Пробіл записується як **`+`**: `new URLSearchParams('q=a+b%20c').get('q')` → `a b c` (обидва варіанти читаються як пробіл).
- `Object.fromEntries(new URLSearchParams('?a=1&b=2&a=3'))` → `{ a: '3', b: '2' }`: повторні ключі втрачаються.

### 5.2. Як передавати масиви й об'єкти

Стандарту немає — домовляються з сервером. Поширені варіанти:

| Формат | Приклад |
|---|---|
| повтор ключа | `tag=a&tag=b` |
| ключ із `[]` | `tag[]=a&tag[]=b` |
| ключ з індексами | `tag[0]=a&tag[1]=b` |
| через кому | `tag=a,b` |
| вкладений об'єкт | `o[x]=1` |
| JSON у значенні | `filter=%7B%22a%22%3A1%7D` |

### 5.3. Обмеження

Довжина адреси залежить від браузера, сервера та проміжних проксі, тому довгі дані (великі фільтри, тексти) передають **в тілі запиту**. Параметри видно в історії браузера, журналах сервера й заголовку `Referer`, тож паролі й токени в адресі не передають.

## 6. Як побудувати адресу з параметрами правильно

Три способи, від найкращого:

```js
const url = new URL('/json', 'http://localhost:4100')
url.searchParams.set('q', 'кіт & пес')
url.searchParams.append('t', 'a')
url.searchParams.append('t', 'b')
fetch(url)
```

На сервер піде `/json?q=%D0%BA%D1%96%D1%82+%26+%D0%BF%D0%B5%D1%81&t=a&t=b`.

Другий спосіб — кодувати кожне значення вручну:

```js
fetch(`${base}/json?q=${encodeURIComponent('a&b')}`)
```

→ на сервері `/json?q=a%26b`.

**Небезпечний** спосіб — підстановка без кодування:

```js
fetch(`${base}/json?q=${'a&b'}`)
```

→ на сервер приходить `/json?q=a&b`: сервер бачить **два** параметри — `q=a` і `b=`. Це не лише помилка, а й вектор атак: користувач може підсунути `&role=admin` в одне з полів. Правило: **у шаблонних рядках кожне значення — через `encodeURIComponent`, або одразу `URL`/`URLSearchParams`**.

## 7. Фрагмент і односторінкові застосунки

Фрагмент (`#...`) не надсилається на сервер, тому:
- `#section-2` — якір: браузер прокручує до елемента з `id="section-2"`;
- у старих односторінкових застосунках `#/route` слугував маршрутом;
- токени з OAuth-перенаправлень інколи повертаються у фрагменті, щоб не потрапити в журнали сервера.

Прочитати: `location.hash`; відреагувати на зміну: подія `hashchange`. Параметри у фрагменті розбирають вручну: `new URLSearchParams(location.hash.slice(1))`.

## 8. Кодування в адресі (percent-encoding)

### 8.1. Навіщо

URL може містити **лише обмежений набір ASCII-символів**. Кодування потрібне, щоб:

1. **Передати символи, яких немає в наборі:** кирилицю, умлаути, ієрогліфи, емодзі.
2. **Відрізнити дані від синтаксису:** символи `/ ? # & = + :` мають спеціальний сенс в адресі. Якщо вони — частина значення, їх треба «екранувати», інакше `q=a&b` розпадеться на два параметри.
3. **Не ламати адресу пробілами, лапками та переносами рядка**, які не можуть стояти в рядку запиту HTTP.

### 8.2. Як працює

Алгоритм **percent-encoding** (відсоткове кодування):

1. Символ перетворюється на байти за **UTF-8**.
2. Кожен байт записується як `%` + два шістнадцяткові знаки.

| Символ | Байти UTF-8 | Закодовано |
|---|---|---|
| пробіл | 20 | `%20` |
| `&` | 26 | `%26` |
| `П` | D0 9F | `%D0%9F` |
| `€` | E2 82 AC | `%E2%82%AC` |
| `😀` | F0 9F 98 80 | `%F0%9F%98%80` |

Скільки байтів займає символ у UTF-8: `a` — 1, `П` — 2, `€` — 3, `😀` — 4. Тому слово `Привіт` (6 літер) у адресі займає 36 символів: `%D0%9F%D1%80%D0%B8%D0%B2%D1%96%D1%82`. Декодування — зворотна дія: `decodeURIComponent('%D0%9F%D1%80%D0%B8%D0%B2%D1%96%D1%82')` → `Привіт`.

Браузер у адресному рядку **показує** декодований вигляд (`https://uk.wikipedia.org/wiki/Київ`), хоча по мережі йде закодований (`decodeURI('https://uk.wikipedia.org/wiki/%D0%9A%D0%B8%D1%97%D0%B2')` → `https://uk.wikipedia.org/wiki/Київ`).

### 8.3. Які символи які

| Група | Символи | Поводження |
|---|---|---|
| **Незарезервовані** (unreserved) | літери `A–Z a–z`, цифри `0–9`, `-` `.` `_` `~` | передаються як є |
| **Зарезервовані** (reserved) | `: / ? # [ ] @ ! $ & ' ( ) * + , ; =` | мають спеціальний сенс; у даних їх кодують |
| **Усе інше** | пробіл, `"` `<` `>` `\` `^` `` ` `` `{` `|` `}`, `%`, не-ASCII | завжди кодується |

Символ `%` сам теж кодується як `%25`, бо інакше `%20` у даних не відрізнити від кодування пробілу.

### 8.4. Три функції JavaScript

Виміряно на всіх 95 друкованих ASCII-символах, які функції **залишають без змін**:

| Функція | Лишає як є |
|---|---|
| `encodeURIComponent` | `A–Z a–z 0–9 - _ . ! ~ * ' ( )` |
| `encodeURI` | те саме **плюс** `; , / ? : @ & = + $ #` |
| `escape` (застаріла) | не використовувати: кирилицю кодує як `%u041F` |

Різниця в призначенні:

| | `encodeURI` | `encodeURIComponent` |
|---|---|---|
| для чого | **цілу адресу** | **одне значення** (параметр, сегмент шляху) |
| `/ ? # & = + :` | не чіпає (це синтаксис адреси) | кодує (`%2F %3F %23 %26 %3D %2B %3A`) |
| приклад | `encodeURI('https://a.com/a b?x=1&y=2')` → `https://a.com/a%20b?x=1&y=2` | `encodeURIComponent('https://a.com/a b?x=1&y=2')` → `https%3A%2F%2Fa.com%2Fa%20b%3Fx%3D1%26y%3D2` |

Правило: **`encodeURIComponent` — для частин, `encodeURI` — майже ніколи**. Кодувати треба **кожне значення окремо** до складання адреси, а не готову адресу цілком (інакше `?`, `&` і `=` теж закодуються й адреса перестане працювати).

Зворотні функції `decodeURI` та `decodeURIComponent`. Відмінність: `decodeURI('%2F%3F%23%26')` залишає `%2F%3F%23%26` (зарезервовані не розкодовує), а `decodeURIComponent('%2F%3F%23%26')` дає `/?#&`.

### 8.5. Пробіл: `%20` чи `+`

| Контекст | Пробіл записується |
|---|---|
| шлях, `encodeURIComponent` | `%20` |
| параметри через `URLSearchParams` (формат `application/x-www-form-urlencoded`) | `+` |

`decodeURIComponent('a+b%20c')` → `a+b c`: **плюс не перетворюється на пробіл** — це робить лише `URLSearchParams`. Звідси типова помилка: `+` у значенні, закодованому `encodeURIComponent`, стає `%2B`, а не `+`.

Ще одна відмінність форм-кодування: `new URLSearchParams({ q: "a b!'()*~" }).toString()` → `q=a+b%21%27%28%29*%7E`. Воно залишає `*`, але кодує `! ' ( ) ~`, тоді як `encodeURIComponent` — навпаки.

### 8.6. Що кодує `URL` автоматично

| Частина | Приклад | Результат |
|---|---|---|
| шлях | `new URL('https://a.com/a b').pathname` | `/a%20b` |
| шлях | `new URL('https://a.com/ü').pathname` | `/%C3%BC` |
| параметри | `new URL('https://a.com/?q=ü ').search` | `?q=%C3%BC%20` |
| фрагмент | `new URL('https://a.com/#ü b').hash` | `#%C3%BC%20b` |

Але `URL` **не чіпає** деякі символи, дозволені специфікацією: `'`, `|`, `[`, `]` у шляху (`/a'b`, `/a|b`, `/a[b]` лишаються), і не змінює регістр у вже закодованому (`%c3%bc` лишається малими). Не розділяє: `new URL('https://a.com/' + 'a/b').pathname` → `/a/b` (два сегменти), а `new URL('https://a.com/' + encodeURIComponent('a/b')).pathname` → `/a%2Fb` (один сегмент із літеральним слешем).

### 8.7. Помилки кодування

| Ситуація | Що відбувається |
|---|---|
| `decodeURIComponent('%')` або `'%E0%A4%A'` | `URIError: URI malformed` |
| `encodeURIComponent('\uD800')` (непарний сурогат) | `URIError: URI malformed` |
| `encodeURIComponent(encodeURIComponent('a b'))` | `a%2520b` — **подвійне кодування**: `%` став `%25` |
| `decodeURIComponent(decodeURIComponent('a%2520b'))` | `a b` — щоб повернути, декодувати двічі |

Подвійне кодування з'являється, коли значення закодували вручну, а потім передали в `URLSearchParams`/`URL`/Axios, які закодують його ще раз. Правило: **кодувати рівно один раз** — або вручну, або через API.

Для користувацького вводу декодування обгортають у `try/catch`, бо зловмисник може надіслати некоректну послідовність.

### 8.8. Base64 в адресі

Звичайний Base64 містить `+`, `/` і `=`, які в адресі мають спеціальний сенс. `Buffer.from('hello?>').toString('base64')` → `aGVsbG8/Pg==`; закодовано для адреси: `aGVsbG8%2FPg%3D%3D`. Варіант **base64url** замінює `+` на `-`, `/` на `_` і прибирає `=`: `Buffer.from('hello?>').toString('base64url')` → `aGVsbG8_Pg`. Токени JWT записані саме так.

### 8.9. Кодування не є захистом

Percent-encoding — спосіб **передати** дані, а не сховати їх: будь-хто декодує рядок. Не плутайте його з шифруванням (HTTPS) і з екрануванням для HTML чи SQL.

## 9. Заголовки HTTP-запиту

### 9.1. Що це

Запит складається з **рядка запиту**, **заголовків** і необов'язкового **тіла**:

```
POST /api/users?id=7 HTTP/1.1
Host: example.com
Content-Type: application/json
Authorization: Bearer abc123
Accept: application/json

{"name":"Ann"}
```

**Заголовок** — пара `Ім'я: значення` з метаданими: хто питає, що вміє розуміти, у якому форматі надсилає дані, чи має право. Імена **не залежать від регістру** (`Content-Type` = `content-type`).

### 9.2. Що браузер додає сам

Із запису запиту з браузера до іншого origin (перевірено на реальному запиті):

| Заголовок | Приклад | Сенс |
|---|---|---|
| `Host` | `localhost:4201` | до якого сайту звертаємось |
| `User-Agent` | рядок браузера | хто питає |
| `Accept` | `*/*` | які типи відповіді підходять |
| `Accept-Language` | `en-US` | мови інтерфейсу користувача |
| `Origin` | `http://localhost:4200` | звідки надіслано сторінку (для CORS-запитів) |
| `Referer` | `http://localhost:4200/` | з якої сторінки перейшли; за замовчуванням лише origin, **без шляху й параметрів** |
| `Sec-Fetch-Mode` | `cors` | режим запиту |
| `Sec-Fetch-Site` | `same-site` | співвідношення origin сторінки й цілі |
| `Cookie` | `a=1` | cookie цього домену |

Заголовки з префіксом `Sec-` і `Proxy-` скрипт змінювати не може.

### 9.3. Заборонені заголовки

Браузер сам керує частиною заголовків, і скрипт їх **не може задати**: `Host`, `Cookie`, `Origin`, `Referer`, `Content-Length`, `Accept-Encoding`, `Connection` та деякі інші. Спроба задати `Referer` у `fetch` ігнорується: на сервер усе одно приходить `http://localhost:4200/`. Для керування `Referer` є опція `referrerPolicy` (`'no-referrer'` — заголовка не буде).

Значення заголовка мають складатися лише з символів ISO-8859-1 (Latin-1):
- у браузері `{ 'X-N': 'Привіт' }` → `TypeError: … String contains non ISO-8859-1 code point`;
- у Node: `TypeError: Cannot convert argument to a ByteString because the character at index 0 has a value of 1055 which is greater than 255`;
- значення з переносом рядка — `TypeError: Headers.append: "a\nb" is an invalid header value`.

Нелатинські дані в заголовок кладуть закодованими: `encodeURIComponent('Привіт')`.

### 9.4. Часті заголовки запиту

| Заголовок | Приклад | Для чого |
|---|---|---|
| `Content-Type` | `application/json` | формат тіла запиту |
| `Accept` | `application/json` | який формат відповіді очікуємо |
| `Authorization` | `Bearer <токен>` або `Basic dTpw` | облікові дані |
| `X-Token`, `X-Request-Id` | довільне | власні (кастомні) заголовки |
| `Cache-Control` | `no-cache` | керування кешем |
| `If-None-Match` | `"etag"` | умовний запит |
| `Accept-Language` | `uk` | мова відповіді |
| `User-Agent` | `my-app/1.0` | ім'я клієнта (у Node задається вільно) |

`Authorization: Basic …` — це Base64 від `логін:пароль` (`u:p` → `dTpw`), а не шифрування: передавайте його лише через HTTPS.

### 9.5. Заголовки відповіді

| Заголовок | Приклад |
|---|---|
| `Content-Type` | `text/plain; charset=utf-8` |
| `Set-Cookie` | `a=1; HttpOnly` |
| `Location` | `/json?from=redirect` (у перенаправленні) |
| `Cache-Control`, `ETag` | кеш |
| `Access-Control-Allow-Origin` | дозвіл CORS (розділ 11) |
| довільні | `x-custom: hello` |

Кілька значень одного заголовка JavaScript склеює через `, `: `x-multi: a, b`. Виняток — `Set-Cookie`, значення якого містять коми й тому не склеюються: `response.headers.getSetCookie()` → `['a=1; HttpOnly', 'b=2']`.

### 9.6. Об'єкт `Headers`

```js
const h = new Headers({ 'Content-Type': 'text/plain' })
h.append('X-Multi', 'a')
h.append('x-multi', 'b')
h.set('Authorization', 'Bearer t')
```

| Виклик | Результат |
|---|---|
| `h.get('content-type')` | `text/plain` (регістр не важливий) |
| `h.get('X-MULTI')` | `a, b` |
| `h.has('authorization')` | `true` |
| `h.delete('authorization')` | видаляє |
| `[...h]` | пари, **імена в нижньому регістрі та відсортовані** за алфавітом |

Задавати заголовки в `fetch` можна трьома рівнозначними способами: простий об'єкт `{ 'X-Token': 'abc' }`, масив пар `[['X-B','1'],['X-C','2']]`, об'єкт `Headers`. Ім'я з різним регістром зливається: `new Headers([['X-A','1'],['x-a','2']])` дає `X-A: 1, 2`.

## 10. Fetch у браузері

`fetch(url, options)` повертає **проміс із об'єктом `Response`**. Докладно — у [fetch.md](../common/fetch.md); тут — практична основа.

### 10.1. Найпростіший запит

```js
const res = await fetch('/api/users?id=7')
const data = await res.json()
```

Два `await`, бо спершу приходять **заголовки відповіді**, а потім читається **тіло**.

### 10.2. Об'єкт `Response`

| Поле / метод | Що дає |
|---|---|
| `res.status` | числовий код (200, 404, 500) |
| `res.ok` | `true` для 200–299 |
| `res.statusText` | текст (`OK`) |
| `res.url` | кінцева адреса після перенаправлень |
| `res.redirected` | чи було перенаправлення |
| `res.type` | `basic`, `cors`, `opaque` (розділ 11) |
| `res.headers` | об'єкт `Headers` |
| `res.json()`, `res.text()`, `res.blob()`, `res.arrayBuffer()`, `res.formData()` | прочитати тіло (**лише один раз**) |
| `res.clone()` | копія, щоб прочитати тіло двічі |

Читання вдруге — `TypeError: Body is unusable: Body has already been read`. `res.json()` для не-JSON тексту — `SyntaxError: Unexpected token 'p', "plain text" is not valid JSON`.

### 10.3. Головна пастка: HTTP-помилки не відхиляють проміс

| Ситуація | Поведінка |
|---|---|
| сервер відповів 404 або 500 | проміс **виконується**, `res.ok === false`, `res.status === 404` |
| немає мережі, не знайдено хост, обрив, блокування CORS | проміс **відхиляється** з `TypeError: Failed to fetch` |

Тому перевірка статусу — обов'язкова:

```js
const res = await fetch(url)
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()
```

### 10.4. Метод, заголовки й тіло

```js
const res = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc123' },
  body: JSON.stringify({ name: 'Ann', n: 1 }),
})
```

| Опція | Значення |
|---|---|
| `method` | `'GET'` (за замовчуванням), `'POST'`, `'PUT'`, `'PATCH'`, `'DELETE'` |
| `headers` | заголовки (розділ 9.6) |
| `body` | рядок, `URLSearchParams`, `FormData`, `Blob`, `ArrayBuffer`, потік |
| `signal` | `AbortSignal` для скасування |
| `redirect` | `'follow'` (за замовчуванням), `'manual'`, `'error'` |
| `credentials` | `'same-origin'` (за замовчуванням), `'include'`, `'omit'` |
| `mode` | `'cors'` (за замовчуванням), `'no-cors'`, `'same-origin'` |
| `cache` | `'default'`, `'no-store'`, `'reload'`… |
| `referrerPolicy` | `'no-referrer'`, `'strict-origin-when-cross-origin'`… |

Для `GET` і `HEAD` тіло **заборонене**: `TypeError: Request with GET/HEAD method cannot have body`.

### 10.5. `Content-Type` від типу тіла

Якщо заголовок не задано, `fetch` ставить його сам залежно від тіла:

| Тіло | Автоматичний `Content-Type` |
|---|---|
| рядок | `text/plain;charset=UTF-8` |
| `URLSearchParams` | `application/x-www-form-urlencoded;charset=UTF-8` |
| `FormData` | `multipart/form-data; boundary=…` (межа генерується) |
| `Blob` із типом | цей тип, наприклад `image/png` |
| об'єкт `{...}` | **не** підходить: потрібен `JSON.stringify`, інакше надішлеться `[object Object]` |

Пастка JSON: `body: JSON.stringify(obj)` без `Content-Type: application/json` йде як `text/plain`, і сервер може не розпарсити тіло. Для `FormData` заголовок **не задають вручну**, бо загубиться `boundary`.

### 10.6. Форми

```js
await fetch('/login', { method: 'POST', body: new URLSearchParams({ q: 'кіт', x: 'a b' }) })
```

На сервер піде тіло `q=%D0%BA%D1%96%D1%82&x=a+b` — те саме кодування, що й в адресі (розділ 8). Для файлів — `FormData`:

```js
const fd = new FormData()
fd.append('name', 'Ann')
fd.append('file', new Blob(['hi']), 'a.txt')
await fetch('/upload', { method: 'POST', body: fd })
```

### 10.7. Перенаправлення

Сервер може відповісти `302` із `Location`. За замовчуванням `fetch` іде за ним: `res.status` — 200, `res.redirected` — `true`, `res.url` — кінцева адреса. З `redirect: 'manual'` отримаємо саму відповідь 302 і `Location`; з `redirect: 'error'` — помилку.

### 10.8. Скасування й таймаут

```js
const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
```

За таймаутом проміс відхиляється з `TimeoutError` («The operation was aborted due to timeout»). Ручне скасування: `AbortController` → `controller.abort()` → `AbortError`. `fetch` не має вбудованого таймауту, тому його задають через `signal`.

### 10.9. Паралельні запити

```js
const [a, b] = await Promise.all([fetch('/json?n=1').then(r => r.json()), fetch('/json?n=2').then(r => r.json())])
```

### 10.10. Cookie

За замовчуванням (`credentials: 'same-origin'`) cookie надсилаються лише на **той самий origin**. Для іншого origin потрібен `credentials: 'include'`, а сервер повинен відповісти `Access-Control-Allow-Credentials: true` і **конкретним** `Access-Control-Allow-Origin` (не `*`). Перевірено: `credentials: 'include'` проти відповіді з `Access-Control-Allow-Origin: *` дає `TypeError: Failed to fetch`.

## 11. Політика одного походження і CORS

Скрипт на `http://localhost:4200` може вільно ходити **лише на свій origin**. До чужого origin браузер надсилає запит, але **не віддає відповідь скриптові**, якщо сервер явно не дозволив. Це захист користувача: інакше шкідлива сторінка могла б читати вашу пошту, використовуючи ваші cookie.

### 11.1. Простий запит

Простий запит (метод GET/HEAD/POST, лише «безпечні» заголовки, `Content-Type` один з `text/plain`, `application/x-www-form-urlencoded`, `multipart/form-data`) надсилається одразу. Браузер додає `Origin`. Перевірено на сервері, що **запит доходить**, навіть коли відповідь без дозволу:

| Відповідь сервера | Що бачить скрипт |
|---|---|
| без `Access-Control-Allow-Origin` | `TypeError: Failed to fetch`; сервер запит отримав і виконав |
| `Access-Control-Allow-Origin: *` | відповідь доступна (`res.type === 'cors'`) |
| `Access-Control-Allow-Origin: http://localhost:4200` | доступна лише з цього origin |

### 11.2. Preflight

Для «непростого» запиту браузер **спершу** надсилає службовий запит `OPTIONS` (**preflight**) і питає дозволу:

```
OPTIONS /allow HTTP/1.1
Origin: http://localhost:4200
Access-Control-Request-Method: GET
Access-Control-Request-Headers: x-token
```

Непростими є запити з: методами `PUT`, `PATCH`, `DELETE`; власними заголовками (`X-Token`); `Content-Type: application/json`. Перевірено:

| Запит | Preflight |
|---|---|
| GET із заголовком `X-Token` | є: `Access-Control-Request-Headers: x-token` |
| POST із `Content-Type: text/plain` | немає |
| POST із `URLSearchParams` (форма) | немає |
| PUT | є: `Access-Control-Request-Method: PUT` |

Сервер має відповісти заголовками:

| Заголовок відповіді | Сенс |
|---|---|
| `Access-Control-Allow-Origin` | кому дозволено |
| `Access-Control-Allow-Methods` | які методи |
| `Access-Control-Allow-Headers` | які заголовки |
| `Access-Control-Max-Age` | скільки секунд кешувати дозвіл (браузер не повторює preflight) |
| `Access-Control-Expose-Headers` | які заголовки відповіді **видимі** скриптові |

Без `Access-Control-Allow-Headers: x-token` запит із цим заголовком завершується `TypeError: Failed to fetch`, а сам основний запит **не надсилається**.

### 11.3. Які заголовки відповіді доступні

За замовчуванням скрипт бачить лише «безпечні» заголовки відповіді (`content-type`, `content-length` тощо). Перевірено: сервер надіслав `x-secret` і `x-shown`; `Access-Control-Expose-Headers: x-shown` зробив видимим лише другий — `res.headers.get('x-secret')` → `null`.

### 11.4. `mode: 'no-cors'`

Дозволяє надіслати запит без дозволу сервера, але відповідь **непрозора**: `res.type === 'opaque'`, `res.status === 0`, `res.ok === false`, тіло прочитати не можна. Заголовок `Origin` не додається. Корисно хіба що для «стріляй і забудь» (трекінг). CORS — **захист браузера**, а не сервера: `curl` і Node його не відчувають.

### 11.5. XMLHttpRequest

Старіший спосіб: `x = new XMLHttpRequest(); x.open('GET', url); x.setRequestHeader('X-Token', 'q'); x.send()`. Політика CORS та сама: той самий запит із `X-Token` до сервера без дозволу завершується `onerror`, а на сервері видно лише `OPTIONS`.

## 12. Fetch у Node.js

`fetch` вбудований у Node.js починаючи з версії 18 (рушій undici), без імпортів. API той самий, що й у браузері, відмінності — у середовищі.

### 12.1. Що інакше

| Тема | Браузер | Node.js |
|---|---|---|
| CORS, `Origin`, cookie-jar | є | **немає**: можна звертатись куди завгодно |
| Відносні адреси (`fetch('/api')`) | працюють (від поточної сторінки) | **не працюють**: `TypeError: Failed to parse URL from nonsense` (`cause.code` = `ERR_INVALID_URL`); потрібна абсолютна адреса |
| Заголовки за замовчуванням | `User-Agent` браузера, `Accept-Language`, `Origin`, `Referer`… | мінімальні (нижче) |
| `Host` | заборонений для зміни | змінити не вдалося: сервер бачить `localhost:4100`, а не підсунуте значення |
| Заголовок із Latin-1 (`ü`) | дозволено | дозволено; з кирилицею — `TypeError` |

Заголовки, які надіслав Node без жодних налаштувань:

| Заголовок | Значення |
|---|---|
| `host` | `localhost:4100` |
| `connection` | `keep-alive` |
| `accept` | `*/*` |
| `accept-language` | `*` |
| `sec-fetch-mode` | `cors` |
| `user-agent` | `node` |
| `accept-encoding` | `gzip, deflate` |

### 12.2. Приклади

Усе, що в розділі 10, працює так само. Зокрема:

```js
const url = new URL('/json', 'http://localhost:4100')
url.searchParams.set('q', 'кіт & пес')
const res = await fetch(url, { headers: { 'X-Token': 'abc' } })
const data = await res.json()
```

Відповідь: статус 200, `res.ok` `true`, `res.statusText` `OK`. Типи помилок:

| Ситуація | Помилка |
|---|---|
| сервер недоступний | `TypeError: fetch failed`, причина в `error.cause` (`ECONNREFUSED`) |
| недійсна адреса | `TypeError: Failed to parse URL from …` |
| `redirect: 'error'` і перенаправлення | `TypeError: fetch failed` |
| таймаут (`AbortSignal.timeout(300)`) | `TimeoutError: The operation was aborted due to timeout` |
| `controller.abort()` | `AbortError: This operation was aborted` |
| статус 404/500 | **не помилка**; перевіряйте `res.ok` |

Заголовки відповіді в Node: `res.headers.get('x-custom')` → `hello`, `res.headers.getSetCookie()` → `['a=1; HttpOnly', 'b=2']`.

## 13. Axios

**Axios** — популярна бібліотека для HTTP-запитів. Працює в браузері (через `XMLHttpRequest` або `fetch`) і в Node.js (через `http`/`https`), має єдиний API в обох середовищах.

```bash
npm i axios
```

```js
import axios from 'axios'
```

### 13.1. Чим відрізняється від `fetch`

| Можливість | `fetch` | Axios |
|---|---|---|
| Розбір JSON | вручну: `await res.json()` | автоматично: `res.data` — вже об'єкт |
| Тіло-об'єкт | `JSON.stringify` + `Content-Type` вручну | передаєте об'єкт: серіалізація й `Content-Type: application/json` автоматично |
| Статус 4xx/5xx | **не** помилка | **помилка** (`AxiosError`) |
| Параметри | складаєте `URL` самі | опція `params` |
| Базова адреса | немає | `baseURL` |
| Перехоплювачі | немає | `interceptors.request/response` |
| Таймаут | `AbortSignal.timeout` | опція `timeout` |
| Скасування | `AbortController` | той самий `signal` |
| Розмір | вбудований | зовнішній пакет |

### 13.2. Запити і відповідь

```js
const res = await axios.get('http://localhost:4101/json', { params: { q: 'кіт & пес', page: 2 } })
```

Об'єкт відповіді:

| Поле | Значення |
|---|---|
| `res.data` | тіло, уже розібране (JSON → об'єкт) |
| `res.status` | `200` |
| `res.statusText` | `OK` |
| `res.headers` | об'єкт `AxiosHeaders` (`res.headers['content-type']`) |
| `res.config` | налаштування запиту (`res.config.url`) |
| `res.request` | низькорівневий запит |

Методи: `axios.get(url, config)`, `axios.delete(url, config)`, `axios.head`, `axios.options`, `axios.post(url, data, config)`, `axios.put(url, data, config)`, `axios.patch(url, data, config)`, `axios.postForm(url, data, config)`, `axios.request({ method, url, data, … })`.

Заголовки за замовчуванням, які надсилає Axios у Node: `Accept: application/json, text/plain, */*`, `User-Agent: axios/<версія>`, `Accept-Encoding: gzip, compress, deflate, br`.

### 13.3. Параметри (`params`)

`params: { q: 'кіт & пес', page: 2 }` → на сервер: `/json?q=%D0%BA%D1%96%D1%82+%26+%D0%BF%D0%B5%D1%81&page=2` (кодування автоматичне). Правила серіалізації:

| Значення в `params` | Що потрапляє в адресу |
|---|---|
| масив `{ tag: ['a','b'] }` | `tag[]=a&tag[]=b` (закодовано як `tag%5B%5D=a&tag%5B%5D=b`) |
| вкладений об'єкт `{ o: { x: 1 } }` | `o[x]=1` |
| `null`, `undefined` | **пропускаються** |
| `Date` | ISO-рядок `1970-01-01T00:00:00.000Z` |
| `URLSearchParams` | як є: `a=1&b=2` |
| параметри вже в адресі | зливаються: `get('/json?x=1', { params: { y: 2 } })` → `/json?x=1&y=2` |

Формат масивів змінює `paramsSerializer`:

| Налаштування | Результат для `{ tag: ['a','b'] }` |
|---|---|
| за замовчуванням | `tag[]=a&tag[]=b` |
| `paramsSerializer: { indexes: null }` | `tag=a&tag=b` |
| `paramsSerializer: { indexes: true }` | `tag[0]=a&tag[1]=b` |

Подивитися підсумкову адресу без запиту: `axios.getUri({ url: 'users', params: { a: 1 } })`.

### 13.4. Заголовки

```js
await axios.get(url, { headers: { 'X-Token': 'abc', Authorization: 'Bearer t' } })
```

Глобальні заголовки: `axios.defaults.headers.common['Authorization'] = 'Bearer T'`. Базова авторизація: `auth: { username: 'u', password: 'p' }` → `Authorization: Basic dTpw`.

### 13.5. Тіло і `Content-Type`

| Що передали в `data` | `Content-Type` | Тіло |
|---|---|---|
| об'єкт `{ name: 'Ann', n: 1 }` | `application/json` | `{"name":"Ann","n":1}` |
| `URLSearchParams` | `application/x-www-form-urlencoded;charset=utf-8` | `q=%D0%BA%D1%96%D1%82` |
| рядок `'raw text'` | `application/x-www-form-urlencoded` (!) | `raw text` |
| `FormData` | `multipart/form-data; boundary=…` | multipart |
| об'єкт + `Content-Type: application/x-www-form-urlencoded` | той самий | `a=1` (об'єкт серіалізується у форму) |
| `axios.postForm(url, { a: 1, b: 'кіт' })` | `multipart/form-data` | multipart |

Для рядка Axios без явного заголовка ставить `application/x-www-form-urlencoded`: щоб надіслати звичайний текст чи свій JSON-рядок, задайте `Content-Type` самі.

### 13.6. Екземпляр із налаштуваннями

```js
const api = axios.create({ baseURL: 'http://localhost:4101/api/', timeout: 1000, headers: { 'X-App': 'demo' } })
await api.get('users', { params: { id: 7 } })
```

→ `/api/users?id=7` із заголовком `x-app: demo`.

| Запит | Адреса |
|---|---|
| `api.get('users')` | `/api/users` |
| `api.get('/users')` | `/api/users` (початковий слеш не скидає `baseURL`) |
| `api.get('http://localhost:4101/json')` | `/json` (абсолютна адреса **ігнорує** `baseURL`) |

Типове налаштування для всіх запитів екземпляра: `api.defaults.headers.common['Authorization'] = 'Bearer T'`.

### 13.7. Перехоплювачі (interceptors)

```js
api.interceptors.request.use(cfg => {
  cfg.headers.set('X-Req-Id', 'r1')
  return cfg
})
api.interceptors.response.use(res => {
  res.data.intercepted = true
  return res
}, err => Promise.reject(err))
```

Перший додає заголовок до кожного запиту, другий змінює кожну відповідь. Типове застосування: підставляти токен, обробляти `401` в одному місці, логувати.

### 13.8. Помилки

| Ситуація | Що відбувається |
|---|---|
| статус 404 | `AxiosError`, `code: 'ERR_BAD_REQUEST'`, `message: 'Request failed with status code 404'`, `error.response.status` = 404, `error.response.data` = тіло відповіді |
| статус 500 | `code: 'ERR_BAD_RESPONSE'` |
| сервер недоступний | помилка без `response` (`error.response` — `undefined`), але з `error.request`; у Node `code: 'ECONNREFUSED'` |
| таймаут (`timeout: 300`) | `code: 'ECONNABORTED'`, `message: 'timeout of 300ms exceeded'` |
| скасовано `signal` | `CanceledError`, `code: 'ERR_CANCELED'`, `axios.isCancel(error)` → `true` |
| `maxRedirects: 0` і перенаправлення | помилка `ERR_BAD_RESPONSE` зі статусом 302 і `error.response.headers.location` |

Типовий обробник:

```js
try {
  const { data } = await axios.get(url)
} catch (e) {
  if (axios.isAxiosError(e)) {
    if (e.response) console.log(e.response.status, e.response.data)
    else console.log(e.code, e.message)
  }
}
```

Щоб 4xx/5xx **не** були помилками: `validateStatus: () => true` → `res.status` 404, `res.data` — тіло.

### 13.9. Інші можливості

| Опція | Сенс |
|---|---|
| `responseType: 'arraybuffer'` | тіло як бінарні дані (у Node — `Buffer`), `'json'`, `'text'`, `'blob'`, `'stream'` |
| `maxRedirects` | скільки перенаправлень виконати (за замовчуванням іде за ними; кінцева адреса в `res.request.path`) |
| `timeout` | мілісекунди, `0` — без обмеження |
| `signal` | `AbortSignal` |
| `withCredentials` | аналог `credentials: 'include'` у браузері |
| `Promise.all` | паралельні запити, як і з `fetch` |

Відповідь, що не JSON, лишається рядком: для `text/plain` `res.data` — `'plain text'`. Масив `Set-Cookie` доступний як `res.headers['set-cookie']`.

## 14. Типові помилки

| Помилка | Наслідок |
|---|---|
| значення в адресі без кодування (`?q=${value}`) | `&`, `#`, `+` ламають параметри; можливе впровадження чужих параметрів |
| `encodeURIComponent` для цілої адреси | `https%3A%2F%2F…` — адреса непрацездатна |
| подвійне кодування (вручну і через `params`/`URLSearchParams`) | `%2520` замість `%20` |
| очікування, що `fetch` кине помилку на 404 | код іде далі з «поганою» відповіддю; перевіряйте `res.ok` |
| `JSON.stringify` без `Content-Type: application/json` у `fetch` | сервер отримує `text/plain` |
| ручний `Content-Type` для `FormData` | втрачається `boundary`, сервер не розбирає |
| `fetch('/api')` у Node | `Failed to parse URL`; потрібна абсолютна адреса |
| нелатинські символи в значенні заголовка | `TypeError` (потрібен Latin-1 або кодування) |
| читання тіла двічі | `Body is unusable` |
| очікування «`+` = пробіл» у `decodeURIComponent` | `+` лишається плюсом |
| `new URLSearchParams({ a: [1, 2] })` | `a=1%2C2`, а не два параметри |
| фрагмент `#…` як параметр для сервера | на сервер не доходить |
| токен чи пароль у параметрах адреси | потрапляє в історію, журнали й `Referer` |
| заголовок `Host` / `Cookie` / `Referer` у скрипті браузера | ігнорується |
| CORS-помилку «лікувати» в клієнті | потрібні заголовки на **сервері** |
| у Axios рядок у `data` без `Content-Type` | піде як `application/x-www-form-urlencoded` |
| у Axios масив у `params` | за замовчуванням `tag[]=a&tag[]=b` — перевірте очікування бекенду |

## 15. Алгоритм: як надіслати запит правильно

1. Визначте **метод**: читання — `GET`, створення — `POST`, зміна — `PUT`/`PATCH`, видалення — `DELETE`.
2. Складіть адресу через `new URL(path, base)`; параметри — через `url.searchParams.set/append` (або `params` в Axios). Не підставляйте значення в рядок вручну.
3. Визначте тіло: JSON → `JSON.stringify` + `Content-Type: application/json`; форма → `URLSearchParams`; файли → `FormData` без ручного `Content-Type`.
4. Додайте заголовки: `Accept`, `Authorization`, власні `X-…`. Значення — лише Latin-1.
5. Додайте **таймаут** (`AbortSignal.timeout`, `timeout` в Axios).
6. Перевірте **статус**: `res.ok` у `fetch`, `try/catch` і `error.response` в Axios.
7. Розберіть тіло відповіді один раз (`res.json()`).
8. Якщо запит з браузера на інший origin — переконайтеся, що сервер дозволяє CORS (методи, заголовки, origin, cookie).
9. Не кладіть секрети в адресу.

## 16. Шпаргалка

| Потрібно | Запис |
|---|---|
| розібрати адресу | `new URL(str, base)` |
| перевірити адресу | `URL.canParse(str)` · `URL.parse(str)` |
| параметри з адреси | `url.searchParams.get('q')` · `getAll` |
| додати параметр | `url.searchParams.append('t', 'a')` |
| замінити параметр | `url.searchParams.set('q', 'x')` |
| закодувати значення | `encodeURIComponent(v)` |
| розкодувати значення | `decodeURIComponent(v)` |
| поточна адреса | `location.href` · `.pathname` · `.search` · `.hash` |
| змінити адресу без перезавантаження | `history.pushState(state, '', url)` |
| GET | `await fetch(url)` |
| POST JSON | `fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) })` |
| форма | `body: new URLSearchParams({...})` |
| файл | `body: formData` |
| заголовок | `headers: { 'X-Token': 'abc' }` |
| таймаут | `signal: AbortSignal.timeout(3000)` |
| перевірка статусу | `if (!res.ok) throw …` |
| Axios GET з параметрами | `axios.get(url, { params: { q: 'x' } })` |
| Axios POST | `axios.post(url, obj, { headers: {...} })` |
| Axios екземпляр | `axios.create({ baseURL, timeout, headers })` |
| Axios помилка | `axios.isAxiosError(e)` · `e.response.status` · `e.code` |

## Підсумок

- URL складається зі схеми, хоста, порту, шляху, параметрів і фрагмента; **фрагмент на сервер не йде**, а origin — це схема, хост і порт.
- Адресний рядок вміє лише GET за адресою; заголовки, метод і тіло задають кодом — `fetch` чи Axios.
- Усе, що йде в адресу як **дані**, кодують `encodeURIComponent` рівно один раз; найпростіше — збирати адресу через `URL` і `URLSearchParams`.
- Percent-encoding записує байти UTF-8 як `%HH`: `П` → `%D0%9F`; пробіл — `%20` (в параметрах форм — `+`).
- `fetch` не кидає помилку на 404 і 500 — перевіряйте `res.ok`; Axios, навпаки, кидає `AxiosError`.
- У браузері діє CORS: непрості запити спершу дають preflight `OPTIONS`; у Node CORS немає, але адреси мають бути абсолютними.
- Axios дає автоматичний JSON, `params`, `baseURL`, перехоплювачі й таймаут; формат масивів у `params` за замовчуванням `tag[]=a&tag[]=b`.
