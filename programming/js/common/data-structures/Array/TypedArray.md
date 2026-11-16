# TypedArray — типізовані масиви для роботи з сирою пам'яттю

## 1. Що таке TypedArray, і чому він інший, ніж звичайний Array

Звичайний масив `[1, 2, 3]` — це, по суті, список посилань на значення, розкидані по Heap (детально в [performance/07-loop-optimization.md](../../../performance/07-loop-optimization.md), розділ про memory layout). Typed Array — це «вікно» в суцільний, однорідний блок сирої пам'яті (`ArrayBuffer`), де кожен елемент — це рівно N байтів числа фіксованого типу, записаних послідовно, один за одним — так само, як масив у C.

Саме тому `TypedArray`:

- не може містити «діри», `undefined` чи значення інших типів — лише числа одного заданого розміру/знаковості;
- не може змінювати розмір (немає `push`/`pop`/`shift`/`unshift` — детально відсутні методи в розділі 6);
- ініціалізується нулями автоматично при створенні;
- у Three.js (та WebGL/GPU загалом) — єдиний формат, який GPU реально розуміє: відеокарта не працює зі «звичайними» JS-об'єктами, лише з послідовними байтами.

```js
const regularArrayExample = [1, 2, 3]; // об'єкт-список посилань, гнучкий, повільніший для чисел
const typedArrayExample = new Float32Array([1, 2, 3]); // суцільний блок пам'яті, лише числа
console.log(regularArrayExample, typedArrayExample);
```

## 2. ArrayBuffer — «сира» пам'ять без жодної інтерпретації

`ArrayBuffer` — це просто виділений блок байтів фіксованого розміру. Сам по собі він не розуміє, як інтерпретувати ці байти (як цілі числа? як float? скільки байтів на елемент?) — це «сирі дані», без жодної структури.

```js
const buffer = new ArrayBuffer(16); // 16 байтів пам'яті, ще не інтерпретованих
console.log(buffer.byteLength); // 16

// щоб реально читати/писати в цю пам'ять, потрібен TypedArray-
// "відʼювач" (view), що каже: "інтерпретуй ці байти як числа
// такого-от типу":
const view32 = new Float32Array(buffer); // 16 байт / 4 байти на float = 4 елементи
console.log(view32.length); // 4

// найчастіше ArrayBuffer створюється неявно — коли просто пишеш
// new Float32Array(4), рушій сам виділяє потрібний ArrayBuffer
// "під капотом":
const implicitBuffer = new Float32Array(4);
console.log(implicitBuffer.buffer.byteLength); // 16 — той самий принцип,
// без ручного ArrayBuffer
```

## 3. Всі типи TypedArray — різниця в розмірі й знаковості елемента

- `Int8Array` — знакове ціле, 1 байт (-128 .. 127);
- `Uint8Array` — беззнакове ціле, 1 байт (0 .. 255);
- `Uint8ClampedArray` — як `Uint8Array`, але «заклинює» (clamp) значення в межах 0-255, замість переповнення (типово для пікселів);
- `Int16Array` — знакове ціле, 2 байти (-32768 .. 32767);
- `Uint16Array` — беззнакове ціле, 2 байти (0 .. 65535);
- `Int32Array` — знакове ціле, 4 байти;
- `Uint32Array` — беззнакове ціле, 4 байти;
- `Float32Array` — число з рухомою комою, 4 байти — саме цей формат використовує WebGL/Three.js для координат, кольорів, швидкостей — GPU апаратно оптимізований під 32-бітний float;
- `Float64Array` — число з рухомою комою, 8 байтів (звичайна точність JS number);
- `BigInt64Array` / `BigUint64Array` — 64-бітні цілі як `BigInt`.

```js
console.log(Int8Array.BYTES_PER_ELEMENT); // 1
console.log(Float32Array.BYTES_PER_ELEMENT); // 4
console.log(Float64Array.BYTES_PER_ELEMENT); // 8

// переповнення "обгортається" (wraps around), а не кидає помилку:
const uint8 = new Uint8Array(1);
uint8[0] = 256; // 256 не влазить у 0-255
console.log(uint8[0]); // 0 — "обгорнулось" через межу (256 mod 256)
uint8[0] = -1;
console.log(uint8[0]); // 255 — те саме в інший бік

const clamped = new Uint8ClampedArray(1);
clamped[0] = 300;
console.log(clamped[0]); // 255 — а тут не "обгортається", а обрізається до максимуму
// (типово для роботи з кольорами пікселів: 0-255, без "переливу")
```

