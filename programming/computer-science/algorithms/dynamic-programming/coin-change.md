# Coin Change — розмін монет

Задача про розмін: є монети номіналів `coins` (кожен можна брати **скільки завгодно разів**) і сума `amount`. Потрібно: **(1)** мінімальну кількість монет, що дають суму; **(2)** кількість різних способів скласти суму; **(3)** кількість впорядкованих послідовностей. Це класична задача ДП — «необмежений рюкзак» для сум — і хороша ілюстрація того, чому **жадібний** підхід не завжди працює.

## 1. Чому жадібність не спрацьовує

Банкомат видає «спочатку найбільшою монетою». Для монет `[1, 5, 10, 25]` це оптимально (канонічна система). Але для `[1, 3, 4]` і суми `6`: жадібно `4 + 1 + 1` (3 монети), а оптимально `3 + 3` (2 монети). Для `[1, 5, 10, 21, 25]` і суми `63` жадібно `25 + 25 + 10 + 1 + 1 + 1` (6), оптимально `21 + 21 + 21` (3). Жадібність гарантовано працює лише для спеціальних («канонічних») систем.

Перевірка: `greedyCoins([1, 3, 4], 6)` = `3` монет, а `minCoins([1, 3, 4], 6)` = `2`. Для `[1, 5, 10, 21, 25]`, `63`: жадібно `6`, ДП `3`.

## 2. Мінімум монет

**Стан:** `dp[s]` — мінімальна кількість монет для суми `s`.

**Перехід:** `dp[s] = 1 + min(dp[s − c])` по всіх монетах `c ≤ s`.

**База:** `dp[0] = 0`; недосяжні суми — `∞`. **Відповідь:** `dp[amount]` (`−1`, якщо `∞`).

Приклад: монети `[1, 2, 5]`, сума `11` → `3` (`5 + 5 + 1`). Монети `[2]`, сума `3` → `-1` (неможливо). Таблиця `dp` для `[1, 3, 4]`, `s = 0…10`: `0 1 2 1 1 2 2 2 2 3 3`.

Час `O(amount · k)` (`k` — кількість номіналів), пам'ять `O(amount)`.

### Відновлення набору монет

Зберігаємо `choice[s]` — монету, що дала мінімум: `coinsUsed([1, 3, 4], 6)` = `[3, 3]`.

## 3. Кількість способів (комбінації)

Скільки різних **наборів** монет дають суму (порядок не важливий)? `dp[s]` — кількість способів. Ключ — **порядок циклів**: **зовнішній — монети, внутрішній — суми**:

```text
dp[0] = 1
for coin in coins:
    for s in coin..amount:
        dp[s] += dp[s − coin]
```

Кожну монету «вводимо» по черзі: після обробки монети `c` у `dp` враховано лише набори з монет, розглянутих досі, і кожен набір рахується **один раз** (у канонічному порядку номіналів). `change([1, 2, 5], 5)` = `4`: `5`, `2+2+1`, `2+1+1+1`, `1+1+1+1+1` — ось 4. `change([2], 3)` = `0`, `change([10], 10)` = `1`.

## 4. Кількість послідовностей (перестановки)

Якщо порядок монет важливий (`1+2` і `2+1` — різні), цикли міняємо місцями: **зовнішній — суми, внутрішній — монети**: `combinationSum4([1, 2, 3], 4)` = `7` (7 послідовностей). Це приклад: та сама рекурентність, але різний порядок циклів дає різні задачі — **комбінації** проти **перестановок**.

## 5. Обмежена кількість монет кожного номіналу

Якщо монета `c` є в кількості `k_c` штук — це **обмежений рюкзак**: розклад на степені двійки або ДП за кількістю: `minCoinsLimited([[1, 3], [5, 1]], 8)` = `4` (`5 + 1 + 1 + 1`). Тут `[номінал, кількість]`.

## 6. Реалізація

