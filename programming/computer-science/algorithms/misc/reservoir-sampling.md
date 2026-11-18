# Reservoir Sampling — резервуарна вибірка

Як вибрати **випадковий елемент** (або `k` елементів) із потоку **невідомої довжини**, прочитавши його **один раз** і зберігаючи лише `O(k)` пам'яті, так, щоб кожен елемент потрапив у вибірку з **однаковою ймовірністю**? Алгоритм **резервуарної вибірки** (Algorithm R, Віттер, 1985) відповідає на це питання. Використовується для вибірки з логів, мережевих пакетів, баз даних, великих файлів, що не вміщуються в пам'ять.

## 1. Вибір одного елемента (`k = 1`)

Тримаємо одного кандидата. Для `i`-го елемента потоку (нумерація з 1) з імовірністю `1/i` **замінюємо** кандидата поточним елементом.

```text
chosen = null
for i, x in stream (i from 1):
    if random() < 1/i:  chosen = x
```

**Доведення.** Ймовірність, що елемент `x_j` у кінці — обраний, після `n` елементів:

`P = (1/j) · Π_{i=j+1..n} (1 − 1/i) = (1/j) · (j/(j+1)) · ((j+1)/(j+2)) · … · ((n−1)/n) = 1/n.`

Елемент має бути обраний на кроці `j` (імовірність `1/j`) і **не** замінений на кроках `j + 1 … n` (добуток телескопічно скорочується). Усі `n` елементів — рівноймовірні.

Перший елемент береться завжди (`1/1 = 1`).

## 2. Вибірка `k` елементів (Algorithm R)

Заповнюємо резервуар перші `k` елементами. Для `i`-го елемента (`i > k`): обираємо випадкове `j ∈ [1, i]`; якщо `j ≤ k` — замінюємо `reservoir[j]` поточним.

**Доведення.** Ймовірність, що елемент `x_m` у резервуарі після `n`:

- для `m ≤ k`: він вже там; на кроці `i > k` його витісняють з імовірністю `(k/i)·(1/k) = 1/i` (потрапляє в резервуар `k/i`, і саме його позицію замінює `1/k`); виживає з імовірністю `1 − 1/i = (i − 1)/i`. Добуток по `i = k+1 … n`: `k/n`.
- для `m > k`: потрапляє в резервуар з імовірністю `k/m`, потім виживає на кроках `m+1 … n`: `Π (i−1)/i = m/n`. Разом `k/m · m/n = k/n`.

Отже, кожен елемент у вибірці з імовірністю `k/n`, а кожна `k`-підмножина — з імовірністю `1/C(n, k)`.

Для перевірки порахуємо **точну** ймовірність перебором усіх випадкових виборів. Для `n = 4`, `k = 1`: ймовірність, що кінцевий кандидат — елемент `1…4`: `['6/24', '6/24', '6/24', '6/24']` — рівно по `6 з 24` (`1/4`). Для `n = 5`, `k = 2`: ймовірність кожного елемента — `['24/60', '24/60', '24/60', '24/60', '24/60']` (`2/5`).

## 3. Реалізація

