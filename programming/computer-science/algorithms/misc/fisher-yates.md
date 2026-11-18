# Fisher–Yates Shuffle — тасування Фішера—Йейтса

**Тасування** (shuffle) — випадкова перестановка елементів масиву, у якій **кожна з `n!` перестановок рівноймовірна**. Алгоритм Фішера—Йейтса (у формі Кнута — «Knuth shuffle») робить це за `O(n)` часу й `O(1)` пам'яті, і він **доведено коректний**. Водночас більшість «очевидних» способів перетасувати масив — хибні й дають **зміщений** розподіл: від наївного обміну з випадковим індексом до `array.sort(() => Math.random() - 0.5)`. Ця нотатка показує, чому, з точними підрахунками.

## 1. Алгоритм

Проходимо масив з кінця: для `i` від `n − 1` до `1` обираємо випадковий індекс `j ∈ [0, i]` (включно!) і міняємо `a[i]` та `a[j]` місцями. Після кроку `i` елемент `a[i]` — на остаточному місці й більше не змінюється.

```text
for i from n − 1 down to 1:
    j = random integer in [0, i]
    swap a[i], a[j]
```

## 2. Чому це рівномірно (доведення)

Для `n` елементів кількість різних послідовностей випадкових виборів `(j_{n−1}, …, j_1)` дорівнює `n · (n − 1) · … · 2 = n!` (на кроці `i` є `i + 1` варіант). Кожна послідовність однаково ймовірна (`1/n!`). Різні послідовності виборів дають **різні** перестановки (взаємно однозначна відповідність: за перестановкою відновлюємо кожне `j`, дивлячись, де опинився елемент, який стоїть на позиції `i`). Отже, кожна з `n!` перестановок з'являється рівно в одному випадку з `n!` — рівномірний розподіл.

Інакше (індукція): перший крок кладе на позицію `n − 1` кожен із `n` елементів з імовірністю `1/n`; решту `n − 1` елементів тасуємо рекурсивно — за індукцією рівномірно.

`fisherYates([1, 2, 3, 4, 5], makeRng(42))` дає `[3, 4, 5, 1, 2]` (з псевдовипадковим генератором із фіксованим зерном, щоб результат повторювався).

## 3. Точний розподіл (перевірка перебором)

Замість статистичних тестів порахуємо **усі** можливі послідовності випадкових виборів.

**Fisher—Yates, `n = 3`:** `3! = 6` послідовностей виборів → розподіл перестановок: `{ '123': 1, '132': 1, '213': 1, '231': 1, '312': 1, '321': 1 }` — кожна з 6 рівно по одному разу (`1/6`).

**Наївне тасування** (`for i in 0..n−1: swap a[i], a[random in [0, n−1]]`): `n^n = 27` послідовностей, а перестановок 6 — не ділиться порівну. Розподіл: `{ '123': 4, '132': 5, '213': 5, '231': 5, '312': 4, '321': 4 }`. Одні перестановки трапляються 5 разів із 27, інші 4 — зміщення! Для `n = 4`: `256` послідовностей на `24` перестановки (`256 / 24` не ціле) — розподіл `{ '1234': 10, '1243': 10, '1324': 10, '1342': 14, '1423': 11, '1432': 9, '2134': 10, '2143': 15, '2314': 14, '2341': 14, '2413': 11, '2431': 11, '3124': 11, '3142': 11, '3214': 9, '3241': 11, '3412': 11, '3421': 10, '4123': 8, '4132': 9, '4213': 9, '4231': 8, '4312': 10, '4321': 10 }`; найчастіша перестановка зустрічається 15 разів, найрідша — 8.

**Загальне правило:** якщо кількість різних виходів алгоритму `n^n` не кратна `n!`, рівномірність неможлива за визначенням (принцип Діріхле). Fisher—Yates має рівно `n!` виходів.

## 4. Типові хибні способи

