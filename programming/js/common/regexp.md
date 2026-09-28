# RegExp — регулярні вирази в JavaScript

## 1. Що таке RegExp

Регулярний вираз (regular expression) — **шаблон** для пошуку, перевірки й заміни тексту. У JS це об'єкт `RegExp`, який зберігає:

- `source` — текст шаблону;
- `flags` — прапорці, що змінюють поведінку (`d`, `g`, `i`, `m`, `s`, `u`, `v`, `y`);
- `lastIndex` — позицію, з якої продовжити пошук (розділ 7 — пастка!).

Коли використовувати: валідація формату, вилучення частин тексту, складна заміна, розбиття за шаблоном. Коли **не** використовувати:

- для простого пошуку підрядка — `includes`/`startsWith` ([String.md](data-structures/String/String.md));
- для розбору HTML/JSON/вкладених структур — потрібен справжній парсер.

```js
const re = /ab+c/gi;
console.log(re.source); // ab+c
console.log(re.flags); // gi
console.log(re.global, re.ignoreCase); // true true
console.log(typeof re, re instanceof RegExp); // object true
```

## 2. Створення: літерал і конструктор

### 2.1. Літерал `/шаблон/прапорці`

Шаблон відомий під час написання коду; рушій розбирає його разом з кодом.

```js
const literal = /\d+/g;
```

### 2.2. Конструктор `new RegExp(рядок, прапорці)` — коли шаблон динамічний

```js
const dynamic = new RegExp("\\d+", "g"); // ⚠️ подвійний слеш: спершу екранується сам рядок
console.log(literal.source === dynamic.source); // true
```

Пастка: у звичайному рядковому літералі `\d` перетворюється просто на `d` — слеш «з'їдає» рядок, а не регекс:

```js
console.log(new RegExp("\d+").source); // d+ — не те, що хотіли
console.log(new RegExp("\\d+").source); // \d+ — правильно
console.log(String.raw`\d+` === "\\d+"); // true — String.raw не обробляє слеші
```

### 2.3. Копіювання з іншими прапорцями

```js
console.log(new RegExp(/abc/g, "i").flags); // i — прапорці ЗАМІНЮЮТЬСЯ, а не додаються
console.log(new RegExp(/abc/g).flags); // g — без другого аргументу успадковуються
```

### 2.4. Екранування користувацького вводу — обов'язково!

Спецсимволи `. * + ? ^ $ { } ( ) | [ ] \ /` мають особливе значення:

```js
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
console.log(escapeRegExp("1+1=2 (ok?)")); // 1\+1=2 \(ok\?\)

const userInput = "a.b";
console.log(new RegExp(userInput).test("axb")); // true — "." збіглася з будь-яким символом!
console.log(new RegExp(escapeRegExp(userInput)).test("axb")); // false — шукає саме "a.b"
```

Неекранований ввід — не лише баг, а й уразливість (розділ 10, ReDoS). У новіших рушіях є вбудований `RegExp.escape()` (ES2025), але поки його підтримують не всі середовища, власна функція надійніша.

### 2.5. Композиція шаблону з частин через `.source`

```js
const operatorCode = /\d{2}/;
const phone = new RegExp(`^\\+380${operatorCode.source}\\d{7}$`);
console.log(phone.source); // ^\+380\d{2}\d{7}$
console.log(phone.test("+380501234567")); // true — 380 + 2 цифри коду + 7 цифр номера
```

> [!note] Виправлення відносно попередньої версії
> Раніше тут був шаблон `^\+380\d{3}\d{4}$` — він приймав лише 7 цифр після `+380`, тож для `"+380501234567"` (9 цифр) повертав `false`, а не `true`.

## 3. Прапорці (flags)

**`g` — global**: шукати всі збіги, а не лише перший.

```js
console.log("a1b2c3".match(/\d/)[0]); // 1 — лише перший (разом з index, groups...)
console.log("a1b2c3".match(/\d/g)); // [ '1', '2', '3' ] — усі
```

