# BinaryTree — AVL: дерево, що саме себе балансує

Продовження [BinaryTree.md](BinaryTree.md). Звичайний BST виродиться в список на відсортованих даних (1, 2, 3… → висота n). **AVL-дерево** (за іменами Адельсон-Вельський і Ландіс, 1962) після кожної вставки перевіряє баланс і за потреби **обертає** вузли, щоб висота завжди лишалась **O(log n)**.

## 1. Баланс-фактор

Для кожного вузла: `balance = висота(ліве) − висота(праве)`. У AVL він завжди **−1, 0 або +1**. Якщо після вставки стало **±2** — дерево треба перебудувати.

```
        10   balance = 0 − 2 = −2  ← перекіс вправо
          \
           20
             \
              30
```

## 2. Обертання — перестановка зв'язків без втрати порядку

Обертання змінює форму дерева, але **зберігає властивість BST** (in-order порядок не змінюється).

### Праве обертання (rotateRight) — лікує перекіс ВЛІВО

```
      y                x
     / \              / \
    x   C    ──▶     A   y
   / \                  / \
  A   B                B   C
```

Піддерево `B` (між x та y за значенням) переїжджає від `x.right` до `y.left`. Новий корінь піддерева — `x`.

### Ліве обертання (rotateLeft) — дзеркальне, лікує перекіс ВПРАВО

### Чотири випадки

| Випадок | Перекіс | Лікування |
|---|---|---|
| Ліво-ліво (LL) | вставили в ліве піддерево лівої дитини | rotateRight(вузол) |
| Право-право (RR) | у праве піддерево правої дитини | rotateLeft(вузол) |
| Ліво-право (LR) | у праве піддерево лівої дитини | rotateLeft(ліва дитина), потім rotateRight(вузол) |
| Право-ліво (RL) | у ліве піддерево правої дитини | rotateRight(права дитина), потім rotateLeft(вузол) |

Приклад RR: вставляємо 10, 20, 30 (відсортовано):

```
10                        20
  \                      /  \
   20      ──ліве──▶   10    30
     \
      30
```

Висота стала 2 замість 3. Приклад LR: вставляємо 30, 10, 20 → перша дитина зліва, а її дитина справа → подвійне обертання, кореневим стає 20 (перевірено тестом).

## 3. Реалізація

```ts
class AVLNode {
  left: AVLNode | null = null;
  right: AVLNode | null = null;
  height = 1;
  constructor(public value: number) {}
}

const h = (n: AVLNode | null) => (n ? n.height : 0);
const upd = (n: AVLNode) => {
  n.height = 1 + Math.max(h(n.left), h(n.right));
};
const balanceFactor = (n: AVLNode) => h(n.left) - h(n.right);

function rotateRight(y: AVLNode): AVLNode {
  const x = y.left!;
  y.left = x.right; // піддерево між x і y переїжджає до y
  x.right = y;
  upd(y);
  upd(x);
  return x; // x — новий корінь цього піддерева
}
function rotateLeft(x: AVLNode): AVLNode {
  const y = x.right!;
  x.right = y.left;
  y.left = x;
  upd(x);
  upd(y);
  return y;
}

function rebalance(n: AVLNode): AVLNode {
  upd(n);
  const bf = balanceFactor(n);
  if (bf > 1) {
    if (balanceFactor(n.left!) < 0) n.left = rotateLeft(n.left!); // випадок «ліво-право»
    return rotateRight(n); // «ліво-ліво»
  }
  if (bf < -1) {
    if (balanceFactor(n.right!) > 0) n.right = rotateRight(n.right!); // «право-ліво»
    return rotateLeft(n); // «право-право»
  }
  return n;
}

class AVLTree {
  root: AVLNode | null = null;

  insert(value: number): void {
    const go = (n: AVLNode | null): AVLNode => {
      if (n === null) return new AVLNode(value);
      if (value < n.value) n.left = go(n.left);
      else if (value > n.value) n.right = go(n.right);
      else return n;
      return rebalance(n); // після вставки перебудовуємо шлях знизу вгору
    };
    this.root = go(this.root);
  }

  height(): number {
    return h(this.root);
  }
  inOrder(): number[] {
    const out: number[] = [];
    const go = (n: AVLNode | null) => {
      if (!n) return;
      go(n.left);
      out.push(n.value);
      go(n.right);
    };
    go(this.root);
    return out;
  }
}
```


