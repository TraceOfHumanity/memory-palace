# Адресний рядок браузера: URL, параметри, заголовки, кодування, Fetch і Axios

Нотатка для тих, хто ніколи не працював з цією темою: від «що я пишу в адресному рядку» до «як з коду надіслати запит із заголовками й параметрами та як усе правильно закодувати». Протокол HTTP і HTTPS докладно описано в [http-https.md](../../computer-science/http-https.md), загальну картину мережі — в [internet.md](../../computer-science/internet.md), тут — усе разом: адреса, параметри, кодування, заголовки, `fetch` до дрібниць, CORS, Node.js і Axios.

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

## 10. Fetch: повний опис

`fetch()` — глобальна функція Web API для HTTP-запитів. Замінила `XMLHttpRequest`, працює на промісах у всіх сучасних браузерах, у Node.js (вбудований з версії 18, стабільний з 21), Deno, Bun і Cloudflare Workers. Сигнатура: `fetch(resource, init?)` → `Promise<Response>`; `resource` — рядок, об'єкт `URL` або `Request`, `init` — необов'язковий об'єкт налаштувань.

```js
const response = await fetch(url, options)
const data = await response.json()
```

Без імпорту доступні `fetch`, `Headers`, `Request`, `Response`, `FormData`, `AbortController`, `AbortSignal.timeout`, `structuredClone`. Виклик `fetch(url)` повертає `Promise`, а не `Response`.

### 10.1. Два етапи: заголовки й тіло

Проміс `fetch` виконується, щойно прийшли **статус і заголовки**; тіло може ще надходити. Перевірено на відповіді, що віддає тіло частинами ~100 мс: `fetch` розв'язався майже миттєво, а дочекатись тіла дозволяє окремий виклик. Тому два `await` — це два етапи, а не помилка:

1. `await fetch(...)` → `Response` (є статус і заголовки).
2. `await response.json()` / `.text()` / … → дочекатись і розібрати тіло.

### 10.2. Об'єкт `Response`

| Властивість | Для `GET /json` (200) | Сенс |
|---|---|---|
| `status` | `200` | числовий код |
| `statusText` | `"OK"` | фраза («Not Found») |
| `ok` | `true` | `true` для `status` 200–299 |
| `type` | `"basic"` | `basic` (свій origin), `cors`, `opaque` (відповідь на `no-cors`: статус 0, тіла й заголовків не видно), `opaqueredirect`, `error` |
| `redirected` | `false` | чи були перенаправлення |
| `url` | повна кінцева адреса | адреса після перенаправлень |
| `headers` | `Headers` | заголовки відповіді |
| `body` | `ReadableStream` | потік тіла (`null` для `HEAD`) |
| `bodyUsed` | `false` до читання | чи вже прочитано тіло |

`Response.error()` дає `type: 'error'` і `status: 0`. У Node `redirect: 'manual'` повертає `type: 'basic'`, `status: 302` і доступний `Location`; у браузері така відповідь — `opaqueredirect`.

### 10.3. Головна пастка: HTTP-помилки не відхиляють проміс

| Ситуація | Поведінка |
|---|---|
| сервер відповів 404 або 500 | проміс **виконується**: `r.ok === false`, `r.status === 404`, `statusText` «Not Found» |
| немає з'єднання, DNS не знайшов хост, відмова в з'єднанні, помилка TLS, скасування, таймаут, блокування CORS | проміс **відхиляється** (`TypeError`, `AbortError`, `TimeoutError`) |

Тому перевірка статусу обов'язкова:

```js
const res = await fetch(url)
if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
const data = await res.json()
```

Типова утиліта, що зберігає статус і текст помилки:

```js
async function getJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    err.body = await res.text().catch(() => '')
    throw err
  }
  return res.json()
}
```

### 10.4. Читання тіла

Усі методи повертають проміси:

| Метод | Результат |
|---|---|
| `.json()` | розібраний JSON |
| `.text()` | рядок (**завжди UTF-8**) |
| `.arrayBuffer()` | `ArrayBuffer` |
| `.blob()` | `Blob` |
| `.formData()` | `FormData` |
| `.bytes()` | `Uint8Array` (є в Node 24) |

Приклади: `.json()` → `{ a: 1, b: [1, 2] }`; `.text()` → `héllo`; `.arrayBuffer()` → 6 байтів (`é` у UTF-8 займає 2); `.blob()` → `size: 6`, `type: ""`, якщо сервер не вказав `Content-Type`; `.formData()` для `application/x-www-form-urlencoded` → пари `a=1`, `b=x y`.

**Тіло читається лише один раз.** Другий `await r.json()` дає `TypeError: Body is unusable: Body has already been read`. Щоб прочитати двічі — `response.clone()` **до** читання:

```js
const copy = res.clone()
const data = await res.json()
const raw = await copy.text()
```

Клон буферизує тіло, тому не клонуйте великі відповіді без потреби.

Помилки розбору:

| Ситуація | Результат |
|---|---|
| `.json()` на `{oops` | `SyntaxError: Expected property name or '}' in JSON at position 1` |
| `.json()` на порожнє тіло (204) | `SyntaxError: Unexpected end of JSON input` |
| `.text()` на 204 | `""` |

