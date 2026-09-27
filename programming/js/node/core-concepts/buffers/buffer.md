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