## 4. Способи створення TypedArray

```js
// а) з числа — виділяє масив із N елементів, усі одразу 0:
const zerosFloat = new Float32Array(5);
console.log(zerosFloat); // Float32Array(5) [0, 0, 0, 0, 0]

// б) зі звичайного JS-масиву — копіює значення, конвертуючи типи:
const fromRegularArray = new Float32Array([1, 2.5, 3]);
console.log(fromRegularArray); // Float32Array(3) [1, 2.5, 3]

// в) з іншого TypedArray — копіює значення (може бути інший тип!):
const fromAnotherTyped = new Int32Array(fromRegularArray); // float → int: дробова частина відкидається
console.log(fromAnotherTyped); // Int32Array(3) [1, 2, 3] — 2.5 стало 2, не округлилось!

// г) з ArrayBuffer + зсув (offset) + довжина — для "нарізання" одного
// буфера на кілька view (детально в розділі 8 нижче):
const sharedBuffer = new ArrayBuffer(24); // 24 байти
const firstHalf = new Float32Array(sharedBuffer, 0, 3); // перші 3 float (12 байт, offset 0)
const secondHalf = new Float32Array(sharedBuffer, 12, 3); // ще 3 float (offset 12 байт)
console.log(firstHalf.length, secondHalf.length); // 3 3

// д) Array.from() / .of() — ті самі статичні методи, що й у звичайного Array:
console.log(Float32Array.from([1, 2, 3])); // Float32Array(3) [1, 2, 3]
console.log(Uint8Array.of(10, 20, 30)); // Uint8Array(3) [10, 20, 30]
```

## 5. Доступ до елементів — як у звичайного масиву

```js
const positions = new Float32Array([1.5, 2.5, 3.5]);
console.log(positions[0]); // 1.5
positions[1] = 99;
console.log(positions); // Float32Array(3) [1.5, 99, 3.5]
console.log(positions.length); // 3 — властивість, як і в звичайному Array

// індекс поза межами — не кидає помилку, просто мовчки ігнорується
// (на запис) або дає undefined (на читання) — інакше кажучи, довжину
// TypedArray дійсно неможливо змінити після створення:
positions[10] = 999; // нічого не відбувається, довжина лишається 3
console.log(positions.length, positions[10]); // 3 undefined
```

## 6. Методи, які є, і яких немає (порівняння зі звичайним Array)

Є всі «не-мутуючі довжину» методи звичайного `Array` (детально повний список у [Array.md](Array.md)):

```js
const nums = new Float32Array([5, 3, 8, 1, 9]);
console.log(nums.map((n) => n * 2)); // Float32Array(5) [10, 6, 16, 2, 18]
console.log(nums.filter((n) => n > 4)); // Float32Array(3) [5, 8, 9] — новий TypedArray того ж типу!
console.log(nums.reduce((a, b) => a + b)); // 26
console.log([...nums].sort((a, b) => a - b)); // сортування — через spread у звичайний масив
// (sort() на TypedArray теж є, мутує in-place)
console.log(nums.slice(1, 3)); // Float32Array(2) [3, 8] — копія частини
console.log(nums.indexOf(8)); // 2
console.log(nums.includes(9)); // true
console.log(nums.find((n) => n > 5)); // 8

// немає методів, що змінюють довжину (бо довжина фіксована назавжди):
// nums.push(10);   // TypeError: nums.push is not a function
// nums.pop();       // TypeError: nums.pop is not a function
// nums.shift();     // TypeError: nums.shift is not a function
// nums.splice(0,1); // TypeError: nums.splice is not a function

// є власні, специфічні для TypedArray методи:
const target = new Float32Array(5);
target.set([1, 2, 3], 1); // записати шматок даних, починаючи з індексу 1
console.log(target); // Float32Array(5) [0, 1, 2, 3, 0]

const subView = target.subarray(1, 4); // "вікно" в ту саму пам'ять, без копіювання!
subView[0] = 999;
console.log(target); // Float32Array(5) [0, 999, 2, 3, 0] — зміна subView
// відобразилась і на target, бо це одна й та сама пам'ять!
// (subarray() ≠ slice(): slice() копіює, subarray() — ні)
```

