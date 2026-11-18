# Tree Traversals — обходи бінарних дерев

**Обхід дерева** — систематичне відвідування всіх вузлів рівно по одному разу. Для бінарного дерева є чотири основні порядки: три **глибинні** (DFS) — **pre-order**, **in-order**, **post-order** — і один **широкий** (BFS) — **level-order**. Кожен порядок відповідає на свої задачі: копіювання/серіалізація (pre), відсортований вивід BST (in), видалення/обчислення виразів (post), відстані й рівні (level). Додатково — ітеративні версії, обхід **Моріса** за `O(1)` пам'яті й відновлення дерева за двома обходами.

## 1. Приклад дерева

```text
        1
      /   \
     2     3
    / \     \
   4   5     6
```

Масив рівнів `[1, 2, 3, 4, 5, null, 6]` описує це дерево (`null` — відсутній вузол). Функція `fromLevelOrder` будує його. Обходи:

| Порядок | Правило | Результат |
|---|---|---|
| **pre-order** | корінь → ліве → праве | `[1, 2, 4, 5, 3, 6]` |
| **in-order** | ліве → корінь → праве | `[4, 2, 5, 1, 3, 6]` |
| **post-order** | ліве → праве → корінь | `[4, 5, 2, 6, 3, 1]` |
| **level-order** | рівень за рівнем | `[[1], [2, 3], [4, 5, 6]]` |

Запам'ятати просто: назва показує, **коли** відвідується корінь відносно дітей (pre — до, in — між, post — після).

## 2. Рекурсивні варіанти

Кожен — три рядки: базовий випадок (`null`), і порядок обробки кореня та двох викликів. Час `O(n)`, пам'ять `O(h)` стека (`h` — висота; для виродженого дерева-ланцюжка `h = n`).

## 3. Ітеративні варіанти зі стеком

Рекурсія неявно використовує стек викликів; явний стек усуває ризик переповнення.

- **Pre-order:** покласти корінь; поки стек не порожній — зняти вузол, записати, покласти **праву**, потім **ліву** дитину (щоб ліва оброблялась першою).
- **In-order:** йти вліво, складаючи вузли в стек; коли ліво закінчилось — зняти вузол, записати, перейти вправо.
- **Post-order:** (1) pre-order «корінь → право → ліво» із розворотом результату або (2) два стеки, або (3) один стек із запам'ятовуванням останнього відвіданого.
- **Level-order:** черга: вилучити вузол, додати його дітей; для групування по рівнях — рахувати `size` черги на початку кожного рівня.

## 4. Обхід Моріса: `O(1)` пам'яті

Тимчасово модифікує дерево через «ниточки» (threaded tree): для вузла з лівим піддеревом знаходимо його **предшественника** в in-order (найправіший вузол лівого піддерева) і робимо його праве посилання на поточний вузол. Повертаючись по ниточці, знімаємо її. Дерево після обходу відновлюється. Час `O(n)`, пам'ять `O(1)`. `morrisInorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))` = `[4, 2, 5, 1, 3, 6]`.

## 5. Реалізація

