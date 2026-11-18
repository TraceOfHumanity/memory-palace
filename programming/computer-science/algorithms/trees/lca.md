# LCA — найменший спільний предок

**Найменший спільний предок (Lowest Common Ancestor, LCA)** двох вершин `u` та `v` кореневого дерева — найглибша вершина, що є предком і `u`, і `v` (вершина вважається предком самої себе). LCA потрібен для **відстаней у дереві**, запитів на шляхах, задач про піддерева, мережевих топологій, порівняння версій у git (merge base), еволюційних дерев. Є кілька алгоритмів із різним компромісом між передобробкою й швидкістю запиту; тут розглянуто основні.

## 1. Приклад дерева

```text
         0
       / | \
      1  2  3
     / \    |
    4   5   6
        |
        7
```

Корінь `0`. Батьки: `1,2,3 → 0`; `4,5 → 1`; `6 → 3`; `7 → 5`. `lca(4, 7)` = `1` (вершина `1`), `lca(7, 6)` = `0` (корінь), `lca(5, 7)` = `5` (вершина є предком іншої).

## 2. Наївний підхід

Піднімати вершину з більшою глибиною, поки глибини не зрівняються, потім піднімати обидві одночасно, поки не збігуться. Запит `O(h)`, де `h` — висота дерева; для вироджених дерев `O(n)`. Передобробка лише глибини й батьки — `O(n)`.

## 3. Двійкові підйоми (binary lifting)

Ідея: для кожної вершини `v` і кожного `j` зберегти `up[j][v]` — предка на відстані `2^j`. `up[0][v]` — прямий батько; `up[j][v] = up[j−1][ up[j−1][v] ]`. Таблиця `n × ⌈log₂ n⌉` будується за `O(n log n)`.

**Запит `lca(u, v)`:**

1. Підняти глибшу вершину на різницю глибин (розклад різниці на степені двійки).
2. Якщо вершини збіглись — це відповідь.
3. Для `j` від найбільшого до `0`: якщо `up[j][u] ≠ up[j][v]` — підняти обидві (`u = up[j][u]`, `v = up[j][v]`).
4. Відповідь — `up[0][u]` (батько).

Крок 3 — «бінарний пошук» за глибиною: ми підіймаємось якомога вище, **не досягаючи** спільного предка; після цього батьки й дають LCA. Складність запиту `O(log n)`.

**k-й предок:** розклад `k` на двійкові розряди — `kthAncestor(7, 2)` = `1` (вершина `1`).

**Відстань:** `dist(u, v) = depth[u] + depth[v] − 2·depth[lca]`: `dist(4, 7)` = `3`, `dist(7, 6)` = `5`.

## 4. Ейлерів обхід + мінімум на відрізку (RMQ)

Запишемо **Ейлерів обхід**: послідовність вершин, відвіданих DFS (вершина записується при вході й після повернення з кожної дитини). Для кожної вершини запам'ятаємо **першу появу**. Тоді `lca(u, v)` — вершина **мінімальної глибини** на відрізку між першими появами `u` та `v`. Задачу RMQ розв'язуємо **sparse table** за `O(n log n)` передобробки й `O(1)` на запит.

Ейлерів обхід нашого дерева: `[0, 1, 4, 1, 5, 7, 5, 1, 0, 2, 0, 3, 6, 3, 0]`. Запит `lca(4, 6)` через Ейлерів обхід: `0`.

## 5. Інші підходи

| Алгоритм | Передобробка | Запит | Примітка |
|---|---|---|---|
| Наївний | `O(n)` | `O(h)` | простий |
| Binary lifting | `O(n log n)` | `O(log n)` | універсальний, дозволяє k-й предок |
| Ейлер + sparse table | `O(n log n)` | `O(1)` | швидкі запити |
| Тар'ян offline (DSU) | — | `O(α(n))` | усі запити відомі заздалегідь |
| Фарах-Колтон—Бендер | `O(n)` | `O(1)` | теоретично оптимальний |
| Heavy-Light Decomposition | `O(n)` | `O(log n)` | також для запитів на шляхах |

