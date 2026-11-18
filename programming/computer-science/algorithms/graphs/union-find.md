# Union-Find (Disjoint Set Union, DSU) — система неперетинних множин

Union-Find підтримує розбиття елементів на **неперетинні групи** і виконує дві операції майже за `O(1)`:

- `find(x)` — до якої групи належить `x` (повертає «представника» групи);
- `union(x, y)` — об'єднати групи `x` та `y`.

Це основа алгоритму Крускала ([kruskal.md](kruskal.md)), перевірки циклів у неорієнтованих графах, підрахунку компонент зв'язності **в динаміці** (ребра додаються), злиття акаунтів і багатьох задач про «групи».

## 1. Ідея: ліс дерев

Кожна група — **кореневе дерево**; корінь — представник. Масив `parent[i]` зберігає батька вершини `i`; корінь вказує на себе: `parent[r] = r`.

- `find(x)`: підніматись по `parent`, доки не дійдемо до кореня.
- `union(x, y)`: знайти корені `rx`, `ry`; якщо різні — підвісити один корінь під інший (`parent[rx] = ry`).

Без жодних оптимізацій дерево може вироджуватись у ланцюжок (union у «поганому» порядку), і `find` стає `O(n)`. Дві оптимізації роблять операції практично константними.

## 2. Оптимізація 1: стиснення шляху (path compression)

Під час `find(x)` усі вершини на шляху до кореня перепідвішуємо **безпосередньо під корінь**. Наступні `find` для них — `O(1)`. Один рядок: `parent[x] = find(parent[x])`.

## 3. Оптимізація 2: об'єднання за рангом / розміром (union by rank/size)

Підвішувати **менше** дерево під **більше** (за висотою — `rank`, або за кількістю вузлів — `size`). Тоді висота дерева не перевищує `log₂ n`.

## 4. Складність

- Лише стиснення шляху: амортизовано `O(log n)`.
- Лише об'єднання за рангом: `O(log n)` у гіршому випадку на операцію.
- **Обидві разом:** амортизовано **`O(α(n))`** на операцію, де `α` — обернена функція Аккермана. Вона зростає так повільно, що `α(n) ≤ 4` для будь-якого `n`, що вміщується у Всесвіт (`α(2^{65536}) = 5`). Практично — константа. Тарьян довів, що ця межа точна.
- **Пам'ять `O(n)`.**

Демонстрація: якщо 1000 елементів послідовно об'єднати в ланцюжок `union(0, 1), union(1, 2), …`, глибина найглибшого елемента без оптимізацій дорівнює 999, а з об'єднанням за розміром — лише 1.

## 5. Реалізація

