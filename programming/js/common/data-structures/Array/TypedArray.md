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
