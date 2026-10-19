# Stack — стек: «останнім прийшов — першим пішов» (LIFO)

> Стек — найпростіша і найкорисніша структура після масиву. У JS окремого класу немає: роль стека виконує масив із `push`/`pop`. Але **розуміти**, як він працює, — база для рекурсії, алгоритмів, парсерів і багів «stack overflow».

## 1. Ідея

Уяви стопку тарілок. Класти можна лише **на верх**, брати теж лише **з верху**. Остання покладена — перша взята. Це **LIFO** (Last In, First Out).

```
        push(3)             pop() → 3
  ┌───┐             ┌───┐ ←top
  │ 3 │ ←top        │ 2 │
  ├───┤             ├───┤
  │ 2 │             │ 1 │
  ├───┤             └───┘
  │ 1 │
  └───┘
```

Операції (всі **O(1)**):

| Операція | Що робить |
|---|---|
| `push(x)` | покласти на верх |
| `pop()` | забрати з верху й повернути |
| `peek()` | подивитись на верх, не забираючи |
| `isEmpty()` / `length` | порожній? / розмір |

### Де стеки живуть насправді

- **Стек викликів (call stack)** — кожен виклик функції кладе «кадр» на стек; `return` знімає. Нескінченна рекурсія → `RangeError: Maximum call stack size exceeded` = переповнення стека.
- **Undo/Redo** в редакторах — два стеки.
- **Історія браузера** (кнопка «назад»).
- **Перевірка дужок**, розбір виразів, калькулятори (зворотний польський запис).
- **Обхід в глибину (DFS)** — стек замінює рекурсію.
- **Відкат** (backtracking) у задачах перебору.

## 2. Твоя реалізація (`algorithms/src/algorithms/TS/stack.ts`)

```ts
class StackNode {
  value: number;
  next: StackNode | null;

  constructor(value: number) {
    this.value = value;
    this.next = null;
  }
}

class Stack {
  top: StackNode | null;
  length: number;

  constructor(value: number) {
    const newNode = new StackNode(value);
    this.top = newNode;
    this.length = 1;
  }

  push(value: number) {
    const newNode = new StackNode(value);
    if (this.length === 0) {
      this.top = newNode;
    } else {
      newNode.next = this.top;
      this.top = newNode;
    }
    this.length++;
    return this;
  }

  pop() {
    if (this.length === 0) return undefined;
    const temp = this.top;
    this.top = this.top!.next;
    temp!.next = null;
    this.length--;
    return temp;
  }
}
```

### Що добре
- вузол зі `value` і `next`, вершина `top` — стек на зв'язному списку, правильна ідея: `push` і `pop` працюють з **головою** списку за O(1);
- `pop` відчіплює вузол (`temp.next = null`);
- `pop` на порожньому стеку повертає `undefined` (не падає).

### Що виправити

1. **Конструктор вимагає значення** — порожній стек створити не можна (`new Stack(4)`). Гілка `length === 0` у `push` досяжна лише після `pop`. Краще порожній старт: `new Stack()`.
2. **`pop` повертає вузол**, а не значення. Користувач отримує `StackNode` із внутрішнім `next`; перевірено: `new Stack(1).pop()` дає `{value:1, next:null}`. Зручніше віддавати `value`.
3. **Немає `peek()` і `isEmpty()`** — без `peek` не можна подивитися на верх, не знімаючи.
4. **Лише `number`** → узагальнити `Stack<T>`.
5. **Немає ітерації** для відлагодження та тестів.
6. Дрібниця: гілка `if (this.length === 0) … else { newNode.next = this.top; this.top = newNode }` дублює себе — `newNode.next = this.top` працює й для порожнього (`top = null`).

## 3. Виправлена реалізація (варіант 1: стек на зв'язному списку)

