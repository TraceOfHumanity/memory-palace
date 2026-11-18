# Node.js: `Buffer` — робота з бінарними даними

## 1. Що таке `Buffer`, і чому він з'явився саме в Node.js

`Buffer` — це вбудований у Node.js клас для роботи з сирими бінарними даними (raw binary data) — послідовністю байтів, незалежно від того, що саме ці байти представляють: текст у певному кодуванні, вміст файлу, картинку, дані з мережі тощо.

`Buffer` з'явився раніше, ніж `TypedArray` став частиною самої мови JavaScript (детально `TypedArray` — у нотатці про типізовані масиви): Node.js потребував спосіб роботи з бінарними потоками (файлова система, мережа, TCP/HTTP) ще до того, як ES6 увів `Uint8Array`/`ArrayBuffer` у сам рушій V8. Сьогодні `Buffer` існує як підклас `Uint8Array` — тобто це, по суті, спеціалізований `TypedArray` з додатковими, Node-специфічними зручностями для роботи саме з байтами (кодування рядків, читання й запис чисел у різних форматах, порівняння буферів).

```js
const { Buffer } = require("buffer"); // у Node.js Buffer доступний і глобально,
                                         // без require — імпорт тут лише для явності

const bufferIsUint8Array = Buffer.from([1, 2, 3]);
console.log(bufferIsUint8Array instanceof Uint8Array); // true — Buffer є Uint8Array!
console.log(Buffer.isBuffer(bufferIsUint8Array));         // true — надійніша перевірка,
                                                              // ніж instanceof (детально нижче)
```

## 2. Створення буферів: `alloc()`, `allocUnsafe()`, `from()`

### 2.1. `Buffer.alloc(size)` — виділяє пам'ять, заповнену нулями

Найбезпечніший спосіб: гарантовано отримуєш «чисту» пам'ять — жодних випадкових старих даних, що могли лишитись у цій ділянці пам'яті від попередніх операцій:

```js
const zeroedBuffer = Buffer.alloc(4);
console.log(zeroedBuffer); // <Buffer 00 00 00 00> — усі байти нульові

// можна одразу заповнити іншим значенням (другий аргумент):
const filledBuffer = Buffer.alloc(5, 1); // 5 байтів, кожен = 1
console.log(filledBuffer); // <Buffer 01 01 01 01 01>
```

### 2.2. `Buffer.allocUnsafe(size)` — швидше, але без гарантії «чистоти»

