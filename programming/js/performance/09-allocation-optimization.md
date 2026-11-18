# V8: оптимізація алокацій

## Загальна ідея

Кожна алокація на купі — це потенційний тиск на GC у майбутньому. Allocation optimization — це мінімізація кількості та розміру алокацій через:

- **allocation sinking** — V8 переносить алокацію ближче до місця використання;
- **allocation coalescing** — об'єднання кількох алокацій в одну;
- **pre-allocation** — виділення пам'яті заздалегідь одним блоком.

Цей принцип тісно пов'язаний з нотатками про GC patterns та escape analysis, але фокусується на архітектурних рішеннях щодо алокацій.

## 1. Справжня вартість алокації

Алокація — це не просто «виділи пам'яті»: потрібно знайти вільне місце в Young Generation, записати метадані об'єкта (Shape pointer), ініціалізувати властивості, оновити allocation pointer. Кожен крок має свою (невелику, але ненульову) вартість, і на мільйонах алокацій вона накопичується — плюс додатковий overhead GC, коли Young Gen переповнюється.

Примітивна змінна чи запис у вже виділений typed array — це просто запис значення в регістр чи в наявну ділянку пам'яті, без жодної з цих стадій.

## 2. Allocation sinking

V8 може «опустити» алокацію вниз по коду, ближче до місця, де вона реально потрібна. Це зменшує час «життя» об'єкта і зменшує тиск на GC:

```js
const loggerStub = { write: (entry) => console.log("[log]", entry) };

// ❌ Алокація завжди відбувається, навіть якщо не потрібна
function processBad(data, shouldLog) {
  const logEntry = {          // алокується завжди
    timestamp: Date.now(),
    data: data,
  };
  const result = data * 2;
  if (shouldLog) {            // але використовується тільки іноді!
    loggerStub.write(logEntry);
  }
  return result;
}
```

```js
// ✅ Алокація тільки коли реально потрібна
function process(data, shouldLog) {
  const result = data * 2;
  if (shouldLog) {
    loggerStub.write({        // алокується тільки коли shouldLog === true
      timestamp: Date.now(),
      data: data,
    });
  }
  return result;
}
```

## 3. Pre-allocation

Замість динамічного росту структур — виділяй пам'ять заздалегідь:

```js
const itemsStub = Array.from({ length: 1000 }, (_, i) => ({ value: i }));

// ❌ Динамічне зростання масиву
function collectResultsBad(items) {
  const results = [];               // починає з 0
  for (const item of items) {
    results.push(item.value * 2);  // масив росте: 0→4→8→16→32...
    // кожен ріст може означати нову алокацію й копіювання старих даних
  }
  return results;
}
```

```js
// ✅ Pre-allocated масив
function collectResults(items) {
  const results = new Array(items.length); // одна алокація потрібного розміру
  for (let i = 0; i < items.length; i++) {
    results[i] = items[i].value * 2;      // записуємо без реалокацій
  }
  return results;
}
```

```js
// ✅ Або typed array (ще краще для чисел)
function collectResultsTyped(items) {
  const results = new Float64Array(items.length);
  for (let i = 0; i < items.length; i++) {
    results[i] = items[i].value * 2;
  }
  return results;
}
```

## 4. Coalescing — об'єднання алокацій

```js
// ❌ Багато малих алокацій
function buildUserProfileBad(id, name, email, role) {
  const basic = { id, name };                  // алокація 1
  const contact = { email };                    // алокація 2
  const permissions = { role };                 // алокація 3
  const metadata = { createdAt: Date.now() };   // алокація 4
  return { ...basic, ...contact, ...permissions, ...metadata }; // алокація 5!
}
```

```js
// ✅ Одна алокація
function buildUserProfile(id, name, email, role) {
  return {                                       // одна алокація
    id,
    name,
    email,
    role,
    createdAt: Date.now(),
  };
}
```

```js
// ❌ Конкатенація рядків у циклі (N алокацій рядків)
function buildHTMLBad(items) {
  let html = "";
  for (const item of items) {
    html += `<li>${item.name}</li>`; // новий рядок на кожній ітерації!
  }
  return html;
}
```

```js
// ✅ Array.join (одна алокація в кінці)
function buildHTML(items) {
  const parts = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    parts[i] = `<li>${items[i].name}</li>`;
  }
  return parts.join(""); // один concat у кінці
}
```