**`i` — ignore case**: без урахування регістру.

```js
console.log(/hello/i.test("HeLLo")); // true
```

**`m` — multiline**: `^` і `$` збігаються на межах **кожного рядка**, а не всього тексту.

```js
const text = "first\nsecond\nthird";
console.log(text.match(/^./g)); // [ 'f' ]
console.log(text.match(/^./gm)); // [ 'f', 's', 't' ]
```

**`s` — dotAll**: крапка збігається і з `\n` (за замовчуванням — ні).

```js
console.log(/a.b/.test("a\nb")); // false
console.log(/a.b/s.test("a\nb")); // true
```

**`u` — unicode**: коректна робота з символами поза BMP (емодзі тощо), `\u{1F600}`, `\p{...}` (розділ 12).

```js
console.log("😀".length); // 2 — два UTF-16 code unit
console.log(/^.$/.test("😀")); // false — без u крапка бачить лише половину емодзі
console.log(/^.$/u.test("😀")); // true
```

**`y` — sticky**: збіг **мусить** починатися рівно з `lastIndex` (токенізатори, лексери).

```js
const sticky = /\d/y;
sticky.lastIndex = 1;
console.log(sticky.test("a1")); // true — на позиції 1 стоїть цифра
sticky.lastIndex = 0;
console.log(sticky.test("a1")); // false — на позиції 0 стоїть "a"
```

**`d` — indices**: додає позиції початку/кінця кожної групи.

```js
const withIndices = /(\d+)-(\d+)/d.exec("tel: 12-34");
console.log(withIndices.indices[0]); // [ 5, 10 ]
console.log(withIndices.indices[1]); // [ 5, 7 ]
```

**`v` — unicodeSets (ES2024)**: розширення `u` з операціями над класами (`[\p{L}--[a-z]]` — різниця, `[A&&B]` — перетин) і рядковими властивостями емодзі. Це суворіший режим: `u` і `v` разом вказувати не можна.

```js
console.log(/[\p{L}--[a-z]]/v.test("a")); // false — малі латинські виключені
console.log(/[\p{L}--[a-z]]/v.test("Я")); // true
```

## 4. Методи: test, exec і методи рядків

### 4.1. `regex.test(str)` → boolean

Найпростіша перевірка «чи є збіг».

```js
console.log(/\d/.test("abc1")); // true
```

### 4.2. `regex.exec(str)` → масив збігу з деталями або `null`

```js
const m = /(\d{4})-(\d{2})/.exec("date 2024-03-15");
console.log(m[0]); // 2024-03 — увесь збіг
console.log(m[1], m[2]); // 2024 03 — групи
console.log(m.index); // 5 — позиція збігу
console.log(m.input); // date 2024-03-15
console.log(/\d/.exec("abc")); // null
```

### 4.3. `str.match(regex)`

- без `g` → як `exec` (з групами та `index`);
- з `g` → масив **усіх** збігів (без груп) або `null`.

```js
console.log("a1b22".match(/\d+/g)); // [ '1', '22' ]
console.log("abc".match(/\d/g)); // null — не порожній масив! ⚠️
console.log("abc".match(/\d/g) ?? []); // [] — безпечний варіант
```

### 4.4. `str.matchAll(regex)` → ітератор усіх збігів з групами (потрібен `g`)

```js
const iso = "2024-03-15, 2025-01-02";
for (const match of iso.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) {
  console.log(match[0], "→ year", match[1], "month", match[2], "index", match.index);
}
// 2024-03-15 → year 2024 month 03 index 0
// 2025-01-02 → year 2025 month 01 index 12
console.log([..."a1b2".matchAll(/\d/g)].map((x) => x[0])); // [ '1', '2' ]
try {
  "a1".matchAll(/\d/); // без g
} catch (err) {
  console.log(err.name); // TypeError
}
```

(Ітератори — [iterator.md](data-structures/iterator/iterator.md).)

### 4.5. `str.search(regex)` → індекс першого збігу або `-1`

