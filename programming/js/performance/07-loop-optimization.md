# V8: оптимізація циклів та векторизація

## Загальна ідея

V8 може застосовувати дві ключові оптимізації до циклів:

- **loop unrolling** (розгортання циклу) — менше ітерацій, менше overhead;
- **vectorization (SIMD)** — обробка кількох елементів за один такт CPU.

Обидві оптимізації працюють найкраще з typed arrays та простою математикою. Для звичайних об'єктів V8 рідко може застосувати ці оптимізації.

## 1. Loop unrolling

Звичайний цикл має overhead на кожній ітерації:

```asm
loop:
  ldr  x0, [x1, x19]   ; завантаж елемент
  ; ... обробка ...
  add  x19, x19, #8    ; i++
  cmp  x19, x20        ; i < length?
  blt  loop            ; jump назад (branch overhead!)
```

Після loop unrolling (×4) — кожні 4 елементи за одну «ітерацію»:

```asm
loop:
  ldr  x0, [x1, x19]        ; елемент [i]
  ldr  x2, [x1, x19, #8]    ; елемент [i+1]
  ldr  x3, [x1, x19, #16]   ; елемент [i+2]
  ldr  x4, [x1, x19, #24]   ; елемент [i+3]
  ; ... обробка всіх 4 ...
  add  x19, x19, #32        ; i += 4
  cmp  x19, x20
  blt  loop                 ; 4x менше branch overhead!
```

Результат: у 4 рази менше перевірок умови та branch-інструкцій (детально про регістри й асемблер ARM64 — нотатка `programming/assembly/arm64/arm64.md`).

## 2. SIMD-векторизація

SIMD (Single Instruction Multiple Data) — одна інструкція обробляє кілька значень паралельно:

```asm
; без SIMD: обробляємо по одному (4 такти)
fmul d0, d0, d1   ; result[0] = a[0] * b[0]
fmul d2, d2, d3   ; result[1] = a[1] * b[1]
fmul d4, d4, d5   ; result[2] = a[2] * b[2]
fmul d6, d6, d7   ; result[3] = a[3] * b[3]

; з SIMD (ARM64 NEON): обробляємо 4 за раз (1 такт!)
fmul v0.4s, v0.4s, v1.4s   ; result[0..3] = a[0..3] * b[0..3]
```

V8 може автоматично векторизувати цикли, якщо: використовуються typed arrays (не звичайні масиви), операції прості та передбачувані (без умов усередині), дані послідовні в пам'яті (sequential memory access).

## 3. Typed arrays проти звичайних масивів

Це ключова різниця для loop-оптимізацій:

```js
// ❌ Звичайний масив — V8 не завжди може векторизувати
const regularArrExample = [1.0, 2.0, 3.0, 4.0]; // PACKED_DOUBLE_ELEMENTS
// кожен елемент потенційно окремий HeapNumber; дані не гарантовано
// послідовні в пам'яті так само, як у typed array

// ✅ Typed array — V8 може векторизувати
const typedArrExample = new Float64Array([1.0, 2.0, 3.0, 4.0]);
// дані — чисті числа, послідовно в пам'яті: [1.0][2.0][3.0][4.0] —
// одним блоком
```

Розташування в пам'яті (концептуально):

```text
Звичайний масив [1.0, 2.0, 3.0]:
Heap: [ptr→HeapNumber] [ptr→HeapNumber] [ptr→HeapNumber]
           ↓                  ↓                  ↓
       [1.0 @ 0x1000]   [2.0 @ 0x2000]   [3.0 @ 0x3000]
       (потенційно розкидані по купі)

Float64Array [1.0, 2.0, 3.0]:
Buffer: [1.0][2.0][3.0]  ← послідовно, ідеально для SIMD та cache
         0x1000 0x1008 0x1010
```

## 4. Cache locality

Послідовна пам'ять — це не тільки про SIMD. Кеш CPU працює блоками (cache lines, зазвичай 64 байти):

