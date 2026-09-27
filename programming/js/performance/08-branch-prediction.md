# CPU: передбачення переходів (branch prediction) та мікроархітектура

## Загальна ідея

CPU не чекає, поки обчислиться умова `if` — він вгадує, який шлях буде виконано, і починає виконувати його заздалегідь (speculative execution). Якщо вгадав правильно — виграш у швидкості. Якщо ні — pipeline flush (штраф у кілька десятків тактів).

Це фундаментальна властивість самого процесора, а не оптимізація V8 — тому вона поводиться стабільно на будь-якому сучасному CPU й у будь-якій версії рушія.

## 1. Як працює CPU pipeline

Сучасний CPU не виконує інструкції по одній. Він використовує pipeline — кілька інструкцій виконуються паралельно на різних стадіях:

```text
Такт 1: [Fetch A] [------] [------] [------]
Такт 2: [Decode A] [Fetch B] [------] [------]
Такт 3: [Execute A] [Decode B] [Fetch C] [------]
Такт 4: [Write A] [Execute B] [Decode C] [Fetch D]

Усі стадії зайняті одночасно → максимальна ефективність!
```

Проблема з branch (умовним переходом): `if (x > 0) { doA() } else { doB() }`.

```text
Такт 1: [Fetch: cmp x, 0]
Такт 2: [Decode: cmp] [Fetch: ???]  ← CPU не знає, що fetch далі!
                                       doA() чи doB()?
```

Без prediction: CPU чекає, поки обчислиться умова → pipeline простоює. З branch prediction:

```text
Такт 1: [Fetch: cmp x, 0]
Такт 2: [Decode: cmp] [Fetch: doA()] ← CPU вгадує "x > 0" = true
Такт 3: [Execute: cmp] [Decode: doA()] [Fetch: next]
```

Якщо вгадав правильно → pipeline повний, штрафу немає. Якщо помилився → pipeline flush: викидаємо `doA()`, завантажуємо `doB()` — штраф у кілька десятків тактів.

## 2. Branch predictor

CPU має спеціальний блок — branch predictor з таблицею (branch history table). Він запам'ятовує для кожного branch: «зазвичай true чи false?»

```text
Branch History Table (спрощено):
Адреса branch | Остання поведінка | Prediction
0x1234        | T T T T T         | → True (завжди true?)
0x5678        | F F F F F         | → False (завжди false?)
0x9ABC        | T F T F T F       | → ??? (непередбачуваний!)
```

**Передбачуваний branch — ідеально:** після сортування спочатку всі false, потім усі true: `[F F F F F ... T T T T T]`. Predictor: «спочатку завжди false, потім завжди true». Помилок передбачення — практично тільки в самій точці переходу.

**Непередбачуваний branch — погано:** випадкові дані: `[T F T T F T F F T F]`. Predictor не може вгадати — помилка десь у половині випадків, що означає постійні pipeline flushes.

## 3. Практичний вплив — бенчмарк

```js
const { performance } = require("perf_hooks");
const SIZE = 10000000;

const data = new Int32Array(SIZE);
for (let i = 0; i < SIZE; i++) {
  data[i] = (Math.random() * 200) | 0; // 0-199
}

// ❌ Непередбачуваний branch (випадкові дані)
function sumUnpredictable(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > 100) { // ~50% true, ~50% false — випадково!
      sum += arr[i];
    }
  }
  return sum;
}

// ✅ Передбачуваний branch (відсортовані дані)
const sorted = data.slice().sort((a, b) => a - b);
function sumPredictable(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > 100) { // спочатку завжди false, потім завжди true
      sum += arr[i];
    }
  }
  return sum;
}

let t0 = performance.now();
sumUnpredictable(data);
console.log(`Unpredictable: ${(performance.now() - t0).toFixed(0)}ms`);

t0 = performance.now();
sumPredictable(sorted);
console.log(`Predictable:   ${(performance.now() - t0).toFixed(0)}ms`);
```

**Реальний вимір** (Node.js v24, Apple Silicon): `Unpredictable: 41ms`, `Predictable: 15ms` — приблизно у 2.7 рази швидше для відсортованих даних. На відміну від кількох сусідніх нотаток цієї серії (де ефекти самого V8 JIT на сучасних версіях виявились менш драматичними за старі оцінки), тут різниця реально відтворюється і відповідає теорії — бо це не оптимізація конкретного JS-рушія, а базова властивість будь-якого сучасного конвеєрного процесора.

## Правила для передбачення переходів

### Правило 1: сортуй дані перед обробкою (якщо можливо)

