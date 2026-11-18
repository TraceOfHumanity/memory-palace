# Prim's Algorithm — мінімальне кістякове дерево за Примом

Алгоритм Прима будує MST (мінімальне кістякове дерево, див. [kruskal.md](kruskal.md)) **ростом від однієї вершини**: тримаємо поточне дерево `T`, і на кожному кроці додаємо **найлегше ребро**, що з'єднує `T` з вершиною поза `T`. Схожий на [Дейкстру](dijkstra.md) — лише «вага» вершини в черзі є не відстанню від джерела, а **вагою одного ребра** до дерева.

## 1. Алгоритм

1. Вибрати довільну стартову вершину `s`; `key[s] = 0`, для решти `key[v] = ∞` (мінімальна вага ребра, що веде до `v` із дерева).
2. Поки є вершини поза деревом: узяти вершину `u` з **найменшим** `key` і додати до дерева (разом із ребром `parent[u] → u`).
3. Для кожного сусіда `v` вершини `u`, що ще поза деревом: якщо `w(u, v) < key[v]` — `key[v] = w(u, v)`, `parent[v] = u`.

Приклад (той самий граф, що й у Крускала): `A–B (4)`, `A–C (1)`, `B–C (2)`, `B–D (5)`, `C–D (8)`, `C–E (10)`, `D–E (2)`. Прим від `A`: ребра `[['A', 'C', 1], ['C', 'B', 2], ['B', 'D', 5], ['D', 'E', 2]]`, сума 10 — така ж, як у Крускала (дерево може відрізнятись за набором ребер лише при рівних вагах).

Трасування:

- старт A
- додаємо A–C (1), сума 1
- додаємо C–B (2), сума 3
- пропуск A–B (4): вже в дереві
- додаємо B–D (5), сума 8
- додаємо D–E (2), сума 10
- пропуск C–D (8): вже в дереві
- пропуск C–E (10): вже в дереві

## 2. Чому це правильно

За **властивістю розрізу**: у будь-який момент розріз `(T, V \ T)`. Найлегше ребро, що його перетинає, безпечне (належить до якогось MST). Прим саме таке ребро й обирає на кожному кроці, тож за індукцією отримане дерево — мінімальне.

## 3. Реалізація

