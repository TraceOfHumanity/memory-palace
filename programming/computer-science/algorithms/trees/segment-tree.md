# Segment Tree — дерево відрізків

**Дерево відрізків** — структура даних для масиву `a[0..n)`, що відповідає на запити на **відрізках** (сума, мінімум, максимум, НСД, кількість) та підтримує **оновлення** елементів, обидва за `O(log n)`. Префіксні суми ([prefix-sums.md](../techniques/prefix-sums.md)) відповідають на запити за `O(1)`, але оновлення коштує `O(n)`; дерево відрізків — компроміс для **змінних** даних. З **лінивим поширенням** (lazy propagation) воно підтримує також оновлення **на відрізку**.

## 1. Ідея

Корінь відповідає всьому масиву `[0, n)`; кожен вузол `[l, r)` ділиться навпіл на `[l, m)` і `[m, r)`. Листки — окремі елементи. Вузол зберігає **агрегат** (суму, мінімум…) свого відрізка, який обчислюється з агрегатів дітей. Для `a = [2, 1, 5, 3, 4, 7, 6, 8]` (сума):

```text
                [0,8)=36
             /            \
        [0,4)=11          [4,8)=25
        /     \           /      \
   [0,2)=3  [2,4)=8  [4,6)=11  [6,8)=14
   /   \     /   \    /   \     /   \
  2     1   5     3  4     7   6     8
```

Дерево з `n` листків має `2n − 1` вузлів і висоту `⌈log₂ n⌉`.

## 2. Запит на відрізку

Запит `[ql, qr)`: рекурсивно спускаємось; для вузла `[l, r)`:

- **не перетинається** із запитом — повертаємо нейтральний елемент (`0` для суми, `+∞` для мінімуму);
- **повністю всередині** запиту — повертаємо його агрегат;
- **частково перекривається** — об'єднуємо результати дітей.

Чому `O(log n)`: на кожному рівні лише **не більше двох** вузлів «частково перекриваються» (по краях запиту), решта — або повністю всередині (зупиняємось), або поза. Отже, відвідуємо `O(log n)` вузлів. `sum(2, 6)` для нашого масиву = `19` (`5 + 3 + 4 + 7`).

## 3. Точкове оновлення

Змінюємо листок і перераховуємо агрегати **вгору** до кореня: `O(log n)` вузлів. `update(3, 10)` змінює елемент `3` на `10`; сума `[2, 6)` стає `26`.

## 4. Реалізація (ітеративна, знизу вгору)

Зручна й швидка форма: масив `tree[2n]`, листки в `tree[n..2n)`, батько вузла `i` — `i >> 1`, діти `2i` і `2i + 1`. Підходить для **комутативних** і некомутативних операцій (з обережністю).