```js
const usersStub = Array.from({ length: 1000 }, (_, i) => ({
  isPremium: Math.random() > 0.7,
  revenue: Math.round(Math.random() * 100),
}));

// ❌ Випадковий порядок → непередбачуваний branch
function getPremiumRevenueBad(users) {
  let total = 0;
  for (const user of users) {
    if (user.isPremium) { // ~30% true, але в випадковому порядку
      total += user.revenue;
    }
  }
  return total;
}

// ✅ Відсортуй спочатку → передбачуваний branch
const sortedUsers = [...usersStub].sort((a, b) => Number(a.isPremium) - Number(b.isPremium));
// тепер: [false, false, ... true, true, true]
// branch: один перехід у середині → predictor легко впорається
```

### Правило 2: виноси рідкісні умови назовні

```js
// ❌ Рідкісна умова всередині гарячого циклу
function processItemsBad(items, debug = false) {
  const output = [];
  for (const item of items) {
    const result = item.value * 2;
    if (debug) {            // 99.9% false, але branch є в кожній ітерації!
      console.log(result);
    }
    output.push(result);
  }
  return output;
}
```

```js
// ✅ Винеси рідкісну умову назовні
function processItems(items, debug = false) {
  const output = [];
  if (debug) {
    for (const item of items) {
      const result = item.value * 2;
      console.log(result);
      output.push(result);
    }
  } else {
    for (const item of items) {    // чистий цикл без branch!
      output.push(item.value * 2);
    }
  }
  return output;
}
```

### Правило 3: заміняй branch математикою

```js
// ❌ Branch для clamp
function clampBad(value, min, max) {
  if (value < min) return min;      // branch 1
  if (value > max) return max;      // branch 2
  return value;
}

// ✅ Математика без branch
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max); // CPU: cmov (conditional move)
}
```

```js
// ❌ Branch для abs
function absBad(x) {
  return x < 0 ? -x : x; // branch
}

// ✅ Бітовий трюк без branch (для цілих чисел)
function absBranchless(x) {
  const mask = x >> 31;          // -1, якщо від'ємне, 0, якщо додатнє
  return (x + mask) ^ mask;      // branchless!
}
console.log(absBranchless(-5), absBranchless(5)); // 5 5
```

Детально про побітові операції (`>>`, `^`) — нотатка [common/bitwise-operations.md](../common/bitwise-operations.md).

### Правило 4: групуй схожі об'єкти разом

```js
function updateEnemy(e) { /* ... */ }
function updatePlayer(p) { /* ... */ }

const entities = [
  { type: "enemy", hp: 100 },
  { type: "player", hp: 200 },
  { type: "enemy", hp: 50 },
  { type: "player", hp: 150 },
  // ... перемішані
];

// ❌ Змішані типи → непередбачуваний branch
function updateEntitiesBad(list) {
  for (const entity of list) {
    if (entity.type === "enemy") { // непередбачуваний!
      updateEnemy(entity);
    } else {
      updatePlayer(entity);
    }
  }
}

// ✅ Розділи за типом → передбачуваний branch (або взагалі без branch)
const enemies = entities.filter((e) => e.type === "enemy");
const players = entities.filter((e) => e.type === "player");
// тепер два чистих цикли без умов!
enemies.forEach(updateEnemy);
players.forEach(updatePlayer);
```

### Правило 5: early return для найчастіше виконуваних умов

```js
// ❌ Найпоширеніший випадок перевіряється останнім
function processValueBad(value) {
  if (value === null) return 0;             // рідко
  if (value === undefined) return 0;        // рідко
  if (typeof value !== "number") return 0;  // рідко
  return value * 2;                          // 99% випадків — але перевіряється останнім!
}

// ✅ Найпоширеніший випадок перевіряється першим
function processValue(value) {
  if (typeof value === "number") return value * 2; // 99% → передбачувано
  return 0; // рідкісні випадки в кінці
}
```

## Коли branch prediction найбільш критичний

1. Великі масиви з фільтрацією — `.filter()`, ручні цикли з `if`.
2. Particle systems — перевірка активності частинок.
3. Collision detection — перевірка меж.
4. Data processing pipelines — обробка великих датасетів.

Для малих масивів (менше приблизно 1000 елементів) branch prediction не має помітного впливу.

## Підсумок

| Ситуація | Частка помилок передбачення | Вплив |
|---|---|---|
| Відсортовані дані | близько нуля (помилка лише на переході) | максимальна швидкість |
| Завжди true/false | близько нуля | максимальна швидкість |
| Чергування T/F/T/F | максимальна | найгірший варіант |
| Випадкові дані (50/50) | приблизно половина | помітно повільніше (виміряно ~2.7x) |
| Branchless (`Math.min`/`max`, бітові трюки) | branch відсутній як такий | немає цієї проблеми взагалі |

Ключовий принцип: роби гілки передбачуваними — або сортуй дані, або виноси рідкісні умови назовні, або замінюй branch математикою. На відміну від багатьох JIT-специфічних оптимізацій V8 (гляньте сусідні нотатки цієї серії), branch prediction — властивість самого процесора, тому цей ефект стабільно відтворюється на будь-якій сучасній машині.