Для 204 `.json()` не викликають:

```js
if (res.status === 204) return null
const ct = res.headers.get('content-type') ?? ''
return ct.includes('application/json') ? res.json() : res.text()
```

**Кодування.** `text()` завжди декодує як UTF-8 і ігнорує `charset=iso-8859-1`: байт `0xE9` стає `�`. Для інших кодувань: `new TextDecoder('iso-8859-1').decode(await res.arrayBuffer())`.

**Стиснення.** Якщо сервер надіслав `Content-Encoding: gzip`, `fetch` розпаковує тіло сам (`text()` дає `compressed hello`), заголовок у `Response` лишається. `Accept-Encoding` виставляється автоматично (у Node — `gzip, deflate`).

### 10.5. Мережеві помилки

| Ситуація | Результат у Node |
|---|---|
| порт закритий | `TypeError: fetch failed`, `cause.code: 'ECONNREFUSED'` (є `errno`, `syscall`, `address`, `port`) |
| домен не існує | `TypeError: fetch failed`, `cause.code: 'ENOTFOUND'`, `cause.hostname` |
| самопідписаний сертифікат | `TypeError: fetch failed`, `cause.code: 'DEPTH_ZERO_SELF_SIGNED_CERT'` |
| відносна адреса | `TypeError: Failed to parse URL from /relative`, `cause.code: 'ERR_INVALID_URL'` |
| сміття замість адреси | `TypeError: Failed to parse URL from not a url` |
| заборонений порт 1 | `cause.message: 'bad port'` |
| `file:` адреса | `TypeError: fetch failed`, `cause: not implemented... yet...` |

Усі мережеві помилки — `TypeError`. У браузері текст стандартний («Failed to fetch») і без деталей, щоб не розкривати інформацію про мережу; в Node справжня причина лежить в `error.cause`, розрізняти її можна за `error.cause?.code`. Адреса `data:` працює: `fetch('data:text/plain;base64,aGk=')` → `hi`. Відносна адреса `fetch('/api/x')` працює в браузері (від поточної сторінки) і не працює в Node.

### 10.6. Метод, заголовки й тіло запиту

```js
const res = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer abc123' },
  body: JSON.stringify({ name: 'Ann', n: 1 }),
})
```

| Опція | Значення |
|---|---|
| `method` | `'GET'` (за замовчуванням), `'POST'`, `'PUT'`, `'PATCH'`, `'DELETE'`, `'HEAD'`, `'OPTIONS'` |
| `headers` | простий об'єкт, масив пар або `Headers` (усі три форми рівнозначні) |
| `body` | рядок, `URLSearchParams`, `FormData`, `Blob`, `ArrayBuffer`, `Uint8Array`, потік |
| `signal` | `AbortSignal` для скасування й таймауту |
| `redirect` | `'follow'` (за замовчуванням), `'manual'`, `'error'` |
| `credentials` | `'same-origin'` (за замовчуванням), `'include'`, `'omit'` |
| `mode` | `'cors'` (за замовчуванням), `'no-cors'`, `'same-origin'` |
| `cache` | `'default'`, `'no-store'`, `'reload'`, `'no-cache'`, `'force-cache'`, `'only-if-cached'` |
| `referrerPolicy`, `referrer`, `integrity`, `priority`, `keepalive`, `duplex` | додаткові налаштування (розділ 10.14) |

**Метод.** `get`, `post`, `put`, `delete`, `head`, `options` нормалізуються до верхнього регістру. `patch` у нижньому регістрі **не** нормалізується: сервер отримав `patch` і відповів 400, а Node ще й вивів попередження; `PATCH` працює. Завжди пишіть метод великими літерами. `GET` і `HEAD` із тілом → `TypeError: Request with GET/HEAD method cannot have body.`

**Налаштування за замовчуванням у Node:** `method: GET`, `user-agent: node`, `accept: */*`, `accept-encoding: gzip, deflate`, без тіла. У браузері `User-Agent`, `Accept-Language`, `Cookie`, `Origin`, `Referer` додає сам браузер.

**Заголовки.** У Node `User-Agent` можна змінити (`my-app`), а спроба задати `Host: evil.test` ігнорується: сервер бачить справжню адресу. У браузері заборонені для зміни `Host`, `Cookie`, `Origin`, `Referer`, `Content-Length`, `Accept-Encoding` та інші.

### 10.7. `Content-Type` від типу тіла

| `body` | Виставлений `Content-Type` |
|---|---|
| рядок | `text/plain;charset=UTF-8` |
| рядок + ваш `Content-Type` | ваш |
| `URLSearchParams` | `application/x-www-form-urlencoded;charset=UTF-8` (тіло `a=1&b=x+y`) |
| `FormData` | `multipart/form-data; boundary=----…` (межу генерує `fetch`) |
| `Blob` | `blob.type` (наприклад, `text/x-custom`) |
| `Uint8Array`, `ArrayBuffer` | **не виставляється** |
| `ReadableStream` | **не виставляється**, потрібен `duplex: 'half'` |
| звичайний об'єкт `{...}` | не підходить: надішлеться `[object Object]` |

