# Knapsack — задача про рюкзак

Є предмети з **вагою** `w[i]` і **цінністю** `v[i]`, і рюкзак місткістю `W`. Потрібно вибрати набір предметів із максимальною сумарною цінністю, щоб сумарна вага не перевищила `W`. Це найвідоміша **NP-повна** задача оптимізації, і водночас хрестоматійний приклад ДП: розв'язується за **псевдополіноміальний** час `O(n·W)`. Від неї походять десятки задач: розбиття множини на дві рівні за сумою, цільова сума, розміни, вибір проєктів із бюджетом.

## 1. Варіанти

- **0/1-рюкзак:** кожен предмет — або береться, або ні (`0` чи `1` разів).
- **Необмежений (unbounded):** кожен предмет можна брати скільки завгодно разів.
- **Обмежений (bounded):** кожен предмет має ліміт `c[i]` копій.
- **Дробовий (fractional):** предмети можна ділити — розв'язується **жадібно** (за зростанням `v/w`).
- **Багатовимірний:** кілька обмежень (вага й об'єм).
- **Subset sum:** лише вага, `v[i] = w[i]` — чи існує набір із сумою рівно `S`.

## 2. 0/1-рюкзак: ДП

**Стан:** `dp[i][c]` — максимальна цінність, якщо розглядаємо перші `i` предметів і місткість рюкзака `c`.

**Перехід:** для предмета `i` (вага `w`, цінність `v`):

- не беремо: `dp[i − 1][c]`;
- беремо (якщо `w ≤ c`): `dp[i − 1][c − w] + v`.

`dp[i][c] = max(dp[i − 1][c], dp[i − 1][c − w] + v)`.

**База:** `dp[0][c] = 0` для всіх `c`. **Відповідь:** `dp[n][W]`. Час і пам'ять `O(n·W)`.

Приклад: предмети (вага, цінність): `(1, 1)`, `(3, 4)`, `(4, 5)`, `(5, 7)`, місткість `7`. Відповідь `9`; які предмети вибрано (індекси): `[1, 2]`.

Таблиця `dp` (рядки — предмети 0…4, стовпці — місткість 0…7):

```text
0 0 0 0 0 0 0 0
0 1 1 1 1 1 1 1
0 1 1 4 5 5 5 5
0 1 1 4 5 6 6 9
0 1 1 4 5 7 8 9
```

## 3. Оптимізація пам'яті: один рядок

Рядок `i` залежить лише від рядка `i − 1`. Тому достатньо одного масиву `dp[c]`, але **місткість треба обходити у зворотному порядку** (`c` від `W` вниз до `w`):

```text
for кожного предмета (w, v):
    for c від W вниз до w:
        dp[c] = max(dp[c], dp[c − w] + v)
```

Чому назад? Щоб `dp[c − w]` ще містив значення **до** врахування поточного предмета. При обході вперед `dp[c − w]` уже оновлений тим самим предметом — його було б використано двічі, і ми розв'язали б **необмежений** рюкзак, а не 0/1. Пам'ять — `O(W)`.

## 4. Необмежений рюкзак

Той самий одновимірний масив, але `c` — **вперед** (від `w` до `W`): `dp[c] = max(dp[c], dp[c − w] + v)`, і предмет можна використати кілька разів. `unboundedKnapsack(items, 10)` = `14` (предмет вагою 5 і цінністю 7 береться двічі), тоді як 0/1-версія для тієї ж місткості дає `13`.

## 5. Відновлення набору предметів

Зберігаємо повну таблицю `dp[i][c]` і йдемо від `(n, W)` назад: якщо `dp[i][c] ≠ dp[i − 1][c]`, предмет `i` взято — зменшуємо `c` на його вагу. `knapsackItems(items, 7)` = `[1, 2]` (індекси предметів).

## 6. Subset sum і розбиття

**Subset sum:** чи можна набрати суму `S` підмножиною? `dp[s]` — булеве: чи досяжна сума `s`. `dp[s] ||= dp[s − x]` (знову назад). `subsetSum([3, 34, 4, 12, 5, 2], 9)` = `true`, `subsetSum([3, 34, 4, 12, 5, 2], 30)` = `false`.

**Розбиття на дві рівні частини (partition equal subset sum):** можливе, якщо загальна сума парна й існує підмножина з сумою `total / 2`. `canPartition([1, 5, 11, 5])` = `true`, `canPartition([1, 2, 3, 5])` = `false`.

**Цільова сума (`+`/`−`):** розставити знаки так, щоб сума дорівнювала `target`. Якщо `P` — сума з `+`, `N` — з `−`, то `P − N = target`, `P + N = total` → `P = (total + target) / 2` — задача підрахунку підмножин: `findTargetSumWays([1, 1, 1, 1, 1], 3)` = `5`.

**Мінімальна різниця двох груп:** `minSubsetDiff([1, 6, 11, 5])` = `1` — шукаємо досяжну суму найближче до `total / 2`.

## 7. Дробовий рюкзак (жадібний)

Якщо предмети можна ділити, достатньо відсортувати за **питомою цінністю** `v/w` і брати з найціннішого, поки вміщується (останній — частково). `fractionalKnapsack(items, 7)` = `9.666667` (завжди `≥` значення 0/1). Для 0/1 жадібність за `v/w` **не** оптимальна: предмети `(10, 60)`, `(20, 100)`, `(30, 120)`, `W = 50`: за `v/w` беремо 1-й і 2-й (160), але найкраще 2-й і 3-й (220): `greedy01` = `160` проти `knapsack01` = `220`.

## 8. Реалізація

```js
const items = [[1, 1], [3, 4], [4, 5], [5, 7]];

function knapsack01(its, W) {
  const dp = new Array(W + 1).fill(0);
  for (const [w, v] of its) for (let c = W; c >= w; c--) dp[c] = Math.max(dp[c], dp[c - w] + v);
  return dp[W];
}

function knapsackTable(its, W) {
  const dp = Array.from({ length: its.length + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= its.length; i++) {
    const [w, v] = its[i - 1];
    for (let c = 0; c <= W; c++) {
      dp[i][c] = dp[i - 1][c];
      if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + v);
    }
  }
  return dp.map((r) => r.join(' ')).join('\n');
}

function knapsackItems(its, W) {
  const dp = Array.from({ length: its.length + 1 }, () => new Array(W + 1).fill(0));
  for (let i = 1; i <= its.length; i++) {
    const [w, v] = its[i - 1];
    for (let c = 0; c <= W; c++) {
      dp[i][c] = dp[i - 1][c];
      if (w <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w] + v);
    }
  }
  const chosen = [];
  let c = W;
  for (let i = its.length; i >= 1; i--) {
    if (dp[i][c] !== dp[i - 1][c]) {
      chosen.push(i - 1);
      c -= its[i - 1][0];
    }
  }
  return chosen.reverse();
}

function unboundedKnapsack(its, W) {
  const dp = new Array(W + 1).fill(0);
  for (const [w, v] of its) for (let c = w; c <= W; c++) dp[c] = Math.max(dp[c], dp[c - w] + v);
  return dp[W];
}

function boundedKnapsack(its, W) {
  const expanded = [];
  for (const [w, v, k] of its) {
    let rest = k;
    let p = 1;
    while (rest > 0) {
      const take = Math.min(p, rest);
      expanded.push([w * take, v * take]);
      rest -= take;
      p *= 2;
    }
  }
  return knapsack01(expanded, W);
}

function subsetSum(a, S) {
  const dp = new Array(S + 1).fill(false);
  dp[0] = true;
  for (const x of a) for (let s = S; s >= x; s--) if (dp[s - x]) dp[s] = true;
  return dp[S];
}

function canPartition(a) {
  const total = a.reduce((s, x) => s + x, 0);
  return total % 2 === 0 && subsetSum(a, total / 2);
}

function findTargetSumWays(a, target) {
  const total = a.reduce((s, x) => s + x, 0);
  if (Math.abs(target) > total || (total + target) % 2 !== 0) return 0;
  const P = (total + target) / 2;
  const dp = new Array(P + 1).fill(0);
  dp[0] = 1;
  for (const x of a) for (let s = P; s >= x; s--) dp[s] += dp[s - x];
  return dp[P];
}

function minSubsetDiff(a) {
  const total = a.reduce((s, x) => s + x, 0);
  const dp = new Array(total + 1).fill(false);
  dp[0] = true;
  for (const x of a) for (let s = total; s >= x; s--) if (dp[s - x]) dp[s] = true;
  let best = Infinity;
  for (let s = 0; s <= total; s++) if (dp[s]) best = Math.min(best, Math.abs(total - 2 * s));
  return best;
}

function fractionalKnapsack(its, W) {
  const sorted = its.slice().sort((a, b) => b[1] / b[0] - a[1] / a[0]);
  let rest = W;
  let total = 0;
  for (const [w, v] of sorted) {
    if (rest <= 0) break;
    const take = Math.min(w, rest);
    total += (v * take) / w;
    rest -= take;
  }
  return +total.toFixed(6);
}

function greedy01(its, W) {
  const sorted = its.slice().sort((a, b) => b[1] / b[0] - a[1] / a[0]);
  let rest = W;
  let total = 0;
  for (const [w, v] of sorted) if (w <= rest) { rest -= w; total += v; }
  return total;
}

function countSubsetsWithSum(a, S) {
  const dp = new Array(S + 1).fill(0);
  dp[0] = 1;
  for (const x of a) for (let s = S; s >= x; s--) dp[s] += dp[s - x];
  return dp[S];
}

function lastStoneWeightII(stones) {
  return minSubsetDiff(stones);
}

function oneZeroes(strs, m, n) {
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (const s of strs) {
    let zeros = 0;
    for (const ch of s) if (ch === '0') zeros++;
    const ones = s.length - zeros;
    for (let i = m; i >= zeros; i--) for (let j = n; j >= ones; j--) dp[i][j] = Math.max(dp[i][j], dp[i - zeros][j - ones] + 1);
  }
  return dp[m][n];
}
```

## 9. Складність і «псевдополіноміальність»

- **Час `O(n·W)`**, пам'ять `O(W)` (одномірний) чи `O(n·W)` (з відновленням).
- Це **не** поліноміальний час від **розміру входу**: число `W` записується `log₂ W` бітами, тому `O(n·W)` експоненційний від довжини запису. Саме тому рюкзак NP-повний, хоч і має ДП-алгоритм. Для `W = 10⁹` таблиця нездійсненна.
- Для великих `W` і малих `n` — **meet in the middle** (`O(2^{n/2})`) або заміна ролей: ДП за цінністю (`dp[v]` — мінімальна вага для цінності `v`), якщо цінності малі.
- Для наближення: **FPTAS** — масштабування цінностей дає `(1 − ε)`-наближення за `O(n²/ε)`.

## 10. Типові помилки

1. **Прямий обхід місткості в 0/1-рюкзаку** — предмет береться багато разів (виходить необмежений).
2. **Зворотний обхід у необмеженому** — предмет береться не більше одного разу.
3. **Ініціалізація `dp` нулями для «точної» ваги** — для «рівно `W`» початок `dp[0] = 0`, інші `−∞`.
4. **Зсув індексів предметів у відновленні** (`i − 1`).
5. **Від'ємні ваги/цінності** ламають припущення.
6. **Жадібність за `v/w` для 0/1** — не оптимальна.
7. **Забути, що `W` величезне** — пам'ять і час нереальні.
8. **У задачах `target sum`:** неправильна перевірка парності `(total + target)`.
9. **Нескінченні ваги нуль:** предмет вагою `0` у необмеженому — безкінечний цикл логіки; обробіть окремо.

## 11. Алгоритм (стисло)

1. `dp[0..W] = 0`.
2. Для кожного предмета `(w, v)`: `для c від W до w: dp[c] = max(dp[c], dp[c − w] + v)` (0/1, назад; необмежений — вперед).
3. Відповідь `dp[W]`. Час `O(n·W)`, пам'ять `O(W)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `knapsack01(items, 7)`?

```js
knapsack01(items, 7)
```

**2.** Які предмети (індекси) вибирає `knapsackItems(items, 7)`?

```js
knapsackItems(items, 7)
```

**3.** Яка таблиця `dp` для `knapsackTable(items, 7)`?

```js
knapsackTable(items, 7)
```

**4.** Що поверне `knapsack01(items, 0)` та для місткості, меншої за найлегший предмет?

```js
[knapsack01(items, 0), knapsack01([[5, 10]], 3)]
```

**5.** Що поверне `knapsack01([], 10)`?

```js
knapsack01([], 10)
```

**6.** Що поверне `knapsack01(items, 14)` (усі предмети вміщуються)?

```js
knapsack01(items, 14)
```

**7.** Що поверне `unboundedKnapsack(items, 10)` та `knapsack01(items, 10)`?

```js
[unboundedKnapsack(items, 10), knapsack01(items, 10)]
```

**8.** Що станеться, якщо в 0/1-рюкзаку обходити місткість **вперед**? Змоделюйте для `[[2, 3]]` та `W = 6`.

```js
(() => { const dp = new Array(7).fill(0); for (const [w, v] of [[2, 3]]) for (let c = w; c <= 6; c++) dp[c] = Math.max(dp[c], dp[c - w] + v); return dp[6]; })()
```

**9.** А правильний 0/1 для того самого?

```js
knapsack01([[2, 3]], 6)
```

**10.** Що поверне `boundedKnapsack([[2, 3, 2], [3, 4, 1]], 7)`?

```js
boundedKnapsack([[2, 3, 2], [3, 4, 1]], 7)
```

**11.** Що поверне `subsetSum([3, 34, 4, 12, 5, 2], 9)` та `(…, 30)`?

```js
[subsetSum([3, 34, 4, 12, 5, 2], 9), subsetSum([3, 34, 4, 12, 5, 2], 30)]
```

**12.** Що поверне `subsetSum([], 0)` та `subsetSum([1], 0)`?

```js
[subsetSum([], 0), subsetSum([1], 0)]
```

**13.** Чи можна розбити `[1, 5, 11, 5]` і `[1, 2, 3, 5]` на дві рівні частини?

```js
[canPartition([1, 5, 11, 5]), canPartition([1, 2, 3, 5])]
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `findTargetSumWays([1, 1, 1, 1, 1], 3)`?

```js
findTargetSumWays([1, 1, 1, 1, 1], 3)
```

**15.** Що поверне `findTargetSumWays([1], 1)`, `([1], 2)`, `([1, 0], 1)`?

```js
[findTargetSumWays([1], 1), findTargetSumWays([1], 2), findTargetSumWays([1, 0], 1)]
```

**16.** Що поверне `minSubsetDiff([1, 6, 11, 5])`?

```js
minSubsetDiff([1, 6, 11, 5])
```

**17.** Що поверне `minSubsetDiff([3, 9, 7, 3])` та `([1])`?

```js
[minSubsetDiff([3, 9, 7, 3]), minSubsetDiff([1])]
```

**18.** Що поверне `fractionalKnapsack(items, 7)`?

```js
fractionalKnapsack(items, 7)
```

**19.** Що поверне `fractionalKnapsack([[10, 60], [20, 100], [30, 120]], 50)`?

```js
fractionalKnapsack([[10, 60], [20, 100], [30, 120]], 50)
```

**20.** Що поверне `greedy01` і `knapsack01` для `[[10, 60], [20, 100], [30, 120]]`, `W = 50`?

```js
[greedy01([[10, 60], [20, 100], [30, 120]], 50), knapsack01([[10, 60], [20, 100], [30, 120]], 50)]
```

**21.** Скільки підмножин `[1, 2, 3, 4, 5]` мають суму 5?

```js
countSubsetsWithSum([1, 2, 3, 4, 5], 5)
```

**22.** Скільки підмножин порожніх сум: `countSubsetsWithSum([1, 2, 3], 0)`?

```js
countSubsetsWithSum([1, 2, 3], 0)
```

**23.** Що поверне `lastStoneWeightII([2, 7, 4, 1, 8, 1])`?

```js
lastStoneWeightII([2, 7, 4, 1, 8, 1])
```

**24.** Що поверне `oneZeroes(['10', '0001', '111001', '1', '0'], 5, 3)`?

```js
oneZeroes(['10', '0001', '111001', '1', '0'], 5, 3)
```

**25.** Скільки операцій виконує ДП для `n = 100`, `W = 10⁴` і як вона порівнюється з `2^n`?

```js
[100 * 10000, 2 ** 100]
```

**26.** Яка пам'ять (кількість клітинок): повна таблиця `n × W` та один рядок для `n = 200`, `W = 5000`?

```js
[201 * 5001, 5001]
```

### Рівень 3. Складність і нюанси

**27.** Скільки різних сум досяжні в `[1, 2, 4, 8]` (підмножини)?

```js
(() => { const s = new Set([0]); for (const x of [1, 2, 4, 8]) for (const t of [...s]) s.add(t + x); return s.size; })()
```

**28.** Скільки підмножин має `[1, 1, 1, 1]` із сумою 2?

```js
countSubsetsWithSum([1, 1, 1, 1], 2)
```

**29.** Яка найбільша цінність, якщо предмети `(2, 3), (3, 4), (4, 5), (5, 6)` і `W = 5`?

```js
knapsack01([[2, 3], [3, 4], [4, 5], [5, 6]], 5)
```

**30.** Напишіть `knapsackExactWeight(items, W)` — максимальна цінність при вазі **рівно** `W` (або `-1`).

**31.** Напишіть `minWeightForValue(items, V)` — мінімальна вага для цінності не менше `V` (ДП за цінністю).

**32.** Напишіть `coinChangeWays(coins, amount)` — кількість комбінацій монет (необмежений рюкзак на кількість способів).

**33.** Напишіть `ropeCutting(lengths, n)` — максимальна цінність при розрізанні мотузки довжини `n` на частини (`lengths[i]` — ціна відрізка довжини `i + 1`; необмежений рюкзак).

**34.** Напишіть `partitionKSubsetsPossible(a, k)` — чи можна розбити на `k` підмножин з рівними сумами (backtracking по відрах).

**35.** Напишіть `tallestBillboard(rods)` — максимальна висота двох рівних опор із підмножин стрижнів (ДП: `dp[diff] = максимум меншої опори`).

**36.** Напишіть `profitableSchemes(G, P, group, profit)` — кількість схем, що використовують не більше `G` людей і дають прибуток не менше `P` (за модулем `1e9 + 7`).

**37.** Напишіть `knapsackWithCount(items, W, maxItems)` — максимальна цінність не більш ніж з `maxItems` предметів (додатковий вимір).

**38.** Напишіть `meetInTheMiddleSubsetSum(a, S)` — чи є підмножина з сумою `S` для невеликого `n` (розбийте на дві половини й перевірте пари сум).

**39.** У чому різниця між 0/1-рюкзаком і необмеженим і як це відображається в циклі?

### Рівень 4. Задачі з інтерв'ю

**40.** Чому задача про рюкзак NP-повна, хоч має алгоритм `O(n·W)`?

**41.** Чому жадібний вибір за питомою цінністю `v/w` не працює для 0/1?

**42.** Як відновити, які предмети входять в оптимальний розв'язок?

**43.** Як subset sum і розбиття множини зводяться до рюкзака?

**44.** Як стиснути пам'ять рюкзака і чим це ускладнює відновлення розв'язку?

**45.** Що таке FPTAS для рюкзака?

**46.** Коли варто застосовувати «meet in the middle» замість ДП?

**47.** Як кількісний варіант (скільки підмножин мають суму `S`) відрізняється від булевого?

**48.** Чому в задачі «точно `W`» початкові значення — `−∞`, а не `0`?

**49.** Що поверне `knapsack01([[3, 4], [4, 5], [2, 3]], 6)`?

```js
knapsack01([[3, 4], [4, 5], [2, 3]], 6)
```

**50.** Що поверне `unboundedKnapsack([[2, 3]], 7)`?

```js
unboundedKnapsack([[2, 3]], 7)
```

### Відповіді

1. `9`
2. `[1, 2]`
3. `'0 0 0 0 0 0 0 0\n0 1 1 1 1 1 1 1\n0 1 1 4 5 5 5 5\n0 1 1 4 5 6 6 9\n0 1 1 4 5 7 8 9'`
4. `[0, 0]`
5. `0`
6. `17`
7. `[14, 13]`
8. `9`
9. `3`
10. `10`
11. `[true, false]`
12. `[true, true]`
13. `[true, false]`
14. `5`
15. `[1, 0, 2]`
16. `1`
17. `[2, 1]`
18. `9.666667`
19. `240`
20. `[160, 220]`
21. `3`
22. `1`
23. `1`
24. `4`
25. `[1000000, 1.2676506002282294e+30]`
26. `[1005201, 5001]`
27. `16`
28. `6`
29. `7`
30. Приклад розв'язку:

   ```js
   function knapsackExactWeight(its, W) {
     const dp = new Array(W + 1).fill(-Infinity);
     dp[0] = 0;
     for (const [w, v] of its) for (let c = W; c >= w; c--) if (dp[c - w] > -Infinity) dp[c] = Math.max(dp[c], dp[c - w] + v);
     return dp[W] === -Infinity ? -1 : dp[W];
   }
   ```

   Виклик `[knapsackExactWeight(items, 7), knapsackExactWeight([[2, 5]], 3)]` → `[9, -1]`

31. Приклад розв'язку:

   ```js
   function minWeightForValue(its, V) {
     const dp = new Array(V + 1).fill(Infinity);
     dp[0] = 0;
     for (const [w, v] of its) for (let c = V; c >= 0; c--) {
       const from = Math.max(0, c - v);
       if (dp[from] + w < dp[c]) dp[c] = dp[from] + w;
     }
     return dp[V] === Infinity ? -1 : dp[V];
   }
   ```

   Виклик `[minWeightForValue(items, 9), minWeightForValue(items, 100)]` → `[7, -1]`

32. Приклад розв'язку:

   ```js
   function coinChangeWays(coins, amount) {
     const dp = new Array(amount + 1).fill(0);
     dp[0] = 1;
     for (const c of coins) for (let s = c; s <= amount; s++) dp[s] += dp[s - c];
     return dp[amount];
   }
   ```

   Виклик `[coinChangeWays([1, 2, 5], 5), coinChangeWays([2], 3), coinChangeWays([10], 10)]` → `[4, 0, 1]`

33. Приклад розв'язку:

   ```js
   function ropeCutting(price, n) {
     const items = price.map((p, i) => [i + 1, p]);
     return unboundedKnapsack(items, n);
   }
   ```

   Виклик `[ropeCutting([1, 5, 8, 9, 10, 17, 17, 20], 8), ropeCutting([3, 5, 8, 9, 10, 17, 17, 20], 8)]` → `[22, 24]`

34. Приклад розв'язку:

   ```js
   function partitionKSubsetsPossible(a, k) {
     const total = a.reduce((s, x) => s + x, 0);
     if (total % k) return false;
     const target = total / k;
     const arr = a.slice().sort((x, y) => y - x);
     const buckets = new Array(k).fill(0);
     const go = (i) => {
       if (i === arr.length) return true;
       const seen = new Set();
       for (let b = 0; b < k; b++) {
         if (buckets[b] + arr[i] > target || seen.has(buckets[b])) continue;
         seen.add(buckets[b]);
         buckets[b] += arr[i];
         if (go(i + 1)) return true;
         buckets[b] -= arr[i];
       }
       return false;
     };
     return go(0);
   }
   ```

   Виклик `[partitionKSubsetsPossible([4, 3, 2, 3, 5, 2, 1], 4), partitionKSubsetsPossible([1, 2, 3, 4], 3)]` → `[true, false]`

35. Приклад розв'язку:

   ```js
   function tallestBillboard(rods) {
     let dp = new Map([[0, 0]]);
     for (const r of rods) {
       const nx = new Map(dp);
       for (const [d, s] of dp) {
         const up = d + r;
         nx.set(up, Math.max(nx.get(up) ?? -1, s));
         const down = Math.abs(d - r);
         nx.set(down, Math.max(nx.get(down) ?? -1, s + Math.min(d, r)));
       }
       dp = nx;
     }
     return dp.get(0);
   }
   ```

   Виклик `[tallestBillboard([1, 2, 3, 6]), tallestBillboard([1, 2, 3, 4, 5, 6]), tallestBillboard([1, 2])]` → `[6, 10, 0]`

36. Приклад розв'язку:

   ```js
   function profitableSchemes(G, P, group, profit) {
     const M = 1000000007;
     const dp = Array.from({ length: G + 1 }, () => new Array(P + 1).fill(0));
     dp[0][0] = 1;
     for (let k = 0; k < group.length; k++) {
       const g = group[k], p = profit[k];
       for (let i = G; i >= g; i--) for (let j = P; j >= 0; j--) {
         const nj = Math.min(P, j + p);
         dp[i][nj] = (dp[i][nj] + dp[i - g][j]) % M;
       }
     }
     let r = 0;
     for (let i = 0; i <= G; i++) r = (r + dp[i][P]) % M;
     return r;
   }
   ```

   Виклик `[profitableSchemes(5, 3, [2, 2], [2, 3]), profitableSchemes(10, 5, [2, 3, 5], [6, 7, 8])]` → `[2, 7]`

37. Приклад розв'язку:

   ```js
   function knapsackWithCount(its, W, K) {
     const dp = Array.from({ length: K + 1 }, () => new Array(W + 1).fill(0));
     for (const [w, v] of its) for (let k = K; k >= 1; k--) for (let c = W; c >= w; c--) dp[k][c] = Math.max(dp[k][c], dp[k - 1][c - w] + v);
     return dp[K][W];
   }
   ```

   Виклик `[knapsackWithCount(items, 10, 2), knapsackWithCount(items, 10, 3)]` → `[12, 13]`

38. Приклад розв'язку:

   ```js
   function meetInTheMiddleSubsetSum(a, S) {
     const sums = (arr) => {
       let r = [0];
       for (const x of arr) r = r.concat(r.map(s => s + x));
       return r;
     };
     const h = a.length >> 1;
     const L = sums(a.slice(0, h)), R = new Set(sums(a.slice(h)));
     return L.some(s => R.has(S - s));
   }
   ```

   Виклик `[meetInTheMiddleSubsetSum([3, 34, 4, 12, 5, 2], 9), meetInTheMiddleSubsetSum([3, 34, 4, 12, 5, 2], 30)]` → `[true, false]`

39. У 0/1 кожен предмет береться не більше одного разу, тому місткість обходять назад, щоб `dp[c − w]` ще відповідало стану без поточного предмета. У необмеженому місткість обходять вперед: `dp[c − w]` уже може містити той самий предмет, що дозволяє брати його багато разів.
40. Час `O(n·W)` — поліноміальний від значення `W`, але експоненційний від довжини його запису (`log W` бітів). Такі алгоритми називають псевдополіноміальними; для великих `W` вони нездійсненні.
41. Цілий предмет не можна розділити, тож брати найціннішу за густиною може залишити нерозв'язаний «простір». Приклад: `(10,60), (20,100), (30,120)`, `W = 50`: жадібно 160, оптимально 220.
42. Зберігати повну таблицю `dp[i][c]` і йти від `(n, W)`: якщо `dp[i][c] ≠ dp[i − 1][c]`, предмет `i` взято, і місткість зменшується на його вагу; інакше предмет пропущено.
43. Subset sum — це рюкзак, де цінність дорівнює вазі, і потрібно знайти досяжну суму (булевий `dp`). Розбиття на дві рівні частини — subset sum із `S = total / 2` (за парної `total`).
44. Рядок `i` залежить лише від `i − 1`, тож достатньо одновимірного масиву `O(W)`. Але інформація про вибір предметів губиться, тому для відновлення зберігають таблицю або бітові маски вибору.
45. Повністю поліноміальна схема наближення: масштабуванням і округленням цінностей отримують розв'язок не гірший за `(1 − ε)·OPT` за час, поліноміальний за `n` і `1/ε`.
46. Коли `n` невелике (до ~40–50), а `W` або значення величезні: розбиття на дві половини дає `2·2^{n/2}` сум та швидке з'єднання за сортуванням чи хешем замість таблиці розміру `W`.
47. Замість `dp[s] ||= dp[s − x]` застосовують `dp[s] += dp[s − x]`: кожен предмет збільшує число способів. Тими самими обходами (назад для 0/1, вперед для необмеженого) рахують розміни та цільові суми.
48. Нулі означали б, що будь-яка вага досяжна з нульовою цінністю, тобто «не більше `W`». Для точної ваги досяжним є лише `dp[0] = 0`, решта — недосяжні стани.
49. `8`
50. `9`
