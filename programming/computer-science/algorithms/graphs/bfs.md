# BFS — пошук у ширину (Breadth-First Search)

BFS обходить граф **шарами**: спочатку сама стартова вершина, потім усі її сусіди (відстань 1), потім сусіди сусідів (відстань 2) тощо. Це робить BFS головним інструментом для **найкоротших шляхів у незваженому графі**, а також для обходу по рівнях, перевірки зв'язності, дводольності й розв'язання задач на сітках та головоломок. Алгоритм реалізується звичайною **чергою** (FIFO).

## 1. Ідея: хвиля

Киньте камінь у воду — хвиля розходиться колами: спершу ближчі точки, потім далі. BFS поводиться так само. Поки в черзі є вершини, ми:

1. Беремо з **початку** черги вершину `v`.
2. Для кожного ще **не відвіданого** сусіда `u` вершини `v`: позначаємо відвіданим, запам'ятовуємо `dist[u] = dist[v] + 1`, `parent[u] = v`, кладемо `u` у **кінець** черги.

Черга гарантує порядок: усі вершини на відстані `d` будуть вилучені раніше за будь-яку вершину на відстані `d + 1`. Звідси — коректність найкоротших відстаней.

## 2. Граф для прикладів

Незважений неорієнтований граф (список суміжності):

```text
A — B — D
|   |   |
C — E — F
```

Ребра: `A–B`, `A–C`, `B–D`, `B–E`, `C–E`, `D–F`, `E–F`. Обхід із `A`: `['A', 'B', 'C', 'D', 'E', 'F']`. Відстані: `{ A: 0, B: 1, C: 1, D: 2, E: 2, F: 3 }`. Найкоротший шлях `A → F`: `['A', 'B', 'D', 'F']` (довжина 3 ребра).

Трасування (черга після кожного кроку):

- старт: черга [A]
- беремо A, додаємо [B, C] → черга [B, C]
- беремо B, додаємо [D, E] → черга [C, D, E]
- беремо C, додаємо [] → черга [D, E]
- беремо D, додаємо [F] → черга [E, F]
- беремо E, додаємо [] → черга [F]
- беремо F, додаємо [] → черга []

## 3. Чому відстані найкоротші

**Інваріант.** У будь-який момент черга містить вершини з відстанями `d, d, …, d, d + 1, …, d + 1` — не більш як двох сусідніх значень, і впорядковані зростанням. Доведення за індукцією: усі вершини зі значенням `d` додані з вершин зі значенням `d − 1`, що вилучені раніше; вилучаючи вершину `d`, додаємо `d + 1` у кінець — порядок зберігається.

**Наслідок.** Перша знайдена відстань до вершини — мінімальна кількість ребер. Якщо `u` досягнуто з `v`, то `dist[u] = dist[v] + 1` найменша, бо будь-яка коротша дорога означала б, що `u` потрапила б у чергу раніше.

## 4. Позначати треба при додаванні в чергу

Часта помилка — позначати вершину відвіданою лише при вилученні. Тоді одна вершина може потрапити в чергу кілька разів (від різних сусідів), і час деградує до `O(V·E)` або й гірше. Правило: **mark on enqueue**.

## 5. Реалізація