```js
class DSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
    this.count = n;
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.size[ra] < this.size[rb]) [ra, rb] = [rb, ra];
    this.parent[rb] = ra;
    this.size[ra] += this.size[rb];
    this.count--;
    return true;
  }
  connected(a, b) {
    return this.find(a) === this.find(b);
  }
  sizeOf(x) {
    return this.size[this.find(x)];
  }
}

class NaiveDSU {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.steps = 0;
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.steps++;
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[ra] = rb;
  }
}

function maxDepth(parent) {
  let best = 0;
  for (let x = 0; x < parent.length; x++) {
    let d = 0;
    let y = x;
    while (parent[y] !== y) { y = parent[y]; d++; }
    best = Math.max(best, d);
  }
  return best;
}

function chainFindDepth(n, optimized) {
  const d = optimized ? new DSU(n) : new NaiveDSU(n);
  for (let i = 0; i + 1 < n; i++) d.union(i, i + 1);
  return maxDepth(d.parent);
}

function countComponents(n, edges) {
  const d = new DSU(n);
  for (const [u, v] of edges) d.union(u, v);
  return d.count;
}

function findRedundantConnection(edges) {
  const d = new DSU(edges.length + 1);
  for (const [u, v] of edges) if (!d.union(u, v)) return [u, v];
  return null;
}

function validTree(n, edges) {
  if (edges.length !== n - 1) return false;
  const d = new DSU(n);
  for (const [u, v] of edges) if (!d.union(u, v)) return false;
  return true;
}

function accountsMerge(accounts) {
  const d = new DSU(accounts.length);
  const owner = new Map();
  accounts.forEach(([, ...emails], i) => {
    for (const e of emails) {
      if (owner.has(e)) d.union(i, owner.get(e));
      else owner.set(e, i);
    }
  });
  const groups = new Map();
  for (const [e, i] of owner) {
    const r = d.find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(e);
  }
  return [...groups].map(([r, emails]) => [accounts[r][0], ...emails.sort()]).sort((a, b) => a.join().localeCompare(b.join()));
}

function numIslandsII(m, n, positions) {
  const d = new DSU(m * n);
  const land = new Array(m * n).fill(false);
  const res = [];
  let count = 0;
  for (const [r, c] of positions) {
    const id = r * n + c;
    if (land[id]) { res.push(count); continue; }
    land[id] = true;
    count++;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < m && nc < n && land[nr * n + nc] && d.union(id, nr * n + nc)) count--;
    }
    res.push(count);
  }
  return res;
}

function earliestAcquaintance(logs, n) {
  const d = new DSU(n);
  const sorted = logs.slice().sort((a, b) => a[0] - b[0]);
  for (const [t, x, y] of sorted) {
    d.union(x, y);
    if (d.count === 1) return t;
  }
  return -1;
}

function equationsPossible(equations) {
  const d = new DSU(26);
  const code = (c) => c.charCodeAt(0) - 97;
  for (const e of equations) if (e[1] === '=') d.union(code(e[0]), code(e[3]));
  for (const e of equations) if (e[1] === '!' && d.connected(code(e[0]), code(e[3]))) return false;
  return true;
}

function smallestStringWithSwaps(s, pairs) {
  const d = new DSU(s.length);
  for (const [a, b] of pairs) d.union(a, b);
  const groups = new Map();
  for (let i = 0; i < s.length; i++) {
    const r = d.find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(i);
  }
  const out = new Array(s.length);
  for (const idx of groups.values()) {
    const chars = idx.map((i) => s[i]).sort();
    idx.forEach((i, k) => { out[i] = chars[k]; });
  }
  return out.join('');
}

function makeConnected(n, connections) {
  if (connections.length < n - 1) return -1;
  const d = new DSU(n);
  for (const [a, b] of connections) d.union(a, b);
  return d.count - 1;
}
```

## 6. Приклади

`countComponents(5, [[0, 1], [1, 2], [3, 4]])` = `2`.

**Зайве ребро (redundant connection):** `findRedundantConnection([[1, 2], [1, 3], [2, 3]])` = `[2, 3]` — ребро, що замикає цикл (`union` повертає `false`, бо кінці вже в одній групі). Це і є основа алгоритму Крускала й перевірки «чи є цикл у неорієнтованому графі».

**Чи це дерево:** `validTree(5, [[0, 1], [0, 2], [0, 3], [1, 4]])` = `true`; `validTree(5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]])` = `false` (ребер `n` замість `n − 1`).

**Злиття акаунтів:** акаунти з спільною поштою — одна людина: `accountsMerge([['John', 'a@x', 'b@x'], ['John', 'b@x', 'c@x'], ['Mary', 'm@x']])` = `[['John', 'a@x', 'b@x', 'c@x'], ['Mary', 'm@x']]`.

**Острови в динаміці:** додаємо клітинки суші по одній; DSU рахує кількість островів після кожного кроку: `numIslandsII(3, 3, [[0, 0], [0, 1], [1, 2], [2, 1], [1, 1]])` = `[1, 1, 2, 3, 1]`. BFS/DFS перераховував би все з нуля — `O(m·n)` на кожне додавання.

**Рівняння:** `equationsPossible(['a==b', 'b!=a'])` = `false`; `equationsPossible(['a==b', 'b==c', 'a==c'])` = `true`.

**Обміни літер:** `smallestStringWithSwaps('dcab', [[0, 3], [1, 2]])` = `'bacd'`: літери в межах групи індексів можна переставляти довільно, тож сортуємо кожну групу.