1. **Наївне тасування:** обмін із довільним індексом у всьому діапазоні `[0, n)` — розглянуто вище.
2. **`sort(() => Math.random() − 0.5)`:** компаратор неузгоджений (не транзитивний), результат залежить від реалізації сортування й **не рівномірний**; наприклад, для сортування вставками з випадковими відповідями компаратора розподіл нерівномірний. `biasedSortDistribution(3)` (точна модель такого сортування) = `{ '123': 2, '132': 1, '213': 2, '231': 1, '312': 1, '321': 1 }`.
3. **Обмін із `j ∈ [0, i)`** (виключно) — алгоритм Саттоло: дає лише **циклічні** перестановки (`(n − 1)!` із них) — корисний для генерації випадкових циклів, але не для тасування. `sattoloDistribution(3)` = `{ '231': 1, '312': 1 }` — елементи ніколи не лишаються на своїх місцях.
4. **Генерація випадкового ключа й сортування за ним** — коректна (рівномірна), якщо ключі унікальні (ймовірність колізій ненульова при малих діапазонах), складність `O(n log n)`.
5. **`Math.floor(Math.random() * n)` з модуль-упередженням** у мовах із цілими: `rand() % n` дає нерівномірність, якщо діапазон генератора не кратний `n`.

## 5. Реалізація

```js
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randInt(rng, lo, hi) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function fisherYates(input, rng = Math.random) {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fisherYatesForward(input, rng = Math.random) {
  const a = input.slice();
  for (let i = 0; i < a.length - 1; i++) {
    const j = randInt(rng, i, a.length - 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function insideOut(source, rng = Math.random) {
  const a = [];
  for (let i = 0; i < source.length; i++) {
    const j = randInt(rng, 0, i);
    if (j !== i) a[i] = a[j];
    a[j] = source[i];
  }
  return a;
}

function sattolo(input, rng = Math.random) {
  const a = input.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i - 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function naiveShuffle(input, rng = Math.random) {
  const a = input.slice();
  for (let i = 0; i < a.length; i++) {
    const j = randInt(rng, 0, a.length - 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleK(input, k, rng = Math.random) {
  const a = input.slice();
  for (let i = 0; i < k; i++) {
    const j = randInt(rng, i, a.length - 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

function fisherYatesChoices(n) {
  return Array.from({ length: n - 1 }, (_, idx) => n - 1 - idx + 1);
}

function naiveChoices(n) {
  return Array.from({ length: n }, () => n);
}

function sattoloChoices(n) {
  return Array.from({ length: n - 1 }, (_, idx) => n - 1 - idx);
}

function shuffleDistribution(n, choicesFn) {
  const sizes = choicesFn(n);
  const dist = {};
  const idx = new Array(sizes.length).fill(0);
  const total = sizes.reduce((p, x) => p * x, 1);
  for (let t = 0; t < total; t++) {
    let x = t;
    const picks = sizes.map((sz) => { const v = x % sz; x = Math.floor(x / sz); return v; });
    const a = Array.from({ length: n }, (_, i) => i + 1);
    if (choicesFn === naiveChoices) {
      for (let i = 0; i < n; i++) { const j = picks[i]; [a[i], a[j]] = [a[j], a[i]]; }
    } else if (choicesFn === fisherYatesChoices) {
      for (let k = 0; k < n - 1; k++) { const i = n - 1 - k; const j = picks[k]; [a[i], a[j]] = [a[j], a[i]]; }
    } else {
      for (let k = 0; k < n - 1; k++) { const i = n - 1 - k; const j = picks[k]; [a[i], a[j]] = [a[j], a[i]]; }
    }
    const key = a.join('');
    dist[key] = (dist[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(dist).sort());
}

function sattoloDistribution(n) {
  return shuffleDistribution(n, sattoloChoices);
}

function biasedSortDistribution(n) {
  const dist = {};
  const total = 2 ** ((n * (n - 1)) / 2);
  for (let mask = 0; mask < total; mask++) {
    const a = Array.from({ length: n }, (_, i) => i + 1);
    let bit = 0;
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0) {
        const swap = (mask >> bit++) & 1;
        if (!swap) break;
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        j--;
      }
    }
    const key = a.join('');
    dist[key] = (dist[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(dist).sort());
}

function isPermutation(a, b) {
  return JSON.stringify(a.slice().sort()) === JSON.stringify(b.slice().sort());
}

function countFixedPoints(a, original) {
  return a.filter((x, i) => x === original[i]).length;
}

function empiricalFirstPosition(n, trials, shuffleFn) {
  const rng = makeRng(2024);
  const counts = new Array(n).fill(0);
  for (let t = 0; t < trials; t++) {
    const a = shuffleFn(Array.from({ length: n }, (_, i) => i), rng);
    counts[a[0]]++;
  }
  return counts;
}

function shuffledCopyKeepsInput(input, rng) {
  const copy = input.slice();
  fisherYates(input, rng);
  return JSON.stringify(copy) === JSON.stringify(input);
}

function derangementsCount(n) {
  const f = [1, 0];
  for (let i = 2; i <= n; i++) f[i] = (i - 1) * (f[i - 1] + f[i - 2]);
  return f[n];
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function randomDerangementByRejection(input, rng) {
  for (let t = 0; t < 1000; t++) {
    const a = fisherYates(input, rng);
    if (a.every((x, i) => x !== input[i])) return a;
  }
  return null;
}

function weightedShuffleKeys(items, weights, rng) {
  return items
    .map((x, i) => ({ x, key: Math.pow(rng(), 1 / weights[i]) }))
    .sort((p, q) => q.key - p.key)
    .map((p) => p.x);
}
```