```js
function node(val, left = null, right = null) {
  return { val, left, right };
}

function fromLevelOrder(arr) {
  if (!arr.length || arr[0] === null) return null;
  const root = node(arr[0]);
  const q = [root];
  let i = 1;
  for (let h = 0; h < q.length && i < arr.length; h++) {
    const cur = q[h];
    if (i < arr.length && arr[i] !== null) { cur.left = node(arr[i]); q.push(cur.left); }
    i++;
    if (i < arr.length && arr[i] !== null) { cur.right = node(arr[i]); q.push(cur.right); }
    i++;
  }
  return root;
}

function preorder(root) {
  const out = [];
  const go = (n) => { if (!n) return; out.push(n.val); go(n.left); go(n.right); };
  go(root);
  return out;
}

function inorder(root) {
  const out = [];
  const go = (n) => { if (!n) return; go(n.left); out.push(n.val); go(n.right); };
  go(root);
  return out;
}

function postorder(root) {
  const out = [];
  const go = (n) => { if (!n) return; go(n.left); go(n.right); out.push(n.val); };
  go(root);
  return out;
}

function levelOrder(root) {
  if (!root) return [];
  const res = [];
  let level = [root];
  while (level.length) {
    res.push(level.map((n) => n.val));
    level = level.flatMap((n) => [n.left, n.right].filter(Boolean));
  }
  return res;
}

function preorderIter(root) {
  const out = [];
  const st = root ? [root] : [];
  while (st.length) {
    const n = st.pop();
    out.push(n.val);
    if (n.right) st.push(n.right);
    if (n.left) st.push(n.left);
  }
  return out;
}

function inorderIter(root) {
  const out = [];
  const st = [];
  let cur = root;
  while (cur || st.length) {
    while (cur) { st.push(cur); cur = cur.left; }
    cur = st.pop();
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}

function postorderIter(root) {
  const out = [];
  const st = root ? [root] : [];
  while (st.length) {
    const n = st.pop();
    out.push(n.val);
    if (n.left) st.push(n.left);
    if (n.right) st.push(n.right);
  }
  return out.reverse();
}

function morrisInorder(root) {
  const out = [];
  let cur = root;
  while (cur) {
    if (!cur.left) { out.push(cur.val); cur = cur.right; continue; }
    let pred = cur.left;
    while (pred.right && pred.right !== cur) pred = pred.right;
    if (!pred.right) { pred.right = cur; cur = cur.left; }
    else { pred.right = null; out.push(cur.val); cur = cur.right; }
  }
  return out;
}

function zigzagLevelOrder(root) {
  return levelOrder(root).map((lv, i) => (i % 2 ? lv.slice().reverse() : lv));
}

function height(root) {
  return root ? 1 + Math.max(height(root.left), height(root.right)) : 0;
}

function size(root) {
  return root ? 1 + size(root.left) + size(root.right) : 0;
}

function isBalanced(root) {
  const go = (n) => {
    if (!n) return 0;
    const l = go(n.left);
    if (l < 0) return -1;
    const r = go(n.right);
    if (r < 0 || Math.abs(l - r) > 1) return -1;
    return 1 + Math.max(l, r);
  };
  return go(root) >= 0;
}

function diameter(root) {
  let best = 0;
  const go = (n) => {
    if (!n) return 0;
    const l = go(n.left);
    const r = go(n.right);
    best = Math.max(best, l + r);
    return 1 + Math.max(l, r);
  };
  go(root);
  return best;
}

function isSymmetric(root) {
  const mirror = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.val === b.val && mirror(a.left, b.right) && mirror(a.right, b.left);
  };
  return !root || mirror(root.left, root.right);
}

function buildFromPreIn(pre, ino) {
  const idx = new Map(ino.map((v, i) => [v, i]));
  let p = 0;
  const go = (lo, hi) => {
    if (lo > hi) return null;
    const v = pre[p++];
    const n = node(v);
    const m = idx.get(v);
    n.left = go(lo, m - 1);
    n.right = go(m + 1, hi);
    return n;
  };
  return go(0, ino.length - 1);
}

function buildFromPostIn(post, ino) {
  const idx = new Map(ino.map((v, i) => [v, i]));
  let p = post.length - 1;
  const go = (lo, hi) => {
    if (lo > hi) return null;
    const v = post[p--];
    const n = node(v);
    const m = idx.get(v);
    n.right = go(m + 1, hi);
    n.left = go(lo, m - 1);
    return n;
  };
  return go(0, ino.length - 1);
}

function serialize(root) {
  const out = [];
  const go = (n) => { if (!n) { out.push('#'); return; } out.push(n.val); go(n.left); go(n.right); };
  go(root);
  return out.join(',');
}

function deserialize(str) {
  const t = str.split(',');
  let i = 0;
  const go = () => {
    const v = t[i++];
    if (v === '#') return null;
    const n = node(Number(v));
    n.left = go();
    n.right = go();
    return n;
  };
  return go();
}

function rightSideView(root) {
  return levelOrder(root).map((lv) => lv[lv.length - 1]);
}

function verticalOrder(root) {
  const cols = new Map();
  const q = root ? [[root, 0]] : [];
  for (let h = 0; h < q.length; h++) {
    const [n, c] = q[h];
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c).push(n.val);
    if (n.left) q.push([n.left, c - 1]);
    if (n.right) q.push([n.right, c + 1]);
  }
  return [...cols].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
}

function insertBst(root, v) {
  if (!root) return node(v);
  if (v < root.val) root.left = insertBst(root.left, v);
  else root.right = insertBst(root.right, v);
  return root;
}

function bstFrom(values) {
  let r = null;
  for (const v of values) r = insertBst(r, v);
  return r;
}

function isValidBst(root, lo = -Infinity, hi = Infinity) {
  if (!root) return true;
  if (root.val <= lo || root.val >= hi) return false;
  return isValidBst(root.left, lo, root.val) && isValidBst(root.right, root.val, hi);
}

function kthSmallestBst(root, k) {
  return inorder(root)[k - 1];
}

function pathSums(root) {
  const res = [];
  const go = (n, sum) => {
    if (!n) return;
    sum += n.val;
    if (!n.left && !n.right) res.push(sum);
    go(n.left, sum);
    go(n.right, sum);
  };
  go(root, 0);
  return res;
}

function invertTree(root) {
  if (!root) return null;
  const l = invertTree(root.left);
  const r = invertTree(root.right);
  root.left = r;
  root.right = l;
  return root;
}

function boundaryTraversal(root) {
  if (!root) return [];
  const res = [root.val];
  const leaves = [];
  const collect = (n) => { if (!n) return; if (!n.left && !n.right) leaves.push(n.val); collect(n.left); collect(n.right); };
  const left = [];
  for (let n = root.left; n; n = n.left || n.right) if (n.left || n.right) left.push(n.val);
  const right = [];
  for (let n = root.right; n; n = n.right || n.left) if (n.left || n.right) right.push(n.val);
  collect(root.left);
  collect(root.right);
  return [...res, ...left, ...leaves, ...right.reverse()];
}
```