```js
const sumOp = (a, b) => a + b;
const minOp = (a, b) => Math.min(a, b);
const maxOp = (a, b) => Math.max(a, b);
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

class SegmentTree {
  constructor(arr, op, identity) {
    this.n = arr.length;
    this.op = op;
    this.id = identity;
    this.t = new Array(2 * this.n).fill(identity);
    for (let i = 0; i < this.n; i++) this.t[this.n + i] = arr[i];
    for (let i = this.n - 1; i >= 1; i--) this.t[i] = op(this.t[2 * i], this.t[2 * i + 1]);
  }
  update(i, v) {
    let p = i + this.n;
    this.t[p] = v;
    for (p >>= 1; p >= 1; p >>= 1) this.t[p] = this.op(this.t[2 * p], this.t[2 * p + 1]);
  }
  query(l, r) {
    let resL = this.id;
    let resR = this.id;
    for (l += this.n, r += this.n; l < r; l >>= 1, r >>= 1) {
      if (l & 1) resL = this.op(resL, this.t[l++]);
      if (r & 1) resR = this.op(this.t[--r], resR);
    }
    return this.op(resL, resR);
  }
}

class RecursiveSegmentTree {
  constructor(arr, op, identity) {
    this.n = arr.length;
    this.op = op;
    this.id = identity;
    this.t = new Array(4 * this.n).fill(identity);
    this.visited = 0;
    if (this.n) this.build(arr, 1, 0, this.n - 1);
  }
  build(arr, node, l, r) {
    if (l === r) { this.t[node] = arr[l]; return; }
    const m = (l + r) >> 1;
    this.build(arr, 2 * node, l, m);
    this.build(arr, 2 * node + 1, m + 1, r);
    this.t[node] = this.op(this.t[2 * node], this.t[2 * node + 1]);
  }
  query(ql, qr, node = 1, l = 0, r = this.n - 1) {
    this.visited++;
    if (qr < l || r < ql) return this.id;
    if (ql <= l && r <= qr) return this.t[node];
    const m = (l + r) >> 1;
    return this.op(this.query(ql, qr, 2 * node, l, m), this.query(ql, qr, 2 * node + 1, m + 1, r));
  }
  update(i, v, node = 1, l = 0, r = this.n - 1) {
    if (l === r) { this.t[node] = v; return; }
    const m = (l + r) >> 1;
    if (i <= m) this.update(i, v, 2 * node, l, m);
    else this.update(i, v, 2 * node + 1, m + 1, r);
    this.t[node] = this.op(this.t[2 * node], this.t[2 * node + 1]);
  }
}

class LazySegmentTree {
  constructor(arr) {
    this.n = arr.length;
    this.sum = new Array(4 * this.n).fill(0);
    this.lazy = new Array(4 * this.n).fill(0);
    if (this.n) this.build(arr, 1, 0, this.n - 1);
  }
  build(arr, node, l, r) {
    if (l === r) { this.sum[node] = arr[l]; return; }
    const m = (l + r) >> 1;
    this.build(arr, 2 * node, l, m);
    this.build(arr, 2 * node + 1, m + 1, r);
    this.sum[node] = this.sum[2 * node] + this.sum[2 * node + 1];
  }
  push(node, l, r) {
    if (this.lazy[node] === 0) return;
    const m = (l + r) >> 1;
    const v = this.lazy[node];
    this.sum[2 * node] += v * (m - l + 1);
    this.lazy[2 * node] += v;
    this.sum[2 * node + 1] += v * (r - m);
    this.lazy[2 * node + 1] += v;
    this.lazy[node] = 0;
  }
  rangeAdd(ql, qr, v, node = 1, l = 0, r = this.n - 1) {
    if (qr < l || r < ql) return;
    if (ql <= l && r <= qr) { this.sum[node] += v * (r - l + 1); this.lazy[node] += v; return; }
    this.push(node, l, r);
    const m = (l + r) >> 1;
    this.rangeAdd(ql, qr, v, 2 * node, l, m);
    this.rangeAdd(ql, qr, v, 2 * node + 1, m + 1, r);
    this.sum[node] = this.sum[2 * node] + this.sum[2 * node + 1];
  }
  rangeSum(ql, qr, node = 1, l = 0, r = this.n - 1) {
    if (qr < l || r < ql) return 0;
    if (ql <= l && r <= qr) return this.sum[node];
    this.push(node, l, r);
    const m = (l + r) >> 1;
    return this.rangeSum(ql, qr, 2 * node, l, m) + this.rangeSum(ql, qr, 2 * node + 1, m + 1, r);
  }
}

function bruteQuery(a, l, r, op, id) {
  let res = id;
  for (let i = l; i < r; i++) res = op(res, a[i]);
  return res;
}

function countSmallerAfterSelf(nums) {
  const sorted = [...new Set(nums)].sort((a, b) => a - b);
  const rank = new Map(sorted.map((v, i) => [v, i]));
  const t = new SegmentTree(new Array(sorted.length).fill(0), sumOp, 0);
  const res = new Array(nums.length);
  for (let i = nums.length - 1; i >= 0; i--) {
    const r = rank.get(nums[i]);
    res[i] = t.query(0, r);
    t.update(r, t.query(r, r + 1) + 1);
  }
  return res;
}

function rangeSumQueryMutable(arr, ops) {
  const t = new SegmentTree(arr, sumOp, 0);
  const out = [];
  for (const [type, a, b] of ops) {
    if (type === 'u') t.update(a, b);
    else out.push(t.query(a, b + 1));
  }
  return out;
}

function skylineMaxHeights(heights, queries) {
  const t = new SegmentTree(heights, maxOp, -Infinity);
  return queries.map(([l, r]) => t.query(l, r + 1));
}

function firstIndexAtLeast(arr, x) {
  const t = new RecursiveSegmentTree(arr, maxOp, -Infinity);
  const go = (node, l, r) => {
    if (t.t[node] < x) return -1;
    if (l === r) return l;
    const m = (l + r) >> 1;
    const left = go(2 * node, l, m);
    return left !== -1 ? left : go(2 * node + 1, m + 1, r);
  };
  return arr.length ? go(1, 0, arr.length - 1) : -1;
}

function inversionsCount(arr) {
  const sorted = [...new Set(arr)].sort((a, b) => a - b);
  const rank = new Map(sorted.map((v, i) => [v, i]));
  const t = new SegmentTree(new Array(sorted.length).fill(0), sumOp, 0);
  let inv = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    const r = rank.get(arr[i]);
    inv += t.query(0, r);
    t.update(r, t.query(r, r + 1) + 1);
  }
  return inv;
}
```