Не обнуляє пам'ять перед видачею — це швидше (немає витрат на заповнення нулями), але буфер може містити «сміття» — старі дані з попереднього використання цієї ж ділянки пам'яті (Node.js перевикористовує внутрішній «пул» пам'яті для маленьких буферів заради продуктивності):

```js
const unsafeBuffer = Buffer.allocUnsafe(10);
console.log(unsafeBuffer); // <Buffer ?? ?? ?? ...> — вміст непередбачуваний!
```

⚠️ Безпека: якщо в цій пам'яті раніше лежали, наприклад, чужі паролі чи токени сесії (з попередньої мережевої операції, яка перевикористала той самий шматок пулу) — `allocUnsafe()` міг би «показати» ці старі дані, якщо буфер не перезаписати повністю перед використанням. Тому правило: `allocUnsafe()` можна використовувати лише тоді, коли ти гарантовано заповниш кожен байт власними даними ще до того, як буфер кудись піде (лог, мережа, відповідь клієнту).

```js
for (let i = 0; i < unsafeBuffer.length; i++) {
  unsafeBuffer[i] = 0; // тепер безпечно — увесь буфер перезаписано власноруч
}
console.log(unsafeBuffer); // <Buffer 00 00 00 00 00 00 00 00 00 00>
```

### 2.3. `Buffer.from()` — з існуючих даних (масив, рядок, інший буфер)

```js
const fromArray = Buffer.from([0x48, 0x69, 0x21]); // з масиву байтів (чисел 0-255)
console.log(fromArray.toString("utf-8")); // "Hi!"

const fromString = Buffer.from("café"); // з рядка — за замовчуванням UTF-8
console.log(fromString);        // <Buffer 63 61 66 c3 a9> — байти UTF-8-кодування
console.log(fromString.length); // 5 — більше, ніж 4 «видимі» символи!
                                   // (символ é займає 2 байти в UTF-8;
                                   // детально різниця «байти vs символи» — розділ 5)

const fromHexString = Buffer.from("486921", "hex"); // з HEX-рядка
console.log(fromHexString.toString("utf-8")); // "Hi!"

const fromAnotherBuffer = Buffer.from(fromArray); // копія іншого буфера (не спільна пам'ять!)
fromAnotherBuffer[0] = 0;
console.log(fromArray[0], fromAnotherBuffer[0]); // 72 0 — зміна копії не вплинула на оригінал
```

## 3. Запис і читання окремих байтів — як у звичайного `TypedArray`

`Buffer` є `Uint8Array`, тому доступ через `[]` працює точно так само (детально механіка — нотатка про типізовані масиви): кожен елемент — ціле число 0–255 (1 байт).

```js
const memoryContainer = Buffer.alloc(4);
console.log(memoryContainer); // <Buffer 00 00 00 00>

memoryContainer[0] = 0xf4; // 244 в десятковій системі
console.log(memoryContainer); // <Buffer f4 00 00 00>

console.log(memoryContainer.toString("hex")); // "f4000000" — той самий вміст, як HEX-рядок
console.log(memoryContainer.readUInt32LE(0)); // 244 — читаємо як 32-бітне ціле (детально розділ 4)
```

## 4. Числові методи `readUInt.../writeUInt...` — інтерпретація байтів як чисел

Так само, як `DataView` для `ArrayBuffer` (детально — нотатка про типізовані масиви), `Buffer` має власні `read*`/`write*` методи для читання й запису багатобайтових чисел за конкретним зсувом — і тут критично важлива «endianness» (порядок байтів):

- **LE (Little Endian)** — молодший байт записується першим (за меншою адресою) — стандарт для x86/ARM;
- **BE (Big Endian)** — старший байт записується першим — типово для мережевих протоколів («network byte order»).

```js
const endiannessDemo = Buffer.alloc(4);
endiannessDemo.writeUInt32LE(0x12345678, 0); // запис як Little Endian
console.log(endiannessDemo); // <Buffer 78 56 34 12> — байти «перевернуті»!

const endiannessDemoBE = Buffer.alloc(4);
endiannessDemoBE.writeUInt32BE(0x12345678, 0); // запис як Big Endian
console.log(endiannessDemoBE); // <Buffer 12 34 56 78> — байти «по порядку»

console.log(endiannessDemo.readUInt32LE(0));   // 305419896 (= 0x12345678) — читаємо правильно,
console.log(endiannessDemoBE.readUInt32BE(0)); // 305419896 (= 0x12345678)    якщо метод відповідає
                                                  // тому, яким методом писали!
```

Якщо переплутати LE/BE при читанні — отримаєш зовсім інше число, без жодної помилки (тиха, «мовчазна» пастка):

```js
console.log(endiannessDemo.readUInt32BE(0)); // 2018915346 — зовсім не 0x12345678!
```

Повний набір методів (те саме, що `DataView`, але як методи буфера): `readInt8`/`readUInt8`, `readInt16LE`/`BE`, `readUInt16LE`/`BE`, `readInt32LE`/`BE`, `readUInt32LE`/`BE`, `readBigInt64LE`/`BE`, `readFloatLE`/`BE`, `readDoubleLE`/`BE` — і відповідні `write*`-версії.

## 5. Рядки ↔ буфери: кодування (encoding)

`toString(encoding)` і `Buffer.from(string, encoding)` — два боки однієї операції: перетворення між «сирими байтами» і «текстом», інтерпретованим за конкретним кодуванням:

```js
const helloBuffer = Buffer.from("Hi!", "utf-8");
console.log(helloBuffer.toString());        // "Hi!" — за замовчуванням "utf-8"
console.log(helloBuffer.toString("hex"));    // "486921" — ті самі байти як HEX
console.log(helloBuffer.toString("base64")); // "SGkh" — ті самі байти як Base64
console.log(helloBuffer.toString("ascii"));   // "Hi!" — для звичайних ASCII-символів так само
```

Підтримувані кодування: `"utf8"`/`"utf-8"` (за замовчуванням), `"ascii"`, `"utf16le"`/`"ucs2"` (2 байти на символ), `"base64"`, `"base64url"`, `"hex"`, `"latin1"`/`"binary"` (1 байт на символ, 0–255 напряму).

⚠️ Пастка: `length` буфера — це кількість байтів, а не символів — для багатобайтових кодувань (UTF-8 з символами поза ASCII) ці цифри розходяться (та сама проблема, що й з `String.length`, детально — нотатка про рядки, але тут вона стосується `Buffer`, а не JS-рядка):

```js
const emojiBuffer = Buffer.from("😀");
console.log(emojiBuffer.length);        // 4 — емодзі займає 4 байти в UTF-8
console.log([..."😀"].length);           // 1 — а як рядок JS це один символ
console.log(Buffer.byteLength("😀"));    // 4 — правильний спосіб дізнатись
                                            // розмір рядка в байтах, не створюючи буфер
```

## 6. `slice()` / `subarray()` — «вікно» в ту саму пам'ять, без копіювання

Так само, як `subarray()` у звичайного `TypedArray` (детально — нотатка про типізовані масиви), `slice()` і `subarray()` у `Buffer` не копіюють дані — повертають новий `Buffer`-об'єкт, що «дивиться» на ту саму ділянку пам'яті:

```js
const originalBuffer = Buffer.from("Hello World");
const slicedView = originalBuffer.subarray(0, 5); // «вікно» на перші 5 байтів
console.log(slicedView.toString()); // "Hello"

slicedView[0] = 0x68; // 'h' замість 'H' — міняємо через slicedView...
console.log(originalBuffer.toString()); // "hello World" — ...і оригінал теж змінився!
                                          // (спільна пам'ять, а не копія)
```

Якщо потрібна саме копія (незалежна від оригіналу) — `Buffer.from(buffer)`:

```js
const independentCopy = Buffer.from(originalBuffer);
independentCopy[0] = 0x48; // 'H' назад, але лише в копії
console.log(originalBuffer.toString(), independentCopy.toString()); // "hello World" "Hello World"
```

## 7. Об'єднання й порівняння буферів

`Buffer.concat(list, totalLength?)` — об'єднує масив буферів в один новий буфер (одна алокація, детально принцип — той самий, що й «`Array.join` замість `+=` у циклі», нотатка про конкатенацію рядків):

```js
const part1 = Buffer.from("Hello, ");
const part2 = Buffer.from("World!");
const combined = Buffer.concat([part1, part2]);
console.log(combined.toString()); // "Hello, World!"
```

`Buffer.compare()` / `.equals()` — порівняння вмісту (а не ідентичності посилання, як `===` для об'єктів):

```js
const bufA = Buffer.from("abc");
const bufB = Buffer.from("abc");
console.log(bufA === bufB);       // false — різні об'єкти в пам'яті
console.log(bufA.equals(bufB));    // true — але однаковий вміст
console.log(Buffer.compare(bufA, bufB)); // 0 — рівні (від'ємне/додатне число — хто «менший» лексикографічно)
```

## 8. Найчастіше практичне застосування: файли, мережа, потоки

`Buffer` з'являється буквально скрізь, де Node.js робить введення-виведення бінарних даних — саме тому його варто розуміти глибоко:

```js
const fs = require("fs");
const fileBuffer = fs.readFileSync("image.png"); // повертає Buffer, не рядок —
                                                     // картинка не є текстом!

const server = require("http").createServer((req, res) => {
  let chunks = [];
  req.on("data", (chunk) => chunks.push(chunk)); // кожен chunk — Buffer
  req.on("end", () => {
    const body = Buffer.concat(chunks); // збираємо весь буфер тіла запиту
    console.log(body.toString("utf-8"));
  });
});
```

Детально самі Streams і HTTP — інші нотатки в `node/core-concepts/streams`, `node/core-concepts/http`.

## Підсумок

- `Buffer` — Node.js-специфічний підклас `Uint8Array` для роботи із сирими байтами; з'явився до того, як `TypedArray` стали частиною самого JS-стандарту.
- `Buffer.alloc(n)` — безпечно (нулі за замовчуванням); `Buffer.allocUnsafe(n)` — швидше, але може містити старі дані з пулу пам'яті — обов'язково заповнюй увесь буфер власними даними перед використанням.
- `Buffer.from()` створює буфер із масиву байтів, рядка (з кодуванням), HEX-рядка чи іншого буфера (копіює, а не ділить пам'ять).
- `readUInt32LE`/`BE` та подібні методи читають/пишуть багатобайтові числа з урахуванням endianness (порядку байтів) — переплутати LE/BE — отримати зовсім інше число без жодної помилки.
- `toString(encoding)`/`Buffer.from(str, encoding)` — перетворення між байтами й текстом; `buffer.length` — це байти, а не символи (`Buffer.byteLength(str)` — правильний спосіб дізнатись розмір рядка в байтах без створення буфера).
- `slice()`/`subarray()` дають «вікно» в ту саму пам'ять (як і в звичайного `TypedArray`) — `Buffer.from(buffer)` робить справжню копію.
- `Buffer.concat()` об'єднує кілька буферів в один за одну алокацію; `.equals()`/`Buffer.compare()` порівнюють вміст, а не посилання.
- Головне практичне застосування — файлова система, мережа, потоки: будь-які бінарні дані (картинки, TCP-пакети, тіло HTTP-запиту) у Node.js представлені саме через `Buffer`.

## Задачі для закріплення

37 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `Buffer.from('abc')` та як вона виводиться?

```js
(() => { const b = Buffer.from('abc'); return [b.length, [...b], b.toString('hex'), b.toString('base64')]; })()
```

**2.** Скільки байтів займає кирилиця й емодзі в UTF-8?

```js
['a', 'я', '€', '😀', 'Привіт'].map(s => Buffer.byteLength(s))
```

**3.** Що поверне `Buffer.alloc(4)` і `Buffer.alloc(4, 1)`?

```js
[[...Buffer.alloc(4)], [...Buffer.alloc(4, 1)], [...Buffer.alloc(3, 'ab')]]
```

**4.** Чим відрізняються `alloc` та `allocUnsafe` щодо вмісту?

```js
[Buffer.alloc(8).every(x => x === 0), Buffer.allocUnsafe(8).length]
```

**5.** Що станеться при записі байта поза межами та значення > 255?

```js
(() => { const b = Buffer.alloc(3); b[5] = 1; b[0] = 256; b[1] = -1; b[2] = 257.9; return [[...b], b[5]]; })()
```

**6.** Що поверне `buf.write` і скільки байтів записано при нестачі місця?

```js
(() => { const b = Buffer.alloc(4); const n = b.write('привіт'); return [n, b.toString('utf8').length, [...b]]; })()
```

**7.** Що поверне `readUInt16BE` та `readUInt16LE` для `[0x01, 0x02]`?

```js
(() => { const b = Buffer.from([1, 2]); return [b.readUInt16BE(0), b.readUInt16LE(0)]; })()
```

**8.** Що поверне `readInt8` для 255 та `readUInt8`?

```js
(() => { const b = Buffer.from([255]); return [b.readInt8(0), b.readUInt8(0)]; })()
```

**9.** Запис 32-бітного числа і читання назад у різному порядку байтів?

```js
(() => { const b = Buffer.alloc(4); b.writeUInt32BE(0x12345678); return [b.toString('hex'), b.readUInt32LE(0).toString(16)]; })()
```

**10.** Що станеться при читанні за межами буфера?

```js
(() => { try { Buffer.alloc(2).readUInt32BE(0); } catch (e) { return [e.name, e.code]; } })()
```

### Рівень 2. Деталі й поведінка

**11.** Що станеться при записі числа поза діапазоном?

```js
(() => { try { Buffer.alloc(1).writeUInt8(300); } catch (e) { return e.code; } })()
```

**12.** Що поверне запис і читання `double`?

```js
(() => { const b = Buffer.alloc(8); b.writeDoubleBE(1.5); return [b.toString('hex'), b.readDoubleBE()]; })()
```

**13.** Що поверне запис і читання `BigInt64`?

```js
(() => { const b = Buffer.alloc(8); b.writeBigInt64BE(-1n); return [b.toString('hex'), b.readBigUInt64BE()]; })()
```

**14.** Як різні кодування представляють «Hi»?

```js
(() => { const b = Buffer.from('Hi'); return [b.toString('hex'), b.toString('base64'), b.toString('base64url'), b.toString('binary'), b.toString('latin1')]; })()
```

**15.** Що поверне `Buffer.from(hex, 'hex')` для непарної довжини та некоректних символів?

```js
[[...Buffer.from('abc', 'hex')], [...Buffer.from('zz', 'hex')], [...Buffer.from('0aff', 'hex')]]
```

**16.** Що поверне `Buffer.from(base64, 'base64')`?

```js
[Buffer.from('SGVsbG8=', 'base64').toString(), Buffer.from('SGVsbG8', 'base64').toString(), Buffer.from('SGVsbG8=', 'base64').length]
```

**17.** Що станеться з некоректним UTF-8 при `toString`?

```js
(() => { const b = Buffer.from([0xff, 0x61, 0xc3]); return [b.toString(), b.toString().length, b.toString().charCodeAt(0)]; })()
```

**18.** Що поверне розріз символа посередині UTF-8 через `toString`?

```js
(() => { const b = Buffer.from('я'); return [b.length, b.subarray(0, 1).toString() === '\ufffd', b.toString()]; })()
```

**19.** `slice`/`subarray` — копія чи вікно?

```js
(() => { const a = Buffer.from([1, 2, 3, 4]); const v = a.subarray(1, 3); v[0] = 99; return [[...a], [...v]]; })()
```

**20.** А `Buffer.from(buf)` — копія?

```js
(() => { const a = Buffer.from([1, 2, 3]); const c = Buffer.from(a); c[0] = 99; return [[...a], [...c]]; })()
```

### Рівень 3. Нюанси та пастки

**21.** Що поверне `Buffer.concat` і `compare`?

```js
(() => { const a = Buffer.from('ab'), b = Buffer.from('cd'); return [Buffer.concat([a, b]).toString(), Buffer.compare(a, b), Buffer.compare(b, a), Buffer.compare(a, Buffer.from('ab')), a.equals(Buffer.from('ab'))]; })()
```

**22.** Що поверне `indexOf`, `includes`, `lastIndexOf` у буфері?

```js
(() => { const b = Buffer.from('hello world hello'); return [b.indexOf('hello'), b.lastIndexOf('hello'), b.includes('world'), b.indexOf(Buffer.from('xyz'))]; })()
```

**23.** Що поверне `fill`, `reverse`, `swap16`?

```js
(() => { const b = Buffer.from([1, 2, 3, 4]); return [[...Buffer.from(b).reverse()], [...Buffer.from(b).swap16()], [...Buffer.alloc(5).fill('ab')]]; })()
```

**24.** Що поверне `toJSON` та `JSON.stringify`?

```js
[Buffer.from('hi').toJSON(), JSON.stringify(Buffer.from('hi'))]
```

**25.** Чи є `Buffer` нащадком `Uint8Array`?

```js
(() => { const b = Buffer.from('a'); return [b instanceof Uint8Array, Buffer.isBuffer(b), Buffer.isBuffer(new Uint8Array(1)), Object.getPrototypeOf(Buffer.prototype) === Uint8Array.prototype]; })()
```

**26.** Як `Buffer` ітерується та які значення повертає `entries`?

```js
(() => { const b = Buffer.from('ab'); return [[...b], [...b.entries()], [...b.keys()]]; })()
```

**27.** Що поверне `Buffer.isEncoding`?

```js
['utf8', 'UTF-8', 'hex', 'base64', 'ascii', 'foo'].map(e => Buffer.isEncoding(e))
```

**28.** Як перетворити число на 4 байти (big-endian) та назад вручну?

```js
(() => { const n = 0x0a0b0c0d; const b = Buffer.from([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]); return [b.toString('hex'), ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0]; })()
```

**29.** Напишіть `toHex(buf)` з пробілами між байтами та `fromHex(str)`.

```js
const toHex = (b) => [...b].map(x => x.toString(16).padStart(2, '0')).join(' '); const fromHex = (s) => Buffer.from(s.replace(/\s+/g, ''), 'hex')
```

**30.** Напишіть `xorBuf(a, b)` для двох буферів рівної довжини.

```js
const xorBuf = (a, b) => Buffer.from(a.map((x, i) => x ^ b[i]))
```

### Рівень 4. Практика

**31.** Напишіть простий бінарний кодек: запис `{id: u16, score: f32, name}` та читання.

```js
const enc = (o) => { const n = Buffer.from(o.name); const b = Buffer.alloc(2 + 4 + 1 + n.length); b.writeUInt16BE(o.id, 0); b.writeFloatBE(o.score, 2); b.writeUInt8(n.length, 6); n.copy(b, 7); return b; }; const dec = (b) => ({ id: b.readUInt16BE(0), score: b.readFloatBE(2), name: b.toString('utf8', 7, 7 + b.readUInt8(6)) })
```

**32.** Напишіть `chunk(buf, n)` — розбити на шматки по n байтів.

```js
const chunk = (b, n) => { const r = []; for (let i = 0; i < b.length; i += n) r.push(b.subarray(i, i + n)); return r; }
```

**33.** Напишіть `base64urlEncode(str)` без `=` та спеціальних символів вручну.

```js
const b64u = (s) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
```

**34.** Напишіть `readLines(buf)`, що ділить буфер за `\n` без створення проміжного рядка всього буфера.

```js
const lines = (b) => { const r = []; let s = 0; for (let i = b.indexOf(10); i !== -1; i = b.indexOf(10, s)) { r.push(b.toString('utf8', s, i)); s = i + 1; } if (s < b.length) r.push(b.toString('utf8', s)); return r; }
```

**35.** Напишіть пошук магічної сигнатури PNG `89 50 4E 47`.

```js
const isPng = (b) => b.length >= 4 && b.readUInt32BE(0) === 0x89504e47
```

**36.** Для чого `Buffer.allocUnsafe` і чому його слід заповнювати?

**37.** Чим `Buffer` відрізняється від рядка?

### Відповіді

1. `[3, [97, 98, 99], '616263', 'YWJj']`
2. `[1, 2, 3, 4, 12]`
3. `[[0, 0, 0, 0], [1, 1, 1, 1], [97, 98, 97]]`
4. `[true, 8]`
5. `[[0, 255, 1], undefined]`
6. `[4, 2, [208, 191, 209, 128]]`
7. `[258, 513]`
8. `[-1, 255]`
9. `['12345678', '78563412']`
10. `['RangeError', 'ERR_BUFFER_OUT_OF_BOUNDS']`
11. `'ERR_OUT_OF_RANGE'`
12. `['3ff8000000000000', 1.5]`
13. `['ffffffffffffffff', 18446744073709551615n]`
14. `['4869', 'SGk=', 'SGk', 'Hi', 'Hi']`
15. `[[171], [], [10, 255]]`
16. `['Hello', 'Hello', 5]`
17. `['�a�', 3, 65533]`
18. `[2, true, 'я']`
19. `[[1, 99, 3, 4], [99, 3]]`
20. `[[1, 2, 3], [99, 2, 3]]`
21. `['abcd', -1, 1, 0, true]`
22. `[0, 12, true, -1]`
23. `[[4, 3, 2, 1], [2, 1, 4, 3], [97, 98, 97, 98, 97]]`
24. `[{ type: 'Buffer', data: [104, 105] }, '{"type":"Buffer","data":[104,105]}']`
25. `[true, true, false, true]`
26. `[[97, 98], [[0, 97], [1, 98]], [0, 1]]`
27. `[true, true, true, true, true, false]`
28. `['0a0b0c0d', 168496141]`
29. Виклик `[toHex(Buffer.from('Hi!')), fromHex('48 69 21').toString()]` → `['48 69 21', 'Hi!']`
30. Виклик `[xorBuf(Buffer.from([1, 2, 3]), Buffer.from([3, 2, 1])), xorBuf(Buffer.from('ab'), Buffer.from('ab'))].map(b => b.toString('hex'))` → `['020002', '0000']`
31. Виклик `(() => { const b = enc({ id: 513, score: 2.5, name: 'Оля' }); return [b.length, b.toString('hex'), dec(b)]; })()` → `[13, '02014020000006d09ed0bbd18f', { id: 513, score: 2.5, name: 'Оля' }]`
32. Виклик `chunk(Buffer.from('abcdefg'), 3).map(b => b.toString())` → `['abc', 'def', 'g']`
33. Виклик `[b64u('subjects?_d'), b64u('>>>???'), Buffer.from('>>>???').toString('base64url')]` → `['c3ViamVjdHM_X2Q', 'Pj4-Pz8_', 'Pj4-Pz8_']`
34. Виклик `lines(Buffer.from('a\nбв\nlast'))` → `['a', 'бв', 'last']`
35. Виклик `[isPng(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0])), isPng(Buffer.from('GIF8')), isPng(Buffer.alloc(2))]` → `[true, false, false]`
36. Не обнуляє пам'ять, тому швидший, але може містити залишки чужих даних; перед використанням його потрібно повністю перезаписати (`fill`)
37. Це масив байтів фіксованої довжини без кодування; рядок — послідовність символів Unicode; кодування застосовується лише при перетворенні