`Content-Length` для рядка й байтів виставляється сам (`7` для `{"x":1}`, `3` для трьох байтів).

**Головна пастка JSON:** `JSON.stringify(obj)` — це рядок, тож без явного заголовка піде `text/plain`, і багато серверів не розпарсять тіло:

```js
await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ x: 1 }),
})
```

Для `FormData` `Content-Type` **не задають**, інакше загубиться `boundary`.

### 10.8. Форми й файли

```js
await fetch('/login', {
  method: 'POST',
  body: new URLSearchParams({ q: 'кіт', x: 'a b' }),
})
```

Тіло: `q=%D0%BA%D1%96%D1%82&x=a+b` — те саме кодування, що й в адресі (розділ 8). Файли:

```js
const fd = new FormData()
fd.append('name', 'Ann')
fd.append('file', new Blob(['hi']), 'a.txt')
await fetch('/upload', { method: 'POST', body: fd })
```

Параметри запиту `fetch` сам не формує: використовуйте `URL` і `URLSearchParams` (розділ 6).

### 10.9. Перенаправлення

Параметр `redirect`: `'follow'` (за замовчуванням), `'manual'`, `'error'`.

| Режим | Результат (302 → `/json`) |
|---|---|
| `follow` | `status 200`, `redirected: true`, `url` — кінцева адреса |
| `manual` | `status 302`, заголовок `Location: /json` |
| `error` | `TypeError: fetch failed`, `cause: "unexpected redirect"` |
| 307 після `POST` | метод і тіло зберігаються (повторний `POST`) |

У браузерах максимум 20 перенаправлень. 301 і 302 для `POST` традиційно перетворюють метод на `GET`; 307 і 308 метод зберігають.

### 10.10. Скасування й таймаут

```js
const ac = new AbortController()
const p = fetch(url, { signal: ac.signal })
ac.abort()
```

| Дія | Результат |
|---|---|
| `abort()` | `DOMException`, `name: 'AbortError'`, `message: 'This operation was aborted'`, `code: 20`; `signal.aborted === true` |
| `abort(new Error('custom'))` | проміс відхиляється **з цією помилкою** (`name: 'Error'`, `message: 'custom'`) |
| `signal` уже скасований до `fetch` | відхиляється одразу, запит не йде |
| `AbortSignal.timeout(100)` на повільний ендпоінт | `TimeoutError`, `message: 'The operation was aborted due to timeout'`, `code: 23` (не `AbortError`) |
| `AbortSignal.any([AbortSignal.timeout(80), user.signal])` | скасується від першого з двох (отримано `TimeoutError`) |

Розрізнення причин:

```js
try {
  await fetch(url, { signal })
} catch (e) {
  if (e.name === 'TimeoutError') console.log('таймаут')
  else if (e.name === 'AbortError') console.log('скасовано вручну')
  else console.log('мережа')
}
```

Скасування рве з'єднання на боці клієнта, але **сервер міг уже виконати запит** (наприклад, `POST`). Скасування під час читання тіла відхиляє і `await res.json()`. Власного таймауту в `fetch` немає: без `signal` запит може висіти дуже довго.

### 10.11. Стрімінг тіла

`response.body` — `ReadableStream`. Сервер надсилав `one\n`, `two\n`, `three\n` із паузами ~50 мс, а клієнт отримував їх частинами:

```js
const reader = res.body.getReader()
const dec = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  console.log(dec.decode(value))
}
```

Результат: `chunk 1 "one\n" +0ms`, `chunk 2 "two\n" +50ms`, `chunk 3 "three\n" +100ms`. Зручніше — `for await` із `TextDecoderStream`:

```js
for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
  console.log(chunk)
}
```

**Прогрес завантаження.** При `content-length: 1000000` цикл `for await (const ch of res.body)` порахував рівно `1000000` байтів:

```js
const total = +res.headers.get('content-length')
let got = 0
for await (const ch of res.body) {
  got += ch.length
  progress(got / total)
}
```

При стисненні gzip `content-length` — розмір стисненого тіла, він не збігається з розпакованим.

**NDJSON.** Рядки JSON, що приходять частинами й обриваються посеред об'єкта, накопичують у буфері й розрізають за `\n`:

```js
let buf = ''
for await (const part of res.body.pipeThrough(new TextDecoderStream())) {
  buf += part
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    handle(JSON.parse(buf.slice(0, i)))
    buf = buf.slice(i + 1)
  }
}
```

Отримано `[{i:1},{i:2},{i:3}]`. `fetch` **не дає прогресу відправки** (на відміну від `XMLHttpRequest.upload.onprogress`): варіанти — `XMLHttpRequest` або стрім-тіло з `duplex: 'half'` (підтримка обмежена).

### 10.12. `Request` і `Response` як конструктори

```js
const rq = new Request(url, { method: 'PUT', body: 'q' })
await fetch(rq)
await fetch(rq, { method: 'POST' })

const rs = new Response('hello', { status: 201, statusText: 'Made', headers: { 'X-K': 'v' } })
Response.json({ a: 1 }, { status: 202 })
Response.error()
```