## 7. Чому `union` повертає `bool`

Повертаючи `false`, коли елементи вже в одній групі, `union` стає детектором циклів: додали ребро `(u, v)`, а `union` каже «вже з'єднані» — отже, ребро замикає цикл.

## 8. Обмеження: DSU не вміє роз'єднувати

Класичний DSU підтримує лише **злиття**. Видалення ребра (розділення групи) потребує складніших структур: **offline dynamic connectivity** (поділ на відрізки + DSU з відкатом), link-cut trees, Euler tour trees. DSU з відкатом (rollback) використовує union by size **без** стиснення шляху й зберігає стек змін.

## 9. Типові помилки

1. **Забути стиснення шляху** і/або об'єднання за розміром — деградація до `O(n)`.
2. **`parent[a] = b` без пошуку коренів** — склеюється не групи, а лише елементи.
3. **Лічильник компонент** зменшувати лише при **успішному** `union`.
4. **Ініціалізувати `count` неправильно** (за кількістю ребер).
5. **Рекурсивний `find` на глибоких деревах** — `RangeError`; ітеративне стиснення (як тут).
6. **Використовувати `size` кореня** лише, коли `x` — корінь (`sizeOf` через `find`).
7. **Індексація вершин з 1** без розширення масиву.
8. **Очікувати роз'єднання** — DSU цього не вміє.
9. **Плутати з DFS-компонентами:** DSU вигідний, коли ребра приходять потоком.

## 10. Алгоритм (стисло)

1. `parent[i] = i`, `size[i] = 1`.
2. `find(x)`: піднятись до кореня, стискаючи шлях.
3. `union(a, b)`: знайти корені; якщо різні — меншу групу підвісити під більшу, оновити `size`.
4. Амортизовано `O(α(n))` на операцію.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Скільки груп у `new DSU(5)` до будь-яких об'єднань?

```js
new DSU(5).count
```

**2.** Скільки груп залишиться після `union(0, 1)`, `union(1, 2)`, `union(3, 4)` для `DSU(5)`?

```js
(() => { const d = new DSU(5); d.union(0, 1); d.union(1, 2); d.union(3, 4); return d.count; })()
```

**3.** Що поверне повторний `union(0, 2)` після об'єднання `0-1-2`?

```js
(() => { const d = new DSU(3); d.union(0, 1); d.union(1, 2); return d.union(0, 2); })()
```

**4.** Чи пов'язані `0` та `4` після `union(0, 1)`, `union(2, 3)`, `union(1, 2)`? А `0` та `3`?

```js
(() => { const d = new DSU(5); d.union(0, 1); d.union(2, 3); d.union(1, 2); return [d.connected(0, 4), d.connected(0, 3)]; })()
```

**5.** Який розмір групи елемента `0` після об'єднань `0-1-2`?

```js
(() => { const d = new DSU(5); d.union(0, 1); d.union(1, 2); return d.sizeOf(0); })()
```

**6.** Який вигляд має `parent` після `union(0, 1)`, `union(2, 3)`, `union(0, 2)` для `DSU(4)`?

```js
(() => { const d = new DSU(4); d.union(0, 1); d.union(2, 3); d.union(0, 2); return d.parent; })()
```

**7.** Як змінюється `parent` після `find(3)` зі стисненням шляху в ланцюжку, зібраному `NaiveDSU`? (змоделюйте для DSU з розміром)

```js
(() => { const d = new DSU(4); d.parent = [0, 0, 1, 2]; d.find(3); return d.parent; })()
```

**8.** Скільки кроків робить `find(0)` у `NaiveDSU(1000)`, де об'єднано ланцюжок `0→1→…→999`?

```js
chainFindDepth(1000, false)
```

**9.** А максимальна глибина з об'єднанням за розміром?

```js
chainFindDepth(1000, true)
```

**10.** Яка максимальна глибина дерева для `n = 1024` елементів при об'єднанні за розміром у «найгіршому» порядку (парне злиття рівних дерев)?