```js
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function reservoirOne(stream, rng) {
  let chosen;
  let i = 0;
  for (const x of stream) {
    i++;
    if (rng() < 1 / i) chosen = x;
  }
  return chosen;
}

function reservoirK(stream, k, rng) {
  const res = [];
  let i = 0;
  for (const x of stream) {
    i++;
    if (i <= k) res.push(x);
    else {
      const j = Math.floor(rng() * i);
      if (j < k) res[j] = x;
    }
  }
  return res;
}

function exactReservoirProbabilities(n, k) {
  const counts = new Array(n).fill(0);
  let total = 1;
  for (let i = k + 1; i <= n; i++) total *= i;
  for (let t = 0; t < total; t++) {
    let x = t;
    const res = Array.from({ length: k }, (_, i) => i);
    for (let i = k + 1; i <= n; i++) {
      const j = x % i;
      x = Math.floor(x / i);
      if (j < k) res[j] = i - 1;
    }
    for (const r of res) counts[r]++;
  }
  return counts.map((c) => c + '/' + total);
}

function empiricalFrequencies(n, k, trials, seed = 1) {
  const rng = makeRng(seed);
  const counts = new Array(n).fill(0);
  for (let t = 0; t < trials; t++) {
    const r = reservoirK(Array.from({ length: n }, (_, i) => i), k, rng);
    for (const x of r) counts[x]++;
  }
  return counts;
}

function weightedReservoir(items, weights, k, rng) {
  const keyed = items.map((x, i) => ({ x, key: Math.pow(rng(), 1 / weights[i]) }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, k).map((p) => p.x);
}

function skipReservoir(stream, k, rng) {
  const res = [];
  const it = stream[Symbol.iterator]();
  for (let i = 0; i < k; i++) {
    const n = it.next();
    if (n.done) return res;
    res.push(n.value);
  }
  let seen = k;
  let w = Math.exp(Math.log(rng()) / k);
  let next = seen + Math.floor(Math.log(rng()) / Math.log(1 - w)) + 1;
  for (let n = it.next(); !n.done; n = it.next()) {
    seen++;
    if (seen === next) {
      res[Math.floor(rng() * k)] = n.value;
      w *= Math.exp(Math.log(rng()) / k);
      next += Math.floor(Math.log(rng()) / Math.log(1 - w)) + 1;
    }
  }
  return res;
}

function randomLineOfFile(lines, rng) {
  return reservoirOne(lines, rng);
}

function randomNode(listValues, rng) {
  return reservoirOne(listValues, rng);
}

function shufflePrefix(arr, k, rng) {
  const a = arr.slice();
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(rng() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

function randomPickIndex(nums, target, rng) {
  let chosen = -1;
  let count = 0;
  nums.forEach((x, i) => {
    if (x !== target) return;
    count++;
    if (rng() < 1 / count) chosen = i;
  });
  return chosen;
}

function probabilityStillChosen(j, n) {
  let p = 1 / j;
  for (let i = j + 1; i <= n; i++) p *= 1 - 1 / i;
  return p;
}

function probabilityInReservoir(m, n, k) {
  if (m <= k) {
    let p = 1;
    for (let i = k + 1; i <= n; i++) p *= 1 - 1 / i;
    return p;
  }
  let p = k / m;
  for (let i = m + 1; i <= n; i++) p *= 1 - 1 / i;
  return p;
}
```

## 4. Приклади

`reservoirOne([10, 20, 30, 40, 50], makeRng(7))` = `50`; `reservoirK([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, makeRng(7))` = `[8, 2, 3]`.

Емпірична перевірка: `n = 6`, `k = 2`, 6000 запусків — частоти кожного елемента `[1987, 1957, 2027, 1937, 2061, 2031]` (очікується `6000·2/6 = 2000` кожному).

Ймовірність, що `j`-й елемент лишиться обраним серед `n = 10`: `probabilityStillChosen(3, 10)` = '0.1000' = `1/10`.

## 5. Інші підходи й порівняння

- **Зберегти все, потім обрати:** потребує `O(n)` пам'яті й відомої довжини.
- **Двопрохідний:** перший прохід — підрахунок `n`, другий — вибір індексу: два проходи (недоступно для потоку).
- **Часткове тасування** ([fisher-yates.md](fisher-yates.md)): `O(n)` пам'яті й відома довжина.
- **Reservoir:** один прохід, `O(k)` пам'яті, довжина невідома.

## 6. Варіанти

- **Зважена вибірка** (Efraimidis—Spirakis A-Res): кожному елементу ключ `u^{1/w}` (`u` — рівномірне в `(0, 1)`); зберігати `k` найбільших ключів (мін-купа за ключем). Імовірність обрання пропорційна вазі. `weightedReservoir(['a', 'b', 'c'], [1, 1, 1000], 1, makeRng(3))` = `['c']`.
- **Алгоритм L (Лі):** замість генерації випадкового числа для кожного елемента «перестрибує» через кількість елементів за геометричним розподілом: очікувана кількість випадкових чисел `O(k·(1 + log(n/k)))` замість `O(n)`: `skipReservoir`.
- **Розподілена вибірка:** кожен вузол тримає свій резервуар; їх можна об'єднати з урахуванням кількостей.
- **Вибірка з ковзного вікна** (priority sampling).

## 7. Задачі

- **Випадковий рядок файлу**, випадковий вузол зв'язного списку невідомої довжини (`randomNode`).
- **Випадковий індекс елемента з даним значенням** (LeetCode «Random Pick Index»): `randomPickIndex([1, 2, 3, 3, 3], 3, makeRng(5))` = `4` — одна з позицій `2, 3, 4` із однаковою ймовірністю.
- **Вибірка для А/Б-тестів, моніторингу, аналітики логів.**