Детально про конкатенацію рядків і чому `Array.join` вигідніший за `+=` у циклі — нотатка про конкатенацію рядків (`performance/11-string-concatenation.md`).

## Правила для оптимізації алокацій

### Правило 1: pre-allocate масиви відомого розміру

```js
// ❌ Динамічний push
function mapValuesBad(arr) {
  const result = [];
  for (const item of arr) {
    result.push(item * 2);
  }
  return result;
}
```

```js
// ✅ Pre-allocated
function mapValues(arr) {
  const result = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = arr[i] * 2;
  }
  return result;
}
```

```js
// ✅ Typed array для чисел
function mapValuesTyped(arr) {
  const result = new Float64Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = arr[i] * 2;
  }
  return result;
}
```

### Правило 2: уникай алокацій у гарячих шляхах (наприклад, у циклі `requestAnimationFrame`)

```js
function computeMatrix(x, y, scale) {
  return [scale, 0, x, 0, scale, y]; // умовна "матриця"
}
const objStub = { x: 0, y: 0, scale: 1 };

// ❌ Алокація на кожен виклик гарячої функції
function getTransformBad(x, y, scale) {
  return { x, y, scale, matrix: computeMatrix(x, y, scale) }; // купа!
}
// requestAnimationFrame(function loop() {
//   const transform = getTransformBad(objStub.x, objStub.y, objStub.scale); // нова алокація щоразу!
//   applyTransform(transform);
//   requestAnimationFrame(loop);
// });
```

```js
// ✅ Перевикористовуй об'єкт (мутуй існуючий)
const transformCache = { x: 0, y: 0, scale: 1, matrix: null };
function updateTransform(x, y, scale) {
  transformCache.x = x;          // мутація існуючого
  transformCache.y = y;          // мутація існуючого
  transformCache.scale = scale;  // мутація існуючого
  transformCache.matrix = computeMatrix(x, y, scale);
  return transformCache;
}
// requestAnimationFrame(function loop() {
//   const transform = updateTransform(objStub.x, objStub.y, objStub.scale); // 0 алокацій!
//   applyTransform(transform);
//   requestAnimationFrame(loop);
// });
```

### Правило 3: lazy allocation — виділяй тільки коли потрібно

```js
// ❌ Eager allocation — завжди виділяємо, навіть якщо не потрібно
class DataProcessorEager {
  constructor() {
    this.cache = new Map();                 // завжди виділяється
    this.buffer = new Float64Array(10000);  // завжди виділяється
    this.metadata = {};                     // завжди виділяється
  }
}
// якщо більшість використань не потребують cache/buffer — марна витрата
```

```js
// ✅ Lazy allocation — виділяємо тільки при першому використанні
class DataProcessor {
  constructor() {
    this._cache = null;
    this._buffer = null;
  }
  get cache() {
    if (!this._cache) this._cache = new Map(); // тільки при першому доступі
    return this._cache;
  }
  get buffer() {
    if (!this._buffer) this._buffer = new Float64Array(10000);
    return this._buffer;
  }
}
```

### Правило 4: уникай spread у гарячих функціях

```js
const DEFAULT_CONFIG = { timeout: 5000, retries: 3 };
const itemsWithConfig = [{ config: { timeout: 1000 } }, { config: { retries: 5 } }];
function processConfigStub() {}

// ❌ Spread = нова алокація
function mergeBad(defaults, overrides) {
  return { ...defaults, ...overrides }; // нова алокація щоразу!
}
// for (const item of itemsWithConfig) {
//   const config = mergeBad(DEFAULT_CONFIG, item.config); // N алокацій!
//   processConfigStub(config);
// }
```

```js
// ✅ Мутуй існуючий об'єкт
const tempConfig = { ...DEFAULT_CONFIG }; // один раз поза циклом
for (const item of itemsWithConfig) {
  tempConfig.timeout = item.config.timeout ?? DEFAULT_CONFIG.timeout;
  tempConfig.retries = item.config.retries ?? DEFAULT_CONFIG.retries;
  processConfigStub(tempConfig); // 0 нових алокацій!
}
```

### Правило 5: перевикористання буфера для тимчасових даних

```js
async function processChunkStub() {}

// ❌ Новий буфер щоразу
async function processChunksBad(data) {
  const CHUNK_SIZE = 1024;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE); // нова алокація!
    await processChunkStub(chunk);
  }
}
```