```js
console.log("abc123".search(/\d/)); // 3
```

`replace`/`replaceAll` — розділ 8, `split` — розділ 11.

## 5. Синтаксис: класи символів, якорі, квантифікатори

### 5.1. Класи символів

| Запис | Значення |
|---|---|
| `.` | будь-який символ, крім кінця рядка (з `s` — включно з ним) |
| `\d` / `\D` | цифра / не цифра — `[0-9]` |
| `\w` / `\W` | «словесний» символ / ні — `[A-Za-z0-9_]` ⚠️ лише латиниця |
| `\s` / `\S` | пробільний / ні (пробіл, `\t`, `\n`, `\r`, …) |
| `[abc]` / `[^abc]` | один із символів / будь-який, **крім** |
| `[a-z]` | діапазон |

```js
console.log("кіт cat".match(/\w+/g)); // [ 'cat' ] — кирилиця НЕ входить у \w
console.log("кіт cat".match(/[а-яіїєґ]+/gi)); // [ 'кіт' ]
```

### 5.2. Якорі та межі

- `^` — початок рядка (з `m` — кожного рядка), `$` — кінець;
- `\b` — межа слова, `\B` — не межа (`\b` теж спирається на ASCII-`\w`).

```js
console.log(/^\d+$/.test("123")); // true
console.log(/^\d+$/.test("123abc")); // false — без якорів було б true:
console.log(/\d+/.test("123abc")); // true
console.log("cat concat".match(/\bcat\b/g)); // [ 'cat' ]
```

### 5.3. Квантифікатори

| Запис | Скільки разів |
|---|---|
| `*` | 0 або більше |
| `+` | 1 або більше |
| `?` | 0 або 1 |
| `{n}` | рівно n |
| `{n,}` | n або більше |
| `{n,m}` | від n до m |

```js
console.log("color colour".match(/colou?r/g)); // [ 'color', 'colour' ]
console.log("2 22 2222".match(/\b\d{2,3}\b/g)); // [ '22' ]
```

### 5.4. Жадібні (greedy) і ліниві (lazy) квантифікатори

За замовчуванням квантифікатор бере **якомога більше**; `?` після нього — **якомога менше**:

```js
const html = "<b>bold</b> and <i>italic</i>";
console.log(html.match(/<.+>/)[0]); // <b>bold</b> and <i>italic</i> — жадібно, усе одним збігом
console.log(html.match(/<.+?>/g)); // [ '<b>', '</b>', '<i>', '</i>' ] — ліниво
console.log(html.match(/<[^>]+>/g)); // [ '<b>', '</b>', '<i>', '</i>' ] — те саме, але без backtracking
```

### 5.5. Альтернація `|`

```js
console.log("cat dog bird".match(/cat|bird/g)); // [ 'cat', 'bird' ]
```

`|` має **найнижчий** пріоритет: `/^cat|dog$/` означає «`^cat`» АБО «`dog$`»:

```js
console.log(/^cat|dog$/.test("catfish")); // true — «^cat» збіглося
console.log(/^(cat|dog)$/.test("catfish")); // false — з групою правильно
```

### 5.6. Екранування

```js
console.log(/1\+1/.test("1+1")); // true
console.log(/[.]/.test("a")); // false — усередині [] крапка вже звичайний символ
console.log(/a\.b/.test("a.b")); // true
```

## 6. Групи та посилання назад

### 6.1. Захоплювальна група `(...)`

```js
console.log("Ivan Petrenko".replace(/(\S+) (\S+)/, "$2 $1")); // Petrenko Ivan
```

### 6.2. Незахоплювальна група `(?:...)` — групує, але не запам'ятовує

```js
console.log(/(?:ab)+/.exec("ababab").length); // 1 — лише увесь збіг
console.log(/(ab)+/.exec("ababab").length); // 2 — плюс зайва група 'ab'
```

### 6.3. Іменовані групи `(?<name>...)`