```js
(() => { const d = new DSU(1024); for (let step = 1; step < 1024; step *= 2) for (let i = 0; i + step < 1024; i += 2 * step) d.union(i, i + step); return maxDepth(d.parent); })()
```

**11.** Що поверне `countComponents(5, [[0, 1], [1, 2], [3, 4]])`?

```js
countComponents(5, [[0, 1], [1, 2], [3, 4]])
```

**12.** Що поверне `countComponents(4, [])` та `countComponents(1, [])`?

```js
[countComponents(4, []), countComponents(1, [])]
```

**13.** Що поверне `findRedundantConnection([[1, 2], [1, 3], [2, 3]])`?

```js
findRedundantConnection([[1, 2], [1, 3], [2, 3]])
```

### Рівень 2. Робота алгоритму

**14.** А `findRedundantConnection([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]])`?

```js
findRedundantConnection([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]])
```

**15.** Чи є деревом `validTree(5, [[0, 1], [0, 2], [0, 3], [1, 4]])` та `validTree(5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]])`?

```js
[validTree(5, [[0, 1], [0, 2], [0, 3], [1, 4]]), validTree(5, [[0, 1], [1, 2], [2, 3], [1, 3], [1, 4]])]
```

**16.** Чи є деревом незв'язний граф із двома компонентами та `n − 1` ребрами `validTree(4, [[0, 1], [0, 1], [2, 3]])`?

```js
validTree(4, [[0, 1], [0, 1], [2, 3]])
```

**17.** Що поверне `accountsMerge([['John', 'a@x', 'b@x'], ['John', 'b@x', 'c@x'], ['Mary', 'm@x']])`?

```js
accountsMerge([['John', 'a@x', 'b@x'], ['John', 'b@x', 'c@x'], ['Mary', 'm@x']])
```

**18.** Що поверне `accountsMerge` для двох акаунтів з одним ім'ям, але різними поштами?

```js
accountsMerge([['A', 'a1@x'], ['A', 'a2@x']])
```

**19.** Що поверне `numIslandsII(3, 3, [[0, 0], [0, 1], [1, 2], [2, 1], [1, 1]])`?

```js
numIslandsII(3, 3, [[0, 0], [0, 1], [1, 2], [2, 1], [1, 1]])
```

**20.** Що поверне `numIslandsII(1, 1, [[0, 0], [0, 0]])` (повторне додавання)?

```js
numIslandsII(1, 1, [[0, 0], [0, 0]])
```

**21.** Коли всі познайомляться: `earliestAcquaintance([[20190101, 0, 1], [20190104, 3, 4], [20190107, 2, 3], [20190211, 1, 5], [20190224, 2, 4], [20190301, 0, 3], [20190312, 1, 2], [20190322, 4, 5]], 6)`?

```js
earliestAcquaintance([[20190101, 0, 1], [20190104, 3, 4], [20190107, 2, 3], [20190211, 1, 5], [20190224, 2, 4], [20190301, 0, 3], [20190312, 1, 2], [20190322, 4, 5]], 6)
```

**22.** Що поверне `equationsPossible(['a==b', 'b!=a'])` та `equationsPossible(['a==b', 'b==c', 'a==c'])`?

```js
[equationsPossible(['a==b', 'b!=a']), equationsPossible(['a==b', 'b==c', 'a==c'])]
```

**23.** Що поверне `equationsPossible(['a==b', 'b!=c', 'c==a'])`?

```js
equationsPossible(['a==b', 'b!=c', 'c==a'])
```

**24.** Що поверне `smallestStringWithSwaps('dcab', [[0, 3], [1, 2]])` та `('dcab', [[0, 3], [1, 2], [0, 2]])`?

```js
[smallestStringWithSwaps('dcab', [[0, 3], [1, 2]]), smallestStringWithSwaps('dcab', [[0, 3], [1, 2], [0, 2]])]
```

**25.** Скільки кабелів треба перемістити в `makeConnected(4, [[0, 1], [0, 2], [1, 2]])` та `makeConnected(6, [[0, 1], [0, 2], [0, 3], [1, 2]])`?