```js
const primGraph = {
  A: [['B', 4], ['C', 1]],
  B: [['A', 4], ['C', 2], ['D', 5]],
  C: [['A', 1], ['B', 2], ['D', 8], ['E', 10]],
  D: [['B', 5], ['C', 8], ['E', 2]],
  E: [['C', 10], ['D', 2]],
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

function prim(g, s) {
  const inTree = new Set();
  const edges = [];
  let total = 0;
  const pq = new MinHeap();
  pq.push([s, null, 0], 0);
  while (pq.size) {
    const [w, [v, from]] = pq.pop();
    if (inTree.has(v)) continue;
    inTree.add(v);
    if (from !== null) { edges.push([from, v, w]); total += w; }
    for (const [u, wu] of g[v]) if (!inTree.has(u)) pq.push([u, v], wu);
  }
  return { edges, total, spans: inTree.size === Object.keys(g).length };
}

function primTrace(g, s) {
  const inTree = new Set();
  const out = [];
  let total = 0;
  const pq = new MinHeap();
  pq.push([s, null], 0);
  while (pq.size) {
    const [w, [v, from]] = pq.pop();
    if (inTree.has(v)) { out.push('пропуск ' + (from ? from + '–' : '') + v + ' (' + w + '): вже в дереві'); continue; }
    inTree.add(v);
    total += w;
    out.push(from === null ? 'старт ' + v : 'додаємо ' + from + '–' + v + ' (' + w + '), сума ' + total);
    for (const [u, wu] of g[v]) if (!inTree.has(u)) pq.push([u, v], wu);
  }
  return out;
}

function primDense(g, s) {
  const keys = Object.keys(g);
  const key = {};
  const parent = {};
  const done = new Set();
  for (const v of keys) key[v] = Infinity;
  key[s] = 0;
  let total = 0;
  for (let i = 0; i < keys.length; i++) {
    let u = null;
    for (const v of keys) if (!done.has(v) && (u === null || key[v] < key[u])) u = v;
    if (key[u] === Infinity) break;
    done.add(u);
    total += key[u];
    for (const [v, w] of g[u]) if (!done.has(v) && w < key[v]) { key[v] = w; parent[v] = u; }
  }
  return { total, parent };
}

function primMatrix(m) {
  const n = m.length;
  const key = new Array(n).fill(Infinity);
  const inTree = new Array(n).fill(false);
  key[0] = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || key[v] < key[u])) u = v;
    inTree[u] = true;
    total += key[u];
    for (let v = 0; v < n; v++) if (m[u][v] > 0 && !inTree[v] && m[u][v] < key[v]) key[v] = m[u][v];
  }
  return total;
}

function maxPrim(g, s) {
  const neg = {};
  for (const v of Object.keys(g)) neg[v] = g[v].map(([u, w]) => [u, -w]);
  const r = prim(neg, s);
  return { total: -r.total, edges: r.edges.map(([a, b, w]) => [a, b, -w]) };
}

function mstFromEdgeList(edges) {
  const g = {};
  for (const [u, v, w] of edges) {
    (g[u] ||= []).push([v, w]);
    (g[v] ||= []).push([u, w]);
  }
  return g;
}

function minCostToSupplyWater(n, wells, pipes) {
  const g = { 0: [] };
  for (let i = 1; i <= n; i++) g[i] = [];
  for (let i = 0; i < n; i++) {
    g[0].push([i + 1, wells[i]]);
    g[i + 1].push([0, wells[i]]);
  }
  for (const [a, b, c] of pipes) {
    g[a].push([b, c]);
    g[b].push([a, c]);
  }
  return prim(g, 0).total;
}

function countHeapPushes(g, s) {
  let pushes = 0;
  const inTree = new Set();
  const pq = new MinHeap();
  pq.push([s, null], 0);
  pushes++;
  while (pq.size) {
    const [w, [v]] = pq.pop();
    if (inTree.has(v)) continue;
    inTree.add(v);
    for (const [u, wu] of g[v]) if (!inTree.has(u)) { pq.push([u, v], wu); pushes++; }
  }
  return pushes;
}
```

## 4. Складність

| Реалізація | Час | Коли |
|---|---|---|
| Масив + лінійний пошук мінімуму | `O(V²)` | щільні графи, матриця суміжності |
| Бінарна купа (lazy deletion) | `O(E log V)` | розріджені графи |
| Купа Фібоначчі | `O(E + V log V)` | теоретично |

Пам'ять `O(V + E)`. Для `V = 1000` щільного графа (`E ≈ 500 000`): `V²` = 1000000 проти `E log V` ≈ 4982892 — масив виграє. Для розрідженого `E = 5000`: `V²` = 1000000, `E log V` ≈ 49829 — виграє купа.

## 5. Прим чи Крускал

| | Прим | Крускал |
|---|---|---|
| Основа | ріст дерева від вершини | зливання компонент |
| Структури | пріоритетна черга | сортування + DSU |
| Щільні графи | краще (`O(V²)`) | гірше |
| Розріджені | `O(E log V)` | `O(E log V)` |
| Незв'язний граф | лише одна компонента (запуск для кожної) | автоматично ліс |
| Потік ребер | ні | так (сортований) |

## 6. Прим проти Дейкстри

Обидва використовують чергу з пріоритетами; різниця — в **оновленні ключа**:

- Дейкстра: `dist[u] = dist[v] + w` — **накопичена** відстань від джерела;
- Прим: `key[u] = w` — вага **одного** ребра до дерева.

Тому MST може не містити найкоротших шляхів: у графі `A–B 4`, `A–C 3`, `B–C 2` MST містить `A–C` і `B–C`, але найкоротший шлях `A→B` — це пряме ребро (4), яке в MST не входить.

## 7. Застосування