```text
Float64Array (8 bytes per element):
Cache line (64 bytes) = 8 елементів за раз!

Коли читаєш arr[0], CPU автоматично завантажує arr[0..7] в кеш.
arr[1], arr[2], ... arr[7] — вже в кеші (безкоштовно).

Звичайний масив (найгірший випадок, коли елементи розкидані):
arr[0] → завантажуй з 0x1000 (cache miss)
arr[1] → завантажуй з 0x2000 (cache miss знову!)
arr[2] → завантажуй з 0x3000 (cache miss знову!)
Кожен елемент — потенційно окремий cache miss.
```

## Правила для оптимізації циклів

### Правило 1: typed arrays для числових даних

```js
// ❌ Неправильно: звичайний масив для числових обчислень
const positionsBad = [];
for (let i = 0; i < 10000; i++) {
  positionsBad.push(Math.random());
}
for (let i = 0; i < positionsBad.length; i++) {
  positionsBad[i] *= 2;
}
```

```js
// ✅ Правильно: typed array
const positions = new Float64Array(10000);
for (let i = 0; i < positions.length; i++) {
  positions[i] = Math.random();
}
for (let i = 0; i < positions.length; i++) {
  positions[i] *= 2; // V8 може векторизувати
}
```

### Правило 2: Structure of Arrays (SoA) замість Array of Structures (AoS)

```js
// ❌ AoS (Array of Structures) — гірше для cache/SIMD
const particlesAoS = [];
for (let i = 0; i < 10000; i++) {
  particlesAoS.push({ x: 0, y: 0, vx: 0, vy: 0 });
}
for (let i = 0; i < particlesAoS.length; i++) {
  particlesAoS[i].x += particlesAoS[i].vx; // доступ до розкиданих по пам'яті об'єктів
}
```

```js
// ✅ SoA (Structure of Arrays) — краще для SIMD і cache
const xs = new Float64Array(10000);
const ys = new Float64Array(10000);
const vxs = new Float64Array(10000);
const vys = new Float64Array(10000);
for (let i = 0; i < 10000; i++) {
  xs[i] += vxs[i]; // послідовний доступ → SIMD + cache friendly
  ys[i] += vys[i]; // послідовний доступ → SIMD + cache friendly
}
```

### Правило 3: уникай умов усередині гарячих циклів

```js
// ❌ Умова всередині заважає векторизації
const condArr = new Float64Array(10000);
for (let i = 0; i < condArr.length; i++) {
  if (condArr[i] > 0) {          // умова → перешкода для векторизації
    condArr[i] = condArr[i] * 2;
  }
}
```

```js
// ✅ Винеси логіку або використовуй математику замість умов
for (let i = 0; i < condArr.length; i++) {
  condArr[i] = Math.max(0, condArr[i]) * 2; // Math.max замість if
}
```

```js
// ✅ Або розділи на два цикли (filter → process)
const indices = [];
for (let i = 0; i < condArr.length; i++) {
  if (condArr[i] > 0) indices.push(i);
}
for (let i = 0; i < indices.length; i++) {
  condArr[indices[i]] *= 2;
}
```

### Правило 4: прості операції в циклі

```js
function someComplexFunction(v) {
  return v * v + 1; // умовно "складна" функція
}
const dataForComplex = new Float64Array(1000);

// ❌ Виклик функції в циклі ускладнює оптимізацію
for (let i = 0; i < dataForComplex.length; i++) {
  dataForComplex[i] = someComplexFunction(dataForComplex[i]);
}
```

```js
// ✅ Прямі математичні операції легше векторизувати
for (let i = 0; i < dataForComplex.length; i++) {
  dataForComplex[i] = dataForComplex[i] * 2.0 + 1.0;
}
```

### Правило 5: уникай залежностей між ітераціями

```js
const depArr = new Float64Array(1000);
const resultArr = new Float64Array(1000);

// ❌ Залежність між ітераціями заважає векторизації
for (let i = 1; i < depArr.length; i++) {
  depArr[i] = depArr[i] + depArr[i - 1]; // depArr[i] залежить від попереднього!
}
```

```js
// ✅ Незалежні ітерації легше векторизувати
for (let i = 0; i < depArr.length; i++) {
  resultArr[i] = depArr[i] * 2; // кожна ітерація незалежна
}
```

## Вплив на продуктивність — чесний бенчмарк