```js
[makeConnected(4, [[0, 1], [0, 2], [1, 2]]), makeConnected(6, [[0, 1], [0, 2], [0, 3], [1, 2]])]
```

**26.** Скільки операцій `find` у середньому приблизно для `α(n) ≤ 4` — яка `α(2^65536)`? (довідкове значення `5`) Порівняйте `log₂(10⁹)` із цим числом.

```js
[5, Math.round(Math.log2(1e9))]
```

### Рівень 3. Складність і нюанси

**27.** Скільки різних груп містить `DSU(8)` після об'єднань `(0,1) (2,3) (4,5) (6,7) (0,2) (4,6)`?

```js
(() => { const d = new DSU(8); [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [4, 6]].forEach(([a, b]) => d.union(a, b)); return d.count; })()
```

**28.** Напишіть `groupsAsArrays(n, pairs)` — усі групи як масиви елементів (відсортовані за мінімальним елементом).

**29.** Напишіть `friendCircles(isConnected)` — кількість груп друзів за матрицею суміжності.

**30.** Напишіть `largestComponentSize(n, edges)` — розмір найбільшої групи.

**31.** Напишіть `surroundedRegionsDsu(board)` — кількість клітинок `'O'`, що не з'єднані з краєм, використовуючи DSU з фіктивним вузлом «край».

**32.** Напишіть `weightedDsuQuotient(equations, values, queries)` — відповіді на запити `a / c` за рівностями `a / b = v` (DSU з вагами; поверніть `-1`, якщо невідомо).

**33.** Напишіть `kruskalLikeCycleCheck(n, edges)` — чи є цикл у неорієнтованому графі (через `union`).

**34.** Напишіть `minSwapsCouples(row)` — мінімум обмінів, щоб пари `(2i, 2i + 1)` сиділи поруч (DSU по парах: відповідь — `пар − компонент`).

**35.** Напишіть `similarStringGroups(strs)` — кількість груп «схожих» рядків (однакових або відрізняються рівно двома позиціями).

**36.** Напишіть `redundantDirectedFree(n, edges)` — кількість ребер, видалення яких не змінює компонент (ребра, що замикають цикл): `edges.length − (n − компонент)`.

**37.** Яка основна ідея Union-Find?

**38.** Що дає стиснення шляху?

**39.** Що таке об'єднання за рангом чи розміром?

### Рівень 4. Задачі з інтерв'ю

**40.** Яка складність Union-Find з обома оптимізаціями?

**41.** Чому `union` часто повертає булеве значення?

**42.** Чого Union-Find не вміє і що робити?

**43.** Чим DSU кращий за DFS для підрахунку компонент?

**44.** Чому в DSU корінь вказує на себе?

**45.** Як DSU використовується в алгоритмі Крускала?

**46.** Чому ітеративний `find` краще рекурсивного?

**47.** Що поверне `new DSU(3).find(2)` та `new DSU(3).connected(0, 1)`?

```js
[new DSU(3).find(2), new DSU(3).connected(0, 1)]
```

**48.** Який розмір групи кожного елемента після `union(0, 1)`, `union(2, 3)` у `DSU(5)`?

```js
(() => { const d = new DSU(5); d.union(0, 1); d.union(2, 3); return [0, 1, 2, 3, 4].map(i => d.sizeOf(i)); })()
```

**49.** Який корінь у групи після `union(3, 4)` для `DSU(5)` (більша група — `3` та `4` однакового розміру)?

```js
(() => { const d = new DSU(5); d.union(3, 4); return [d.find(3), d.find(4)]; })()
```

**50.** Скільки `union` повернуть `true`, якщо спробувати 10 ребер, що утворюють повний граф `K4` (6 ребер) разом з 4 дублікатами?

```js
(() => { const d = new DSU(4); const edges = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3], [0, 1], [1, 2], [2, 3], [3, 0]]; return edges.filter(([a, b]) => d.union(a, b)).length; })()
```