## 5. Ліниве поширення (lazy propagation)

Щоб оновлювати **відрізок** (наприклад, «додати `v` до всіх `a[l..r]`») за `O(log n)`, у вузлі зберігаємо **відкладену операцію** (`lazy`): вона застосована до агрегата вузла, але ще **не** передана дітям. Коли запит чи оновлення спускається нижче, виконуємо **push**: передаємо `lazy` дітям і скидаємо. Для суми: агрегат вузла збільшується на `v · довжина`, `lazy` накопичує `v`.

`LazySegmentTree([1, 2, 3, 4, 5])`: після `rangeAdd(1, 3, 10)` сума `[0, 4]` = `45` (`15 + 30`), сума `[2, 3]` = `27`.

Без ліні оновлення відрізка коштувало б `O(n log n)` (n точкових). Ліниве поширення — основа задач «присвоїти на відрізку», «додати й запитати мінімум», «розфарбувати відрізок» (операції мають складатись асоціативно).

## 6. Який агрегат можна зберігати

Потрібна **асоціативна** операція `op` із **нейтральним елементом** `identity`:

| Задача | `op` | `identity` |
|---|---|---|
| Сума | `+` | `0` |
| Мінімум | `min` | `+∞` |
| Максимум | `max` | `−∞` |
| НСД | `gcd` | `0` |
| XOR | `^` | `0` |
| Добуток за модулем | `·` | `1` |

Складніші вузли (кортежі): «максимальна сума підмасиву на відрізку» (сума, префікс, суфікс, найкраще) — ідея [Кадане](../techniques/kadane.md) у вузлі.

## 7. Приклади запитів

- **Сума, мінімум, максимум, НСД:** `new SegmentTree([6, 4, 10, 8], gcd, 0).query(0, 4)` = `2`; мінімум `[1, 4)` у `[5, 2, 8, 1, 9]`: `1`.
- **Змінна сума:** `rangeSumQueryMutable([1, 3, 5], [['q', 0, 2], ['u', 1, 2], ['q', 0, 2]])` = `[9, 8]`.
- **Кількість менших після кожного елемента:** `countSmallerAfterSelf([5, 2, 6, 1])` = `[2, 1, 1, 0]`.
- **Кількість інверсій:** `inversionsCount([2, 4, 1, 3, 5])` = `3`.
- **Пошук першого елемента `≥ x`:** спуск по дереву за `O(log n)`: `firstIndexAtLeast([1, 3, 2, 7, 4], 5)` = `3`.
- **Сегментація, геометрія (сканувальна лінія), динамічні скайлайни, задачі про вікна.**

## 8. Складність

| Операція | Час | Пам'ять |
|---|---|---|
| Побудова | `O(n)` | `O(n)` (`2n` ітеративне, `4n` рекурсивне) |
| Запит | `O(log n)` | — |
| Точкове оновлення | `O(log n)` | — |
| Оновлення відрізка (lazy) | `O(log n)` | `O(n)` додатково |