**Ключова ідея:** вставка рекурсивна; після спуску вниз, **повертаючись угору**, кожен вузол оновлює свою висоту і викликає `rebalance`. Тож перебудова відбувається на шляху назад — і лише на шляху вставки (O(log n) вузлів).

**Тест (виконано):** вставка 1…100 в AVL дає висоту ≤ 8, а в простий BST — 100. In-order усе одно відсортований.

## 4. Складність

| Операція | AVL | Простий BST |
|---|---|---|
| `insert` | O(log n) гарантовано | O(n) у гіршому |
| пошук | O(log n) гарантовано | O(n) у гіршому |
| висота | ≤ ~1.44 · log₂ n | до n |

Ціна: зберігання висоти у вузлі та до двох обертань на вставку. Видалення в AVL теж потребує перебалансування (складніше, тут не наведено).

## 5. AVL чи червоно-чорне дерево?

- **AVL** — суворіше збалансоване → швидший **пошук**, повільніша вставка/видалення (більше обертань);
- **Червоно-чорне** — слабший баланс → швидші **зміни**; саме його використовують у стандартних бібліотеках (`std::map` C++, `TreeMap` Java);
- У JS обидва зазвичай не потрібні: `Map` (хеш-таблиця) чи відсортований масив покривають більшість задач. Ці дерева — для **впорядкованих** операцій (діапазони, мінімум/максимум, наступний більший).

## 6. Типові помилки

1. Забути оновити висоту після обертання (спершу нижній вузол, потім верхній).
2. Переплутати напрямок обертання (перекіс вліво → **праве** обертання).
3. Не обробити подвійні випадки LR/RL.
4. Не повернути новий корінь піддерева з обертання й не присвоїти його батькові.
5. Рахувати висоту `null` як 1 (має бути 0) — баланс-фактор «зсувається».

## 7. Алгоритм

1. Вставка як у BST (рекурсивно).
2. Повертаючись угору: `висота = 1 + max(ліва, права)`.
3. `balance = ліва − права`.
4. `> 1`: якщо ліва дитина «нахилена вправо» — спочатку лівий поворот на ній; потім правий поворот на вузлі.
5. `< −1`: дзеркально.
6. Повернути (можливо новий) корінь піддерева.

## Задачі для закріплення

18 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що таке баланс-фактор вузла в AVL-дереві і які значення дозволені?

**2.** Які чотири випадки порушення балансу і які обертання їх виправляють?

**3.** Яка гарантована висота AVL-дерева з `n` вузлів?

**4.** Чим AVL відрізняється від червоно-чорного дерева за суворістю балансування?

**5.** Реалізуйте вставку в AVL. Preorder-обхід після вставки `10, 20, 30` (RR-випадок)?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

### Рівень 2. Методи й поведінка

**6.** Preorder після вставки `30, 20, 10` (LL)?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**7.** Preorder після вставки `30, 10, 20` (LR)?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**8.** Preorder після вставки `10, 30, 20` (RL)?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**9.** Яка висота AVL після вставки `1..7` і яка була б у звичайного BST?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**10.** Що дасть `bf` кореня після вставки `2, 1`?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

### Рівень 3. Нюанси та пастки

**11.** Напишіть `isAVL(root)`.

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
function isAVL(n) {
  if (!n) return true
  const hh = x => (x ? 1 + Math.max(hh(x.l), hh(x.r)) : 0)
  return Math.abs(hh(n.l) - hh(n.r)) <= 1 && isAVL(n.l) && isAVL(n.r)
}
```

**12.** Скільки обертань відбудеться при вставці `1..7` у AVL?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
let rot = 0
const rotR = y => { rot++; const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { rot++; const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**13.** Напишіть `minNodes(h)` — мінімальна кількість вузлів в AVL заввишки `h` (`N(h) = N(h-1) + N(h-2) + 1`).

```js
const minNodes = h => (h <= 0 ? 0 : h === 1 ? 1 : minNodes(h - 1) + minNodes(h - 2) + 1)
```

**14.** Яка висота у дерева після вставки `50, 25, 75, 10, 30, 60, 80, 5, 15, 27`?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**15.** Inorder після вставок у AVL завжди відсортований. Перевірте для `[5, 2, 8, 1, 9, 3]`.

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
const ino = (n, o = []) => { if (n) { ino(n.l, o); o.push(n.v); ino(n.r, o) } return o }
```

### Рівень 4. Практика й реалізація