- **Проєктування мереж** (кабелі, труби, дороги): `minCostToSupplyWater(3, [1, 2, 2], [[1, 2, 1], [2, 3, 1]])` = `3` (штучна вершина `0` для колодязів).
- **Щільні геометричні графи**, де ребер `V²/2` (точки на площині): `O(V²)` Прим без побудови списку ребер.
- **Максимальне дерево:** `maxPrim(primGraph, 'A').total` = `27`.
- **Наближення комівояжера, кластеризація, сегментація зображень.**
- **Генерація лабіринтів** (рандомізований Прим).

## 8. Типові помилки

1. **Використовувати накопичену відстань** (як у Дейкстри) замість ваги ребра.
2. **Не пропускати вершини, що вже в дереві** при витяганні з купи — дублікати ребер.
3. **Запускати з однієї вершини у незв'язному графі** й вважати результат MST: перевіряйте `spans`.
4. **Орієнтований граф** — Прим не застосовується (потрібен Чу—Лю/Едмондс).
5. **Нульові ваги в матриці як «немає ребра»** — розрізняйте відсутність і вагу 0.
6. **Рівні ваги:** дерево не єдине; порівнюйте суму.
7. **Негативні ваги** допустимі (на відміну від Дейкстри): Прим із від'ємними вагами працює коректно.
8. **Не зберегти `parent`** — втрачаємо самі ребра.

## 9. Алгоритм (стисло)

1. `key[s] = 0`, решта `∞`; черга `{(0, s)}`.
2. Витягнути `u` з найменшим ключем; якщо вже в дереві — пропустити; додати ребро `parent[u]–u`.
3. Для сусідів `v` поза деревом: `key[v] = min(key[v], w(u, v))`.
4. Час `O(E log V)` (купа) або `O(V²)` (масив).

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які ребра входять у MST `prim(primGraph, 'A')`?

```js
prim(primGraph, 'A').edges
```

**2.** Яка сума ваг і чи охоплює дерево всі вершини?

```js
(({ total, spans }) => ({ total, spans }))(prim(primGraph, 'A'))
```

**3.** Чи збігається вага MST для різних стартових вершин?

```js
['A', 'B', 'C', 'D', 'E'].map(s => prim(primGraph, s).total)
```

**4.** Які кроки виконує `primTrace(primGraph, 'A')`?

```js
primTrace(primGraph, 'A')
```

**5.** Яка вага за щільною версією `primDense(primGraph, 'A').total` і які батьки?

```js
primDense(primGraph, 'A')
```

**6.** Чи збігаються купова й масивова версії за вагою?

```js
prim(primGraph, 'A').total === primDense(primGraph, 'A').total
```

**7.** Що поверне `primMatrix` для матриці `[[0, 2, 0, 6, 0], [2, 0, 3, 8, 5], [0, 3, 0, 0, 7], [6, 8, 0, 0, 9], [0, 5, 7, 9, 0]]`?

```js
primMatrix([[0, 2, 0, 6, 0], [2, 0, 3, 8, 5], [0, 3, 0, 0, 7], [6, 8, 0, 0, 9], [0, 5, 7, 9, 0]])
```

**8.** Що поверне `prim` для однієї вершини `{ X: [] }`?

```js
prim({ X: [] }, 'X')
```

**9.** Що поверне `prim` для незв'язного графа `{ A: [['B', 1]], B: [['A', 1]], C: [] }`?

```js
prim({ A: [['B', 1]], B: [['A', 1]], C: [] }, 'A')
```

**10.** Яке максимальне кістякове дерево `maxPrim(primGraph, 'A')`?

```js
maxPrim(primGraph, 'A')
```

**11.** Що поверне `mstFromEdgeList([['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3]])`?

```js
mstFromEdgeList([['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3]])
```

**12.** Яка вага MST для графа з `mstFromEdgeList([['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3]])`?

```js
prim(mstFromEdgeList([['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 3]]), 'A').total
```

**13.** Що поверне `minCostToSupplyWater(3, [1, 2, 2], [[1, 2, 1], [2, 3, 1]])`?

```js
minCostToSupplyWater(3, [1, 2, 2], [[1, 2, 1], [2, 3, 1]])
```