```js
// ✅ Перевикористовуй буфер
async function processChunks(data) {
  const CHUNK_SIZE = 1024;
  const buffer = new Float64Array(CHUNK_SIZE); // один раз
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE, data.length);
    buffer.set(data.subarray(i, end)); // копіюємо в існуючий буфер
    await processChunkStub(buffer.subarray(0, end - i));
  }
}
```

## Контекст-специфічні приклади (псевдокод, потребують React/Vue рантайму)

### Vue (Composition API)

```js
// ❌ Нові об'єкти в computed
const transform = computed(() => ({
  x: position.value.x * scale.value,  // новий об'єкт при кожному перерахунку!
  y: position.value.y * scale.value
}));

// ✅ Reactive об'єкт, який мутується
const transform = reactive({ x: 0, y: 0 });
watchEffect(() => {
  transform.x = position.value.x * scale.value; // мутація
  transform.y = position.value.y * scale.value; // мутація
  // 0 нових алокацій
});
```

Детально про `computed`, `reactive` і `watchEffect` — нотатки в `programming/js/vue-js/`.

### React

```jsx
// ❌ Нові масиви/об'єкти при кожному рендері
function ItemList({ items }) {
  const processed = items
    .filter(item => item.active)   // новий масив!
    .map(item => ({ ...item, label: item.name.toUpperCase() })); // ще один новий масив + N об'єктів!
  return <ul>{processed.map(item => <li key={item.id}>{item.label}</li>)}</ul>;
}

// ✅ Мемоізація + уникнення зайвих алокацій
function ItemList({ items }) {
  const processed = useMemo(() =>
    items.filter(item => item.active).map(item => ({ ...item, label: item.name.toUpperCase() })),
    [items] // перераховується тільки коли items змінюється
  );
  return <ul>{processed.map(item => <li key={item.id}>{item.label}</li>)}</ul>;
}
```

Детально про `useMemo` та модель рендеру React — нотатка `programming/js/react-js/reactivity.md`.

## Вплив на продуктивність — чесний бенчмарк

```js
const { performance } = require("perf_hooks");
const BENCH_SIZE = 1000000;
const benchData = Array.from({ length: BENCH_SIZE }, (_, i) => i);

let t0 = performance.now();
function withPush(arr) {
  const result = [];
  for (const item of arr) result.push(item * 2);
  return result;
}
withPush(benchData);
console.log(`Dynamic push:  ${(performance.now() - t0).toFixed(0)}ms`);

t0 = performance.now();
function withPrealloc(arr) {
  const result = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) result[i] = arr[i] * 2;
  return result;
}
withPrealloc(benchData);
console.log(`Pre-allocated: ${(performance.now() - t0).toFixed(0)}ms`);

t0 = performance.now();
function withTyped(arr) {
  const result = new Float64Array(arr.length);
  for (let i = 0; i < arr.length; i++) result[i] = arr[i] * 2;
  return result;
}
withTyped(benchData);
console.log(`Typed Array:   ${(performance.now() - t0).toFixed(0)}ms`);
```

**Реальний вимір** (Node.js v24, кілька прогонів поспіль): `Dynamic push: ~18-19мс`, `Pre-allocated: ~3-4мс`, `Typed Array: ~2мс`. Тут ефект справді відтворюється й навіть перевершує застарілі оцінки з деяких сусідніх нотаток цієї серії — динамічний ріст масиву через `push()` приблизно у 5 разів повільніший за той самий масив з попередньо виділеним розміром, а typed array дає ще трохи зверху. На відміну від нотаток про hidden classes чи стабільність типів, тут різниця не залежить від тонкощів JIT-компіляції — вона про сам факт реалокацій пам'яті під час росту масиву, а це витрата, актуальна для будь-якої версії рушія.

## Коли allocation optimization найбільш критична

1. Hot paths — функції в `requestAnimationFrame`, гарячих циклах.
2. Data transformation pipelines — `map`/`filter`/`reduce` на великих масивах.
3. String processing — конкатенація в циклі.
4. Network response handling — трансформація API-відповідей.

## Підсумок

| Патерн | Алокацій | Продуктивність (орієнтовно, за виміром вище) |
|---|---|---|
| `push()` у циклі | N + можливі реалокації | базова |
| `new Array(n)` | 1 | помітно швидше |
| `new Float64Array(n)` | 1 | ще трохи швидше за `new Array(n)` |
| Spread `{...a, ...b}` у циклі | N | базова |
| Мутація існуючого об'єкта | 0 | максимальна |
| Lazy allocation | тільки при потребі | залежить від сценарію |