## 6. Варіанти

- **Прямий прохід** (`fisherYatesForward`): `j ∈ [i, n − 1]` — те саме за коректністю.
- **Inside-out:** будує перемішаний масив із джерела за один прохід без попередньої копії (`insideOut`): `insideOut([1, 2, 3, 4], makeRng(7))` = `[1, 3, 2, 4]`.
- **Вибірка `k` елементів без повторень:** частковий Fisher—Yates зупиняється після `k` кроків: `sampleK([1, …, 10], 3, makeRng(1))` = `[3, 5, 7]`. Для потоку невідомої довжини — [reservoir-sampling.md](reservoir-sampling.md).
- **Алгоритм Саттоло:** випадковий циклічний зсув, без нерухомих точок.
- **Випадкові безлади (derangements):** відкидання перестановок із нерухомими точками (rejection): ймовірність успіху `D_n / n! ≈ 1/e ≈ 0,368`: `derangementsCount(5)` = `44` із `5! = 120` → '0.367'.
- **Зважене тасування:** ключ `u^{1/w}` для випадкового `u` та сортування за спаданням (Efraimidis—Spirakis).

## 7. Джерело випадковості та практика

- **`Math.random()`** — не криптографічний; для безпеки (карти, лотереї) — `crypto.getRandomValues`. Крім того, `Math.random` має обмежену кількість станів (V8: xorshift128+, період 2¹²⁸ − 1), тому всі `n!` перестановок досяжні лише при `n! ≤ 2¹²⁸`, тобто `n ≤ 34`. Для колоди з 52 карт `52! ≈ 8·10⁶⁷ > 2²²⁶` — не кожну перестановку може отримати генератор із 128 бітами стану.
- **Модуль-упередження:** `Math.floor(Math.random() * k)` майже рівномірне для малих `k`, але для строгої рівномірності потрібен rejection sampling.
- **Відтворюваність:** тестувати з фіксованим зерном (`makeRng`) і перевіряти властивості: результат — перестановка вхідного.

## 8. Складність

- **Час `O(n)`**, **пам'ять `O(1)`** (на місці) або `O(n)` (копія).
- Кількість викликів генератора: `n − 1`.
- Порівняно з `sort`-тасуванням `O(n log n)` і неправильним.

## 9. Типові помилки