### Відповіді

1. `5`
2. `2`
3. `false`
4. `[false, true]`
5. `3`
6. `[0, 0, 0, 2]`
7. `[0, 0, 1, 1]`
8. `999`
9. `1`
10. `10`
11. `2`
12. `[4, 1]`
13. `[2, 3]`
14. `[1, 4]`
15. `[true, false]`
16. `false`
17. `[['John', 'a@x', 'b@x', 'c@x'], ['Mary', 'm@x']]`
18. `[['A', 'a1@x'], ['A', 'a2@x']]`
19. `[1, 1, 2, 3, 1]`
20. `[1, 1]`
21. `20190301`
22. `[false, true]`
23. `false`
24. `['bacd', 'abcd']`
25. `[1, -1]`
26. `[5, 30]`
27. `2`
28. Приклад розв'язку:

   ```js
   function groupsAsArrays(n, pairs) {
     const d = new DSU(n);
     pairs.forEach(([a, b]) => d.union(a, b));
     const m = new Map();
     for (let i = 0; i < n; i++) {
       const r = d.find(i);
       if (!m.has(r)) m.set(r, []);
       m.get(r).push(i);
     }
     return [...m.values()].sort((a, b) => a[0] - b[0]);
   }
   ```

   Виклик `groupsAsArrays(6, [[0, 1], [2, 3], [1, 4]])` → `[[0, 1, 4], [2, 3], [5]]`

29. Приклад розв'язку:

   ```js
   function friendCircles(m) {
     const d = new DSU(m.length);
     for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) if (m[i][j]) d.union(i, j);
     return d.count;
   }
   ```

   Виклик `[friendCircles([[1, 1, 0], [1, 1, 0], [0, 0, 1]]), friendCircles([[1, 0], [0, 1]])]` → `[2, 2]`

30. Приклад розв'язку:

   ```js
   function largestComponentSize(n, edges) {
     const d = new DSU(n);
     edges.forEach(([a, b]) => d.union(a, b));
     let best = 0;
     for (let i = 0; i < n; i++) best = Math.max(best, d.sizeOf(i));
     return best;
   }
   ```

   Виклик `[largestComponentSize(6, [[0, 1], [1, 2], [3, 4]]), largestComponentSize(3, [])]` → `[3, 1]`

31. Приклад розв'язку:

   ```js
   function surroundedRegionsDsu(b) {
     const R = b.length, C = b[0].length;
     const d = new DSU(R * C + 1);
     const edge = R * C;
     for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
       if (b[r][c] !== 'O') continue;
       const id = r * C + c;
       if (r === 0 || c === 0 || r === R - 1 || c === C - 1) d.union(id, edge);
       if (r + 1 < R && b[r + 1][c] === 'O') d.union(id, id + C);
       if (c + 1 < C && b[r][c + 1] === 'O') d.union(id, id + 1);
     }
     let n = 0;
     for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (b[r][c] === 'O' && !d.connected(r * C + c, edge)) n++;
     return n;
   }
   ```

   Виклик `surroundedRegionsDsu([['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']])` → `3`

32. Приклад розв'язку:

   ```js
   function weightedDsuQuotient(eq, vals, qs) {
     const parent = {}, w = {};
     const find = (x) => {
       if (parent[x] !== x) {
         const p = parent[x];
         parent[x] = find(p);
         w[x] *= w[p];
       }
       return parent[x];
     };
     const add = (x) => {
       if (!(x in parent)) {
         parent[x] = x;
         w[x] = 1;
       }
     };
     eq.forEach(([a, b], i) => { add(a); add(b); const ra = find(a), rb = find(b); if (ra !== rb) { parent[ra] = rb; w[ra] = vals[i] * w[b] / w[a]; } });
     return qs.map(([a, b]) => (a in parent && b in parent && find(a) === find(b)) ? w[a] / w[b] : -1);
   }
   ```

   Виклик `weightedDsuQuotient([['a', 'b'], ['b', 'c']], [2, 3], [['a', 'c'], ['b', 'a'], ['a', 'e'], ['a', 'a']])` → `[6, 0.5, -1, 1]`