## 6. Обходи й BST

In-order обхід **бінарного дерева пошуку** дає значення **у відсортованому порядку**. `inorder(bstFrom([5, 3, 8, 1, 4, 7, 9]))` = `[1, 3, 4, 5, 7, 8, 9]`. Це дає: перевірку BST (`isValidBst`), k-й найменший елемент, діапазонні суми. Pre-order BST дозволяє **відновити** BST (вставки в цьому порядку дають те саме дерево): `preorder(bstFrom([5, 3, 8, 1, 4, 7, 9]))` = `[5, 3, 1, 4, 8, 7, 9]`. Структура даних — [BinaryTree.md](../../../js/common/data-structures/BinaryTree/BinaryTree.md).

## 7. Відновлення дерева з обходів

Pre-order (або post-order) знаходить **корінь**, in-order ділить на ліве та праве піддерева за позицією кореня.

`buildFromPreIn([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])` → level-order `[[3], [9, 20], [15, 7]]`.

Один pre-order **без** in-order **не** визначає дерево (потрібні й `null`-маркери: `serialize`). Pre + post без in-order — також не однозначні (для вузлів з однією дитиною).

**Серіалізація:** `serialize(fromLevelOrder([1, 2, 3, null, null, 4, 5]))` = `'1,2,#,#,3,4,#,#,5,#,#'`; `deserialize` відновлює дерево.

## 8. Складність

| Обхід | Час | Пам'ять |
|---|---|---|
| Рекурсивний DFS | `O(n)` | `O(h)` |
| Ітеративний DFS | `O(n)` | `O(h)` |
| Level-order | `O(n)` | `O(w)` (ширина, до `n/2`) |
| Морріс | `O(n)` | `O(1)` |

`h` — висота: від `log₂ n` (збалансоване) до `n` (виродження).

## 9. Корисні задачі

- **Висота, розмір, діаметр** (найдовший шлях між двома вузлами): `diameter(fromLevelOrder([1, 2, 3, 4, 5]))` = `3`.
- **Збалансованість:** `isBalanced(fromLevelOrder([3, 9, 20, null, null, 15, 7]))` = `true`.
- **Симетрія:** `isSymmetric(fromLevelOrder([1, 2, 2, 3, 4, 4, 3]))` = `true`.
- **Вигляд справа:** `rightSideView(fromLevelOrder([1, 2, 3, null, 5, null, 4]))` = `[1, 3, 4]`.
- **Зигзаг:** `zigzagLevelOrder(fromLevelOrder([3, 9, 20, null, null, 15, 7]))` = `[[3], [20, 9], [15, 7]]`.
- **Суми шляхів до листків:** `pathSums(fromLevelOrder([5, 4, 8, 11, null, 13, 4]))` = `[20, 26, 17]`.
- **Вертикальний обхід, граничний обхід, інверсія дерева.**
- **Найменший спільний предок** — [lca.md](lca.md); **запити на відрізках** — [segment-tree.md](segment-tree.md).