## 8. Складність

- **Час `O(n)`** (по одному викликові генератора на елемент; Алгоритм L — менше).
- **Пам'ять `O(k)`.**
- Один прохід, потрібна лише послідовність читання.

## 9. Типові помилки

1. **Імовірність `1/n` замість `1/i`** (де `i` — номер поточного елемента).
2. **`j ∈ [0, k)` замість `[0, i)`** — вибірка зміщена до пізніх елементів.
3. **Нумерація з 0:** `Math.floor(rng() * i)` для `i`-го (з 1) елемента, порівняння `j < k`.
4. **Нестача елементів у потоці** (менше `k`) — повернути все, що є.
5. **Використання однієї випадкової величини для кількох рішень** — залежність між кроками.
6. **Незаявлений порядок у резервуарі:** результат — підмножина без гарантованого порядку.
7. **Повторне читання потоку** — суперечить сенсу алгоритму.
8. **Зважена версія без ключа `u^{1/w}`.**
9. **Погана якість генератора** псує рівномірність.

## 10. Алгоритм (стисло)

1. Перші `k` елементів — у резервуар.
2. Для `i`-го елемента (`i > k`): `j = random(1..i)`; якщо `j ≤ k` — `reservoir[j] = x_i`.
3. Кожен елемент у вибірці з імовірністю `k/n`; час `O(n)`, пам'ять `O(k)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка точна ймовірність кожного елемента для `n = 4`, `k = 1`?

```js
exactReservoirProbabilities(4, 1)
```

**2.** А для `n = 5`, `k = 2`?

```js
exactReservoirProbabilities(5, 2)
```

**3.** А для `n = 6`, `k = 3`?

```js
exactReservoirProbabilities(6, 3)
```

**4.** А для `n = 3`, `k = 3` (весь потік)?

```js
exactReservoirProbabilities(3, 3)
```

**5.** Яка ймовірність `probabilityStillChosen(3, 10)` та `probabilityStillChosen(10, 10)`?

```js
[+probabilityStillChosen(3, 10).toFixed(6), +probabilityStillChosen(10, 10).toFixed(6)]
```

**6.** Чи `probabilityStillChosen(j, 20) = 1/20` для всіх `j = 1…20`?

```js
Array.from({ length: 20 }, (_, i) => i + 1).every(j => Math.abs(probabilityStillChosen(j, 20) - 1 / 20) < 1e-12)
```

**7.** Яка ймовірність елемента `m = 2` у резервуарі `k = 3`, `n = 10`? А `m = 8`?

```js
[+probabilityInReservoir(2, 10, 3).toFixed(6), +probabilityInReservoir(8, 10, 3).toFixed(6), 3 / 10]
```

**8.** Що поверне `reservoirOne([10, 20, 30, 40, 50], makeRng(7))`?

```js
reservoirOne([10, 20, 30, 40, 50], makeRng(7))
```

**9.** Що поверне `reservoirOne([], makeRng(1))` та одноелементний `[9]`?

```js
[reservoirOne([], makeRng(1)), reservoirOne([9], makeRng(1))]
```

**10.** Що поверне `reservoirK([1..10], 3, makeRng(7))`?

```js
reservoirK([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, makeRng(7))
```

**11.** Що поверне `reservoirK([1, 2], 5, makeRng(1))` (потік коротший за `k`)?

```js
reservoirK([1, 2], 5, makeRng(1))
```

**12.** Чи розмір результату завжди `k` для потоку довжини 20 і 50 зерен?

```js
Array.from({ length: 50 }, (_, s) => s).every(s => reservoirK(Array.from({ length: 20 }, (_, i) => i), 5, makeRng(s)).length === 5)
```

**13.** Чи елементи вибірки унікальні (потік без дублікатів)?

```js
Array.from({ length: 50 }, (_, s) => s).every(s => new Set(reservoirK(Array.from({ length: 20 }, (_, i) => i), 5, makeRng(s))).size === 5)
```

### Рівень 2. Робота алгоритму

**14.** Які емпіричні частоти `empiricalFrequencies(6, 2, 6000)` (очікується 2000)?

```js
empiricalFrequencies(6, 2, 6000)
```

**15.** Яка сума емпіричних частот (має бути `k · trials`)?

```js
empiricalFrequencies(6, 2, 6000).reduce((a, b) => a + b, 0)
```