**LCA у бінарному дереві без батьківських посилань (рекурсивно):** якщо поточний вузол — `p` або `q`, повернути його; рекурсивно шукати в піддеревах; якщо обидва піддерева повернули ненульове значення — поточний вузол є LCA; інакше — ненульове значення з одного боку. `O(n)`. У **BST** достатньо порівняння значень (`O(h)`): якщо обидва значення менші за вузол — ліворуч, більші — праворуч, інакше цей вузол.

## 6. Реалізація

```js
const treeEdges = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [3, 6], [5, 7]];

function makeLca(n, edges, root) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const LOG = Math.max(1, Math.ceil(Math.log2(n)) + 1);
  const depth = new Array(n).fill(0);
  const up = Array.from({ length: LOG }, () => new Array(n).fill(root));
  const stack = [[root, root]];
  while (stack.length) {
    const [v, p] = stack.pop();
    up[0][v] = p;
    for (const u of adj[v]) if (u !== p) { depth[u] = depth[v] + 1; stack.push([u, v]); }
  }
  for (let j = 1; j < LOG; j++) for (let v = 0; v < n; v++) up[j][v] = up[j - 1][up[j - 1][v]];
  const kth = (v, k) => {
    for (let j = 0; j < LOG; j++) if (k & (1 << j)) v = up[j][v];
    return v;
  };
  const lca = (a, b) => {
    if (depth[a] < depth[b]) [a, b] = [b, a];
    a = kth(a, depth[a] - depth[b]);
    if (a === b) return a;
    for (let j = LOG - 1; j >= 0; j--) if (up[j][a] !== up[j][b]) { a = up[j][a]; b = up[j][b]; }
    return up[0][a];
  };
  const dist = (a, b) => depth[a] + depth[b] - 2 * depth[lca(a, b)];
  return { depth, up, kth, lca, dist, LOG };
}

function lcaNaive(n, edges, root, a, b) {
  const adj = Array.from({ length: n }, () => []);
  for (const [x, y] of edges) { adj[x].push(y); adj[y].push(x); }
  const parent = new Array(n).fill(-1);
  const depth = new Array(n).fill(0);
  const st = [root];
  while (st.length) {
    const v = st.pop();
    for (const u of adj[v]) if (u !== parent[v]) { parent[u] = v; depth[u] = depth[v] + 1; st.push(u); }
  }
  let steps = 0;
  while (depth[a] > depth[b]) { a = parent[a]; steps++; }
  while (depth[b] > depth[a]) { b = parent[b]; steps++; }
  while (a !== b) { a = parent[a]; b = parent[b]; steps += 2; }
  return { lca: a, steps };
}

function eulerTour(n, edges, root) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const tour = [];
  const depthAt = [];
  const first = new Array(n).fill(-1);
  const go = (v, p, d) => {
    first[v] = tour.length;
    tour.push(v);
    depthAt.push(d);
    for (const u of adj[v]) if (u !== p) {
      go(u, v, d + 1);
      tour.push(v);
      depthAt.push(d);
    }
  };
  go(root, -1, 0);
  return { tour, depthAt, first };
}

function makeEulerLca(n, edges, root) {
  const { tour, depthAt, first } = eulerTour(n, edges, root);
  const m = tour.length;
  const LOG = Math.floor(Math.log2(m)) + 1;
  const sp = [Array.from({ length: m }, (_, i) => i)];
  for (let j = 1; j < LOG; j++) {
    const prev = sp[j - 1];
    const row = [];
    for (let i = 0; i + (1 << j) <= m; i++) {
      const a = prev[i];
      const b = prev[i + (1 << (j - 1))];
      row.push(depthAt[a] <= depthAt[b] ? a : b);
    }
    sp.push(row);
  }
  const lca = (a, b) => {
    let l = first[a];
    let r = first[b];
    if (l > r) [l, r] = [r, l];
    const j = Math.floor(Math.log2(r - l + 1));
    const x = sp[j][l];
    const y = sp[j][r - (1 << j) + 1];
    return tour[depthAt[x] <= depthAt[y] ? x : y];
  };
  return { lca, tourLength: m, first };
}

function lcaBinaryTree(root, p, q) {
  if (!root || root.val === p || root.val === q) return root ? root.val : null;
  const l = lcaBinaryTree(root.left, p, q);
  const r = lcaBinaryTree(root.right, p, q);
  if (l !== null && r !== null) return root.val;
  return l !== null ? l : r;
}

function lcaBst(root, p, q) {
  let n = root;
  while (n) {
    if (p < n.val && q < n.val) n = n.left;
    else if (p > n.val && q > n.val) n = n.right;
    else return n.val;
  }
  return null;
}

function bstFromValues(values) {
  const ins = (r, v) => {
    if (!r) return { val: v, left: null, right: null };
    if (v < r.val) r.left = ins(r.left, v);
    else r.right = ins(r.right, v);
    return r;
  };
  let root = null;
  for (const v of values) root = ins(root, v);
  return root;
}

function pathBetween(n, edges, root, a, b) {
  const L = makeLca(n, edges, root);
  const l = L.lca(a, b);
  const parent = L.up[0];
  const left = [];
  for (let v = a; v !== l; v = parent[v]) left.push(v);
  const right = [];
  for (let v = b; v !== l; v = parent[v]) right.push(v);
  return [...left, l, ...right.reverse()];
}

function subtreeSizes(n, edges, root) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  const size = new Array(n).fill(1);
  const go = (v, p) => { for (const u of adj[v]) if (u !== p) { go(u, v); size[v] += size[u]; } };
  go(root, -1);
  return size;
}

function isAncestor(n, edges, root, a, b) {
  return makeLca(n, edges, root).lca(a, b) === a;
}

function kthAncestorNaive(n, edges, root, v, k) {
  const L = makeLca(n, edges, root);
  const parent = L.up[0];
  for (let i = 0; i < k && v !== root; i++) v = parent[v];
  return v;
}

function treeDiameterViaLca(n, edges, root) {
  const L = makeLca(n, edges, root);
  let best = 0;
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) best = Math.max(best, L.dist(a, b));
  return best;
}
```

