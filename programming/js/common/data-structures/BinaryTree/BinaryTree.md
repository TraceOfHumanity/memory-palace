# BinaryTree — бінарне дерево пошуку (BST)

> Дерево — головна **нелінійна** структура. Якщо LinkedList — це «ланцюжок», то дерево — це «розгалуження»: кожен вузол має до двох дітей. Бінарне дерево **пошуку** дає пошук, вставку й видалення за **O(log n)** — набагато швидше, ніж у списку чи неупорядкованому масиві.

Додатково: [BinaryTree-AVL.md](BinaryTree-AVL.md) — як дерево захищається від «виродження» (самобалансівне AVL).

## 1. Що таке дерево

- **Вузол (node)** — значення + посилання на дітей.
- **Корінь (root)** — єдиний вузол без батька.
- **Лист (leaf)** — вузол без дітей.
- **Висота** — довжина найдовшого шляху від кореня до листка.
- **Піддерево** — вузол разом з усіма нащадками.

```
          47            ← корінь (root), глибина 0
        ┌──┴──┐
       21     76        ← глибина 1
      ┌─┴─┐  ┌─┴─┐
     18  27 52  82      ← листки, глибина 2
```

У **бінарному** дереві в кожного вузла **не більше двох** дітей: `left` і `right`.

### Властивість BST (ключ усього)

Для **кожного** вузла: усе в лівому піддереві **менше** за нього, усе в правому — **більше**.

```
для вузла 47:   {18, 21, 27} < 47 < {52, 76, 82}
для вузла 21:   {18}         < 21 < {27}
```

Завдяки цьому на кожному кроці **відкидаємо половину** можливих значень — як у бінарному пошуку.

## 2. Вузол і дерево

```ts
class TreeNode<T> {
  value: T;
  left: TreeNode<T> | null = null;
  right: TreeNode<T> | null = null;
}
```

Дерево зберігає лише `root` (та за бажанням `size`).

## 3. Твоя реалізація (`algorithms/src/algorithms/TS/binaryTree.ts`)

```ts
class BinaryTreeNode {
    value: number;
    left: BinaryTreeNode | null;
    right: BinaryTreeNode | null;

    constructor(value: number) {
        this.value = value;
        this.left = null;
        this.right = null;
    }
}

class BinaryTree {
    root: BinaryTreeNode | null;

    constructor() {
        this.root = null;
    }

    insert(value: number) {
        const newNode = new BinaryTreeNode(value);
        if (this.root === null) {
            this.root = newNode;
            return this;
        }
        let temp = this.root;
        while (true) {
            if (newNode.value === temp.value) return undefined;
            if (newNode.value < temp.value) {
                if (temp.left === null) {
                    temp.left = newNode;
                    return this;
                }
                temp = temp.left;
            }
            if (newNode.value > temp.value) {
                if (temp.right === null) {
                    temp.right = newNode;
                    return this;
                }
                temp = temp.right;
            }
        }
        return this;
    }

    contains(value: number) {
        if (this.root === null) return false;
        let temp = this.root;
        while (temp) {
            if (value < temp.value) {
                temp = temp.left!;
            } else if (value > temp.value) {
                temp = temp.right!;
            } else {
                return true;
            }
        }
        return false;
    }

    recursiveContains(value: number, currentNode = this.root) {
        if (currentNode === null) return false;
        if (currentNode.value === value) return true;
        if (value < currentNode.value) {
            return this.recursiveContains(value, currentNode.left);
        } else {
            return this.recursiveContains(value, currentNode.right);
        }
    }

    recursiveInsert(value: number, currentNode = this.root) {
        if (this.root === null) return new BinaryTreeNode(value);
        if (currentNode === null) return new BinaryTreeNode(value);


        if (value < currentNode.value) {
            currentNode.left = this.recursiveInsert(value, currentNode.left);
        } else {
            currentNode.right = this.recursiveInsert(value, currentNode.right);
        }
        return currentNode;
    }

    minValue(currentNode: BinaryTreeNode) {
        while (currentNode.left !== null) {
            currentNode = currentNode.left;
        }
        return currentNode.value;
    }

    deleteNode(value: number, currentNode = this.root) {
        if (currentNode === null) return null;

        if (value < currentNode.value) {
            currentNode.left = this.deleteNode(value, currentNode.left);
        } else if (value > currentNode.value) {
            currentNode.right = this.deleteNode(value, currentNode.right);
        } else {
            if (currentNode.left === null && currentNode.right === null) {
                return null;
            } else if (currentNode.left === null) {
                return currentNode.right;
            } else if (currentNode.right === null) {
                return currentNode.left;
            } else {
                let subTreeMinValue = this.minValue(currentNode.right);
                currentNode.value = subTreeMinValue;
                currentNode.right = this.deleteNode(subTreeMinValue, currentNode.right);
            }
        }
        return currentNode;
    }

    BFS() {
        let currentNode = this.root;
        if (currentNode === null) return [];
        let results: number[] = [];
        let queue: BinaryTreeNode[] = [];
        queue.push(currentNode);
        while (queue.length) {
            currentNode = queue.shift()!;
            results.push(currentNode.value);
            if (currentNode.left) queue.push(currentNode.left);
            if (currentNode.right) queue.push(currentNode.right);
        }
        return results;
    }

    DFSPreOrder() {
        let results: number[] = [];
        function traverse(currentNode: BinaryTreeNode) {
            results.push(currentNode.value);
            if (currentNode.left) traverse(currentNode.left);
            if (currentNode.right) traverse(currentNode.right);
        }
        if (!this.root) return [];
        traverse(this.root);
        return results;
    }

    DFSPostOrder() {
        let results: number[] = [];
        function traverse(currentNode: BinaryTreeNode) {
            if (currentNode.left) traverse(currentNode.left);
            if (currentNode.right) traverse(currentNode.right);
            results.push(currentNode.value);
        }
        if (!this.root) return [];
        traverse(this.root);
        return results;
    }

    DFSInOrder() {
        let results: number[] = [];
        function traverse(currentNode: BinaryTreeNode) {
            if (currentNode.left) traverse(currentNode.left);
            results.push(currentNode.value);
            if (currentNode.right) traverse(currentNode.right);
        }
        if (!this.root) return [];
        traverse(this.root);
        return results;
    }
}
```