```js
const dateRe = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const { year, month, day } = "Date: 2024-03-15".match(dateRe).groups;
console.log(year, month, day); // 2024 03 15
console.log("2024-03-15".replace(dateRe, "$<day>.$<month>.$<year>")); // 15.03.2024
```

### 6.4. Посилання назад `\1` / `\k<name>` — повторити те, що зловила група

```js
console.log(/(\w)\1/.test("hello")); // true — "ll"
console.log("hello aabb".match(/(\w)\1/g)); // [ 'll', 'aa', 'bb' ]
console.log(/^(?<q>["']).*\k<q>$/.test(`"text"`)); // true — лапки парні
console.log(/^(?<q>["']).*\k<q>$/.test(`"text'`)); // false
```

### 6.5. Група, що не збіглася, дає `undefined`

```js
const opt = /(\d+)(px)?/.exec("12");
console.log(opt[1], opt[2]); // 12 undefined
```

### 6.6. Однакові імена груп у різних гілках альтернації (ES2025)

```js
const flexibleDate = /(?<y>\d{4})-\d\d|\d\d-(?<y>\d{4})/;
console.log(flexibleDate.exec("2024-03").groups.y, flexibleDate.exec("03-2024").groups.y); // 2024 2024
```

(Працює в Node 24 / Chrome 125+; у старіших рушіях — `SyntaxError`.)

## 7. lastIndex і «стан» g/y — головна пастка

З прапорцями `g` і `y` об'єкт `RegExp` **запам'ятовує** `lastIndex` — позицію після останнього збігу. `test()` і `exec()` починають наступний пошук саме з неї, тож **один і той самий** регекс дає різні результати на тих самих даних:

```js
const stateful = /a/g;
console.log(stateful.test("a")); // true — lastIndex стає 1
console.log(stateful.lastIndex); // 1
console.log(stateful.test("a")); // false — шукає з позиції 1, а там кінець
console.log(stateful.lastIndex); // 0 — після невдачі скинувся
console.log(stateful.test("a")); // true — і знову по колу
```

Типова помилка — регекс з `g`, оголошений поза функцією:

```js
const isDigit = /\d/g;
const check = (s) => isDigit.test(s);
console.log(check("1"), check("1")); // true false — ⚠️ баг!

// виправлення: прибрати g у test-перевірках (або створювати регекс усередині)
const isDigitOk = /\d/;
console.log(isDigitOk.test("1"), isDigitOk.test("1")); // true true
```

`exec` у циклі — класичний обхід усіх збігів (з `g`):

```js
const loop = /\d+/g;
const found = [];
let match;
while ((match = loop.exec("a1 b22 c333")) !== null) {
  found.push([match[0], match.index, loop.lastIndex]); // [збіг, index, lastIndex після збігу]
}
console.log(found); // [ [ '1', 1, 2 ], [ '22', 4, 6 ], [ '333', 8, 11 ] ]
```

Сучасніше й безпечніше — `matchAll` (розділ 4.4). Без `g` такий цикл **нескінченний**: `exec` щоразу повертає перший збіг. `str.match(/…/g)`, `replace`, `matchAll`, `split` самі скидають/копіюють `lastIndex`, а `test`/`exec` — ні.

## 8. Заміна: replace, replaceAll

### 8.1. Без `g` replace замінює лише перший збіг

```js
console.log("a-b-c".replace(/-/, "+")); // a+b-c
console.log("a-b-c".replace(/-/g, "+")); // a+b+c
console.log("a-b-c".replaceAll("-", "+")); // a+b+c — з рядком теж працює
try {
  "a-b".replaceAll(/-/, "+"); // регекс без g у replaceAll — помилка
} catch (err) {
  console.log(err.name); // TypeError
}
```

### 8.2. Спеціальні послідовності в рядку заміни

| Запис | Підставляє |
|---|---|
| `$&` | увесь збіг |
| `$1`…`$99` | групу за номером |
| `$<name>` | іменовану групу |
| `` $` `` | текст **до** збігу |
| `$'` | текст **після** збігу |
| `$$` | літерал `$` |