## 7. Складність і вибір

- **Binary lifting:** пам'ять `O(n log n)`, запит `O(log n)`; зручно для задач про k-й предок і шляхи.
- **Ейлер + sparse table:** пам'ять `O(n log n)` (Ейлерів обхід має `2n − 1` елементів), запит `O(1)`.
- Для `n = 10⁵` таблиця binary lifting — ≈ 1700000 клітинок (17 рівнів).
- Наївні запити в «довгому» дереві (ланцюжок із 1000 вершин, запит між кінцями): `lcaNaive` робить 499 кроків, binary lifting — не більше `⌈log₂ 1000⌉ · 2 = 20`.

## 8. Застосування

- **Відстань між вершинами:** `dist(u, v)` за `O(log n)`.
- **Шлях між двома вершинами:** `pathBetween(8, treeEdges, 0, 4, 6)` = `[4, 1, 0, 3, 6]`.
- **Чи є `a` предком `b`:** `isAncestor(8, treeEdges, 0, 1, 7)` = `true`.
- **Розміри піддерев:** `subtreeSizes(8, treeEdges, 0)` = `[8, 4, 1, 2, 1, 2, 1, 1]`.
- **Запити «сума на шляху»** — префікси від кореня: `sum(u..v) = pre[u] + pre[v] − 2·pre[lca] + val[lca]`.
- **Git merge base:** найближчий спільний предок двох комітів у DAG історії (узагальнення LCA на DAG).
- **Мережі:** найближчий спільний вузол агрегації; **біологія:** спільний предок видів у філогенетичному дереві.
- **Задачі інтерв'ю:** LCA у BST та в бінарному дереві: `lcaBst(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 2, 8)` = `6`, `lcaBst(..., 2, 4)` = `2`.

## 9. Типові помилки

1. **Не вирівняти глибини** перед одночасним підйомом.
2. **Порівнювати `up[j][a] ≠ up[j][b]` без рівності глибин.**
3. **Забути випадок, коли одна вершина — предок іншої** (після вирівнювання `a === b`).
4. **Корінь:** `up[0][root]` має вказувати на себе (або сентинел), інакше вихід за межі.
5. **Недостатня кількість рівнів `LOG`** — для глибини до `n` потрібно `⌈log₂ n⌉ + 1`.
6. **Ейлерів обхід: порівнювати вершини, а не глибини** в sparse table.
7. **Неорієнтовані ребра:** обхід з урахуванням батька.
8. **Рекурсія DFS** на виродженому дереві — `RangeError`; ітеративний обхід.
9. **BST-версія для довільного бінарного дерева** — хибна.