```js
function minCoins(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let s = 1; s <= amount; s++) {
    for (const c of coins) if (c <= s && dp[s - c] + 1 < dp[s]) dp[s] = dp[s - c] + 1;
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

function minCoinsTable(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let s = 1; s <= amount; s++) {
    for (const c of coins) if (c <= s && dp[s - c] + 1 < dp[s]) dp[s] = dp[s - c] + 1;
  }
  return dp.map((x) => (x === Infinity ? '∞' : x)).join(' ');
}

function coinsUsed(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  const choice = new Array(amount + 1).fill(-1);
  dp[0] = 0;
  for (let s = 1; s <= amount; s++) {
    for (const c of coins) if (c <= s && dp[s - c] + 1 < dp[s]) { dp[s] = dp[s - c] + 1; choice[s] = c; }
  }
  if (dp[amount] === Infinity) return null;
  const out = [];
  for (let s = amount; s > 0; s -= choice[s]) out.push(choice[s]);
  return out.sort((a, b) => b - a);
}

function greedyCoins(coins, amount) {
  const sorted = coins.slice().sort((a, b) => b - a);
  let count = 0;
  for (const c of sorted) {
    count += Math.floor(amount / c);
    amount %= c;
  }
  return amount === 0 ? count : -1;
}

function change(coins, amount) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;
  for (const c of coins) for (let s = c; s <= amount; s++) dp[s] += dp[s - c];
  return dp[amount];
}

function combinationSum4(nums, target) {
  const dp = new Array(target + 1).fill(0);
  dp[0] = 1;
  for (let s = 1; s <= target; s++) for (const x of nums) if (x <= s) dp[s] += dp[s - x];
  return dp[target];
}

function minCoinsLimited(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (const [c, k] of coins) {
    for (let s = amount; s >= 0; s--) {
      for (let t = 1; t <= k && t * c <= s; t++) {
        if (dp[s - t * c] + t < dp[s]) dp[s] = dp[s - t * c] + t;
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

function minCoinsMemo(coins, amount) {
  const memo = new Map();
  const go = (rest) => {
    if (rest === 0) return 0;
    if (rest < 0) return Infinity;
    if (memo.has(rest)) return memo.get(rest);
    let best = Infinity;
    for (const c of coins) best = Math.min(best, go(rest - c) + 1);
    memo.set(rest, best);
    return best;
  };
  const r = go(amount);
  return r === Infinity ? -1 : r;
}

function minCoinsBfs(coins, amount) {
  if (amount === 0) return 0;
  const seen = new Array(amount + 1).fill(false);
  seen[0] = true;
  let level = [0];
  let steps = 0;
  while (level.length) {
    steps++;
    const next = [];
    for (const s of level) {
      for (const c of coins) {
        const t = s + c;
        if (t === amount) return steps;
        if (t < amount && !seen[t]) { seen[t] = true; next.push(t); }
      }
    }
    level = next;
  }
  return -1;
}

function isCanonical(coins) {
  const sorted = coins.slice().sort((a, b) => a - b);
  const max = sorted[sorted.length - 1] + sorted[sorted.length - 2];
  for (let s = 1; s <= max; s++) if (greedyCoins(coins, s) !== minCoins(coins, s)) return false;
  return true;
}

function fewestCoinsCount(coins, amount) {
  let calls = 0;
  const go = (rest) => {
    calls++;
    if (rest === 0) return 0;
    if (rest < 0) return Infinity;
    let best = Infinity;
    for (const c of coins) best = Math.min(best, go(rest - c) + 1);
    return best;
  };
  go(amount);
  return calls;
}

function waysWithPermutationsOfSteps(steps, n) {
  return combinationSum4(steps, n);
}

function minCoinsForAll(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let s = 1; s <= amount; s++) for (const c of coins) if (c <= s) dp[s] = Math.min(dp[s], dp[s - c] + 1);
  return dp;
}

function perfectSquaresViaCoins(n) {
  const squares = [];
  for (let i = 1; i * i <= n; i++) squares.push(i * i);
  return minCoins(squares, n);
}

function numberOfWaysToMakeChangeMod(coins, amount, mod) {
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1;
  for (const c of coins) for (let s = c; s <= amount; s++) dp[s] = (dp[s] + dp[s - c]) % mod;
  return dp[amount];
}
```

