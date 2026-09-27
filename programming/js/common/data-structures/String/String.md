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
const composed = "é"; // U+00E9, один code point
const decomposed = "é"; // "e" + U+0301 (комбінований діакритичний знак)
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