## 10. Алгоритм (стисло)

1. DFS: `depth`, `up[0]`.
2. `up[j][v] = up[j−1][up[j−1][v]]`.
3. `lca(a, b)`: вирівняти глибини; якщо збіглись — готово; для `j` від більшого до `0`: якщо `up[j][a] ≠ up[j][b]` — підняти обох; відповідь `up[0][a]`.
4. Передобробка `O(n log n)`, запит `O(log n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка глибина вершин `0..7` у дереві `treeEdges`?

```js
makeLca(8, treeEdges, 0).depth
```

**2.** Який `lca(4, 7)` та `lca(7, 6)` та `lca(5, 7)`?

```js
[makeLca(8, treeEdges, 0).lca(4, 7), makeLca(8, treeEdges, 0).lca(7, 6), makeLca(8, treeEdges, 0).lca(5, 7)]
```

**3.** Що поверне `lca(a, a)` для будь-якої вершини, наприклад `lca(4, 4)`?

```js
makeLca(8, treeEdges, 0).lca(4, 4)
```

**4.** Що поверне `lca(0, 7)` (корінь і лист)?

```js
makeLca(8, treeEdges, 0).lca(0, 7)
```

**5.** Що поверне `lca(7, 4)` (симетрично до `lca(4, 7)`)?

```js
makeLca(8, treeEdges, 0).lca(7, 4)
```

**6.** Які відстані `dist(4, 7)`, `dist(7, 6)`, `dist(2, 2)`?

```js
[makeLca(8, treeEdges, 0).dist(4, 7), makeLca(8, treeEdges, 0).dist(7, 6), makeLca(8, treeEdges, 0).dist(2, 2)]
```

**7.** Який `kth(7, 2)`, `kth(7, 3)`, `kth(7, 4)`? (вихід за корінь)

```js
[makeLca(8, treeEdges, 0).kth(7, 2), makeLca(8, treeEdges, 0).kth(7, 3), makeLca(8, treeEdges, 0).kth(7, 4)]
```

**8.** Скільки рівнів `LOG` у таблиці для `n = 8`?

```js
makeLca(8, treeEdges, 0).LOG
```

**9.** Які значення `up[0]` (батьки)?

```js
makeLca(8, treeEdges, 0).up[0]
```

**10.** Які значення `up[1]` (діди)?

```js
makeLca(8, treeEdges, 0).up[1]
```

**11.** Який `lcaNaive(8, treeEdges, 0, 4, 6)`?

```js
lcaNaive(8, treeEdges, 0, 4, 6)
```

**12.** Скільки кроків робить `lcaNaive` у ланцюжку з 1000 вершин між `999` і `500`?

```js
lcaNaive(1000, Array.from({ length: 999 }, (_, i) => [i, i + 1]), 0, 999, 500)
```

**13.** Який Ейлерів обхід `eulerTour(8, treeEdges, 0).tour`?

```js
eulerTour(8, treeEdges, 0).tour
```

### Рівень 2. Робота алгоритму

**14.** Які глибини вздовж обходу і перші появи вершин?

```js
(({ depthAt, first }) => ({ depthAt, first }))(eulerTour(8, treeEdges, 0))
```

**15.** Яка довжина Ейлерового обходу для дерева з 8 вершин (`2n − 1`)?

```js
[eulerTour(8, treeEdges, 0).tour.length, 2 * 8 - 1]
```

**16.** Що поверне `makeEulerLca(...).lca(4, 6)` та `lca(7, 5)`?

```js
[makeEulerLca(8, treeEdges, 0).lca(4, 6), makeEulerLca(8, treeEdges, 0).lca(7, 5)]
```

**17.** Чи збігаються три реалізації (binary lifting, наївна, Ейлер) для всіх пар вершин?

```js
(() => { const a = makeLca(8, treeEdges, 0), e = makeEulerLca(8, treeEdges, 0); let ok = true; for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { const r = a.lca(x, y); if (r !== e.lca(x, y) || r !== lcaNaive(8, treeEdges, 0, x, y).lca) ok = false; } return ok; })()
```

**18.** Який шлях між `4` і `6`?

```js
pathBetween(8, treeEdges, 0, 4, 6)
```

**19.** Який шлях між `7` та `2`?

```js
pathBetween(8, treeEdges, 0, 7, 2)
```

**20.** Який шлях від вершини до себе `pathBetween(8, treeEdges, 0, 5, 5)`?

```js
pathBetween(8, treeEdges, 0, 5, 5)
```

**21.** Чи `1` є предком `7`? А `2` предком `7`?

```js
[isAncestor(8, treeEdges, 0, 1, 7), isAncestor(8, treeEdges, 0, 2, 7)]
```

**22.** Які розміри піддерев?

```js
subtreeSizes(8, treeEdges, 0)
```

**23.** Який діаметр дерева (максимальна відстань)?

```js
treeDiameterViaLca(8, treeEdges, 0)
```

**24.** Що поверне `lcaBst(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 2, 8)` та `(…, 2, 4)`?

```js
[lcaBst(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 2, 8), lcaBst(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 2, 4)]
```

**25.** Що поверне `lcaBst` для `3` та `5` у цьому BST?

```js
lcaBst(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 3, 5)
```

**26.** Що поверне `lcaBinaryTree` для того самого дерева і вузлів `3`, `5`?

```js
lcaBinaryTree(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 3, 5)
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `lcaBinaryTree` для вузлів, один з яких відсутній у дереві: `(root, 3, 99)`?