1. **`j ∈ [0, n)` на кожному кроці** — зміщений розподіл (`n^n` виходів).
2. **`j ∈ [0, i)`** — Саттоло (лише цикли).
3. **`j ∈ [i, n)` на прямому проході** (коректно!) не плутайте з `[0, n)`.
4. **`sort(() => Math.random() − 0.5)`** — хибно й повільно.
5. **Модифікація вхідного масиву**, коли очікується копія.
6. **Використання `Math.random` для криптографії.**
7. **Тасування після `Math.floor(Math.random() * (i + 1))` у циклі з `i` від `0` вгору** без урахування прямого проходу.
8. **Плутанина ймовірності «позиція» vs «елемент»**: рівномірність означає, що кожна з `n!` перестановок рівноймовірна, а не лише що кожен елемент кожної позиції має `1/n`.
9. **Недостатньо випадковий генератор** для великих `n`.

## 10. Алгоритм (стисло)

1. Для `i = n − 1 … 1`: `j = random(0..i)`; `swap(a[i], a[j])`.
2. Час `O(n)`, пам'ять `O(1)`; рівномірно за умови рівномірного `random`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `fisherYates([1, 2, 3, 4, 5], makeRng(42))`?

```js
fisherYates([1, 2, 3, 4, 5], makeRng(42))
```

**2.** Чи змінює `fisherYates` вхідний масив?

```js
(() => { const x = [1, 2, 3]; fisherYates(x, makeRng(1)); return x; })()
```

**3.** Чи результат є перестановкою входу для 100 різних зерен?

```js
Array.from({ length: 100 }, (_, s) => s).every(s => isPermutation(fisherYates([1, 2, 3, 4, 5, 6], makeRng(s)), [1, 2, 3, 4, 5, 6]))
```

**4.** Що поверне тасування порожнього й одноелементного масивів?

```js
[fisherYates([], makeRng(1)), fisherYates([7], makeRng(1))]
```

**5.** Скільки різних послідовностей виборів має Fisher—Yates для `n = 3, 4, 5`?

```js
[3, 4, 5].map(n => fisherYatesChoices(n).reduce((p, x) => p * x, 1))
```

**6.** Який розподіл дає Fisher—Yates для `n = 3` (точний підрахунок)?

```js
shuffleDistribution(3, fisherYatesChoices)
```

**7.** А для `n = 4`: скільки разів кожна з 24 перестановок?

```js
[...new Set(Object.values(shuffleDistribution(4, fisherYatesChoices)))]
```

**8.** Який розподіл дає наївне тасування для `n = 3`?

```js
shuffleDistribution(3, naiveChoices)
```

**9.** Скільки послідовностей виборів у наївного тасування для `n = 3, 4, 5`?

```js
[3, 4, 5].map(n => n ** n)
```

**10.** Чи ділиться `n^n` на `n!` для `n = 3, 4, 5`?

```js
[3, 4, 5].map(n => (n ** n) % factorial(n) === 0)
```

**11.** Яка найбільша й найменша кількість появ перестановки в наївному тасуванні `n = 4`?

```js
(() => { const v = Object.values(shuffleDistribution(4, naiveChoices)); return [Math.max(...v), Math.min(...v)]; })()
```

**12.** Який розподіл дає алгоритм Саттоло для `n = 3`?

```js
sattoloDistribution(3)
```

**13.** Скільки перестановок досяжні Саттоло для `n = 4` (очікується `(n−1)!`)?

```js
[Object.keys(sattoloDistribution(4)).length, factorial(3)]
```

### Рівень 2. Робота алгоритму

**14.** Чи залишаються нерухомі точки після Саттоло для 50 зерен на `[0..7]`?

```js
Array.from({ length: 50 }, (_, s) => countFixedPoints(sattolo([0, 1, 2, 3, 4, 5, 6, 7], makeRng(s)), [0, 1, 2, 3, 4, 5, 6, 7])).every(c => c === 0)
```

**15.** Який розподіл дає модель сортування з випадковим компаратором для `n = 3`?

