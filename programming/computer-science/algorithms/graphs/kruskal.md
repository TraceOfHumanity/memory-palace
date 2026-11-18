# Kruskal's Algorithm — мінімальне кістякове дерево за Крускалом

**Кістякове дерево** (spanning tree) зв'язного неорієнтованого графа — це підграф, що містить усі вершини, зв'язний і **без циклів** (отже, рівно `V − 1` ребро). **Мінімальне кістякове дерево** (MST) — таке, у якого сума ваг ребер найменша. Задача виникає всюди, де треба з'єднати все найдешевше: прокласти мережу кабелів/доріг/труб, кластеризація (single-linkage), наближення задачі комівояжера. Алгоритм Крускала — жадібний: **сортуємо ребра за вагою й додаємо кожне, якщо воно не створює цикл**.

## 1. Алгоритм

1. Відсортувати всі ребра за вагою зростанням.
2. Створити [DSU](union-find.md) на `V` вершин.
3. Для кожного ребра `(u, v, w)` у порядку зростання: якщо `u` і `v` в **різних** компонентах (`union` повернув `true`) — додати ребро до MST.
4. Зупинитись, коли додано `V − 1` ребро.

Приклад: ребра `A–B (4)`, `A–C (1)`, `B–C (2)`, `B–D (5)`, `C–D (8)`, `C–E (10)`, `D–E (2)`. MST: `[['A', 'C', 1], ['B', 'C', 2], ['D', 'E', 2], ['B', 'D', 5]]`, сума ваг 10.

Трасування:

- A–C (1): беремо, сума 1
- B–C (2): беремо, сума 3
- D–E (2): беремо, сума 5
- A–B (4): цикл, пропускаємо
- B–D (5): беремо, сума 10
- C–D (8): цикл, пропускаємо
- C–E (10): цикл, пропускаємо

## 2. Чому жадібність працює: властивість розрізу

**Cut property (властивість розрізу).** Для будь-якого розбиття вершин на дві частини `S` і `V \ S` **найлегше ребро**, що перетинає розріз, належить до якогось MST (якщо вага унікальна — до кожного).

**Доказ.** Нехай `T` — MST, що **не** містить найлегшого ребра `e = (u, v)` розрізу. Додамо `e` до `T`: утвориться цикл, який перетинає розріз ще принаймні раз іншим ребром `f`. Тоді `w(e) ≤ w(f)`, і заміна `f` на `e` дає дерево не гірше. Отже, існує MST із `e`.

**Застосування до Крускала.** Коли ми розглядаємо ребро `e`, яке з'єднує дві різні компоненти `C₁` і `C₂`, розглянемо розріз `(C₁, решта)`. Усі легші ребра, що його перетинали, уже розглянуті й або додані (тоді вони з'єднали б компоненти), або відкинуті. Отже, `e` — найлегше ребро, що перетинає розріз, і безпечне.

**Cycle property (властивість циклу).** Найважче ребро будь-якого циклу **не** входить у MST (за унікальних ваг). Тому відкидати ребро, що замикає цикл, коректно.

## 3. Реалізація