`rq.method` — `PUT`, `rq.bodyUsed` — `false`; другий виклик показує, що `init` перекриває поля `Request`. `rs.ok` → `true` (201). `Response.json(...)` ставить `content-type: application/json` і тіло `{"a":1}`; `Response.error()` — `type: 'error'`, `status: 0`. Є також `Response.redirect(url, status)`. `new Response(...)` потрібен у Service Worker і в тестах для мока відповіді. `fetch` приймає `URL`: `fetch(new URL('/echo', base))` → 200.

### 10.13. Паралельні запити і повтор

`await` у циклі — **послідовно**, `Promise.all` — паралельно. Для трьох операцій по 100 мс: послідовно ~300 мс, паралельно ~100 мс; для трьох повільних `fetch` по 1 с — загалом ~1 с.

```js
const [a, b, c] = await Promise.all(urls.map(u => fetch(u).then(r => r.json())))
```

| Комбінатор | Поведінка |
|---|---|
| `Promise.all` | відхиляється на **першій** помилці; інші запити не скасовуються автоматично |
| `Promise.allSettled` | не падає: `['fulfilled', 'rejected']` |
| `Promise.race` | перший результат; решту скасовуйте через `AbortController` |

Для великої кількості адрес обмежують паралелізм (черга, пул): браузер тримає близько 6 з'єднань на домен у HTTP/1.1.

**Повтор із backoff.** Сервер повертав `503, 503, 200`: спроби 1 і 2 — 503, на третій — успіх.

```js
async function fetchRetry(url, init, { retries = 3, base = 300 } = {}) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init)
      if (res.ok || ![429, 502, 503, 504].includes(res.status)) return res
    } catch (e) {
      if (e.name === 'AbortError' || i >= retries) throw e
    }
    if (i >= retries) throw new Error('gave up')
    await new Promise(r => setTimeout(r, base * 2 ** i + Math.random() * 100))
  }
}
```

Пауза зростає експоненційно (`base * 2 ** i`) з випадковою добавкою (jitter). Повторювати можна лише **ідемпотентні** запити (`GET`, `PUT`, `DELETE`) або ті, де є `Idempotency-Key`: `POST` без захисту може виконатися двічі.

### 10.14. Браузерні опції

Node приймає `mode`, `credentials`, `cache`, `referrerPolicy`, `keepalive` без помилки й нічого з ними не робить (відповідь 200, `type: basic`); працюють вони лише в браузері.

| Опція | Сенс |
|---|---|
| `credentials: 'same-origin'` | cookie лише для свого origin (за замовчуванням) |
| `credentials: 'include'` | cookie і для інших origin; сервер має віддати `Access-Control-Allow-Credentials: true` і **конкретний** origin, а не `*` |
| `credentials: 'omit'` | cookie ніколи |
| `cache` | взаємодія з HTTP-кешем браузера (`ETag`, `Cache-Control`) |
| `keepalive: true` | запит може дожити після закриття сторінки (аналітика); ліміт тіла ~64 КБ |
| `referrer`, `referrerPolicy` | що надсилати в `Referer` |
| `integrity` | Subresource Integrity |
| `priority` | `high`, `low`, `auto` |
| `duplex` | `'half'` для потокового тіла запиту |

Перевірено: `credentials: 'include'` проти відповіді з `Access-Control-Allow-Origin: *` дає `TypeError: Failed to fetch`.

### 10.15. Типова обгортка

```js
const api = base => async (path, { json, ...init } = {}) => {
  const res = await fetch(new URL(path, base), {
    ...init,
    headers: { ...(json && { 'Content-Type': 'application/json' }), ...init.headers },
    body: json ? JSON.stringify(json) : init.body,
    signal: init.signal ?? AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw Object.assign(new Error(res.statusText), { status: res.status, res })
  return res.status === 204 ? null : res.json()
}
```

У React `fetch` не викликають у тілі компонента: використовують `useEffect` з `AbortController` у cleanup (див. [useEffect.md](../react-js/useEffect.md)) або бібліотеки (TanStack Query, SWR). Захист від **гонки відповідей**: скасовуйте попередній запит або ігноруйте застарілий. Загальні відомості про проміси й `AbortController` — [asynchronous.md](../common/asynchronous/asynchronous.md).

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

`fetch` вбудований у Node.js з версії 18 (рушій **undici**), без імпортів; у Node 24 `typeof fetch === 'function'`, попереджень про експериментальність немає. API той самий, що й у браузері, відмінності — у середовищі.

### 12.1. Що інакше

| Тема | Браузер | Node.js |
|---|---|---|
| CORS, `Origin`, cookie-jar, кеш | є | **немає**: звертатись можна куди завгодно |
| Відносні адреси (`fetch('/api')`) | працюють (від поточної сторінки) | **не працюють**: `TypeError: Failed to parse URL from …`, `cause.code` = `ERR_INVALID_URL`; потрібна абсолютна адреса |
| Заголовки за замовчуванням | `User-Agent` браузера, `Accept-Language`, `Origin`, `Referer`… | мінімальні (нижче) |
| `Host` | заборонений для зміни | підсунуте значення ігнорується: сервер бачить `localhost:4100` |
| Заголовок із Latin-1 (`ü`) | дозволено | дозволено; з кирилицею — `TypeError` |
| Самопідписаний сертифікат | помилка з'єднання | відхиляється |

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