### Що добре
- правильна модель BST; ітеративні `insert` і `contains` та рекурсивні версії — це корисно для навчання;
- `deleteNode` покриває **три випадки** (листок, одна дитина, дві дитини) — заміна значенням найменшого з правого піддерева (наступник) — класичний підхід;
- реалізовані **BFS** та три обходи в глибину (pre/in/post-order);
- `insert` не допускає дублікатів.

### Що виправити (усе підтверджено запуском)

1. **`recursiveInsert` на порожньому дереві не встановлює корінь.** Метод повертає новий вузол, але `this.root` лишається `null`. Результат викликається, але ніхто не присвоює його в `root`.
2. **`deleteNode` не присвоює результат у `this.root`.** Коли видаляється корінь з **0 або 1 дитиною**, потрібно **замінити** корінь. Перевірено: у дереві з єдиним вузлом `5` після `deleteNode(5)` `root` досі `5`. (Для кореня з двома дітьми працює лише тому, що значення переписується на місці.)
3. **Дублікати поводяться по-різному:** ітеративний `insert` їх відхиляє, а `recursiveInsert` кладе праворуч (`else`). Один контракт має діяти скрізь.
4. **Крихкий цикл у `insert`:** після `temp = temp.left` у тому ж проході виконується ще й `if (newNode.value > temp.value)` — вже для **нового** `temp`. Працює випадково. Потрібне `else`/`else if`. Після `while (true)` стоїть недосяжний `return this`.
5. **`BFS` використовує `queue.shift()`** — O(n) на кожне зняття, тому весь обхід стає O(n²). Використовуй індекс голови (див. [Queue](../Queue/Queue.md)).
6. **Тип лише `number`**; порожнє дерево в обходах повертає `[]` у кожному методі окремо, нема `min`/`max`/`height`/`size`.
7. **API рекурсивних методів** з параметром `currentNode = this.root` «протікає» внутрішню реалізацію назовні.

## 4. Виправлена реалізація

