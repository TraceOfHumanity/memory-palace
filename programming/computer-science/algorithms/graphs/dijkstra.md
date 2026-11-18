# Dijkstra's Algorithm — алгоритм Дейкстри

Алгоритм Дейкстри знаходить **найкоротші шляхи від однієї вершини** до всіх інших у графі з **невід'ємними** вагами ребер. Це серце навігаторів, маршрутизації в мережах (OSPF), пошуку шляху в іграх. Ідея вкрай проста й жадібна: щоразу брати вершину з **найменшою відомою відстанню** — її відстань вже остаточна.

## 1. Задача

Дано зважений граф і стартову вершину `s`. Для кожної вершини `v` знайти `dist[v]` — мінімальну суму ваг на шляху `s → v`. Для незважених графів достатньо [BFS](bfs.md). Для від'ємних ваг Дейкстра **не працює** (див. [bellman-ford.md](bellman-ford.md)).

## 2. Ідея: хвиля з пріоритетами

Уявіть, що ви запускаєте «хвилю», яка рухається по ребрах зі швидкістю, обернено пропорційною вазі. Вершини «загоряються» у порядку зростання відстані. Алгоритм:

1. `dist[s] = 0`, для інших — `∞`. У пріоритетну чергу (min-heap) кладемо `(0, s)`.
2. Витягуємо пару `(d, v)` з **найменшою** `d`. Якщо `d > dist[v]` — застарілий запис, пропускаємо.
3. Для кожного ребра `v → u` із вагою `w` виконуємо **релаксацію**: якщо `dist[v] + w < dist[u]` — оновлюємо `dist[u]`, `parent[u] = v`, кладемо `(dist[u], u)` у чергу.
4. Повторюємо, поки черга не порожня.

**Релаксація** — єдина операція: «чи не краще дістатися до `u` через `v`?».

## 3. Приклад

Граф (орієнтований, ваги на ребрах): `A→B (4)`, `A→C (1)`, `C→B (2)`, `B→D (1)`, `C→D (5)`, `D→E (3)`.

Старт `A`. Відстані: `{ A: 0, B: 3, C: 1, D: 4, E: 7 }`. Шлях `A → E`: `['A', 'C', 'B', 'D', 'E']`, вартість 7. Зверніть увагу: пряме ребро `A→B` (4) гірше за обхід `A→C→B` (1 + 2 = 3).

Трасування:

- закріплено A (0), оновлено: B=4, C=1
- закріплено C (1), оновлено: B=3, D=6
- закріплено B (3), оновлено: D=4
- пропуск застарілого (B, 4)
- закріплено D (4), оновлено: E=7
- пропуск застарілого (D, 6)
- закріплено E (7)

## 4. Чому це правильно

**Теорема.** Коли вершина `v` витягується з черги, `dist[v]` — справжня найкоротша відстань.