```js
const mstEdges = [
  ['A', 'B', 4],
  ['A', 'C', 1],
  ['B', 'C', 2],
  ['B', 'D', 5],
  ['C', 'D', 8],
  ['C', 'E', 10],
  ['D', 'E', 2],
];

class DSU {
  constructor(items) {
    this.parent = new Map(items.map((x) => [x, x]));
    this.size = new Map(items.map((x) => [x, 1]));
    this.count = items.length;
  }
  find(x) {
    while (this.parent.get(x) !== x) {
      this.parent.set(x, this.parent.get(this.parent.get(x)));
      x = this.parent.get(x);
    }
    return x;
  }
  union(a, b) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    if (this.size.get(ra) < this.size.get(rb)) [ra, rb] = [rb, ra];
    this.parent.set(rb, ra);
    this.size.set(ra, this.size.get(ra) + this.size.get(rb));
    this.count--;
    return true;
  }
}

function kruskal(vertices, edges) {
  const sorted = edges.slice().sort((a, b) => a[2] - b[2]);
  const dsu = new DSU(vertices);
  const mst = [];
  let total = 0;
  for (const [u, v, w] of sorted) {
    if (dsu.union(u, v)) {
      mst.push([u, v, w]);
      total += w;
      if (mst.length === vertices.length - 1) break;
    }
  }
  return { edges: mst, total, connected: mst.length === vertices.length - 1 };
}

function kruskalTrace(vertices, edges) {
  const sorted = edges.slice().sort((a, b) => a[2] - b[2]);
  const dsu = new DSU(vertices);
  const out = [];
  let total = 0;
  for (const [u, v, w] of sorted) {
    if (dsu.union(u, v)) {
      total += w;
      out.push(u + '–' + v + ' (' + w + '): беремо, сума ' + total);
    } else out.push(u + '–' + v + ' (' + w + '): цикл, пропускаємо');
  }
  return out;
}

function maximumSpanningTree(vertices, edges) {
  return kruskal(vertices, edges.map(([u, v, w]) => [u, v, -w]));
}

function kruskalForest(vertices, edges) {
  const sorted = edges.slice().sort((a, b) => a[2] - b[2]);
  const dsu = new DSU(vertices);
  const forest = [];
  for (const [u, v, w] of sorted) if (dsu.union(u, v)) forest.push([u, v, w]);
  return { forest, components: dsu.count };
}

function secondBestMstWeight(vertices, edges) {
  const best = kruskal(vertices, edges);
  let second = Infinity;
  for (const skip of best.edges) {
    const rest = edges.filter((e) => e !== skip && !(e[0] === skip[0] && e[1] === skip[1] && e[2] === skip[2]));
    const r = kruskal(vertices, rest);
    if (r.connected && r.total >= best.total && r.total < second) second = r.total;
  }
  return second;
}

function minCostConnectPoints(points) {
  const n = points.length;
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    edges.push([i, j, Math.abs(points[i][0] - points[j][0]) + Math.abs(points[i][1] - points[j][1])]);
  }
  return kruskal(Array.from({ length: n }, (_, i) => i), edges).total;
}

function kClusters(points, k) {
  const n = points.length;
  const edges = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    edges.push([i, j, Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1])]);
  }
  edges.sort((a, b) => a[2] - b[2]);
  const dsu = new DSU(Array.from({ length: n }, (_, i) => i));
  for (const [u, v, w] of edges) {
    if (dsu.count === k) {
      if (dsu.find(u) !== dsu.find(v)) return w;
    } else dsu.union(u, v);
  }
  return 0;
}

function isMst(vertices, edges, candidate) {
  const best = kruskal(vertices, edges).total;
  const sum = candidate.reduce((s, e) => s + e[2], 0);
  const dsu = new DSU(vertices);
  const acyclic = candidate.every(([u, v]) => dsu.union(u, v));
  return acyclic && candidate.length === vertices.length - 1 && sum === best;
}

function criticalEdgesCount(vertices, edges) {
  const best = kruskal(vertices, edges).total;
  let critical = 0;
  for (let i = 0; i < edges.length; i++) {
    const rest = edges.filter((_, j) => j !== i);
    const r = kruskal(vertices, rest);
    if (!r.connected || r.total > best) critical++;
  }
  return critical;
}
```

## 4. Складність

- **Сортування ребер:** `O(E log E) = O(E log V)` — домінує.
- **DSU-операції:** `E` викликів `find` / `union` по `O(α(V))` ≈ константа.
- **Разом `O(E log V)`**, пам'ять `O(V + E)`.
- Якщо ребра вже відсортовані (або ваги малі цілі — сортування підрахунком), Крускал майже лінійний: `O(E·α(V))`.
- **Крускал vs Прим:** Крускал природний для розріджених графів і списків ребер; Прим ([prim.md](prim.md)) — для щільних (`O(V²)` з масивом). Обидва дають одну й ту саму **вагу** MST; самі дерева можуть відрізнятися, якщо є рівні ваги.

## 5. Єдиність і рівні ваги