```js
const graph = {
  A: ['B', 'C'],
  B: ['A', 'D', 'E'],
  C: ['A', 'E'],
  D: ['B', 'F'],
  E: ['B', 'C', 'F'],
  F: ['D', 'E'],
};

function bfs(g, start) {
  const dist = { [start]: 0 };
  const parent = { [start]: null };
  const order = [];
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const v = queue[head++];
    order.push(v);
    for (const u of g[v]) {
      if (u in dist) continue;
      dist[u] = dist[v] + 1;
      parent[u] = v;
      queue.push(u);
    }
  }
  return { dist, parent, order };
}

function bfsTrace(g, start) {
  const out = [];
  const seen = new Set([start]);
  const queue = [start];
  let head = 0;
  out.push('старт: черга [' + queue.slice(head).join(', ') + ']');
  while (head < queue.length) {
    const v = queue[head++];
    const added = [];
    for (const u of g[v]) {
      if (seen.has(u)) continue;
      seen.add(u);
      queue.push(u);
      added.push(u);
    }
    out.push('беремо ' + v + ', додаємо [' + added.join(', ') + '] → черга [' + queue.slice(head).join(', ') + ']');
  }
  return out;
}

function shortestPath(g, s, t) {
  const { parent } = bfs(g, s);
  if (!(t in parent)) return null;
  const path = [];
  for (let v = t; v !== null; v = parent[v]) path.push(v);
  return path.reverse();
}

function components(g) {
  const seen = new Set();
  const comps = [];
  for (const s of Object.keys(g)) {
    if (seen.has(s)) continue;
    const comp = [];
    const queue = [s];
    seen.add(s);
    for (let h = 0; h < queue.length; h++) {
      const v = queue[h];
      comp.push(v);
      for (const u of g[v]) if (!seen.has(u)) { seen.add(u); queue.push(u); }
    }
    comps.push(comp);
  }
  return comps;
}

function levels(g, start) {
  const { dist } = bfs(g, start);
  const res = [];
  for (const [v, d] of Object.entries(dist)) (res[d] ||= []).push(v);
  return res;
}

function isBipartite(g) {
  const color = {};
  for (const s of Object.keys(g)) {
    if (s in color) continue;
    color[s] = 0;
    const queue = [s];
    for (let h = 0; h < queue.length; h++) {
      const v = queue[h];
      for (const u of g[v]) {
        if (!(u in color)) { color[u] = 1 - color[v]; queue.push(u); }
        else if (color[u] === color[v]) return false;
      }
    }
  }
  return true;
}

function gridShortestPath(grid, start, goal) {
  const R = grid.length;
  const C = grid[0].length;
  const dist = Array.from({ length: R }, () => new Array(C).fill(-1));
  dist[start[0]][start[1]] = 0;
  const queue = [start];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let h = 0; h < queue.length; h++) {
    const [r, c] = queue[h];
    if (r === goal[0] && c === goal[1]) return dist[r][c];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] === 1 || dist[nr][nc] !== -1) continue;
      dist[nr][nc] = dist[r][c] + 1;
      queue.push([nr, nc]);
    }
  }
  return -1;
}

function orangesRotting(grid) {
  const g = grid.map((r) => r.slice());
  const R = g.length;
  const C = g[0].length;
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (g[r][c] === 2) queue.push([r, c, 0]);
    else if (g[r][c] === 1) fresh++;
  }
  let minutes = 0;
  for (let h = 0; h < queue.length; h++) {
    const [r, c, t] = queue[h];
    minutes = t;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] === 1) {
        g[nr][nc] = 2;
        fresh--;
        queue.push([nr, nc, t + 1]);
      }
    }
  }
  return fresh === 0 ? minutes : -1;
}

function wordLadder(begin, end, words) {
  const dict = new Set(words);
  if (!dict.has(end)) return 0;
  const queue = [[begin, 1]];
  const seen = new Set([begin]);
  for (let h = 0; h < queue.length; h++) {
    const [w, d] = queue[h];
    if (w === end) return d;
    for (let i = 0; i < w.length; i++) {
      for (let c = 97; c < 123; c++) {
        const nw = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
        if (dict.has(nw) && !seen.has(nw)) { seen.add(nw); queue.push([nw, d + 1]); }
      }
    }
  }
  return 0;
}

function bfs01(n, edges, src) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) { adj[u].push([v, w]); adj[v].push([u, w]); }
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  const dq = [src];
  while (dq.length) {
    const v = dq.shift();
    for (const [u, w] of adj[v]) {
      if (dist[v] + w < dist[u]) {
        dist[u] = dist[v] + w;
        if (w === 0) dq.unshift(u);
        else dq.push(u);
      }
    }
  }
  return dist;
}

function bfsOnGeneric(start, neighbors, isGoal) {
  const seen = new Set([start]);
  const queue = [[start, 0]];
  for (let h = 0; h < queue.length; h++) {
    const [s, d] = queue[h];
    if (isGoal(s)) return d;
    for (const n of neighbors(s)) if (!seen.has(n)) { seen.add(n); queue.push([n, d + 1]); }
  }
  return -1;
}
```