```ts
class TreeNode<T> {
  value: T;
  left: TreeNode<T> | null = null;
  right: TreeNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

// Бінарне дерево пошуку (BST): для кожного вузла все зліва < вузол < все справа
class BST {
  root: TreeNode<number> | null = null;
  size = 0;

  // O(h): h — висота дерева (у збалансованому log n, у виродженому n)
  insert(value: number): boolean {
    const node = new TreeNode(value);
    if (this.root === null) {
      this.root = node;
      this.size++;
      return true;
    }
    let cur = this.root;
    for (;;) {
      if (value === cur.value) return false; // дублікати не додаємо
      if (value < cur.value) {
        if (cur.left === null) {
          cur.left = node;
          break;
        }
        cur = cur.left;
      } else {
        if (cur.right === null) {
          cur.right = node;
          break;
        }
        cur = cur.right;
      }
    }
    this.size++;
    return true;
  }

  contains(value: number): boolean {
    let cur = this.root;
    while (cur !== null) {
      if (value === cur.value) return true;
      cur = value < cur.value ? cur.left : cur.right;
    }
    return false;
  }

  // рекурсивна версія: підсторінка «вставити в піддерево і повернути його новий корінь»
  insertRec(value: number): void {
    const go = (node: TreeNode<number> | null): TreeNode<number> => {
      if (node === null) {
        this.size++;
        return new TreeNode(value);
      }
      if (value < node.value) node.left = go(node.left);
      else if (value > node.value) node.right = go(node.right);
      return node;
    };
    this.root = go(this.root); // ← обов'язково присвоїти корінь!
  }

  min(node = this.root): number | undefined {
    if (node === null) return undefined;
    while (node.left !== null) node = node.left;
    return node.value;
  }
  max(node = this.root): number | undefined {
    if (node === null) return undefined;
    while (node.right !== null) node = node.right;
    return node.value;
  }

  height(node = this.root): number {
    return node === null ? 0 : 1 + Math.max(this.height(node.left), this.height(node.right));
  }

  // видалення: три випадки
  delete(value: number): boolean {
    let removed = false;
    const go = (node: TreeNode<number> | null, v: number): TreeNode<number> | null => {
      if (node === null) return null;
      if (v < node.value) node.left = go(node.left, v);
      else if (v > node.value) node.right = go(node.right, v);
      else {
        removed = true;
        if (node.left === null) return node.right; // 0 або 1 дитина (правa)
        if (node.right === null) return node.left; // 1 дитина (ліва)
        // 2 дитини: заміняємо значенням найменшого з правого піддерева (наступник)
        const succ = this.min(node.right)!;
        node.value = succ;
        node.right = go(node.right, succ);
      }
      return node;
    };
    this.root = go(this.root, value); // ← присвоїти корінь: інакше видалення кореня «не спрацює»
    if (removed) this.size--;
    return removed;
  }

  // обхід вшир (BFS): рівень за рівнем; черга з індексом — без O(n) shift
  bfs(): number[] {
    const out: number[] = [];
    if (!this.root) return out;
    const queue: TreeNode<number>[] = [this.root];
    for (let head = 0; head < queue.length; head++) {
      const n = queue[head];
      out.push(n.value);
      if (n.left) queue.push(n.left);
      if (n.right) queue.push(n.right);
    }
    return out;
  }

  // обходи вглиб (DFS) — рекурсивно
  preOrder(): number[] {
    const out: number[] = [];
    const go = (n: TreeNode<number> | null) => {
      if (!n) return;
      out.push(n.value);
      go(n.left);
      go(n.right);
    };
    go(this.root);
    return out;
  }
  inOrder(): number[] {
    const out: number[] = [];
    const go = (n: TreeNode<number> | null) => {
      if (!n) return;
      go(n.left);
      out.push(n.value);
      go(n.right);
    };
    go(this.root);
    return out; // для BST — відсортований порядок
  }
  postOrder(): number[] {
    const out: number[] = [];
    const go = (n: TreeNode<number> | null) => {
      if (!n) return;
      go(n.left);
      go(n.right);
      out.push(n.value);
    };
    go(this.root);
    return out;
  }

  // in-order без рекурсії: явний стек (не переповнить стек викликів)
  inOrderIterative(): number[] {
    const out: number[] = [];
    const stack: TreeNode<number>[] = [];
    let cur = this.root;
    while (cur !== null || stack.length) {
      while (cur !== null) {
        stack.push(cur);
        cur = cur.left;
      }
      cur = stack.pop()!;
      out.push(cur.value);
      cur = cur.right;
    }
    return out;
  }

  // перевірка, що дерево справді є BST: кожен вузол в межах (lo, hi)
  isValid(node = this.root, lo = -Infinity, hi = Infinity): boolean {
    if (node === null) return true;
    if (node.value <= lo || node.value >= hi) return false;
    return this.isValid(node.left, lo, node.value) && this.isValid(node.right, node.value, hi);
  }
}
```