Якщо всі ваги **різні**, MST **єдине**. Якщо ваги повторюються, MST може бути кілька (однакової ваги). Для перевірки, чи ребро входить у **всі** / **деякі** / **жодне** MST: «критичні» ребра (їх видалення збільшує вагу) і «псевдокритичні» — задача `criticalEdgesCount`.

## 6. Застосування

- **Проєктування мереж** (електрика, оптоволокно, трубопроводи): `minCostConnectPoints([[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]])` = `20` (манхеттенська відстань).
- **Кластеризація single-linkage:** видалення `k − 1` найважчих ребер MST розбиває дані на `k` кластерів; `kClusters([[0, 0], [1, 0], [10, 0], [11, 0]], 2)` = `9` (відстань між кластерами).
- **Максимальне кістякове дерево:** змінити знак ваг: `maximumSpanningTree(['A', 'B', 'C', 'D', 'E'], mstEdges).total` = `-27` (мінус сума).
- **Мінімальний кістяковий ліс** для незв'язного графа: `kruskalForest(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['C', 'D', 2]]).components` = `2`.
- **Мінімаксні шляхи:** шлях між двома вершинами в MST мінімізує максимальне ребро (bottleneck).
- **Наближення комівояжера:** обхід MST дає 2-наближення для метричної TSP.
- **Генерація лабіринтів** (випадковий Крускал: ребра в випадковому порядку).
- **Обробка зображень, сегментація Фельценшвальба.**

## 7. Типові помилки

1. **Не відсортувати** ребра або сортувати за спаданням (дасть максимальне дерево).
2. **Додавати ребро без перевірки циклу** (без DSU).
3. **DSU без об'єднання за розміром/стиснення** — гірша за `O(E log V)`.
4. **Не врахувати незв'язність:** результат — ліс, а не дерево; перевіряйте кількість ребер (`connected`).
5. **Для орієнтованих графів** — це не працює (потрібна арборесценція Чу—Лю/Едмондса).
6. **Порівняння дерев за множиною ребер** — MST може бути не єдиним; порівнюйте вагу.
7. **Паралельні ребра й петлі:** петлі завжди створюють цикл і відкидаються; з паралельних беруться найлегші автоматично.
8. **Плутанина з Дейкстрою:** MST не гарантує найкоротших шляхів між парами.

## 8. Алгоритм (стисло)

1. Відсортувати ребра за вагою.
2. DSU на вершинах.
3. Для кожного ребра: якщо `union(u, v)` успішний — додати ребро; зупинитись на `V − 1` ребрі.
4. Час `O(E log V)`, пам'ять `O(V + E)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які ребра входять у MST `kruskal(vertices, mstEdges)`?

```js
kruskal(['A', 'B', 'C', 'D', 'E'], mstEdges).edges
```

**2.** Яка сума ваг MST?

```js
kruskal(['A', 'B', 'C', 'D', 'E'], mstEdges).total
```

**3.** Чи зв'язний результат?

```js
kruskal(['A', 'B', 'C', 'D', 'E'], mstEdges).connected
```

**4.** Які кроки виконує `kruskalTrace`?

```js
kruskalTrace(['A', 'B', 'C', 'D', 'E'], mstEdges)
```

**5.** Скільки ребер у MST графа з 5 вершинами?

```js
kruskal(['A', 'B', 'C', 'D', 'E'], mstEdges).edges.length
```

**6.** Яке ребро пропущено як таке, що створює цикл, першим?

```js
kruskalTrace(['A', 'B', 'C', 'D', 'E'], mstEdges).find(s => s.includes('цикл'))
```

**7.** Чи збігається сума ваг MST із сумою ваг, якщо зібрати дерево обходом сортованих ребер у зворотному порядку (максимальне дерево)?

```js
[kruskal(['A', 'B', 'C', 'D', 'E'], mstEdges).total, -maximumSpanningTree(['A', 'B', 'C', 'D', 'E'], mstEdges).total]
```

**8.** Яке максимальне кістякове дерево для `mstEdges`?