**16.** Яке відносне відхилення найбільшої частоти від очікуваних 2000?

```js
+(Math.max(...empiricalFrequencies(6, 2, 6000)) / 2000 - 1).toFixed(3)
```

**17.** Які частоти для `k = 1`, `n = 5`, 5000 запусків?

```js
empiricalFrequencies(5, 1, 5000)
```

**18.** Що поверне `weightedReservoir(['a', 'b', 'c'], [1, 1, 1000], 1, makeRng(3))`?

```js
weightedReservoir(['a', 'b', 'c'], [1, 1, 1000], 1, makeRng(3))
```

**19.** Як часто важкий елемент вибирається у зваженій вибірці за 1000 запусків?

```js
(() => { const rng = makeRng(11); let c = 0; for (let t = 0; t < 1000; t++) if (weightedReservoir(['a', 'b', 'c'], [1, 1, 8], 1, rng)[0] === 'c') c++; return c; })()
```

**20.** Що поверне `skipReservoir` для потоку з 100 елементів `k = 5` (розмір і діапазон)?

```js
(() => { const r = skipReservoir(Array.from({ length: 100 }, (_, i) => i), 5, makeRng(4)); return [r.length, r.every(x => x >= 0 && x < 100)]; })()
```

**21.** Що поверне `randomPickIndex([1, 2, 3, 3, 3], 3, makeRng(5))`?

```js
randomPickIndex([1, 2, 3, 3, 3], 3, makeRng(5))
```

**22.** Як розподілені індекси `randomPickIndex` за 3000 запусків для значення `3` у `[1, 3, 3, 2, 3]`?

```js
(() => { const rng = makeRng(9); const c = {}; for (let t = 0; t < 3000; t++) { const i = randomPickIndex([1, 3, 3, 2, 3], 3, rng); c[i] = (c[i] || 0) + 1; } return Object.fromEntries(Object.entries(c).sort()); })()
```

**23.** Що поверне `randomPickIndex` для відсутнього значення?

```js
randomPickIndex([1, 2], 9, makeRng(1))
```

**24.** Що поверне `shufflePrefix([1..8], 3, makeRng(2))`?

```js
shufflePrefix([1, 2, 3, 4, 5, 6, 7, 8], 3, makeRng(2))
```

**25.** Скільки викликів генератора робить `reservoirK` для потоку 1000 і `k = 10` (по одному на елемент після `k`)?

```js
1000 - 10
```

**26.** Скільки пам'яті (елементів) потрібно для вибірки 100 з потоку в мільярд?

```js
100
```

### Рівень 3. Складність і нюанси

**27.** Яка ймовірність, що перший елемент потоку з 5 елементів у вибірці `k = 1`?

```js
+probabilityInReservoir(1, 5, 1).toFixed(4)
```

**28.** Скільки різних `k`-підмножин із `n = 5`, `k = 2` і яка ймовірність кожної?

```js
[10, 1 / 10]
```

**29.** Чи кожна 2-підмножина `n = 4` має однакову частоту за 12000 запусків (кількість різних підмножин і діапазон)?

```js
(() => { const rng = makeRng(21); const c = {}; for (let t = 0; t < 12000; t++) { const r = reservoirK([0, 1, 2, 3], 2, rng).slice().sort().join(''); c[r] = (c[r] || 0) + 1; } const v = Object.values(c); return [v.length, Math.min(...v), Math.max(...v)]; })()
```

**30.** Напишіть `sampleWithoutReplacement(stream, k, rng)` — обгортка `reservoirK` із сортуванням результату за зростанням.

**31.** Напишіть `randomLine(text, rng)` — випадковий рядок багаторядкового тексту.

**32.** Напишіть `reservoirCounts(n, k, trials)` — кількість потраплянь для кожного індексу за `trials` запусків (з `makeRng(3)`).

**33.** Напишіть `uniformityRatio(counts)` — відношення мінімальної частоти до максимальної (округліть до 3 знаків).

**34.** Напишіть `mergeReservoirs(r1, n1, r2, n2, k, rng)` — об'єднання двох резервуарів розмірів `k` із потоків довжин `n1`, `n2` (кожен елемент береться з першого з імовірністю `n1/(n1+n2)`).

**35.** Напишіть `selectRandomK(arr, k, rng)` — `k` випадкових елементів масиву відомої довжини через `shufflePrefix`.

