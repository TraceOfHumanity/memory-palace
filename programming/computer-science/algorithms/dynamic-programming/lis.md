# LIS — найдовша зростаюча підпослідовність

**Найдовша зростаюча підпослідовність (Longest Increasing Subsequence, LIS)** масиву — найдовша підпослідовність (елементи в початковому порядку, але не обов'язково поруч), у якій значення **строго зростають**. Для `[10, 9, 2, 5, 3, 7, 101, 18]` LIS має довжину 4, наприклад `[2, 3, 7, 101]`. Задача класична: є розв'язок `O(n²)` на ДП і чудовий `O(n log n)` через бінарний пошук. Пов'язана з сортуванням «терпінням» (patience sorting), вкладенням конвертів, схемами кваліфікації, порівнянням послідовностей.

## 1. Розв'язок `O(n²)`: ДП

**Стан:** `dp[i]` — довжина LIS, що **закінчується** в елементі `a[i]`.

**Перехід:** `dp[i] = 1 + max(dp[j])` по всіх `j < i`, для яких `a[j] < a[i]` (або `1`, якщо таких немає).

**Відповідь:** `max(dp[i])`.

`lisLengthQuadratic([10, 9, 2, 5, 3, 7, 101, 18])` = `4`. Масив `dp`: `[1, 1, 1, 2, 2, 3, 4, 4]`.

Для відновлення самої підпослідовності зберігаємо `prev[i]` — індекс попереднього елемента: `[2, 5, 7, 101]`.

## 2. Розв'язок `O(n log n)`: «терпіння» і бінарний пошук

Тримаємо масив `tails`, де `tails[k]` — **найменший можливий кінцевий елемент** зростаючої підпослідовності довжини `k + 1`. Цей масив завжди **відсортований** (строго зростає). Для нового `x`:

- знайти першу позицію `pos`, де `tails[pos] ≥ x` (`lowerBound`, [binary-search.md](../searching/binary-search.md));
- замінити `tails[pos] = x` (або додати в кінець, якщо `x` більший за всі).

Довжина `tails` наприкінці — довжина LIS.

**Чому правильно.** `tails[k]` — «найкращий» (найменший) хвіст для довжини `k + 1`: чим менший хвіст, тим легше його продовжити. Заміна `tails[pos] = x` не зменшує найдовшої довжини, але покращує шанси продовження. **Увага:** `tails` — це **не** сама LIS, а лише допоміжна структура; її елементи можуть належати різним підпослідовностям.

Приклад: `[10, 9, 2, 5, 3, 7, 101, 18]`:

- x=10: додаємо в кінець → tails=[10]
- x=9: замінюємо 10 → tails=[9]
- x=2: замінюємо 9 → tails=[2]
- x=5: додаємо в кінець → tails=[2, 5]
- x=3: замінюємо 5 → tails=[2, 3]
- x=7: додаємо в кінець → tails=[2, 3, 7]
- x=101: додаємо в кінець → tails=[2, 3, 7, 101]
- x=18: замінюємо 101 → tails=[2, 3, 7, 18]

## 3. Реалізація

```js
function lowerBound(a, x) {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function lisDp(a) {
  const dp = new Array(a.length).fill(1);
  for (let i = 1; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  return dp;
}

function lisLengthQuadratic(a) {
  return a.length ? Math.max(...lisDp(a)) : 0;
}

function lisSequence(a) {
  const n = a.length;
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);
  let best = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) if (a[j] < a[i] && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
    if (dp[i] > dp[best]) best = i;
  }
  const out = [];
  for (let i = n ? best : -1; i !== -1; i = prev[i]) out.push(a[i]);
  return out.reverse();
}

function lisLength(a) {
  const tails = [];
  for (const x of a) {
    const pos = lowerBound(tails, x);
    tails[pos] = x;
  }
  return tails.length;
}

function lisTrace(a) {
  const tails = [];
  const out = [];
  for (const x of a) {
    const pos = lowerBound(tails, x);
    const action = pos === tails.length ? 'додаємо в кінець' : 'замінюємо ' + tails[pos];
    tails[pos] = x;
    out.push('x=' + x + ': ' + action + ' → tails=[' + tails.join(', ') + ']');
  }
  return out;
}

function lisSequenceFast(a) {
  const tails = [];
  const tailIdx = [];
  const prev = new Array(a.length).fill(-1);
  for (let i = 0; i < a.length; i++) {
    const pos = lowerBound(tails, a[i]);
    tails[pos] = a[i];
    tailIdx[pos] = i;
    prev[i] = pos > 0 ? tailIdx[pos - 1] : -1;
  }
  const out = [];
  for (let i = tailIdx.length ? tailIdx[tailIdx.length - 1] : -1; i !== -1; i = prev[i]) out.push(a[i]);
  return out.reverse();
}

function lisNonStrict(a) {
  const tails = [];
  for (const x of a) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = lo + ((hi - lo) >> 1);
      if (tails[mid] <= x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}

function longestDecreasing(a) {
  return lisLength(a.map((x) => -x));
}

function countLis(a) {
  const n = a.length;
  const len = new Array(n).fill(1);
  const cnt = new Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (a[j] < a[i]) {
        if (len[j] + 1 > len[i]) { len[i] = len[j] + 1; cnt[i] = cnt[j]; }
        else if (len[j] + 1 === len[i]) cnt[i] += cnt[j];
      }
    }
  }
  const m = Math.max(0, ...len);
  let total = 0;
  for (let i = 0; i < n; i++) if (len[i] === m) total += cnt[i];
  return total;
}

function russianDolls(envelopes) {
  const sorted = envelopes.slice().sort((a, b) => a[0] - b[0] || b[1] - a[1]);
  return lisLength(sorted.map((e) => e[1]));
}

function minDeletionsToSort(a) {
  return a.length - lisNonStrict(a);
}

function longestBitonic(a) {
  const n = a.length;
  const inc = lisDp(a);
  const dec = lisDp(a.slice().reverse()).reverse();
  let best = 0;
  for (let i = 0; i < n; i++) best = Math.max(best, inc[i] + dec[i] - 1);
  return best;
}

function maxSumIncreasing(a) {
  const dp = a.slice();
  for (let i = 1; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j] < a[i]) dp[i] = Math.max(dp[i], dp[j] + a[i]);
  return Math.max(0, ...dp);
}

function longestChain(pairs) {
  const sorted = pairs.slice().sort((a, b) => a[1] - b[1]);
  let end = -Infinity;
  let c = 0;
  for (const [l, r] of sorted) if (l > end) { c++; end = r; }
  return c;
}

function patienceSortPiles(a) {
  const piles = [];
  for (const x of a) {
    let placed = false;
    for (const p of piles) if (p[p.length - 1] >= x) { p.push(x); placed = true; break; }
    if (!placed) piles.push([x]);
  }
  return piles;
}
```

## 4. Зв'язок із сортуванням терпінням

**Patience sorting** — розкладання карт у стопки: кладемо карту на **першу** стопку, чия верхня карта **не менша** (інакше починаємо нову). Кількість стопок дорівнює довжині LIS. `patienceSortPiles([10, 9, 2, 5, 3, 7, 101, 18])` = `[[10, 9, 2], [5, 3], [7], [101, 18]]` — 4 стопки. Верхні карти стопок і є масив `tails`. Теорема Ділворта/Грінне: мінімальна кількість незростаючих підпослідовностей, на які розбивається масив, дорівнює довжині LIS.

## 5. Складність

| Підхід | Час | Пам'ять |
|---|---|---|
| ДП | `O(n²)` | `O(n)` |
| Бінарний пошук (`tails`) | `O(n log n)` | `O(n)` |
| Дерево Фенвіка/відрізків за рангами | `O(n log n)` | `O(n)` |

Для `n = 10⁵` перший — `10¹⁰` операцій, другий — `~1,7·10⁶`. Нижня межа порівняльних алгоритмів `Ω(n log n)`.

## 6. Варіації

- **Нестрого зростаюча (неспадна):** `lisNonStrict([1, 3, 3, 4, 2])` = `4`, строга — `3`; різниця — `upperBound` замість `lowerBound`.
- **Найдовша спадна:** інвертувати знаки: `longestDecreasing([5, 3, 4, 8, 6, 7])` = `2`.
- **Кількість LIS:** `countLis([1, 3, 5, 4, 7])` = `2` (дві: `1,3,5,7` і `1,3,4,7`).
- **Вкладення конвертів (Russian dolls):** сортуємо за шириною ↑, за висотою ↓ (щоб однакові ширини не рахувалися вкладеними), потім LIS за висотою: `russianDolls([[5, 4], [6, 4], [6, 7], [2, 3]])` = `3`.
- **Бітонічна підпослідовність** (спочатку зростає, потім спадає): `longestBitonic([1, 11, 2, 10, 4, 5, 2, 1])` = `6`.
- **Мінімум видалень, щоб відсортувати:** `n − довжина неспадної LIS`.
- **Максимальна сума зростаючої підпослідовності:** `maxSumIncreasing([1, 101, 2, 3, 100, 4, 5])` = `106`.
- **Ланцюжок пар** (`[a, b]` слідує за `[c, d]`, якщо `b < c`): жадібно за кінцем: `longestChain([[1, 2], [2, 3], [3, 4]])` = `2`.
- **LIS і LCS:** LIS масиву дорівнює LCS цього масиву з його відсортованою (унікальною) копією ([lcs.md](lcs.md)).

## 7. Типові помилки

1. **Вважати `tails` самою підпослідовністю** — вона лише допоміжна.
2. **`upperBound` замість `lowerBound`** для строгої зростаючої (дозволяє рівні).
3. **Переплутати «закінчується в `i`» і «найдовша серед перших `i`»** у стані ДП.
4. **Відповідь `dp[n − 1]`** замість `max(dp)`.
5. **Порожній масив:** `Math.max(...[])` = `−Infinity`.
6. **Відновлення з `tails`** без масиву батьків.
7. **У конвертах:** не відсортувати висоти спаданням для однакових ширин.
8. **Плутанина підмасиву і підпослідовності.**

## 8. Алгоритм (стисло)

1. `tails = []`.
2. Для кожного `x`: `pos = lowerBound(tails, x)`; `tails[pos] = x`.
3. Довжина LIS — `tails.length`.
4. Час `O(n log n)`, пам'ять `O(n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка довжина LIS для `[10, 9, 2, 5, 3, 7, 101, 18]` за `O(n log n)`?

```js
lisLength([10, 9, 2, 5, 3, 7, 101, 18])
```

**2.** А квадратичним ДП?

```js
lisLengthQuadratic([10, 9, 2, 5, 3, 7, 101, 18])
```

**3.** Який масив `dp` для цього входу?

```js
lisDp([10, 9, 2, 5, 3, 7, 101, 18])
```

**4.** Яку LIS відновлює `lisSequence`?

```js
lisSequence([10, 9, 2, 5, 3, 7, 101, 18])
```

**5.** А `lisSequenceFast`?

```js
lisSequenceFast([10, 9, 2, 5, 3, 7, 101, 18])
```

**6.** Які кроки (`tails`) виконує `lisTrace`?

```js
lisTrace([10, 9, 2, 5, 3, 7, 101, 18])
```

**7.** Що поверне `lisLength([])`, `([7])`, `([7, 7, 7])`?

```js
[lisLength([]), lisLength([7]), lisLength([7, 7, 7])]
```

**8.** Що поверне `lisLength([0, 1, 0, 3, 2, 3])`?

```js
lisLength([0, 1, 0, 3, 2, 3])
```

**9.** Що поверне `lisLength([1, 2, 3, 4, 5])` та `lisLength([5, 4, 3, 2, 1])`?

```js
[lisLength([1, 2, 3, 4, 5]), lisLength([5, 4, 3, 2, 1])]
```

**10.** Що поверне `lisSequence([])`?

```js
lisSequence([])
```

**11.** Що поверне `lisNonStrict([1, 3, 3, 4, 2])` та строга `lisLength` для того ж масиву?

```js
[lisNonStrict([1, 3, 3, 4, 2]), lisLength([1, 3, 3, 4, 2])]
```

**12.** Що поверне `longestDecreasing([5, 3, 4, 8, 6, 7])`?

```js
longestDecreasing([5, 3, 4, 8, 6, 7])
```

**13.** Скільки різних LIS у `[1, 3, 5, 4, 7]`?

```js
countLis([1, 3, 5, 4, 7])
```

### Рівень 2. Робота алгоритму

**14.** Скільки LIS у масиві з однакових `[2, 2, 2, 2, 2]`?

```js
countLis([2, 2, 2, 2, 2])
```

**15.** Яка відповідь `russianDolls([[5, 4], [6, 4], [6, 7], [2, 3]])`?

```js
russianDolls([[5, 4], [6, 4], [6, 7], [2, 3]])
```

**16.** Що поверне `russianDolls([[1, 1], [1, 1], [1, 1]])`?

```js
russianDolls([[1, 1], [1, 1], [1, 1]])
```

**17.** Яка довжина найдовшої бітонічної підпослідовності `[1, 11, 2, 10, 4, 5, 2, 1]`?

```js
longestBitonic([1, 11, 2, 10, 4, 5, 2, 1])
```

**18.** Скільки видалень потрібно, щоб `[1, 3, 2, 4, 3]` стала неспадною?

```js
minDeletionsToSort([1, 3, 2, 4, 3])
```

**19.** Яка максимальна сума зростаючої підпослідовності `[1, 101, 2, 3, 100, 4, 5]`?

```js
maxSumIncreasing([1, 101, 2, 3, 100, 4, 5])
```

**20.** Яка довжина ланцюжка пар `[[1, 2], [2, 3], [3, 4]]` та `[[1, 2], [7, 8], [4, 5]]`?

```js
[longestChain([[1, 2], [2, 3], [3, 4]]), longestChain([[1, 2], [7, 8], [4, 5]])]
```

**21.** Які стопки утворює `patienceSortPiles([10, 9, 2, 5, 3, 7, 101, 18])`?

```js
patienceSortPiles([10, 9, 2, 5, 3, 7, 101, 18])
```

**22.** Скільки стопок у `patienceSortPiles` для відсортованого за зростанням масиву з 5 елементів і для спадного?

```js
[patienceSortPiles([1, 2, 3, 4, 5]).length, patienceSortPiles([5, 4, 3, 2, 1]).length]
```

**23.** Чи збігаються `lisLength` та `lisLengthQuadratic` на 60 «псевдовипадкових» масивах довжини 10?

```js
(() => { let ok = true; for (let t = 1; t <= 60; t++) { const a = Array.from({ length: 10 }, (_, i) => (t * 7 + i * i * 3 + i * t) % 13); if (lisLength(a) !== lisLengthQuadratic(a)) ok = false; } return ok; })()
```

**24.** Чи збігається довжина `lisSequenceFast` із `lisLength` для тих самих масивів?

```js
(() => { let ok = true; for (let t = 1; t <= 60; t++) { const a = Array.from({ length: 10 }, (_, i) => (t * 7 + i * i * 3 + i * t) % 13); const s = lisSequenceFast(a); const inc = s.every((x, i) => i === 0 || s[i - 1] < x); if (s.length !== lisLength(a) || !inc) ok = false; } return ok; })()
```

**25.** Що буде в `tails`, коли обробити `[4, 5, 6, 3]`? (`tails` — не сама LIS)

```js
(() => { const t = []; for (const x of [4, 5, 6, 3]) t[lowerBound(t, x)] = x; return t; })()
```

**26.** Скільки операцій приблизно для `n = 10⁵`: `n²` і `n·log₂ n`?

```js
[1e10, Math.round(1e5 * Math.log2(1e5))]
```

### Рівень 3. Складність і нюанси

**27.** Яка довжина LIS для чергування `[1, 2, 1, 2, 1, 2]`?

```js
lisLength([1, 2, 1, 2, 1, 2])
```

**28.** Яка довжина LIS для масиву `0..999` у перемішаному «псевдовипадковому» порядку `(i * 37) % 1000`?

```js
lisLength(Array.from({ length: 1000 }, (_, i) => (i * 37) % 1000))
```

**29.** Яка довжина LIS для двох зростаючих блоків `[1, 2, 3, 1, 2, 3]`?

```js
lisLength([1, 2, 3, 1, 2, 3])
```

**30.** Напишіть `longestIncreasingByLcs(a)` — LIS як LCS масиву з його відсортованою унікальною копією.

**31.** Напишіть `increasingTriplet(a)` — чи є три зростаючі елементи `i < j < k`, `a[i] < a[j] < a[k]` (за `O(n)`).

**32.** Напишіть `longestStringChain(words)` — найдовший ланцюжок слів, де кожне наступне отримано додаванням однієї літери (ДП за довжиною).

**33.** Напишіть `largestDivisibleSubset(nums)` — найбільша підмножина, де кожна пара ділиться (варіант LIS за відношенням подільності); поверніть довжину.

**34.** Напишіть `minimumNumberOfNonDecreasingChains(a)` — на скільки неспадних підпослідовностей мінімум можна розбити масив (за теоремою — довжина найдовшої строго спадної).

**35.** Напишіть `bridgeBuilding(north, south)` — максимум мостів між містами, що не перетинаються (LIS за відсортованими парами).

**36.** Напишіть `lengthOfLisWithLimit(a, maxStep)` — LIS, де різниця сусідніх елементів підпослідовності `≤ maxStep` (квадратичне ДП).

**37.** Напишіть `isSubsequenceIncreasingKnown(a, k)` — чи існує зростаюча підпослідовність довжини не менше `k`.

**38.** Напишіть `lisEndingAt(a)` — масив довжин найдовшої зростаючої підпослідовності, що закінчується в кожній позиції, за `O(n log n)` (довжина = позиція в `tails` + 1).

**39.** Напишіть `cutInThree(a)` — скільки найменше елементів видалити, щоб лишилась строго зростаюча послідовність (довжина − LIS).

### Рівень 4. Задачі з інтерв'ю

**40.** Що означає `dp[i]` у квадратичному розв'язку LIS?

**41.** Як працює розв'язок `O(n log n)` і що зберігає `tails`?

**42.** Чому `tails` не є LIS?

**43.** Чому `tails` завжди відсортований?

**44.** Чим строга LIS відрізняється від неспадної в реалізації?

**45.** Як пов'язані LIS і сортування терпінням?

**46.** Як розв'язується задача про вкладення конвертів?

**47.** Як порахувати кількість різних LIS?

**48.** Як LIS виражається через LCS?

**49.** Чому для `n = 10⁵` потрібен саме `O(n log n)`?

**50.** Яка довжина LIS для `[3, 10, 2, 1, 20]` та `[50, 3, 10, 7, 40, 80]`?

```js
[lisLength([3, 10, 2, 1, 20]), lisLength([50, 3, 10, 7, 40, 80])]
```

### Відповіді

1. `4`
2. `4`
3. `[1, 1, 1, 2, 2, 3, 4, 4]`
4. `[2, 5, 7, 101]`
5. `[2, 3, 7, 18]`
6. `['x=10: додаємо в кінець → tails=[10]', 'x=9: замінюємо 10 → tails=[9]', 'x=2: замінюємо 9 → tails=[2]', 'x=5: додаємо в кінець → tails=[2, 5]', 'x=3: замінюємо 5 → tails=[2, 3]', 'x=7: додаємо в кінець → tails=[2, 3, 7]', 'x=101: додаємо в кінець → tails=[2, 3, 7, 101]', 'x=18: замінюємо 101 → tails=[2, 3, 7, 18]']`
7. `[0, 1, 1]`
8. `4`
9. `[5, 1]`
10. `[]`
11. `[4, 3]`
12. `2`
13. `2`
14. `5`
15. `3`
16. `1`
17. `6`
18. `2`
19. `106`
20. `[2, 3]`
21. `[[10, 9, 2], [5, 3], [7], [101, 18]]`
22. `[5, 1]`
23. `true`
24. `true`
25. `[3, 5, 6]`
26. `[10000000000, 1660964]`
27. `2`
28. `28`
29. `3`
30. Приклад розв'язку:

   ```js
   function longestIncreasingByLcs(a) {
     const b = [...new Set(a)].sort((x, y) => x - y);
     const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
     for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
     return dp[a.length][b.length];
   }
   ```

   Виклик `[longestIncreasingByLcs([10, 9, 2, 5, 3, 7, 101, 18]), longestIncreasingByLcs([7, 7, 7])]` → `[4, 1]`

31. Приклад розв'язку:

   ```js
   function increasingTriplet(a) {
     let first = Infinity, second = Infinity;
     for (const x of a) {
       if (x <= first) first = x;
       else if (x <= second) second = x;
       else return true;
     }
     return false;
   }
   ```

   Виклик `[increasingTriplet([1, 2, 3, 4, 5]), increasingTriplet([5, 4, 3, 2, 1]), increasingTriplet([2, 1, 5, 0, 4, 6])]` → `[true, false, true]`

32. Приклад розв'язку:

   ```js
   function longestStringChain(words) {
     const w = words.slice().sort((a, b) => a.length - b.length);
     const dp = new Map();
     let best = 0;
     for (const x of w) {
       let cur = 1;
       for (let i = 0; i < x.length; i++) {
         const p = x.slice(0, i) + x.slice(i + 1);
         if (dp.has(p)) cur = Math.max(cur, dp.get(p) + 1);
       }
       dp.set(x, cur);
       best = Math.max(best, cur);
     }
     return best;
   }
   ```

   Виклик `[longestStringChain(['a', 'b', 'ba', 'bca', 'bda', 'bdca']), longestStringChain(['abcd', 'dbqca'])]` → `[4, 1]`

33. Приклад розв'язку:

   ```js
   function largestDivisibleSubset(nums) {
     const a = nums.slice().sort((x, y) => x - y);
     const dp = new Array(a.length).fill(1);
     let best = a.length ? 1 : 0;
     for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[i] % a[j] === 0) {
       dp[i] = Math.max(dp[i], dp[j] + 1);
       best = Math.max(best, dp[i]);
     }
     return best;
   }
   ```

   Виклик `[largestDivisibleSubset([1, 2, 3]), largestDivisibleSubset([1, 2, 4, 8]), largestDivisibleSubset([])]` → `[2, 4, 0]`

34. Приклад розв'язку:

   ```js
   const minimumNumberOfNonDecreasingChains = (a) => longestDecreasing(a)
   ```

   Виклик `[minimumNumberOfNonDecreasingChains([4, 3, 2, 1]), minimumNumberOfNonDecreasingChains([1, 2, 3])]` → `[4, 1]`

35. Приклад розв'язку:

   ```js
   function bridgeBuilding(n, s) {
     const pairs = n.map((x, i) => [x, s[i]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
     return lisNonStrict(pairs.map(p => p[1]));
   }
   ```

   Виклик `[bridgeBuilding([6, 2, 4, 1], [7, 3, 5, 2]), bridgeBuilding([1, 2, 3], [3, 2, 1])]` → `[4, 1]`

36. Приклад розв'язку:

   ```js
   function lengthOfLisWithLimit(a, k) {
     const dp = new Array(a.length).fill(1);
     let best = a.length ? 1 : 0;
     for (let i = 0; i < a.length; i++) for (let j = 0; j < i; j++) if (a[j] < a[i] && a[i] - a[j] <= k) {
       dp[i] = Math.max(dp[i], dp[j] + 1);
       best = Math.max(best, dp[i]);
     }
     return best;
   }
   ```

   Виклик `[lengthOfLisWithLimit([4, 2, 1, 4, 3, 4, 5, 8, 15], 3), lengthOfLisWithLimit([1, 5, 9], 3)]` → `[5, 1]`

37. Приклад розв'язку:

   ```js
   const isSubsequenceIncreasingKnown = (a, k) => lisLength(a) >= k
   ```

   Виклик `[isSubsequenceIncreasingKnown([10, 9, 2, 5, 3, 7, 101, 18], 4), isSubsequenceIncreasingKnown([10, 9, 2, 5, 3, 7, 101, 18], 5)]` → `[true, false]`

38. Приклад розв'язку:

   ```js
   function lisEndingAt(a) {
     const tails = [], res = [];
     for (const x of a) {
       const pos = lowerBound(tails, x);
       tails[pos] = x;
       res.push(pos + 1);
     }
     return res;
   }
   ```

   Виклик `lisEndingAt([10, 9, 2, 5, 3, 7, 101, 18])` → `[1, 1, 1, 2, 2, 3, 4, 4]`

39. Приклад розв'язку:

   ```js
   const cutInThree = (a) => a.length - lisLength(a)
   ```

   Виклик `[cutInThree([10, 9, 2, 5, 3, 7, 101, 18]), cutInThree([1, 2, 3])]` → `[4, 0]`

40. Довжина найдовшої зростаючої підпослідовності, яка **закінчується** саме в елементі `a[i]`. Відповідь — максимум по всіх `i`, бо LIS може закінчуватись де завгодно.
41. `tails[k]` — найменший можливий кінцевий елемент зростаючої підпослідовності довжини `k + 1`. Для кожного `x` бінарним пошуком знаходять першу позицію з `tails[pos] ≥ x` і замінюють її (або додають в кінець). Довжина `tails` — довжина LIS.
42. Елементи `tails` можуть походити з різних підпослідовностей: заміна `tails[pos] = x` зберігає лише найкращі хвости для кожної довжини, а не одну послідовну підпослідовність. Для відновлення потрібні індекси й масив батьків.
43. Для будь-якої підпослідовності довжини `k + 1` можна відкинути її останній елемент і отримати довжини `k` із меншим хвостом, тому найменший хвіст довжини `k` строго менший за найменший хвіст довжини `k + 1`.
44. Для строгої використовують `lowerBound` (перший елемент `≥ x`), для неспадної — `upperBound` (перший елемент `> x`), щоб рівні елементи могли продовжувати послідовність.
45. При розкладанні елементів у стопки за правилом patience sorting кількість стопок дорівнює довжині LIS, а верхні карти стопок утворюють масив `tails`. За теоремою Ділворта мінімальна кількість спадних підпослідовностей, що покривають масив, дорівнює довжині LIS.
46. Відсортувати за шириною зростанням, а за висотою — спаданням (щоб однакові ширини не утворили зростаючу пару), і знайти LIS за висотою.
47. У квадратичному ДП зберігати для кожного `i` пару `(довжина, кількість)`: при `len[j] + 1 > len[i]` кількість копіюється, при рівності додається. Відповідь — сума кількостей для елементів з максимальною довжиною.
48. LIS масиву дорівнює LCS цього масиву та його відсортованої копії без дублікатів (для строгої послідовності). Проте це `O(n²)`, тоді як спеціальний алгоритм дає `O(n log n)`.
49. Квадратичне ДП виконує близько `10¹⁰` операцій (десятки секунд і більше), тоді як `n log n ≈ 1,7·10⁶` — частки секунди.
50. `[3, 4]`