**16.** Що дасть правий поворот кореня `y` із лівим нащадком `x`: preorder до і після для `y=3, x=2, z=1`?

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
```

**17.** Напишіть `rangeCount(root, lo, hi)` для AVL.

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
const rangeCount = (n, lo, hi) => (!n ? 0 : (n.v >= lo && n.v <= hi ? 1 : 0) + (n.v > lo ? rangeCount(n.l, lo, hi) : 0) + (n.v < hi ? rangeCount(n.r, lo, hi) : 0))
```

**18.** Напишіть `toBalancedBST(sorted)` і порівняйте висоту з висотою AVL після послідовної вставки відсортованого масиву з 15 елементів.

```js
class N { constructor(v) { this.v = v; this.l = null; this.r = null; this.h = 1 } }
const h = n => (n ? n.h : 0)
const upd = n => { n.h = 1 + Math.max(h(n.l), h(n.r)) }
const bf = n => (n ? h(n.l) - h(n.r) : 0)
const rotR = y => { const x = y.l; y.l = x.r; x.r = y; upd(y); upd(x); return x }
const rotL = x => { const y = x.r; x.r = y.l; y.l = x; upd(x); upd(y); return y }
function insert(n, v) {
  if (!n) return new N(v)
  if (v < n.v) n.l = insert(n.l, v); else n.r = insert(n.r, v)
  upd(n)
  const b = bf(n)
  if (b > 1 && v < n.l.v) return rotR(n)
  if (b < -1 && v > n.r.v) return rotL(n)
  if (b > 1) { n.l = rotL(n.l); return rotR(n) }
  if (b < -1) { n.r = rotR(n.r); return rotL(n) }
  return n
}
const pre = (n, o = []) => { if (n) { o.push(n.v); pre(n.l, o); pre(n.r, o) } return o }
const build = a => a.reduce((r, v) => insert(r, v), null)
const hh = n => (n ? 1 + Math.max(hh(n.l), hh(n.r)) : 0)
const bal = a => { if (!a.length) return null; const m = a.length >> 1, n = new N(a[m]); n.l = bal(a.slice(0, m)); n.r = bal(a.slice(m + 1)); return n }
```

### Відповіді

1. `bf = height(left) - height(right)`; для кожного вузла допустимі лише `-1`, `0`, `1`.
2. LL — правий поворот; RR — лівий поворот; LR — лівий поворот лівого нащадка, потім правий; RL — правий поворот правого нащадка, потім лівий.
3. `O(log n)` (не більше ≈ 1.44·log₂ n), тому пошук, вставка й видалення — `O(log n)`.
4. AVL балансується суворіше (швидший пошук, більше обертань при вставці/видаленні); червоно-чорне — м'якше (менше обертань, трохи вища висота).
5. Виклик `pre(build([10, 20, 30]))` → `[20, 10, 30]`
6. Виклик `pre(build([30, 20, 10]))` → `[20, 10, 30]`
7. Виклик `pre(build([30, 10, 20]))` → `[20, 10, 30]`
8. Виклик `pre(build([10, 30, 20]))` → `[20, 10, 30]`
9. Виклик `[h(build([1, 2, 3, 4, 5, 6, 7])), 7]` → `[3, 7]`
10. Виклик `bf(build([2, 1]))` → `1`
11. Виклик `[isAVL(build([1, 2, 3, 4, 5, 6])), (() => { const t = new N(1); t.r = new N(2); t.r.r = new N(3); return isAVL(t); })()]` → `[true, false]`
12. Виклик `(() => { rot = 0; build([1, 2, 3, 4, 5, 6, 7]); return rot; })()` → `4`
13. Виклик `[1, 2, 3, 4, 5, 6].map(minNodes)` → `[1, 2, 4, 7, 12, 20]`
14. Виклик `h(build([50, 25, 75, 10, 30, 60, 80, 5, 15, 27]))` → `4`
15. Виклик `ino(build([5, 2, 8, 1, 9, 3]))` → `[1, 2, 3, 5, 8, 9]`
16. Виклик `(() => { const y = new N(3); y.l = new N(2); y.l.l = new N(1); const before = pre(y); const r = rotR(y); return [before, pre(r)]; })()` → `[[3, 2, 1], [2, 1, 3]]`
17. Виклик `rangeCount(build([5, 2, 8, 1, 9, 3, 7]), 3, 8)` → `4`
18. Виклик `(() => { const a = Array.from({ length: 15 }, (_, i) => i + 1); return [hh(bal(a)), h(build(a))]; })()` → `[4, 4]`