## 6. Складність

- **Час `O(V + E)`** для списку суміжності: кожна вершина потрапляє в чергу один раз, кожне ребро переглядається двічі (неорієнтований) або один раз (орієнтований).
- **Пам'ять `O(V)`**: черга, `dist`, `parent`.
- Для **матриці суміжності** — `O(V²)`.
- Для сітки `R × C`: `O(R·C)`; 4 напрямки на клітинку.
- **Черга на масиві з `shift()`** — `O(n)` на операцію у деяких рушіях; використовуйте індекс голови (`head`) чи справжню чергу.

Порівняння з [DFS](dfs.md): BFS тримає в пам'яті **весь фронт хвилі** (у широкому графі — багато), DFS — лише поточний шлях (`O(глибина)`).

## 7. Застосування

- **Найкоротший шлях у незваженому графі**, мінімум кроків (лабіринти, ходи коня, мінімум перемикань).
- **Рівні дерева** (level-order traversal) і «вигляд справа».
- **Компоненти зв'язності:** `components({ a: ['b'], b: ['a'], c: [] })` = `[['a', 'b'], ['c']]`.
- **Перевірка дводольності** (2-розфарбування): `isBipartite` для парного циклу з 4 вершин — `true`, для трикутника — `false`.
- **Multi-source BFS:** кілька джерел одночасно (гнилі апельсини, відстань до найближчої «1»): `orangesRotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]])` = `4`.
- **Сітки й лабіринти:** `gridShortestPath([[0, 0, 0], [1, 1, 0], [0, 0, 0]], [0, 0], [2, 0])` = `6`.
- **Word ladder:** `wordLadder('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])` = `5`.
- **0-1 BFS:** ребра вагою 0 або 1 — deque: `0` — на початок, `1` — у кінець; `O(V + E)` без купи.
- **Неявні графи:** стани головоломки (замок із 4 дисків, 8-puzzle): вершина — стан, ребра — ходи.
- **Соціальні мережі:** «друзі на відстані `k`».

## 8. Варіації

- **Двосторонній BFS** (bidirectional): одночасно з початку й з кінця; кількість вершин зменшується з `b^d` до `2·b^{d/2}` (`b` — коефіцієнт розгалуження, `d` — відстань).
- **BFS із відновленням шляху:** `parent` + розворот.
- **BFS по рівнях:** обробляти чергу порціями `size = queue.length`.
- **Ваги:** для різних ваг BFS некоректний — [Дейкстра](dijkstra.md).

## 9. Типові помилки

1. **Позначати відвіданою лише при вилученні** — дублікати в черзі, повільно, а на циклах можна зациклитись.
2. **`queue.shift()` на великих чергах** — квадратична поведінка; індекс голови.
3. **Не позначити стартову вершину** — повернення в неї.
4. **BFS на зважених графах** — хибні відстані.
5. **Межі сітки:** перевірка `nr < 0 || nr >= R` до звернення до `grid[nr][nc]`.
6. **Мутація вхідної сітки** — копіюйте або використовуйте окремий `visited`.
7. **Забути про незв'язні компоненти:** одного старту недостатньо для обходу всього графа.
8. **Неорієнтований граф:** зберігати кожне ребро в обох напрямках.
9. **Відновлення шляху:** забули `parent[start] = null` — нескінченний цикл.

## 10. Алгоритм (стисло)