```js
biasedSortDistribution(3)
```

**16.** Скільки разів найчастіша перестановка в моделі сортування `n = 3` проти рівномірних `8/6`?

```js
Math.max(...Object.values(biasedSortDistribution(3)))
```

**17.** Що поверне `insideOut([1, 2, 3, 4], makeRng(7))`?

```js
insideOut([1, 2, 3, 4], makeRng(7))
```

**18.** Чи `insideOut` дає перестановку входу для 100 зерен?

```js
Array.from({ length: 100 }, (_, s) => s).every(s => isPermutation(insideOut([1, 2, 3, 4, 5], makeRng(s)), [1, 2, 3, 4, 5]))
```

**19.** Що поверне `fisherYatesForward([1, 2, 3, 4, 5], makeRng(3))`?

```js
fisherYatesForward([1, 2, 3, 4, 5], makeRng(3))
```

**20.** Що поверне `sampleK([1..10], 3, makeRng(1))`?

```js
sampleK([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, makeRng(1))
```

**21.** Чи елементи `sampleK` унікальні для 100 зерен?

```js
Array.from({ length: 100 }, (_, s) => s).every(s => new Set(sampleK([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, makeRng(s))).size === 4)
```

**22.** Скільки безладів (derangements) для `n = 1…8`?

```js
[1, 2, 3, 4, 5, 6, 7, 8].map(derangementsCount)
```

**23.** Яка частка безладів серед перестановок для `n = 8` (≈ 1/e)?

```js
+(derangementsCount(8) / factorial(8)).toFixed(4)
```

**24.** Що поверне `randomDerangementByRejection([1, 2, 3, 4], makeRng(5))`?

```js
randomDerangementByRejection([1, 2, 3, 4], makeRng(5))
```

**25.** Скільки разів кожен елемент опиняється на першій позиції за 6000 спроб для `n = 6` (Fisher—Yates)?

```js
empiricalFirstPosition(6, 6000, fisherYates)
```

**26.** А для наївного тасування (`n = 6`, 6000 спроб)?

```js
empiricalFirstPosition(6, 6000, naiveShuffle)
```

### Рівень 3. Складність і нюанси

**27.** Скільки викликів генератора робить Fisher—Yates для `n = 1000`?

```js
999
```

**28.** Скільки бітів потрібно, щоб пронумерувати всі `52!` перестановок колоди (`⌈log₂ 52!⌉`)?

```js
Math.ceil(Array.from({ length: 52 }, (_, i) => Math.log2(i + 1)).reduce((a, b) => a + b))
```

**29.** До якого `n` перестановки вміщуються в 128 бітів стану (`n! ≤ 2^128`)?

```js
(() => { let n = 1, f = 1n; while (f * BigInt(n + 1) <= 2n ** 128n) { n++; f *= BigInt(n); } return n; })()
```

**30.** Що поверне `weightedShuffleKeys(['a', 'b', 'c'], [1, 1, 1000], makeRng(9))`? (важкий елемент майже завжди першим)

```js
weightedShuffleKeys(['a', 'b', 'c'], [1, 1, 1000], makeRng(9))
```

**31.** Напишіть `shuffleInPlace(a, rng)` — тасування на місці (повертає той самий масив).

**32.** Напишіть `randomPermutation(n, rng)` — випадкова перестановка `0..n−1`.

**33.** Напишіть `pickRandom(a, rng)` — випадковий елемент (або `undefined` для порожнього).

**34.** Напишіть `shuffleRows(matrix, rng)` — перемішати рядки матриці.

**35.** Напишіть `isUniformEnough(counts, tolerance)` — чи всі кількості в межах `±tolerance` від середнього.

**36.** Напишіть `chiSquare(counts)` — статистику хі-квадрат для рівномірності (округліть до 2 знаків).

**37.** Напишіть `rotateRandom(a, rng)` — випадковий циклічний зсув масиву.

