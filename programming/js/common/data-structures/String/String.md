# String — примітивний, незмінний (immutable) тип для тексту

## 1. Що таке String, і чому у нього є методи, якщо це примітив

Рядок — примітивний тип (`typeof "abc" === "string"`), а не об'єкт. Але при виклику методу (наприклад, `"abc".toUpperCase()`) рушій автоматично й тимчасово «обгортає» примітив в об'єкт-обгортку (Wrapper) — `new String("abc")` — викликає метод, і одразу відкидає цю тимчасову обгортку. Саме тому `"abc".length` працює, хоча `"abc"` — не об'єкт.

```js
const str = "hello";
console.log(typeof str); // "string" — примітив
console.log(str.toUpperCase()); // "HELLO" — метод все одно спрацював
console.log(str instanceof String); // false — сам примітив не є екземпляром String

// new String() створює справжній об'єкт-обгортку — так робити не варто:
const wrappedStr = new String("hello");
console.log(typeof wrappedStr); // "object" — вже не примітив!
console.log(wrappedStr instanceof String); // true
console.log(wrappedStr == "hello"); // true — == приводить типи
console.log(wrappedStr === "hello"); // false — різні типи, === їх не зрівняє
```

## 2. Рядки незмінні (immutable) — ключова відмінність від масивів

Жоден метод `String` не змінює оригінальний рядок — усі повертають новий рядок. Навіть пряме звернення до «індексу» рядка на запис мовчки ігнорується (у нестрогому режимі).

```js
const immutableStr = "hello";
immutableStr[0] = "H"; // мовчки ігнорується — рядки не можна мутувати "на місці"
console.log(immutableStr); // "hello" — без змін

const upper = immutableStr.toUpperCase();
console.log(immutableStr, upper); // "hello" "HELLO" — оригінал незмінний, повернено новий рядок

// саме тому "накопичення" рядка в циклі через += створює багато
// проміжних рядків у пам'яті — для великих обсягів даних ефективніше
// збирати масив шматків і робити join() в кінці
// (детально, з реальними вимірами — performance/11-string-concatenation.md):
const parts = [];
for (let i = 0; i < 5; i++) {
  parts.push(`part${i}`);
}
console.log(parts.join(" ")); // "part0 part1 part2 part3 part4"
```

## 3. Створення рядків

```js
// а) string literal — одинарні / подвійні лапки (функціонально ідентичні)
const single = "text";
const double = "text";

// б) template literal (шаблонні рядки, ES6) — зворотні лапки:
// підтримують інтерполяцію ${...} і багаторядковість без \n
const name = "Oleg";
const age = 25;
const templateStr = `My name is ${name}, I am ${age} years old. Total: ${age + 1}`;
console.log(templateStr);

const multilineStr = `line 1
line 2
line 3`;
console.log(multilineStr); // зберігає реальні переноси рядків

// в) String(value) — приведення будь-якого значення до рядка
console.log(String(123)); // "123"
console.log(String(true)); // "true"
console.log(String(null)); // "null"
console.log(String(undefined)); // "undefined"
console.log(String([1, 2, 3])); // "1,2,3"

// г) tagged template — функція перед `` обробляє шаблонний рядок вручну
function highlight(strings, ...values) {
  return strings.reduce((result, str, i) => `${result}${str}${values[i] ? `[${values[i]}]` : ""}`, "");
}
console.log(highlight`Hello, ${name}! You are ${age} years old.`);
// "Hello, [Oleg]! You are [25] years old."
```

## 4. Доступ до символів: str[index] / str.charAt(index) / str.at(index)

```js
const accessStr = "JavaScript";
console.log(accessStr[0]); // "J"
console.log(accessStr.charAt(0)); // "J" — старіший спосіб, той самий результат
console.log(accessStr[100]); // undefined — індекс поза межами
console.log(accessStr.charAt(100)); // "" — charAt() повертає порожній рядок, а не undefined

console.log(accessStr.at(-1)); // "t" — негативні індекси (ES2022), як і в масивів
console.log(accessStr[-1]); // undefined — звичайний доступ через [] так не вміє
```

## 5. str.length — довжина рядка (у UTF-16 code units, не завжди «символах»!)

```js
console.log("hello".length); // 5

// пастка: емодзі та деякі інші символи займають два "code units"
// (сурогатна пара) — length рахує саме code units, а не "видимі символи":
console.log("😀".length); // 2 — хоча це один видимий символ!
console.log([..."😀"].length); // 1 — а через ітерацію (spread) — коректно
console.log(Array.from("a😀b").length); // 3 — Array.from теж рахує коректно
```

## 6. Методи пошуку й перевірки