```js
const { performance } = require("perf_hooks");
const SIZE = 1000000;

// ❌ Звичайний масив
const regularArr = Array.from({ length: SIZE }, () => Math.random());
let t0 = performance.now();
for (let i = 0; i < regularArr.length; i++) {
  regularArr[i] *= 2;
}
console.log(`Regular Array: ${(performance.now() - t0).toFixed(0)}ms`);

// ✅ Typed array
const typedArr = new Float64Array(SIZE);
for (let i = 0; i < SIZE; i++) typedArr[i] = Math.random();
t0 = performance.now();
for (let i = 0; i < typedArr.length; i++) {
  typedArr[i] *= 2;
}
console.log(`Typed Array:   ${(performance.now() - t0).toFixed(0)}ms`);

// ❌ AoS (Array of Structures)
const aos = Array.from({ length: SIZE }, () => ({ x: Math.random(), y: Math.random() }));
t0 = performance.now();
for (let i = 0; i < aos.length; i++) {
  aos[i].x += aos[i].y;
}
console.log(`AoS:           ${(performance.now() - t0).toFixed(0)}ms`);

// ✅ SoA (Structure of Arrays)
const soa = { x: new Float64Array(SIZE), y: new Float64Array(SIZE) };
for (let i = 0; i < SIZE; i++) {
  soa.x[i] = Math.random();
  soa.y[i] = Math.random();
}
t0 = performance.now();
for (let i = 0; i < SIZE; i++) {
  soa.x[i] += soa.y[i];
}
console.log(`SoA:           ${(performance.now() - t0).toFixed(0)}ms`);
```

**Реальний вимір** (Node.js v24, кілька прогонів поспіль): `Regular Array: ~3мс`, `Typed Array: ~2-3мс`, `AoS: ~12-16мс`, `SoA: ~3мс`. На відміну від деяких сусідніх нотаток цієї серії, тут різниця AoS проти SoA реально відтворюється і стабільно велика — приблизно у 4–5 разів. А от різниця «звичайний масив проти typed array» для цього простого прикладу (`arr[i] *= 2`) на сучасному V8 практично зникла: сучасний рушій добре оптимізує навіть прості цикли над звичайними масивами чисел без домішки інших типів. Висновок: конкретна поведінка залежить від патерну доступу до пам'яті куди сильніше, ніж від самого факту «typed array чи ні» — розкидані по пам'яті об'єкти (AoS) справді шкодять, а послідовний прохід по числах — швидкий незалежно від контейнера, якщо масив залишається однорідним (детально — нотатка про стабільність типів).

## Коли оптимізація циклів найбільш критична

1. Particle systems — оновлення позицій тисяч частинок.
2. Physics simulations — векторна математика.
3. Image/audio processing — обробка пікселів, сигналів.
4. Matrix operations — 3D-трансформації.
5. Data processing — агрегація великих числових датасетів.

Для циклів з малою кількістю ітерацій (менше приблизно 1000) ці оптимізації не мають помітного ефекту.

## Підсумок

| Підхід | Відносна швидкість (реальний вимір) | Причина |
|---|---|---|
| Звичайний масив (однорідні числа) | базова | на сучасному V8 близька до typed array для простих циклів |
| Typed array | зазвичай не гірше, іноді трохи краще | послідовна пам'ять, потенційний SIMD |
| AoS (Array of Structures) | у 4–5 разів повільніше за SoA | доступ до розкиданих по пам'яті об'єктів, гірша cache locality |
| SoA (Structure of Arrays) | базова, як і typed array | послідовний доступ, cache friendly |
| Цикл з умовами всередині | повільніше за без умов | заважає векторизації |
| Цикл без умов | найшвидше з можливого | V8 має найбільше простору для оптимізації |

Ключовий принцип: для числових обчислень у циклах — typed arrays та Structure of Arrays. Тримай тіло циклу простим та без умов. Головний реально підтверджений вузол — це розташування даних у пам'яті (AoS проти SoA), а не сам факт вибору `Array` проти `Float64Array` для вже однорідних числових даних.

## Задачі для закріплення

14 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чи однаковий результат у звичайному циклі та розкрученому (unrolled) на 4?

```js
(() => { const a = Array.from({ length: 10 }, (_, i) => i + 1); let s1 = 0; for (let i = 0; i < a.length; i++) s1 += a[i]; let s2 = 0, i = 0; for (; i + 3 < a.length; i += 4) s2 += a[i] + a[i + 1] + a[i + 2] + a[i + 3]; for (; i < a.length; i++) s2 += a[i]; return [s1, s2]; })()
```