```js
lcaBinaryTree(bstFromValues([6, 2, 8, 0, 4, 7, 9, 3, 5]), 3, 99)
```

**28.** Скільки клітинок у таблиці `up` для `n = 10⁵` (17 рівнів)?

```js
17 * 100000
```

**29.** Скільки рівнів `LOG` потрібно для глибини до 10⁶?

```js
Math.ceil(Math.log2(1e6)) + 1
```

**30.** Яка довжина шляху у ребрах між `4` і `6` та кількість вершин шляху?

```js
(() => { const p = pathBetween(8, treeEdges, 0, 4, 6); return [p.length - 1, p.length]; })()
```

**31.** Напишіть `commonAncestorsCount(n, edges, root, a, b)` — кількість спільних предків (включно з самими вершинами, якщо вони предки) = `depth[lca] + 1`.

**32.** Напишіть `isOnPath(n, edges, root, a, b, x)` — чи лежить `x` на шляху між `a` і `b` (`dist(a,x) + dist(x,b) === dist(a,b)`).

**33.** Напишіть `pathSumQuery(values, n, edges, root, a, b)` — суму значень вершин на шляху (через префікси від кореня).

**34.** Напишіть `distanceFromAll(n, edges, root, a)` — масив відстаней від `a` до всіх вершин (через `dist`).

**35.** Напишіть `farthestFrom(n, edges, root, a)` — вершину, найвіддаленішу від `a` (найменший індекс при рівності).

**36.** Напишіть `lcaOfList(n, edges, root, list)` — LCA кількох вершин (послідовне згортання).

**37.** Напишіть `depthOfLca(n, edges, root, a, b)` — глибину їхнього LCA.

**38.** Напишіть `kthAncestorByBinaryLifting(n, edges, root, v, k)` — k-й предок (або корінь, якщо немає).

**39.** Напишіть `lcaDepthEqualsMin(n, edges, root, a, b)` — перевірку властивості Ейлерового обходу: глибина LCA дорівнює мінімуму глибин на відрізку між першими появами (поверніть `true`).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `countPairsAtDistance(n, edges, root, d)` — кількість невпорядкованих пар вершин на відстані `d` (через `dist`).

**41.** Що таке найменший спільний предок?

**42.** Як працюють двійкові підйоми?

**43.** Чому на кроці «підйому» умова `up[j][a] ≠ up[j][b]`, а не `==`?

**44.** Як Ейлерів обхід зводить LCA до RMQ?

**45.** Як обчислити відстань між вершинами дерева через LCA?

**46.** Як знайти LCA у BST без батьківських посилань?

**47.** Як знайти LCA у довільному бінарному дереві?

**48.** Які переваги і недоліки Ейлерового обходу порівняно з binary lifting?

**49.** Що таке offline-алгоритм Тар'яна для LCA?

**50.** Де на практиці зустрічається LCA?

### Відповіді