```js
// includes(substring) — чи містить рядок підрядок
console.log("Hello World".includes("World")); // true
console.log("Hello World".includes("world")); // false — регістрозалежно

// startsWith(substring) / endsWith(substring)
console.log("Hello World".startsWith("Hello")); // true
console.log("Hello World".endsWith("World")); // true
console.log("Hello World".startsWith("World", 6)); // true — з позиції 6

// indexOf(substring) / lastIndexOf(substring)
const searchStr = "one two one three";
console.log(searchStr.indexOf("one")); // 0 — перше входження
console.log(searchStr.lastIndexOf("one")); // 8 — останнє входження
console.log(searchStr.indexOf("nothing")); // -1 — не знайдено

// search(regexpOrString) — пошук за регулярним виразом
console.log("Hello World 2026".search(/\d+/)); // 12 — індекс першого збігу з числом

// match(regexp) / matchAll(regexp) — витягнути збіги за regex
const dateStr = "Dates: 2026-01-01 and 2026-12-31";
console.log(dateStr.match(/\d{4}-\d{2}-\d{2}/)); // масив: перший збіг + метадані (index, input тощо)
console.log(dateStr.match(/\d{4}-\d{2}-\d{2}/g)); // ["2026-01-01", "2026-12-31"] — з флагом g: усі збіги

// matchAll() — повертає ітератор з деталями кожного збігу (обов'язково з флагом /g):
for (const m of dateStr.matchAll(/\d{4}-\d{2}-\d{2}/g)) {
  console.log(m[0], "at position", m.index);
}
```

## 7. Методи видобування частини рядка

```js
// slice(start, end) — вирізає підрядок, підтримує негативні індекси
const sliceStr = "JavaScript";
console.log(sliceStr.slice(0, 4)); // "Java"
console.log(sliceStr.slice(-6)); // "Script" — з кінця
console.log(sliceStr.slice(4)); // "Script" — до кінця

// substring(start, end) — схожий на slice(), але не підтримує негативні індекси
console.log(sliceStr.substring(0, 4)); // "Java" — так само, як slice()
console.log(sliceStr.substring(-6)); // "JavaScript" — негативний трактується як 0!
// substring() ще й міняє місцями start/end, якщо start > end:
console.log(sliceStr.substring(4, 0)); // "Java" — те саме, що substring(0, 4)
// рекомендація: у сучасному коді використовуй slice() — substring()
// залишений здебільшого для сумісності зі старим кодом

// substr(start, length) — застарілий (deprecated), уникай у новому коді
console.log(sliceStr.substr(4, 6)); // "Script" — start + кількість символів (не end!)
// офіційно позначений як legacy у специфікації — замість нього slice()
```

## 8. Методи трансформації регістру й пробілів

```js
// toUpperCase() / toLowerCase()
console.log("Hello".toUpperCase()); // "HELLO"
console.log("Hello".toLowerCase()); // "hello"

// локалізовані версії — важливі для мов зі спецсимволами регістру
// (наприклад, турецька "İ"/"i"):
console.log("İstanbul".toLocaleLowerCase("tr")); // "istanbul" — коректно для турецької локалі

// trim() / trimStart() / trimEnd()
const paddedStr = "   spaces around   ";
console.log(`"${paddedStr.trim()}"`); // "spaces around" — з обох боків
console.log(`"${paddedStr.trimStart()}"`); // "spaces around   " — лише зліва
console.log(`"${paddedStr.trimEnd()}"`); // "   spaces around" — лише справа

// padStart(targetLength, padString) / padEnd(targetLength, padString)
console.log("5".padStart(3, "0")); // "005" — типове застосування: форматування чисел
console.log("5".padEnd(3, "0")); // "500"
console.log("abc".padStart(6, "12")); // "121abc" — заповнювач повторюється й обрізається
```

> ⚠️ Оригінальний файл стверджував, що `"abc".padStart(6, "12")` дає `"123abc"`. Насправді `padStart` бере заповнювач `"12"`, повторює його стільки, скільки потрібно для нестачі довжини (тут — 3 символи: `"12"+"12"` → `"1212"`), і обрізає до потрібної довжини зліва — тобто перші 3 символи `"121"`, а не `"123"`. Результат — `"121abc"`. Класична пастка: заповнювач саме повторюється циклічно, а не рахується як послідовність цифр.

## 9. Методи зміни вмісту (повертають новий рядок)

