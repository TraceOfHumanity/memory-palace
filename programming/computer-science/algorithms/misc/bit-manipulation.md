# Bit Manipulation — алгоритми з бітовими операціями

Бітові операції працюють безпосередньо з двійковим записом чисел і виконуються за **одну команду процесора**. На них будуються компактні множини (бітові маски), швидкий підрахунок, XOR-хитрощі для пошуку «самотнього» елемента, перебір підмножин, коди Грея, хеші, шифри, стиснення. Основи синтаксису й особливостей JavaScript описано в [bitwise-operations.md](../../../js/common/bitwise-operations.md); тут — **алгоритмічні прийоми**, які варто знати для інтерв'ю.

## 1. Нагадування: операції та їхні властивості

| Операція | Запис | Дія |
|---|---|---|
| AND | `a & b` | `1`, якщо обидва біти `1` |
| OR | `a \| b` | `1`, якщо хоч один `1` |
| XOR | `a ^ b` | `1`, якщо біти різні |
| NOT | `~a` | інверсія всіх бітів |
| Зсув вліво | `a << k` | множення на `2^k` |
| Зсув вправо | `a >> k` | знаковий, ділення на `2^k` (округлення вниз) |
| Беззнаковий зсув | `a >>> k` | заповнює нулями |

**Властивості XOR** (центральні для прийомів): `a ^ a = 0`, `a ^ 0 = a`, комутативність і асоціативність. Тому XOR набору чисел, у якому кожне число зустрічається двічі, крім одного, дорівнює цьому одному.