Рекурсивний запит `[2, 6)` у дереві з 8 листків відвідує 7 вузлів, а для `n = 1024` і відрізка `[1, 1022]` — 39 (≈ `4·log₂ n`).

**Порівняння з альтернативами:**

- **Префіксні суми:** запит `O(1)`, оновлення `O(n)`.
- **[Дерево Фенвіка](fenwick-tree.md):** простіше й компактніше (`O(n)`), але лише для префіксних операцій із оберненим елементом (сума, XOR).
- **Sparse table:** запит `O(1)` для статичних даних (мінімум, НСД), побудова `O(n log n)`.
- **sqrt-декомпозиція:** `O(√n)` — простіша, але повільніша.

## 9. Типові помилки

1. **Півінтервал чи закритий:** змішування `[l, r)` та `[l, r]` — найчастіша помилка.
2. **Розмір масиву `4n`** для рекурсивного дерева (не `2n`) при довільному `n`.
3. **Нейтральний елемент** неправильний (`0` для мінімуму).
4. **Забути `push`** перед спуском у lazy-версії — дані не оновлюються.
5. **Забути перерахунок агрегата після дітей** у lazy `rangeAdd`.
6. **Некомутативна операція** в ітеративній версії — треба зберігати ліву й праву частину окремо (як у `query`).
7. **Ліниве значення для присвоєння** потребує прапора «є відкладене»; `0` не відрізняється від «немає».
8. **Переповнення сум** для великих значень.
9. **Оновлення індексу поза діапазоном.**

## 10. Алгоритм (стисло)

1. Побудова: листки — елементи; `t[i] = op(t[2i], t[2i + 1])`.
2. Оновлення: змінити листок і піднятись вгору, перераховуючи.
3. Запит `[l, r)`: від листків підніматись, беручи вузли, що повністю в запиті.
4. Для оновлень відрізка — lazy: відкладена операція в вузлі, `push` вниз при спуску.
5. Час `O(log n)` на операцію.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка сума `[2, 6)` у дереві суми?

```js
new SegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0).query(2, 6)
```

**2.** Яка сума всього масиву `[0, 8)` та одного елемента `[3, 4)`?

```js
(() => { const t = new SegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0); return [t.query(0, 8), t.query(3, 4)]; })()
```

**3.** Що поверне запит на порожньому відрізку `[3, 3)`?

```js
new SegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0).query(3, 3)
```

**4.** Який вміст внутрішнього масиву `t` для `[2, 1, 5, 3, 4, 7, 6, 8]`?

```js
new SegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0).t
```

**5.** Яка сума `[2, 6)` після `update(3, 10)`?

```js
(() => { const t = new SegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0); t.update(3, 10); return t.query(2, 6); })()
```

**6.** Яка сума всього масиву після `update(0, 100)`?

```js
(() => { const t = new SegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0); t.update(0, 100); return t.query(0, 8); })()
```

**7.** Який мінімум `[1, 4)` у `[5, 2, 8, 1, 9]`?

```js
new SegmentTree([5, 2, 8, 1, 9], minOp, Infinity).query(1, 4)
```

**8.** Який максимум `[0, 3)` у тому ж масиві?

```js
new SegmentTree([5, 2, 8, 1, 9], maxOp, -Infinity).query(0, 3)
```

**9.** Який НСД `[0, 4)` у `[6, 4, 10, 8]` та `[1, 3)`?

```js
(() => { const t = new SegmentTree([6, 4, 10, 8], gcd, 0); return [t.query(0, 4), t.query(1, 3)]; })()
```

**10.** Який XOR `[1, 4)` у `[1, 2, 3, 4, 5]` (операція XOR, нейтральний 0)?

```js
new SegmentTree([1, 2, 3, 4, 5], (a, b) => a ^ b, 0).query(1, 4)
```

**11.** Чи працює дерево для непарного `n`, наприклад `[3, 1, 4, 1, 5]`: сума `[0, 5)` та `[1, 4)`?

```js
(() => { const t = new SegmentTree([3, 1, 4, 1, 5], sumOp, 0); return [t.query(0, 5), t.query(1, 4)]; })()
```

**12.** Що поверне ітеративне дерево для одного елемента `[7]`?