### 12.2. Приклад

```js
const url = new URL('/json', 'http://localhost:4100')
url.searchParams.set('q', 'кіт & пес')
const res = await fetch(url, { headers: { 'X-Token': 'abc' } })
const data = await res.json()
```

Відповідь: статус 200, `res.ok` `true`, `res.statusText` `OK`. Реальний `fetch('https://example.com')`: `status 200`, `content-type: text/html; charset=utf-8`, `url https://example.com/`, тіло читається.

### 12.3. Помилки

| Ситуація | Помилка |
|---|---|
| сервер недоступний | `TypeError: fetch failed`, причина в `error.cause` |
| недійсна адреса | `TypeError: Failed to parse URL from …` |
| `redirect: 'error'` і перенаправлення | `TypeError: fetch failed` |
| таймаут (`AbortSignal.timeout(300)`) | `TimeoutError: The operation was aborted due to timeout` |
| `controller.abort()` | `AbortError: This operation was aborted` |
| статус 404/500 | **не помилка**; перевіряйте `res.ok` |

Заголовки відповіді в Node: `res.headers.get('x-custom')` → `hello`, `res.headers.getSetCookie()` → `['a=1; HttpOnly', 'b=2']`.

### 12.4. Сертифікати, проксі, пул

Власний CA у undici налаштовують через `Agent` з `connect: { ca }` (з пакета `undici`) або змінну `NODE_EXTRA_CA_CERTS`; `rejectUnauthorized: false` — лише для розробки. Проксі, пул з'єднань і таймаути — `undici.Agent` та `setGlobalDispatcher`.

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
| Прогрес відправки | немає | є (через XHR-адаптер) |
| Додаткова залежність | ні | так |

`XMLHttpRequest` — старіший API на колбеках і подіях: 4xx/5xx не вважає помилкою, має `timeout`, `abort()` і `upload.onprogress`, JSON розбирається вручну.

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
| `patch` у нижньому регістрі в `fetch` | не нормалізується: сервер отримує `patch` і відповідає 400 |
| `.json()` на порожню відповідь (204, `HEAD`) | `SyntaxError: Unexpected end of JSON input` |
| `res.text()` для не-UTF-8 тіла | `�` замість символів; потрібен `TextDecoder` |
| `await` у циклі замість `Promise.all` | ~300 мс замість ~100 мс для трьох запитів по 100 мс |
| `TimeoutError` і `AbortError` не розрізняють | таймаут сприймається як ручне скасування |
| запит без таймауту | може висіти дуже довго |
| повтор неідемпотентного `POST` | операція виконується двічі |
| застарілі запити не скасовують | гонка відповідей, витоки |
| очікування прогресу відправки від `fetch` | його немає: `XMLHttpRequest` або стрім із `duplex: 'half'` |
| вимкнена перевірка сертифіката в продакшені | відкрита вразливість |
| CORS-помилку плутають з помилкою сервера | обидві виглядають як `Failed to fetch` |
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
10. Нестабільні запити повторюйте з експоненційним backoff, але лише ідемпотентні (`GET`, `PUT`, `DELETE`).
11. Великі відповіді читайте потоком (`res.body` + `TextDecoderStream`), а паралельні запити — через `Promise.all` або `allSettled`.

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

## Задачі для закріплення

Сімдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Для задач із кодом виконайте його в консолі браузера чи в Node.js.

### Рівень 1. Частини адреси та відносні адреси

**1.** Який `protocol` має адреса?

```js
new URL('https://example.com/a').protocol
```

**2.** Що поверне `hostname`?

```js
new URL('http://localhost:3000/x').hostname
```

**3.** Що поверне `port` (число чи рядок)?

```js
new URL('http://localhost:3000/x').port
```

**4.** Що поверне `port` для адреси з типовим портом `https`?

```js
new URL('https://example.com:443/').port
```

**5.** Що поверне `pathname`?

```js
new URL('https://a.com/docs/intro?x=1').pathname
```

**6.** Що поверне `search`?

```js
new URL('https://a.com/p?x=1&y=2#top').search
```

**7.** Що поверне `hash`?

```js
new URL('https://a.com/p?x=1&y=2#top').hash
```

**8.** Що поверне `origin` (логін і пароль, шлях — не входять)?

```js
new URL('https://user:pass@a.com:8080/p').origin
```

**9.** Чим відрізняються `host` і `hostname` для адреси з портом?

```js
[new URL('https://a.com:8080').host, new URL('https://a.com:8080').hostname]
```

**10.** Яку адресу дасть відносний шлях `/about` від бази `https://a.com/blog/post`?

```js
new URL('/about', 'https://a.com/blog/post').href
```

**11.** Яку адресу дасть `../img/a.png` від бази `https://a.com/blog/2024/post.html`?

```js
new URL('../img/a.png', 'https://a.com/blog/2024/post.html').href
```