1. `dist[s] = 0`, черга `[s]`.
2. Поки черга не порожня: `v = dequeue()`; для кожного сусіда `u` без відстані: `dist[u] = dist[v] + 1`, `parent[u] = v`, `enqueue(u)`.
3. Час `O(V + E)`, пам'ять `O(V)`; відстані — мінімальна кількість ребер.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** У якому порядку `bfs(graph, 'A')` відвідає вершини?

```js
bfs(graph, 'A').order
```

**2.** Які відстані від `A` дає `bfs(graph, 'A')`?

```js
bfs(graph, 'A').dist
```

**3.** Хто батько вершини `F` у дереві BFS від `A`?

```js
bfs(graph, 'A').parent.F
```

**4.** Який найкоротший шлях `A → F` і `A → A`?

```js
[shortestPath(graph, 'A', 'F'), shortestPath(graph, 'A', 'A')]
```

**5.** Що поверне `shortestPath` для недосяжної вершини в графі `{ a: [], b: [] }`?

```js
shortestPath({ a: [], b: [] }, 'a', 'b')
```

**6.** Які кроки (черга) виконає `bfsTrace(graph, 'A')`?

```js
bfsTrace(graph, 'A')
```

**7.** Які рівні BFS від `A` дає `levels(graph, 'A')`?

```js
levels(graph, 'A')
```

**8.** Які рівні BFS від `D`?

```js
levels(graph, 'D')
```

**9.** Що поверне `components({ a: ['b'], b: ['a'], c: [] })`?

```js
components({ a: ['b'], b: ['a'], c: [] })
```

**10.** Скільки компонент у графі з 5 ізольованих вершин?

```js
components({ 1: [], 2: [], 3: [], 4: [], 5: [] }).length
```

**11.** Чи дводольний цикл із 4 вершин `1-2-3-4-1`?

```js
isBipartite({ 1: [2, 4], 2: [1, 3], 3: [2, 4], 4: [3, 1] })
```

**12.** Чи дводольний трикутник?

```js
isBipartite({ 1: [2, 3], 2: [1, 3], 3: [1, 2] })
```

**13.** Чи дводольний `graph` із цього розділу? (є цикл `A-B-E-C-A` довжини 4 та `B-D-F-E-B` довжини 4)

```js
isBipartite(graph)
```

### Рівень 2. Робота алгоритму

**14.** Чи дводольний цикл із 5 вершин?

```js
isBipartite({ 1: [2, 5], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4, 1] })
```

**15.** Яка найкоротша відстань у сітці `[[0, 0, 0], [1, 1, 0], [0, 0, 0]]` від `[0, 0]` до `[2, 0]`?

```js
gridShortestPath([[0, 0, 0], [1, 1, 0], [0, 0, 0]], [0, 0], [2, 0])
```

**16.** А якщо шлях заблокований `[[0, 1], [1, 0]]`?

```js
gridShortestPath([[0, 1], [1, 0]], [0, 0], [1, 1])
```

**17.** Що поверне `gridShortestPath` для старту, що збігається з метою?

```js
gridShortestPath([[0]], [0, 0], [0, 0])
```

**18.** Скільки хвилин потрібно `orangesRotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]])`?

```js
orangesRotting([[2, 1, 1], [1, 1, 0], [0, 1, 1]])
```

**19.** А `orangesRotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]])` (одна свіжа недосяжна)?

```js
orangesRotting([[2, 1, 1], [0, 1, 1], [1, 0, 1]])
```

**20.** Що поверне `orangesRotting([[0, 2]])` (немає свіжих)?

```js
orangesRotting([[0, 2]])
```

**21.** Скільки кроків `wordLadder('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])`?

```js
wordLadder('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog'])
```

**22.** А якщо `'cog'` немає у словнику?

```js
wordLadder('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log'])
```

**23.** Які відстані дасть `bfs01(4, [[0, 1, 0], [1, 2, 1], [2, 3, 0], [0, 3, 1]], 0)`?

```js
bfs01(4, [[0, 1, 0], [1, 2, 1], [2, 3, 0], [0, 3, 1]], 0)
```