## 10. Типові помилки

1. **Порядок дітей у ітеративному pre-order** — у стек спочатку праву.
2. **Забути `null`-перевірку** в рекурсії.
3. **Плутанина in-order і pre-order** при відновленні дерева.
4. **Рекурсія на виродженому дереві** — `RangeError`.
5. **Level-order без поділу на рівні** — `size` черги не фіксується.
6. **Не відновити ниточки Морріса** — дерево пошкоджене.
7. **Перевірка BST лише сусідніх батьків** (а не діапазонів) — `isValidBst` потребує меж.
8. **Дублікати у BST** — потрібна домовленість, куди їх класти.
9. **Серіалізація без маркерів `null`** — неоднозначність.

## 11. Алгоритм (стисло)

1. Pre-order: `відвідати(n); go(n.left); go(n.right)`.
2. In-order: `go(n.left); відвідати(n); go(n.right)`.
3. Post-order: `go(n.left); go(n.right); відвідати(n)`.
4. Level-order: черга за рівнями.
5. Усе `O(n)` часу; пам'ять `O(h)` (Морріс `O(1)`).

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Який pre-order дерева `[1, 2, 3, 4, 5, null, 6]`?

```js
preorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))
```

**2.** Який in-order цього дерева?

```js
inorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))
```

**3.** Який post-order цього дерева?

```js
postorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))
```

**4.** Який level-order цього дерева?

```js
levelOrder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))
```

**5.** Чи збігаються рекурсивні й ітеративні варіанти pre/in/post?

```js
[JSON.stringify(preorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))) === JSON.stringify(preorderIter(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))), JSON.stringify(inorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))) === JSON.stringify(inorderIter(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))), JSON.stringify(postorder(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))) === JSON.stringify(postorderIter(fromLevelOrder([1, 2, 3, 4, 5, null, 6])))]
```

**6.** Який результат `morrisInorder` і чи не пошкодило дерево (порівняйте з `inorder` після)?

```js
(() => { const t = fromLevelOrder([1, 2, 3, 4, 5, null, 6]); const m = morrisInorder(t); return [m, inorder(t)]; })()
```

**7.** Що поверне `fromLevelOrder([])` та `fromLevelOrder([null])`?

```js
[fromLevelOrder([]), fromLevelOrder([null])]
```

**8.** Що поверне `levelOrder(null)`, `preorder(null)`?

```js
[levelOrder(null), preorder(null)]
```

**9.** Які обходи дерева з одного вузла `[7]`?

```js
(() => { const t = fromLevelOrder([7]); return [preorder(t), inorder(t), postorder(t), levelOrder(t)]; })()
```

**10.** Які обходи вироджених дерев-ланцюжків: лівого `[1, 2, null, 3]`?

```js
(() => { const t = fromLevelOrder([1, 2, null, 3]); return [preorder(t), inorder(t), postorder(t)]; })()
```

**11.** Яка висота й розмір дерева `[1, 2, 3, 4, 5, null, 6]`?

```js
[height(fromLevelOrder([1, 2, 3, 4, 5, null, 6])), size(fromLevelOrder([1, 2, 3, 4, 5, null, 6]))]
```

**12.** Який діаметр дерева `[1, 2, 3, 4, 5]`?

```js
diameter(fromLevelOrder([1, 2, 3, 4, 5]))
```

**13.** Чи збалансоване `[3, 9, 20, null, null, 15, 7]` та `[1, 2, 2, 3, 3, null, null, 4, 4]`?

```js
[isBalanced(fromLevelOrder([3, 9, 20, null, null, 15, 7])), isBalanced(fromLevelOrder([1, 2, 2, 3, 3, null, null, 4, 4]))]
```

### Рівень 2. Робота алгоритму

**14.** Чи симетричне `[1, 2, 2, 3, 4, 4, 3]` та `[1, 2, 2, null, 3, null, 3]`?

```js
[isSymmetric(fromLevelOrder([1, 2, 2, 3, 4, 4, 3])), isSymmetric(fromLevelOrder([1, 2, 2, null, 3, null, 3]))]
```

**15.** Яка зигзагоподібна послідовність рівнів для `[3, 9, 20, null, null, 15, 7]`?

