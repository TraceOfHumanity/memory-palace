# DFS — пошук у глибину (Depth-First Search)

DFS іде «вглиб»: від поточної вершини переходить до першого непрочитаного сусіда, звідти — до наступного, і так, поки не впреться в глухий кут; тоді **повертається** на крок назад і пробує інший шлях. Якщо BFS — хвиля, то DFS — **лабіринтний мандрівник** із ниткою Аріадни. DFS не знаходить найкоротших шляхів, зате він розкриває **структуру** графа: цикли, компоненти зв'язності, топологічний порядок, мости й точки зчленування, сильно зв'язні компоненти.

## 1. Ідея

```text
dfs(v):
    позначити v відвіданою
    для кожного сусіда u вершини v:
        якщо u не відвідана:
            dfs(u)
```

Те саме можна зробити з явним **стеком** замість рекурсії. DFS можна уявляти як BFS, у якому чергу замінили стеком (LIFO) — проте з важливою тонкістю щодо моменту позначення (див. розділ 6).

## 2. Приклад

Граф (орієнтований): `A → B`, `A → C`, `B → D`, `C → D`, `D → E`, `F → E` (вершина `F` не досяжна з `A`).

DFS від `A` (сусіди в порядку списку): `['A', 'B', 'D', 'E', 'C']`. Тут `D` відкривається з `B` першою — до `C → D` ми не доходимо, бо `D` уже відвідана.

Часи входу/виходу (`discovery/finish`): `{ A: [1, 10], B: [2, 7], D: [3, 6], E: [4, 5], C: [8, 9] }`. Спостереження: вершина `B` входить і виходить усередині інтервалу `A`; інтервали вершин або **вкладені**, або **не перетинаються** — це «властивість дужок» (parenthesis theorem).

## 3. Реалізація