**24.** Скільки ходів потрібно, щоб перетворити число 1 на 10 операціями `×2` або `+1` (generic BFS)?

```js
bfsOnGeneric(1, (x) => [x * 2, x + 1].filter(y => y <= 20), (x) => x === 10)
```

**25.** Скільки ходів коня від `(0,0)` до `(7,7)` на дошці 8×8?

```js
bfsOnGeneric('0,0', (s) => { const [r, c] = s.split(',').map(Number); return [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]].map(([a, b]) => [r + a, c + b]).filter(([x, y]) => x >= 0 && y >= 0 && x < 8 && y < 8).map(p => p.join(',')); }, (s) => s === '7,7')
```

**26.** Скільки вершин у черзі максимум для повного бінарного дерева глибини 4 (15 вершин) при BFS від кореня?

```js
(() => { const g = {}; for (let i = 1; i <= 15; i++) g[i] = [2 * i, 2 * i + 1].filter(x => x <= 15); let max = 0; const q = [1]; let h = 0; while (h < q.length) { const v = q[h++]; for (const u of g[v]) q.push(u); max = Math.max(max, q.length - h); } return max; })()
```

### Рівень 3. Складність і нюанси

**27.** Скільки ребер переглянув BFS у `graph`, якщо кожне неорієнтоване ребро переглядається двічі? (сума довжин списків)

```js
Object.values(graph).reduce((s, l) => s + l.length, 0)
```

**28.** Що станеться, якщо позначати вершини лише при вилученні з черги? Підрахуйте, скільки разів вершина `F` потрапить у чергу в `graph`.

```js
(() => { const q = ['A']; const done = new Set(); let h = 0, f = 0; while (h < q.length) { const v = q[h++]; if (done.has(v)) continue; done.add(v); for (const u of graph[v]) { if (!done.has(u)) { q.push(u); if (u === 'F') f++; } } } return f; })()
```

**29.** Яка кількість вершин на кожному рівні сітки 5×5 від кута `(0, 0)` без стін (за відстанню Манхеттена)?

```js
(() => { const cnt = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) cnt[r + c] = (cnt[r + c] || 0) + 1; return cnt; })()
```

**30.** Чи правильний BFS на зваженому графі? Для `A–B (1)`, `B–C (1)`, `A–C (5)` порівняйте BFS-відстань до `C` (за ребрами) і найменшу вагу шляху.

```js
[bfs({ A: ['B', 'C'], B: ['A', 'C'], C: ['A', 'B'] }, 'A').dist.C, 1 + 1]
```

**31.** Напишіть `distanceToNearestZero(matrix)` — для кожної клітинки відстань до найближчого `0` (multi-source BFS).

**32.** Напишіть `levelOrder(tree)` — обхід бінарного дерева (`{ val, left, right }`) по рівнях.

**33.** Напишіть `numIslands(grid)` — кількість островів `'1'` (BFS по сітці з позначенням відвіданих).

**34.** Напишіть `minKnightMoves(x, y)` — ходи коня від `(0, 0)` до `(x, y)` на нескінченній дошці (BFS у межах `[-2, max + 2]`).

**35.** Напишіть `openLock(deadends, target)` — мінімум поворотів замка з 4 дисків (`'0000'` → `target`), обходячи тупики.

**36.** Напишіть `shortestPathAllShortest(g, s, t)` — кількість найкоротших шляхів із `s` до `t` (BFS із лічильником шляхів).

**37.** Напишіть `cloneGraphSize(g, start)` — кількість вершин, досяжних зі `start` (BFS).

**38.** Напишіть `surroundedRegionsCount(board)` — кількість клітинок `'O'`, які не з'єднані з краєм дошки (BFS від країв).

**39.** Напишіть `canFinish(n, prerequisites)` — чи можна пройти всі курси (немає циклу) методом BFS (Kahn, лише перевірка).

### Рівень 4. Задачі з інтерв'ю