## 5. Як це працює

### `insert` / `contains`: спуск по дереву

```
вставляємо 25 у дерево 47 / 21 / 76 / 18 / 27 …

47:  25 < 47 → ліворуч
21:  25 > 21 → праворуч
27:  25 < 27 → ліворуч → там null → новий вузол тут

            47
          ┌──┴──┐
         21     76
        ┌─┴─┐
       18  27
          ┌┘
         25  ← новий листок
```

Кожен крок відкидає півдерева → **O(h)**, де h — висота. У збалансованому дереві `h ≈ log₂ n` (мільйон елементів → ~20 кроків).

### Рекурсивна вставка: «повернути новий корінь піддерева»

Важливий шаблон: функція `go(node)` **повертає корінь піддерева** після змін, а викликач **присвоює** результат у відповідне поле:

```
node.left = go(node.left)
```

Ось чому `root = go(root)` обов'язково присвоюється — це і є виправлення багів 1 і 2.

### `delete`: три випадки

```
1) Листок: просто прибрати (повернути null).

2) Одна дитина: замінити вузол його дитиною (повернути дитину).

3) Дві дитини: знайти НАСТУПНИКА — найменше значення в правому піддереві;
   записати його значення в поточний вузол; видалити наступника з правого піддерева.
```

Приклад видалення 76 (дві дитини: 52 і 82). Наступник — мінімум правого піддерева, тобто 82:

```
        47                      47                      47
      ┌──┴──┐                 ┌──┴──┐                 ┌──┴──┐
     21     76               21     82               21     82
    ┌─┴─┐  ┌─┴─┐     ──▶    ┌─┴─┐  ┌─┴─┐     ──▶    ┌─┴─┐  ┌┘
   18  27 52  82            18  27 52  82           18  27 52
                           (76 стало 82)         (старий листок 82 видалено)
```

Чому саме **наступник**? Він **найменший з тих, що більші** за видалений, тому, опинившись на його місці, не порушує властивості BST: усе ліворуч менше, усе праворуч більше.

### Обходи дерева

| Обхід | Порядок | Що дає |
|---|---|---|
| **in-order** | ліве → вузол → праве | для BST — **відсортований** список |
| **pre-order** | вузол → ліве → праве | «копіювання» дерева, серіалізація |
| **post-order** | ліве → праве → вузол | видалення дерева, обчислення знизу вгору |
| **BFS** (вшир) | рівень за рівнем | найкоротші шляхи, рівні |

Для дерева `47 / 21 / 76 / 18 / 27 / 52 / 82` (перевірено запуском):

```
BFS:        47, 21, 76, 18, 27, 52, 82
pre-order:  47, 21, 18, 27, 76, 52, 82
in-order:   18, 21, 27, 47, 52, 76, 82   ← відсортовано
post-order: 18, 27, 21, 52, 82, 76, 47
```

**BFS** використовує **чергу**; **DFS** — **стек** (явний або стек викликів рекурсії). Ітеративний in-order зі стеком не переповнює стек викликів на дуже глибоких деревах.

## 6. Проблема: виродження в список

Якщо вставляти відсортовані значення `1, 2, 3, …, n`, кожен новий вузол іде **праворуч**:

```
1
 └─2
    └─3
       └─4        висота = n  →  пошук O(n), як у списку
```

Перевірено: після вставки 1…100 висота BST дорівнює **100**. Рішення — **самобалансівні** дерева (AVL, червоно-чорне): вони перебудовуються при вставці. Див. [BinaryTree-AVL.md](BinaryTree-AVL.md).

## 7. Складність