## 7. TypedArray є iterable — працює for...of / spread

```js
for (const value of positions) {
  console.log("value:", value);
}
console.log([...positions]); // [1.5, 99, 3.5] — звичайний Array із тими самими числами
```

## 8. DataView — коли потрібно змішувати різні типи в одному буфері

Якщо структура даних «мозаїчна» (наприклад, 1 байт-тип-запису + 4 байти float-значення), `TypedArray` сам не підходить (він однорідний) — для цього є `DataView`, який дозволяє читати/писати будь-який тип за будь-яким зсувом у тому ж буфері:

```js
const mixedBuffer = new ArrayBuffer(5); // 1 байт + 4 байти
const dataView = new DataView(mixedBuffer);
dataView.setUint8(0, 1); // байт 0: тип запису (1 = "particle")
dataView.setFloat32(1, 3.14, true); // байти 1-4: float-значення (true = little-endian)

console.log(dataView.getUint8(0)); // 1
console.log(dataView.getFloat32(1, true)); // 3.140000104904175 (типова похибка float32)
```

`DataView` рідко потрібен у Three.js напряму (сцени зазвичай однорідні масиви координат/кольорів), але часто зустрічається при роботі з бінарними форматами файлів (наприклад, парсинг `.glb`/`.stl` моделей).

## 9. Застосування в Three.js: BufferGeometry та система снігу/частинок

Three.js будує всю геометрію на `TypedArray`, бо WebGL передає дані напряму на GPU як сирі байти — жоден звичайний JS-масив об'єктів туди «як є» потрапити не може, тому Three.js всюди очікує саме `Float32Array` для координат, кольорів, розмірів тощо.

Спрощений приклад: система снігу з N частинок, кожна має x, y, z — той самий підхід «Structure of Arrays», що розглядався в [performance/07-loop-optimization.md](../../../performance/07-loop-optimization.md) (розділ «SoA замість AoS»):

```js
function createSnowPositions(particleCount, areaSize, height) {
  // один суцільний Float32Array: [x0,y0,z0, x1,y1,z1, x2,y2,z2, ...]
  // саме такого "плоского" формату (stride 3) очікує
  // THREE.BufferAttribute для позиції вершини/частинки
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;
    positions[idx] = (Math.random() - 0.5) * areaSize; // x: випадково в межах area
    positions[idx + 1] = Math.random() * height; // y: випадкова висота (падає зверху)
    positions[idx + 2] = (Math.random() - 0.5) * areaSize; // z: випадково в межах area
  }
  return positions;
}

const snowPositions = createSnowPositions(5, 100, 50);
console.log(snowPositions); // Float32Array(15) — 5 частинок × 3 координати
```

Псевдокод реального використання в Three.js (потребує рантайму three):

```text
import * as THREE from "three";

const particleCount = 10000;
const positions = createSnowPositions(particleCount, 100, 50);
const velocities = new Float32Array(particleCount); // швидкість падіння кожної частинки
for (let i = 0; i < particleCount; i++) {
  velocities[i] = 0.1 + Math.random() * 0.3;
}

const geometry = new THREE.BufferGeometry();
// "position" — стандартна назва атрибута; 3 — це stride
// (скільки чисел у Float32Array складають одну вершину: x,y,z)
geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
const snow = new THREE.Points(geometry, material);
scene.add(snow);

function animateSnow() {
  const posAttribute = geometry.getAttribute("position");
  for (let i = 0; i < particleCount; i++) {
    const idx = i * 3;
    positions[idx + 1] -= velocities[i]; // рухаємо y (висоту) вниз — in-place,
                                          // без жодної нової алокації об'єкта
    if (positions[idx + 1] < 0) {
      positions[idx + 1] = 50; // "переродження" частинки нагорі, коли впала на землю
    }
  }
  posAttribute.needsUpdate = true; // сказати Three.js: "дані змінились,
                                    // перезаливай буфер на GPU цього кадру"
  requestAnimationFrame(animateSnow);
}
animateSnow();
```

Чому саме так, а не масив об'єктів `{ x, y, z }` на кожну сніжинку:

1. WebGL/GPU в принципі не вміє читати JS-об'єкти — лише байти в `ArrayBuffer`, тому `Float32Array` — єдиний формат, який можна «залити» в буфер GPU (`geometry.attributes.position`);
2. на 10 000+ частинок різниця в продуктивності між «масивом об'єктів» і «плоским `Float32Array`» — саме той GC-тиск і cache locality, що детально розібрані в [performance/05-gc-patterns.md](../../../performance/05-gc-patterns.md) і [performance/07-loop-optimization.md](../../../performance/07-loop-optimization.md) (SoA проти AoS);
3. `posAttribute.needsUpdate = true` — Three.js не передає весь масив на GPU щоразу заново; він повторно використовує ту саму пам'ять (той самий `Float32Array`), і просто «перезаливає» її вміст — це живий приклад Object Pool-патерну з [performance/03-escape-analysis.md](../../../performance/03-escape-analysis.md) та [performance/05-gc-patterns.md](../../../performance/05-gc-patterns.md): один буфер перевикористовується щокадру, замість створення нового.

## 10. TypedArray + requestAnimationFrame — чому це «зводить» кілька тем разом

Патерн «один `Float32Array`, який мутується in-place щокадру» — це одночасно:

- **Allocation Optimization** ([performance/09-allocation-optimization.md](../../../performance/09-allocation-optimization.md)): 0 нових алокацій на кадр, замість тисяч нових об'єктів `{x,y,z}`;
- **GC Patterns** ([performance/05-gc-patterns.md](../../../performance/05-gc-patterns.md)): немає що прибирати збирачу сміття — пам'ять перевикористовується назавжди;
- **Loop Optimization** ([performance/07-loop-optimization.md](../../../performance/07-loop-optimization.md)): цикл по `Float32Array` — послідовна пам'ять, придатна для SIMD/cache;
- реальна WebGL-вимога: GPU в принципі вимагає саме такий формат.

Тобто снігова система в Three.js — це, по суті, «живий» приклад одразу декількох принципів продуктивності з `performance/`, а не довільний вибір формату даних.

## Підсумок