```js
// replace(searchValue, replacement) — замінює перше входження
console.log("one two one".replace("one", "1")); // "1 two one" — лише перше входження
console.log("one two one".replace(/one/g, "1")); // "1 two 1" — з флагом /g — усі входження

// replacement може бути функцією — обчислюється для кожного збігу:
console.log("john SMITH".replace(/\b\w/g, (char) => char.toUpperCase()));
// "John SMITH" — велика перша буква кожного слова (перше слово)

// replaceAll(searchValue, replacement) — замінює усі входження (ES2021)
console.log("one two one".replaceAll("one", "1")); // "1 two 1" — без потреби у /g
// replaceAll() з рядковим searchValue (не regex) завжди замінює всі
// входження — на відміну від replace(), якому для цього обов'язково
// потрібен regex з флагом /g:
// "one two one".replaceAll(/one/, "1"); // TypeError: без /g кине помилку для regex

// concat(...strings) — об'єднання рядків (рідко використовують, є +)
console.log("Hello".concat(" ", "World")); // "Hello World"
console.log("Hello" + " " + "World"); // "Hello World" — ідіоматичніше

// repeat(count) — повторює рядок N разів
console.log("ab".repeat(3)); // "ababab"
console.log("-".repeat(20)); // роздільник для консольного виводу
// "x".repeat(-1); // RangeError: Invalid count value — від'ємне число заборонено
```

## 10. Розбиття та з'єднання

```js
// split(separator, limit) — розбиває рядок у масив
console.log("a,b,c".split(",")); // ["a", "b", "c"]
console.log("a,b,c".split(",", 2)); // ["a", "b"] — limit обмежує кількість елементів
console.log("hello".split("")); // ["h", "e", "l", "l", "o"] — по кожному символу
console.log("one   two three".split(/\s+/)); // ["one", "two", "three"] — regex-роздільник

// зворотна операція — Array.prototype.join():
console.log(["a", "b", "c"].join("-")); // "a-b-c"
```

## 11. Порівняння рядків

Звичайні оператори `<`/`>` порівнюють рядки посимвольно за кодами символів (як у ASCII/Unicode) — це може давати «неправильний» з точки зору людини порядок для не-англійських алфавітів. `localeCompare()` порівнює коректно, з урахуванням локалі/алфавіту.

```js
console.log("а" < "Б"); // true чи false залежно від кодів символів — ненадійно для кирилиці
console.log("apple".localeCompare("banana")); // від'ємне число — "apple" перед "banana"
console.log(["cherry", "apple", "banana"].sort((a, b) => a.localeCompare(b)));
// ["apple", "banana", "cherry"] — коректний алфавітний порядок
```

## 12. Unicode та кодування

```js
// charCodeAt(index) / codePointAt(index) — код символу
console.log("A".charCodeAt(0)); // 65 — UTF-16 code unit
console.log("😀".charCodeAt(0)); // 55357 — лише половина сурогатної пари, "зламано"
console.log("😀".codePointAt(0)); // 128512 — повний, коректний код символу (ES6)

// String.fromCharCode() / String.fromCodePoint() — код → символ
console.log(String.fromCharCode(65, 66, 67)); // "ABC"
console.log(String.fromCodePoint(128512)); // "😀" — коректно для символів поза BMP

// normalize() — нормалізація Unicode-форми (важливо для порівняння)
// один і той самий видимий символ можна закодувати різними послідовностями
// code points (наприклад, "é" як один символ або як "e" + окремий діакритичний знак):
const composed = "\u00e9"; // "é" як U+00E9, один code point
const decomposed = "e\u0301"; // "e" + U+0301 (комбінований діакритичний знак)
console.log(composed === decomposed); // false — виглядають однаково, а не рівні!
console.log(composed.normalize() === decomposed.normalize()); // true — після нормалізації рівні
```

## 13. Рядок є iterable — працює for...of / spread

Ітерація по символах коректно враховує Unicode, на відміну від `length`/`str[i]`.

```js
for (const char of "hi😀") {
  console.log(char); // "h", "i", "😀" — емодзі як один символ, а не дві "половинки"
}
console.log([..."hi😀"]); // ["h", "i", "😀"]

// класичний трюк для розвороту рядка з коректною Unicode-підтримкою:
function reverseString(s) {
  return [...s].reverse().join("");
}
console.log(reverseString("hello")); // "olleh"
console.log(reverseString("a😀b")); // "b😀a" — емодзі не "розбилось" на половинки
```

## 14. Пастки й важливі нюанси