| Операція | Збалансоване | Вироджене |
|---|---|---|
| `insert`, `contains`, `delete` | **O(log n)** | O(n) |
| `min`, `max` | O(log n) | O(n) |
| обходи (BFS, DFS) | O(n) | O(n) |
| пам'ять | O(n) | O(n) |
| стек рекурсії | O(log n) | O(n) |

## 8. Типові помилки

1. Не присвоїти результат рекурсії (`root = go(root)`).
2. Видалення кореня без оновлення `root`.
3. Порушити BST при видаленні (замінити не наступником/попередником).
4. `if … if` замість `if … else if` у циклі спуску.
5. Не продумати **дублікати** (відхиляти, рахувати лічильник або класти в одну сторону — але послідовно).
6. `queue.shift()` у BFS.
7. Перевіряти BST лише порівнянням із батьком — треба передавати **межі** `(lo, hi)` (`isValid`).
8. Глибока рекурсія на виродженому дереві → переповнення стека.
9. Вставляти відсортовані дані в простий BST.

## 9. Алгоритм

1. **Пошук/вставка:** порівняй зі значенням вузла → ліворуч або праворуч → повторюй до `null`.
2. **Видалення:** листок → прибрати; одна дитина → замінити дитиною; дві → наступник.
3. **Рекурсія:** `node.left = go(node.left)` — функція повертає корінь піддерева.
4. **Відсортований вивід** → in-order.
5. **По рівнях** → BFS з чергою.
6. **Боїшся виродження** → самобалансівне дерево або хеш-таблиця.

## Задачі для закріплення

31 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яку властивість має бінарне дерево пошуку (BST)?

**2.** Яка складність пошуку, вставки й видалення в збалансованому та в виродженому BST?

**3.** Чим відрізняються обходи preorder, inorder, postorder?

**4.** Чим BFS-обхід (по рівнях) відрізняється від DFS і яку структуру використовує?

**5.** Коли вузол видаляється з BST, які три випадки розглядають?

**6.** Реалізуйте `BST` із `insert`, `has`, `inorder`. Що дасть вставка `5, 3, 8, 1, 4, 9` і перевірки?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
```

**7.** Які порядки обходів дає дерево з вставки `5, 3, 8, 1, 4, 9`?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
```

**8.** Яка висота дерева зі вставки `1, 2, 3, 4, 5` і зі вставки `3, 1, 5, 2, 4`?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
```

### Рівень 2. Методи й поведінка

**9.** Що поверне `min` і `max` для порожнього дерева і для `[5, 3, 8]`?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
```

**10.** Напишіть `size(node)` — кількість вузлів.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const size = n => (n ? 1 + size(n.l) + size(n.r) : 0)
```

**11.** Напишіть `leaves(root)` — значення листків.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const leaves = n => (!n ? [] : !n.l && !n.r ? [n.v] : [...leaves(n.l), ...leaves(n.r)])
```

**12.** Напишіть `levelOrder(root)` — BFS по рівнях.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function levelOrder(root) {
  const out = []; if (!root) return out
  let level = [root]
  while (level.length) { out.push(level.map(n => n.v)); level = level.flatMap(n => [n.l, n.r].filter(Boolean)) }
  return out
}
```

**13.** Напишіть `isValidBST(root)`.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function isValidBST(n, lo = -Infinity, hi = Infinity) {
  if (!n) return true
  return n.v > lo && n.v < hi && isValidBST(n.l, lo, n.v) && isValidBST(n.r, n.v, hi)
}
```

**14.** Напишіть `lca(root, p, q)` — найближчий спільний предок у BST.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function lca(root, p, q) {
  let c = root
  while (c) { if (p < c.v && q < c.v) c = c.l; else if (p > c.v && q > c.v) c = c.r; else return c.v }
}
```

**15.** Напишіть `remove(root, v)` — видалення з BST. Результат inorder після видалення `3` із `[5, 3, 8, 1, 4, 9]` і `5`?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function remove(n, v) {
  if (!n) return null
  if (v < n.v) n.l = remove(n.l, v)
  else if (v > n.v) n.r = remove(n.r, v)
  else {
    if (!n.l) return n.r
    if (!n.r) return n.l
    let m = n.r; while (m.l) m = m.l
    n.v = m.v; n.r = remove(n.r, m.v)
  }
  return n
}
```