**36.** Напишіть `probAtLeastOneOfFirstK(n, k, m)` — ймовірність, що вибірка з `k` містить хоч один із перших `m` елементів (формула `1 − C(n−m, k)/C(n, k)`).

**37.** Напишіть `topKByRandomKeys(items, k, rng)` — вибір `k` елементів призначенням випадкових ключів і взяттям найбільших.

**38.** Напишіть `expectedReplacements(n, k)` — очікувану кількість замін після заповнення (`Σ k/i` для `i = k+1..n`), округліть до 3 знаків.

**39.** Напишіть `countOfStreamElementsSeen(stream)` — кількість елементів потоку (лічильник, який зберігає алгоритм).

### Рівень 4. Задачі з інтерв'ю

**40.** Яку задачу розв'язує резервуарна вибірка?

**41.** Чому для `k = 1` ймовірність `1/i` на `i`-му кроці дає рівномірність?

**42.** Як працює Algorithm R для `k` елементів?

**43.** Чому кожен елемент опиняється у вибірці з імовірністю `k/n`?

**44.** Яка складність часу й пам'яті резервуарної вибірки?

**45.** Чим відрізняється резервуарна вибірка від тасування Fisher—Yates?

**46.** Як реалізується зважена вибірка?

**47.** Яка типова помилка в `j` призводить до зміщеної вибірки?

**48.** Як об'єднати резервуари з різних вузлів?

**49.** Де на практиці застосовують резервуарну вибірку?

**50.** Яка очікувана кількість замін `expectedReplacements(100, 5)`?

```js
expectedReplacements(100, 5)
```

### Відповіді

1. `['6/24', '6/24', '6/24', '6/24']`
2. `['24/60', '24/60', '24/60', '24/60', '24/60']`
3. `['60/120', '60/120', '60/120', '60/120', '60/120', '60/120']`
4. `['1/1', '1/1', '1/1']`
5. `[0.1, 0.1]`
6. `true`
7. `[0.3, 0.3, 0.3]`
8. `50`
9. `[undefined, 9]`
10. `[8, 2, 3]`
11. `[1, 2]`
12. `true`
13. `true`
14. `[1987, 1957, 2027, 1937, 2061, 2031]`
15. `12000`
16. `0.03`
17. `[985, 1007, 968, 1033, 1007]`
18. `['c']`
19. `787`
20. `[5, true]`
21. `4`
22. `{ '1': 993, '2': 979, '4': 1028 }`
23. `-1`
24. `[2, 5, 4]`
25. `990`
26. `100`
27. `0.2`
28. `[10, 0.1]`
29. `[6, 1951, 2062]`
30. Приклад розв'язку:

   ```js
   const sampleWithoutReplacement = (s, k, rng) => reservoirK(s, k, rng).sort((a, b) => a - b)
   ```

   Виклик `sampleWithoutReplacement(Array.from({ length: 20 }, (_, i) => i), 4, makeRng(3))` → `[4, 8, 12, 14]`

31. Приклад розв'язку:

   ```js
   const randomLine = (t, rng) => reservoirOne(t.split('\n'), rng)
   ```

   Виклик `[randomLine('a\nb\nc', makeRng(5)), randomLine('single', makeRng(5))]` → `['c', 'single']`

32. Приклад розв'язку:

   ```js
   function reservoirCounts(n, k, trials) {
     const rng = makeRng(3);
     const c = new Array(n).fill(0);
     for (let t = 0; t < trials; t++) for (const x of reservoirK(Array.from({ length: n }, (_, i) => i), k, rng)) c[x]++;
     return c;
   }
   ```

   Виклик `reservoirCounts(4, 2, 4000)` → `[1984, 1978, 2027, 2011]`

33. Приклад розв'язку:

   ```js
   const uniformityRatio = (c) => +(Math.min(...c) / Math.max(...c)).toFixed(3)
   ```

   Виклик `[uniformityRatio([100, 100, 100]), uniformityRatio([50, 100])]` → `[1, 0.5]`

34. Приклад розв'язку:

   ```js
   function mergeReservoirs(r1, n1, r2, n2, k, rng) {
     const a = r1.slice(), b = r2.slice();
     const out = [];
     let na = n1, nb = n2;
     while (out.length < k && (a.length || b.length)) {
       const fromA = a.length && (!b.length || rng() < na / (na + nb));
       if (fromA) {
         out.push(a.splice(Math.floor(rng() * a.length), 1)[0]);
         na--;
       } else {
         out.push(b.splice(Math.floor(rng() * b.length), 1)[0]);
         nb--;
       }
     }
     return out;
   }
   ```

   Виклик `mergeReservoirs([1, 2, 3], 100, [4, 5, 6], 100, 3, makeRng(2)).length` → `3`