```js
maximumSpanningTree(['A', 'B', 'C', 'D', 'E'], mstEdges).edges.map(([u, v, w]) => [u, v, -w])
```

**9.** Що поверне `kruskal(['A'], [])` для однієї вершини?

```js
kruskal(['A'], [])
```

**10.** Що поверне `kruskal(['A', 'B'], [])` для двох ізольованих вершин?

```js
kruskal(['A', 'B'], [])
```

**11.** Що поверне `kruskal` для двох вершин із паралельними ребрами вагами 5 і 2?

```js
kruskal(['A', 'B'], [['A', 'B', 5], ['A', 'B', 2]])
```

**12.** Що поверне `kruskal` для вершин із петлею `['A', 'A', 1]` і ребром `['A', 'B', 3]`?

```js
kruskal(['A', 'B'], [['A', 'A', 1], ['A', 'B', 3]])
```

**13.** Що поверне `kruskalForest(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['C', 'D', 2]])`?

```js
kruskalForest(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['C', 'D', 2]])
```

### Рівень 2. Робота алгоритму

**14.** Що поверне MST для трикутника з однаковими вагами `1`: скільки ребер і яка сума?

```js
(({ edges, total }) => ({ ребер: edges.length, total }))(kruskal(['A', 'B', 'C'], [['A', 'B', 1], ['B', 'C', 1], ['A', 'C', 1]]))
```

**15.** Яка вага другого за величиною MST для `mstEdges`?

```js
secondBestMstWeight(['A', 'B', 'C', 'D', 'E'], mstEdges)
```

**16.** Що поверне `minCostConnectPoints([[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]])`?

```js
minCostConnectPoints([[0, 0], [2, 2], [3, 10], [5, 2], [7, 0]])
```

**17.** Що поверне `minCostConnectPoints([[3, 12], [-2, 5], [-4, 1]])`?

```js
minCostConnectPoints([[3, 12], [-2, 5], [-4, 1]])
```

**18.** Що поверне `minCostConnectPoints([[0, 0]])`?

```js
minCostConnectPoints([[0, 0]])
```

**19.** Що поверне `kClusters([[0, 0], [1, 0], [10, 0], [11, 0]], 2)`?

```js
kClusters([[0, 0], [1, 0], [10, 0], [11, 0]], 2)
```

**20.** А для `k = 3`?

```js
kClusters([[0, 0], [1, 0], [10, 0], [11, 0]], 3)
```

**21.** Чи є `[['A', 'C', 1], ['B', 'C', 2], ['D', 'E', 2], ['B', 'D', 5]]` MST?

```js
isMst(['A', 'B', 'C', 'D', 'E'], mstEdges, [['A', 'C', 1], ['B', 'C', 2], ['D', 'E', 2], ['B', 'D', 5]])
```

**22.** Чи є `[['A', 'B', 4], ['A', 'C', 1], ['D', 'E', 2], ['B', 'D', 5]]` MST? (вага більша)

```js
isMst(['A', 'B', 'C', 'D', 'E'], mstEdges, [['A', 'B', 4], ['A', 'C', 1], ['D', 'E', 2], ['B', 'D', 5]])
```