**40.** Чому BFS знаходить найкоротші шляхи в незваженому графі?

**41.** Чому вершину слід позначати відвіданою під час додавання в чергу, а не під час вилучення?

**42.** Яка складність BFS для списку суміжності та для матриці суміжності?

**43.** У чому різниця між BFS та DFS за використанням пам'яті?

**44.** Для чого використовують multi-source BFS?

**45.** Як BFS перевіряє дводольність графа?

**46.** Чому BFS не працює для графів із різними вагами ребер, і що використовують замість нього?

**47.** Як відновити найкоротший шлях після BFS?

**48.** Чим корисний двосторонній BFS?

**49.** Чому для обходу по рівнях дерева використовують чергу та розмір рівня?

**50.** Скільки компонент у графі з двох трикутників і однієї ізольованої вершини?

```js
components({ 1: [2, 3], 2: [1, 3], 3: [1, 2], 4: [5, 6], 5: [4, 6], 6: [4, 5], 7: [] }).length
```

### Відповіді

1. `['A', 'B', 'C', 'D', 'E', 'F']`
2. `{ A: 0, B: 1, C: 1, D: 2, E: 2, F: 3 }`
3. `'D'`
4. `[['A', 'B', 'D', 'F'], ['A']]`
5. `null`
6. `['старт: черга [A]', 'беремо A, додаємо [B, C] → черга [B, C]', 'беремо B, додаємо [D, E] → черга [C, D, E]', 'беремо C, додаємо [] → черга [D, E]', 'беремо D, додаємо [F] → черга [E, F]', 'беремо E, додаємо [] → черга [F]', 'беремо F, додаємо [] → черга []']`
7. `[['A'], ['B', 'C'], ['D', 'E'], ['F']]`
8. `[['D'], ['B', 'F'], ['A', 'E'], ['C']]`
9. `[['a', 'b'], ['c']]`
10. `5`
11. `true`
12. `false`
13. `true`
14. `false`
15. `6`
16. `-1`
17. `0`
18. `4`
19. `-1`
20. `0`
21. `5`
22. `0`
23. `[0, 0, 1, 1]`
24. `4`
25. `6`
26. `8`
27. `14`
28. `2`
29. `[1, 2, 3, 4, 5, 4, 3, 2, 1]`
30. `[1, 2]`
31. Приклад розв'язку:

   ```js
   function distanceToNearestZero(m) {
     const R = m.length, C = m[0].length;
     const d = Array.from({ length: R }, () => Array(C).fill(-1));
     const q = [];
     for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (m[r][c] === 0) {
       d[r][c] = 0;
       q.push([r, c]);
     }
     for (let h = 0; h < q.length; h++) {
       const [r, c] = q[h];
       for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
         const nr = r + dr, nc = c + dc;
         if (nr >= 0 && nc >= 0 && nr < R && nc < C && d[nr][nc] === -1) {
           d[nr][nc] = d[r][c] + 1;
           q.push([nr, nc]);
         }
       }
     }
     return d;
   }
   ```

   Виклик `distanceToNearestZero([[0, 0, 0], [0, 1, 0], [1, 1, 1]])` → `[[0, 0, 0], [0, 1, 0], [1, 2, 1]]`

32. Приклад розв'язку:

   ```js
   function levelOrder(root) {
     if (!root) return [];
     const res = [];
     let q = [root];
     while (q.length) {
       res.push(q.map(n => n.val));
       q = q.flatMap(n => [n.left, n.right].filter(Boolean));
     }
     return res;
   }
   ```

   Виклик `levelOrder({ val: 3, left: { val: 9 }, right: { val: 20, left: { val: 15 }, right: { val: 7 } } })` → `[[3], [9, 20], [15, 7]]`