## 7. Складність

| Задача | Час | Пам'ять |
|---|---|---|
| Мінімум монет | `O(amount · k)` | `O(amount)` |
| Кількість комбінацій | `O(amount · k)` | `O(amount)` |
| Кількість послідовностей | `O(amount · k)` | `O(amount)` |
| Наївна рекурсія | `O(kᵃᵐᵒᵘⁿᵗ)` | глибина `amount` |
| BFS за сумою | `O(amount · k)` | `O(amount)` |

Для `coins = [1, 2, 5]`, `amount = 15` наївна рекурсія робить 7843 викликів, мемоізація/ДП — `15 · 3 = 45` обчислень.

Задача **NP-складна**, якщо номінали задані довільно, а `amount` кодується двійково (як рюкзак): `O(amount · k)` — псевдополіноміальний.

## 8. Канонічність монетних систем

Система **канонічна**, якщо жадібний алгоритм завжди оптимальний. За результатом Козена—Закса контрприклад, якщо він існує, лежить нижче `c_{k−1} + c_k` (суми двох найбільших номіналів), тому достатньо перевірити суми до цієї межі. `isCanonical([1, 5, 10, 25])` = `true`, `isCanonical([1, 3, 4])` = `false`. Реальні валютні системи (євро, долар) підібрані канонічними: жадібна видача решти оптимальна.

## 9. Споріднені задачі

- **BFS за сумою:** вершини — суми, ребра — додавання монети; найкоротший шлях = мінімум монет ([bfs.md](../graphs/bfs.md)): `minCoinsBfs([1, 2, 5], 11)` = `3`.
- **Досконалі квадрати:** монети — квадрати: `perfectSquaresViaCoins(12)` = `3` (`4 + 4 + 4`).
- **Сходи** і **комбінації кроків:** `combinationSum4`.
- **Необмежений рюкзак** ([knapsack.md](knapsack.md)): монета — предмет, вага = номінал, цінність = −1.
- **Задача «розбиття числа»** (partitions): кількість способів записати `n` як суму натуральних — `change([1..n], n)`.
- **Видача решти з обмеженою кількістю купюр** — обмежений варіант.

## 10. Типові помилки

1. **Жадібний алгоритм для довільної системи** — хибна відповідь.
2. **Порядок циклів:** для комбінацій — зовнішній по монетах; для послідовностей — зовнішній по сумах. Переплутування дає не ту задачу.
3. **`dp` ініціалізовано нулями** для мінімуму — недосяжні суми вважатимуться дешевими.
4. **`Math.min` із `Infinity + 1`** — безпечно в JS, але в інших мовах переповнення.
5. **Сума `0`:** мінімум `0` монет, способів `1` (порожній набір).
6. **Не врахувати недосяжність** (`−1`).
7. **Дублікати номіналів у вході** — для підрахунку комбінацій дадуть завищений результат: нормалізуйте (`new Set`).
8. **Від'ємні чи нульові номінали** — нескінченний цикл/ділення на нуль.
9. **Велика `amount`** (10⁹) — таблиця неможлива; потрібні інші методи (математика для двох номіналів, мінімізація за залишками).

## 11. Алгоритм (стисло)

1. Мінімум: `dp[0] = 0`, `dp[s] = 1 + min(dp[s − c])`.
2. Комбінації: `dp[0] = 1`; зовнішній цикл по монетах, внутрішній по сумах `c..amount`: `dp[s] += dp[s − c]`.
3. Послідовності: зовнішній цикл по сумах.
4. Час `O(amount · k)`, пам'ять `O(amount)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `minCoins([1, 2, 5], 11)`?

```js
minCoins([1, 2, 5], 11)
```