```js
console.log("cat".replace(/a/, "[$&]")); // c[a]t
console.log("cat".replace(/a/, "[$`|$']")); // c[c|t]t
console.log("100".replace(/\d+/, "$$$&")); // $100
```

Якщо рядок заміни приходить ззовні і може містити `$` — використовуйте функцію-замінник, її результат вставляється буквально:

```js
const price = "$5";
console.log("x".replace(/x/, price)); // $5 — тут пощастило
console.log("x".replace(/x/, "$&$&")); // xx — "$&" інтерпретовано!
console.log("x".replace(/x/, () => "$&$&")); // $&$& — функція повертає буквально
```

### 8.3. Функція-замінник `(match, p1, p2, ..., offset, string, groups)`

```js
console.log("a1b2".replace(/\d/g, (d) => d * 2)); // a2b4
console.log("2024-03-15".replace(/(\d+)-(\d+)-(\d+)/, (_, y, mo, d) => `${d}/${mo}/${y}`)); // 15/03/2024
console.log("hello world".replace(/\b\w/g, (c) => c.toUpperCase())); // Hello World
console.log(
  "2024-03-15".replace(dateRe, (...args) => {
    const groups = args.at(-1); // якщо є іменовані групи — вони ОСТАННІЙ аргумент
    return `${groups.day}.${groups.month}`;
  }),
); // 15.03
```

### 8.4. Шаблонізація — підстановка змінних

```js
const tpl = "Hi, {name}! You are {age}.";
const data = { name: "Olia", age: 20 };
console.log(tpl.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "")); // Hi, Olia! You are 20.
```

### 8.5. camelCase ↔ snake_case

```js
const toSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const toCamel = (s) => s.replace(/_(\w)/g, (_, c) => c.toUpperCase());
console.log(toSnake("userFirstName")); // user_first_name
console.log(toCamel("user_first_name")); // userFirstName
```

### 8.6. Розділювачі тисяч

```js
console.log("1234567.89".replace(/\B(?=(\d{3})+(?!\d))/g, ",")); // 1,234,567.89
```

Для реального коду краще `Intl.NumberFormat` ([math.md](math.md)).

## 9. Lookaround — перевірка контексту без «споживання» символів

Lookaround перевіряє, що стоїть поруч, але **не входить** у збіг:

| Запис | Значення |
|---|---|
| `(?=...)` | позитивний lookahead — далі йде `...` |
| `(?!...)` | негативний lookahead — далі **не** йде `...` |
| `(?<=...)` | позитивний lookbehind — перед цим стоїть `...` |
| `(?<!...)` | негативний lookbehind — перед цим **не** стоїть `...` |

```js
console.log("100$ 200€ 300$".match(/\d+(?=\$)/g)); // [ '100', '300' ] — числа перед $
console.log("100$ 200€".match(/\d+(?!\d|\$)/g)); // [ '200' ] — числа НЕ перед $
console.log("price: $5, cost: €7".match(/(?<=\$)\d+/g)); // [ '5' ] — цифри після $
console.log("foo.js bar.ts baz.js".match(/\w+(?=\.js)/g)); // [ 'foo', 'baz' ]
console.log("foobar foobaz".match(/foo(?!bar)\w+/g)); // [ 'foobaz' ]
console.log("cat scat".match(/(?<!s)cat/g)); // [ 'cat' ] — cat, перед яким немає "s"
```

У другому прикладі `(?!\d|\$)` потрібен саме з `\d`: для «100$» рушій відкочується на «10» і «1», але після них стоїть цифра, тож умова не виконується; «200» стоїть перед «€» — підходить.

Кілька lookahead поспіль — кілька незалежних умов, наприклад для пароля:

```js
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
console.log(strongPassword.test("Passw0rdX")); // true
console.log(strongPassword.test("password")); // false — немає великої літери й цифри
```

## 10. Катастрофічний backtracking (ReDoS)

Рушій шукає збіг перебором із **відкатом** (backtracking). Для деяких шаблонів кількість варіантів росте **експоненційно** з довжиною тексту — один запит може повісити event loop на секунди й хвилини ([asynchronous.md](asynchronous/asynchronous.md) — чому блокування потоку критичне). Це ReDoS-атака (Regular expression Denial of Service).

Небезпечні патерни — вкладені квантифікатори й альтернативи, що перетинаються: `(a+)+$`, `(a|aa)+$`, `(\w+\s?)*$`, `(.*a){x}`.

```js
function time(re, s) {
  const start = performance.now();
  re.test(s);
  return performance.now() - start;
}