1. `[0, 1, 1, 1, 2, 2, 2, 3]`
2. `[1, 0, 5]`
3. `4`
4. `0`
5. `1`
6. `[3, 5, 0]`
7. `[1, 0, 0]`
8. `4`
9. `[0, 0, 0, 0, 1, 1, 3, 5]`
10. `[0, 0, 0, 0, 0, 0, 0, 1]`
11. `{ lca: 0, steps: 4 }`
12. `{ lca: 500, steps: 499 }`
13. `[0, 1, 4, 1, 5, 7, 5, 1, 0, 2, 0, 3, 6, 3, 0]`
14. `{ depthAt: [0, 1, 2, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 1, 0], first: [0, 1, 9, 11, 2, 4, 12, 5] }`
15. `[15, 15]`
16. `[0, 5]`
17. `true`
18. `[4, 1, 0, 3, 6]`
19. `[7, 5, 1, 0, 2]`
20. `[5]`
21. `[true, false]`
22. `[8, 4, 1, 2, 1, 2, 1, 1]`
23. `5`
24. `[6, 2]`
25. `4`
26. `4`
27. `3`
28. `1700000`
29. `21`
30. `[4, 5]`
31. Приклад розв'язку:

   ```js
   function commonAncestorsCount(n, edges, root, a, b) {
     const L = makeLca(n, edges, root);
     return L.depth[L.lca(a, b)] + 1;
   }
   ```

   Виклик `[commonAncestorsCount(8, treeEdges, 0, 4, 7), commonAncestorsCount(8, treeEdges, 0, 7, 6)]` → `[2, 1]`

32. Приклад розв'язку:

   ```js
   function isOnPath(n, edges, root, a, b, x) {
     const L = makeLca(n, edges, root);
     return L.dist(a, x) + L.dist(x, b) === L.dist(a, b);
   }
   ```

   Виклик `[isOnPath(8, treeEdges, 0, 4, 6, 0), isOnPath(8, treeEdges, 0, 4, 6, 2), isOnPath(8, treeEdges, 0, 4, 7, 5)]` → `[true, false, true]`

33. Приклад розв'язку:

   ```js
   function pathSumQuery(vals, n, edges, root, a, b) {
     const L = makeLca(n, edges, root);
     const adj = Array.from({ length: n }, () => []);
     for (const [x, y] of edges) {
       adj[x].push(y);
       adj[y].push(x);
     }
     const pre = new Array(n).fill(0);
     const go = (v, p, s) => {
       pre[v] = s + vals[v];
       for (const u of adj[v]) if (u !== p) go(u, v, pre[v]);
     };
     go(root, -1, 0);
     const l = L.lca(a, b);
     return pre[a] + pre[b] - 2 * pre[l] + vals[l];
   }
   ```

   Виклик `[pathSumQuery([1, 2, 3, 4, 5, 6, 7, 8], 8, treeEdges, 0, 4, 6), pathSumQuery([1, 2, 3, 4, 5, 6, 7, 8], 8, treeEdges, 0, 7, 7)]` → `[19, 8]`

34. Приклад розв'язку:

   ```js
   function distanceFromAll(n, edges, root, a) {
     const L = makeLca(n, edges, root);
     return Array.from({ length: n }, (_, v) => L.dist(a, v));
   }
   ```

   Виклик `distanceFromAll(8, treeEdges, 0, 7)` → `[3, 2, 4, 4, 3, 1, 5, 0]`

35. Приклад розв'язку:

   ```js
   function farthestFrom(n, edges, root, a) {
     const L = makeLca(n, edges, root);
     let best = a, bd = 0;
     for (let v = 0; v < n; v++) {
       const d = L.dist(a, v);
       if (d > bd) {
         bd = d;
         best = v;
       }
     }
     return best;
   }
   ```

   Виклик `[farthestFrom(8, treeEdges, 0, 4), farthestFrom(8, treeEdges, 0, 7)]` → `[6, 6]`

36. Приклад розв'язку:

   ```js
   function lcaOfList(n, edges, root, list) {
     const L = makeLca(n, edges, root);
     return list.reduce((a, b) => L.lca(a, b));
   }
   ```

   Виклик `[lcaOfList(8, treeEdges, 0, [4, 5, 7]), lcaOfList(8, treeEdges, 0, [4, 7, 6])]` → `[1, 0]`