```js
const digraph = {
  A: ['B', 'C'],
  B: ['D'],
  C: ['D'],
  D: ['E'],
  E: [],
  F: ['E'],
};

function dfsRecursive(g, start) {
  const seen = new Set();
  const order = [];
  const go = (v) => {
    seen.add(v);
    order.push(v);
    for (const u of g[v]) if (!seen.has(u)) go(u);
  };
  go(start);
  return order;
}

function dfsIterative(g, start) {
  const seen = new Set();
  const order = [];
  const stack = [start];
  while (stack.length) {
    const v = stack.pop();
    if (seen.has(v)) continue;
    seen.add(v);
    order.push(v);
    for (let i = g[v].length - 1; i >= 0; i--) if (!seen.has(g[v][i])) stack.push(g[v][i]);
  }
  return order;
}

function dfsTimes(g, start) {
  const t = {};
  let time = 0;
  const go = (v) => {
    t[v] = [++time, null];
    for (const u of g[v]) if (!(u in t)) go(u);
    t[v][1] = ++time;
  };
  go(start);
  return t;
}

function hasCycleDirected(g) {
  const state = {};
  const go = (v) => {
    state[v] = 1;
    for (const u of g[v]) {
      if (state[u] === 1) return true;
      if (!state[u] && go(u)) return true;
    }
    state[v] = 2;
    return false;
  };
  for (const v of Object.keys(g)) if (!state[v] && go(v)) return true;
  return false;
}

function hasCycleUndirected(g) {
  const seen = new Set();
  const go = (v, parent) => {
    seen.add(v);
    for (const u of g[v]) {
      if (u === parent) continue;
      if (seen.has(u)) return true;
      if (go(u, v)) return true;
    }
    return false;
  };
  for (const v of Object.keys(g)) if (!seen.has(v) && go(v, null)) return true;
  return false;
}

function classifyEdges(g) {
  const state = {};
  const time = {};
  let t = 0;
  const kinds = [];
  const go = (v) => {
    state[v] = 1;
    time[v] = t++;
    for (const u of g[v]) {
      if (!state[u]) { kinds.push(v + '→' + u + ': дерева'); go(u); }
      else if (state[u] === 1) kinds.push(v + '→' + u + ': зворотне');
      else if (time[v] < time[u]) kinds.push(v + '→' + u + ': пряме');
      else kinds.push(v + '→' + u + ': перехресне');
    }
    state[v] = 2;
  };
  for (const v of Object.keys(g)) if (!state[v]) go(v);
  return kinds;
}

function findPath(g, s, t) {
  const seen = new Set();
  const path = [];
  const go = (v) => {
    seen.add(v);
    path.push(v);
    if (v === t) return true;
    for (const u of g[v]) if (!seen.has(u) && go(u)) return true;
    path.pop();
    return false;
  };
  return go(s) ? path : null;
}

function allPaths(g, s, t) {
  const res = [];
  const path = [];
  const go = (v) => {
    path.push(v);
    if (v === t) res.push(path.slice());
    else for (const u of g[v]) go(u);
    path.pop();
  };
  go(s);
  return res;
}

function floodFill(img, sr, sc, color) {
  const g = img.map((r) => r.slice());
  const old = g[sr][sc];
  if (old === color) return g;
  const go = (r, c) => {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] !== old) return;
    g[r][c] = color;
    go(r + 1, c);
    go(r - 1, c);
    go(r, c + 1);
    go(r, c - 1);
  };
  go(sr, sc);
  return g;
}

function islandArea(grid) {
  const g = grid.map((r) => r.slice());
  let best = 0;
  const go = (r, c) => {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] !== 1) return 0;
    g[r][c] = 0;
    return 1 + go(r + 1, c) + go(r - 1, c) + go(r, c + 1) + go(r, c - 1);
  };
  for (let r = 0; r < g.length; r++) for (let c = 0; c < g[0].length; c++) best = Math.max(best, go(r, c));
  return best;
}

function reachable(g, s) {
  return dfsRecursive(g, s).length;
}

function maxDepth(g, root) {
  const go = (v) => 1 + Math.max(0, ...g[v].map(go));
  return go(root);
}

function connectedComponentsCount(g) {
  const seen = new Set();
  let n = 0;
  const go = (v) => {
    seen.add(v);
    for (const u of g[v]) if (!seen.has(u)) go(u);
  };
  for (const v of Object.keys(g)) if (!seen.has(v)) { n++; go(v); }
  return n;
}
```

## 4. Класифікація ребер

Під час DFS кожне орієнтоване ребро `v → u` потрапляє в одну з категорій залежно від стану `u`:

- **ребро дерева (tree):** `u` ще не відвідана → ми «ідемо» ним, і воно входить у **DFS-ліс**;
- **зворотне (back):** `u` — **предок** `v` у стеку (стан «у процесі», сірий) → **цикл**;
- **пряме (forward):** `u` — вже завершений нащадок `v`;
- **перехресне (cross):** `u` — завершена вершина з іншої гілки.

У **неорієнтованому** графі бувають лише ребра дерева й зворотні. Критичний наслідок: орієнтований граф має цикл **тоді й лише тоді**, коли DFS знаходить зворотне ребро. Для цього три стани: `0` — не бачили (білий), `1` — у стеку (сірий), `2` — завершена (чорний). `hasCycleDirected(digraph)` = `false`; для `A → B → C → A`: `true`.

`classifyEdges({ A: ['B', 'C'], B: ['C'], C: ['A'] })` = `['A→B: дерева', 'B→C: дерева', 'C→A: зворотне', 'A→C: пряме']`.

**Неорієнтований** граф: цикл існує, якщо ми зустріли відвідану вершину, що **не є батьком**. `hasCycleUndirected({ 1: [2], 2: [1, 3], 3: [2] })` = `true`, трикутник — `true`.

## 5. Застосування