```js
// == vs === для String-обгорток
console.log("abc" === "abc"); // true — примітиви порівнюються за значенням
console.log(new String("abc") === "abc"); // false — обгортка це об'єкт, інший тип
console.log(new String("abc") === new String("abc")); // false — різні об'єкти в пам'яті
// тому: ніколи не створюй рядки через new String() — лише через
// літерали ("...") чи String(value) для приведення типів.

// порівняння через < > — лексикографічне, не "за довжиною"
console.log("10" < "9"); // true — порівнюються посимвольно: "1" < "9"
console.log(10 < 9); // false — а для чисел усе навпаки
// та сама пастка, що й у Array.prototype.sort() без компаратора
// (common/data-structures/Array/Array.md)

// порожній рядок — falsy значення
console.log(Boolean("")); // false
console.log(Boolean(" ")); // true — рядок із пробілом не порожній!
if ("") console.log("not printed");
if (" ") console.log("printed — string with a space is truthy");
```

## 15. Рівні «символа» в Unicode: code unit, code point, grapheme

Слово «символ» неоднозначне. У JavaScript є **три рівні**:

| Рівень | Що це | Як отримати |
|---|---|---|
| **UTF-16 code unit** | 16-бітна одиниця, у якій рядок зберігається | `str.length`, `str[i]`, `charCodeAt` |
| **Code point** | абстрактний номер символа Unicode (до `U+10FFFF`) | `[...str]`, `for…of`, `codePointAt`, `fromCodePoint` |
| **Grapheme cluster** | те, що людина бачить як ОДИН символ (може складатися з кількох code points) | `Intl.Segmenter` |

```js
"A".length;            // 1   (1 code unit, 1 code point, 1 grapheme)
"😀".length;           // 2   (2 code units — сурогатна пара)
[..."😀"].length;      // 1   (1 code point)

"🇺🇦".length;          // 4   (прапор = 2 code points × 2 code units)
[..."🇺🇦"].length;     // 2   (2 code points: регіональні індикатори U+1F1FA U+1F1E6)

"👨‍👩‍👧".length;        // 8   (сім'я: 3 емодзі, зв'язані «склеювачем» ZWJ)
[..."👨‍👩‍👧"].length;   // 5   (3 емодзі + 2 ZWJ)
// а видимий символ — один: 1 grapheme
```

Перевірено запуском: `length` для сім'ї — 8, `[...str].length` — 5, а `Intl.Segmenter` дає **1** кластер.

**Як порахувати «видимі символи»:**

```js
const graphemes = (s) =>
  [...new Intl.Segmenter("uk", { granularity: "grapheme" }).segment(s)].map((x) => x.segment);

graphemes("a👨‍👩‍👧🇺🇦").length;   // 3 — «a», сім'я, прапор
```