Ключовий принцип: мінімізуй кількість алокацій у гарячих шляхах. Pre-allocate, коли розмір відомий. Мутуй існуючі об'єкти замість створення нових. Виділяй ліниво, коли використання рідкісне.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код із `%…` виконуйте через `node --allow-natives-syntax`.

### Рівень 1. Основи

**1.** Алокація проти повторного використання: скільки об'єктів створено у циклі з 1000 ітерацій?

```js
(() => { let n1 = 0; for (let i = 0; i < 1000; i++) { const o = { x: i }; n1++; } let n2 = 0; const o = { x: 0 }; for (let i = 0; i < 1000; i++) { o.x = i; n2 += 0; } return [n1, n2]; })()
```

**2.** Попереднє виділення: різниця між `new Array(n)` + заповнення і `push`.

```js
(() => { const n = 5; const a = new Array(n); for (let i = 0; i < n; i++) a[i] = i; const b = []; for (let i = 0; i < n; i++) b.push(i); return [a, b, %HasHoleyElements(a), %HasHoleyElements(b)]; })()
```

**3.** Пре-алокація typed array: розмір результату відомий заздалегідь.

```js
(() => { const src = [1, 2, 3, 4]; const out = new Float64Array(src.length); for (let i = 0; i < src.length; i++) out[i] = src[i] * 2; return [out.length, [...out]]; })()
```

**4.** Скільки алокацій у конкатенації 3 рядків через `+` і через шаблон?

```js
(() => { const a = 'a', b = 'b', c = 'c'; return [a + b + c, `${a}${b}${c}`]; })()
```

### Рівень 2. Деталі й поведінка

**5.** Allocation sinking: чи потрібен об'єкт, якщо створюється лише для читання одного поля?

```js
(() => { const f = (x) => { const o = { v: x * 2 }; return o.v + 1; }; return f(5); })()
```

**6.** Coalescing: скільки об'єктів у двох окремих літералах проти одного об'єднаного?

```js
(() => { const a = { x: 1 }; const b = { y: 2 }; const merged = { ...a, ...b }; return [Object.keys(merged), 2, 1]; })()
```

**7.** Чи створює `Array.from` та spread новий масив?

```js
(() => { const a = [1, 2]; const b = [...a]; const c = Array.from(a); const d = a.slice(); return [a === b, a === c, a === d, b.length]; })()
```

**8.** Повторне використання буфера: `TextEncoder.encodeInto`.

```js
(() => { const buf = new Uint8Array(10); const r = new TextEncoder().encodeInto('abc', buf); return [r.read, r.written, [...buf.slice(0, 4)]]; })()
```

### Рівень 3. Нюанси та пастки

**9.** Чи створює `Object.entries` новий масив пар?

```js
(() => { const o = { a: 1, b: 2 }; const e = Object.entries(o); return [e.length, e[0], e[0] === Object.entries(o)[0]]; })()
```

**10.** Чи створює `arguments`/rest-параметри новий масив при кожному виклику?

```js
(() => { const f = (...a) => a; return f(1) === f(1); })()
```

**11.** Чи повертає `array.length = 0` те саме посилання (повторне використання масиву)?

```js
(() => { const a = [1, 2, 3]; const ref = a; a.length = 0; a.push(7); return [ref === a, ref]; })()
```

**12.** Яка справжня вартість алокації у V8?

### Рівень 4. Практика

**13.** Що таке allocation sinking?

**14.** Коли пре-алокація шкодить?

### Відповіді

1. `[1000, 0]`
2. `[[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], true, false]`
3. `[4, [2, 4, 6, 8]]`
4. `['abc', 'abc']`
5. `11`
6. `[['x', 'y'], 2, 1]`
7. `[false, false, false, 2]`
8. `[3, 3, [97, 98, 99, 0]]`
9. `[2, ['a', 1], false]`
10. `false`
11. `[true, [7]]`
12. Сама алокація в молодому поколінні дешева (зсув вказівника), але вона збільшує тиск на GC; вартість проявляється при частих збірках та копіюванні виживших
13. Оптимізація, що відкладає створення об'єкта до моменту, коли він справді потрібен, або прибирає його зовсім, якщо не втікає
14. `new Array(n)` робить масив «holey» і може уповільнити доступ; для чисел краще typed array або `push`/`Array.from`