```ts
class StackNode<T> {
  value: T;
  next: StackNode<T> | null;
  constructor(value: T, next: StackNode<T> | null = null) {
    this.value = value;
    this.next = next;
  }
}

class Stack<T> implements Iterable<T> {
  private top: StackNode<T> | null = null;
  private size = 0;

  get length(): number {
    return this.size;
  }

  isEmpty(): boolean {
    return this.top === null;
  }

  // O(1): новий вузол стає вершиною і вказує на стару вершину
  push(value: T): this {
    this.top = new StackNode(value, this.top);
    this.size++;
    return this;
  }

  // O(1): забираємо вершину
  pop(): T | undefined {
    if (this.top === null) return undefined;
    const node = this.top;
    this.top = node.next;
    node.next = null;
    this.size--;
    return node.value;
  }

  // O(1): подивитись на вершину, не видаляючи
  peek(): T | undefined {
    return this.top?.value;
  }

  // ітерація від вершини до дна
  *[Symbol.iterator](): Iterator<T> {
    for (let n = this.top; n; n = n.next) yield n.value;
  }
}
```


**Чому `push`/`pop` у голові списку, а не в хвості?** Додавання й видалення з голови в однозв'язному списку — O(1); з хвоста `pop` був би O(n) (див. [LinkedList](../LinkedList/LinkedList.md)).

### Як це працює

```
push(3) на стеку 2 → 1:
  новий вузол [3]; [3].next = top ([2]); top = [3]
  top → [3] → [2] → [1] → ∅

pop():
  node = top ([3]); top = node.next ([2]); node.next = null
  top → [2] → [1] → ∅        повертаємо 3
```

Порядок знову такий: спершу підключити новий до старої вершини, і лише потім перенести `top`.

## 4. Варіант 2: стек на масиві

```ts
class ArrayStack<T> {
  private items: T[] = [];

  get length(): number {
    return this.items.length;
  }
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  push(value: T): this {
    this.items.push(value); // O(1) амортизовано
    return this;
  }
  pop(): T | undefined {
    return this.items.pop(); // O(1)
  }
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
}
```


Найпростіший і, як правило, **найшвидший у JS**: суцільна пам'ять, `push`/`pop` — O(1) амортизовано. Для більшості задач це правильний вибір. Стек на списку виправданий, коли потрібні гарантовані O(1) без перерозподілів пам'яті або ти вчишся.

## 5. Варіант 3: стек фіксованої ємності

```ts
class BoundedIntStack {
  private data: Int32Array;
  private top = 0; // індекс наступної вільної клітинки
  constructor(capacity: number) {
    this.data = new Int32Array(capacity);
  }
  push(value: number): void {
    if (this.top === this.data.length) throw new RangeError('stack overflow');
    this.data[this.top++] = value;
  }
  pop(): number {
    if (this.top === 0) throw new RangeError('stack underflow');
    return this.data[--this.top];
  }
  peek(): number | undefined {
    return this.top === 0 ? undefined : this.data[this.top - 1];
  }
  get length(): number {
    return this.top;
  }
}
```


- `top` — індекс **наступної вільної** клітинки (він же — кількість елементів);
- push: `data[top++] = x`, pop: `return data[--top]`;
- переповнення (overflow) і порожній стек (underflow) — явні помилки;
- жодних алокацій після створення — так стек працює в низькорівневих мовах і в процесорі.

## 6. Варіант 4: MinStack — мінімум за O(1)

Класична задача: стек, що **додатково** вміє повертати мінімум за O(1).

```ts
class MinStack {
  private values: number[] = [];
  private mins: number[] = []; // mins[i] = мінімум серед values[0..i]

  push(x: number): void {
    this.values.push(x);
    this.mins.push(this.mins.length === 0 ? x : Math.min(x, this.mins[this.mins.length - 1]));
  }
  pop(): number | undefined {
    this.mins.pop();
    return this.values.pop();
  }
  peek(): number | undefined {
    return this.values[this.values.length - 1];
  }
  min(): number | undefined {
    return this.mins[this.mins.length - 1];
  }
}
```