**2.** Що поверне `minCoins([2], 3)` та `minCoins([1], 0)`?

```js
[minCoins([2], 3), minCoins([1], 0)]
```

**3.** Які значення `dp` для `[1, 3, 4]` та `s = 0…10` (`minCoinsTable`)?

```js
minCoinsTable([1, 3, 4], 10)
```

**4.** Які монети використовує `coinsUsed([1, 3, 4], 6)`?

```js
coinsUsed([1, 3, 4], 6)
```

**5.** Що поверне `coinsUsed([2], 3)`?

```js
coinsUsed([2], 3)
```

**6.** Скільки монет дає жадібний алгоритм для `[1, 3, 4]` і `6`, і скільки оптимально?

```js
[greedyCoins([1, 3, 4], 6), minCoins([1, 3, 4], 6)]
```

**7.** А для `[1, 5, 10, 21, 25]` і `63`?

```js
[greedyCoins([1, 5, 10, 21, 25], 63), minCoins([1, 5, 10, 21, 25], 63)]
```

**8.** Що поверне `greedyCoins([5, 10], 3)`, коли розмінювати неможливо?

```js
greedyCoins([5, 10], 3)
```

**9.** Чи канонічна система `[1, 5, 10, 25]` та `[1, 3, 4]`?

```js
[isCanonical([1, 5, 10, 25]), isCanonical([1, 3, 4])]
```

**10.** Чи канонічна система євро `[1, 2, 5, 10, 20, 50, 100, 200]`?

```js
isCanonical([1, 2, 5, 10, 20, 50, 100, 200])
```

**11.** Яка найменша сума, для якої жадібність помиляється в `[1, 3, 4]`?

```js
(() => { for (let s = 1; s <= 20; s++) if (greedyCoins([1, 3, 4], s) !== minCoins([1, 3, 4], s)) return s; return null; })()
```

**12.** Що поверне `change([1, 2, 5], 5)`?

```js
change([1, 2, 5], 5)
```

**13.** Що поверне `change([2], 3)` та `change([10], 10)`?