```js
zigzagLevelOrder(fromLevelOrder([3, 9, 20, null, null, 15, 7]))
```

**16.** Який вигляд справа для `[1, 2, 3, null, 5, null, 4]`?

```js
rightSideView(fromLevelOrder([1, 2, 3, null, 5, null, 4]))
```

**17.** Який вертикальний обхід `[3, 9, 20, null, null, 15, 7]`?

```js
verticalOrder(fromLevelOrder([3, 9, 20, null, null, 15, 7]))
```

**18.** Суми шляхів від кореня до листків для `[5, 4, 8, 11, null, 13, 4]`?

```js
pathSums(fromLevelOrder([5, 4, 8, 11, null, 13, 4]))
```

**19.** Який in-order BST зі вставок `[5, 3, 8, 1, 4, 7, 9]`?

```js
inorder(bstFrom([5, 3, 8, 1, 4, 7, 9]))
```

**20.** Який pre-order цього BST?

```js
preorder(bstFrom([5, 3, 8, 1, 4, 7, 9]))
```

**21.** Чи відновить вставка в порядку pre-order те саме BST? Порівняйте `preorder(bstFrom(preorder(...)))`.

```js
(() => { const t = bstFrom([5, 3, 8, 1, 4, 7, 9]); const p = preorder(t); return JSON.stringify(preorder(bstFrom(p))) === JSON.stringify(p); })()
```

**22.** Чи валідне BST `[5, 1, 4, null, null, 3, 6]` та `[2, 1, 3]`?

```js
[isValidBst(fromLevelOrder([5, 1, 4, null, null, 3, 6])), isValidBst(fromLevelOrder([2, 1, 3]))]
```

**23.** Чому лише порівняння з батьком не достатнє? Чи валідне `[10, 5, 15, null, null, 6, 20]`?

```js
isValidBst(fromLevelOrder([10, 5, 15, null, null, 6, 20]))
```

**24.** Який 3-й найменший елемент BST `[5, 3, 6, 2, 4, null, null, 1]`?

```js
kthSmallestBst(fromLevelOrder([5, 3, 6, 2, 4, null, null, 1]), 3)
```

**25.** Яке дерево дає `buildFromPreIn([3, 9, 20, 15, 7], [9, 3, 15, 20, 7])` (level-order)?

```js
levelOrder(buildFromPreIn([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]))
```

**26.** А `buildFromPostIn([9, 15, 7, 20, 3], [9, 3, 15, 20, 7])`?

```js
levelOrder(buildFromPostIn([9, 15, 7, 20, 3], [9, 3, 15, 20, 7]))
```

### Рівень 3. Складність і нюанси

**27.** Яка серіалізація `[1, 2, 3, null, null, 4, 5]`?

```js
serialize(fromLevelOrder([1, 2, 3, null, null, 4, 5]))
```

**28.** Чи відновить `deserialize(serialize(t))` дерево (порівняйте level-order)?

```js
(() => { const t = fromLevelOrder([1, 2, 3, null, null, 4, 5]); return JSON.stringify(levelOrder(deserialize(serialize(t)))) === JSON.stringify(levelOrder(t)); })()
```

**29.** Який level-order після `invertTree` дерева `[4, 2, 7, 1, 3, 6, 9]`?

```js
levelOrder(invertTree(fromLevelOrder([4, 2, 7, 1, 3, 6, 9])))
```

**30.** Який граничний обхід `[1, 2, 3, 4, 5, 6, 7]`?

```js
boundaryTraversal(fromLevelOrder([1, 2, 3, 4, 5, 6, 7]))
```

**31.** Чи правильна ніточка Морріса на дереві з 1000 вузлів BST? Порівняйте з `inorder`.

```js
(() => { const vals = Array.from({ length: 1000 }, (_, i) => (i * 37) % 1009); const a = bstFrom(vals), b = bstFrom(vals); return JSON.stringify(morrisInorder(a)) === JSON.stringify(inorder(b)); })()
```

**32.** Яка висота BST, збудованого вставкою відсортованого `[1, 2, 3, 4, 5]`?

```js
height(bstFrom([1, 2, 3, 4, 5]))
```

**33.** Напишіть `maxDepthIter(root)` — висота дерева ітеративно (level-order).

**34.** Напишіть `countLeaves(root)` — кількість листків.

**35.** Напишіть `sameTree(a, b)` — чи однакові дерева за структурою й значеннями.