```js
(() => { const t = new SegmentTree([7], sumOp, 0); return [t.query(0, 1), t.t]; })()
```

**13.** Чи збігаються запити дерева з перебором для всіх пар `l < r` у масиві з 10 елементів?

```js
(() => { const a = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0]; const t = new SegmentTree(a, sumOp, 0); const m = new SegmentTree(a, minOp, Infinity); let ok = true; for (let l = 0; l < a.length; l++) for (let r = l + 1; r <= a.length; r++) { if (t.query(l, r) !== bruteQuery(a, l, r, sumOp, 0)) ok = false; if (m.query(l, r) !== bruteQuery(a, l, r, minOp, Infinity)) ok = false; } return ok; })()
```

### Рівень 2. Робота алгоритму

**14.** Чи збігаються рекурсивна й ітеративна версії для всіх запитів?

```js
(() => { const a = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0]; const t = new SegmentTree(a, sumOp, 0); const r = new RecursiveSegmentTree(a, sumOp, 0); let ok = true; for (let l = 0; l < a.length; l++) for (let h = l; h < a.length; h++) if (t.query(l, h + 1) !== r.query(l, h)) ok = false; return ok; })()
```

**15.** Скільки вузлів відвідує рекурсивний запит `[2, 5]` у дереві з 8 листків?

```js
(() => { const t = new RecursiveSegmentTree([2, 1, 5, 3, 4, 7, 6, 8], sumOp, 0); t.query(2, 5); return t.visited; })()
```

**16.** Скільки вузлів відвідує запит `[1, 1022]` для `n = 1024`?

```js
(() => { const t = new RecursiveSegmentTree(new Array(1024).fill(1), sumOp, 0); t.query(1, 1022); return t.visited; })()
```

**17.** Скільки вузлів у ітеративному дереві з 1000 елементів (`2n`) та рекурсивному (`4n`)?

```js
[2 * 1000, 4 * 1000]
```

**18.** Яка висота дерева для `n = 1000`?

```js
Math.ceil(Math.log2(1000))
```

**19.** Яка сума `[0, 4]` після `rangeAdd(1, 3, 10)` у `LazySegmentTree([1, 2, 3, 4, 5])`?

```js
(() => { const t = new LazySegmentTree([1, 2, 3, 4, 5]); t.rangeAdd(1, 3, 10); return t.rangeSum(0, 4); })()
```

**20.** Яка сума `[2, 3]` після того самого оновлення?

```js
(() => { const t = new LazySegmentTree([1, 2, 3, 4, 5]); t.rangeAdd(1, 3, 10); return t.rangeSum(2, 3); })()
```

**21.** Яка сума після двох перекритих оновлень `rangeAdd(0, 2, 1)` і `rangeAdd(1, 4, 2)`?

```js
(() => { const t = new LazySegmentTree([0, 0, 0, 0, 0]); t.rangeAdd(0, 2, 1); t.rangeAdd(1, 4, 2); return [t.rangeSum(0, 4), t.rangeSum(1, 2), t.rangeSum(4, 4)]; })()
```

**22.** Чи збігається lazy-дерево з перебором на 100 випадкових операціях?

```js
(() => { const n = 12; const arr = Array.from({ length: n }, (_, i) => i); const t = new LazySegmentTree(arr); const ref = arr.slice(); let ok = true; for (let k = 1; k <= 100; k++) { const l = (k * 7) % n, r = Math.min(n - 1, l + (k * 3) % 5); if (k % 2) { const v = (k % 5) - 2; t.rangeAdd(l, r, v); for (let i = l; i <= r; i++) ref[i] += v; } else { let s = 0; for (let i = l; i <= r; i++) s += ref[i]; if (t.rangeSum(l, r) !== s) ok = false; } } return ok; })()
```

**23.** Що поверне `rangeSumQueryMutable([1, 3, 5], [['q', 0, 2], ['u', 1, 2], ['q', 0, 2]])`?

```js
rangeSumQueryMutable([1, 3, 5], [['q', 0, 2], ['u', 1, 2], ['q', 0, 2]])
```

**24.** Що поверне `countSmallerAfterSelf([5, 2, 6, 1])`?