**2.** Скільки ітерацій у звичайному та розкрученому на 4 для n = 1000?

```js
[1000, 1000 / 4]
```

**3.** Звичайний масив чи Float64Array: чи однаковий результат суми?

```js
(() => { const n = 1000; const a = Array.from({ length: n }, (_, i) => i * 0.5); const t = Float64Array.from(a); let s1 = 0, s2 = 0; for (const x of a) s1 += x; for (let i = 0; i < n; i++) s2 += t[i]; return [s1, s2, s1 === s2]; })()
```

**4.** Cache locality: скільки елементів у кеш-лінії 64 байти для Float64 та Uint8?

```js
[64 / Float64Array.BYTES_PER_ELEMENT, 64 / Uint8Array.BYTES_PER_ELEMENT]
```

### Рівень 2. Деталі й поведінка

**5.** Порядок обходу матриці: чи однаковий результат за рядками та за стовпцями?

```js
(() => { const n = 4; const m = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i * n + j)); let r = 0, c = 0; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r += m[i][j]; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) c += m[i][j]; return [r, c]; })()
```

**6.** Плоский масив замість масиву масивів: індекс елемента (i, j) у матриці n×n.

```js
(() => { const n = 4; const flat = new Int32Array(n * n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) flat[i * n + j] = i * n + j; return [flat[2 * n + 3], flat.length]; })()
```

**7.** Винесення інваріанта з циклу: чи змінюється результат?

```js
(() => { const a = [1, 2, 3, 4]; const k = 3; let s1 = 0; for (let i = 0; i < a.length; i++) s1 += a[i] * (k * 2); const kk = k * 2; let s2 = 0; for (let i = 0; i < a.length; i++) s2 += a[i] * kk; return [s1, s2]; })()
```

**8.** Кешування `length`: чи змінюється поведінка, якщо масив мутує під час циклу?

```js
(() => { const a = [1, 2, 3]; const out = []; for (let i = 0, n = a.length; i < n; i++) { out.push(a[i]); if (i === 0) a.push(99); } const b = [1, 2, 3]; const out2 = []; for (let i = 0; i < b.length; i++) { out2.push(b[i]); if (i === 0) b.push(99); } return [out, out2]; })()
```

### Рівень 3. Нюанси та пастки

**9.** `forEach` проти `for`: чи можна перервати `forEach`?

```js
(() => { const a = [1, 2, 3, 4]; let seen = 0; a.forEach(x => { seen++; if (x === 2) return; }); let s2 = 0; for (const x of a) { s2++; if (x === 2) break; } return [seen, s2]; })()
```

**10.** Скільки ітерацій виконує `for (i = n; i--; )` для n = 5?

```js
(() => { const r = []; for (let i = 5; i--;) r.push(i); return r; })()
```

**11.** Злиття двох циклів (loop fusion): чи однаковий результат?

```js
(() => { const a = [1, 2, 3]; const s1 = a.map(x => x * 2).reduce((s, x) => s + x, 0); let s2 = 0; for (const x of a) s2 += x * 2; return [s1, s2]; })()
```

**12.** Що таке loop unrolling і навіщо?

### Рівень 4. Практика

**13.** Що таке SIMD-векторизація?

**14.** Чому typed arrays швидші за звичайні для чисел?

### Відповіді

1. `[55, 55]`
2. `[1000, 250]`
3. `[249750, 249750, true]`
4. `[8, 64]`
5. `[120, 120]`
6. `[11, 16]`
7. `[60, 60]`
8. `[[1, 2, 3], [1, 2, 3, 99]]`
9. `[4, 2]`
10. `[4, 3, 2, 1, 0]`
11. `[12, 12]`
12. Виконання кількох ітерацій тіла за один прохід, щоб зменшити витрати на перевірку умови та перехід; V8 робить це автоматично в оптимізованому коді
13. Одна інструкція CPU обробляє кілька елементів одночасно (наприклад, 4 float); працює з typed arrays і простими циклами без розгалужень
14. Однорідний тип без боксингу, безперервна пам'ять, передбачуваний доступ та краща локальність кешу