Саме тому `[...str].reverse().join("")` **ламає** складні емодзі: розвертає code points і розриває склеєні послідовності (перевірено: розворот «сім'ї» не дорівнює оригіналу). Для безпечного розвороту/обрізання — працюй із grapheme-кластерами.

Слова та речення: `granularity: "word"` / `"sentence"` теж доступні в `Intl.Segmenter`.

**Скалярне значення (code point) vs половинка сурогатної пари:**

```js
"😀".codePointAt(0);   // 128512 (0x1F600) — повне значення
"😀".codePointAt(1);   // 56832  (0xDE00)  — друга половина, «осиротіла»
"😀".at(0);            // "\uD83D" — перша половина, а не емодзі
```

## 16. Well-formed рядки (ES2024)

Рядок JavaScript — довільна послідовність code units, тому можливі **«самотні» сурогати** (половина пари без другої): `"a\uD800b"`. Вони призводять до помилок при кодуванні (`encodeURIComponent` кидає `URIError`).

```js
const bad = "a\uD800b";
bad.isWellFormed();    // false
bad.toWellFormed();    // "a\uFFFDb" — самотній сурогат замінено на U+FFFD (�)
encodeURIComponent(bad);  // URIError: URI malformed
```

Перевірено запуском. Метод `toWellFormed()` корисний перед відправкою тексту в API/URL.

## 17. Як рушій зберігає рядки та що це означає для швидкодії

- Рядок — **імутабельний**, тому рушій має право **ділити** пам'ять: `slice` / `substring` можуть повертати «вікно» в той самий буфер, а не копію.
- **Конкатенація** (`a + b`) у сучасних рушіях часто не копіює все одразу: створюється **«мотузка» (rope)** — дерево з двох частин, яке «розгортається» в суцільний рядок, коли потрібен доступ до символів. Тому `+=` у циклі в V8 **зазвичай швидший, ніж здається** — але все ж може створювати багато проміжних об'єктів.
- **Інтернування (interning):** однакові рядкові літерали та імена властивостей можуть ділити один об'єкт у пам'яті; порівняння `===` для коротких інтернованих рядків швидке.
- Практичний висновок: для збирання **великого** тексту з багатьох частин — `parts.push(...)` + `join("")`; для кількох конкатенацій у шаблонному рядку — звичайні `+` чи `` `${a}${b}` `` (читабельність важливіша).

Перевірено: цикл із `big += "ab"` на 100 000 ітерацій дає коректний результат довжини 200 000. Не оптимізуй наосліп — вимірюй (`console.time`).

## 18. Escape-послідовності та «сирі» рядки

```js
"\n"      // перенос рядка          "\t"  // табуляція        "\\"  // зворотна коса риска
"\x41"    // "A" (2 hex-цифри)      "\u0041" // "A" (4 hex)     "\u{1F600}" // "😀" (будь-який code point)
'It\'s'  // екранування лапки (у шаблонних рядках зручніше `It's`)

String.raw`C:\new\table`;   // "C:\\new\\table" — escape-послідовності НЕ обробляються
`C:\\new`.length;            // 6 — а у звичайному літералі `\\` — один символ
```

`String.raw` — тег шаблонного рядка, що повертає текст «як написано»: корисно для шляхів Windows, регулярних виразів у рядках, LaTeX.

## 19. Спеціальні шаблони в `replace`

Другий аргумент `replace`/`replaceAll` (**рядок**) може містити спеціальні послідовності:

| Шаблон | Значення |
|---|---|
| `$&` | увесь знайдений збіг |
| `` $` `` / `$'` | частина рядка до / після збігу |
| `$1`, `$2`… | значення груп захоплення |
| `$<name>` | іменована група |
| `$$` | символ `$` |

```js
"john smith".replace(/(\w+) (\w+)/, "$2, $1");     // "smith, john"
"abc".replace("b", "[$&]");                          // "a[b]c"
"abc".replace("b", "$$");                            // "a$c"
"2026-05-01".replace(/(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})/, "$<d>.$<m>.$<y>"); // "01.05.2026"
"aaa".replace("a", () => "$&");                      // "$&aa" — функція повертає рядок ДОСЛІВНО
```

**Функція-заміна** отримує `(match, p1, p2, …, offset, string, groups)` і її результат вставляється **без** обробки `$`. Це безпечніше, коли заміна приходить від користувача: рядок із `$&` у другому аргументі інтерпретувався б.

**`split` з групою захоплення** додає роздільники в результат: `"a1b2c".split(/(\d)/)` → `["a","1","b","2","c"]`. Особливі випадки: `"".split(",")` → `[""]` (один порожній елемент), а `"".split("")` → `[]`.

## 20. Порівняння та регістр: Unicode-нюанси

- `localeCompare` приймає локаль і опції: `"a".localeCompare("A", undefined, { sensitivity: "base" })` → `0`.
- **Числове** порівняння рядків із цифрами: `new Intl.Collator(undefined, { numeric: true })` — `["10","9","2"].sort(collator.compare)` → `["2","9","10"]` (перевірено).
- Регістр у Unicode не завжди «1 до 1»: `"ß".toUpperCase()` → `"SS"` (довжина змінюється!), турецьке `i`/`İ` потребує `toLocaleUpperCase("tr")`.
- Порівняння рядків із діакритикою — через `normalize()` (розділ 12): `"\u00e9"` (`é` одним code point) і `"e\u0301"` (`e` + комбінований акут) — різні рядки, але `normalize("NFC")` робить їх однаковими; `normalize("NFD")` розкладає на 2 code points.

## 21. Рядок ↔ число

```js
Number("42");       // 42      — суворо: весь рядок має бути числом
Number("08px");     // NaN
Number("");         // 0       !
Number("  12 ");    // 12      — пробіли по краях ігноруються
parseInt("08px");   // 8       — читає числовий префікс (друге аргумент — основа: завжди вказуй 10!)
parseFloat("3.14abc");  // 3.14
String(123);  (123).toString(2);  // "123"  "1111011" — двійкова система
(5).toFixed(2);     // "5.00"  — результат рядок
```

`String(x)` безпечніше за `x.toString()`: працює для `null` та `undefined` (повертає `"null"`/`"undefined"`), тоді як `null.toString()` кидає `TypeError`. Символи: `String(Symbol("a"))` працює, але `` `${Symbol()}` `` і `"a" + Symbol()` — `TypeError`.

## 22. Типові помилки

1. Мутувати рядок через `str[0] = "X"` (мовчки ігнорується).
2. Покладатися на `length` для підрахунку «символів» (емодзі, прапори, діакритика).
3. Розвертати/обрізати текст з емодзі через `split("")` / `slice` посеред пари.
4. `new String(...)`.
5. `replace("a", "b")` і очікування заміни **всіх** входжень.
6. `replaceAll(/a/, …)` без `g` → `TypeError`; `includes(/regex/)` → `TypeError`.
7. Підставляти ввід користувача в другий аргумент `replace` (спецпослідовності `$&`) — краще функція.
8. Порівняння `<`/`>` для кирилиці та чисел-рядків (`"10" < "9"`).
9. `Number("")` === 0 та `parseInt` без основи.
10. `+=` у великому циклі без потреби — або вимірюй, або збирай через `join`.
11. Плутати `substring` (від'ємні → 0, міняє аргументи) і `slice`.
12. Забути, що `"0"` і `" "` — truthy, а `""` — falsy.

## 23. Алгоритм: як працювати з текстом

1. Рядок — значення: усі методи повертають **новий** рядок.
2. Довжина «для людини» → `Intl.Segmenter`; code points → `[...str]`; code units → `length`.
3. Шукати: `includes`/`startsWith`/`indexOf`; за шаблоном — regex (`match`, `matchAll`).
4. Витягувати: `slice` (не `substring`/`substr`).
5. Замінювати: `replaceAll` або `/g`; користувацькі значення — функція-заміна.
6. Порівнювати для людини → `localeCompare`/`Intl.Collator`; еквівалентні форми → `normalize`.
7. Збирати великий текст → масив + `join`.
8. Перед відправкою в URL/API → `toWellFormed()` / `encodeURIComponent`.

## Підсумок

- `String` — примітивний, імутабельний тип; методи повертають новий рядок, оригінал завжди залишається незмінним.
- Ніколи не використовуй `new String()` — це об'єкт-обгортка, що поводиться інакше, ніж примітив, і ламає `===` порівняння.
- `length` рахує UTF-16 code units, а не «видимі символи» — емодзі та подібні символи можуть зайняти `length === 2` при одному символі.
- Для коректної роботи з Unicode: `[...str]` / `for...of` (посимвольно правильно), `codePointAt()`/`fromCodePoint()` (замість `charCodeAt`/`fromCharCode`), `normalize()` (для порівняння еквівалентних форм запису).
- `slice()` — сучасний вибір для вирізання підрядка (на відміну від застарілих `substring()`/`substr()`).
- `replace()` потребує `/g` для заміни всіх входжень, `replaceAll()` — замінює всі за замовчуванням (і не потребує `/g` для рядків).
- Для локалізованого сортування використовуй `localeCompare()`, а не `<`/`>`, які порівнюють посимвольно за кодами.
- Рядки ітеровані напряму (`for...of`/spread), і саме так найкраще Unicode-безпечно розвертати/перебирати текст.
- `""` — falsy, будь-який непорожній рядок (навіть `" "`) — truthy.
- `padStart`/`padEnd` циклічно повторюють і обрізають заповнювач до потрібної довжини — не плутай з «доповненням послідовністю символів по черзі» (розділ 8).
- Три рівні «символа»: code unit (`length`), code point (`[...str]`), grapheme (`Intl.Segmenter`).
- `isWellFormed()` / `toWellFormed()` (ES2024) виправляють самотні сурогати.
- `String.raw` не обробляє escape-послідовності; у другому аргументі `replace` діють `$&`, `$1`, `$<name>`.
- `Number("")` = 0, `parseInt` потребує основи; `String(x)` безпечніше за `x.toString()`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чи можна змінити символ рядка через `s[0] = 'X'`?

```js
(() => { 'use strict'; const s = 'abc'; try { s[0] = 'X'; } catch (e) { return e.name; } })()
```

**2.** Що поверне `'abc'.length` і `'😀'.length`?

```js
['abc'.length, '😀'.length]
```

**3.** Що дасть `str[10]`, `charAt(10)` і `at(-1)`?

```js
['abc'[10], 'abc'.charAt(10), 'abc'.at(-1)]
```

**4.** Що поверне `charCodeAt` і `codePointAt` для `'😀'`?

```js
['😀'.charCodeAt(0), '😀'.codePointAt(0)]
```

**5.** Що дасть `String.fromCharCode(72, 105)` і `String.fromCodePoint(128512)`?

```js
[String.fromCharCode(72, 105), String.fromCodePoint(128512)]
```

**6.** Що повертає `indexOf` для відсутнього підрядка і `includes`?

```js
['hello'.indexOf('x'), 'hello'.includes('ell')]
```

**7.** Що дасть `lastIndexOf('l')` і `indexOf('l', 3)`?

```js
['hello'.lastIndexOf('l'), 'hello'.indexOf('l', 3)]
```

**8.** Що поверне `startsWith` і `endsWith` з позицією?

```js
['hello'.startsWith('ell', 1), 'hello'.endsWith('ell', 4)]
```

**9.** Що дасть `slice(-3)`, `substring(-3)` і `substr(-3, 2)`?

```js
['hello'.slice(-3), 'hello'.substring(-3), 'hello'.substr(-3, 2)]
```

**10.** Чим відрізняється `slice(3, 1)` від `substring(3, 1)`?

```js
['hello'.slice(3, 1), 'hello'.substring(3, 1)]
```

**11.** Що дають `toUpperCase` і `toLowerCase` для `'Straße'`?

```js
['Straße'.toUpperCase(), 'İ'.toLowerCase().length]
```

**12.** Що видаляють `trim`, `trimStart`, `trimEnd`?

```js
['  a  '.trim(), '  a  '.trimStart(), '  a  '.trimEnd()].map(s => '[' + s + ']')
```

**13.** Що дають `padStart` і `padEnd`?

```js
['5'.padStart(3, '0'), 'ab'.padEnd(5, 'xy')]
```

### Рівень 2. Методи й поведінка

**14.** Що дасть `repeat` і що станеться для від'ємного числа?

```js
(() => { try { return ['ab'.repeat(3), 'a'.repeat(-1)]; } catch (e) { return e.name + ': ' + e.message; } })()
```

**15.** Що поверне `replace` зі рядком і `replaceAll`?

```js
['a-b-c'.replace('-', '+'), 'a-b-c'.replaceAll('-', '+')]
```

**16.** Що дасть `split('')` для `'😀a'` і `[...'😀a']`?

```js
['😀a'.split('').length, [...'😀a'].length]
```

**17.** Що поверне `split(',', 2)` і `split()` без аргументів?

```js
['a,b,c'.split(',', 2), 'a,b'.split()]
```

**18.** Що дасть `join` після `split` для заміни роздільника?

```js
'a-b-c'.split('-').join('+')
```

**19.** Як порівнюються рядки операторами `<` і `===`?

```js
['a' < 'b', 'a' < 'B', '10' < '9', '10' < 9]
```

**20.** Що поверне `localeCompare` для `'a'` і `'b'`?

```js
[Math.sign('a'.localeCompare('b')), Math.sign('b'.localeCompare('a')), 'a'.localeCompare('a')]
```

**21.** Що дає `'résumé'.normalize('NFD').length` порівняно з `NFC`?

```js
['résumé'.normalize('NFC').length, 'résumé'.normalize('NFD').length]
```

**22.** Чи рівні `'é'` (один символ) і `'e\u0301'`, а після `normalize`?

```js
['\u00e9' === 'e\u0301', '\u00e9' === 'e\u0301'.normalize()]
```

**23.** Що дасть `for...of` по `'a😀'`?

```js
(() => { const o = []; for (const ch of 'a😀') o.push(ch); return o; })()
```

**24.** Що поверне `'abc'.at(-1)` і `'abc'.at(5)`?

```js
['abc'.at(-1), 'abc'.at(5)]
```

**25.** Що поверне шаблонний рядок із виразом?

```js
(() => { const n = 2; return `${n} + ${n} = ${n + n}`; })()
```

**26.** Що дає `String.raw`?

```js
String.raw`a\nb${1 + 1}`
```

### Рівень 3. Нюанси та пастки

**27.** Що дасть `'5' + 3` і `'5' - 3`?

```js
['5' + 3, '5' - 3]
```

**28.** Що поверне `Number('12px')`, `parseInt('12px')`, `parseFloat('3.14abc')`?

```js
[Number('12px'), parseInt('12px'), parseFloat('3.14abc')]
```

**29.** Що дасть `(255).toString(16)` і `parseInt('ff', 16)`?

```js
[(255).toString(16), parseInt('ff', 16)]
```

**30.** Що дасть `'abc' > 'abd'` і `'Z' < 'a'`?

```js
['abc' > 'abd', 'Z' < 'a']
```

**31.** Що поверне `'a,b'.concat('c', 1)`?

```js
'a,b'.concat('c', 1)
```

**32.** Що повертає `isWellFormed` і `toWellFormed` для непарного сурогата?

```js
['a\uD800'.isWellFormed(), 'a\uD800'.toWellFormed()]
```

**33.** Чи змінює `toUpperCase` оригінал?

```js
(() => { const s = 'abc'; s.toUpperCase(); return s; })()
```

**34.** Що дасть `'abc'.search(/c/)` і `'abc'.match(/x/)`?

```js
['abc'.search(/c/), 'abc'.match(/x/)]
```

**35.** Що поверне `'a\tb'.length` та `'a\\tb'.length`?

```js
['a\tb'.length, 'a\\tb'.length]
```

**36.** Що дає `'abc'.localeCompare('ABC', undefined, { sensitivity: 'base' })`?

```js
'abc'.localeCompare('ABC', undefined, { sensitivity: 'base' })
```

**37.** Як відсортувати слова з кирилицею за алфавітом?

```js
['яблуко', 'абрикос', 'гарбуз', 'їжак'].sort((a, b) => a.localeCompare(b, 'uk'))
```

**38.** Що дасть `'Привіт'.length` і `'Привіт'.toUpperCase()`?

```js
['Привіт'.length, 'Привіт'.toUpperCase()]
```

**39.** Що поверне порівняння `new String('a') === 'a'` і `typeof new String('a')`?

```js
[new String('a') === 'a', typeof new String('a'), new String('a') == 'a']
```

### Рівень 4. Практика й реалізація

**40.** Чому `split('').reverse().join('')` ламає емодзі?

```js
['a😀b'.split('').reverse().join('') === 'b😀a', [...'a😀b'].reverse().join('') === 'b😀a']
```

**41.** Напишіть `reverse(str)`, що коректно працює з емодзі.

```js
const reverse = str => [...str].reverse().join('')
```

**42.** Напишіть `isPalindrome(str)` без урахування регістру й пробілів.

```js
const isPalindrome = s => { const t = s.toLowerCase().replace(/\s+/g, ''); return t === [...t].reverse().join('') }
```

**43.** Напишіть `capitalize(str)` — перша літера велика.

```js
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)
```

**44.** Напишіть `countChars(str)` — частоти символів.

```js
const countChars = s => [...s].reduce((o, c) => ((o[c] = (o[c] ?? 0) + 1), o), {})
```

**45.** Напишіть `truncate(str, n)` — обрізати до `n` символів і додати `…`.

```js
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s)
```

**46.** Напишіть `camelToKebab(str)`.

```js
const camelToKebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
```

**47.** Напишіть `isAnagram(a, b)`.

```js
const isAnagram = (a, b) => [...a].sort().join('') === [...b].sort().join('')
```

**48.** Напишіть `titleCase(str)` — кожне слово з великої літери.

```js
const titleCase = s => s.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
```

**49.** Напишіть `longestWord(str)`.

```js
const longestWord = s => s.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a))
```

**50.** Напишіть `vowelCount(str)` через регулярний вираз.

```js
const vowelCount = s => (s.match(/[aeiou]/gi) ?? []).length
```

### Відповіді

1. `'TypeError'`
2. `[3, 2]`
3. `[undefined, '', 'c']`
4. `[55357, 128512]`
5. `['Hi', '😀']`
6. `[-1, true]`
7. `[3, 3]`
8. `[true, true]`
9. `['llo', 'hello', 'll']`
10. `['', 'el']`
11. `['STRASSE', 2]`
12. `['[a]', '[a  ]', '[  a]']`
13. `['005', 'abxyx']`
14. `'RangeError: Invalid count value: -1'`
15. `['a+b-c', 'a+b+c']`
16. `[3, 2]`
17. `[['a', 'b'], ['a,b']]`
18. `'a+b+c'`
19. `[true, false, true, false]`
20. `[-1, 1, 0]`
21. `[6, 8]`
22. `[false, true]`
23. `['a', '😀']`
24. `['c', undefined]`
25. `'2 + 2 = 4'`
26. `'a\nb2'`
27. `['53', 2]`
28. `[NaN, 12, 3.14]`
29. `['ff', 255]`
30. `[false, true]`
31. `'a,bc1'`
32. `[false, 'a�']`
33. `'abc'`
34. `[2, null]`
35. `[3, 4]`
36. `0`
37. `['абрикос', 'гарбуз', 'їжак', 'яблуко']`
38. `[6, 'ПРИВІТ']`
39. `[false, 'object', true]`
40. `[false, true]`
41. Виклик `reverse('a😀b')` → `'b😀a'`
42. Виклик `[isPalindrome('Race car'), isPalindrome('hello')]` → `[true, false]`
43. Виклик `capitalize('привіт світ')` → `'Привіт світ'`
44. Виклик `countChars('hello')` → `{ h: 1, e: 1, l: 2, o: 1 }`
45. Виклик `[truncate('hello world', 6), truncate('hi', 6)]` → `['hello…', 'hi']`
46. Виклик `camelToKebab('myVariableName')` → `'my-variable-name'`
47. Виклик `[isAnagram('listen', 'silent'), isAnagram('abc', 'abd')]` → `[true, false]`
48. Виклик `titleCase('the quick brown fox')` → `'The Quick Brown Fox'`
49. Виклик `longestWord('a quick brownish fox')` → `'brownish'`
50. Виклик `vowelCount('Programming Language')` → `7`