```js
countSmallerAfterSelf([5, 2, 6, 1])
```

**25.** А `countSmallerAfterSelf([-1, -1])` та `[1]`?

```js
[countSmallerAfterSelf([-1, -1]), countSmallerAfterSelf([1])]
```

**26.** Скільки інверсій у `[2, 4, 1, 3, 5]` та у спадному `[5, 4, 3, 2, 1]`?

```js
[inversionsCount([2, 4, 1, 3, 5]), inversionsCount([5, 4, 3, 2, 1])]
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `firstIndexAtLeast([1, 3, 2, 7, 4], 5)` та для недосяжного `100`?

```js
[firstIndexAtLeast([1, 3, 2, 7, 4], 5), firstIndexAtLeast([1, 3, 2, 7, 4], 100)]
```

**28.** Що поверне `skylineMaxHeights([3, 1, 4, 1, 5, 9, 2, 6], [[0, 3], [4, 7], [2, 2]])`?

```js
skylineMaxHeights([3, 1, 4, 1, 5, 9, 2, 6], [[0, 3], [4, 7], [2, 2]])
```

**29.** Яка нейтральна величина для мінімуму та чому для нього не підійде `0`? Порівняйте запит порожнього відрізка при `identity = Infinity` та `0`.

```js
[new SegmentTree([5, 3], minOp, Infinity).query(0, 0), new SegmentTree([5, 3], minOp, 0).query(0, 2)]
```

**30.** Напишіть `maxSubarrayNode(arr)` — вузол для «максимальна сума підмасиву»: функція об'єднання кортежів `[сума, префікс, суфікс, найкраще]`; поверніть найкращу суму `[0, n)` через `SegmentTree`.

**31.** Напишіть `rangeMinQueries(arr, queries)` — відповіді на запити мінімуму `[l, r]` (закриті межі).

**32.** Напишіть `rangeCountQuery(arr, queries, x)` — кількість елементів, рівних `x`, у `[l, r]` (дерево сум над індикатором).

**33.** Напишіть `updateAndSum(arr, updates, l, r)` — застосуйте точкові оновлення `[i, v]` і поверніть суму `[l, r]`.

**34.** Напишіть `rangeGcdQueries(arr, queries)` — НСД на відрізках `[l, r]`.

**35.** Напишіть `rangeAddPointQuery(n, ops)` — оновлення відрізків `['a', l, r, v]` і точкові запити `['q', i]` (через `LazySegmentTree` із нулями).

**36.** Напишіть `kthOneFromLeft(bits, k)` — позиція k-ї одиниці (з 1) у бінарному масиві (дерево сум + спуск).

**37.** Напишіть `buildSparseMin(arr)` — таблицю для запитів мінімуму за `O(1)` (sparse table) і поверніть функцію `query(l, r)` із закритими межами.

**38.** Напишіть `countInversionsMerge(arr)` — інверсії злиттям (для порівняння з деревом відрізків).

**39.** Які задачі розв'язує дерево відрізків?

### Рівень 4. Задачі з інтерв'ю

**40.** Чому запит на відрізку працює за `O(log n)`?

**41.** Що таке ліниве поширення (lazy propagation)?

**42.** Які вимоги до операції агрегації?

**43.** Чому рекурсивне дерево займає `4n` пам'яті?

**44.** Чим дерево відрізків відрізняється від дерева Фенвіка?

**45.** Коли варто використати sparse table замість дерева відрізків?

**46.** Як дерево відрізків допомагає рахувати інверсії?

**47.** Як перевірити коректність реалізації дерева відрізків?

**48.** Що таке нейтральний елемент і навіщо він у запиті?

**49.** Що поверне `query(0, 4)` для мінімуму `[5, 2, 8, 1]` після `update(3, 10)`?

```js
(() => { const t = new SegmentTree([5, 2, 8, 1], minOp, Infinity); t.update(3, 10); return t.query(0, 4); })()
```

**50.** Скільки різних вузлів зберігає дерево для `n = 8` (всередині `t` — індекси 1..15)?

```js
15
```

### Відповіді

1. `19`
2. `[36, 3]`
3. `0`
4. `[0, 36, 11, 25, 3, 8, 11, 14, 2, 1, 5, 3, 4, 7, 6, 8]`
5. `26`
6. `134`
7. `1`
8. `8`
9. `[2, 2]`
10. `5`
11. `[14, 6]`
12. `[7, [0, 7]]`
13. `true`
14. `true`
15. `7`
16. `39`
17. `[2000, 4000]`
18. `10`
19. `45`
20. `27`
21. `[11, 6, 2]`
22. `true`
23. `[9, 8]`
24. `[2, 1, 1, 0]`
25. `[[0, 0], [0]]`
26. `[3, 10]`
27. `[3, -1]`
28. `[4, 9, 4]`
29. `[Infinity, 0]`
30. Приклад розв'язку:

   ```js
   function maxSubarrayNode(arr) {
     const mkNode = (x) => [x, x, x, x];
     const op = (a, b) => a === null ? b : b === null ? a : [a[0] + b[0], Math.max(a[1], a[0] + b[1]), Math.max(b[2], b[0] + a[2]), Math.max(a[3], b[3], a[2] + b[1])];
     const t = new SegmentTree(arr.map(mkNode), op, null);
     return t.query(0, arr.length)[3];
   }
   ```

   Виклик `[maxSubarrayNode([-2, 1, -3, 4, -1, 2, 1, -5, 4]), maxSubarrayNode([-3, -1, -2])]` → `[6, -1]`

31. Приклад розв'язку:

   ```js
   function rangeMinQueries(arr, qs) {
     const t = new SegmentTree(arr, minOp, Infinity);
     return qs.map(([l, r]) => t.query(l, r + 1));
   }
   ```

   Виклик `rangeMinQueries([4, 2, 7, 1, 9, 3], [[0, 5], [0, 2], [3, 3], [4, 5]])` → `[1, 2, 1, 3]`

32. Приклад розв'язку:

   ```js
   function rangeCountQuery(arr, qs, x) {
     const t = new SegmentTree(arr.map(v => v === x ? 1 : 0), sumOp, 0);
     return qs.map(([l, r]) => t.query(l, r + 1));
   }
   ```

   Виклик `rangeCountQuery([1, 2, 1, 3, 1, 2], [[0, 5], [1, 3], [3, 3]], 1)` → `[3, 1, 0]`

33. Приклад розв'язку:

   ```js
   function updateAndSum(arr, ups, l, r) {
     const t = new SegmentTree(arr, sumOp, 0);
     for (const [i, v] of ups) t.update(i, v);
     return t.query(l, r + 1);
   }
   ```

   Виклик `updateAndSum([1, 2, 3, 4, 5], [[0, 10], [4, 0]], 0, 4)` → `19`

34. Приклад розв'язку:

   ```js
   function rangeGcdQueries(arr, qs) {
     const t = new SegmentTree(arr, gcd, 0);
     return qs.map(([l, r]) => t.query(l, r + 1));
   }
   ```

   Виклик `rangeGcdQueries([12, 18, 24, 36, 5], [[0, 3], [1, 2], [3, 4], [4, 4]])` → `[6, 6, 1, 5]`

35. Приклад розв'язку:

   ```js
   function rangeAddPointQuery(n, ops) {
     const t = new LazySegmentTree(new Array(n).fill(0));
     const out = [];
     for (const [type, a, b, v] of ops) {
       if (type === 'a') t.rangeAdd(a, b, v);
       else out.push(t.rangeSum(a, a));
     }
     return out;
   }
   ```

   Виклик `rangeAddPointQuery(5, [['a', 0, 2, 3], ['q', 1], ['a', 1, 4, 2], ['q', 1], ['q', 4]])` → `[3, 5, 2]`

36. Приклад розв'язку:

   ```js
   function kthOneFromLeft(bits, k) {
     const n = bits.length;
     const t = new RecursiveSegmentTree(bits, sumOp, 0);
     const go = (node, l, r, kk) => {
       if (l === r) return l;
       const m = (l + r) >> 1;
       if (t.t[2 * node] >= kk) return go(2 * node, l, m, kk);
       return go(2 * node + 1, m + 1, r, kk - t.t[2 * node]);
     };
     if (t.t[1] < k) return -1;
     return go(1, 0, n - 1, k);
   }
   ```

   Виклик `[kthOneFromLeft([0, 1, 0, 1, 1, 0, 1], 3), kthOneFromLeft([0, 1, 0, 1, 1, 0, 1], 5), kthOneFromLeft([1, 1], 1)]` → `[4, -1, 0]`

37. Приклад розв'язку:

   ```js
   function buildSparseMin(a) {
     const n = a.length;
     const sp = [a.slice()];
     for (let j = 1; (1 << j) <= n; j++) {
       const prev = sp[j - 1];
       sp.push(Array.from({ length: n - (1 << j) + 1 }, (_, i) => Math.min(prev[i], prev[i + (1 << (j - 1))])));
     }
     return (l, r) => {
       const j = Math.floor(Math.log2(r - l + 1));
       return Math.min(sp[j][l], sp[j][r - (1 << j) + 1]);
     };
   }
   ```

   Виклик `(() => { const q = buildSparseMin([4, 2, 7, 1, 9, 3]); return [q(0, 5), q(0, 2), q(4, 5)]; })()` → `[1, 2, 3]`

38. Приклад розв'язку:

   ```js
   function countInversionsMerge(a) {
     let inv = 0;
     const sort = (x) => {
       if (x.length < 2) return x;
       const m = x.length >> 1, l = sort(x.slice(0, m)), r = sort(x.slice(m));
       const o = [];
       let i = 0, j = 0;
       while (i < l.length && j < r.length) {
         if (l[i] <= r[j]) o.push(l[i++]);
         else {
           o.push(r[j++]);
           inv += l.length - i;
         }
       }
       return o.concat(l.slice(i), r.slice(j));
     };
     sort(a);
     return inv;
   }
   ```

   Виклик `[countInversionsMerge([2, 4, 1, 3, 5]), inversionsCount([2, 4, 1, 3, 5])]` → `[3, 3]`

39. Запити агрегатів на відрізках (сума, мінімум, максимум, НСД) для масиву, що змінюється, за `O(log n)` на запит та оновлення; з лінивим поширенням — також оновлення на відрізках.
40. На кожному рівні дерева лише не більше двох вузлів перетинаються з межами запиту частково; решта або повністю всередині відрізка (повертають збережений агрегат), або поза ним. Отже, відвідується `O(log n)` вузлів.
41. Техніка, за якої відкладена операція на піддереві зберігається у вузлі й застосовується до агрегата одразу, але передається дітям (push) лише тоді, коли запит чи оновлення спускається нижче. Це дозволяє оновлювати відрізок за `O(log n)`.
42. Вона має бути асоціативною і мати нейтральний елемент (`0` для суми, `+∞` для мінімуму). Для некомутативних операцій потрібно зберігати порядок лівих і правих частин.
43. Коли `n` не є степенем двійки, дерево не повне, і нумерація `2i`, `2i + 1` може доходити до `4n` в найгіршому випадку; ітеративне дерево з `2n` елементів використовує інший, компактний розподіл листків.
44. Дерево Фенвіка простіше й компактніше (`O(n)`), підтримує префіксні запити з оберненою операцією (сума, XOR). Дерево відрізків універсальніше (мінімум, максимум, НСД, складні вузли, lazy), але потребує більше пам'яті й коду.
45. Для статичних даних і ідемпотентних операцій (мінімум, максимум, НСД): передобробка `O(n log n)` дає запити за `O(1)`. Для змінних даних sparse table не підходить.
46. Проходячи масив справа наліво, для кожного елемента запитуємо кількість уже доданих менших значень (сума на префіксі рангів) і додаємо одиницю на його ранг; сума відповідей — кількість інверсій за `O(n log n)`.
47. Порівняти з наївним перебором на великій кількості випадкових запитів та оновлень (stress-test) для різних розмірів, зокрема `n = 1` і непарних `n`, та з різними операціями.
48. Значення, що не змінює результат операції (`0` для суми, `+∞` для мінімуму). Його повертають вузли, які не перетинаються із запитом, і використовують як початок накопичення в ітеративному запиті.
49. `2`
50. `15`