const evil = /^(a+)+$/;
const safe = /^a+$/;
const attack = "a".repeat(24) + "!"; // майже збіг, який зрештою провалюється

console.log(time(safe, attack) < 5); // true — миттєво
console.log(time(evil, attack) > time(safe, attack) * 100); // true — на порядки повільніше
```

Виміряно в Node 24: 26 символів — ~0.4 с, 28 — ~1.7 с; кожен доданий символ подвоює час, тож на ~35 символах — кілька хвилин.

Як захищатись:

- не вкладайте квантифікатори: `(a+)+` → `a+`;
- уточнюйте класи: `[^"]*` замість `.*`;
- обмежуйте довжину вводу **до** застосування регексу;
- не будуйте регекс із неекранованого користувацького вводу;
- для критичних місць — рушії з лінійним часом (RE2, бібліотека `re2` для Node) або виконання з таймаутом у `worker_threads`;
- перевіряйте шаблони інструментами (`safe-regex`, `recheck`).

## 11. split та інші практичні задачі

### 11.1. split за шаблоном

```js
console.log("a, b;c  d".split(/[,;\s]+/)); // [ 'a', 'b', 'c', 'd' ]
console.log("2024-03-15".split(/-/)); // [ '2024', '03', '15' ]
console.log("a1b2c".split(/(\d)/)); // [ 'a', '1', 'b', '2', 'c' ] — група: роздільники ЗАЛИШАЮТЬСЯ
console.log("a1b2c".split(/\d/, 2)); // [ 'a', 'b' ] — ліміт кількості
```

### 11.2. Рядки з різними закінченнями

```js
console.log("a\r\nb\nc".split(/\r?\n/)); // [ 'a', 'b', 'c' ]
```

### 11.3. Усі числа з тексту

```js
console.log("price 12.5 and -3, discount 0.75".match(/-?\d+(?:\.\d+)?/g)); // [ '12.5', '-3', '0.75' ]
```

### 11.4. Розбір query-рядка

```js
const qs = "a=1&b=hello&c=";
const parsedQs = Object.fromEntries([...qs.matchAll(/([^&=]+)=([^&]*)/g)].map((x) => [x[1], x[2]]));
console.log(parsedQs); // { a: '1', b: 'hello', c: '' }
```

Для реальних URL — `URL`/`URLSearchParams`, а не регекси (вони ще й декодують `%20` та `+`).

### 11.5. Стискання пробілів

```js
console.log("  a   b  ".replace(/\s+/g, " ").trim()); // a b
```

### 11.6. Валідація формату (обережно з «ідеальними» регексами!)

```js
const hexColor = /^#(?:[0-9a-f]{3}){1,2}$/i;
console.log(hexColor.test("#fff"), hexColor.test("#a1b2c3"), hexColor.test("#ffff")); // true true false

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
console.log(uuid.test("550e8400-e29b-41d4-a716-446655440000")); // true

const simpleEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
console.log(simpleEmail.test("user@example.com"), simpleEmail.test("user@@example")); // true false
```

(Генерація UUID — `utils/uuid.js`.) Повна відповідність RFC 5322 регексом практично недосяжна; на практиці — проста перевірка формату плюс лист із підтвердженням.

### 11.7. Токенізатор на sticky (`y`)

```js
function tokenize(src) {
  const tokenRe = /\s*(?:(\d+)|([+\-*/()]))/y;
  const tokens = [];
  let pos = 0;
  while (pos < src.length) {
    tokenRe.lastIndex = pos;
    const t = tokenRe.exec(src);
    if (!t) throw new SyntaxError(`Unexpected character at position ${pos}`);
    tokens.push(t[1] !== undefined ? { num: Number(t[1]) } : { op: t[2] });
    pos = tokenRe.lastIndex;
  }
  return tokens;
}
console.log(tokenize("12 + (3*4)").map((t) => t.num ?? t.op).join(" ")); // 12 + ( 3 * 4 )
try {
  tokenize("1 + x");
} catch (err) {
  console.log(err.message); // Unexpected character at position 3
}
```

## 12. Unicode і тексти іншими мовами

### 12.1. `\p{...}` замість `\w` для не-латинських літер

`\w`, `\b`, `\d` орієнтовані на ASCII. Для інших мов — властивості Unicode `\p{...}` (потрібен `u` або `v`):

| Запис | Значення |
|---|---|
| `\p{L}` | будь-яка літера |
| `\p{Lu}` / `\p{Ll}` | велика / мала літера |
| `\p{N}` | цифра |
| `\p{P}` | пунктуація |
| `\p{Script=Cyrillic}` | символи кирилиці |
| `\p{Emoji_Presentation}` | емодзі |

```js
console.log("Привіт, world! 123".match(/\p{L}+/gu)); // [ 'Привіт', 'world' ]
console.log("Привіт".match(/\p{Script=Cyrillic}+/u)[0]); // Привіт
console.log("ААа".match(/\p{Lu}/gu)); // [ 'А', 'А' ]
console.log("a😀b🎉".match(/\p{Emoji_Presentation}/gu)); // [ '😀', '🎉' ]
```

Нюанс: з прапорцями `i` і `u` одночасно `\w` перестає бути суто ASCII — case folding додає до нього `ſ` (U+017F, «довге s») і `K` (U+212A, знак Кельвіна). Кирилиця туди все одно не потрапляє:

```js
console.log(/\w/i.test("ſ"), /\w/iu.test("ſ"), /\w/iu.test("ж")); // false true false
```

### 12.2. Слово будь-якою мовою: замість `\b` — lookaround з `\p{L}`

```js
const wordRe = /(?<![\p{L}\p{N}])[\p{L}\p{N}]+(?![\p{L}\p{N}])/gu;
console.log("кіт, кішка; cat".match(wordRe)); // [ 'кіт', 'кішка', 'cat' ]
```

### 12.3. Регістр

Прапорець `i` працює і для кирилиці:

```js
console.log(/привіт/i.test("ПРИВІТ")); // true
```

### 12.4. Позиції — у UTF-16 code units, а не в символах

```js
console.log("😀a".search(/a/)); // 2 — а не 1: емодзі займає 2 code units
console.log("😀a".length); // 3
console.log([..."😀a"].length); // 2 — spread ітерує за code points
```

(Рядки й Unicode детально — [String.md](data-structures/String/String.md).)

### 12.5. Нормалізація: один символ може мати два записи

«й» буває одним code point (U+0439) або «и» + комбінований знак (U+0438 U+0306). Перед порівнянням — нормалізуйте:

```js
const composed = "й";
const decomposed = "й";
console.log(composed === decomposed); // false — хоча на екрані однакові
console.log(composed === decomposed.normalize("NFC")); // true
```

## 13. Продуктивність і практичні поради

- Не створюйте `new RegExp(...)` з тим самим шаблоном у гарячому циклі — виносьте за цикл або кешуйте ([factory.md](../patterns/factory.md) — кешування).
- `test()` дешевший за `match()`/`exec()`, коли потрібен лише boolean.
- Прості перевірки — `startsWith`/`endsWith`/`includes`: швидші й читабельніші (але міряйте, а не вгадуйте — [performance/](../performance/)).
- Якорі `^` `$` скорочують пошук: без якоря рушій пробує кожну позицію.
- Специфічні класи (`[^"]*`) швидші й безпечніші за `.*?`.
- Складний регекс збирайте з частин через `.source` (розділ 2.5) або коментуйте кожну групу — довгий шаблон в один рядок — борг читабельності.
- Тестуйте на «поганих» даних: порожній рядок, дуже довгий рядок, Unicode, пробіли на краях, `\r\n`.

## 14. Типові помилки

1. Забули `^` і `$` при валідації — `"abc123def"` пройде `/\d+/`:

   ```js
   console.log(/\d+/.test("abc123def"), /^\d+$/.test("abc123def")); // true false
   ```

2. Регекс з `g` + `test`/`exec` → стан у `lastIndex` (розділ 7).
3. `match(/…/g)` повертає `null`, а не `[]` (розділ 4.3).
4. Неекранований ввід у `new RegExp` (розділ 2.4) — баги й ReDoS.
5. `\w` і `\b` не розуміють кирилицю (розділи 5.1, 12.1).
6. `.` не збігається з `\n` без прапорця `s`.
7. Жадібність: `.*` «з'їдає» більше, ніж треба (розділ 5.4).
8. Парсинг HTML/JSON/вкладених дужок регексом: регулярні вирази не вміють рахувати вкладеність — потрібен парсер (`DOMParser`, cheerio, `JSON.parse`).
9. Порівняння регексів: `/a/ === /a/` — `false`, бо це різні об'єкти ([type-coercion.md](type-coercion.md)); порівнюйте `.source` і `.flags`:

   ```js
   console.log(/a/ === /a/, /a/.source === /a/.source); // false true
   ```

10. `/` усередині літерала треба екранувати: `/a\/b/` (або `new RegExp("a/b")`):

    ```js
    console.log(/a\/b/.test("a/b")); // true
    ```

## Підсумок

- RegExp — об'єкт-шаблон (`source` + `flags` + `lastIndex`); літерал `/.../flags` або `new RegExp(рядок, flags)`; у рядку слеші подвоюються (`"\\d"`), користувацький ввід екранується.
- Прапорці: `g` (усі збіги), `i` (регістр), `m` (`^`/`$` для кожного рядка), `s` (крапка з `\n`), `u` (Unicode), `v` (unicodeSets), `y` (sticky), `d` (indices).
- Методи: `test` (boolean), `exec` (деталі збігу), `str.match` (без `g` — як `exec`; з `g` — масив або `null`!), `matchAll` (ітератор з групами, потрібен `g`), `replace`/`replaceAll`, `split`, `search`.
- Синтаксис: класи (`\d \w \s . [...]`), якорі (`^ $ \b`), квантифікатори (`* + ? {n,m}`), жадібні vs ліниві (`+?`), альтернація `|` з найнижчим пріоритетом — беріть у групу.
- Групи: `(...)` захоплювальна, `(?:...)` незахоплювальна, `(?<name>...)` іменована (`$<name>`, `groups.name`), `\1` / `\k<name>` — посилання назад.
- Lookaround `(?=)` `(?!)` `(?<=)` `(?<!)` перевіряє контекст, не входячи в збіг.
- Пастка `lastIndex`: регекс із `g`/`y` має стан, тож `test`/`exec` дають різні результати на однакових даних.
- У `replace` використовуйте функцію, коли рядок заміни може містити `$`; спецпослідовності: `$&` `$1` `$<name>` `` $` `` `$'` `$$`.
- `\w`, `\d`, `\b` орієнтовані на ASCII; для інших мов — `\p{L}` з прапорцем `u`/`v`.
- ReDoS: вкладені квантифікатори (`(a+)+`) дають експоненційний backtracking і блокують event loop; обмежуйте ввід, уточнюйте класи.
- Регекси не парсять вкладені структури (HTML, JSON); для простих перевірок `includes`/`startsWith` кращі за регекс.