33. Приклад розв'язку:

   ```js
   function kruskalLikeCycleCheck(n, edges) {
     const d = new DSU(n);
     for (const [u, v] of edges) if (!d.union(u, v)) return true;
     return false;
   }
   ```

   Виклик `[kruskalLikeCycleCheck(3, [[0, 1], [1, 2]]), kruskalLikeCycleCheck(3, [[0, 1], [1, 2], [2, 0]])]` → `[false, true]`

34. Приклад розв'язку:

   ```js
   function minSwapsCouples(row) {
     const n = row.length / 2;
     const d = new DSU(n);
     for (let i = 0; i < n; i++) d.union(row[2 * i] >> 1, row[2 * i + 1] >> 1);
     return n - d.count;
   }
   ```

   Виклик `[minSwapsCouples([0, 2, 1, 3]), minSwapsCouples([3, 2, 0, 1])]` → `[1, 0]`

35. Приклад розв'язку:

   ```js
   function similarStringGroups(s) {
     const sim = (a, b) => {
       let d = 0;
       for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++d > 2) return false;
       return d === 0 || d === 2;
     };
     const d = new DSU(s.length);
     for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if (sim(s[i], s[j])) d.union(i, j);
     return d.count;
   }
   ```

   Виклик `similarStringGroups(['tars', 'rats', 'arts', 'star'])` → `2`

36. Приклад розв'язку:

   ```js
   function redundantDirectedFree(n, edges) {
     const d = new DSU(n);
     edges.forEach(([a, b]) => d.union(a, b));
     return edges.length - (n - d.count);
   }
   ```

   Виклик `[redundantDirectedFree(4, [[0, 1], [1, 2], [2, 0], [2, 3]]), redundantDirectedFree(3, [[0, 1]])]` → `[1, 0]`

37. Кожна група зберігається як кореневе дерево з представником-коренем. `find` піднімається до кореня, `union` підвішує корінь однієї групи під корінь іншої; завдяки двом оптимізаціям обидві операції майже `O(1)`.
38. Під час `find` усі вершини на шляху перепідвішують ближче до кореня (безпосередньо під нього або через прапор «на рівень вище»). Наступні пошуки для них коротші, а загальна амортизована вартість зменшується.
39. Меншу групу (за висотою чи кількістю елементів) завжди підвішують під більшу. Це обмежує висоту дерева значенням `log₂ n`, оскільки глибина елемента збільшується лише коли його група потрапляє під більшу — тобто розмір подвоюється.
40. Амортизовано `O(α(n))` на операцію, де `α` — обернена функція Аккермана; для будь-яких практичних `n` це не більше 4–5, тобто фактично константа.
41. Воно показує, чи були елементи в різних групах. `false` означає, що ребро з'єднує вже зв'язані вершини, тобто замикає цикл — цього достатньо для перевірки циклів і для алгоритму Крускала.
42. Класичний DSU не підтримує розділення груп (видалення ребра). Для таких задач застосовують offline-алгоритми (розбиття на відрізки часу з DSU з відкатом), link-cut tree або Euler tour tree.
43. Коли ребра додаються поступово (онлайн), DSU оновлює кількість груп за `O(α(n))` на ребро, тоді як DFS довелося б перераховувати компоненти заново. Для статичного графа обидва підходи лінійні.
44. Це ознака кореня: цикл `find` завершується, коли `parent[x] === x`. Така домовленість не потребує спеціального значення `null` і спрощує код.
45. Ребра сортують за вагою й додають до кістяка, якщо кінці ребра в різних групах (`union` повернув `true`); інакше ребро створило б цикл і його пропускають.
46. Дерево може бути глибоким до оптимізацій (або після певної послідовності `union`), і рекурсивний `find` ризикує переповнити стек викликів; ітеративна версія зі стисненням шляху «навпіл» не має цієї проблеми.
47. `[2, false]`
48. `[2, 2, 2, 2, 1]`
49. `[3, 3]`
50. `3`