**16.** Напишіть `kthSmallest(root, k)`.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const kthSmallest = (root, k) => { const t = new BST(); t.root = root; return t.inorder()[k - 1] }
```

### Рівень 3. Нюанси та пастки

**17.** Напишіть `floor(root, x)` — найбільше значення, що не перевищує `x`.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function floor(root, x) {
  let c = root, best = null
  while (c) { if (c.v === x) return x; if (c.v < x) { best = c.v; c = c.r } else c = c.l }
  return best
}
```

**18.** Напишіть `sortedArrayToBST(arr)` — збалансоване дерево зі відсортованого масиву. Висота для 7 елементів?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function sortedArrayToBST(a) {
  if (!a.length) return null
  const m = a.length >> 1, n = new TreeNode(a[m])
  n.l = sortedArrayToBST(a.slice(0, m)); n.r = sortedArrayToBST(a.slice(m + 1))
  return n
}
```

**19.** Напишіть `maxDepth(root)` і `minDepth(root)`.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const maxDepth = n => (n ? 1 + Math.max(maxDepth(n.l), maxDepth(n.r)) : 0)
const minDepth = n => (!n ? 0 : !n.l ? 1 + minDepth(n.r) : !n.r ? 1 + minDepth(n.l) : 1 + Math.min(minDepth(n.l), minDepth(n.r)))
```

**20.** Напишіть `isSymmetric(root)` для бінарного дерева.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const mirror = (a, b) => (!a && !b) || (a && b && a.v === b.v && mirror(a.l, b.r) && mirror(a.r, b.l))
const isSymmetric = r => !r || mirror(r.l, r.r)
```

**21.** Напишіть `pathSum(root, target)` — чи є шлях від кореня до листка із сумою.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const pathSum = (n, t) => (!n ? false : !n.l && !n.r ? n.v === t : pathSum(n.l, t - n.v) || pathSum(n.r, t - n.v))
```

**22.** Напишіть `invert(root)` — дзеркальне відображення дерева.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function invert(n) { if (!n) return null; [n.l, n.r] = [invert(n.r), invert(n.l)]; return n }
```

**23.** Напишіть `rightSideView(root)` — що видно справа (останній вузол кожного рівня).

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function rightSideView(root) {
  const out = []; let level = root ? [root] : []
  while (level.length) { out.push(level.at(-1).v); level = level.flatMap(n => [n.l, n.r].filter(Boolean)) }
  return out
}
```

**24.** Напишіть `serialize(root)` і `deserialize(str)` для preorder зі `#` на місці null. Що дасть `serialize` для дерева `[5, 3, 8]`?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const serialize = n => (n ? `${n.v},${serialize(n.l)},${serialize(n.r)}` : '#')
function deserialize(s) {
  const t = s.split(','); let i = 0
  const go = () => { const x = t[i++]; if (x === '#') return null; const n = new TreeNode(+x); n.l = go(); n.r = go(); return n }
  return go()
}
```

### Рівень 4. Практика й реалізація

**25.** Напишіть `diameter(root)` — найдовший шлях між двома вузлами (у ребрах).

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function diameter(root) {
  let best = 0
  const h = n => { if (!n) return 0; const l = h(n.l), r = h(n.r); best = Math.max(best, l + r); return 1 + Math.max(l, r) }
  h(root)
  return best
}
```

**26.** Напишіть `buildFromTraversals(pre, ino)` — дерево з preorder та inorder. Postorder результату для `pre=[3,9,20,15,7]`, `in=[9,3,15,20,7]`?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function build(pre, ino) {
  if (!pre.length) return null
  const v = pre[0], i = ino.indexOf(v), n = new TreeNode(v)
  n.l = build(pre.slice(1, 1 + i), ino.slice(0, i)); n.r = build(pre.slice(1 + i), ino.slice(i + 1))
  return n
}
```

**27.** Напишіть ітеративний `inorderIterative(root)` через стек.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function inorderIterative(root) {
  const out = [], st = []; let c = root
  while (c || st.length) { while (c) { st.push(c); c = c.l } c = st.pop(); out.push(c.v); c = c.r }
  return out
}
```