**38.** Напишіть `dealHands(deck, players, handSize, rng)` — роздати карти: тасування й розрізання на руки.

**39.** Напишіть `countPermutationsOfMultiset(a)` — кількість різних перестановок мультимножини (`n! / Π m_i!`).

### Рівень 4. Задачі з інтерв'ю

**40.** Опишіть алгоритм Фішера—Йейтса.

**41.** Чому Fisher—Yates дає рівномірний розподіл?

**42.** Чому наївне тасування зміщене?

**43.** Чому `sort(() => Math.random() - 0.5)` — поганий спосіб?

**44.** Чим алгоритм Саттоло відрізняється від Fisher—Yates?

**45.** Для чого потрібен inside-out варіант?

**46.** Чому для карткових ігор недостатньо `Math.random`?

**47.** Як вибрати `k` випадкових елементів без повторень?

**48.** Як перевірити рівномірність тасування?

**49.** Чому важливо включати `i` у діапазон `[0, i]`?

**50.** Скільки різних вхідних масивів із `n = 4` розрізняють `fisherYates` для 24 різних зерен (скільки унікальних результатів)?

```js
new Set(Array.from({ length: 24 }, (_, s) => fisherYates([1, 2, 3, 4], makeRng(s)).join(''))).size
```

### Відповіді

1. `[3, 4, 5, 1, 2]`
2. `[1, 2, 3]`
3. `true`
4. `[[], [7]]`
5. `[6, 24, 120]`
6. `{ '123': 1, '132': 1, '213': 1, '231': 1, '312': 1, '321': 1 }`
7. `[1]`
8. `{ '123': 4, '132': 5, '213': 5, '231': 5, '312': 4, '321': 4 }`
9. `[27, 256, 3125]`
10. `[false, false, false]`
11. `[15, 8]`
12. `{ '231': 1, '312': 1 }`
13. `[6, 6]`
14. `true`
15. `{ '123': 2, '132': 1, '213': 2, '231': 1, '312': 1, '321': 1 }`
16. `2`
17. `[1, 3, 2, 4]`
18. `true`
19. `[2, 4, 5, 3, 1]`
20. `[3, 5, 7]`
21. `true`
22. `[0, 1, 2, 9, 44, 265, 1854, 14833]`
23. `0.3679`
24. `[4, 3, 1, 2]`
25. `[1021, 1034, 970, 974, 1014, 987]`
26. `[994, 1209, 1101, 987, 911, 798]`
27. `999`
28. `226`
29. `34`
30. `['c', 'a', 'b']`
31. Приклад розв'язку:

   ```js
   function shuffleInPlace(a, rng) {
     for (let i = a.length - 1; i > 0; i--) {
       const j = Math.floor(rng() * (i + 1));
       [a[i], a[j]] = [a[j], a[i]];
     }
     return a;
   }
   ```

   Виклик `(() => { const a = [1, 2, 3, 4, 5]; const r = shuffleInPlace(a, makeRng(42)); return [r === a, r]; })()` → `[true, [3, 4, 5, 1, 2]]`

32. Приклад розв'язку:

   ```js
   const randomPermutation = (n, rng) => fisherYates(Array.from({ length: n }, (_, i) => i), rng)
   ```

   Виклик `[randomPermutation(5, makeRng(1)), randomPermutation(0, makeRng(1))]` → `[[0, 2, 3, 4, 1], []]`

33. Приклад розв'язку:

   ```js
   const pickRandom = (a, rng) => a.length ? a[Math.floor(rng() * a.length)] : undefined
   ```

   Виклик `[pickRandom([10, 20, 30], makeRng(4)), pickRandom([], makeRng(4))]` → `[10, undefined]`

34. Приклад розв'язку:

   ```js
   const shuffleRows = (m, rng) => fisherYates(m, rng)
   ```

   Виклик `shuffleRows([[1, 2], [3, 4], [5, 6]], makeRng(2))` → `[[3, 4], [5, 6], [1, 2]]`