- **Компоненти зв'язності:** `connectedComponentsCount({ a: ['b'], b: ['a'], c: [] })` = `2`.
- **Пошук шляху (не обов'язково найкоротшого):** `findPath(digraph, 'A', 'E')` = `['A', 'B', 'D', 'E']`; всі шляхи `A → E`: `[['A', 'B', 'D', 'E'], ['A', 'C', 'D', 'E']]`.
- **Топологічне сортування:** порядок за зменшенням часу виходу — [topological-sort.md](topological-sort.md).
- **Сильно зв'язні компоненти:** алгоритми Тар'яна й Косараджу — [tarjan-scc.md](tarjan-scc.md).
- **Мости й точки зчленування:** low-link значення (Тар'ян).
- **Заливка (flood fill) і острови:** `floodFill([[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2)` = `[[2, 2, 2], [2, 2, 0], [2, 0, 1]]`, `islandArea([[0, 1, 1, 0], [0, 1, 0, 0], [1, 0, 0, 1]])` = `3`.
- **Backtracking** — це DFS по дереву рішень ([backtracking.md](../techniques/backtracking.md)).
- **Обходи дерев:** pre-order/in-order/post-order — [tree-traversals.md](../trees/tree-traversals.md).
- **Розв'язання лабіринтів, генерація лабіринтів, пошук слів на сітці.**
- **Перевірка дводольності, пошук циклів, залежностей.**

## 6. Рекурсія чи стек: тонкість

Ітеративна версія з явним стеком має **інший порядок обходу**, якщо сусідів додавати в стек у прямому порядку (останній стане першим). Щоб відтворити рекурсивний порядок, сусідів додають у **зворотному** порядку (як у `dfsIterative`). Крім того, версія «позначати при додаванні в стек» (замість «при вилученні») дає **не справжній DFS-порядок**, а лише якийсь допустимий обхід — це залежить від задачі; для часів входу/виходу, класифікації ребер і топологічного порядку потрібна версія «позначати при вході».

`dfsIterative(digraph, 'A')` = `['A', 'B', 'D', 'E', 'C']` — збігається з рекурсивним `['A', 'B', 'D', 'E', 'C']`.

**Переповнення стека.** Рекурсивний DFS на графі з глибиною 10⁵–10⁶ (ланцюжок) у JS дає `RangeError: Maximum call stack size exceeded`. Тоді використовують явний стек або розширення ліміту. Ланцюжок із кількох тисяч вершин рекурсія ще витримує, а з кількох десятків тисяч — уже ні (точна межа залежить від рушія й розміру кадру).

## 7. Складність

- **Час `O(V + E)`**: кожна вершина обробляється один раз, кожне ребро — один раз (орієнтований) чи двічі (неорієнтований).
- **Пам'ять `O(V)`**: множина відвіданих + стек (глибина до `V` у найгіршому випадку — ланцюжок).
- Для матриці суміжності — `O(V²)`.

## 8. DFS проти BFS

| | DFS | BFS |
|---|---|---|
| Структура | стек (рекурсія) | черга |
| Найкоротший шлях (без ваг) | ні | так |
| Пам'ять | `O(глибина)` | `O(ширина)` |
| Цикли, топо-порядок, SCC | так | частково |
| Лабіринти, комбінаторика | природно | рідше |

## 9. Типові помилки

1. **Забути позначити вершину відвіданою** — нескінченна рекурсія на циклах.
2. **Для орієнтованих графів використовувати два стани** — не відрізнити зворотне ребро від перехресного (потрібні три кольори).
3. **Для неорієнтованих — не враховувати батька:** кожне ребро `v–u` виглядає як цикл `u–v`.
4. **Рекурсія на дуже глибоких графах** — `RangeError`.
5. **Не обійти всі компоненти:** стартувати DFS лише з однієї вершини.
6. **Плутанина порядків** ітеративної та рекурсивної версій.
7. **Мутація сітки без відновлення** (для задач, де відвіданість не має зберігатись).
8. **Помилка в межах сітки:** перевіряйте границі перед `g[r][c]`.
9. **`allPaths` на графі з циклами** — безкінечно; перебір усіх шляхів експоненційний.

## 10. Алгоритм (стисло)

1. Для кожної непрочитаної вершини `s` викликати `go(s)`.
2. `go(v)`: позначити `v`; для кожного сусіда `u` без позначки — `go(u)`.
3. Час `O(V + E)`, пам'ять `O(V)`; DFS-ліс розкриває цикли, порядок завершення й компоненти.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** У якому порядку `dfsRecursive(digraph, 'A')` відвідає вершини?

```js
dfsRecursive(digraph, 'A')
```

**2.** А `dfsIterative(digraph, 'A')`? Чи збігається з рекурсивним?

```js
[dfsIterative(digraph, 'A'), JSON.stringify(dfsIterative(digraph, 'A')) === JSON.stringify(dfsRecursive(digraph, 'A'))]
```

**3.** Які часи входу/виходу дає `dfsTimes(digraph, 'A')`?

```js
dfsTimes(digraph, 'A')
```

**4.** Які вершини досяжні з `F`?

```js
dfsRecursive(digraph, 'F')
```

**5.** Скільки вершин досяжні з `A`?

```js
reachable(digraph, 'A')
```

**6.** Що поверне `hasCycleDirected(digraph)`?

```js
hasCycleDirected(digraph)
```

**7.** Що поверне `hasCycleDirected({ A: ['B'], B: ['C'], C: ['A'] })`?

```js
hasCycleDirected({ A: ['B'], B: ['C'], C: ['A'] })
```

**8.** Чи є цикл у петлі `{ A: ['A'] }`?

```js
hasCycleDirected({ A: ['A'] })
```

**9.** Чи є цикл у ромбі `A→B, A→C, B→D, C→D`? (діамант — не цикл)

```js
hasCycleDirected({ A: ['B', 'C'], B: ['D'], C: ['D'], D: [] })
```

**10.** Як `classifyEdges({ A: ['B', 'C'], B: ['C'], C: ['A'] })` класифікує ребра?

```js
classifyEdges({ A: ['B', 'C'], B: ['C'], C: ['A'] })
```

**11.** Як класифікуються ребра в `{ A: ['B', 'C', 'D'], B: ['D'], C: [], D: [] }`?

```js
classifyEdges({ A: ['B', 'C', 'D'], B: ['D'], C: [], D: [] })
```

**12.** Як класифікуються ребра в `{ A: ['B'], B: [], C: ['B'] }` (перехресне)?

```js
classifyEdges({ A: ['B'], B: [], C: ['B'] })
```

**13.** Чи є цикл у неорієнтованому шляху `1-2-3`?

```js
hasCycleUndirected({ 1: [2], 2: [1, 3], 3: [2] })
```

### Рівень 2. Робота алгоритму

**14.** Чи є цикл у неорієнтованому трикутнику?

```js
hasCycleUndirected({ 1: [2, 3], 2: [1, 3], 3: [1, 2] })
```

**15.** Що поверне `hasCycleUndirected` без урахування батька? Змоделюйте на шляху `1-2` (кожне ребро хибно вважатиметься циклом).

```js
(() => { const g = { 1: [2], 2: [1] }; const seen = new Set(); const go = (v) => { seen.add(v); for (const u of g[v]) { if (seen.has(u)) return true; if (go(u)) return true; } return false; }; return go(1); })()
```

**16.** Скільки компонент у `{ a: ['b'], b: ['a'], c: [] }`?

```js
connectedComponentsCount({ a: ['b'], b: ['a'], c: [] })
```

**17.** Який шлях знайде `findPath(digraph, 'A', 'E')`?

```js
findPath(digraph, 'A', 'E')
```

**18.** Що поверне `findPath(digraph, 'E', 'A')`?

```js
findPath(digraph, 'E', 'A')
```

**19.** Які всі шляхи `A → E`?

```js
allPaths(digraph, 'A', 'E')
```

**20.** Скільки шляхів у ромбоподібному DAG з 2 «ромбів» підряд (`S→a,b; a,b→M; M→c,d; c,d→T`)?

```js
allPaths({ S: ['a', 'b'], a: ['M'], b: ['M'], M: ['c', 'd'], c: ['T'], d: ['T'], T: [] }, 'S', 'T').length
```

**21.** Що поверне `floodFill([[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2)`?

```js
floodFill([[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2)
```

**22.** Що поверне `floodFill`, якщо колір збігається з поточним?

```js
floodFill([[0, 0], [0, 0]], 0, 0, 0)
```

**23.** Яка площа найбільшого острова в `[[0, 1, 1, 0], [0, 1, 0, 0], [1, 0, 0, 1]]`?

```js
islandArea([[0, 1, 1, 0], [0, 1, 0, 0], [1, 0, 0, 1]])
```

**24.** Яка найбільша глибина дерева `{ r: ['a', 'b'], a: ['c'], b: [], c: ['d'], d: [] }` від `r` (в вершинах)?

```js
maxDepth({ r: ['a', 'b'], a: ['c'], b: [], c: ['d'], d: [] }, 'r')
```

**25.** Скільки викликів рекурсії зробить DFS у повному бінарному дереві з 15 вершин?

```js
(() => { const g = {}; for (let i = 1; i <= 15; i++) g[i] = [2 * i, 2 * i + 1].filter(x => x <= 15); let calls = 0; const go = (v) => { calls++; for (const u of g[v]) go(u); }; go(1); return calls; })()
```

**26.** Чи переповнить стек рекурсивний DFS на ланцюжку з 50 000 вершин? Перевірте.

```js
(() => { const n = 50000; const g = {}; for (let i = 0; i < n; i++) g[i] = i + 1 < n ? [i + 1] : []; try { return dfsRecursive(g, 0).length; } catch (e) { return e.name; } })()
```

### Рівень 3. Складність і нюанси

**27.** А `dfsIterative` на цьому ланцюжку з 100 000 вершин?

```js
(() => { const n = 100000; const g = {}; for (let i = 0; i < n; i++) g[i] = i + 1 < n ? [i + 1] : []; return dfsIterative(g, 0).length; })()
```

**28.** Скільки різних топологічних порядків за зменшенням часу виходу можна отримати, якщо перебрати порядок сусідів? Для `{ A: ['B', 'C'], B: [], C: [] }` порівняйте виходи при двох порядках.

```js
(() => { const post = (g) => { const seen = new Set(), o = []; const go = (v) => { seen.add(v); for (const u of g[v]) if (!seen.has(u)) go(u); o.push(v); }; go('A'); return o.reverse(); }; return [post({ A: ['B', 'C'], B: [], C: [] }), post({ A: ['C', 'B'], B: [], C: [] })]; })()
```

**29.** Як DFS у сітці 3×3 без стін відвідає клітинки з порядком напрямків `вниз, вгору, вправо, вліво`? (порядок індексів `r*3+c`)

```js
(() => { const seen = new Set(); const order = []; const go = (r, c) => { if (r < 0 || c < 0 || r > 2 || c > 2 || seen.has(r * 3 + c)) return; seen.add(r * 3 + c); order.push(r * 3 + c); go(r + 1, c); go(r - 1, c); go(r, c + 1); go(r, c - 1); }; go(0, 0); return order; })()
```

**30.** Напишіть `topoOrderDfs(g)` — топологічний порядок DAG за зменшенням часу виходу.

**31.** Напишіть `numberOfProvinces(isConnected)` — кількість груп міст у матриці суміжності (DFS).

**32.** Напишіть `pathSum(root, target)` — чи є шлях від кореня до листка із сумою `target` (бінарне дерево `{ val, left, right }`).

**33.** Напишіть `cloneGraph(g)` — глибока копія графа `{ вершина: [сусіди] }` DFS-обходом (нові масиви сусідів).

**34.** Напишіть `canReachAllRooms(rooms)` — чи можна відвідати всі кімнати, якщо в кімнаті `i` лежать ключі `rooms[i]` (старт — кімната 0).

**35.** Напишіть `longestIncreasingPathGrid(m)` — довжина найдовшого строго зростаючого шляху по сітці (DFS із мемоізацією).

**36.** Напишіть `findBridgesCount(n, edges)` — кількість мостів (ребер, видалення яких розриває зв'язність) за допомогою значень `tin`/`low`.

**37.** Напишіть `colorComponents(g)` — присвойте кожній вершині номер компоненти (DFS), поверніть об'єкт `вершина → номер`.

**38.** Напишіть `hasPathMatrix(grid)` — чи є шлях з `(0, 0)` до правого нижнього кута по клітинках `0` (DFS, рух у 4 напрямках).

**39.** Чому для виявлення циклу в орієнтованому графі потрібні три стани вершин?

### Рівень 4. Задачі з інтерв'ю

**40.** Чим відрізняються ребра дерева, зворотні, прямі й перехресні?

**41.** Чому в неорієнтованому графі потрібно ігнорувати батька при пошуку циклів?

**42.** Яка різниця між рекурсивним DFS та ітеративним зі стеком?

**43.** Яка складність DFS і чому вона така?

**44.** Чому DFS не знаходить найкоротших шляхів?

**45.** Що таке «властивість дужок» часів входу/виходу?

**46.** Як DFS пов'язаний із топологічним сортуванням?

**47.** Чому рекурсивний DFS у JS може завершитись помилкою на великих графах і як це обійти?

**48.** У яких задачах DFS кращий за BFS?

**49.** Чи кожна вершина `digraph` має час входу менший за час виходу, і чи вкладені інтервали `B` та `D`?

```js
(() => { const t = dfsTimes(digraph, 'A'); return [Object.values(t).every(([a, b]) => a < b), t.B[0] < t.D[0] && t.D[1] < t.B[1]]; })()
```

**50.** Скільки ребер дерева DFS утворить обхід `digraph` від `A`? (кількість відвіданих вершин мінус 1)

```js
dfsRecursive(digraph, 'A').length - 1
```

### Відповіді

1. `['A', 'B', 'D', 'E', 'C']`
2. `[['A', 'B', 'D', 'E', 'C'], true]`
3. `{ A: [1, 10], B: [2, 7], D: [3, 6], E: [4, 5], C: [8, 9] }`
4. `['F', 'E']`
5. `5`
6. `false`
7. `true`
8. `true`
9. `false`
10. `['A→B: дерева', 'B→C: дерева', 'C→A: зворотне', 'A→C: пряме']`
11. `['A→B: дерева', 'B→D: дерева', 'A→C: дерева', 'A→D: пряме']`
12. `['A→B: дерева', 'C→B: перехресне']`
13. `true`
14. `true`
15. `true`
16. `2`
17. `['A', 'B', 'D', 'E']`
18. `null`
19. `[['A', 'B', 'D', 'E'], ['A', 'C', 'D', 'E']]`
20. `4`
21. `[[2, 2, 2], [2, 2, 0], [2, 0, 1]]`
22. `[[0, 0], [0, 0]]`
23. `3`
24. `4`
25. `15`
26. `'RangeError'`
27. `100000`
28. `[['A', 'C', 'B'], ['A', 'B', 'C']]`
29. `[0, 3, 6, 7, 4, 1, 2, 5, 8]`
30. Приклад розв'язку:

   ```js
   function topoOrderDfs(g) {
     const seen = new Set(), out = [];
     const go = (v) => {
       seen.add(v);
       for (const u of g[v]) if (!seen.has(u)) go(u);
       out.push(v);
     };
     for (const v of Object.keys(g)) if (!seen.has(v)) go(v);
     return out.reverse();
   }
   ```

   Виклик `[topoOrderDfs({ A: ['B', 'C'], B: ['D'], C: ['D'], D: [] }), topoOrderDfs({ a: [], b: ['a'] })]` → `[['A', 'C', 'B', 'D'], ['b', 'a']]`

31. Приклад розв'язку:

   ```js
   function numberOfProvinces(m) {
     const n = m.length, seen = Array(n).fill(false);
     let c = 0;
     const go = (i) => {
       seen[i] = true;
       for (let j = 0; j < n; j++) if (m[i][j] && !seen[j]) go(j);
     };
     for (let i = 0; i < n; i++) if (!seen[i]) {
       c++;
       go(i);
     }
     return c;
   }
   ```

   Виклик `[numberOfProvinces([[1, 1, 0], [1, 1, 0], [0, 0, 1]]), numberOfProvinces([[1, 0], [0, 1]])]` → `[2, 2]`

32. Приклад розв'язку:

   ```js
   function pathSum(n, t) {
     if (!n) return false;
     if (!n.left && !n.right) return n.val === t;
     return pathSum(n.left, t - n.val) || pathSum(n.right, t - n.val);
   }
   ```

   Виклик `(() => { const tree = { val: 5, left: { val: 4, left: { val: 11, left: { val: 7 }, right: { val: 2 } } }, right: { val: 8, left: { val: 13 }, right: { val: 4, right: { val: 1 } } } }; return [pathSum(tree, 22), pathSum(tree, 5)]; })()` → `[true, false]`

33. Приклад розв'язку:

   ```js
   function cloneGraph(g) {
     const copy = {};
     const go = (v) => {
       if (v in copy) return;
       copy[v] = g[v].slice();
       for (const u of g[v]) go(u);
     };
     for (const v of Object.keys(g)) go(v);
     return copy;
   }
   ```

   Виклик `(() => { const g = { A: ['B'], B: ['A'] }; const c = cloneGraph(g); return [c, c.A !== g.A]; })()` → `[{ A: ['B'], B: ['A'] }, true]`

34. Приклад розв'язку:

   ```js
   function canReachAllRooms(rooms) {
     const seen = new Set([0]);
     const st = [0];
     while (st.length) {
       const r = st.pop();
       for (const k of rooms[r]) if (!seen.has(k)) {
         seen.add(k);
         st.push(k);
       }
     }
     return seen.size === rooms.length;
   }
   ```

   Виклик `[canReachAllRooms([[1], [2], [3], []]), canReachAllRooms([[1, 3], [3, 0, 1], [2], [0]])]` → `[true, false]`

35. Приклад розв'язку:

   ```js
   function longestIncreasingPathGrid(m) {
     const R = m.length, C = m[0].length;
     const memo = Array.from({ length: R }, () => Array(C).fill(0));
     const go = (r, c) => {
       if (memo[r][c]) return memo[r][c];
       let best = 1;
       for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
         const nr = r + dr, nc = c + dc;
         if (nr >= 0 && nc >= 0 && nr < R && nc < C && m[nr][nc] > m[r][c]) best = Math.max(best, 1 + go(nr, nc));
       }
       return memo[r][c] = best;
     };
     let ans = 0;
     for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) ans = Math.max(ans, go(r, c));
     return ans;
   }
   ```

   Виклик `[longestIncreasingPathGrid([[9, 9, 4], [6, 6, 8], [2, 1, 1]]), longestIncreasingPathGrid([[1]])]` → `[4, 1]`

36. Приклад розв'язку:

   ```js
   function findBridgesCount(n, edges) {
     const adj = Array.from({ length: n }, () => []);
     edges.forEach(([u, v], i) => { adj[u].push([v, i]); adj[v].push([u, i]); });
     const tin = Array(n).fill(-1), low = Array(n).fill(0);
     let t = 0, bridges = 0;
     const go = (v, pe) => {
       tin[v] = low[v] = t++;
       for (const [u, id] of adj[v]) {
         if (id === pe) continue;
         if (tin[u] !== -1) low[v] = Math.min(low[v], tin[u]);
         else {
           go(u, id);
           low[v] = Math.min(low[v], low[u]);
           if (low[u] > tin[v]) bridges++;
         }
       }
     };
     for (let i = 0; i < n; i++) if (tin[i] === -1) go(i, -1);
     return bridges;
   }
   ```

   Виклик `[findBridgesCount(4, [[0, 1], [1, 2], [2, 0], [1, 3]]), findBridgesCount(3, [[0, 1], [1, 2], [2, 0]])]` → `[1, 0]`

37. Приклад розв'язку:

   ```js
   function colorComponents(g) {
     const col = {};
     let id = 0;
     const go = (v) => {
       col[v] = id;
       for (const u of g[v]) if (!(u in col)) go(u);
     };
     for (const v of Object.keys(g)) if (!(v in col)) {
       go(v);
       id++;
     }
     return col;
   }
   ```

   Виклик `colorComponents({ a: ['b'], b: ['a'], c: ['d'], d: ['c'], e: [] })` → `{ a: 0, b: 0, c: 1, d: 1, e: 2 }`

38. Приклад розв'язку:

   ```js
   function hasPathMatrix(g) {
     const R = g.length, C = g[0].length;
     const seen = Array.from({ length: R }, () => Array(C).fill(false));
     const go = (r, c) => {
       if (r < 0 || c < 0 || r >= R || c >= C || g[r][c] === 1 || seen[r][c]) return false;
       if (r === R - 1 && c === C - 1) return true;
       seen[r][c] = true;
       return go(r + 1, c) || go(r - 1, c) || go(r, c + 1) || go(r, c - 1);
     };
     return go(0, 0);
   }
   ```

   Виклик `[hasPathMatrix([[0, 0, 1], [1, 0, 1], [1, 0, 0]]), hasPathMatrix([[0, 1], [1, 0]])]` → `[true, false]`

39. Стан «у процесі» (сірий) означає, що вершина лежить у поточному шляху рекурсії; ребро до такої вершини — зворотне і утворює цикл. Завершені (чорні) вершини вже повністю оброблені, і ребро до них — не цикл (пряме чи перехресне). Двох станів (відвідана/ні) недостатньо, щоб відрізнити ці випадки.
40. Ребро дерева веде до ще не відвіданої вершини. Зворотне — до предка в стеку (цикл). Пряме — до вже завершеного нащадка. Перехресне — до завершеної вершини з іншої гілки. У неорієнтованому графі існують лише ребра дерева й зворотні.
41. Кожне ребро `v–u` присутнє в обох списках суміжності, тож із `u` ми бачимо `v` як сусіда. Без ігнорування батька це «зворотне» ребро хибно вважалося б циклом довжини 2.
42. Це той самий обхід, але ітеративна версія вимагає зворотного порядку додавання сусідів (щоб відтворити рекурсивний порядок) і позначення при вилученні зі стека. Явний стек не обмежений глибиною викликів, тому не призводить до `RangeError` на глибоких графах.
43. `O(V + E)`: кожна вершина викликається один раз завдяки позначці, і кожне ребро розглядається один раз (орієнтоване) або двічі (неорієнтоване). Пам'ять `O(V)` для відвіданих і глибини рекурсії.
44. Він іде вглиб першим знайденим шляхом і не порівнює альтернативи: перший знайдений шлях до цілі може бути довшим. Найкоротші шляхи в незважених графах дає BFS.
45. Для будь-яких двох вершин інтервали `[вхід, вихід]` або вкладені один в одного (нащадок), або не перетинаються; перетину частково не буває. Тому часи утворюють правильну дужкову послідовність.
46. У DAG вершини, відсортовані за **зменшенням** часу виходу, утворюють топологічний порядок: для ребра `u → v` вершина `v` завершується раніше за `u`.
47. Глибина рекурсії обмежена розміром стека викликів (порядку десяти тисяч кадрів). Ланцюжок із мільйона вершин спричинить `RangeError`. Рішення: ітеративний DFS з явним стеком (масив) або зменшення глибини перебудовою задачі.
48. Коли потрібна структура всього графа (цикли, топологічний порядок, SCC, мости), коли шукаємо будь-який шлях чи перебираємо всі розв'язки (backtracking), для лабіринтів та генерації, коли пам'ять обмежена і граф широкий.
49. `[true, true]`
50. `4`