**Ідея доказу (від супротивного).** Припустимо, `v` витягнута з неправильною `dist[v]`, і існує коротший шлях `P` від `s` до `v`. Візьмемо перше ребро `x → y` цього шляху, де `x` вже остаточна (витягнута), а `y` — ні. Тоді `dist[y] ≤ dist[x] + w(x, y)` (бо після витягання `x` ми релаксували ребро) — і це не більше довжини шляху `P` до `y`. А довжина `P` до `y` **не більша** за довжину всього `P` (ваги невід'ємні), яка менша за `dist[v]`. Отже, `dist[y] < dist[v]` — тоді `y` мала б бути витягнута раніше за `v`. Суперечність.

**Де потрібна невід'ємність:** тільки в твердженні «префікс шляху не довший за весь шлях». З від'ємним ребром далі по шляху вершина, що вже «закрита», могла б отримати кращу відстань пізніше. Приклад: `A→B (2)`, `A→C (3)`, `C→B (−2)`. Класична версія, що **закриває** кожну вершину один раз (`dijkstraClosed`), поверне для `B` відстань 2, хоча справжня — 1. Версія з повторним додаванням у купу (`dijkstra` вище) на цьому крихітному прикладі «виправляє» відповідь, але на більших графах із від'ємними ребрами може працювати **експоненційно довго** — тому для таких графів використовують Беллмана—Форда.

## 5. Реалізація (з мін-купою)

```js
const wgraph = {
  A: [['B', 4], ['C', 1]],
  B: [['D', 1]],
  C: [['B', 2], ['D', 5]],
  D: [['E', 3]],
  E: [],
};

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item, pri) {
    const a = this.a;
    a.push([pri, item]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      while (true) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function dijkstra(g, s) {
  const dist = {};
  for (const v of Object.keys(g)) dist[v] = Infinity;
  const parent = { [s]: null };
  dist[s] = 0;
  const pq = new MinHeap();
  pq.push(s, 0);
  while (pq.size) {
    const [d, v] = pq.pop();
    if (d > dist[v]) continue;
    for (const [u, w] of g[v]) {
      if (d + w < dist[u]) {
        dist[u] = d + w;
        parent[u] = v;
        pq.push(u, dist[u]);
      }
    }
  }
  return { dist, parent };
}

function dijkstraClosed(g, s) {
  const dist = {};
  for (const v of Object.keys(g)) dist[v] = Infinity;
  dist[s] = 0;
  const closed = new Set();
  const pq = new MinHeap();
  pq.push(s, 0);
  while (pq.size) {
    const [d, v] = pq.pop();
    if (closed.has(v)) continue;
    closed.add(v);
    for (const [u, w] of g[v]) {
      if (!closed.has(u) && d + w < dist[u]) {
        dist[u] = d + w;
        pq.push(u, dist[u]);
      }
    }
  }
  return dist;
}

function dijkstraPath(g, s, t) {
  const { dist, parent } = dijkstra(g, s);
  if (dist[t] === Infinity) return null;
  const path = [];
  for (let v = t; v !== null && v !== undefined; v = parent[v]) path.push(v);
  return path.reverse();
}

function dijkstraTrace(g, s) {
  const out = [];
  const dist = {};
  for (const v of Object.keys(g)) dist[v] = Infinity;
  dist[s] = 0;
  const pq = new MinHeap();
  pq.push(s, 0);
  while (pq.size) {
    const [d, v] = pq.pop();
    if (d > dist[v]) { out.push('пропуск застарілого (' + v + ', ' + d + ')'); continue; }
    const upd = [];
    for (const [u, w] of g[v]) {
      if (d + w < dist[u]) {
        dist[u] = d + w;
        pq.push(u, dist[u]);
        upd.push(u + '=' + dist[u]);
      }
    }
    out.push('закріплено ' + v + ' (' + d + ')' + (upd.length ? ', оновлено: ' + upd.join(', ') : ''));
  }
  return out;
}

function dijkstraArray(g, s) {
  const dist = {};
  const done = new Set();
  for (const v of Object.keys(g)) dist[v] = Infinity;
  dist[s] = 0;
  while (done.size < Object.keys(g).length) {
    let v = null;
    for (const x of Object.keys(g)) if (!done.has(x) && (v === null || dist[x] < dist[v])) v = x;
    if (dist[v] === Infinity) break;
    done.add(v);
    for (const [u, w] of g[v]) if (dist[v] + w < dist[u]) dist[u] = dist[v] + w;
  }
  return dist;
}

function networkDelayTime(times, n, k) {
  const g = {};
  for (let i = 1; i <= n; i++) g[i] = [];
  for (const [u, v, w] of times) g[u].push([String(v), w]);
  const dist = dijkstra(g, String(k)).dist;
  const mx = Math.max(...Object.values(dist));
  return mx === Infinity ? -1 : mx;
}

function minimumEffortPath(heights) {
  const R = heights.length;
  const C = heights[0].length;
  const eff = Array.from({ length: R }, () => new Array(C).fill(Infinity));
  eff[0][0] = 0;
  const pq = new MinHeap();
  pq.push([0, 0], 0);
  while (pq.size) {
    const [d, [r, c]] = pq.pop();
    if (d > eff[r][c]) continue;
    if (r === R - 1 && c === C - 1) return d;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C) continue;
      const nd = Math.max(d, Math.abs(heights[nr][nc] - heights[r][c]));
      if (nd < eff[nr][nc]) { eff[nr][nc] = nd; pq.push([nr, nc], nd); }
    }
  }
  return 0;
}

function maxProbabilityPath(n, edges, probs, s, t) {
  const g = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], i) => { g[u].push([v, probs[i]]); g[v].push([u, probs[i]]); });
  const best = new Array(n).fill(0);
  best[s] = 1;
  const pq = new MinHeap();
  pq.push(s, -1);
  while (pq.size) {
    const [np, v] = pq.pop();
    const p = -np;
    if (p < best[v]) continue;
    if (v === t) return p;
    for (const [u, w] of g[v]) {
      if (p * w > best[u]) { best[u] = p * w; pq.push(u, -best[u]); }
    }
  }
  return 0;
}

function cheapestFlightsWithinStops(n, flights, src, dst, k) {
  let dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  for (let i = 0; i <= k; i++) {
    const next = dist.slice();
    for (const [u, v, w] of flights) if (dist[u] + w < next[v]) next[v] = dist[u] + w;
    dist = next;
  }
  return dist[dst] === Infinity ? -1 : dist[dst];
}

function dijkstraCountRelax(g, s) {
  let relax = 0;
  let pops = 0;
  const dist = {};
  for (const v of Object.keys(g)) dist[v] = Infinity;
  dist[s] = 0;
  const pq = new MinHeap();
  pq.push(s, 0);
  while (pq.size) {
    const [d, v] = pq.pop();
    pops++;
    if (d > dist[v]) continue;
    for (const [u, w] of g[v]) {
      if (d + w < dist[u]) { dist[u] = d + w; relax++; pq.push(u, dist[u]); }
    }
  }
  return { relax, pops };
}
```

## 6. Складність

Нехай `V` — вершини, `E` — ребра.

| Реалізація черги | Час |
|---|---|
| Масив (лінійний пошук мінімуму) | `O(V²)` |
| Бінарна купа (lazy deletion) | `O((V + E) log V)` |
| Бінарна купа з decrease-key | `O((V + E) log V)` |
| Купа Фібоначчі | `O(E + V log V)` |

- **Лінива видалення (lazy deletion):** замість decrease-key ми додаємо новий запис і ігноруємо застарілі при витяганні. У купі до `E` записів, тому `O(E log E) = O(E log V)`.
- Для **щільних** графів (`E ≈ V²`) масив `O(V²)` не гірший за купу.
- **Пам'ять** `O(V + E)`.
- **Порівняння:** BFS `O(V + E)` (без ваг); 0-1 BFS `O(V + E)`; Беллман—Форд `O(V·E)` (від'ємні ваги); Флойд—Воршелл `O(V³)` (усі пари).

## 7. Застосування та варіації

- **Навігація:** вага — час чи відстань. Для великих карт — **A\*** (з евристикою) і двосторонній пошук: [a-star.md](a-star.md).
- **Мережева маршрутизація:** OSPF/IS-IS обчислюють найкоротші шляхи Дейкстрою. `networkDelayTime([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2)` = `2`.
- **Мінімальні зусилля (minimum effort path):** вага шляху — **максимум** різниць висот, не сума: `minimumEffortPath([[1, 2, 2], [3, 8, 2], [5, 3, 5]])` = `2`. Дейкстра працює для будь-якого «моноторного» накопичення (сума, максимум), де додавання ребра не зменшує вартість.
- **Максимальна ймовірність:** множення ймовірностей `≤ 1` — теж монотонне; беремо `−p` як пріоритет: `maxProbabilityPath(3, [[0, 1], [1, 2], [0, 2]], [0.5, 0.5, 0.2], 0, 2)` = `0.25`.
- **Обмежена кількість зупинок:** Дейкстра з станом `(вершина, кроки)` або Беллман—Форд `k + 1` ітерацій: `cheapestFlightsWithinStops(3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1)` = `200`, а з `k = 0` — `500`.
- **Дейкстра на сітці зі зваженими клітинками**, на графі станів головоломки.
- **Відновлення шляху** через `parent`.
- **Усі пари:** запустити Дейкстру з кожної вершини: `O(V·(V + E) log V)`.

## 8. Типові помилки

1. **Від'ємні ваги** — хибні відстані, іноді безкінечний цикл (при від'ємних циклах).
2. **Не пропускати застарілі записи** (`if (d > dist[v]) continue`) — зайва робота, до `O(E²)`.
3. **Позначати вершину при додаванні, як у BFS** — для Дейкстри позначка **при витяганні** (відстань остаточна лише тоді).
4. **Використовувати звичайну чергу/відсортований масив після кожної вставки** — `O(V²)` чи гірше.
5. **Ініціалізувати `dist` нулями** — треба `∞`.
6. **Переповнення `Infinity + w`** не проблема в JS (залишається `Infinity`), у інших мовах — переповнення цілих.
7. **Недосяжні вершини** — відстань `∞`; обробляйте окремо.
8. **Плутанина пріоритету:** для максимізації (ймовірність) — від'ємний пріоритет або max-heap.
9. **Різні ваги в неорієнтованому графі:** додавати ребро в обох напрямках.
10. **Плутати з Prim:** у Prim ключ — вага ребра, у Дейкстри — повна відстань від джерела ([prim.md](prim.md)).

## 9. Алгоритм (стисло)

1. `dist[s] = 0`, інші `∞`; `heap = {(0, s)}`.
2. Поки купа не порожня: `(d, v) = pop()`; якщо `d > dist[v]` — пропустити.
3. Для ребер `v → u` вагою `w`: якщо `d + w < dist[u]` — оновити `dist[u]`, `parent[u] = v`, `push((dist[u], u))`.
4. Час `O((V + E) log V)`, ваги `≥ 0`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які відстані від `A` дає `dijkstra(wgraph, 'A').dist`?

```js
dijkstra(wgraph, 'A').dist
```

**2.** Які батьки в дереві найкоротших шляхів?

```js
dijkstra(wgraph, 'A').parent
```

**3.** Який найкоротший шлях `A → E` і його вартість?

```js
[dijkstraPath(wgraph, 'A', 'E'), dijkstra(wgraph, 'A').dist.E]
```

**4.** Що поверне `dijkstraPath(wgraph, 'E', 'A')` (шляху немає)?

```js
dijkstraPath(wgraph, 'E', 'A')
```

**5.** Які відстані від `C`?

```js
dijkstra(wgraph, 'C').dist
```

**6.** Які кроки виконує `dijkstraTrace(wgraph, 'A')`?

```js
dijkstraTrace(wgraph, 'A')
```

**7.** Чи збігаються результати версій з купою і з масивом (`dijkstraArray`)?

```js
[dijkstraArray(wgraph, 'A'), JSON.stringify(dijkstraArray(wgraph, 'A')) === JSON.stringify(dijkstra(wgraph, 'A').dist)]
```

**8.** Скільки релаксацій і витягувань із купи робить `dijkstraCountRelax(wgraph, 'A')`?

```js
dijkstraCountRelax(wgraph, 'A')
```

**9.** Що поверне `dijkstra` для графа з однієї вершини `{ X: [] }`?

```js
dijkstra({ X: [] }, 'X').dist
```

**10.** Що поверне `dijkstra` для недосяжної вершини в `{ A: [], B: [] }`?

```js
dijkstra({ A: [], B: [] }, 'A').dist
```

**11.** Що поверне класична версія з «закриттям» на графі з від'ємним ребром `A→B (2)`, `A→C (3)`, `C→B (−2)`?

```js
dijkstraClosed({ A: [['B', 2], ['C', 3]], B: [], C: [['B', -2]] }, 'A')
```

**12.** А версія з повторним додаванням (`dijkstra`) на тому ж графі?

```js
dijkstra({ A: [['B', 2], ['C', 3]], B: [], C: [['B', -2]] }, 'A').dist
```

**13.** Що поверне `dijkstra` для графа з нульовими вагами `{ A: [['B', 0]], B: [['C', 0]], C: [] }`?

```js
dijkstra({ A: [['B', 0]], B: [['C', 0]], C: [] }, 'A').dist
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `dijkstra` для двох паралельних ребер `A→B` вагами 5 і 2?

```js
dijkstra({ A: [['B', 5], ['B', 2]], B: [] }, 'A').dist
```

**15.** Що поверне `networkDelayTime([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2)`?

```js
networkDelayTime([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2)
```

**16.** А якщо сигнал не дістається всіх: `networkDelayTime([[1, 2, 1]], 2, 2)`?

```js
networkDelayTime([[1, 2, 1]], 2, 2)
```

**17.** Що поверне `minimumEffortPath([[1, 2, 2], [3, 8, 2], [5, 3, 5]])`?

```js
minimumEffortPath([[1, 2, 2], [3, 8, 2], [5, 3, 5]])
```

**18.** А `minimumEffortPath([[1, 2, 3], [3, 8, 4], [5, 3, 5]])` та сітка з однієї клітинки?

```js
[minimumEffortPath([[1, 2, 3], [3, 8, 4], [5, 3, 5]]), minimumEffortPath([[7]])]
```

**19.** Що поверне `maxProbabilityPath(3, [[0, 1], [1, 2], [0, 2]], [0.5, 0.5, 0.2], 0, 2)`?

```js
maxProbabilityPath(3, [[0, 1], [1, 2], [0, 2]], [0.5, 0.5, 0.2], 0, 2)
```

**20.** А якщо шляху немає: `maxProbabilityPath(3, [[0, 1]], [0.5], 0, 2)`?

```js
maxProbabilityPath(3, [[0, 1]], [0.5], 0, 2)
```

**21.** Що поверне `cheapestFlightsWithinStops(3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1)` та при `k = 0`?

```js
[cheapestFlightsWithinStops(3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 1), cheapestFlightsWithinStops(3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 0)]
```

**22.** Скільки порівнянь потрібно версії з масивом на `V = 1000`: `V²` порівняно з купою `(V + E) log V` при `E = 5000`?

```js
[1000 * 1000, Math.round((1000 + 5000) * Math.log2(1000))]
```

**23.** Для щільного графа `V = 500`, `E ≈ V²/2`: що більше — `V²` чи `(V + E) log₂ V`?

```js
[500 * 500, Math.round((500 + 500 * 500 / 2) * Math.log2(500))]
```

**24.** Чи правильна Дейкстра, якщо всі ваги рівні 1? Порівняйте з BFS-відстанями на `{ A: [['B', 1], ['C', 1]], B: [['D', 1]], C: [['D', 1]], D: [] }`.

```js
dijkstra({ A: [['B', 1], ['C', 1]], B: [['D', 1]], C: [['D', 1]], D: [] }, 'A').dist
```

**25.** Які відстані на ромбі з важким прямим ребром: `A→D (10)`, `A→B (1)`, `B→C (1)`, `C→D (1)`?

```js
dijkstra({ A: [['D', 10], ['B', 1]], B: [['C', 1]], C: [['D', 1]], D: [] }, 'A').dist
```

**26.** Скільки вершин буде «закріплено» у `dijkstraTrace(wgraph, 'A')` (рядки, що починаються з «закріплено»)?

```js
dijkstraTrace(wgraph, 'A').filter(s => s.startsWith('закріплено')).length
```

### Рівень 3. Складність і нюанси

**27.** Чи є в `dijkstraTrace` пропущені застарілі записи для `wgraph`?

```js
dijkstraTrace(wgraph, 'A').filter(s => s.startsWith('пропуск'))
```

**28.** Напишіть `dijkstraGrid(cost)` — мінімальна сума вартостей клітинок шляху від `(0,0)` до правого нижнього кута (рухи у 4 напрямки, вартість стартової включена).

**29.** Напишіть `shortestPathEdgesCount(g, s, t)` — серед найкоротших за вагою шляхів мінімальна кількість ребер (пара `[відстань, ребра]` як пріоритет).

**30.** Напишіть `countShortestPaths(g, s, t)` — кількість найкоротших за вагою шляхів (Дейкстра + лічильник).

**31.** Напишіть `bottleneckPath(g, s, t)` — шлях, що мінімізує **максимальну вагу ребра** (мінімакс; Дейкстра з max замість суми).

**32.** Напишіть `pathWithMinimumHops(g, s, t)` — довжина найкоротшого шляху за вагою, де всі ваги > 0, у вигляді масиву вершин (використайте `dijkstraPath`).

**33.** Напишіть `reachableWithin(g, s, limit)` — вершини, відстань до яких `≤ limit` (відсортовані).

**34.** Напишіть `eccentricity(g, s)` — найбільша скінченна відстань від `s`.

**35.** Напишіть `buildUndirected(edges)` — з масиву `[u, v, w]` створіть граф у форматі `wgraph` (в обидва боки).

**36.** Чому в Дейкстри відстань вершини остаточна в момент витягання з черги?

**37.** Чому Дейкстра не працює з від'ємними вагами?

**38.** Для чого потрібна перевірка `d > dist[v]` після витягання з купи?

**39.** Яка складність Дейкстри з бінарною купою, масивом і купою Фібоначчі?

### Рівень 4. Задачі з інтерв'ю

**40.** Чим відрізняється Дейкстра від BFS?

**41.** Чим Дейкстра відрізняється від алгоритму Прима?

**42.** Для яких «ваг» Дейкстра ще працює, крім суми?

**43.** Як відновити найкоротший шлях за результатами Дейкстри?

**44.** Коли варто віддати перевагу A* замість Дейкстри?

**45.** Що таке lazy deletion і чому воно замінює decrease-key?

**46.** Які відстані від `A` у неорієнтованому графі `buildUndirected` для ребер `a-b 7`, `b-c 3`, `a-c 12`?

```js
(() => { const g = {}; for (const [u, v, w] of [['a', 'b', 7], ['b', 'c', 3], ['a', 'c', 12]]) { (g[u] ||= []).push([v, w]); (g[v] ||= []).push([u, w]); } return dijkstra(g, 'a').dist; })()
```

**47.** Скільки різних найкоротших шляхів у ромбі з вагами 1 (`A→B, A→C, B→D, C→D`)? Перелічіть шляхи DFS.

```js
(() => { const g = { A: ['B', 'C'], B: ['D'], C: ['D'], D: [] }; const res = []; const go = (v, p) => { if (v === 'D') res.push([...p, v]); else for (const u of g[v]) go(u, [...p, v]); }; go('A', []); return res; })()
```

**48.** Що поверне `dijkstra(wgraph, 'A').dist.E` порівняно з довжиною «жадібного» шляху, який завжди йде найдешевшим ребром зі стартових (A→C→B→D→E чи інший)? Порахуйте вартість шляху `A→B→D→E` вручну через ваги.

```js
[4 + 1 + 3, dijkstra(wgraph, 'A').dist.E]
```

**49.** Що поверне `dijkstra` із вагами-дробами `{ A: [['B', 0.1], ['C', 0.2]], B: [['C', 0.1]], C: [] }`?

```js
dijkstra({ A: [['B', 0.1], ['C', 0.2]], B: [['C', 0.1]], C: [] }, 'A').dist
```

**50.** Що поверне `networkDelayTime([[1, 2, 1], [2, 3, 2], [1, 3, 4]], 3, 1)`?

```js
networkDelayTime([[1, 2, 1], [2, 3, 2], [1, 3, 4]], 3, 1)
```

### Відповіді

1. `{ A: 0, B: 3, C: 1, D: 4, E: 7 }`
2. `{ A: null, B: 'C', C: 'A', D: 'B', E: 'D' }`
3. `[['A', 'C', 'B', 'D', 'E'], 7]`
4. `null`
5. `{ A: Infinity, B: 2, C: 0, D: 3, E: 6 }`
6. `['закріплено A (0), оновлено: B=4, C=1', 'закріплено C (1), оновлено: B=3, D=6', 'закріплено B (3), оновлено: D=4', 'пропуск застарілого (B, 4)', 'закріплено D (4), оновлено: E=7', 'пропуск застарілого (D, 6)', 'закріплено E (7)']`
7. `[{ A: 0, B: 3, C: 1, D: 4, E: 7 }, true]`
8. `{ relax: 6, pops: 7 }`
9. `{ X: 0 }`
10. `{ A: 0, B: Infinity }`
11. `{ A: 0, B: 2, C: 3 }`
12. `{ A: 0, B: 1, C: 3 }`
13. `{ A: 0, B: 0, C: 0 }`
14. `{ A: 0, B: 2 }`
15. `2`
16. `-1`
17. `2`
18. `[1, 0]`
19. `0.25`
20. `0`
21. `[200, 500]`
22. `[1000000, 59795]`
23. `[250000, 1125206]`
24. `{ A: 0, B: 1, C: 1, D: 2 }`
25. `{ A: 0, B: 1, C: 2, D: 3 }`
26. `5`
27. `['пропуск застарілого (B, 4)', 'пропуск застарілого (D, 6)']`
28. Приклад розв'язку:

   ```js
   function dijkstraGrid(g) {
     const R = g.length, C = g[0].length;
     const d = Array.from({ length: R }, () => Array(C).fill(Infinity));
     d[0][0] = g[0][0];
     const pq = new MinHeap();
     pq.push([0, 0], d[0][0]);
     while (pq.size) {
       const [x, [r, c]] = pq.pop();
       if (x > d[r][c]) continue;
       for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
         const nr = r + dr, nc = c + dc;
         if (nr >= 0 && nc >= 0 && nr < R && nc < C && x + g[nr][nc] < d[nr][nc]) {
           d[nr][nc] = x + g[nr][nc];
           pq.push([nr, nc], d[nr][nc]);
         }
       }
     }
     return d[R - 1][C - 1];
   }
   ```

   Виклик `[dijkstraGrid([[1, 3, 1], [1, 5, 1], [4, 2, 1]]), dijkstraGrid([[5]])]` → `[7, 5]`

29. Приклад розв'язку:

   ```js
   function shortestPathEdgesCount(g, s, t) {
     const best = {};
     for (const v of Object.keys(g)) best[v] = [Infinity, Infinity];
     best[s] = [0, 0];
     const less = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
     const q = [[0, 0, s]];
     while (q.length) {
       q.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
       const [d, e, v] = q.shift();
       if (less(best[v], [d, e])) continue;
       for (const [u, w] of g[v]) {
         const cand = [d + w, e + 1];
         if (less(cand, best[u])) {
           best[u] = cand;
           q.push([cand[0], cand[1], u]);
         }
       }
     }
     return best[t];
   }
   ```

   Виклик `[shortestPathEdgesCount({ A: [['B', 1], ['C', 2]], B: [['C', 1]], C: [] }, 'A', 'C'), shortestPathEdgesCount(wgraph, 'A', 'E')]` → `[[2, 1], [7, 4]]`

30. Приклад розв'язку:

   ```js
   function countShortestPaths(g, s, t) {
     const dist = {}, ways = {};
     for (const v of Object.keys(g)) {
       dist[v] = Infinity;
       ways[v] = 0;
     }
     dist[s] = 0;
     ways[s] = 1;
     const pq = new MinHeap();
     pq.push(s, 0);
     while (pq.size) {
       const [d, v] = pq.pop();
       if (d > dist[v]) continue;
       for (const [u, w] of g[v]) {
         if (d + w < dist[u]) {
           dist[u] = d + w;
           ways[u] = ways[v];
           pq.push(u, dist[u]);
         } else if (d + w === dist[u]) ways[u] += ways[v];
       }
     }
     return ways[t];
   }
   ```

   Виклик `[countShortestPaths({ A: [['B', 1], ['C', 1]], B: [['D', 1]], C: [['D', 1]], D: [] }, 'A', 'D'), countShortestPaths(wgraph, 'A', 'E')]` → `[2, 1]`

31. Приклад розв'язку:

   ```js
   function bottleneckPath(g, s, t) {
     const best = {};
     for (const v of Object.keys(g)) best[v] = Infinity;
     best[s] = 0;
     const pq = new MinHeap();
     pq.push(s, 0);
     while (pq.size) {
       const [d, v] = pq.pop();
       if (d > best[v]) continue;
       for (const [u, w] of g[v]) {
         const nd = Math.max(d, w);
         if (nd < best[u]) {
           best[u] = nd;
           pq.push(u, nd);
         }
       }
     }
     return best[t];
   }
   ```

   Виклик `[bottleneckPath(wgraph, 'A', 'E'), bottleneckPath({ A: [['B', 9], ['C', 2]], B: [['D', 1]], C: [['D', 3]], D: [] }, 'A', 'D')]` → `[3, 3]`

32. Приклад розв'язку:

   ```js
   const pathWithMinimumHops = (g, s, t) => dijkstraPath(g, s, t)
   ```

   Виклик `[pathWithMinimumHops(wgraph, 'A', 'D'), pathWithMinimumHops(wgraph, 'D', 'A')]` → `[['A', 'C', 'B', 'D'], null]`

33. Приклад розв'язку:

   ```js
   function reachableWithin(g, s, limit) {
     const d = dijkstra(g, s).dist;
     return Object.keys(d).filter(v => d[v] <= limit).sort();
   }
   ```

   Виклик `[reachableWithin(wgraph, 'A', 4), reachableWithin(wgraph, 'A', 0)]` → `[['A', 'B', 'C', 'D'], ['A']]`

34. Приклад розв'язку:

   ```js
   function eccentricity(g, s) {
     const d = dijkstra(g, s).dist;
     return Math.max(...Object.values(d).filter(x => x !== Infinity));
   }
   ```

   Виклик `[eccentricity(wgraph, 'A'), eccentricity(wgraph, 'E')]` → `[7, 0]`

35. Приклад розв'язку:

   ```js
   function buildUndirected(edges) {
     const g = {};
     for (const [u, v, w] of edges) {
       (g[u] ||= []).push([v, w]);
       (g[v] ||= []).push([u, w]);
     }
     return g;
   }
   ```

   Виклик `dijkstra(buildUndirected([['a', 'b', 7], ['b', 'c', 3], ['a', 'c', 12]]), 'a').dist` → `{ a: 0, b: 7, c: 10 }`

36. Усі ще не закриті вершини мають відстань не меншу за поточну (мінімальну в купі), а ваги невід'ємні, тому будь-який альтернативний шлях через них не може бути коротшим. Отже, знайдена відстань мінімальна.
37. Вершина, закрита з відстанню `d`, могла б отримати меншу відстань через пізніше розглянуту вершину з від'ємним ребром. Припущення «префікс шляху не довший за повний шлях» перестає виконуватись, і закрита відстань може виявитись неправильною.
38. У купі можуть бути застарілі записи про вершину (її відстань потім зменшилась). Такі записи пропускають, щоб не обробляти вершину повторно й зберегти час `O((V + E) log V)`.
39. З бінарною купою `O((V + E) log V)`; з масивом `O(V²)` (вигідно для щільних графів); з купою Фібоначчі `O(E + V log V)`, хоч на практиці через великі константи її застосовують рідко.
40. BFS мінімізує кількість ребер у незваженому графі й використовує чергу FIFO. Дейкстра враховує ваги й використовує пріоритетну чергу; якщо всі ваги рівні, вона поводиться як BFS, але повільніша на логарифмічний множник.
41. Обидва жадібні з пріоритетною чергою, але Дейкстра мінімізує повну відстань від джерела (`dist[v] + w`), а Прим — вагу одного ребра, що з'єднує вершину з вже побудованим деревом (`w`). Тому результат Прима — мінімальне кістякове дерево, а Дейкстри — дерево найкоротших шляхів.
42. Для будь-якої операції накопичення, що не зменшує значення при додаванні ребра й зберігає порядок: сума невід'ємних, максимум (мінімакс-шляхи), добуток ймовірностей `≤ 1` (з логарифмом чи від'ємним пріоритетом).
43. Під час релаксації записувати `parent[u] = v`. Після завершення йти від цілі за `parent` до джерела та розвернути послідовність.
44. Коли відома розумна евристична оцінка відстані до цілі (географічна відстань, манхеттенська): A* розглядає менше вершин, спрямовуючи пошук до цілі, і лишається оптимальним за допустимої евристики.
45. Бінарна купа не підтримує швидке зменшення пріоритету довільного елемента, тому нове значення просто додають як новий запис, а старі при витяганні розпізнають за `d > dist[v]` і ігнорують. Розмір купи до `E`, час `O(E log E) = O(E log V)`.
46. `{ a: 0, b: 7, c: 10 }`
47. `[['A', 'B', 'D'], ['A', 'C', 'D']]`
48. `[8, 7]`
49. `{ A: 0, B: 0.1, C: 0.2 }`
50. `3`