37. Приклад розв'язку:

   ```js
   function depthOfLca(n, edges, root, a, b) {
     const L = makeLca(n, edges, root);
     return L.depth[L.lca(a, b)];
   }
   ```

   Виклик `[depthOfLca(8, treeEdges, 0, 4, 7), depthOfLca(8, treeEdges, 0, 7, 6)]` → `[1, 0]`

38. Приклад розв'язку:

   ```js
   function kthAncestorByBinaryLifting(n, edges, root, v, k) {
     return makeLca(n, edges, root).kth(v, k);
   }
   ```

   Виклик `[kthAncestorByBinaryLifting(8, treeEdges, 0, 7, 1), kthAncestorByBinaryLifting(8, treeEdges, 0, 7, 10)]` → `[5, 0]`

39. Приклад розв'язку:

   ```js
   function lcaDepthEqualsMin(n, edges, root, a, b) {
     const { depthAt, first } = eulerTour(n, edges, root);
     let l = first[a], r = first[b];
     if (l > r) [l, r] = [r, l];
     return Math.min(...depthAt.slice(l, r + 1)) === makeLca(n, edges, root).depth[makeLca(n, edges, root).lca(a, b)];
   }
   ```

   Виклик `[lcaDepthEqualsMin(8, treeEdges, 0, 4, 7), lcaDepthEqualsMin(8, treeEdges, 0, 7, 6)]` → `[true, true]`

40. Приклад розв'язку:

   ```js
   function countPairsAtDistance(n, edges, root, d) {
     const L = makeLca(n, edges, root);
     let c = 0;
     for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (L.dist(a, b) === d) c++;
     return c;
   }
   ```

   Виклик `[countPairsAtDistance(8, treeEdges, 0, 1), countPairsAtDistance(8, treeEdges, 0, 2), countPairsAtDistance(8, treeEdges, 0, 5)]` → `[7, 8, 1]`

41. Найглибша вершина кореневого дерева, що є предком і `u`, і `v` (вершина є предком самої себе). Вона лежить на шляху між `u` і `v` і найближча до них серед усіх спільних предків.
42. Для кожної вершини зберігають предків на відстанях `2^j`: `up[j][v] = up[j − 1][up[j − 1][v]]`. Для запиту вирівнюють глибини, а потім з найбільшого `j` піднімають обидві вершини, поки їхні предки різні; батько отриманих вершин — LCA. Запит `O(log n)`, пам'ять `O(n log n)`.
43. Ми піднімаємося, лише поки не перескочимо LCA: якщо предки на відстані `2^j` ще різні, вони обидва нижче LCA (або в різних гілках), і безпечно піднятись. Після виконання всіх `j` вершини опиняються безпосередньо під LCA, тому відповідь — їхній спільний батько.
44. Запишемо вершини при кожному вході/поверненні в DFS. Між першими появами `u` та `v` Ейлерів обхід проходить по шляху `u → LCA → v`, і вершина мінімальної глибини на цьому відрізку — LCA. Sparse table дає мінімум за `O(1)`.
45. `dist(u, v) = depth[u] + depth[v] − 2·depth[lca(u, v)]`: шлях складається з підйому від `u` до LCA й спуску до `v`.
46. Спускатись від кореня: якщо обидва значення менші за поточний — ліворуч, якщо обидва більші — праворуч; інакше поточний вузол розділяє їх або дорівнює одному з них і є LCA. Час `O(h)`.
47. Рекурсивно: якщо вузол дорівнює одному з шуканих — повернути його; шукати в обох піддеревах; якщо обидва повернули ненульове — поточний вузол LCA; інакше — той, що повернув ненульове. `O(n)` часу.
48. Ейлер + sparse table дає запит за `O(1)`, але не вміє напряму знаходити k-й предок і потребує побудови обходу; binary lifting запитує за `O(log n)`, зате універсальний (k-й предок, шляхи, динамічні розширення).
49. Усі запити відомі заздалегідь: під час DFS кожну завершену дитину об'єднують через DSU з батьком, і при відвідуванні вершини `v` для запиту `(v, u)` з уже відвіданою `u` відповіддю є «представник» множини `u`. Загальний час майже лінійний.
50. У дерев'ях файлових систем, XML/DOM (спільний предок елементів), біоінформатиці (філогенетичні дерева), системах контролю версій (merge base), мережевій маршрутизації, а також як підзадача для запитів на шляхах у дереві.