33. Приклад розв'язку:

   ```js
   function numIslands(g) {
     const R = g.length, C = g[0].length;
     const seen = Array.from({ length: R }, () => Array(C).fill(false));
     let n = 0;
     for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
       if (g[r][c] !== '1' || seen[r][c]) continue;
       n++;
       seen[r][c] = true;
       const q = [[r, c]];
       for (let h = 0; h < q.length; h++) {
         const [x, y] = q[h];
         for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
           const nx = x + dx, ny = y + dy;
           if (nx >= 0 && ny >= 0 && nx < R && ny < C && g[nx][ny] === '1' && !seen[nx][ny]) {
             seen[nx][ny] = true;
             q.push([nx, ny]);
           }
         }
       }
     }
     return n;
   }
   ```

   Виклик `[numIslands([['1', '1', '0', '0'], ['1', '1', '0', '0'], ['0', '0', '1', '0'], ['0', '0', '0', '1']]), numIslands([['0']])]` → `[3, 0]`

34. Приклад розв'язку:

   ```js
   function minKnightMoves(x, y) {
     const dirs = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
     const seen = new Set(['0,0']);
     const q = [[0, 0, 0]];
     for (let h = 0; h < q.length; h++) {
       const [a, b, d] = q[h];
       if (a === x && b === y) return d;
       for (const [dx, dy] of dirs) {
         const na = a + dx, nb = b + dy;
         const k = na + ',' + nb;
         if (!seen.has(k) && na >= -2 && nb >= -2 && na <= Math.abs(x) + 4 && nb <= Math.abs(y) + 4) {
           seen.add(k);
           q.push([na, nb, d + 1]);
         }
       }
     }
     return -1;
   }
   ```

   Виклик `[minKnightMoves(2, 1), minKnightMoves(5, 5), minKnightMoves(1, 1)]` → `[1, 4, 2]`

35. Приклад розв'язку:

   ```js
   function openLock(dead, target) {
     const bad = new Set(dead);
     if (bad.has('0000')) return -1;
     const seen = new Set(['0000']);
     const q = [['0000', 0]];
     for (let h = 0; h < q.length; h++) {
       const [s, d] = q[h];
       if (s === target) return d;
       for (let i = 0; i < 4; i++) for (const step of [1, 9]) {
         const ns = s.slice(0, i) + ((Number(s[i]) + step) % 10) + s.slice(i + 1);
         if (!seen.has(ns) && !bad.has(ns)) {
           seen.add(ns);
           q.push([ns, d + 1]);
         }
       }
     }
     return -1;
   }
   ```

   Виклик `[openLock(['0201', '0101', '0102', '1212', '2002'], '0202'), openLock(['0000'], '8888'), openLock(['8888'], '0009')]` → `[6, -1, 1]`

36. Приклад розв'язку:

   ```js
   function shortestPathAllShortest(g, s, t) {
     const dist = { [s]: 0 }, ways = { [s]: 1 };
     const q = [s];
     for (let h = 0; h < q.length; h++) {
       const v = q[h];
       for (const u of g[v]) {
         if (!(u in dist)) {
           dist[u] = dist[v] + 1;
           ways[u] = 0;
           q.push(u);
         }
         if (dist[u] === dist[v] + 1) ways[u] += ways[v];
       }
     }
     return ways[t] || 0;
   }
   ```

   Виклик `[shortestPathAllShortest(graph, 'A', 'F'), shortestPathAllShortest(graph, 'A', 'B')]` → `[3, 1]`

37. Приклад розв'язку:

   ```js
   function cloneGraphSize(g, s) {
     return Object.keys(bfs(g, s).dist).length;
   }
   ```

   Виклик `[cloneGraphSize(graph, 'A'), cloneGraphSize({ a: ['b'], b: ['a'], c: [] }, 'a')]` → `[6, 2]`