35. Приклад розв'язку:

   ```js
   function isUniformEnough(c, t) {
     const avg = c.reduce((a, b) => a + b, 0) / c.length;
     return c.every(x => Math.abs(x - avg) <= t * avg);
   }
   ```

   Виклик `[isUniformEnough([100, 98, 103, 99], 0.1), isUniformEnough([200, 10, 90, 100], 0.1)]` → `[true, false]`

36. Приклад розв'язку:

   ```js
   function chiSquare(c) {
     const n = c.reduce((a, b) => a + b, 0), e = n / c.length;
     return +c.reduce((s, x) => s + (x - e) ** 2 / e, 0).toFixed(2);
   }
   ```

   Виклик `[chiSquare([100, 100, 100, 100]), chiSquare([120, 80, 110, 90])]` → `[0, 10]`

37. Приклад розв'язку:

   ```js
   function rotateRandom(a, rng) {
     const k = Math.floor(rng() * a.length);
     return [...a.slice(k), ...a.slice(0, k)];
   }
   ```

   Виклик `rotateRandom([1, 2, 3, 4, 5], makeRng(6))` → `[2, 3, 4, 5, 1]`

38. Приклад розв'язку:

   ```js
   function dealHands(deck, p, h, rng) {
     const s = fisherYates(deck, rng);
     return Array.from({ length: p }, (_, i) => s.slice(i * h, (i + 1) * h));
   }
   ```

   Виклик `dealHands([1, 2, 3, 4, 5, 6, 7, 8], 2, 3, makeRng(8))` → `[[7, 4, 6], [3, 5, 8]]`

39. Приклад розв'язку:

   ```js
   function countPermutationsOfMultiset(a) {
     const m = {};
     a.forEach(x => m[x] = (m[x] || 0) + 1);
     return Object.values(m).reduce((r, c) => r / factorial(c), factorial(a.length));
   }
   ```

   Виклик `[countPermutationsOfMultiset([1, 1, 2]), countPermutationsOfMultiset([1, 2, 3, 4])]` → `[3, 24]`

40. Для `i` від `n − 1` до `1` обрати випадковий `j ∈ [0, i]` і поміняти місцями `a[i]` та `a[j]`. Елемент на позиції `i` після кроку остаточний. Час `O(n)`, пам'ять `O(1)`.
41. Є рівно `n!` рівноймовірних послідовностей виборів, і різним послідовностям відповідають різні перестановки (взаємно однозначно), тож кожна перестановка має ймовірність `1/n!`.
42. Воно має `n^n` рівноймовірних послідовностей виборів, а `n^n` не ділиться на `n!` при `n ≥ 3`, тож перестановки не можуть траплятись однакову кількість разів.
43. Компаратор не задає узгодженого порядку (не транзитивний), результат залежить від алгоритму сортування й не рівномірний; крім того, це `O(n log n)`.
44. Він обирає `j ∈ [0, i − 1]` (без `i`), тому елемент завжди переміщується: результат — випадковий цикл довжини `n`, `(n − 1)!` можливих перестановок, без нерухомих точок.
45. Він будує перемішаний масив із джерела за один прохід без попереднього копіювання, що зручно для потоків і ітераторів.
46. Він не криптографічний і має обмежений стан (128 біт у V8), тож не може досягти всіх `52! ≈ 2^226` перестановок і передбачуваний; потрібен `crypto.getRandomValues` та якісний генератор.
47. Виконати лише перші `k` кроків Fisher—Yates (частковий варіант) і взяти початок масиву; для потоку невідомої довжини — reservoir sampling.
48. Для малих `n` — точним перебором усіх послідовностей виборів; для великих — статистичними тестами (хі-квадрат) на кількості перестановок або позицій і властивістю «результат — перестановка входу».
49. Інакше елемент не зможе залишитись на місці, і розподіл стане підмножиною перестановок (Саттоло): кількість виходів зменшиться до `(n − 1)!` і рівномірність по всіх `n!` порушиться.
50. `6`