**28.** Напишіть `countNodesInRange(root, lo, hi)` для BST.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const countRange = (n, lo, hi) => (!n ? 0 : (n.v >= lo && n.v <= hi ? 1 : 0) + (n.v > lo ? countRange(n.l, lo, hi) : 0) + (n.v < hi ? countRange(n.r, lo, hi) : 0))
```

**29.** Напишіть `isBalanced(root)` — різниця висот піддерев не більша за 1 для кожного вузла.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function isBalanced(root) {
  const h = n => { if (!n) return 0; const l = h(n.l), r = h(n.r); return l < 0 || r < 0 || Math.abs(l - r) > 1 ? -1 : 1 + Math.max(l, r) }
  return h(root) >= 0
}
```

**30.** Напишіть `treeToSortedList(root)` — зв'язати inorder-значення в масив пар `[v, next]`. Для `[2, 1, 3]` результат?

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
const treeToSortedList = r => { const a = new BST(); a.root = r; return a.inorder().map((v, i, arr) => [v, arr[i + 1] ?? null]) }
```

**31.** Напишіть `zigzagLevelOrder(root)`.

```js
class TreeNode { constructor(v) { this.v = v; this.l = null; this.r = null } }
class BST {
  root = null
  insert(v) {
    const n = new TreeNode(v)
    if (!this.root) { this.root = n; return this }
    let c = this.root
    for (;;) {
      if (v < c.v) { if (!c.l) { c.l = n; break } c = c.l }
      else { if (!c.r) { c.r = n; break } c = c.r }
    }
    return this
  }
  has(v) { let c = this.root; while (c) { if (v === c.v) return true; c = v < c.v ? c.l : c.r } return false }
  inorder(n = this.root, o = []) { if (n) { this.inorder(n.l, o); o.push(n.v); this.inorder(n.r, o) } return o }
  preorder(n = this.root, o = []) { if (n) { o.push(n.v); this.preorder(n.l, o); this.preorder(n.r, o) } return o }
  postorder(n = this.root, o = []) { if (n) { this.postorder(n.l, o); this.postorder(n.r, o); o.push(n.v) } return o }
  height(n = this.root) { return n ? 1 + Math.max(this.height(n.l), this.height(n.r)) : 0 }
  min() { let c = this.root; while (c?.l) c = c.l; return c?.v }
  max() { let c = this.root; while (c?.r) c = c.r; return c?.v }
}
const fromArr = a => a.reduce((t, v) => t.insert(v), new BST())
function zigzag(root) {
  const out = []; let level = root ? [root] : [], rev = false
  while (level.length) { const vals = level.map(n => n.v); out.push(rev ? vals.reverse() : vals); rev = !rev; level = level.flatMap(n => [n.l, n.r].filter(Boolean)) }
  return out
}
```

### Відповіді

1. Для кожного вузла всі значення в лівому піддереві менші, а в правому — більші (чи рівні, залежно від правила дублікатів).
2. Збалансоване: `O(log n)`; вироджене (відсортований ввід): `O(n)`, дерево перетворюється на список.
3. Preorder: корінь → ліве → праве; inorder: ліве → корінь → праве (для BST дає відсортований порядок); postorder: ліве → праве → корінь.
4. BFS відвідує вузли рівень за рівнем і використовує чергу; DFS (pre/in/post) іде вглиб, використовуючи рекурсію або стек.
5. Листок — просто видалити; один нащадок — замінити вузол нащадком; два нащадки — замінити значенням inorder-наступника (мінімум правого піддерева) і видалити його.
6. Виклик `(() => { const t = fromArr([5, 3, 8, 1, 4, 9]); return [t.inorder(), t.has(4), t.has(7)]; })()` → `[[1, 3, 4, 5, 8, 9], true, false]`
7. Виклик `(() => { const t = fromArr([5, 3, 8, 1, 4, 9]); return [t.preorder(), t.inorder(), t.postorder()]; })()` → `[[5, 3, 1, 4, 8, 9], [1, 3, 4, 5, 8, 9], [1, 4, 3, 9, 8, 5]]`
8. Виклик `[fromArr([1, 2, 3, 4, 5]).height(), fromArr([3, 1, 5, 2, 4]).height()]` → `[5, 3]`
9. Виклик `[new BST().min(), fromArr([5, 3, 8]).min(), fromArr([5, 3, 8]).max()]` → `[undefined, 3, 8]`
10. Виклик `size(fromArr([5, 3, 8, 1, 4, 9]).root)` → `6`
11. Виклик `leaves(fromArr([5, 3, 8, 1, 4, 9]).root)` → `[1, 4, 9]`
12. Виклик `levelOrder(fromArr([5, 3, 8, 1, 4, 9]).root)` → `[[5], [3, 8], [1, 4, 9]]`
13. Виклик `(() => { const t = fromArr([5, 3, 8]); const bad = fromArr([5, 3, 8]); bad.root.l.r = new TreeNode(7); return [isValidBST(t.root), isValidBST(bad.root)]; })()` → `[true, false]`
14. Виклик `(() => { const r = fromArr([6, 2, 8, 0, 4, 7, 9, 3, 5]).root; return [lca(r, 2, 8), lca(r, 2, 4), lca(r, 3, 5)]; })()` → `[6, 2, 4]`
15. Виклик `(() => { const t = fromArr([5, 3, 8, 1, 4, 9]); t.root = remove(t.root, 3); const a = t.inorder(); t.root = remove(t.root, 5); return [a, t.inorder(), t.root.v]; })()` → `[[1, 4, 5, 8, 9], [1, 4, 8, 9], 8]`
16. Виклик `kthSmallest(fromArr([5, 3, 8, 1, 4, 9]).root, 3)` → `4`
17. Виклик `[floor(fromArr([5, 3, 8, 1, 4, 9]).root, 6), floor(fromArr([5, 3, 8]).root, 2)]` → `[5, null]`
18. Виклик `(() => { const t = new BST(); t.root = sortedArrayToBST([1, 2, 3, 4, 5, 6, 7]); return [t.height(), t.inorder(), t.preorder()]; })()` → `[3, [1, 2, 3, 4, 5, 6, 7], [4, 2, 1, 3, 6, 5, 7]]`
19. Виклик `(() => { const r = fromArr([5, 3, 8, 1]).root; return [maxDepth(r), minDepth(r)]; })()` → `[3, 2]`
20. Виклик `(() => { const n = (v, l = null, r = null) => Object.assign(new TreeNode(v), { l, r }); return [isSymmetric(n(1, n(2, n(3), n(4)), n(2, n(4), n(3)))), isSymmetric(n(1, n(2, null, n(3)), n(2, null, n(3))))]; })()` → `[true, null]`
21. Виклик `[pathSum(fromArr([5, 3, 8, 1, 4, 9]).root, 9), pathSum(fromArr([5, 3, 8, 1, 4, 9]).root, 10)]` → `[true, false]`
22. Виклик `(() => { const t = fromArr([5, 3, 8, 1, 4, 9]); t.root = invert(t.root); return t.inorder(); })()` → `[9, 8, 5, 4, 3, 1]`
23. Виклик `rightSideView(fromArr([5, 3, 8, 1, 4, 9]).root)` → `[5, 8, 9]`
24. Виклик `(() => { const s = serialize(fromArr([5, 3, 8]).root); return [s, serialize(deserialize(s)) === s]; })()` → `['5,3,#,#,8,#,#', true]`
25. Виклик `[diameter(fromArr([5, 3, 8, 1, 4, 9]).root), diameter(fromArr([1, 2, 3, 4]).root)]` → `[4, 3]`
26. Виклик `(() => { const t = new BST(); t.root = build([3, 9, 20, 15, 7], [9, 3, 15, 20, 7]); return t.postorder(); })()` → `[9, 15, 7, 20, 3]`
27. Виклик `inorderIterative(fromArr([5, 3, 8, 1, 4, 9]).root)` → `[1, 3, 4, 5, 8, 9]`
28. Виклик `countRange(fromArr([5, 3, 8, 1, 4, 9]).root, 3, 8)` → `4`
29. Виклик `[isBalanced(fromArr([5, 3, 8, 1, 4, 9]).root), isBalanced(fromArr([1, 2, 3]).root)]` → `[true, false]`
30. Виклик `treeToSortedList(fromArr([2, 1, 3]).root)` → `[[1, 2], [2, 3], [3, null]]`
31. Виклик `zigzag(fromArr([5, 3, 8, 1, 4, 7, 9]).root)` → `[[5], [8, 3], [1, 4, 7, 9]]`