```js
[change([2], 3), change([10], 10)]
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `change([1, 2, 5], 0)`?

```js
change([1, 2, 5], 0)
```

**15.** Скільки способів розміняти 100 копійок монетами `[1, 5, 10, 25, 50]`?

```js
change([1, 5, 10, 25, 50], 100)
```

**16.** Що поверне `combinationSum4([1, 2, 3], 4)`?

```js
combinationSum4([1, 2, 3], 4)
```

**17.** А `combinationSum4([9], 3)`?

```js
combinationSum4([9], 3)
```

**18.** Чим відрізняється `change([1, 2, 3], 4)` від `combinationSum4([1, 2, 3], 4)`?

```js
[change([1, 2, 3], 4), combinationSum4([1, 2, 3], 4)]
```

**19.** Що станеться, якщо переплутати порядок циклів у `change`: рахувати з зовнішнім по сумах? Змоделюйте для `[1, 2]`, `s = 3`.

```js
(() => { const dp = [1, 0, 0, 0]; for (let s = 1; s <= 3; s++) for (const c of [1, 2]) if (c <= s) dp[s] += dp[s - c]; return [dp[3], change([1, 2], 3)]; })()
```

**20.** Що поверне `minCoinsLimited([[1, 3], [5, 1]], 8)`?

```js
minCoinsLimited([[1, 3], [5, 1]], 8)
```

**21.** А `minCoinsLimited([[1, 2], [5, 1]], 8)` (бракує одиниць)?

```js
minCoinsLimited([[1, 2], [5, 1]], 8)
```

**22.** Чи збігаються `minCoins`, `minCoinsMemo` та `minCoinsBfs` на наборах `[1, 2, 5]` для сум `0..30`?

```js
Array.from({ length: 31 }, (_, s) => s).every(s => minCoins([1, 2, 5], s) === minCoinsMemo([1, 2, 5], s) && minCoins([1, 2, 5], s) === minCoinsBfs([1, 2, 5], s))
```

**23.** Скільки викликів робить наївна рекурсія для `[1, 2, 5]` та `amount = 15`?

```js
fewestCoinsCount([1, 2, 5], 15)
```

**24.** Скільки викликів для `[1, 2, 5]` та `amount = 10`?

```js
fewestCoinsCount([1, 2, 5], 10)
```

**25.** Що поверне `perfectSquaresViaCoins(12)` та `(13)`?

```js
[perfectSquaresViaCoins(12), perfectSquaresViaCoins(13)]
```

**26.** Що поверне `minCoinsForAll([1, 3, 4], 10)`?

```js
minCoinsForAll([1, 3, 4], 10)
```

### Рівень 3. Складність і нюанси

**27.** Яка найбільша сума, яку не можна набрати монетами `[3, 5]`? (до 20)

```js
(() => { let last = -1; for (let s = 0; s <= 20; s++) if (minCoins([3, 5], s) === -1) last = s; return last; })()
```

**28.** Скільки способів розкласти 10 на доданки `1`, `2` (порядок важливий): `combinationSum4([1, 2], 10)`?

```js
combinationSum4([1, 2], 10)
```

**29.** Яка відповідь за модулем: `numberOfWaysToMakeChangeMod([1, 2, 5], 200, 1000007)`?

```js
numberOfWaysToMakeChangeMod([1, 2, 5], 200, 1000007)
```

**30.** Скільки різних способів розміняти 200 монетами `[1, 2, 5, 10, 20, 50, 100, 200]` (Project Euler 31)?

```js
change([1, 2, 5, 10, 20, 50, 100, 200], 200)
```

**31.** Напишіть `minCoinsExactCount(coins, amount, k)` — чи можна набрати суму рівно `k` монетами (булеве ДП за кількістю).

**32.** Напишіть `coinChangeAllCombinations(coins, amount)` — усі набори монет (backtracking) у вигляді масивів.

**33.** Напишіть `minCoinsLargestFirstGreedyOrBetter(coins, amount)` — поверніть `[жадібно, оптимально]`.

**34.** Напишіть `frogJump(steps, n)` — кількість способів дістатися `n`-ї сходинки кроками з `steps` (порядок важливий).

**35.** Напишіть `makeAmountWithDistinctCoinsOnce(coins, amount)` — кількість підмножин різних монет із сумою `amount` (кожна монета не більше одного разу).

**36.** Напишіть `minCostToCoverCalendar(days, costs)` — мінімальна вартість проїзних (1, 7, 30 днів) для покриття днів у році (`days` відсортовані, `costs = [1d, 7d, 30d]`).

**37.** Напишіть `coinsCountForEachAmount(coins, max)` — масив мінімальних монет для кожної суми `1…max` (з `-1` для недосяжних).

**38.** Напишіть `waysToWriteAsSumOfSquares(n)` — кількість способів записати `n` як суму квадратів (порядок неважливий, використайте `change`).

**39.** Напишіть `integerPartitions(n)` — кількість розбиттів `n` на натуральні доданки (порядок неважливий).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `solveGreedyFailureCases(coins, limit)` — перелік сум до `limit`, де жадібність програє оптимуму.

**41.** Чому жадібний алгоритм не завжди працює для розміну монет?

**42.** Яка рекурентність для мінімуму монет?

**43.** Чому для підрахунку комбінацій зовнішній цикл — по монетах, а для послідовностей — по сумах?

**44.** Яка складність ДП для розміну монет і чому вона псевдополіноміальна?

**45.** Що таке канонічна монетна система?

**46.** Як розмін монет пов'язаний із необмеженим рюкзаком?

**47.** Як застосувати BFS до задачі про мінімум монет?

**48.** Чому `dp[0] = 1` для підрахунку способів?

**49.** Як змінюється задача, якщо монет кожного номіналу обмежена кількість?

**50.** Що станеться, якщо `amount` дуже велике (наприклад, 10⁹)?

### Відповіді

1. `3`
2. `[-1, 0]`
3. `'0 1 2 1 1 2 2 2 2 3 3'`
4. `[3, 3]`
5. `null`
6. `[3, 2]`
7. `[6, 3]`
8. `-1`
9. `[true, false]`
10. `true`
11. `6`
12. `4`
13. `[0, 1]`
14. `1`
15. `292`
16. `7`
17. `0`
18. `[4, 7]`
19. `[3, 2]`
20. `4`
21. `-1`
22. `true`
23. `7843`
24. `544`
25. `[3, 2]`
26. `[0, 1, 2, 1, 1, 2, 2, 2, 2, 3, 3]`
27. `7`
28. `89`
29. `2081`
30. `73682`
31. Приклад розв'язку:

   ```js
   function minCoinsExactCount(coins, amount, k) {
     let cur = new Set([0]);
     for (let i = 0; i < k; i++) {
       const nx = new Set();
       for (const s of cur) for (const c of coins) if (s + c <= amount) nx.add(s + c);
       cur = nx;
     }
     return cur.has(amount);
   }
   ```

   Виклик `[minCoinsExactCount([1, 5], 7, 3), minCoinsExactCount([1, 5], 7, 2), minCoinsExactCount([2], 4, 2)]` → `[true, false, true]`

32. Приклад розв'язку:

   ```js
   function coinChangeAllCombinations(coins, amount) {
     const c = coins.slice().sort((a, b) => a - b);
     const res = [], path = [];
     const go = (start, rest) => {
       if (rest === 0) {
         res.push(path.slice());
         return;
       }
       for (let i = start; i < c.length; i++) {
         if (c[i] > rest) break;
         path.push(c[i]);
         go(i, rest - c[i]);
         path.pop();
       }
     };
     go(0, amount);
     return res;
   }
   ```

   Виклик `[coinChangeAllCombinations([1, 2, 5], 5), coinChangeAllCombinations([2], 3)]` → `[[[1, 1, 1, 1, 1], [1, 1, 1, 2], [1, 2, 2], [5]], []]`

33. Приклад розв'язку:

   ```js
   const minCoinsLargestFirstGreedyOrBetter = (c, a) => [greedyCoins(c, a), minCoins(c, a)]
   ```

   Виклик `[minCoinsLargestFirstGreedyOrBetter([1, 3, 4], 6), minCoinsLargestFirstGreedyOrBetter([1, 5, 10], 17)]` → `[[3, 2], [4, 4]]`

34. Приклад розв'язку:

   ```js
   const frogJump = (steps, n) => combinationSum4(steps, n)
   ```

   Виклик `[frogJump([1, 2], 5), frogJump([1, 3, 5], 5), frogJump([2], 3)]` → `[8, 5, 0]`

35. Приклад розв'язку:

   ```js
   function makeAmountWithDistinctCoinsOnce(coins, amount) {
     const dp = new Array(amount + 1).fill(0);
     dp[0] = 1;
     for (const c of coins) for (let s = amount; s >= c; s--) dp[s] += dp[s - c];
     return dp[amount];
   }
   ```

   Виклик `[makeAmountWithDistinctCoinsOnce([1, 2, 5, 10], 8), makeAmountWithDistinctCoinsOnce([1, 2, 3], 6)]` → `[1, 1]`

36. Приклад розв'язку:

   ```js
   function minCostToCoverCalendar(days, costs) {
     const last = days[days.length - 1] || 0;
     const need = new Set(days);
     const dp = new Array(last + 1).fill(0);
     for (let d = 1; d <= last; d++) {
       if (!need.has(d)) {
         dp[d] = dp[d - 1];
         continue;
       }
       dp[d] = Math.min(dp[d - 1] + costs[0], dp[Math.max(0, d - 7)] + costs[1], dp[Math.max(0, d - 30)] + costs[2]);
     }
     return dp[last];
   }
   ```

   Виклик `[minCostToCoverCalendar([1, 4, 6, 7, 8, 20], [2, 7, 15]), minCostToCoverCalendar([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 30, 31], [2, 7, 15])]` → `[11, 17]`

37. Приклад розв'язку:

   ```js
   function coinsCountForEachAmount(coins, max) {
     const dp = minCoinsForAll(coins, max);
     return dp.slice(1).map(x => x === Infinity ? -1 : x);
   }
   ```

   Виклик `coinsCountForEachAmount([2, 5], 12)` → `[-1, 1, -1, 2, 1, 3, 2, 4, 3, 2, 4, 3]`

38. Приклад розв'язку:

   ```js
   function waysToWriteAsSumOfSquares(n) {
     const sq = [];
     for (let i = 1; i * i <= n; i++) sq.push(i * i);
     return change(sq, n);
   }
   ```

   Виклик `[waysToWriteAsSumOfSquares(10), waysToWriteAsSumOfSquares(25)]` → `[4, 19]`

39. Приклад розв'язку:

   ```js
   const integerPartitions = (n) => change(Array.from({ length: n }, (_, i) => i + 1), n)
   ```

   Виклик `[integerPartitions(5), integerPartitions(10), integerPartitions(1)]` → `[7, 42, 1]`

40. Приклад розв'язку:

   ```js
   function solveGreedyFailureCases(coins, limit) {
     const bad = [];
     for (let s = 1; s <= limit; s++) if (greedyCoins(coins, s) !== minCoins(coins, s)) bad.push(s);
     return bad;
   }
   ```

   Виклик `[solveGreedyFailureCases([1, 3, 4], 12), solveGreedyFailureCases([1, 5, 10, 25], 60)]` → `[[6, 10], []]`

41. Локальний вибір найбільшої монети не гарантує глобального оптимуму для довільних номіналів: для `[1, 3, 4]` і суми 6 він дає `4 + 1 + 1` (три монети), а оптимально `3 + 3`. Жадібність працює лише для канонічних систем.
42. `dp[s] = 1 + min(dp[s − c])` по монетах `c ≤ s`, `dp[0] = 0`; недосяжні стани — `∞`. Відповідь `dp[amount]`, або `−1`, якщо `∞`.
43. Коли зовнішній цикл по монетах, кожен набір враховується в єдиному порядку (спочатку всі монети першого номіналу, потім другого...), тому перестановки не дублюються. Зовнішній цикл по сумах дозволяє на кожному кроці вибрати будь-яку монету, тож різні порядки однакових монет рахуються окремо.
44. `O(amount · k)` часу й `O(amount)` пам'яті. Залежність від значення `amount`, а не від довжини його запису, робить складність експоненційною за розміром входу; тому задача NP-складна у загальному випадку.
45. Така, для якої жадібний алгоритм завжди дає мінімальну кількість монет для будь-якої суми. Прикладами є `[1, 5, 10, 25]` та євро; `[1, 3, 4]` неканонічна.
46. Монета — предмет необмеженої кількості з вагою, рівною номіналу. Для мінімуму монет цінність кожної дорівнює −1 (або мінімізуємо кількість), для кількості способів — підрахунок комбінацій у тому ж циклі вперед.
47. Вершини — суми від 0 до `amount`, ребро з `s` до `s + c` для кожної монети. Найкоротший шлях від 0 до `amount` за кількістю ребер дає мінімум монет; складність така сама `O(amount · k)`.
48. Є рівно один спосіб набрати суму 0 — не використовувати жодної монети (порожній набір). Усі інші `dp[s]` будуються з цієї бази додаванням монет.
49. Це обмежений рюкзак: кожну монету можна використати не більше `k` разів; застосовують ДП із перебором кількості або розклад `k` на степені двійки, що зводить задачу до 0/1-рюкзака.
50. Таблиця на `amount + 1` елементів неможлива. Для невеликої кількості номіналів застосовують математичні методи (залишки за модулем найменшої монети, метод Дейкстри на залишках) або жадібність для канонічних систем.