**23.** Скільки «критичних» ребер (їх видалення збільшує вагу MST або порушує зв'язність) у `mstEdges`?

```js
criticalEdgesCount(['A', 'B', 'C', 'D', 'E'], mstEdges)
```

**24.** Скільки ребер у повному графі на 6 вершинах і скільки в його MST?

```js
[6 * 5 / 2, 5]
```

**25.** Скільки порівнянь при сортуванні `E = 10⁶` ребер приблизно (`E·log₂ E`)?

```js
Math.round(1e6 * Math.log2(1e6))
```

**26.** Чи залежить кінцева вага MST від порядку ребер із однаковою вагою? Порівняйте два порядки на трикутнику з трьома ребрами вагою 1.

```js
[kruskal(['A', 'B', 'C'], [['A', 'B', 1], ['B', 'C', 1], ['A', 'C', 1]]).total, kruskal(['A', 'B', 'C'], [['A', 'C', 1], ['B', 'C', 1], ['A', 'B', 1]]).total]
```

### Рівень 3. Складність і нюанси

**27.** Напишіть `mstWeightOnly(n, edges)` — вага MST для вершин `0..n − 1` (або `-1`, якщо граф незв'язний).

**28.** Напишіть `bottleneck(n, edges, s, t)` — мінімум можливого максимального ребра на шляху `s → t` (через MST: максимум на шляху в дереві).

**29.** Напишіть `removeEdgesKeepConnected(n, edges)` — максимальну кількість ребер, які можна видалити без втрати зв'язності (`E − (V − 1)`), або `-1`, якщо граф незв'язний.

**30.** Напишіть `connectCitiesMinCost(n, connections)` — мінімальна вартість з'єднання міст `1..n` (`[a, b, cost]`) або `-1`.

**31.** Напишіть `mstEdgeCountInAllMsts(vertices, edges)` — кількість ребер, що входять у кожне MST (ребра, без яких вага зростає): використайте `criticalEdgesCount`.

**32.** Напишіть `lexSortedMstEdges(vertices, edges)` — ребра MST, відсортовані за `u + v` лексикографічно.

**33.** Напишіть `mazeWalls(n)` — кількість стін, що залишаться, якщо з сітки `n × n` клітинок прибрати стіни за допомогою Крускала (результат — кістякове дерево клітинок): стін усього `2n(n − 1)`, залишається `2n(n − 1) − (n² − 1)`.

**34.** Напишіть `treeDiameterFromMst(n, edges)` — найбільша відстань (за вагами) між двома вершинами в MST (простий перебір усіх пар).

**35.** Напишіть `isTreeByWeights(n, edges)` — чи утворюють рівно `n − 1` ребра дерево (за допомогою `kruskal`).

**36.** Яка основна ідея алгоритму Крускала?

**37.** Що таке властивість розрізу і як вона доводить коректність жадібного вибору?

**38.** Яка складність Крускала і від чого вона залежить?

**39.** Чим Крускал відрізняється від Прима?

### Рівень 4. Задачі з інтерв'ю

**40.** Чи єдине MST і як змінюється відповідь при рівних вагах?

**41.** Як отримати максимальне кістякове дерево?

**42.** Як Крускал використовується для кластеризації?

**43.** Що станеться, якщо граф незв'язний?

**44.** Чому MST не обов'язково містить найкоротші шляхи між парами вершин?

**45.** Як перевірити, що заданий набір ребер — MST?

**46.** Що поверне `kruskal` для ланцюжка `A–B (1)`, `B–C (2)` та додаткового довшого ребра `A–C (10)`?

```js
kruskal(['A', 'B', 'C'], [['A', 'B', 1], ['B', 'C', 2], ['A', 'C', 10]])
```

**47.** Які ребра пропустить `kruskalTrace` у графі-квадраті `A–B 1`, `B–C 1`, `C–D 1`, `D–A 1`?

```js
kruskalTrace(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['B', 'C', 1], ['C', 'D', 1], ['D', 'A', 1]]).filter(s => s.includes('цикл'))
```

**48.** Яка вага MST, якщо в `mstEdges` змінити вагу `A–C` з 1 на 100?

```js
kruskal(['A', 'B', 'C', 'D', 'E'], mstEdges.map(e => e[0] === 'A' && e[1] === 'C' ? ['A', 'C', 100] : e)).total
```

**49.** Яка вага MST зі всіма вагами 7 для 10 вершин (повний граф)?

```js
(() => { const v = Array.from({ length: 10 }, (_, i) => i); const e = []; for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) e.push([i, j, 7]); return kruskal(v, e).total; })()
```

**50.** Скільки ребер розглянув би Крускал до зупинки на `V − 1`-му ребрі в повному графі з рівними вагами (кількість `union`, що пройшли)?

```js
(() => { const v = Array.from({ length: 6 }, (_, i) => i); const e = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) e.push([i, j, 1]); return kruskal(v, e).edges.length; })()
```

### Відповіді

1. `[['A', 'C', 1], ['B', 'C', 2], ['D', 'E', 2], ['B', 'D', 5]]`
2. `10`
3. `true`
4. `['A–C (1): беремо, сума 1', 'B–C (2): беремо, сума 3', 'D–E (2): беремо, сума 5', 'A–B (4): цикл, пропускаємо', 'B–D (5): беремо, сума 10', 'C–D (8): цикл, пропускаємо', 'C–E (10): цикл, пропускаємо']`
5. `4`
6. `'A–B (4): цикл, пропускаємо'`
7. `[10, 27]`
8. `[['C', 'E', 10], ['C', 'D', 8], ['B', 'D', 5], ['A', 'B', 4]]`
9. `{ edges: [], total: 0, connected: true }`
10. `{ edges: [], total: 0, connected: false }`
11. `{ edges: [['A', 'B', 2]], total: 2, connected: true }`
12. `{ edges: [['A', 'B', 3]], total: 3, connected: true }`
13. `{ forest: [['A', 'B', 1], ['C', 'D', 2]], components: 2 }`
14. `{ 'ребер': 2, total: 2 }`
15. `12`
16. `20`
17. `18`
18. `0`
19. `9`
20. `1`
21. `true`
22. `false`
23. `4`
24. `[15, 5]`
25. `19931569`
26. `[2, 2]`
27. Приклад розв'язку:

   ```js
   function mstWeightOnly(n, edges) {
     const r = kruskal(Array.from({ length: n }, (_, i) => i), edges);
     return r.connected ? r.total : -1;
   }
   ```

   Виклик `[mstWeightOnly(4, [[0, 1, 1], [1, 2, 2], [2, 3, 3], [0, 3, 10]]), mstWeightOnly(3, [[0, 1, 1]])]` → `[6, -1]`

28. Приклад розв'язку:

   ```js
   function bottleneck(n, edges, s, t) {
     const mst = kruskal(Array.from({ length: n }, (_, i) => i), edges).edges;
     const adj = Array.from({ length: n }, () => []);
     for (const [u, v, w] of mst) {
       adj[u].push([v, w]);
       adj[v].push([u, w]);
     }
     const go = (v, p, mx) => {
       if (v === t) return mx;
       for (const [u, w] of adj[v]) if (u !== p) {
         const r = go(u, v, Math.max(mx, w));
         if (r !== null) return r;
       }
       return null;
     };
     return go(s, -1, 0);
   }
   ```

   Виклик `bottleneck(4, [[0, 1, 5], [1, 2, 3], [0, 2, 9], [2, 3, 4]], 0, 3)` → `5`

29. Приклад розв'язку:

   ```js
   function removeEdgesKeepConnected(n, edges) {
     const r = kruskal(Array.from({ length: n }, (_, i) => i), edges);
     return r.connected ? edges.length - (n - 1) : -1;
   }
   ```

   Виклик `[removeEdgesKeepConnected(4, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [0, 3, 1], [0, 2, 1]]), removeEdgesKeepConnected(3, [[0, 1, 1]])]` → `[2, -1]`

30. Приклад розв'язку:

   ```js
   function connectCitiesMinCost(n, conns) {
     const r = kruskal(Array.from({ length: n }, (_, i) => i + 1), conns);
     return r.connected ? r.total : -1;
   }
   ```

   Виклик `[connectCitiesMinCost(3, [[1, 2, 5], [1, 3, 6], [2, 3, 1]]), connectCitiesMinCost(4, [[1, 2, 3], [3, 4, 4]])]` → `[6, -1]`

31. Приклад розв'язку:

   ```js
   const mstEdgeCountInAllMsts = (v, e) => criticalEdgesCount(v, e)
   ```

   Виклик `mstEdgeCountInAllMsts(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['B', 'C', 1], ['A', 'C', 1], ['C', 'D', 2]])` → `1`

32. Приклад розв'язку:

   ```js
   const lexSortedMstEdges = (v, e) => kruskal(v, e).edges.map(([a, b, w]) => a < b ? a + b : b + a).sort()
   ```

   Виклик `lexSortedMstEdges(['A', 'B', 'C', 'D', 'E'], mstEdges)` → `['AC', 'BC', 'BD', 'DE']`

33. Приклад розв'язку:

   ```js
   const mazeWalls = (n) => 2 * n * (n - 1) - (n * n - 1)
   ```

   Виклик `[mazeWalls(2), mazeWalls(3), mazeWalls(5)]` → `[1, 4, 16]`

34. Приклад розв'язку:

   ```js
   function treeDiameterFromMst(n, edges) {
     const mst = kruskal(Array.from({ length: n }, (_, i) => i), edges).edges;
     const adj = Array.from({ length: n }, () => []);
     for (const [u, v, w] of mst) {
       adj[u].push([v, w]);
       adj[v].push([u, w]);
     }
     let best = 0;
     for (let s = 0; s < n; s++) {
       const d = new Array(n).fill(-1);
       d[s] = 0;
       const st = [s];
       while (st.length) {
         const v = st.pop();
         for (const [u, w] of adj[v]) if (d[u] < 0) {
           d[u] = d[v] + w;
           st.push(u);
         }
       }
       best = Math.max(best, ...d);
     }
     return best;
   }
   ```

   Виклик `treeDiameterFromMst(4, [[0, 1, 1], [1, 2, 2], [2, 3, 3], [0, 3, 10]])` → `6`

35. Приклад розв'язку:

   ```js
   function isTreeByWeights(n, edges) {
     if (edges.length !== n - 1) return false;
     return kruskal(Array.from({ length: n }, (_, i) => i), edges).edges.length === n - 1;
   }
   ```

   Виклик `[isTreeByWeights(3, [[0, 1, 1], [1, 2, 1]]), isTreeByWeights(3, [[0, 1, 1], [0, 1, 2]])]` → `[true, false]`

36. Жадібно брати ребра за зростанням ваги і додавати кожне, якщо воно не створює цикл. Кінці ребра мають бути в різних компонентах — це перевіряє DSU.
37. Для будь-якого розбиття вершин на дві частини найлегше ребро, що його перетинає, належить до якогось MST. Крускал розглядає ребро, що з'єднує дві компоненти, і воно — найлегше з тих, що перетинають розріз між цією компонентою та рештою, тож безпечне.
38. `O(E log E) = O(E log V)` — переважно від сортування ребер; обробка DSU — `O(E·α(V))`. Якщо ребра вже відсортовані, час майже лінійний.
39. Крускал працює з усім списком ребер і зливає компоненти, Прим росте від однієї вершини, додаючи найлегше ребро до дерева. Крускал краще для розріджених графів і списків ребер; Прим — для щільних із матрицею суміжності.
40. Якщо всі ваги різні — єдине. Із рівними вагами MST може бути кілька, але всі мають однакову суму; самі набори ребер можуть відрізнятися залежно від порядку обробки рівних ребер.
41. Змінити знак ваг (або відсортувати за спаданням) і запустити той самий алгоритм; сума результату буде мінус максимальна вага.
42. Зупинити алгоритм, коли залишилось `k` компонент, або видалити `k − 1` найважчих ребер MST: компоненти і є кластерами (single-linkage). Мінімальна відстань між кластерами — вага наступного ребра, що з'єднало б їх.
43. Крускал побудує мінімальний кістяковий ліс — по MST для кожної компоненти. Кількість ребер буде `V − k`, де `k` — кількість компонент, тому перевірку `V − 1` ребер слід робити окремо.
44. MST мінімізує сумарну вагу ребер, а не відстані між вершинами. Шлях у MST між двома вершинами може бути значно довшим за найкоротший шлях у вихідному графі (для цього призначена Дейкстра).
45. Перевірити, що він зв'язний і ациклічний (рівно `V − 1` ребро без циклів) і що його вага дорівнює вазі MST, знайденого Крускалом чи Примом.
46. `{ edges: [['A', 'B', 1], ['B', 'C', 2]], total: 3, connected: true }`
47. `['D–A (1): цикл, пропускаємо']`
48. `13`
49. `63`
50. `5`