**Важливо для JavaScript:** бітові оператори перетворюють числа в **32-бітові знакові цілі**. `1 << 31` = `-2147483648` (від'ємне), `2 ** 32 | 0` = `0`, `~5` = `-6` (`−6`), `-1 >>> 0` = `4294967295`. Для 64-бітових значень використовують `BigInt` (`1n << 40n`).

## 2. Базові прийоми з бітом `i`

- **Перевірити:** `(x >> i) & 1` або `x & (1 << i)`.
- **Встановити:** `x | (1 << i)`.
- **Скинути:** `x & ~(1 << i)`.
- **Інвертувати:** `x ^ (1 << i)`.
- **Наймолодший встановлений біт:** `x & -x` (`lowbit`, основа [дерева Фенвіка](../trees/fenwick-tree.md)).
- **Скинути наймолодший встановлений біт:** `x & (x − 1)`.
- **Маска з `k` одиниць:** `(1 << k) − 1`.
- **Перевірка степеня двійки:** `x > 0 && (x & (x − 1)) === 0`.

`getBit(10, 1)` = `1` (`1010₂`), `setBit(10, 0)` = `11`, `clearBit(10, 3)` = `2`, `toggleBit(10, 2)` = `14`, `lowbit(12)` = `4`, `x & (x − 1)` для `12` = `8`.

## 3. Підрахунок одиниць (popcount)

- **Наївно:** перевіряти кожен біт — `O(кількість бітів)`.
- **Алгоритм Кернігана:** `while (x) { x &= x − 1; count++; }` — рівно стільки ітерацій, скільки одиниць: `popcount(255)` = `8` за 8 кроків, `popcount(1024)` — `1` за 1.
- **Таблиця/паралельний підрахунок (SWAR):** додавання сусідніх груп бітів за константну кількість операцій.
- **Динамічне програмування:** `bits[i] = bits[i >> 1] + (i & 1)`: `countBitsUpTo(8)` = `[0, 1, 1, 2, 1, 2, 2, 3, 1]`.

**Відстань Хемінга** між числами — `popcount(a ^ b)`: `hammingDistance(1, 4)` = `2`.

## 4. Хитрощі з XOR

- **Єдине число, що не дублюється:** `singleNumber([4, 1, 2, 1, 2])` = `4` — XOR усього масиву, `O(n)`, `O(1)` пам'яті.
- **Два числа, що не дублюються:** `singleNumberTwo([1, 2, 1, 3, 2, 5])` = `[3, 5]`: XOR усіх дає `a ^ b`; будь-який встановлений біт розділяє числа на дві групи, XOR кожної групи — відповідь.
- **Відсутнє число в `0..n`:** `missingNumber([3, 0, 1])` = `2` — XOR індексів і значень.
- **Обмін без тимчасової змінної:** `a ^= b; b ^= a; a ^= b` (демонстраційно; на практиці гірше за деструктуризацію).
- **Рівність знаків без гілок:** `(a ^ b) < 0` — знаки різні: `isOppositeSigns(3, -4)` = `true`.
- **Шифр XOR:** `x ^ key ^ key = x`.

## 5. Підмножини через маски

Множину з `n ≤ 31` елементів представляють цілим `mask`: біт `i` встановлений — елемент `i` у множині. Усі підмножини — числа `0 … 2ⁿ − 1`. Тоді:

- **Об'єднання** — `a | b`, **перетин** — `a & b`, **різниця** — `a & ~b`, **належність** — `mask & (1 << i)`.
- **Перебір підмножин:** `for (mask = 0; mask < 1 << n; mask++)`; `subsets([1, 2, 3])` = `[[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]`.
- **Перебір підмасок маски `m`:** `for (s = m; s > 0; s = (s − 1) & m)` — усього `2^{popcount(m)}`: `submasks(0b1011)` = `[11, 10, 9, 8, 3, 2, 1, 0]`.
- **Бітмаск-ДП** (задачі на множинах ≤ 20 елементів): комівояжер, призначення, покриття: стан — маска відвіданих.

## 6. Інші алгоритми

- **Код Грея:** `i ^ (i >> 1)` — сусідні числа відрізняються одним бітом: `grayCode(3)` = `[0, 1, 3, 2, 6, 7, 5, 4]`.
- **Реверс бітів:** `reverseBits(0b1011, 4)` = `13`.
- **Наступне число з тим самим числом одиниць** (Gosper's hack): `nextSamePopcount(12)` = `17` (`1100 → 10001`).
- **Степінь двійки навколо:** `nextPowerOfTwo(37)` = `64`.
- **Старший встановлений біт (floor log2):** `highestBit(37)` = `5`.
- **Швидке множення/ділення на степені двійки:** `x << k`, `x >> k`.
- **Бітові множини як компактний `Set`:** `n` елементів — `n/32` слів; операції над множинами — за `O(n/32)`; Bloom-фільтри, бітові індекси.
- **Парність:** `parity(x)` = `popcount(x) & 1`.
- **Максимальний XOR пари** ([trie.md](../strings/trie.md)).

## 7. Реалізація

```js
function getBit(x, i) {
  return (x >> i) & 1;
}

function setBit(x, i) {
  return x | (1 << i);
}

function clearBit(x, i) {
  return x & ~(1 << i);
}

function toggleBit(x, i) {
  return x ^ (1 << i);
}

function lowbit(x) {
  return x & -x;
}

function clearLowest(x) {
  return x & (x - 1);
}

function popcount(x) {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

function popcountSteps(x) {
  let c = 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

function popcountNaive(x) {
  let c = 0;
  for (let i = 0; i < 32; i++) c += (x >>> i) & 1;
  return c;
}

function countBitsUpTo(n) {
  const bits = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) bits[i] = bits[i >> 1] + (i & 1);
  return bits;
}

function hammingDistance(a, b) {
  return popcount(a ^ b);
}

function isPowerOfTwo(x) {
  return x > 0 && (x & (x - 1)) === 0;
}

function singleNumber(a) {
  return a.reduce((x, y) => x ^ y, 0);
}

function singleNumberTwo(a) {
  const x = a.reduce((p, q) => p ^ q, 0);
  const low = x & -x;
  let p = 0;
  let q = 0;
  for (const v of a) {
    if (v & low) p ^= v;
    else q ^= v;
  }
  return [p, q].sort((m, n) => m - n);
}

function missingNumber(a) {
  let x = a.length;
  a.forEach((v, i) => { x ^= i ^ v; });
  return x;
}

function subsetsByMask(a) {
  const res = [];
  for (let mask = 0; mask < 1 << a.length; mask++) {
    const s = [];
    for (let i = 0; i < a.length; i++) if (mask & (1 << i)) s.push(a[i]);
    res.push(s);
  }
  return res;
}

function submasks(m) {
  const res = [];
  for (let s = m; s > 0; s = (s - 1) & m) res.push(s);
  res.push(0);
  return res;
}

function grayCode(n) {
  return Array.from({ length: 1 << n }, (_, i) => i ^ (i >> 1));
}

function reverseBits(x, width) {
  let r = 0;
  for (let i = 0; i < width; i++) {
    r = (r << 1) | (x & 1);
    x >>= 1;
  }
  return r;
}

function nextSamePopcount(x) {
  const c = x & -x;
  const r = x + c;
  return (((r ^ x) >> 2) / c) | r;
}

function nextPowerOfTwo(x) {
  if (x <= 1) return 1;
  let p = 1;
  while (p < x) p <<= 1;
  return p;
}

function highestBit(x) {
  return 31 - Math.clz32(x);
}

function parity(x) {
  return popcount(x) & 1;
}

function toBinary(x, width = 8) {
  return (x >>> 0).toString(2).padStart(width, '0');
}

function swapXor(a, b) {
  a ^= b;
  b ^= a;
  a ^= b;
  return [a, b];
}

function isOppositeSigns(a, b) {
  return (a ^ b) < 0;
}

function bitwiseAndRange(m, n) {
  let shift = 0;
  while (m !== n) {
    m >>= 1;
    n >>= 1;
    shift++;
  }
  return m << shift;
}

function maxProductOfWordLengths(words) {
  const masks = words.map((w) => [...w].reduce((m, c) => m | (1 << (c.charCodeAt(0) - 97)), 0));
  let best = 0;
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) {
    if ((masks[i] & masks[j]) === 0) best = Math.max(best, words[i].length * words[j].length);
  }
  return best;
}

function tspBitmask(dist) {
  const n = dist.length;
  const INF = Infinity;
  const dp = Array.from({ length: 1 << n }, () => new Array(n).fill(INF));
  dp[1][0] = 0;
  for (let mask = 1; mask < 1 << n; mask++) {
    for (let last = 0; last < n; last++) {
      if (!(mask & (1 << last)) || dp[mask][last] === INF) continue;
      for (let nxt = 0; nxt < n; nxt++) {
        if (mask & (1 << nxt)) continue;
        const nm = mask | (1 << nxt);
        dp[nm][nxt] = Math.min(dp[nm][nxt], dp[mask][last] + dist[last][nxt]);
      }
    }
  }
  let best = INF;
  for (let last = 1; last < n; last++) best = Math.min(best, dp[(1 << n) - 1][last] + dist[last][0]);
  return n === 1 ? 0 : best;
}

function bitsetUnion(a, b) {
  return a.map((x, i) => x | b[i]);
}

function bigPopcount(x) {
  let c = 0;
  while (x > 0n) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

function xorFrom0To(n) {
  switch (n % 4) {
    case 0: return n;
    case 1: return 1;
    case 2: return n + 1;
    default: return 0;
  }
}
```

## 8. Складність

Усі базові операції — `O(1)` (одна інструкція для 32/64-бітових слів). Перебір підмножин — `O(2ⁿ · n)`; підмаски всіх масок — `O(3ⁿ)`; popcount Кернігана — `O(кількість одиниць)`.

## 9. Бітмаск-ДП на прикладі комівояжера

Для `n ≤ 20`: `dp[mask][last]` — мінімальна довжина шляху, що відвідав множину `mask` і закінчився в `last`. Перехід: додати непрочитане місто. `O(2ⁿ · n²)` — експонента, але набагато краща за `n!`. `tspBitmask([[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]])` = `80` (класичний приклад).

## 10. Типові помилки

1. **32-бітове обмеження в JS:** `1 << 32` = `1`; для більших — `BigInt`.
2. **Знаковий зсув `>>` для від'ємних** (арифметичний); для беззнакового — `>>>`.
3. **Пріоритет операторів:** `x & 1 === 0` означає `x & (1 === 0)`; ставте дужки.
4. **`~x` ≠ `−x`:** `~x = −x − 1`.
5. **Переповнення `1 << i` при `i ≥ 31`.**
6. **XOR-обмін** з однією змінною `a ^= a` обнуляє.
7. **Підмаски `(s − 1) & m`** — нульова підмаска обробляється окремо.
8. **Порівняння `(x & m) === m` vs `(x & m) !== 0`** — «всі біти» чи «хоч один».
9. **Бітові операції на дробових числах** — відкидають дробову частину.

## 11. Алгоритм-шаблон

1. Представити множину/стан цілим числом.
2. Операції над множинами — `& | ^ ~`.
3. Для підрахунку — `x &= x − 1`; для найменшого біта — `x & −x`.
4. Для 64 біт — `BigInt`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чому дорівнюють `getBit(10, 1)`, `getBit(10, 0)`, `getBit(10, 3)` (`10 = 1010₂`)?

```js
[getBit(10, 1), getBit(10, 0), getBit(10, 3)]
```

**2.** Що поверне `setBit(10, 0)`, `clearBit(10, 3)`, `toggleBit(10, 2)`?

```js
[setBit(10, 0), clearBit(10, 3), toggleBit(10, 2)]
```

**3.** Що поверне `lowbit(12)`, `lowbit(7)`, `lowbit(0)`?

```js
[lowbit(12), lowbit(7), lowbit(0)]
```

**4.** Що поверне `clearLowest(12)`, `clearLowest(8)`, `clearLowest(0)`?

```js
[clearLowest(12), clearLowest(8), clearLowest(0)]
```

**5.** Що поверне `popcount(255)`, `popcount(1024)`, `popcount(0)`, `popcount(2 ** 31 - 1)`?

```js
[popcount(255), popcount(1024), popcount(0), popcount(2 ** 31 - 1)]
```

**6.** Скільки кроків робить Керніган для `255` і `1024`?

```js
[popcountSteps(255), popcountSteps(1024)]
```

**7.** Що поверне `countBitsUpTo(8)`?

```js
countBitsUpTo(8)
```

**8.** Яка відстань Хемінга `hammingDistance(1, 4)`, `(3, 3)`, `(0, 255)`?

```js
[hammingDistance(1, 4), hammingDistance(3, 3), hammingDistance(0, 255)]
```

**9.** Які числа є степенями двійки: `0, 1, 2, 3, 64, 96, -8`?

```js
[0, 1, 2, 3, 64, 96, -8].map(isPowerOfTwo)
```

**10.** Що поверне `singleNumber([4, 1, 2, 1, 2])` та `singleNumber([7])`?

```js
[singleNumber([4, 1, 2, 1, 2]), singleNumber([7])]
```

**11.** Що поверне `singleNumberTwo([1, 2, 1, 3, 2, 5])`?

```js
singleNumberTwo([1, 2, 1, 3, 2, 5])
```

**12.** Що поверне `missingNumber([3, 0, 1])`, `([0, 1])`, `([9, 6, 4, 2, 3, 5, 7, 0, 1])`?

```js
[missingNumber([3, 0, 1]), missingNumber([0, 1]), missingNumber([9, 6, 4, 2, 3, 5, 7, 0, 1])]
```

**13.** Які підмножини `subsetsByMask([1, 2, 3])`?

```js
subsetsByMask([1, 2, 3])
```

### Рівень 2. Робота алгоритму

**14.** Які підмаски `submasks(0b1011)`?

```js
submasks(0b1011)
```

**15.** Що поверне `grayCode(3)`?

```js
grayCode(3)
```

**16.** Чи відрізняються сусідні коди Грея `grayCode(4)` рівно одним бітом (включно з останнім і першим)?

```js
(() => { const g = grayCode(4); return g.every((x, i) => popcount(x ^ g[(i + 1) % g.length]) === 1); })()
```

**17.** Що поверне `reverseBits(0b1011, 4)`, `reverseBits(1, 8)`, `reverseBits(0, 8)`?

```js
[reverseBits(0b1011, 4), reverseBits(1, 8), reverseBits(0, 8)]
```

**18.** Що поверне `nextSamePopcount(12)`, `(6)`, `(1)`?

```js
[nextSamePopcount(12), nextSamePopcount(6), nextSamePopcount(1)]
```

**19.** Чи зберігає `nextSamePopcount` кількість одиниць для `x = 1…200`?

```js
Array.from({ length: 200 }, (_, i) => i + 1).every(x => popcount(nextSamePopcount(x)) === popcount(x) && nextSamePopcount(x) > x)
```

**20.** Що поверне `nextPowerOfTwo(37)`, `(64)`, `(1)`, `(0)`?

```js
[nextPowerOfTwo(37), nextPowerOfTwo(64), nextPowerOfTwo(1), nextPowerOfTwo(0)]
```

**21.** Що поверне `highestBit(37)`, `highestBit(1)`, `highestBit(1024)`?

```js
[highestBit(37), highestBit(1), highestBit(1024)]
```

**22.** Яка парність чисел `7`, `6`, `0` (`parity`)?

```js
[parity(7), parity(6), parity(0)]
```

**23.** Що поверне `swapXor(3, 5)` та `swapXor(7, 7)`?

```js
[swapXor(3, 5), swapXor(7, 7)]
```

**24.** Чи мають `3` і `-4` різні знаки (`isOppositeSigns`)? А `3` і `4`?

```js
[isOppositeSigns(3, -4), isOppositeSigns(3, 4)]
```

**25.** Що поверне `bitwiseAndRange(5, 7)`, `(0, 0)`, `(1, 2147483647)`?

```js
[bitwiseAndRange(5, 7), bitwiseAndRange(0, 0), bitwiseAndRange(1, 2147483647)]
```

**26.** Що поверне `maxProductOfWordLengths(['abcw', 'baz', 'foo', 'bar', 'xtfn', 'abcdef'])`?

```js
maxProductOfWordLengths(['abcw', 'baz', 'foo', 'bar', 'xtfn', 'abcdef'])
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `tspBitmask` для класичної матриці 4×4?

```js
tspBitmask([[0, 10, 15, 20], [10, 0, 35, 25], [15, 35, 0, 30], [20, 25, 30, 0]])
```

**28.** Що поверне `xorFrom0To(n)` для `n = 0…8` і чи збігається з прямим XOR?

```js
Array.from({ length: 9 }, (_, n) => [xorFrom0To(n), Array.from({ length: n + 1 }, (_, i) => i).reduce((a, b) => a ^ b, 0)])
```

**29.** Що станеться з `1 << 31`, `1 << 32`, `2 ** 32 | 0`, `~5`, `-1 >>> 0`?

```js
[1 << 31, 1 << 32, 2 ** 32 | 0, ~5, -1 >>> 0]
```

**30.** Що поверне `bigPopcount(2n ** 100n - 1n)` та `bigPopcount(1n << 70n)`?

```js
[bigPopcount(2n ** 100n - 1n), bigPopcount(1n << 70n)]
```

**31.** Пріоритет операторів: що поверне `5 & 1 === 0` та `(5 & 1) === 0`?

```js
[5 & 1 === 0, (5 & 1) === 0]
```

**32.** Напишіть `countSetBitsRange(n)` — загальну кількість одиничних бітів у числах `0…n`.

**33.** Напишіть `isSubsetMask(a, b)` — чи є множина `a` підмножиною `b` (як маски).

**34.** Напишіть `flipBits(a, b)` — скільки бітів треба змінити, щоб перетворити `a` на `b`.

**35.** Напишіть `kthBitFromRight(x, k)` — k-й біт справа (з 1) як `0/1`.

**36.** Напишіть `swapOddEvenBits(x)` — поміняти місцями сусідні біти (0↔1, 2↔3…) для 8-бітового числа.

**37.** Напишіть `subsetsWithSum(a, target)` — кількість підмножин із сумою `target` перебором масок.

**38.** Напишіть `rangeXor(l, r)` — XOR усіх чисел від `l` до `r` (через `xorFrom0To`).

**39.** Напишіть `binaryGapMax(n)` — найдовша послідовність нулів між одиницями у двійковому записі.

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `minFlipsToOr(a, b, c)` — мінімум перевертань бітів у `a` і `b`, щоб `a | b === c`.

**41.** Чому XOR розв'язує задачу про єдине непарне число?

**42.** Що робить `x & (x − 1)`?

**43.** Чому `x & -x` дає наймолодший встановлений біт?

**44.** Як перебрати всі підмножини множини з `n` елементів?

**45.** Для чого використовують код Грея?

**46.** Які особливості бітових операцій у JavaScript?

**47.** Як підрахувати кількість одиниць швидше за перебір усіх бітів?

**48.** Як працює бітмаск-ДП?

**49.** Чому пріоритет оператора `&` нижчий за `===` і чим це загрожує?

**50.** Як знайти два числа, що зустрічаються по одному разу, серед пар?

### Відповіді

1. `[1, 0, 1]`
2. `[11, 2, 14]`
3. `[4, 1, 0]`
4. `[8, 0, 0]`
5. `[8, 1, 0, 31]`
6. `[8, 1]`
7. `[0, 1, 1, 2, 1, 2, 2, 3, 1]`
8. `[2, 0, 8]`
9. `[false, true, true, false, true, false, false]`
10. `[4, 7]`
11. `[3, 5]`
12. `[2, 2, 8]`
13. `[[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]`
14. `[11, 10, 9, 8, 3, 2, 1, 0]`
15. `[0, 1, 3, 2, 6, 7, 5, 4]`
16. `true`
17. `[13, 128, 0]`
18. `[17, 9, 2]`
19. `true`
20. `[64, 64, 1, 1]`
21. `[5, 0, 10]`
22. `[1, 0, 0]`
23. `[[5, 3], [7, 7]]`
24. `[true, false]`
25. `[4, 0, 0]`
26. `16`
27. `80`
28. `[[0, 0], [1, 1], [3, 3], [0, 0], [4, 4], [1, 1], [7, 7], [0, 0], [8, 8]]`
29. `[-2147483648, 1, 0, -6, 4294967295]`
30. `[100, 1]`
31. `[0, false]`
32. Приклад розв'язку:

   ```js
   const countSetBitsRange = (n) => countBitsUpTo(n).reduce((a, b) => a + b, 0)
   ```

   Виклик `[countSetBitsRange(7), countSetBitsRange(0), countSetBitsRange(15)]` → `[12, 0, 32]`

33. Приклад розв'язку:

   ```js
   const isSubsetMask = (a, b) => (a & b) === a
   ```

   Виклик `[isSubsetMask(0b0101, 0b1101), isSubsetMask(0b0110, 0b0101), isSubsetMask(0, 5)]` → `[true, false, true]`

34. Приклад розв'язку:

   ```js
   const flipBits = (a, b) => popcount(a ^ b)
   ```

   Виклик `[flipBits(10, 7), flipBits(3, 4), flipBits(5, 5)]` → `[3, 3, 0]`

35. Приклад розв'язку:

   ```js
   const kthBitFromRight = (x, k) => (x >> (k - 1)) & 1
   ```

   Виклик `[kthBitFromRight(10, 1), kthBitFromRight(10, 2), kthBitFromRight(10, 4)]` → `[0, 1, 1]`

36. Приклад розв'язку:

   ```js
   const swapOddEvenBits = (x) => ((x & 0xAA) >> 1) | ((x & 0x55) << 1)
   ```

   Виклик `[swapOddEvenBits(0b10110010), swapOddEvenBits(0b00000001), swapOddEvenBits(0)]` → `[113, 2, 0]`

37. Приклад розв'язку:

   ```js
   function subsetsWithSum(a, t) {
     let c = 0;
     for (let mask = 0; mask < 1 << a.length; mask++) {
       let s = 0;
       for (let i = 0; i < a.length; i++) if (mask & (1 << i)) s += a[i];
       if (s === t) c++;
     }
     return c;
   }
   ```

   Виклик `[subsetsWithSum([1, 2, 3, 4], 5), subsetsWithSum([1, 1, 1], 2)]` → `[2, 3]`

38. Приклад розв'язку:

   ```js
   const rangeXor = (l, r) => xorFrom0To(r) ^ xorFrom0To(l - 1)
   ```

   Виклик `[rangeXor(3, 9), rangeXor(1, 1), rangeXor(0, 5)]` → `[2, 1, 1]`

39. Приклад розв'язку:

   ```js
   function binaryGapMax(n) {
     const s = n.toString(2).replace(/^0+|0+$/g, '');
     return Math.max(0, ...s.split('1').slice(1, -1).map(z => z.length));
   }
   ```

   Виклик `[binaryGapMax(9), binaryGapMax(529), binaryGapMax(20), binaryGapMax(15)]` → `[2, 4, 1, 0]`

40. Приклад розв'язку:

   ```js
   function minFlipsToOr(a, b, c) {
     let f = 0;
     for (let i = 0; i < 31; i++) {
       const x = (a >> i) & 1, y = (b >> i) & 1, z = (c >> i) & 1;
       if (z === 1) {
         if (x === 0 && y === 0) f++;
       } else f += x + y;
     }
     return f;
   }
   ```

   Виклик `[minFlipsToOr(2, 6, 5), minFlipsToOr(4, 2, 7), minFlipsToOr(1, 2, 3)]` → `[3, 1, 0]`

41. `a ^ a = 0` і `a ^ 0 = a`, а XOR комутативний та асоціативний: усі парні входження взаємно знищуються, і лишається число, що зустрічається один раз.
42. Скидає наймолодший встановлений біт: віднімання одиниці інвертує біти від найменшої одиниці вниз, тож AND знуляє саме цей біт. Це основа алгоритму Кернігана і перевірки степеня двійки.
43. `-x = ~x + 1` у доповнювальному коді: інверсія й додавання одиниці залишає без змін наймолодшу одиницю та нулі нижче, а всі вищі біти інвертує, тому AND виділяє лише її.
44. Представити підмножину маскою `0 … 2^n − 1`: біт `i` означає наявність елемента `i`. Цикл по масках дає `2^n` підмножин; належність — `mask & (1 << i)`.
45. У послідовності `i ^ (i >> 1)` сусідні числа відрізняються одним бітом, що зменшує помилки при зміні стану (датчики, перемикачі), зручно для генерації комбінацій і в картах Карно.
46. Операнди перетворюються на 32-бітові знакові цілі: `1 << 31` від'ємне, `1 << 32` дорівнює `1`, дробова частина відкидається, `>>` арифметичний, `>>>` беззнаковий. Для 64 біт потрібен `BigInt`.
47. Алгоритмом Кернігана: `x &= x − 1` скидає одну одиницю за ітерацію, тож ітерацій рівно стільки, скільки одиниць; також можна використати таблиці, SWAR або DP `bits[i] = bits[i >> 1] + (i & 1)`.
48. Стан множини елементів кодують маскою, а `dp[mask][…]` зберігає оптимум для цієї множини; переходи додають елемент через `mask | (1 << i)`. Складність `O(2^n · n^k)`, придатна для `n ≤ 20`.
49. `x & 1 === 0` обчислюється як `x & (1 === 0)`, тобто `x & false`, і дає `0`. Тому бітові підвирази завжди беруть у дужки.
50. XOR усіх дає `a ^ b`; вибираємо будь-який встановлений біт цього значення (наприклад, `x & −x`), розділяємо числа на дві групи за цим бітом і XOR-имо кожну групу окремо — отримуємо `a` і `b`.