**12.** Яку адресу дасть `?page=2` від бази `https://a.com/list?page=1`?

```js
new URL('?page=2', 'https://a.com/list?page=1').href
```

### Рівень 2. Параметри та кодування

**13.** Браузер відкриває `https://a.com/p?x=1#s`. Запишіть перший рядок HTTP-запиту, який піде на сервер (метод, шлях із параметрами, версія). Чи потрапить фрагмент `#s` на сервер?

**14.** Чи вдасться розібрати рядок без схеми та бази? Що поверне `URL.canParse`?

```js
URL.canParse('example.com')
```

**15.** Яке значення поверне `get('b')`?

```js
new URLSearchParams('?a=1&b=2').get('b')
```

**16.** Що поверне `get('c')` для ключа, якого немає?

```js
new URLSearchParams('a=1&b=2').get('c')
```

**17.** Що поверне `getAll('tag')`?

```js
new URLSearchParams('tag=a&tag=b&tag=c').getAll('tag')
```

**18.** Що поверне `toString()`?

```js
new URLSearchParams({ q: 'cat', page: 1 }).toString()
```

**19.** Що поверне вираз?

```js
encodeURIComponent('a b')
```

**20.** Що поверне вираз?

```js
encodeURIComponent('a&b=c')
```

**21.** Яке кодування має літера `П`?

```js
encodeURIComponent('П')
```

**22.** Розкодуйте.

```js
decodeURIComponent('%D0%9A%D0%B8%D1%97%D0%B2')
```

**23.** Що поверне `encodeURI`?

```js
encodeURI('https://a.com/a b?x=1')
```

**24.** Як `URLSearchParams` запише пробіл?

```js
new URLSearchParams({ q: 'a b' }).toString()
```

**25.** Що поверне `get('q')`?

```js
new URLSearchParams('q=a+b%20c').get('q')
```

**26.** Що поверне `decodeURIComponent` для рядка з плюсом?

```js
decodeURIComponent('a+b')
```

### Рівень 3. Origin, зміна адреси, нормалізація

**27.** Скільки байтів у символа `€` за UTF-8 і як він кодується?

```js
encodeURIComponent('€')
```

**28.** Для кожної пари адрес скажіть, чи однаковий у них origin: а) `http://a.com/x` і `http://a.com/y`; б) `http://a.com` і `https://a.com`; в) `http://a.com` і `http://a.com:8080`; г) `https://a.com:443` і `https://a.com`.

**29.** Що поверне `toString()` після `set`?

```js
(() => { const s = new URLSearchParams('a=1&b=2&a=3'); s.set('a', '9'); return s.toString(); })()
```

**30.** Що лишиться після `delete('a')`?

```js
(() => { const s = new URLSearchParams('a=1&b=2&a=3'); s.delete('a'); return s.toString(); })()
```

**31.** Що поверне `Object.fromEntries`?

```js
Object.fromEntries(new URLSearchParams('a=1&b=2&a=3'))
```

**32.** Що поверне `toString()` для масиву у значенні?

```js
new URLSearchParams({ a: [1, 2] }).toString()
```

**33.** Напишіть код, який за допомогою `URL` і `searchParams` збудує адресу `https://api.site.com/search` з параметрами `q=кіт` і `lang=uk`. Що дасть `href`?

```js
const u = new URL('https://api.site.com/search')
u.searchParams.set('q', 'кіт')
u.searchParams.set('lang', 'uk')
u.href
```

**34.** Розробник написав шаблон `` `/search?q=${value}` `` і підставив `value = 'a&b'`. Який рядок запиту отримає сервер, скільки там параметрів і як виправити?

**35.** Що поверне вираз із подвійним кодуванням?

```js
encodeURIComponent(encodeURIComponent('a b'))
```

**36.** Що станеться при `decodeURIComponent('%')`?

**37.** Що буде в `href` після присвоєння шляху?

```js
(() => { const u = new URL('https://a.com'); u.pathname = '/привіт'; return u.href; })()
```

**38.** До якого вигляду `URL` нормалізує адресу?

```js
new URL('HTTPS://ExAmPle.COM:443/a/./b/../c').href
```

**39.** Як зберігається слеш, закодований як `%2F`: скільки сегментів у шляху (`pathname.split('/')` без порожнього першого)?

```js
(() => { const p = new URL('https://a.com/a%2Fb').pathname; return [p, p.split('/').slice(1).length]; })()
```

**40.** Що поверне `hostname` для кириличного домену?

```js
new URL('https://київ.укр').hostname
```

### Рівень 4. Заголовки, fetch, Axios і власні функції

**41.** Що поверне `get('x')` після двох `append`?

```js
(() => { const h = new Headers(); h.append('X', 'a'); h.append('x', 'b'); return h.get('X'); })()
```

**42.** У якому порядку й регістрі перелічує заголовки `[...h]`?

```js
(() => { const h = new Headers(); h.set('Content-Type', 'text/plain'); h.set('Accept', '*/*'); return [...h]; })()
```

**43.** Сервер відповів статусом 404. Чи відхилить `fetch` проміс? Що буде в `res.ok` і `res.status`?