- `TypedArray` — «вікно» в суцільний блок сирої пам'яті (`ArrayBuffer`), де кожен елемент — число фіксованого розміру/знаковості.
- На відміну від звичайного `Array`: не може змінювати довжину, не може містити змішані типи чи «діри», ініціалізується нулями.
- Основні типи: `Int8`/`Uint8`/`Uint8Clamped`/`Int16`/`Uint16`/`Int32`/`Uint32`/`Float32`/`Float64Array` — різняться розміром (байти) і знаковістю; `Float32Array` — стандарт для WebGL/Three.js (координати, кольори).
- Переповнення «обгортається» (крім `Uint8ClampedArray`, де воно «обрізається» — типово для роботи з пікселями/кольорами).
- Є майже всі «немутуючі довжину» методи звичайного `Array` (`map`/`filter`/`reduce`/`slice`/`find`...), але немає `push`/`pop`/`shift`/`splice` — довжина фіксована завжди.
- Власні методи: `.set()` (записати шматок даних), `.subarray()` (вікно в ту саму пам'ять, без копіювання — на відміну від `slice()`).
- `DataView` — коли в одному буфері потрібно змішати різні типи за конкретними зсувами (бінарні формати файлів).
- У Three.js: вся геометрія (`BufferGeometry`) будується на `Float32Array`, бо GPU фізично не вміє читати нічого іншого; типовий патерн для анімованих частинок (сніг, дощ, зорі) — один `Float32Array`, що мутується in-place щокадру, а не масив об'єктів `{x,y,z}`, що перестворюється щоразу.
- Цей самий патерн об'єднує одразу кілька принципів продуктивності з `performance/` — allocation optimization, GC patterns, loop optimization, і є прямою вимогою самого WebGL/GPU, а не лише «оптимізацією про всяк випадок».

## Задачі для закріплення

32 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Скільки байтів займає елемент `Int8Array`, `Uint16Array`, `Float32Array`, `Float64Array`, `BigInt64Array`?

```js
[Int8Array, Uint16Array, Float32Array, Float64Array, BigInt64Array].map(T => T.BYTES_PER_ELEMENT)
```

**2.** Що дасть переповнення в `Uint8Array`?

```js
(() => { const a = new Uint8Array(2); a[0] = 256; a[1] = -1; return [...a]; })()
```

**3.** Що дасть `Uint8ClampedArray` при виході за межі?

```js
(() => { const a = new Uint8ClampedArray(3); a[0] = 300; a[1] = -5; a[2] = 1.5; return [...a]; })()
```

**4.** Що дасть переповнення в `Int8Array` для 128?

```js
(() => { const a = new Int8Array(1); a[0] = 128; return a[0]; })()
```

**5.** Яка довжина `Float32Array.from([1.1, 2.2])` і точність значення?

```js
(() => { const a = Float32Array.from([1.1, 2.2]); return [a.length, a[0] === 1.1, Math.abs(a[0] - 1.1) < 1e-6]; })()
```

**6.** Чи можна змінити довжину `TypedArray` через `push`?

```js
typeof new Uint8Array(2).push
```

**7.** Що поверне `ArrayBuffer(8).byteLength` і `Int32Array` над ним?

```js
(() => { const b = new ArrayBuffer(8); return [b.byteLength, new Int32Array(b).length, new Uint8Array(b).length]; })()
```

**8.** Чи ділять `Int32Array` і `Uint8Array` один буфер змін?

```js
(() => { const b = new ArrayBuffer(4); const i = new Int32Array(b), u = new Uint8Array(b); i[0] = 258; return [...u]; })()
```

### Рівень 2. Методи й поведінка

**9.** Що дасть `subarray` і `slice`: хто копіює?

```js
(() => { const a = new Uint8Array([1, 2, 3, 4]); const s = a.subarray(1, 3), c = a.slice(1, 3); a[1] = 99; return [s[0], c[0]]; })()
```

**10.** Що дасть `new Uint8Array([1, 2, 3]).map(x => x * 100)`?

```js
[...new Uint8Array([1, 2, 3]).map(x => x * 100)]
```

**11.** Що поверне `Array.isArray(new Uint8Array(1))` і `ArrayBuffer.isView`?

```js
[Array.isArray(new Uint8Array(1)), ArrayBuffer.isView(new Uint8Array(1)), ArrayBuffer.isView([])]
```

**12.** Що поверне `sort()` для `Int8Array([10, -2, 3])` без компаратора?

```js
[...new Int8Array([10, -2, 3]).sort()]
```

**13.** Чим відрізняється `fill` і `set` для `TypedArray`?

```js
(() => { const a = new Uint8Array(5); a.fill(7, 1, 3); a.set([1, 2], 3); return [...a]; })()
```

**14.** Що дасть `DataView` для запису `setUint16` у big-endian та little-endian?

```js
(() => { const dv = new DataView(new ArrayBuffer(4)); dv.setUint16(0, 258); dv.setUint16(2, 258, true); return [dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)]; })()
```

**15.** Що поверне `new Float32Array(2).fill(0.1)[0]` порівняно з `0.1`?

```js
(() => { const x = new Float32Array(1).fill(0.1)[0]; return [x === 0.1, x]; })()
```

**16.** Чи є `TypedArray` ітерованим і чи працює spread?

```js
[...new Uint8Array([1, 2, 3])]
```

### Рівень 3. Нюанси та пастки

**17.** Що поверне `Object.keys(new Uint8Array(3))` та `.length`?

```js
(() => { const a = new Uint8Array(3); return [Object.keys(a), a.length]; })()
```

**18.** Що поверне `BigInt64Array` при записі звичайного числа?

```js
(() => { try { const a = new BigInt64Array(1); a[0] = 1; } catch (e) { return e.name; } })()
```

**19.** Що дасть `TextEncoder().encode('Привіт').length` і чому не 6?

```js
new TextEncoder().encode('Привіт').length
```

**20.** Що поверне `Uint8Array.of(1, 2, 3).reverse()` і `toReversed()`?

```js
[[...Uint8Array.of(1, 2, 3).reverse()], [...Uint8Array.of(1, 2, 3).toReversed()]]
```

**21.** Напишіть `concat(a, b)` для двох `Uint8Array`.

```js
function concat(a, b) { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r }
```

**22.** Напишіть `sum(typed)` і порівняйте `reduce` для `Float32Array([0.1, 0.2])`.

```js
const sum = t => t.reduce((s, x) => s + x, 0)
```

**23.** Напишіть `toHex(bytes)` — рядок у hex.

```js
const toHex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('')
```

**24.** Напишіть `fromHex(str)` — зворотне перетворення.

```js
const fromHex = s => Uint8Array.from(s.match(/../g), h => parseInt(h, 16))
```

### Рівень 4. Практика й реалізація

**25.** Напишіть `grayscale(rgba)` для `Uint8ClampedArray` пікселів `[r,g,b,a]`. Результат для одного червоного пікселя?

```js
function grayscale(px) { const o = new Uint8ClampedArray(px.length); for (let i = 0; i < px.length; i += 4) { const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; o[i] = o[i + 1] = o[i + 2] = g; o[i + 3] = px[i + 3] } return o }
```

**26.** Напишіть `readUint32BE(bytes, offset)` через `DataView`.

```js
const readUint32BE = (b, o) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o)
```

**27.** Напишіть `float32Bits(x)` — бітове представлення `Float32`.

```js
function float32Bits(x) { const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, x); return dv.getUint32(0).toString(2).padStart(32, '0') }
```

**28.** Напишіть `isLittleEndian()` для платформи.

```js
const isLittleEndian = () => new Uint8Array(new Uint16Array([1]).buffer)[0] === 1
```

**29.** Напишіть `histogram(bytes)` — масив із 4 корзин для значень `0–255` (по 64).

```js
function histogram(b) { const h = new Uint32Array(4); for (const x of b) h[x >> 6]++; return h }
```

**30.** Напишіть `swapBytes16(arr)` — поміняти порядок байтів кожного `Uint16`.

```js
function swapBytes16(a) { return a.map(x => ((x & 0xff) << 8) | (x >> 8)) }
```

**31.** Напишіть `bufferToBase64(bytes)` і `base64ToBuffer(str)` (Node `Buffer`).

```js
const toB64 = b => Buffer.from(b).toString('base64')
const fromB64 = s => new Uint8Array(Buffer.from(s, 'base64'))
```

**32.** Напишіть `moveParticles(positions, velocities, dt)` — оновлення `Float32Array` позицій на місці.

```js
function moveParticles(p, v, dt) { for (let i = 0; i < p.length; i++) p[i] += v[i] * dt; return p }
```

### Відповіді

1. `[1, 2, 4, 8, 8]`
2. `[0, 255]`
3. `[255, 0, 2]`
4. `-128`
5. `[2, false, true]`
6. `'undefined'`
7. `[8, 2, 8]`
8. `[2, 1, 0, 0]`
9. `[99, 2]`
10. `[100, 200, 44]`
11. `[false, true, false]`
12. `[-2, 3, 10]`
13. `[0, 7, 7, 1, 2]`
14. `[1, 2, 2, 1]`
15. `[false, 0.10000000149011612]`
16. `[1, 2, 3]`
17. `[['0', '1', '2'], 3]`
18. `'TypeError'`
19. `12`
20. `[[3, 2, 1], [3, 2, 1]]`
21. Виклик `[...concat(new Uint8Array([1, 2]), new Uint8Array([3]))]` → `[1, 2, 3]`
22. Виклик `[sum(new Float32Array([0.1, 0.2])), sum(new Float64Array([0.1, 0.2]))]` → `[0.30000000447034836, 0.30000000000000004]`
23. Виклик `toHex(new Uint8Array([0, 15, 255]))` → `'000fff'`
24. Виклик `[...fromHex('000fff')]` → `[0, 15, 255]`
25. Виклик `[...grayscale(new Uint8ClampedArray([255, 0, 0, 255]))]` → `[76, 76, 76, 255]`
26. Виклик `readUint32BE(new Uint8Array([0, 0, 1, 2]), 0)` → `258`
27. Виклик `[float32Bits(1), float32Bits(-2)]` → `['00111111100000000000000000000000', '11000000000000000000000000000000']`
28. Виклик `typeof isLittleEndian()` → `'boolean'`
29. Виклик `[...histogram(new Uint8Array([0, 10, 70, 130, 200, 255, 64]))]` → `[2, 2, 1, 2]`
30. Виклик `[...swapBytes16(new Uint16Array([0x0102, 0xaabb]))].map(x => x.toString(16))` → `['201', 'bbaa']`
31. Виклик `[toB64(new Uint8Array([104, 105])), [...fromB64('aGk=')]]` → `['aGk=', [104, 105]]`
32. Виклик `[...moveParticles(new Float32Array([0, 1, 2]), new Float32Array([1, 1, 1]), 0.5)]` → `[0.5, 1.5, 2.5]`