### Рівень 2. Робота алгоритму

**14.** А якщо колодязі дорогі: `minCostToSupplyWater(2, [5, 5], [[1, 2, 1]])`?

```js
minCostToSupplyWater(2, [5, 5], [[1, 2, 1]])
```

**15.** Скільки разів записи потрапили в купу при `prim(primGraph, 'A')` (`countHeapPushes`)?

```js
countHeapPushes(primGraph, 'A')
```

**16.** Яка сума ваг усіх ребер `primGraph` (кожне ребро один раз) і її відношення до MST?

```js
(() => { let s = 0; for (const v of Object.keys(primGraph)) for (const [u, w] of primGraph[v]) if (v < u) s += w; return [s, prim(primGraph, 'A').total]; })()
```

**17.** Скільки операцій приблизно: щільна версія `V²` для `V = 2000` і купова `E log V` для `E = 10000`?

```js
[2000 * 2000, Math.round(10000 * Math.log2(2000))]
```

**18.** Що поверне `prim` для графа з від'ємним ребром `A–B (-5)`, `B–C (2)`, `A–C (1)`?

```js
prim({ A: [['B', -5], ['C', 1]], B: [['A', -5], ['C', 2]], C: [['A', 1], ['B', 2]] }, 'A')
```

**19.** Чи містить MST найкоротший шлях `A → B` у графі `A–B 4`, `A–C 3`, `B–C 2`? Знайдіть ребра MST.

```js
prim({ A: [['B', 4], ['C', 3]], B: [['A', 4], ['C', 2]], C: [['A', 3], ['B', 2]] }, 'A').edges
```

**20.** Яка вага MST «квадрата» `A–B 1`, `B–C 1`, `C–D 1`, `D–A 1`?

```js
prim({ A: [['B', 1], ['D', 1]], B: [['A', 1], ['C', 1]], C: [['B', 1], ['D', 1]], D: [['C', 1], ['A', 1]] }, 'A').total
```

**21.** Скільки ребер у MST графа з 8 вершин?

```js
8 - 1
```

**22.** Які значення `key` вершин після завершення `primDense` для `primGraph`? (подивіться `parent`)

```js
primDense(primGraph, 'A').parent
```

**23.** Скільки пропусків («вже в дереві») виконає `primTrace(primGraph, 'A')`?

```js
primTrace(primGraph, 'A').filter(s => s.startsWith('пропуск')).length
```

**24.** Напишіть `mstTotalFromMatrix(m)` для матриці з `Infinity` як «немає ребра» (Прим за `O(V²)`).