**Ідея:** паралельний стек `mins`, де `mins[i]` — мінімум серед `values[0..i]`. Кожен `push` додає і значення, і поточний мінімум; `pop` знімає з обох. Мінімум — завжди верх `mins`.

```
push 5,3,7,3:   values: 5 3 7 3
                mins:   5 3 3 3     min() = 3
pop → 3:        values: 5 3 7
                mins:   5 3 3       min() = 3
pop → 7, pop → 3:  mins: 5          min() = 5
```

## 7. Застосування (протестовані приклади)

```ts
// 1) збалансовані дужки
function isBalanced(s: string): boolean {
  const pairs: Record<string, string> = {')': '(', ']': '[', '}': '{'};
  const stack: string[] = [];
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (ch in pairs) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}

// 2) зворотний польський запис (RPN): "3 4 + 2 *" = 14
function evalRPN(tokens: string[]): number {
  const st: number[] = [];
  for (const t of tokens) {
    if (['+', '-', '*', '/'].includes(t)) {
      const b = st.pop()!;
      const a = st.pop()!;
      st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b);
    } else st.push(Number(t));
  }
  return st.pop()!;
}

// 3) undo / redo: два стеки
class History<T> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];
  constructor(private current: T) {}
  get state(): T {
    return this.current;
  }
  do(next: T): void {
    this.undoStack.push(this.current);
    this.current = next;
    this.redoStack.length = 0; // нова дія скасовує «майбутнє»
  }
  undo(): void {
    if (!this.undoStack.length) return;
    this.redoStack.push(this.current);
    this.current = this.undoStack.pop()!;
  }
  redo(): void {
    if (!this.redoStack.length) return;
    this.undoStack.push(this.current);
    this.current = this.redoStack.pop()!;
  }
}
```


### Перевірка дужок — як це працює

```
"{[()]}"
{  push {        stack: {
[  push [        stack: { [
(  push (        stack: { [ (
)  pop → (  ✓    stack: { [
]  pop → [  ✓    stack: {
}  pop → {  ✓    stack: (порожньо) → збалансовано
```

Помилки: закриваюча без відкриваючої (`)` → `pop` повертає `undefined`) або залишок у стеку наприкінці.

### Зворотний польський запис (RPN)

`3 4 + 2 *` = `(3 + 4) × 2`. Числа — у стек; оператор бере **два верхні**, обчислює, кладе результат назад. Порядок аргументів важливий: перший `pop` — **правий** операнд.

### Undo / Redo — два стеки

- `undoStack` — минулі стани, `redoStack` — «скасовані»;
- нова дія **очищає** `redoStack` (майбутнє зникає).

## 8. Складність

| Операція | Список | Масив | Фіксований |
|---|---|---|---|
| push | O(1) | O(1)* | O(1) |
| pop | O(1) | O(1) | O(1) |
| peek | O(1) | O(1) | O(1) |
| пам'ять | + вказівник на вузол | компактно | фіксована |

\* амортизовано (рідкісне розширення масиву).

## 9. Типові помилки

1. `pop` на порожньому стеку без перевірки — отримуєш `undefined` і тихий баг далі.
2. Плутати **peek** (дивитись) і **pop** (забирати).
3. Переплутати порядок операндів при `pop` двох значень (для `-` і `/` це критично).
4. Рекурсія без базового випадку → переповнення стека викликів.
5. Забути, що `Array.shift/unshift` — це **не** стек (це черга/початок масиву, O(n)).
6. Після `pop` у стеку на списку не відчепити `next` — «протікання» зв'язків.
7. Забути очистити redo при новій дії.

## 10. Алгоритм: коли бачиш стек

1. Потрібен **відкат** або «повернутись до попереднього»? → стек.
2. Дані мають оброблятись у **зворотному** порядку? → стек.
3. Вкладені структури (дужки, теги, вирази)? → стек.
4. Обхід у глибину без рекурсії? → явний стек.
5. Реалізація: масив (за замовчуванням) → список (для навчання або гарантій) → фіксований (для вбудованих систем).