**36.** Напишіть `lowestCommonAncestorBst(root, p, q)` — значення найменшого спільного предка в BST.

**37.** Напишіть `hasPathSum(root, target)` — чи є шлях від кореня до листка з сумою `target`.

**38.** Напишіть `sortedArrayToBst(a)` — збалансоване BST із відсортованого масиву; поверніть `height`.

**39.** Напишіть `treeSum(root)` — суму всіх значень (post-order).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `maxPathSum(root)` — максимальну суму шляху між будь-якими двома вузлами (може містити від'ємні).

**41.** Чим відрізняються pre-order, in-order і post-order?

**42.** Чому in-order обхід BST дає відсортований порядок?

**43.** Як працює обхід Моріса і навіщо він?

**44.** Які обходи потрібні, щоб однозначно відновити бінарне дерево?

**45.** Чим відрізняється складність пам'яті DFS і BFS обходів?

**46.** Як вирахувати діаметр дерева за один обхід?

**47.** Як серіалізувати й десеріалізувати бінарне дерево?

**48.** Як реалізується ітеративний post-order?

**49.** Чому перевірка BST лише на рівні батько-дитина недостатня?

**50.** У яких задачах потрібен саме level-order?

### Відповіді

1. `[1, 2, 4, 5, 3, 6]`
2. `[4, 2, 5, 1, 3, 6]`
3. `[4, 5, 2, 6, 3, 1]`
4. `[[1], [2, 3], [4, 5, 6]]`
5. `[true, true, true]`
6. `[[4, 2, 5, 1, 3, 6], [4, 2, 5, 1, 3, 6]]`
7. `[null, null]`
8. `[[], []]`
9. `[[7], [7], [7], [[7]]]`
10. `[[1, 2, 3], [3, 2, 1], [3, 2, 1]]`
11. `[3, 6]`
12. `3`
13. `[true, false]`
14. `[true, false]`
15. `[[3], [20, 9], [15, 7]]`
16. `[1, 3, 4]`
17. `[[9], [3, 15], [20], [7]]`
18. `[20, 26, 17]`
19. `[1, 3, 4, 5, 7, 8, 9]`
20. `[5, 3, 1, 4, 8, 7, 9]`
21. `true`
22. `[false, true]`
23. `false`
24. `3`
25. `[[3], [9, 20], [15, 7]]`
26. `[[3], [9, 20], [15, 7]]`
27. `'1,2,#,#,3,4,#,#,5,#,#'`
28. `true`
29. `[[4], [7, 2], [9, 6, 3, 1]]`
30. `[1, 2, 4, 5, 6, 7, 3]`
31. `true`
32. `5`
33. Приклад розв'язку:

   ```js
   function maxDepthIter(root) {
     if (!root) return 0;
     let d = 0;
     let level = [root];
     while (level.length) {
       d++;
       level = level.flatMap(n => [n.left, n.right].filter(Boolean));
     }
     return d;
   }
   ```

   Виклик `[maxDepthIter(fromLevelOrder([3, 9, 20, null, null, 15, 7])), maxDepthIter(null)]` → `[3, 0]`

34. Приклад розв'язку:

   ```js
   function countLeaves(n) {
     if (!n) return 0;
     if (!n.left && !n.right) return 1;
     return countLeaves(n.left) + countLeaves(n.right);
   }
   ```

   Виклик `[countLeaves(fromLevelOrder([1, 2, 3, 4, 5, null, 6])), countLeaves(null)]` → `[3, 0]`

35. Приклад розв'язку:

   ```js
   function sameTree(a, b) {
     if (!a && !b) return true;
     if (!a || !b || a.val !== b.val) return false;
     return sameTree(a.left, b.left) && sameTree(a.right, b.right);
   }
   ```

   Виклик `[sameTree(fromLevelOrder([1, 2, 3]), fromLevelOrder([1, 2, 3])), sameTree(fromLevelOrder([1, 2]), fromLevelOrder([1, null, 2]))]` → `[true, false]`

36. Приклад розв'язку:

   ```js
   function lowestCommonAncestorBst(root, p, q) {
     let n = root;
     while (n) {
       if (p < n.val && q < n.val) n = n.left;
       else if (p > n.val && q > n.val) n = n.right;
       else return n.val;
     }
     return null;
   }
   ```

   Виклик `[lowestCommonAncestorBst(bstFrom([6, 2, 8, 0, 4, 7, 9, 3, 5]), 2, 8), lowestCommonAncestorBst(bstFrom([6, 2, 8, 0, 4, 7, 9, 3, 5]), 2, 4)]` → `[6, 2]`

37. Приклад розв'язку:

   ```js
   function hasPathSum(n, t) {
     if (!n) return false;
     if (!n.left && !n.right) return n.val === t;
     return hasPathSum(n.left, t - n.val) || hasPathSum(n.right, t - n.val);
   }
   ```

   Виклик `[hasPathSum(fromLevelOrder([5, 4, 8, 11, null, 13, 4]), 20), hasPathSum(fromLevelOrder([1, 2]), 1)]` → `[true, false]`

38. Приклад розв'язку:

   ```js
   function sortedArrayToBst(a) {
     const go = (lo, hi) => {
       if (lo > hi) return null;
       const m = (lo + hi) >> 1;
       const n = node(a[m]);
       n.left = go(lo, m - 1);
       n.right = go(m + 1, hi);
       return n;
     };
     return go(0, a.length - 1);
   }
   ```

   Виклик `(() => { const t = sortedArrayToBst([-10, -3, 0, 5, 9]); return [inorder(t), height(t), isValidBst(t)]; })()` → `[[-10, -3, 0, 5, 9], 3, true]`

39. Приклад розв'язку:

   ```js
   function treeSum(n) {
     return n ? treeSum(n.left) + treeSum(n.right) + n.val : 0;
   }
   ```

   Виклик `[treeSum(fromLevelOrder([1, 2, 3, 4, 5])), treeSum(null)]` → `[15, 0]`

40. Приклад розв'язку:

   ```js
   function maxPathSum(root) {
     let best = -Infinity;
     const go = (n) => {
       if (!n) return 0;
       const l = Math.max(0, go(n.left)), r = Math.max(0, go(n.right));
       best = Math.max(best, n.val + l + r);
       return n.val + Math.max(l, r);
     };
     go(root);
     return best;
   }
   ```

   Виклик `[maxPathSum(fromLevelOrder([1, 2, 3])), maxPathSum(fromLevelOrder([-10, 9, 20, null, null, 15, 7]))]` → `[6, 42]`

41. Вони відрізняються моментом відвідування кореня: pre-order — до обходу піддерев, in-order — між лівим і правим, post-order — після обох. Звідси назви.
42. У BST усі значення лівого піддерева менші за корінь, а правого — більші. In-order спочатку відвідує ліве піддерево, потім корінь, потім праве — тобто виводить елементи у зростаючому порядку.
43. Для вузла з лівим піддеревом знаходять in-order предшественника (найправіший вузол лівого піддерева) і тимчасово прив'язують його праве посилання до поточного вузла. Це дозволяє повернутись без стека; після використання посилання відновлюється. Результат — `O(n)` часу та `O(1)` пам'яті.
44. In-order разом з pre-order або post-order: pre/post вказує корінь, in-order ділить вузли на ліве й праве піддерева. Pre-order сам по собі не визначає дерево без маркерів `null`.
45. Глибинні обходи використовують `O(h)` стека (висота дерева), широкий — `O(w)` черги (максимальна ширина рівня, до `n/2`). Для виродженого дерева DFS потребує `O(n)`, для широкого — BFS.
46. Post-order: для кожного вузла отримати висоти лівого та правого піддерев, оновити глобальний максимум `l + r` і повернути `1 + max(l, r)`. Час `O(n)`.
47. Записати pre-order із маркерами `#` для відсутніх дітей; при читанні відновлювати рекурсивно: прочитати значення, потім ліве й праве піддерева. Маркери роблять запис однозначним.
48. Найпростіше — виконати pre-order з порядком «корінь → право → ліво» і розвернути результат; інші варіанти — два стеки або один стек із запам'ятовуванням останнього відвіданого вузла.
49. Піддерево має підкорятися обмеженням усіх предків: значення в правому піддереві лівої дитини повинно бути меншим за корінь. Тому під час спуску передають діапазон `(lo, hi)`, який звужується.
50. Коли відповідь залежить від рівнів: вигляд справа/зліва, зигзаг, мінімальна глибина, ширина дерева, зв'язування вузлів одного рівня, відстані від кореня.