38. Приклад розв'язку:

   ```js
   function surroundedRegionsCount(b) {
     const R = b.length, C = b[0].length;
     const seen = Array.from({ length: R }, () => Array(C).fill(false));
     const q = [];
     const push = (r, c) => {
       if (r >= 0 && c >= 0 && r < R && c < C && b[r][c] === 'O' && !seen[r][c]) {
         seen[r][c] = true;
         q.push([r, c]);
       }
     };
     for (let r = 0; r < R; r++) {
       push(r, 0);
       push(r, C - 1);
     }
     for (let c = 0; c < C; c++) {
       push(0, c);
       push(R - 1, c);
     }
     for (let h = 0; h < q.length; h++) {
       const [r, c] = q[h];
       push(r + 1, c);
       push(r - 1, c);
       push(r, c + 1);
       push(r, c - 1);
     }
     let n = 0;
     for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (b[r][c] === 'O' && !seen[r][c]) n++;
     return n;
   }
   ```

   Виклик `surroundedRegionsCount([['X', 'X', 'X', 'X'], ['X', 'O', 'O', 'X'], ['X', 'X', 'O', 'X'], ['X', 'O', 'X', 'X']])` → `3`

39. Приклад розв'язку:

   ```js
   function canFinish(n, pre) {
     const indeg = Array(n).fill(0), adj = Array.from({ length: n }, () => []);
     for (const [a, b] of pre) {
       adj[b].push(a);
       indeg[a]++;
     }
     const q = [];
     for (let i = 0; i < n; i++) if (!indeg[i]) q.push(i);
     let done = 0;
     for (let h = 0; h < q.length; h++) {
       done++;
       for (const u of adj[q[h]]) if (--indeg[u] === 0) q.push(u);
     }
     return done === n;
   }
   ```

   Виклик `[canFinish(2, [[1, 0]]), canFinish(2, [[1, 0], [0, 1]])]` → `[true, false]`

40. Черга обробляє вершини в порядку зростання відстані: усі вершини на відстані `d` вилучаються раніше за вершини на відстані `d + 1`. Тому перший раз, коли вершину відкрито, шлях до неї має мінімально можливу кількість ребер.
41. Інакше одна вершина може потрапити в чергу кілька разів від різних сусідів, збільшуючи роботу (до `O(E)` дублікатів на вершину) і ускладнюючи підрахунок відстаней. Позначка при додаванні гарантує, що кожна вершина додається рівно один раз.
42. Для списку суміжності `O(V + E)` часу й `O(V)` пам'яті. Для матриці суміжності пошук сусідів кожної вершини займає `O(V)`, тому разом `O(V²)`.
43. BFS тримає у черзі весь «фронт» — у широкому графі це `O(V)` вершин. DFS (рекурсивно чи зі стеком) тримає лише поточний шлях — `O(глибина)`, але не дає найкоротших шляхів.
44. Коли відстань потрібно рахувати від **найближчого з кількох джерел** (гнилі апельсини, відстань до найближчого нуля, пожежа на карті): усі джерела кладуть у чергу на початку з відстанню 0, і хвиля розходиться від усіх одночасно.
45. Фарбує стартову вершину в колір 0, а кожного нового сусіда — у протилежний. Якщо знайдено ребро між вершинами одного кольору, є непарний цикл і граф не дводольний. Для незв'язного графа запускають BFS від кожної ще не пофарбованої вершини.
46. BFS мінімізує кількість ребер, а не суму ваг: шлях із двох легких ребер може бути коротшим за одне важке. Для невід'ємних ваг застосовують алгоритм Дейкстри, для ваг 0/1 — 0-1 BFS із deque, для від'ємних — Беллмана—Форда.
47. Під час обходу зберігати `parent[u] = v`, коли `u` відкрито з `v`. Після завершення рухатись від цілі за `parent` до старту й розвернути послідовність.
48. Пошук одночасно від початку й від цілі зустрічається посередині: замість `b^d` вершин розглядається приблизно `2·b^{d/2}`, що дає експоненційну економію при великому коефіцієнті розгалуження.
49. Перед обробкою рівня запам'ятовують `size = queue.length`: рівно стільки вершин належить поточному рівню. Їх вилучають і додають дітей у кінець — діти утворюють наступний рівень.
50. `7`