**44.** Напишіть `getJson(url)`, що повертає розібраний JSON, а для статусів поза 200–299 кидає помилку з текстом `HTTP <код>`. Що отримаєте для успішного запиту до `/json?a=1` (поле `url`) і для статусу 500?

```js
async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

**45.** Який `Content-Type` `fetch` поставить автоматично для тіла: а) рядок `'text'`; б) `URLSearchParams`; в) `Blob` типу `image/png`; г) `FormData`?

**46.** Напишіть `buildUrl(base, path, params)`: масиви записуються повтором ключа, значення `null` і `undefined` пропускаються. Що поверне `buildUrl('https://a.com', '/s', { q: 'кіт & пес', tag: ['a', 'b'], n: null, page: 2 })`?

```js
function buildUrl(base, path, params = {}) {
  const u = new URL(path, base)
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    for (const x of [].concat(v)) u.searchParams.append(k, String(x))
  }
  return u.href
}
```

**47.** Який рядок запиту надішле Axios для `params: { tag: ['a', 'b'] }` за замовчуванням і з `paramsSerializer: { indexes: null }`?

**48.** Axios отримав відповідь 404. Чи буде це помилкою? Що в `error.code`, `error.response.status`, `error.response.data`?

**49.** Напишіть `fetchWithTimeout(url, ms)` через `AbortSignal.timeout`. Яке `error.name` отримаємо для запиту до повільного ендпоінта (відповідь через 1,5 с) з таймаутом 300 мс?

```js
const fetchWithTimeout = (url, ms) =>
  fetch(url, { signal: AbortSignal.timeout(ms) })