**25.** Напишіть `mstDegrees(g, s)` — ступені вершин у MST Прима (як об'єкт).

**26.** Напишіть `leavesOfMst(g, s)` — листки MST (вершини зі ступенем 1).

### Рівень 3. Складність і нюанси

**27.** Напишіть `mstHeaviestEdge(g, s)` — найважче ребро MST.

**28.** Напишіть `minBottleneckSpanning(g, s)` — максимальну вагу ребра в MST (це мінімально можливий «вузький» елемент для зв'язного підграфа).

**29.** Напишіть `extraCostWithoutEdge(g, s, a, b)` — на скільки зросте вага MST, якщо видалити ребро `a–b` (або `Infinity`, якщо граф розпадеться).

**30.** Напишіть `connectedByMst(g, s, limit)` — кількість вершин, до яких у MST шлях має максимальне ребро `≤ limit` (за допомогою DFS по MST).

**31.** Напишіть `primEdgesOrder(g, s)` — порядок, у якому Прим додає вершини до дерева.

**32.** Напишіть `completeGraphMst(points)` — вага MST для точок на площині (евклідова відстань) за щільним Примом `O(V²)`; результат округліть до 3 знаків.

**33.** Яка основна ідея алгоритму Прима?

**34.** Чим Прим відрізняється від Дейкстри?

**35.** Яка складність Прима залежно від структури даних?

**36.** Чому Прим працює з від'ємними вагами, а Дейкстра — ні?

**37.** Коли Прим кращий за Крускала?

**38.** Що станеться з Примом на незв'язному графі?

**39.** Навіщо потрібне лінивe видалення (пропуск вершин, що вже в дереві) у реалізації з купою?

### Рівень 4. Задачі з інтерв'ю

**40.** Чи завжди MST, знайдене Примом, збігається з MST Крускала?

**41.** Як Прим застосовується для щільних геометричних задач?

**42.** Чому MST не обов'язково містить найкоротші шляхи між вершинами?

**43.** Що поверне `prim(primGraph, 'E').edges`? (інший старт — інший порядок ребер)

```js
prim(primGraph, 'E').edges
```

**44.** Яка сума ваг ребер, інцидентних вершині `C` у `primGraph` (сума ваг її списку суміжності)?

```js
primGraph.C.reduce((s, [, w]) => s + w, 0)
```

**45.** Яке найлегше ребро в `primGraph`?

```js
(() => { let best = null; for (const v of Object.keys(primGraph)) for (const [u, w] of primGraph[v]) if (!best || w < best[2]) best = [v, u, w]; return best; })()
```

**46.** Яке найважче ребро в `primGraph`, і чи входить воно в MST?

```js
(() => { let best = null; for (const v of Object.keys(primGraph)) for (const [u, w] of primGraph[v]) if (!best || w > best[2]) best = [v, u, w]; const inMst = prim(primGraph, 'A').edges.some(([a, b, w]) => w === best[2]); return [best, inMst]; })()
```

**47.** Чи залежить кількість записів у купі від стартової вершини? Порівняйте `countHeapPushes` для `A` та `E`.

```js
[countHeapPushes(primGraph, 'A'), countHeapPushes(primGraph, 'E')]
```

**48.** Що поверне `prim` для графа-ланцюжка з 5 вершин вагами 1, 2, 3, 4?

```js
prim(mstFromEdgeList([['a', 'b', 1], ['b', 'c', 2], ['c', 'd', 3], ['d', 'e', 4]]), 'a').total
```

**49.** Що поверне MST, якщо всі ваги рівні — скільки ребер і яка сума для повного графа `K4` з вагою 3?

```js
(({ edges, total }) => ({ ребер: edges.length, total }))(prim(mstFromEdgeList([['a', 'b', 3], ['a', 'c', 3], ['a', 'd', 3], ['b', 'c', 3], ['b', 'd', 3], ['c', 'd', 3]]), 'a'))
```

**50.** Скільки вузлів-листків у MST зірки `s–a, s–b, s–c, s–d`?

```js
(() => { const r = prim(mstFromEdgeList([['s', 'a', 1], ['s', 'b', 1], ['s', 'c', 1], ['s', 'd', 1]]), 's'); const deg = {}; r.edges.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1; }); return Object.values(deg).filter(d => d === 1).length; })()
```

### Відповіді

1. `[['A', 'C', 1], ['C', 'B', 2], ['B', 'D', 5], ['D', 'E', 2]]`
2. `{ total: 10, spans: true }`
3. `[10, 10, 10, 10, 10]`
4. `['старт A', 'додаємо A–C (1), сума 1', 'додаємо C–B (2), сума 3', 'пропуск A–B (4): вже в дереві', 'додаємо B–D (5), сума 8', 'додаємо D–E (2), сума 10', 'пропуск C–D (8): вже в дереві', 'пропуск C–E (10): вже в дереві']`
5. `{ total: 10, parent: { B: 'C', C: 'A', D: 'B', E: 'D' } }`
6. `true`
7. `16`
8. `{ edges: [], total: 0, spans: true }`
9. `{ edges: [['A', 'B', 1]], total: 1, spans: false }`
10. `{ total: 27, edges: [['A', 'B', 4], ['B', 'D', 5], ['D', 'C', 8], ['C', 'E', 10]] }`
11. `{ A: [['B', 1], ['C', 3]], B: [['A', 1], ['C', 2]], C: [['B', 2], ['A', 3]] }`
12. `3`
13. `3`
14. `6`
15. `8`
16. `[32, 10]`
17. `[4000000, 109658]`
18. `{ edges: [['A', 'B', -5], ['A', 'C', 1]], total: -4, spans: true }`
19. `[['A', 'C', 3], ['C', 'B', 2]]`
20. `3`
21. `7`
22. `{ B: 'C', C: 'A', D: 'B', E: 'D' }`
23. `3`
24. Приклад розв'язку:

   ```js
   function mstTotalFromMatrix(m) {
     const n = m.length, key = Array(n).fill(Infinity), done = Array(n).fill(false);
     key[0] = 0;
     let t = 0;
     for (let i = 0; i < n; i++) {
       let u = -1;
       for (let v = 0; v < n; v++) if (!done[v] && (u === -1 || key[v] < key[u])) u = v;
       if (key[u] === Infinity) return -1;
       done[u] = true;
       t += key[u];
       for (let v = 0; v < n; v++) if (!done[v] && m[u][v] < key[v]) key[v] = m[u][v];
     }
     return t;
   }
   ```

   Виклик `[mstTotalFromMatrix([[0, 1, Infinity], [1, 0, 2], [Infinity, 2, 0]]), mstTotalFromMatrix([[0, Infinity], [Infinity, 0]])]` → `[3, -1]`

25. Приклад розв'язку:

   ```js
   function mstDegrees(g, s) {
     const deg = {};
     for (const v of Object.keys(g)) deg[v] = 0;
     for (const [a, b] of prim(g, s).edges) {
       deg[a]++;
       deg[b]++;
     }
     return deg;
   }
   ```

   Виклик `mstDegrees(primGraph, 'A')` → `{ A: 1, B: 2, C: 2, D: 2, E: 1 }`

26. Приклад розв'язку:

   ```js
   function leavesOfMst(g, s) {
     const deg = {};
     for (const v of Object.keys(g)) deg[v] = 0;
     for (const [a, b] of prim(g, s).edges) {
       deg[a]++;
       deg[b]++;
     }
     return Object.keys(deg).filter(v => deg[v] === 1).sort();
   }
   ```

   Виклик `leavesOfMst(primGraph, 'A')` → `['A', 'E']`

27. Приклад розв'язку:

   ```js
   function mstHeaviestEdge(g, s) {
     return prim(g, s).edges.reduce((m, e) => e[2] > m[2] ? e : m);
   }
   ```

   Виклик `mstHeaviestEdge(primGraph, 'A')` → `['B', 'D', 5]`

28. Приклад розв'язку:

   ```js
   const minBottleneckSpanning = (g, s) => Math.max(...prim(g, s).edges.map(e => e[2]))
   ```

   Виклик `minBottleneckSpanning(primGraph, 'A')` → `5`

29. Приклад розв'язку:

   ```js
   function extraCostWithoutEdge(g, s, a, b) {
     const base = prim(g, s);
     const g2 = {};
     for (const v of Object.keys(g)) g2[v] = g[v].filter(([u]) => !((v === a && u === b) || (v === b && u === a)));
     const r = prim(g2, s);
     return r.spans ? r.total - base.total : Infinity;
   }
   ```

   Виклик `[extraCostWithoutEdge(primGraph, 'A', 'A', 'C'), extraCostWithoutEdge(primGraph, 'A', 'A', 'B'), extraCostWithoutEdge({ A: [['B', 1]], B: [['A', 1]] }, 'A', 'A', 'B')]` → `[3, 0, Infinity]`

30. Приклад розв'язку:

   ```js
   function connectedByMst(g, s, limit) {
     const mst = prim(g, s).edges;
     const adj = {};
     for (const v of Object.keys(g)) adj[v] = [];
     for (const [a, b, w] of mst) if (w <= limit) {
       adj[a].push(b);
       adj[b].push(a);
     }
     const seen = new Set([s]);
     const st = [s];
     while (st.length) {
       const v = st.pop();
       for (const u of adj[v]) if (!seen.has(u)) {
         seen.add(u);
         st.push(u);
       }
     }
     return seen.size;
   }
   ```

   Виклик `[connectedByMst(primGraph, 'A', 2), connectedByMst(primGraph, 'A', 5), connectedByMst(primGraph, 'A', 0)]` → `[3, 5, 1]`

31. Приклад розв'язку:

   ```js
   function primEdgesOrder(g, s) {
     const order = [];
     const inTree = new Set();
     const pq = new MinHeap();
     pq.push(s, 0);
     while (pq.size) {
       const [w, v] = pq.pop();
       if (inTree.has(v)) continue;
       inTree.add(v);
       order.push(v);
       for (const [u, wu] of g[v]) if (!inTree.has(u)) pq.push(u, wu);
     }
     return order;
   }
   ```

   Виклик `primEdgesOrder(primGraph, 'A')` → `['A', 'C', 'B', 'D', 'E']`

32. Приклад розв'язку:

   ```js
   function completeGraphMst(p) {
     const n = p.length, key = Array(n).fill(Infinity), done = Array(n).fill(false);
     key[0] = 0;
     let t = 0;
     for (let i = 0; i < n; i++) {
       let u = -1;
       for (let v = 0; v < n; v++) if (!done[v] && (u === -1 || key[v] < key[u])) u = v;
       done[u] = true;
       t += key[u];
       for (let v = 0; v < n; v++) if (!done[v]) key[v] = Math.min(key[v], Math.hypot(p[u][0] - p[v][0], p[u][1] - p[v][1]));
     }
     return +t.toFixed(3);
   }
   ```

   Виклик `[completeGraphMst([[0, 0], [3, 4], [6, 8]]), completeGraphMst([[0, 0], [1, 0], [0, 1], [1, 1]])]` → `[10, 3]`

33. Починаючи з довільної вершини, на кожному кроці додавати до дерева найлегше ребро, що з'єднує дерево з вершиною поза ним. За властивістю розрізу таке ребро завжди безпечне.
34. Обидва використовують чергу з пріоритетами, але в Дейкстри пріоритет вершини — накопичена відстань від джерела, а в Прима — вага одного ребра, що з'єднує вершину з деревом. Тому Дейкстра дає найкоротші шляхи, а Прим — мінімальне кістякове дерево.
35. З масивом (лінійний пошук мінімуму) `O(V²)`, з бінарною купою `O(E log V)`, з купою Фібоначчі `O(E + V log V)`. Для щільних графів вигідний масив, для розріджених — купа.
36. Прим порівнює ваги окремих ребер і не накопичує суму шляху, тож знак ваг не порушує жадібного вибору за властивістю розрізу. Дейкстра ж спирається на невід'ємність накопичених відстаней.
37. У щільних графах та коли граф заданий матрицею суміжності: `O(V²)` без сортування всіх ребер; також коли ребра генеруються «на льоту» (геометричні задачі).
38. Він побудує дерево лише компоненти стартової вершини. Для кістякового лісу запускають алгоритм від кожної ще не покритої вершини; ознака незв'язності — кількість доданих вершин менша за `V`.
39. Одна вершина може потрапити в купу кілька разів (від різних сусідів). Витягнувши запис про вершину, що вже в дереві, його ігнорують: пріоритетна черга не підтримує швидке зменшення ключа.
40. Вага збігається завжди. Набір ребер збігається, якщо всі ваги різні (MST єдине); при рівних вагах дерева можуть відрізнятися.
41. Коли між усіма парами точок є ребро (евклідова відстань), будувати список з `V²/2` ребер для Крускала невигідно; щільний Прим рахує відстані на льоту й працює за `O(V²)` пам'яті `O(V)`.
42. MST мінімізує сумарну вагу, а не відстань між парами. Прямий найкоротший шлях між двома вершинами може використовувати ребро, що не входить до дерева, бо воно важче за альтернативи, які разом лишають граф зв'язним дешевше.
43. `[['E', 'D', 2], ['D', 'B', 5], ['B', 'C', 2], ['C', 'A', 1]]`
44. `21`
45. `['A', 'C', 1]`
46. `[['C', 'E', 10], false]`
47. `[8, 8]`
48. `10`
49. `{ 'ребер': 3, total: 9 }`
50. `4`
