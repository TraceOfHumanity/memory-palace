# Fenwick Tree — дерево Фенвіка (Binary Indexed Tree)

**Дерево Фенвіка (BIT, Binary Indexed Tree)** підтримує дві операції над масивом: **додати** значення до елемента і дізнатись **суму на префіксі** — обидві за `O(log n)`, використовуючи лише **один масив** розміром `n + 1` і кілька рядків коду. Це найпростіша структура для змінних префіксних сум. Від [дерева відрізків](segment-tree.md) вона відрізняється компактністю (`O(n)` пам'яті, мала константа) і обмеженістю: підходять лише операції з **оберненою** (сума, XOR), а не мінімум/максимум.

## 1. Ідея: кожна клітинка — сума фрагмента

Індекси нумеруємо з **1**. Клітинка `tree[i]` зберігає суму **фрагмента**, довжина якого дорівнює **найменшому встановленому біту** `i` (`lowbit(i) = i & (−i)`):

`tree[i] = a[i − lowbit(i) + 1] + … + a[i]`.

| `i` | двійково | `lowbit` | фрагмент |
|---|---|---|---|
| 1 | 0001 | 1 | `[1, 1]` |
| 2 | 0010 | 2 | `[1, 2]` |
| 3 | 0011 | 1 | `[3, 3]` |
| 4 | 0100 | 4 | `[1, 4]` |
| 5 | 0101 | 1 | `[5, 5]` |
| 6 | 0110 | 2 | `[5, 6]` |
| 7 | 0111 | 1 | `[7, 7]` |
| 8 | 1000 | 8 | `[1, 8]` |

**Префіксна сума `prefix(i)`:** додаємо `tree[i]`, потім переходимо до `i − lowbit(i)` (відкидаємо наймолодший встановлений біт) і так до `0`. Кількість кроків — кількість встановлених бітів у `i`, тобто не більше `log₂ n`. Для `i = 7 = 111₂`: `tree[7] + tree[6] + tree[4]` = `a[7] + (a[5] + a[6]) + (a[1..4])` — рівно `a[1..7]`.

**Оновлення `add(i, v)`:** додаємо `v` до `tree[i]` і піднімаємось до `i + lowbit(i)` — усіх клітинок, чий фрагмент містить `i`. Теж `O(log n)` кроків.

Дві операції — «дзеркальні»: `i − lowbit(i)` йде вниз по фрагментах, `i + lowbit(i)` — вгору.

**Сума на відрізку:** `range(l, r) = prefix(r) − prefix(l − 1)`.

## 2. Реалізація

```js
class Fenwick {
  constructor(n) {
    this.n = n;
    this.t = new Array(n + 1).fill(0);
  }
  static from(arr) {
    const f = new Fenwick(arr.length);
    for (let i = 1; i <= arr.length; i++) {
      f.t[i] += arr[i - 1];
      const j = i + (i & -i);
      if (j <= arr.length) f.t[j] += f.t[i];
    }
    return f;
  }
  add(i, v) {
    for (; i <= this.n; i += i & -i) this.t[i] += v;
  }
  prefix(i) {
    let s = 0;
    for (; i > 0; i -= i & -i) s += this.t[i];
    return s;
  }
  range(l, r) {
    return this.prefix(r) - this.prefix(l - 1);
  }
  point(i) {
    return this.range(i, i);
  }
  lowerBound(target) {
    let pos = 0;
    let rest = target;
    let step = 1;
    while (step * 2 <= this.n) step *= 2;
    for (; step > 0; step >>= 1) {
      if (pos + step <= this.n && this.t[pos + step] < rest) {
        pos += step;
        rest -= this.t[pos];
      }
    }
    return pos + 1;
  }
}

class RangeUpdateFenwick {
  constructor(n) {
    this.d = new Fenwick(n);
  }
  rangeAdd(l, r, v) {
    this.d.add(l, v);
    if (r + 1 <= this.d.n) this.d.add(r + 1, -v);
  }
  pointValue(i) {
    return this.d.prefix(i);
  }
}

class RangeRangeFenwick {
  constructor(n) {
    this.n = n;
    this.b1 = new Fenwick(n);
    this.b2 = new Fenwick(n);
  }
  rangeAdd(l, r, v) {
    this.b1.add(l, v);
    this.b2.add(l, v * (l - 1));
    if (r + 1 <= this.n) {
      this.b1.add(r + 1, -v);
      this.b2.add(r + 1, -v * r);
    }
  }
  prefixSum(i) {
    return this.b1.prefix(i) * i - this.b2.prefix(i);
  }
  rangeSum(l, r) {
    return this.prefixSum(r) - this.prefixSum(l - 1);
  }
}

class Fenwick2D {
  constructor(R, C) {
    this.R = R;
    this.C = C;
    this.t = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
  }
  add(r, c, v) {
    for (let i = r; i <= this.R; i += i & -i) for (let j = c; j <= this.C; j += j & -j) this.t[i][j] += v;
  }
  prefix(r, c) {
    let s = 0;
    for (let i = r; i > 0; i -= i & -i) for (let j = c; j > 0; j -= j & -j) s += this.t[i][j];
    return s;
  }
  rect(r1, c1, r2, c2) {
    return this.prefix(r2, c2) - this.prefix(r1 - 1, c2) - this.prefix(r2, c1 - 1) + this.prefix(r1 - 1, c1 - 1);
  }
}

function prefixSteps(i) {
  const idx = [];
  for (; i > 0; i -= i & -i) idx.push(i);
  return idx;
}

function updateSteps(i, n) {
  const idx = [];
  for (; i <= n; i += i & -i) idx.push(i);
  return idx;
}

function lowbit(x) {
  return x & -x;
}

function countInversions(arr) {
  const sorted = [...new Set(arr)].sort((a, b) => a - b);
  const rank = new Map(sorted.map((v, i) => [v, i + 1]));
  const f = new Fenwick(sorted.length);
  let inv = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    const r = rank.get(arr[i]);
    inv += f.prefix(r - 1);
    f.add(r, 1);
  }
  return inv;
}

function countSmallerAfter(arr) {
  const sorted = [...new Set(arr)].sort((a, b) => a - b);
  const rank = new Map(sorted.map((v, i) => [v, i + 1]));
  const f = new Fenwick(sorted.length);
  const res = new Array(arr.length);
  for (let i = arr.length - 1; i >= 0; i--) {
    const r = rank.get(arr[i]);
    res[i] = f.prefix(r - 1);
    f.add(r, 1);
  }
  return res;
}

function kthSmallestDynamic(values, k) {
  const max = Math.max(...values);
  const f = new Fenwick(max);
  for (const v of values) f.add(v, 1);
  return f.lowerBound(k);
}

function lisWithFenwick(arr) {
  const sorted = [...new Set(arr)].sort((a, b) => a - b);
  const rank = new Map(sorted.map((v, i) => [v, i + 1]));
  const n = sorted.length;
  const t = new Array(n + 1).fill(0);
  const queryMax = (i) => { let m = 0; for (; i > 0; i -= i & -i) m = Math.max(m, t[i]); return m; };
  const update = (i, v) => { for (; i <= n; i += i & -i) t[i] = Math.max(t[i], v); };
  let best = 0;
  for (const x of arr) {
    const r = rank.get(x);
    const cur = queryMax(r - 1) + 1;
    update(r, cur);
    best = Math.max(best, cur);
  }
  return best;
}

function buildNaive(arr) {
  const f = new Fenwick(arr.length);
  arr.forEach((v, i) => f.add(i + 1, v));
  return f;
}

function rangeSumNaive(arr, l, r) {
  let s = 0;
  for (let i = l - 1; i < r; i++) s += arr[i];
  return s;
}
```

## 3. Побудова за `O(n)`

Наївно: `n` викликів `add` — `O(n log n)`. Лінійна побудова: для кожного `i` додаємо `tree[i]` до батька `i + lowbit(i)` (`Fenwick.from`). `Fenwick.from([1, 2, 3, 4, 5, 6, 7, 8]).t` = `[0, 1, 3, 3, 10, 5, 11, 7, 36]`.

## 4. Приклади

Масив `a = [3, 2, −1, 6, 5, 4, −3, 3, 7, 2, 3]` (індекси 1..11): `prefix(7)` = `16`; `range(3, 6)` = `14` (`−1 + 6 + 5 + 4`). Кроки `prefix(7)`: `[7, 6, 4]`; кроки `add(5, …)` у масиві довжини 11: `[5, 6, 8]`.

## 5. Варіанти

### 5.1. Оновлення відрізка, точковий запит

Зберігаємо **різницевий масив** `d[i] = a[i] − a[i−1]` у дереві Фенвіка. `rangeAdd(l, r, v)` = `d[l] += v`, `d[r+1] −= v` (див. [prefix-sums.md](../techniques/prefix-sums.md)); значення `a[i] = prefix(i)`. `RangeUpdateFenwick`: після `rangeAdd(2, 5, 10)` значення в точці `3` = `10`, у точці `6` — `0`.

### 5.2. Оновлення відрізка, запит суми на відрізку

Два дерева Фенвіка (`B1`, `B2`): `prefixSum(i) = B1.prefix(i)·i − B2.prefix(i)`. `RangeRangeFenwick(8)`: після `rangeAdd(2, 5, 10)` сума `[1, 8]` = `40` (`4 · 10`), сума `[3, 4]` = `20`.

### 5.3. Порядкові статистики: k-й елемент

Дерево над **значеннями** (лічильники): `lowerBound(k)` спускається за двійковими степенями (`binary descent`) за `O(log n)` і знаходить найменшу позицію з префіксною сумою `≥ k` — тобто k-й за величиною елемент: `kthSmallestDynamic([5, 3, 8, 3, 9, 1], 4)` = `5` (відсортовано `1, 3, 3, 5, 8, 9`).

### 5.4. Підрахунок інверсій і менших після себе

`countInversions([3, 1, 2])` = `2`; `countSmallerAfter([5, 2, 6, 1])` = `[2, 1, 1, 0]`. Стискаємо значення до рангів і ідемо справа наліво.

### 5.5. LIS

Максимум на префіксі (замість суми — операція `max`, допустима, бо оновлення **лише збільшують**): `lisWithFenwick([10, 9, 2, 5, 3, 7, 101, 18])` = `4` ([lis.md](../dynamic-programming/lis.md)).

### 5.6. Двовимірне дерево Фенвіка

Вкладені цикли по `i` і `j`: `O(log R · log C)` на операцію. `Fenwick2D(4, 4)`: після `add(2, 2, 5)`, `add(3, 4, 7)` сума `rect(2, 2, 3, 4)` = `12`, а `rect(1, 1, 1, 4)` = `0`.

## 6. Складність

| Операція | Час |
|---|---|
| `add` | `O(log n)` |
| `prefix`, `range` | `O(log n)` |
| Побудова (лінійна) | `O(n)` |
| `lowerBound` (k-й) | `O(log n)` |
| Пам'ять | `O(n)` |

Для `n = 10⁶` один запит — до 20 кроків. Порівняння: префіксні суми — запит `O(1)`, оновлення `O(n)`; дерево відрізків — `O(log n)`, пам'ять `2n–4n`, більш універсальне.

## 7. Типові помилки

1. **Нумерація з 0:** `i & −i` для `0` дає `0` — нескінченний цикл. Індекси лише з 1.
2. **Розмір масиву `n` замість `n + 1`.**
3. **`prefix(l − 1)` при `l = 0`** — від'ємний індекс; використовуйте 1-індексацію.
4. **Max/min у дереві з оновленнями, що можуть зменшувати значення** — не працює; допустимо лише для «монотонних» оновлень.
5. **Не координатно стиснути значення** для великих діапазонів.
6. **Дублікати при підрахунку інверсій:** строгі/нестрогі порівняння (`prefix(r − 1)` для строгих).
7. **Лінійна побудова** — забути умову `j ≤ n`.
8. **Оновлення відрізка** без використання різницевого масиву й другого дерева — хибна сума.
9. **Переповнення** сум у мовах із фіксованою розрядністю.

## 8. Алгоритм (стисло)

1. `tree[1..n]`, `lowbit(i) = i & −i`.
2. `add(i, v)`: `while i ≤ n: tree[i] += v; i += lowbit(i)`.
3. `prefix(i)`: `while i > 0: s += tree[i]; i −= lowbit(i)`.
4. `range(l, r) = prefix(r) − prefix(l − 1)`.
5. Час `O(log n)`, пам'ять `O(n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `lowbit(x)` для `x = 1…8`?

```js
[1, 2, 3, 4, 5, 6, 7, 8].map(lowbit)
```

**2.** Скільки дорівнює `lowbit(12)`, `lowbit(16)`, `lowbit(40)`?

```js
[lowbit(12), lowbit(16), lowbit(40)]
```

**3.** Які кроки `prefixSteps(7)` та `prefixSteps(12)`?

```js
[prefixSteps(7), prefixSteps(12)]
```

**4.** Які кроки `updateSteps(5, 11)` та `updateSteps(1, 16)`?

```js
[updateSteps(5, 11), updateSteps(1, 16)]
```

**5.** Який внутрішній масив `Fenwick.from([1, 2, 3, 4, 5, 6, 7, 8]).t`?

```js
Fenwick.from([1, 2, 3, 4, 5, 6, 7, 8]).t
```

**6.** Чи збігається масив після лінійної побудови `from` та наївної (`buildNaive`)?

```js
JSON.stringify(Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).t) === JSON.stringify(buildNaive([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).t)
```

**7.** Яка префіксна сума `prefix(7)` для масиву `[3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]`?

```js
Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).prefix(7)
```

**8.** Яка сума `range(3, 6)`?

```js
Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).range(3, 6)
```

**9.** Що поверне `prefix(0)` та `range(1, 11)`?

```js
[Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).prefix(0), Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).range(1, 11)]
```

**10.** Яке значення в точці `point(4)`?

```js
Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]).point(4)
```

**11.** Яка сума `range(3, 6)` після `add(4, 10)`?

```js
(() => { const f = Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]); f.add(4, 10); return f.range(3, 6); })()
```

**12.** Як змінюється `point(4)` після `add(4, -6)`?

```js
(() => { const f = Fenwick.from([3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]); f.add(4, -6); return f.point(4); })()
```

**13.** Чи збігаються запити дерева з перебором для всіх пар `l ≤ r` (1-індексація)?

```js
(() => { const a = [3, 2, -1, 6, 5, 4, -3, 3, 7, 2, 3]; const f = Fenwick.from(a); let ok = true; for (let l = 1; l <= a.length; l++) for (let r = l; r <= a.length; r++) if (f.range(l, r) !== rangeSumNaive(a, l, r)) ok = false; return ok; })()
```

### Рівень 2. Робота алгоритму

**14.** Скільки кроків робить `prefix(1023)` (усі біти встановлені) і `prefix(1024)`?

```js
[prefixSteps(1023).length, prefixSteps(1024).length]
```

**15.** Скільки кроків `add(1, …)` у дереві розміру 1000?

```js
updateSteps(1, 1000).length
```

**16.** Що поверне `new Fenwick(5).prefix(5)` для порожнього дерева?

```js
new Fenwick(5).prefix(5)
```

**17.** Яка довжина `t` для `n = 10` і чому більша за `n`?

```js
new Fenwick(10).t.length
```

**18.** Що поверне `lowerBound(4)` для лічильників `[1, 0, 2, 1, 1]` (k-й елемент множини)?

```js
Fenwick.from([1, 0, 2, 1, 1]).lowerBound(4)
```

**19.** Що поверне `kthSmallestDynamic([5, 3, 8, 3, 9, 1], 4)`?

```js
kthSmallestDynamic([5, 3, 8, 3, 9, 1], 4)
```

**20.** А `kthSmallestDynamic([5, 3, 8, 3, 9, 1], 1)` та `(…, 6)`?

```js
[kthSmallestDynamic([5, 3, 8, 3, 9, 1], 1), kthSmallestDynamic([5, 3, 8, 3, 9, 1], 6)]
```

**21.** Які значення після `rangeAdd(2, 5, 10)` у `RangeUpdateFenwick(8)` для точок 1…8?

```js
(() => { const f = new RangeUpdateFenwick(8); f.rangeAdd(2, 5, 10); return [1, 2, 3, 4, 5, 6, 7, 8].map(i => f.pointValue(i)); })()
```

**22.** Які значення після двох перекритих `rangeAdd(1, 4, 1)` та `rangeAdd(3, 6, 2)`?

```js
(() => { const f = new RangeUpdateFenwick(6); f.rangeAdd(1, 4, 1); f.rangeAdd(3, 6, 2); return [1, 2, 3, 4, 5, 6].map(i => f.pointValue(i)); })()
```

**23.** Яка сума `[1, 8]` і `[3, 4]` після `rangeAdd(2, 5, 10)` у `RangeRangeFenwick(8)`?

```js
(() => { const f = new RangeRangeFenwick(8); f.rangeAdd(2, 5, 10); return [f.rangeSum(1, 8), f.rangeSum(3, 4)]; })()
```

**24.** Чи збігається `RangeRangeFenwick` з перебором на 60 випадкових операціях?

```js
(() => { const n = 10; const f = new RangeRangeFenwick(n); const ref = new Array(n + 1).fill(0); let ok = true; for (let k = 1; k <= 60; k++) { const l = 1 + (k * 7) % n, r = Math.min(n, l + (k * 3) % 5); if (k % 2) { const v = (k % 5) - 2; f.rangeAdd(l, r, v); for (let i = l; i <= r; i++) ref[i] += v; } else { let s = 0; for (let i = l; i <= r; i++) s += ref[i]; if (f.rangeSum(l, r) !== s) ok = false; } } return ok; })()
```

**25.** Скільки інверсій у `[3, 1, 2]`, `[1, 2, 3]`, `[3, 2, 1]`?

```js
[[3, 1, 2], [1, 2, 3], [3, 2, 1]].map(countInversions)
```

**26.** Що поверне `countSmallerAfter([5, 2, 6, 1])`?

```js
countSmallerAfter([5, 2, 6, 1])
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `countInversions` для масиву з дублікатами `[2, 2, 1, 1]`?

```js
countInversions([2, 2, 1, 1])
```

**28.** Скільки інверсій у зворотному масиві з 100 елементів (`n(n−1)/2`)?

```js
[countInversions(Array.from({ length: 100 }, (_, i) => 100 - i)), 100 * 99 / 2]
```

**29.** Яка довжина LIS `lisWithFenwick([10, 9, 2, 5, 3, 7, 101, 18])`?

```js
lisWithFenwick([10, 9, 2, 5, 3, 7, 101, 18])
```

**30.** Яка сума `rect(2, 2, 3, 4)` та `rect(1, 1, 1, 4)` у `Fenwick2D(4, 4)` після `add(2, 2, 5)`, `add(3, 4, 7)`?

```js
(() => { const f = new Fenwick2D(4, 4); f.add(2, 2, 5); f.add(3, 4, 7); return [f.rect(2, 2, 3, 4), f.rect(1, 1, 1, 4)]; })()
```

**31.** Яка сума всієї сітки 4×4 після цих двох додавань?

```js
(() => { const f = new Fenwick2D(4, 4); f.add(2, 2, 5); f.add(3, 4, 7); return f.rect(1, 1, 4, 4); })()
```

**32.** Скільки кроків (максимум) для одного запиту в дереві з `n = 10⁶`?

```js
Math.floor(Math.log2(1e6)) + 1
```

**33.** Напишіть `rangeSumQueryMutable(arr, ops)` на BIT: `['u', i, v]` — встановити `arr[i] = v` (0-індексація), `['q', l, r]` — сума `[l, r]`.

**34.** Напишіть `countRangeSumInversions(arr)` — кількість пар `(i < j)`, де `arr[i] > arr[j]`, поверніть для двох масивів.

**35.** Напишіть `prefixXorFenwick(arr)` — дерево Фенвіка з XOR (додавання замінюється XOR) і функція `rangeXor(l, r)` (1-індексація).

**36.** Напишіть `rankOfElement(values, x)` — кількість значень, менших за `x` (через префіксну суму лічильників).

**37.** Напишіть `medianSlidingWindow(a, k)` — медіани ковзного вікна довжини `k` (непарного) через BIT за значеннями (значення додатні й невеликі).

**38.** Напишіть `fenwickFromCounts(counts)` і `totalCount(f)` — загальну кількість елементів (префікс по всьому дереву).

**39.** Напишіть `rangeMinFenwick(arr)` — BIT для мінімуму на префіксі (лише оновлення-зменшення): повертає `{ update(i, v), prefixMin(i) }` (1-індексація).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `largestPowerOfTwoAtMost(n)` — найбільший степінь двійки `≤ n` (початковий крок спуску `lowerBound`).

**41.** Яка основна ідея дерева Фенвіка?

**42.** Що таке `lowbit` і навіщо він?

**43.** Чому нумерація в дереві Фенвіка починається з 1?

**44.** Як за допомогою дерева Фенвіка оновлювати відрізок?

**45.** Чому дерево Фенвіка не підходить для мінімуму з довільними оновленнями?

**46.** Як знайти k-й елемент множини через дерево Фенвіка?

**47.** У чому перевага лінійної побудови?

**48.** Як дерево Фенвіка рахує інверсії?

**49.** Коли віддати перевагу дереву відрізків?

**50.** Як узагальнити дерево Фенвіка на два виміри?

### Відповіді

1. `[1, 2, 1, 4, 1, 2, 1, 8]`
2. `[4, 16, 8]`
3. `[[7, 6, 4], [12, 8]]`
4. `[[5, 6, 8], [1, 2, 4, 8, 16]]`
5. `[0, 1, 3, 3, 10, 5, 11, 7, 36]`
6. `true`
7. `16`
8. `14`
9. `[0, 31]`
10. `6`
11. `24`
12. `0`
13. `true`
14. `[10, 1]`
15. `10`
16. `0`
17. `11`
18. `4`
19. `5`
20. `[1, 9]`
21. `[0, 10, 10, 10, 10, 0, 0, 0]`
22. `[1, 1, 3, 3, 2, 2]`
23. `[40, 20]`
24. `true`
25. `[2, 0, 3]`
26. `[2, 1, 1, 0]`
27. `4`
28. `[4950, 4950]`
29. `4`
30. `[12, 0]`
31. `12`
32. `20`
33. Приклад розв'язку:

   ```js
   function rangeSumQueryMutableBit(arr, ops) {
     const f = Fenwick.from(arr);
     const cur = arr.slice();
     const out = [];
     for (const [t, a, b] of ops) {
       if (t === 'u') {
         f.add(a + 1, b - cur[a]);
         cur[a] = b;
       } else out.push(f.range(a + 1, b + 1));
     }
     return out;
   }
   ```

   Виклик `rangeSumQueryMutableBit([1, 3, 5], [['q', 0, 2], ['u', 1, 2], ['q', 0, 2], ['q', 1, 1]])` → `[9, 8, 2]`

34. Приклад розв'язку:

   ```js
   const countRangeSumInversions = (a) => countInversions(a)
   ```

   Виклик `[countRangeSumInversions([2, 4, 1, 3, 5]), countRangeSumInversions([1, 1, 1])]` → `[3, 0]`

35. Приклад розв'язку:

   ```js
   function prefixXorFenwick(arr) {
     const n = arr.length, t = new Array(n + 1).fill(0);
     const upd = (i, v) => {
       for (; i <= n; i += i & -i) t[i] ^= v;
     };
     const pref = (i) => {
       let s = 0;
       for (; i > 0; i -= i & -i) s ^= t[i];
       return s;
     };
     arr.forEach((v, i) => upd(i + 1, v));
     return (l, r) => pref(r) ^ pref(l - 1);
   }
   ```

   Виклик `(() => { const q = prefixXorFenwick([1, 2, 3, 4, 5]); return [q(1, 5), q(2, 4), q(3, 3)]; })()` → `[1, 5, 3]`

36. Приклад розв'язку:

   ```js
   function rankOfElement(values, x) {
     const max = Math.max(...values, x);
     const f = new Fenwick(max);
     for (const v of values) f.add(v, 1);
     return f.prefix(x - 1);
   }
   ```

   Виклик `[rankOfElement([5, 3, 8, 3, 9, 1], 5), rankOfElement([5, 3, 8, 3, 9, 1], 1), rankOfElement([5, 3, 8, 3, 9, 1], 10)]` → `[3, 0, 6]`

37. Приклад розв'язку:

   ```js
   function medianSlidingWindow(a, k) {
     const max = Math.max(...a);
     const f = new Fenwick(max);
     const res = [];
     for (let i = 0; i < a.length; i++) {
       f.add(a[i], 1);
       if (i >= k) f.add(a[i - k], -1);
       if (i >= k - 1) res.push(f.lowerBound((k + 1) >> 1));
     }
     return res;
   }
   ```

   Виклик `medianSlidingWindow([1, 3, 2, 6, 4, 8, 5], 3)` → `[2, 3, 4, 6, 5]`

38. Приклад розв'язку:

   ```js
   const totalCount = (f) => f.prefix(f.n)
   ```

   Виклик `[totalCount(Fenwick.from([1, 0, 2, 1, 1])), totalCount(new Fenwick(3))]` → `[5, 0]`

39. Приклад розв'язку:

   ```js
   function rangeMinFenwick(arr) {
     const n = arr.length, t = new Array(n + 1).fill(Infinity);
     const update = (i, v) => {
       for (; i <= n; i += i & -i) t[i] = Math.min(t[i], v);
     };
     const prefixMin = (i) => {
       let m = Infinity;
       for (; i > 0; i -= i & -i) m = Math.min(m, t[i]);
       return m;
     };
     arr.forEach((v, i) => update(i + 1, v));
     return { update, prefixMin };
   }
   ```

   Виклик `(() => { const f = rangeMinFenwick([5, 3, 8, 1, 9]); const a = [f.prefixMin(3), f.prefixMin(5)]; f.update(2, 0); return [...a, f.prefixMin(3)]; })()` → `[3, 1, 0]`

40. Приклад розв'язку:

   ```js
   function largestPowerOfTwoAtMost(n) {
     let s = 1;
     while (s * 2 <= n) s *= 2;
     return s;
   }
   ```

   Виклик `[largestPowerOfTwoAtMost(11), largestPowerOfTwoAtMost(16), largestPowerOfTwoAtMost(1)]` → `[8, 16, 1]`

41. Кожна клітинка `tree[i]` зберігає суму фрагмента довжиною `lowbit(i)`, що закінчується в `i`. Префіксна сума збирається за `O(log n)` кроків (відкидання молодшого біта), а оновлення — за `O(log n)` кроків додаванням `lowbit`.
42. `lowbit(i) = i & (−i)` — найменший встановлений біт числа. Він визначає довжину фрагмента, який зберігає клітинка `i`, і крок переходу при запиті (`i −= lowbit`) та оновленні (`i += lowbit`).
43. Для `i = 0` значення `lowbit(0) = 0`, і цикли `i −= lowbit` та `i += lowbit` ніколи не просуваються. Крім того, нульовий індекс природно відповідає порожньому префіксу.
44. Зберігати різницевий масив: `rangeAdd(l, r, v)` — це `add(l, v)` та `add(r + 1, −v)`; значення елемента — префіксна сума різниць. Для суми на відрізку після оновлень потрібні два дерева.
45. Операція `min` не має оберненої, а фрагменти перекриваються: після збільшення значення неможливо «відняти» його внесок. Для задач із лише зменшенням значень (монотонні оновлення) префіксний `min` можливий.
46. Побудувати дерево лічильників за значеннями й виконати двійковий спуск: піднімаючи крок до найбільшої степені двійки, додавати `tree[pos + step]`, якщо вона менша за залишок `k`. Результат — найменша позиція з префіксом `≥ k`, `O(log n)`.
47. Замість `n` викликів `add` по `O(log n)` кожен, достатньо для кожного `i` додати `tree[i]` до `tree[i + lowbit(i)]`: загальний час `O(n)`.
48. Значення стискають до рангів, проходять масив справа наліво: для кожного елемента запитують кількість уже доданих менших значень (`prefix(rank − 1)`) і додають одиницю в позицію рангу. Сума запитів — кількість інверсій, `O(n log n)`.
49. Коли потрібні мінімум, максимум, НСД, складні агрегати, оновлення відрізків із довільною операцією (lazy) або запити, що не зводяться до префіксних із оберненою операцією.
50. Вкладені цикли по обох індексах: `add` та `prefix` проходять по `i` і по `j` за `lowbit`; складність `O(log R · log C)`. Сума прямокутника — формула включень-виключень із чотирьох префіксів.