35. Приклад розв'язку:

   ```js
   const selectRandomK = (a, k, rng) => shufflePrefix(a, k, rng)
   ```

   Виклик `selectRandomK([1, 2, 3, 4, 5], 2, makeRng(6))` → `[2, 5]`

36. Приклад розв'язку:

   ```js
   function probAtLeastOneOfFirstK(n, k, m) {
     const C = (a, b) => {
       let r = 1;
       for (let i = 1; i <= b; i++) r = r * (a - b + i) / i;
       return r;
     };
     return +(1 - C(n - m, k) / C(n, k)).toFixed(4);
   }
   ```

   Виклик `[probAtLeastOneOfFirstK(10, 3, 2), probAtLeastOneOfFirstK(5, 5, 1)]` → `[0.5333, 1]`

37. Приклад розв'язку:

   ```js
   function topKByRandomKeys(items, k, rng) {
     return items.map(x => [rng(), x]).sort((a, b) => b[0] - a[0]).slice(0, k).map(p => p[1]).sort((a, b) => a - b);
   }
   ```

   Виклик `topKByRandomKeys([1, 2, 3, 4, 5, 6], 3, makeRng(8))` → `[4, 5, 6]`

38. Приклад розв'язку:

   ```js
   function expectedReplacements(n, k) {
     let s = 0;
     for (let i = k + 1; i <= n; i++) s += k / i;
     return +s.toFixed(3);
   }
   ```

   Виклик `[expectedReplacements(10, 3), expectedReplacements(1000, 10), expectedReplacements(5, 5)]` → `[3.287, 45.565, 0]`

39. Приклад розв'язку:

   ```js
   function countOfStreamElementsSeen(s) {
     let c = 0;
     for (const x of s) c++;
     return c;
   }
   ```

   Виклик `[countOfStreamElementsSeen([1, 2, 3]), countOfStreamElementsSeen([])]` → `[3, 0]`

40. Вибір `k` елементів із потоку невідомої довжини за один прохід і `O(k)` пам'яті так, що кожен елемент потрапляє у вибірку з однаковою ймовірністю `k/n`.
41. Елемент `j` обирається з імовірністю `1/j` і не замінюється наступними з імовірністю `Π (1 − 1/i) = j/n`; добуток `1/j · j/n = 1/n` однаковий для всіх `j`.
42. Перші `k` елементів кладуть у резервуар; для `i`-го (`i > k`) обирають випадкове `j ∈ [1, i]`, і якщо `j ≤ k`, замінюють `reservoir[j]` поточним елементом.
43. Елемент `m > k` потрапляє з імовірністю `k/m` і виживає на кроках `m+1…n` з імовірністю `Π (i−1)/i = m/n`, що дає `k/n`. Для початкових елементів добуток `Π_{i=k+1..n} (i−1)/i = k/n`.
44. Час `O(n)` (одне випадкове число на елемент) і пам'ять `O(k)`; Алгоритм L зменшує кількість викликів генератора до `O(k(1 + log(n/k)))`.
45. Тасування потребує масив відомої довжини (`O(n)` пам'яті), а резервуарна вибірка працює з потоком невідомої довжини і зберігає лише `k` елементів.
46. Кожному елементу призначають ключ `u^{1/w}` (`u` — рівномірне випадкове число, `w` — вага) і зберігають `k` найбільших ключів; імовірність потрапляння пропорційна вазі.
47. Якщо `j` вибирати з `[0, k)` замість `[0, i)`, то пізні елементи потрапляють у вибірку занадто часто; якщо з `[0, n)` з невідомим `n` — неможливо в потоці.
48. Брати елементи з резервуарів із імовірностями, пропорційними кількості елементів, які кожен вузол бачив (`n₁ : n₂`), без повернення; результат — рівномірна вибірка з об'єднаного потоку.
49. Вибірка рядків із великих файлів і логів, моніторинг мережевого трафіку, аналітика та A/B-дані, випадковий вузол зв'язного списку невідомої довжини, статистика в базах даних.
50. `14.52`