```

**50.** Напишіть `parseQuery(href)`: повертає об'єкт параметрів, а повторювані ключі збирає в масив. Що поверне `parseQuery('https://a.com/?a=1&b=two+words&a=3&a=5')`?

```js
function parseQuery(href) {
  const o = {}
  for (const [k, v] of new URL(href).searchParams) {
    if (k in o) o[k] = [].concat(o[k], v)
    else o[k] = v
  }
  return o
}
```

### Рівень 5. Fetch докладно

**51.** Що отримаємо від `fetch(url)`, якщо не писати `await`: `Response` чи щось інше?

**52.** Для яких статусів `res.ok` дорівнює `true`: 199, 200, 204, 299, 300, 404?

**53.** Що поверне `Response.error()`: `type` і `status`?

**54.** Двічі викликали `await r.json()` на тому самому `Response`. Що буде вдруге і що в `r.bodyUsed`?

**55.** Як прочитати тіло відповіді двічі? Що дасть код?

```js
const copy = res.clone()
const a = (await res.json()).method
const b = (await copy.json()).method
```

**56.** Сервер відповів статусом 204 без тіла. Що поверне `res.text()` і що станеться з `res.json()`?

**57.** Сервер надіслав тіло `{oops` із `Content-Type: application/json`. Що дасть `res.json()`?

**58.** Яку різницю дають методи `'patch'` і `'PATCH'` у `fetch`? Що бачить сервер для `'PATCH'`?

**59.** Що станеться при `fetch(url, { method: 'GET', body: 'x' })`?

**60.** Який `Content-Type` і `Content-Length` виставить `fetch` для тіла `new Uint8Array([1, 2, 3])`?

**61.** Кожен запит до `/delay` триває 100 мс. Скільки приблизно триватимуть три запити в циклі з `await` і через `Promise.all`?

**62.** Що поверне `Promise.allSettled([fetch(ok), fetch(недоступний)]).then(r => r.map(x => x.status))`? Чим відрізняється від `Promise.all`?

**63.** Запит до повільного ендпоінта скасовано трьома способами: `AbortSignal.timeout(50)`, `controller.abort()`, `controller.abort(new Error('custom'))`. Які `name` і `message` у помилок?

**64.** Сервер відповідає 302 з `Location: /echo`. Що отримаємо для `redirect` `'manual'`, `'follow'` (статус, `redirected`, шлях у `url`) і `'error'`?

**65.** Створили `new Request(url, { method: 'PUT' })` і викликали `fetch(rq, { method: 'POST' })`. Який метод побачить сервер?

**66.** Що дасть `Response.json({ a: 1 }, { status: 202 })`: `ok`, `status`, `content-type` і тіло?

**67.** Сервер надсилає `one\n`, `two\n`, `three\n` із паузами по 50 мс. Скільки частин отримає цикл `for await` по `res.body.pipeThrough(new TextDecoderStream())`, і що в них?

```js
for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
  parts.push(chunk)
}
```

**68.** Сервер віддає байти слова `cafe` із `é` (`0xE9`) і `charset=iso-8859-1`. Що поверне `res.text()` і як правильно прочитати?

```js
new TextDecoder('iso-8859-1').decode(await res.arrayBuffer())
```

**69.** Сервер надіслав тіло, стиснене gzip, із `Content-Encoding: gzip`. Що поверне `res.text()` і чи лишиться заголовок `content-encoding`?

**70.** Напишіть `fetchRetry`, що повторює запит для статусів 429/502/503/504 з паузою `base * 2 ** i` і не більше `retries` повторів. Сервер відповідає 503, 503, 200. Скільки спроб буде зроблено і який фінальний статус?

```js
async function fetchRetry(url, init, { retries = 3, base = 300 } = {}) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, init)
      if (res.ok || ![429, 502, 503, 504].includes(res.status)) return res
    } catch (e) {
      if (e.name === 'AbortError' || i >= retries) throw e
    }
    if (i >= retries) throw new Error('gave up')
    await new Promise(r => setTimeout(r, base * 2 ** i))
  }
}
```

### Відповіді

1. `'https:'`
2. `'localhost'`
3. `'3000'`
4. `''`
5. `'/docs/intro'`
6. `'?x=1&y=2'`
7. `'#top'`
8. `'https://a.com:8080'`
9. `["a.com:8080","a.com"]`
10. `'https://a.com/about'`
11. `'https://a.com/blog/img/a.png'`
12. `'https://a.com/list?page=2'`
13. `GET /p?x=1 HTTP/1.1`. Фрагмент на сервер **не** надсилається.
14. `false`
15. `'2'`
16. `null`
17. `["a","b","c"]`
18. `'q=cat&page=1'`
19. `'a%20b'`
20. `'a%26b%3Dc'`
21. `'%D0%9F'`
22. `'Київ'`
23. `'https://a.com/a%20b?x=1'`
24. `'q=a+b'`
25. `'a b c'`
26. `'a+b'`
27. `'%E2%82%AC'`
28. а) так; б) ні; в) ні; г) так
29. `'a=9&b=2'`
30. `'b=2'`
31. `{"a":"3","b":"2"}`
32. `'a=1%2C2'`
33. код вище; `href` → `https://api.site.com/search?q=%D0%BA%D1%96%D1%82&lang=uk`
34. `/search?q=a&b`: сервер бачить **два** параметри (`q=a` і `b=`). Виправлення: `/search?q=${encodeURIComponent(value)}` → `/search?q=a%26b`.
35. `'a%2520b'`
36. `URIError: URI malformed`
37. `'https://a.com/%D0%BF%D1%80%D0%B8%D0%B2%D1%96%D1%82'`
38. `'https://example.com/a/c'`
39. `["/a%2Fb",1]`
40. `'xn--b1alf1j.xn--j1amh'`
41. `'a, b'`
42. `[["accept","*/*"],["content-type","text/plain"]]`
43. Ні, проміс виконується: `res.ok` → `false`, `res.status` → `404`.
44. успіх: `url` → `/json?a=1`; статус 500: помилка `HTTP 500`.
45. а) `text/plain;charset=UTF-8`; б) `application/x-www-form-urlencoded;charset=UTF-8`; в) `image/png`; г) `multipart/form-data; boundary=…`.
46. `https://a.com/s?q=%D0%BA%D1%96%D1%82+%26+%D0%BF%D0%B5%D1%81&tag=a&tag=b&page=2`
47. за замовчуванням: `/json?tag%5B%5D=a&tag%5B%5D=b`; з `indexes: null`: `/json?tag=a&tag=b`.
48. Так, кидається `AxiosError`: `code` → `ERR_BAD_REQUEST`, `response.status` → `404`, `response.data` → `{"error":"nope"}`.
49. `TimeoutError`
50. `{"a":["1","3","5"],"b":"two words"}`
51. `[object Promise]` — проміс; `Response` буде лише після `await`.
52. `true` лише для 200, 204 і 299 (діапазон 200–299).
53. `type` → `error`, `status` → `0`
54. `TypeError: Body is unusable: Body has already been read`; `bodyUsed` → `true`.
55. `clone()` робиться до читання; `a` → `GET`, `b` → `GET`.
56. `status` → `204`; `text()` → `''`; `json()` → `SyntaxError: Unexpected end of JSON input`.
57. `SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)`
58. `'PATCH'` → сервер бачить `PATCH`; `'patch'` не нормалізується до верхнього регістру (на відміну від `get`, `post`, `put`, `delete`), тому завжди пишіть метод великими літерами.
59. `TypeError: Request with GET/HEAD method cannot have body.`
60. `content-type` → `undefined` (не виставляється); `content-length` → `3`.
61. послідовно ≈ 300 мс (виміряно 309), паралельно ≈ 100 мс (виміряно 109).
62. `["fulfilled","rejected"]`; `Promise.all` відхилився б на першій помилці.
63. 1) `TimeoutError: The operation was aborted due to timeout`; 2) `AbortError: This operation was aborted`; 3) `Error: custom`
64. `manual`: статус `302`, `Location` → `/echo`; `follow`: статус `200`, `redirected` → `true`, `url` закінчується на `/echo`; `error`: `TypeError: fetch failed`.
65. `POST` — `init` перекриває поля `Request`.
66. `ok` → `true`, `status` → `202`, `content-type` → `application/json`, тіло → `{"a":1}`.
67. 3 частини: `["one\n","two\n","three\n"]`.
68. `text()` → `"caf�"` (завжди UTF-8); правильно → `"café"`.
69. `"compressed hello"`; `content-encoding` → `gzip`.
70. 3 спроби, статус `200`.
