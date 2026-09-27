# V8: escape analysis та розташування пам'яті

## Загальна ідея

Escape Analysis — це оптимізація V8, яка визначає: чи може об'єкт вийти за межі функції? Якщо ні — V8 може виділити його на стеку (або взагалі замінити скалярними змінними — Scalar Replacement) замість купи. Це усуває тиск на збирач сміття (GC) і дає пряму алокацію в регістрах CPU.

Основне правило: локалізуй об'єкти. Якщо об'єкт не потрібен за межами функції, V8 може оптимізувати його на стек.

## 1. Стек проти купи

**Стек (швидкий):** фіксований розмір (~1–8 МБ); автоматично очищається (коли функція завершується); `O(1)` алокація (просто зсунь pointer); немає тиску на GC.

**Купа (повільніший):** великий розмір (~100 МБ+); очищається через GC; складніша алокація; тиск на GC.

V8 при кожному `new Object()` (чи об'єктному літералі) запитує: «Цей об'єкт може вийти за межі функції?» Ні → стек / регістри CPU (Scalar Replacement). Так → купа (звичайний шлях).

## 2. Що таке «втеча» (escape)

Об'єкт «втікає» з функції, якщо він:

### 2.1. Повертається з функції

```js
function createPoint() {
  const p = { x: 1, y: 2 };
  return p; // ❌ escape
}
```

### 2.2. Записується в зовнішню змінну

```js
let globalPoint;
function setPoint() {
  const p = { x: 1, y: 2 };
  globalPoint = p; // ❌ escape
}
```

### 2.3. Передається в зовнішню функцію

```js
function someExternalFn(p) {
  console.log(p.x);
}
function createAndUse() {
  const p = { x: 1, y: 2 };
  someExternalFn(p); // ❌ потенційна втеча — V8 не знає, що робить someExternalFn з p
}
```

### 2.4. Не втікає

```js
function getDistance() {
  const p = { x: 3, y: 4 }; // ✅ no escape
  return Math.sqrt(p.x * p.x + p.y * p.y); // повертаємо число, не об'єкт
}
console.log(getDistance()); // 5
```

## 3. Scalar Replacement

Якщо V8 визначає, що об'єкт не втікає, він робить Scalar Replacement — розкладає об'єкт на окремі скалярні змінні:

```js
// твій код:
function getDistance2() {
  const p = { x: 3, y: 4 };
  return Math.sqrt(p.x * p.x + p.y * p.y);
}
```

Те, що V8 реально виконує після оптимізації (концептуально):

```js
function getDistance2Optimized() {
  const p_x = 3; // скалярна змінна замість об'єкта
  const p_y = 4; // скалярна змінна замість об'єкта
  return Math.sqrt(p_x * p_x + p_y * p_y);
}
```

Об'єкт `{ x, y }` ніколи не створюється на купі — `p_x`/`p_y` живуть у регістрах CPU. На рівні ARM64-асемблера, після Escape Analysis + Scalar Replacement, жодної алокації на купі немає (детально про регістри й асемблер ARM64 — нотатка `programming/assembly/arm64/arm64.md`):

```asm
mov x0, #3        ; x0 = p.x (регістр CPU)
mov x1, #4        ; x1 = p.y (регістр CPU)
mul x2, x0, x0    ; x2 = p.x * p.x = 9
mul x3, x1, x1    ; x3 = p.y * p.y = 16
add x0, x2, x3    ; x0 = 25
bl  sqrt          ; sqrt(25) = 5.0
ret
```

## 4. Коли V8 не може оптимізувати

V8 не знає, що робить зовнішня функція з об'єктом:

```js
function process(callback) {
  const temp = { value: 42 };
  callback(temp); // можливо, callback зберігає temp десь?
  // V8: "не впевнений → heap (безпечний варіант)"
  return temp.value;
}
```

«Чорні ящики» для V8 (завжди escape): будь-яка зовнішня функція (`fetch`, `console.log`, `setTimeout`...), замикання (closures), що захоплюють об'єкт, виклики DOM API.

## Правила для escape analysis

### Правило 1: не повертай проміжні об'єкти

```js
// ❌ Неправильно: кожен виклик = новий об'єкт на купі
function addVectorsBad(a, b) {
  return { x: a.x + b.x, y: a.y + b.y }; // escape
}
function calculatePathBad(points) {
  let result = { x: 0, y: 0 };
  for (const p of points) {
    result = addVectorsBad(result, p); // кожна ітерація = новий об'єкт!
  }
  return result;
}
// на 10000 points: 10000 нових об'єктів → тиск на GC
```

```js
// ✅ Правильно: скалярні змінні всередині циклу
function calculatePath(points) {
  let rx = 0;
  let ry = 0;
  for (const p of points) {
    rx += p.x; // скаляр на стеку
    ry += p.y; // скаляр на стеку
  }
  return { x: rx, y: ry }; // тільки один об'єкт у кінці
}
// 1 об'єкт замість 10000
```

### Правило 2: використовуй скаляри для тимчасових обчислень

```js
// ❌ Неправильно: непотрібні об'єкти для обчислень
function distanceEscape(x1, y1, x2, y2) {
  const dx = { value: x2 - x1 }; // непотрібний об'єкт!
  const dy = { value: y2 - y1 }; // непотрібний об'єкт!
  return Math.sqrt(dx.value * dx.value + dy.value * dy.value);
}
```

```js
// ✅ Правильно: прямі скалярні змінні
function distanceNoEscape(x1, y1, x2, y2) {
  const dx = x2 - x1; // число на стеку
  const dy = y2 - y1; // число на стеку
  return Math.sqrt(dx * dx + dy * dy);
}
```

### Правило 3: виноси константні об'єкти за межі функцій

```js
// ❌ Неправильно: новий об'єкт при кожному виклику
function getConfigBad() {
  return { timeout: 5000, retries: 3 }; // escape + новий об'єкт щоразу!
}
```

```js
// ✅ Правильно: константа поза функцією (створюється один раз)
const CONFIG = { timeout: 5000, retries: 3 };
function getConfig() {
  return CONFIG;
}
```

У React/Vue той самий принцип: статичний style-об'єкт виносять за межі компонента, щоб не створювати його на кожен рендер:

```jsx
const STYLE = { color: "red", fontSize: 16 };
function Component({ data }) { return <div style={STYLE}>{data}</div>; }
```

### Правило 4: уникай проміжних об'єктів у гарячих циклах

```js
// ❌ Неправильно:
function processParticlesBad(particles) {
  for (const p of particles) {
    const velocity = { x: p.vx, y: p.vy }; // новий об'єкт кожну ітерацію!
    const position = { x: p.x, y: p.y };   // новий об'єкт кожну ітерацію!
    updatePosition(position, velocity);     // обидва escape!
    p.x = position.x;
    p.y = position.y;
  }
}
function updatePosition(position, velocity) {
  position.x += velocity.x;
  position.y += velocity.y;
}
```

```js
// ✅ Правильно: in-place, без проміжних об'єктів
function processParticles(particles) {
  for (const p of particles) {
    p.x += p.vx; // модифікуємо прямо
    p.y += p.vy; // модифікуємо прямо
    // 0 нових об'єктів
  }
}
```

### Правило 5: object pool для об'єктів, що неминуче повертаються

Коли мусиш повертати об'єкт (він неминуче escape), використовуй object pool:

```js
class ObjectPool {
  constructor(Ctor, size) {
    this.Ctor = Ctor;
    this.available = Array.from({ length: size }, () => new Ctor());
  }
  get() {
    return this.available.pop() || new this.Ctor();
  }
  release(obj) {
    this.available.push(obj);
  }
}
class Vec2 {
  constructor() {
    this.x = 0;
    this.y = 0;
  }
}
```

```js
// ❌ Неминучий escape без пулу: кожен виклик = новий об'єкт
const player = { x: 10, y: 20 };
function getPlayerPositionBad() {
  return { x: player.x, y: player.y }; // escape, але потрібен
}
for (let i = 0; i < 10000; i++) {
  getPlayerPositionBad(); // 10000 нових об'єктів!
}
```

```js
// ✅ Object pool для неминучих escape-об'єктів
const positionPool = new ObjectPool(Vec2, 100);
function getPlayerPosition() {
  const pos = positionPool.get();
  pos.x = player.x;
  pos.y = player.y;
  return pos; // escape, але перевикористовуємо з пула
}
for (let i = 0; i < 10000; i++) {
  const pos = getPlayerPosition();
  // ... використання ...
  positionPool.release(pos);
}
// 0 нових алокацій → 0 GC-пауз
```

## Контекст-специфічні приклади

### Чистий JavaScript

```js
// ❌ Неправильно: проміжні об'єкти в pipeline
function processDataBad(data) {
  const filtered = data.filter((x) => x > 0);          // новий масив!
  const mapped = filtered.map((x) => ({ v: x }));       // новий масив + нові об'єкти!
  const result = mapped.reduce((acc, x) => acc + x.v, 0);
  return result;
}
```

```js
// ✅ Правильно: один прохід, без проміжних структур
function processData(data) {
  let result = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0) {
      result += data[i]; // скаляр, без проміжних об'єктів
    }
  }
  return result;
}
```

### Vue (Composition API) — псевдокод (потребує Vue-рантайму)

```js
// ❌ Неправильно: computed створює новий об'єкт щоразу
const position = computed(() => ({ x: player.value.x, y: player.value.y }));

// ✅ Правильно: окремі computed для скалярів
const posX = computed(() => player.value.x);
const posY = computed(() => player.value.y);

// або мутуй існуючий reactive-об'єкт замість створення нового:
const position = reactive({ x: 0, y: 0 });
watchEffect(() => {
  position.x = player.value.x;
  position.y = player.value.y;
});
```

Детально про `computed`, `reactive` та `watchEffect` — нотатки в `programming/js/vue-js/`.

### React — псевдокод (потребує React-рантайму)

```jsx
// ❌ Неправильно: новий об'єкт на кожен рендер
function GameComponent({ player }) {
  const style = { left: player.x, top: player.y }; // новий об'єкт кожен рендер!
  return <div style={style} />;
}

// ✅ Правильно для статичних значень: винеси за межі компонента
const BASE_STYLE = { position: "absolute" };

// ✅ Правильно для динамічних: useMemo
function GameComponent({ player }) {
  const style = useMemo(() => ({ left: player.x, top: player.y }), [player.x, player.y]);
  return <div style={style} />;
}
```

## Вплив на продуктивність — чесний бенчмарк

```js
const { performance } = require("perf_hooks");

let t0 = performance.now();
for (let i = 0; i < 10000000; i++) distanceEscape(0, 0, i, i);
console.log(`With escape:    ${(performance.now() - t0).toFixed(0)}ms`);

t0 = performance.now();
for (let i = 0; i < 10000000; i++) distanceNoEscape(0, 0, i, i);
console.log(`Without escape: ${(performance.now() - t0).toFixed(0)}ms`);
```

⚠️ **Реальний вимір** (Node.js v24): `With escape: 10ms`, `Without escape: 7ms` для 10 мільйонів ітерацій — сучасний V8 уже сам вбудовує (inline) й прибирає такі крихітні тимчасові об'єкти в багатьох випадках, тому різниця на цьому прикладі значно менша за старі оцінки в кілька разів. Так само, як у нотатках про hidden classes і про стабільність типів: сам механізм escape analysis реальний і задокументований, але точна величина виграшу залежить від версії рушія й конкретного коду. Правило «не створюй зайвих тимчасових об'єктів у гарячому циклі» лишається корисним і для читабельності коду, і для випадків, де JIT ще не встиг чи не зміг оптимізувати, але не варто очікувати драматичної різниці на кожному найпростішому прикладі.

## Коли escape analysis найбільш критична

1. Математичні функції — vector math, physics, geometry.
2. Гарячі цикли — particle systems, game loops, обробка даних.
3. Компоненти, що часто ре-рендеряться — React/Vue списки.
4. Функції, що викликаються в `requestAnimationFrame` — 60 разів на секунду.

## Підсумок

| Ситуація | Де живе об'єкт | Тиск на GC | Швидкість |
|---|---|---|---|
| Об'єкт не втікає (Scalar Replacement) | регістри CPU | нуль | максимальна |
| Об'єкт не втікає (стек) | стек | нуль | дуже висока |
| Об'єкт втікає (купа, короткоживучий) | Young Gen | середній | середня |
| Об'єкт втікає (купа, довгоживучий) | Old Gen | низький | середня |

- Escape Analysis визначає, чи об'єкт може вийти за межі функції (повертається, записується назовні, передається в зовнішню функцію).
- Якщо не втікає — V8 може замінити його скалярними змінними (Scalar Replacement) і взагалі не алокувати на купі.
- Зовнішні функції, замикання й DOM API — завжди «чорні ящики», що змушують V8 вважати об'єкт escape.
- Для об'єктів, що неминуче повертаються часто (game loop тощо) — object pool (перевикористання) замість нової алокації щоразу.
- Реальна величина ефекту на сучасному V8 для найпростіших прикладів менша, ніж у застарілих оцінках (розділ вище) — принцип лишається корисним, але перевіряйте на власному рушії.

Ключовий принцип: якщо об'єкт потрібен лише для тимчасових обчислень усередині функції — використовуй скалярні змінні. Якщо мусиш повертати об'єкт — використовуй object pool.
