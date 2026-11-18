# Topological Sort — топологічне сортування

Топологічне сортування впорядковує вершини **орієнтованого ациклічного графа (DAG)** так, що для кожного ребра `u → v` вершина `u` стоїть **перед** `v`. Це відповідь на питання «у якому порядку виконувати завдання, якщо одні залежать від інших»: порядок вивчення курсів, збірка проєкту (`make`), порядок ініціалізації модулів, обчислення клітинок електронної таблиці, порядок міграцій бази даних.

## 1. Коли топологічний порядок існує

Існує **тоді й лише тоді**, коли граф **ациклічний**. Цикл `A → B → C → A` означає: `A` перед `B`, `B` перед `C`, `C` перед `A` — суперечність. Тому алгоритм водночас **виявляє цикли**.

Порядок зазвичай **не єдиний**: у графа `A → C`, `B → C` порядки `A, B, C` і `B, A, C` обидва правильні. Єдиний порядок існує тоді й лише тоді, коли в графі є **гамільтонів шлях** (усі послідовні вершини з'єднані ребрами).

## 2. Алгоритм Кана (Kahn) — BFS за ступенем входу

Ідея: **вершина без вхідних ребер** (залежностей) може йти першою.

1. Порахувати **вхідний ступінь** `indegree[v]` — кількість ребер, що входять у `v`.
2. Покласти в чергу всі вершини з `indegree = 0`.
3. Поки черга не порожня: узяти `v`, додати до результату; для кожного сусіда `u` зменшити `indegree[u]`; якщо став `0` — у чергу.
4. Якщо в результаті **менше** вершин, ніж у графі — є цикл (вершини в циклі ніколи не отримають `indegree = 0`).

Приклад: залежності курсів `Алгебра → Аналіз`, `Алгебра → Статистика`, `Аналіз → ML`, `Статистика → ML`, `Програмування → ML`. Порядок Кана: `['Algebra', 'Programming', 'Analysis', 'Statistics', 'ML']`. Вхідні ступені: `{ Algebra: 0, Analysis: 1, Statistics: 1, Programming: 0, ML: 3 }`.

Трасування:

- початкова черга: [Algebra, Programming]
- беремо Algebra, звільнено: Analysis, Statistics
- беремо Programming, нічого не звільнено
- беремо Analysis, нічого не звільнено
- беремо Statistics, звільнено: ML
- беремо ML, нічого не звільнено

## 3. Алгоритм на основі DFS

DFS обходить граф; **після** того як усі нащадки вершини опрацьовані, додаємо її в список («post-order»). Розвернутий список — топологічний порядок.

Чому це правильно: коли `v` завершується, усі вершини, досяжні з `v`, вже завершені (і вже в списку). Тому в розвернутому списку `v` стоїть **перед** усіма ними. Цикл виявляється як «зворотне ребро» (вершина в стані «у процесі»), див. [dfs.md](dfs.md). `topoDfs(courses)` = `['Programming', 'Algebra', 'Statistics', 'Analysis', 'ML']` — **інший** допустимий порядок.

## 4. Реалізація

```js
const courses = {
  Algebra: ['Analysis', 'Statistics'],
  Analysis: ['ML'],
  Statistics: ['ML'],
  Programming: ['ML'],
  ML: [],
};

function inDegrees(g) {
  const deg = {};
  for (const v of Object.keys(g)) deg[v] = 0;
  for (const v of Object.keys(g)) for (const u of g[v]) deg[u]++;
  return deg;
}

function kahn(g) {
  const deg = inDegrees(g);
  const queue = Object.keys(g).filter((v) => deg[v] === 0);
  const order = [];
  for (let h = 0; h < queue.length; h++) {
    const v = queue[h];
    order.push(v);
    for (const u of g[v]) if (--deg[u] === 0) queue.push(u);
  }
  return { order, hasCycle: order.length !== Object.keys(g).length };
}

function kahnTrace(g) {
  const deg = inDegrees(g);
  const queue = Object.keys(g).filter((v) => deg[v] === 0);
  const out = ['початкова черга: [' + queue.join(', ') + ']'];
  for (let h = 0; h < queue.length; h++) {
    const v = queue[h];
    const freed = [];
    for (const u of g[v]) if (--deg[u] === 0) { queue.push(u); freed.push(u); }
    out.push('беремо ' + v + (freed.length ? ', звільнено: ' + freed.join(', ') : ', нічого не звільнено'));
  }
  return out;
}

function topoDfs(g) {
  const state = {};
  const out = [];
  let cyc = false;
  const go = (v) => {
    state[v] = 1;
    for (const u of g[v]) {
      if (state[u] === 1) cyc = true;
      else if (!state[u]) go(u);
    }
    state[v] = 2;
    out.push(v);
  };
  for (const v of Object.keys(g)) if (!state[v]) go(v);
  return cyc ? null : out.reverse();
}

function lexSmallestTopo(g) {
  const deg = inDegrees(g);
  const ready = Object.keys(g).filter((v) => deg[v] === 0).sort();
  const order = [];
  while (ready.length) {
    const v = ready.shift();
    order.push(v);
    for (const u of g[v]) if (--deg[u] === 0) {
      ready.push(u);
      ready.sort();
    }
  }
  return order.length === Object.keys(g).length ? order : null;
}

function countTopoOrders(g) {
  const keys = Object.keys(g);
  const deg = inDegrees(g);
  const placed = new Set();
  let count = 0;
  const go = () => {
    if (placed.size === keys.length) { count++; return; }
    for (const v of keys) {
      if (placed.has(v) || deg[v] !== 0) continue;
      placed.add(v);
      for (const u of g[v]) deg[u]--;
      go();
      for (const u of g[v]) deg[u]++;
      placed.delete(v);
    }
  };
  go();
  return count;
}

function canFinish(n, prerequisites) {
  const g = Object.fromEntries(Array.from({ length: n }, (_, i) => [i, []]));
  for (const [a, b] of prerequisites) g[b].push(a);
  return !kahn(g).hasCycle;
}

function findOrder(n, prerequisites) {
  const g = Object.fromEntries(Array.from({ length: n }, (_, i) => [i, []]));
  for (const [a, b] of prerequisites) g[b].push(a);
  const r = kahn(g);
  return r.hasCycle ? [] : r.order.map(Number);
}

function parallelLevels(g) {
  const deg = inDegrees(g);
  let layer = Object.keys(g).filter((v) => deg[v] === 0);
  const levels = [];
  let seen = 0;
  while (layer.length) {
    levels.push(layer);
    seen += layer.length;
    const next = [];
    for (const v of layer) for (const u of g[v]) if (--deg[u] === 0) next.push(u);
    layer = next;
  }
  return seen === Object.keys(g).length ? levels : null;
}

function longestPathDag(g) {
  const order = topoDfs(g);
  const dist = Object.fromEntries(Object.keys(g).map((v) => [v, 0]));
  for (const v of order) for (const u of g[v]) dist[u] = Math.max(dist[u], dist[v] + 1);
  return Math.max(...Object.values(dist));
}

function alienOrder(words) {
  const g = {};
  for (const w of words) for (const c of w) g[c] = g[c] || [];
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (a.length > b.length && a.startsWith(b)) return '';
    for (let j = 0; j < Math.min(a.length, b.length); j++) {
      if (a[j] !== b[j]) {
        if (!g[a[j]].includes(b[j])) g[a[j]].push(b[j]);
        break;
      }
    }
  }
  const r = kahn(g);
  return r.hasCycle ? '' : r.order.join('');
}

function isValidTopo(g, order) {
  const pos = {};
  order.forEach((v, i) => { pos[v] = i; });
  return Object.keys(g).every((v) => g[v].every((u) => pos[v] < pos[u]));
}
```

## 5. Застосування

- **Планування курсів / залежностей задач:** `canFinish(2, [[1, 0]])` = `true`, `canFinish(2, [[1, 0], [0, 1]])` = `false`; `findOrder(4, [[1, 0], [2, 0], [3, 1], [3, 2]])` = `[0, 1, 2, 3]`.
- **Збірка проєктів** (`make`, Bazel, npm/webpack, Gradle) — порядок компіляції модулів.
- **Паралельне планування:** вершини одного шару не залежать одна від одної — їх можна виконувати паралельно: `parallelLevels(courses)` = `[['Algebra', 'Programming'], ['Analysis', 'Statistics'], ['ML']]`; кількість шарів — **мінімальний час**, якщо задачі тривають однаково.
- **Найдовший шлях у DAG** (критичний шлях, PERT/CPM): `longestPathDag(courses)` = `2` ребра. Динамічне програмування за топологічним порядком — за `O(V + E)`; те саме працює для найкоротших шляхів у DAG із вагами (навіть від'ємними).
- **Інопланетний словник:** за відсортованим списком слів відновити порядок літер: `alienOrder(['wrt', 'wrf', 'er', 'ett', 'rftt'])` = `'wertf'`.
- **Електронні таблиці:** порядок обчислення клітинок за залежностями; цикл — помилка `#REF`.
- **Міграції бази даних, ініціалізація залежностей (DI-контейнери)**, порядок видалення записів із зовнішніми ключами.
- **Лексикографічно найменший порядок:** `lexSmallestTopo(courses)` = `['Algebra', 'Analysis', 'Programming', 'Statistics', 'ML']` (замість черги — мін-купа).

## 6. Кількість топологічних порядків

Підрахунок усіх порядків — задача **#P-повна** у загальному випадку, але для малих графів — перебір (`countTopoOrders`). Для `courses`: `8` порядків. Лінійний ланцюжок `1 → 2 → 3` має рівно `1` порядок, а три незалежні вершини — `6` (= 3!).

## 7. Складність

- **Кан і DFS: `O(V + E)`** часу, `O(V)` пам'яті.
- Лексикографічно найменший порядок із купою — `O((V + E) log V)`.
- Перевірка порядку — `O(V + E)` (`isValidTopo`).

## 8. Кан чи DFS

| | Кан (BFS) | DFS |
|---|---|---|
| Виявлення циклу | кількість вершин у результаті менша | зворотне ребро |
| Шари для паралельності | природно | ні |
| Лексикографічний порядок | з купою | складніше |
| Рекурсія | немає | є (глибина) |

## 9. Типові помилки

1. **Неправильний напрямок ребер** (залежність `A → B`: «A потрібне для B», тоді `A` першою; для `[a, b]` у LeetCode `b → a`).
2. **Не рахувати вершини без ребер** (їх немає в списках суміжності) — виходять із результату.
3. **Не виявити цикл**: повернути часткову відповідь як повну.
4. **Вхідний ступінь для вершин, що трапляються лише як сусіди,** — ініціалізувати для всіх вершин.
5. **Кілька однакових ребер** збільшують ступінь кілька разів — уніфікуйте або враховуйте послідовно (вони й зменшують кілька разів — це узгоджено).
6. **Єдиність порядку** — не очікуйте її; для детермінованості використайте купу чи сортування.
7. **Рекурсивний DFS** на глибоких графах — `RangeError`.
8. **Топологічне сортування в графі з циклами** — не існує; для SCC використовуйте конденсацію ([tarjan-scc.md](tarjan-scc.md)).

## 10. Алгоритм (стисло)

1. Порахувати `indegree` для всіх вершин.
2. Черга ← вершини з `indegree = 0`.
3. Поки черга не порожня: узяти `v`, додати до порядку, зменшити `indegree` сусідів; ті, що стали `0`, — у чергу.
4. Якщо порядок коротший за кількість вершин — є цикл.
5. Час `O(V + E)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які вхідні ступені в `courses`?

```js
inDegrees(courses)
```

**2.** Що поверне `kahn(courses)`?

```js
kahn(courses)
```

**3.** Які кроки виконує `kahnTrace(courses)`?

```js
kahnTrace(courses)
```

**4.** Що поверне `topoDfs(courses)`? Чи збігається з порядком Кана?

```js
[topoDfs(courses), JSON.stringify(topoDfs(courses)) === JSON.stringify(kahn(courses).order)]
```

**5.** Чи є обидва порядки коректними топологічними?

```js
[isValidTopo(courses, kahn(courses).order), isValidTopo(courses, topoDfs(courses))]
```

**6.** Чи коректний порядок `['ML', 'Algebra', 'Analysis', 'Statistics', 'Programming']`?

```js
isValidTopo(courses, ['ML', 'Algebra', 'Analysis', 'Statistics', 'Programming'])
```

**7.** Що поверне `kahn` для графа з циклом `{ A: ['B'], B: ['C'], C: ['A'] }`?

```js
kahn({ A: ['B'], B: ['C'], C: ['A'] })
```

**8.** Що поверне `topoDfs` для цього графа з циклом?

```js
topoDfs({ A: ['B'], B: ['C'], C: ['A'] })
```

**9.** Що поверне `kahn` для частково циклічного `{ S: ['A'], A: ['B'], B: ['A'], T: [] }`? (які вершини потраплять у порядок)

```js
kahn({ S: ['A'], A: ['B'], B: ['A'], T: [] })
```

**10.** Що поверне `kahn({})` для порожнього графа?

```js
kahn({})
```

**11.** Що поверне порядок для графа без ребер `{ x: [], y: [], z: [] }`?

```js
kahn({ x: [], y: [], z: [] }).order
```

**12.** Що поверне `canFinish(2, [[1, 0]])` та `canFinish(2, [[1, 0], [0, 1]])`?

```js
[canFinish(2, [[1, 0]]), canFinish(2, [[1, 0], [0, 1]])]
```

**13.** Що поверне `findOrder(4, [[1, 0], [2, 0], [3, 1], [3, 2]])`?

```js
findOrder(4, [[1, 0], [2, 0], [3, 1], [3, 2]])
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `findOrder(2, [[1, 0], [0, 1]])`?

```js
findOrder(2, [[1, 0], [0, 1]])
```

**15.** Що поверне `findOrder(1, [])`?

```js
findOrder(1, [])
```

**16.** Які шари паралельного виконання дає `parallelLevels(courses)`?

```js
parallelLevels(courses)
```

**17.** Скільки шарів (мінімум кроків при необмеженому паралелізмі) у `parallelLevels` для ланцюжка `1 → 2 → 3 → 4`?

```js
parallelLevels({ 1: [2], 2: [3], 3: [4], 4: [] }).length
```

**18.** Що поверне `parallelLevels` для графа з циклом?

```js
parallelLevels({ A: ['B'], B: ['A'] })
```

**19.** Яка довжина найдовшого шляху в `courses` (у ребрах)?

```js
longestPathDag(courses)
```

**20.** Яка довжина найдовшого шляху в `{ a: ['b', 'c'], b: ['d'], c: ['d'], d: ['e'], e: [] }`?

```js
longestPathDag({ a: ['b', 'c'], b: ['d'], c: ['d'], d: ['e'], e: [] })
```

**21.** Що поверне `alienOrder(['wrt', 'wrf', 'er', 'ett', 'rftt'])`?

```js
alienOrder(['wrt', 'wrf', 'er', 'ett', 'rftt'])
```

**22.** Що поверне `alienOrder(['z', 'x', 'z'])` (суперечність)?

```js
alienOrder(['z', 'x', 'z'])
```

**23.** Що поверне `alienOrder(['abc', 'ab'])` (довше слово перед своїм префіксом)?

```js
alienOrder(['abc', 'ab'])
```

**24.** Що поверне `alienOrder(['z', 'x'])`?

```js
alienOrder(['z', 'x'])
```

**25.** Що поверне `lexSmallestTopo(courses)`?

```js
lexSmallestTopo(courses)
```

**26.** Скільки топологічних порядків у `courses`?

```js
countTopoOrders(courses)
```

### Рівень 3. Складність і нюанси

**27.** Скільки порядків у ланцюжка `1 → 2 → 3` та в трьох незалежних вершин?

```js
[countTopoOrders({ 1: [2], 2: [3], 3: [] }), countTopoOrders({ a: [], b: [], c: [] })]
```

**28.** Скільки порядків у «ромба» `A → B, A → C, B → D, C → D`?

```js
countTopoOrders({ A: ['B', 'C'], B: ['D'], C: ['D'], D: [] })
```

**29.** Скільки порядків у «зірки» `A → B, A → C, A → D`?

```js
countTopoOrders({ A: ['B', 'C', 'D'], B: [], C: [], D: [] })
```

**30.** Чи змінюється вхідний ступінь, якщо додати дублююче ребро `A → B` двічі? Порівняйте `inDegrees`.

```js
[inDegrees({ A: ['B'], B: [] }), inDegrees({ A: ['B', 'B'], B: [] })]
```

**31.** Чи завершиться `kahn` для графа з двома однаковими ребрами `{ A: ['B', 'B'], B: [] }`?

```js
kahn({ A: ['B', 'B'], B: [] })
```

**32.** Напишіть `buildOrder(projects, dependencies)` — порядок збирання проєктів (`[залежність, проєкт]`), або `null`, якщо це неможливо.

**33.** Напишіть `minSemesters(n, relations)` — мінімум семестрів для проходження всіх курсів (`[prev, next]`; без обмеження на кількість курсів у семестрі), або `-1`.

**34.** Напишіть `sequenceReconstruction(nums, sequences)` — чи є `nums` **єдиною** найкоротшою надпослідовністю (перевірте, що на кожному кроці Кана в черзі рівно один елемент).

**35.** Напишіть `allTopoOrders(g)` — усі топологічні порядки (backtracking).

**36.** Напишіть `shortestPathInDag(g, w, s)` — найкоротші відстані від `s` у DAG із вагами за порядком DFS (`w['u>v']` — вага).

**37.** Напишіть `taskCompletionTimes(g, duration)` — найраніший час завершення кожної задачі при необмеженому паралелізмі (DP за топологічним порядком).

**38.** Напишіть `hasUniqueOrder(g)` — чи топологічний порядок єдиний (на кожному кроці рівно одна вершина зі ступенем 0).

**39.** Напишіть `eventualSafeNodes(graph)` — вершини, з яких усі шляхи ведуть до термінальних (у зворотному графі Кан із кінця). Вхід — масив списків суміжності.

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `tarjanLikeOrderCheck(g)` — перевірку циклу через DFS (`true`, якщо граф ациклічний).

**41.** Чому топологічне сортування існує тільки для DAG?

**42.** Як алгоритм Кана виявляє цикли?

**43.** Чому розвернутий порядок завершення DFS — топологічний порядок?

**44.** Коли топологічний порядок єдиний?

**45.** Як використати топологічний порядок для найдовшого шляху в DAG?

**46.** Чому для планування паралельних задач корисні «шари» Кана?

**47.** Як отримати лексикографічно найменший топологічний порядок?

**48.** Чому для подвійних ребер алгоритм Кана все одно коректний?

**49.** Які практичні системи використовують топологічне сортування?

**50.** Чим відрізняється Кан від DFS-підходу щодо побічних можливостей?

### Відповіді

1. `{ Algebra: 0, Analysis: 1, Statistics: 1, Programming: 0, ML: 3 }`
2. `{ order: ['Algebra', 'Programming', 'Analysis', 'Statistics', 'ML'], hasCycle: false }`
3. `['початкова черга: [Algebra, Programming]', 'беремо Algebra, звільнено: Analysis, Statistics', 'беремо Programming, нічого не звільнено', 'беремо Analysis, нічого не звільнено', 'беремо Statistics, звільнено: ML', 'беремо ML, нічого не звільнено']`
4. `[['Programming', 'Algebra', 'Statistics', 'Analysis', 'ML'], false]`
5. `[true, true]`
6. `false`
7. `{ order: [], hasCycle: true }`
8. `null`
9. `{ order: ['S', 'T'], hasCycle: true }`
10. `{ order: [], hasCycle: false }`
11. `['x', 'y', 'z']`
12. `[true, false]`
13. `[0, 1, 2, 3]`
14. `[]`
15. `[0]`
16. `[['Algebra', 'Programming'], ['Analysis', 'Statistics'], ['ML']]`
17. `4`
18. `null`
19. `2`
20. `3`
21. `'wertf'`
22. `''`
23. `''`
24. `'zx'`
25. `['Algebra', 'Analysis', 'Programming', 'Statistics', 'ML']`
26. `8`
27. `[1, 6]`
28. `2`
29. `6`
30. `[{ A: 0, B: 1 }, { A: 0, B: 2 }]`
31. `{ order: ['A', 'B'], hasCycle: false }`
32. Приклад розв'язку:

   ```js
   function buildOrder(projects, deps) {
     const g = Object.fromEntries(projects.map(p => [p, []]));
     for (const [a, b] of deps) g[a].push(b);
     const r = kahn(g);
     return r.hasCycle ? null : r.order;
   }
   ```

   Виклик `[buildOrder(['a', 'b', 'c', 'd', 'e', 'f'], [['a', 'd'], ['f', 'b'], ['b', 'd'], ['f', 'a'], ['d', 'c']]), buildOrder(['a', 'b'], [['a', 'b'], ['b', 'a']])]` → `[['e', 'f', 'b', 'a', 'd', 'c'], null]`

33. Приклад розв'язку:

   ```js
   function minSemesters(n, rel) {
     const g = {};
     for (let i = 1; i <= n; i++) g[i] = [];
     for (const [a, b] of rel) g[a].push(b);
     const lv = parallelLevels(g);
     return lv ? lv.length : -1;
   }
   ```

   Виклик `[minSemesters(3, [[1, 3], [2, 3]]), minSemesters(3, [[1, 2], [2, 3], [3, 1]]), minSemesters(4, [[2, 1], [3, 1], [1, 4]])]` → `[2, -1, 3]`

34. Приклад розв'язку:

   ```js
   function sequenceReconstruction(nums, seqs) {
     const g = {};
     for (const x of nums) g[x] = [];
     for (const s of seqs) for (let i = 0; i + 1 < s.length; i++) g[s[i]].push(s[i + 1]);
     const deg = inDegrees(g);
     let q = nums.filter(x => deg[x] === 0);
     const order = [];
     while (q.length) {
       if (q.length > 1) return false;
       const v = q.shift();
       order.push(v);
       for (const u of g[v]) if (--deg[u] === 0) q.push(u);
     }
     return order.length === nums.length && order.every((x, i) => x === nums[i]);
   }
   ```

   Виклик `[sequenceReconstruction([1, 2, 3], [[1, 2], [1, 3]]), sequenceReconstruction([1, 2, 3], [[1, 2], [1, 3], [2, 3]]), sequenceReconstruction([4, 1, 5, 2, 6, 3], [[5, 2, 6, 3], [4, 1, 5, 2]])]` → `[false, true, true]`

35. Приклад розв'язку:

   ```js
   function allTopoOrders(g) {
     const keys = Object.keys(g), deg = inDegrees(g), placed = new Set(), res = [], path = [];
     const go = () => {
       if (path.length === keys.length) {
         res.push(path.slice());
         return;
       }
       for (const v of keys) {
         if (placed.has(v) || deg[v] !== 0) continue;
         placed.add(v);
         path.push(v);
         for (const u of g[v]) deg[u]--;
         go();
         for (const u of g[v]) deg[u]++;
         path.pop();
         placed.delete(v);
       }
     };
     go();
     return res;
   }
   ```

   Виклик `allTopoOrders({ A: ['B', 'C'], B: ['D'], C: ['D'], D: [] })` → `[['A', 'B', 'C', 'D'], ['A', 'C', 'B', 'D']]`

36. Приклад розв'язку:

   ```js
   function shortestPathInDag(g, w, s) {
     const order = topoDfs(g);
     const d = Object.fromEntries(Object.keys(g).map(v => [v, Infinity]));
     d[s] = 0;
     for (const v of order) {
       if (d[v] === Infinity) continue;
       for (const u of g[v]) d[u] = Math.min(d[u], d[v] + w[v + '>' + u]);
     }
     return d;
   }
   ```

   Виклик `shortestPathInDag({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] }, { 'a>b': 2, 'a>c': 1, 'b>d': -1, 'c>d': 5 }, 'a')` → `{ a: 0, b: 2, c: 1, d: 1 }`

37. Приклад розв'язку:

   ```js
   function taskCompletionTimes(g, dur) {
     const order = topoDfs(g);
     const start = Object.fromEntries(Object.keys(g).map(v => [v, 0]));
     const end = {};
     for (const v of order) {
       end[v] = start[v] + dur[v];
       for (const u of g[v]) start[u] = Math.max(start[u], end[v]);
     }
     return end;
   }
   ```

   Виклик `taskCompletionTimes({ a: ['c'], b: ['c'], c: ['d'], d: [] }, { a: 3, b: 5, c: 2, d: 1 })` → `{ b: 5, a: 3, c: 7, d: 8 }`

38. Приклад розв'язку:

   ```js
   function hasUniqueOrder(g) {
     const deg = inDegrees(g);
     let q = Object.keys(g).filter(v => deg[v] === 0);
     let n = 0;
     while (q.length) {
       if (q.length > 1) return false;
       const v = q.shift();
       n++;
       for (const u of g[v]) if (--deg[u] === 0) q.push(u);
     }
     return n === Object.keys(g).length;
   }
   ```

   Виклик `[hasUniqueOrder({ 1: [2], 2: [3], 3: [] }), hasUniqueOrder(courses), hasUniqueOrder({ a: ['b'], b: ['a'] })]` → `[true, false, false]`

39. Приклад розв'язку:

   ```js
   function eventualSafeNodes(gr) {
     const n = gr.length, rev = Array.from({ length: n }, () => []), out = gr.map(l => l.length);
     gr.forEach((l, u) => l.forEach(v => rev[v].push(u)));
     const q = [];
     for (let i = 0; i < n; i++) if (!out[i]) q.push(i);
     const safe = [];
     for (let h = 0; h < q.length; h++) {
       safe.push(q[h]);
       for (const p of rev[q[h]]) if (--out[p] === 0) q.push(p);
     }
     return safe.sort((a, b) => a - b);
   }
   ```

   Виклик `eventualSafeNodes([[1, 2], [2, 3], [5], [0], [5], [], []])` → `[2, 4, 5, 6]`

40. Приклад розв'язку:

   ```js
   const tarjanLikeOrderCheck = (g) => topoDfs(g) !== null
   ```

   Виклик `[tarjanLikeOrderCheck(courses), tarjanLikeOrderCheck({ A: ['A'] })]` → `[true, false]`

41. Цикл `A → B → … → A` вимагає, щоб `A` стояла і перед собою, і після себе, що неможливо. Отже, топологічний порядок існує тоді й лише тоді, коли граф ациклічний.
42. Вершини, що лежать у циклі або залежать від нього, ніколи не стають такими, що мають вхідний ступінь 0. Тому в результаті опиняється менше вершин, ніж у графі, і різниця вказує на цикл.
43. Коли вершина `v` завершується, усі досяжні з неї вершини вже завершені. Отже, у списку завершень вони стоять раніше за `v`, і після розвороту `v` опиняється перед ними — а саме цього вимагає топологічний порядок.
44. Лише коли на кожному кроці рівно одна вершина має нульовий вхідний ступінь, тобто в графі є гамільтонів шлях, що проходить усі вершини у порядку розташування.
45. Обробляти вершини за порядком і релаксувати ребра: `dist[u] = max(dist[u], dist[v] + w)`. Оскільки до `v` усі предки вже оброблені, `dist[v]` остаточне, і разом `O(V + E)`.
46. Вершини одного шару не залежать одна від одної, тому їх можна виконувати паралельно; кількість шарів — мінімальна кількість кроків при необмеженому паралелізмі (довжина критичного шляху в вершинах).
47. Замість звичайної черги в алгоритмі Кана використовувати мін-купу (або відсортований набір готових вершин): завжди брати найменшу з вершин зі ступенем 0. Час `O((V + E) log V)`.
48. Ступінь збільшується стільки разів, скільки є ребер, і зменшується стільки ж разів при обробці джерела, тож вершина досягає нуля рівно тоді, коли всі залежності враховані.
49. Системи збірки (make, Bazel, Gradle), менеджери пакетів і бандлери (порядок залежностей), електронні таблиці (порядок обчислення клітинок), планувальники завдань і міграцій, компілятори (порядок оптимізацій, ініціалізація модулів).
50. Кан природно дає шари для паралельності й легко адаптується до лексикографічного порядку та підрахунку ступенів; DFS-підхід лаконічний, використовує рекурсію й одночасно виявляє цикли за зворотним ребром, але на дуже глибоких графах потребує явного стека.
