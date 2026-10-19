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
