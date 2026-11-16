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

## Задачі для закріплення

42 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка дисципліна доступу в стека: LIFO чи FIFO? Що буде першим вилучено, якщо покласти `1, 2, 3`?

**2.** Скільки коштують операції `push`, `pop`, `peek`, `isEmpty` у стека на масиві?

**3.** Які структури даних реалізують стек викликів функцій? Що станеться при необмеженій рекурсії?

**4.** Що поверне послідовність `push(1), push(2), pop(), push(3), peek()` у стека на масиві?

```js
(() => { const s = []; s.push(1); s.push(2); s.pop(); s.push(3); return [s.at(-1), s.length, s]; })()
```

**5.** Що поверне `pop()` порожнього стека на масиві і що буде з `length`?

```js
(() => { const s = []; return [s.pop(), s.length]; })()
```

**6.** Яка помилка, якщо замість `pop` вживати `shift` для стека?

```js
(() => { const s = [1, 2, 3]; return [s.shift(), s]; })()
```

**7.** У якому порядку вилучаться елементи стека `[1, 2, 3]` послідовними `pop`?

```js
(() => { const s = [1, 2, 3], o = []; while (s.length) o.push(s.pop()); return o; })()
```

**8.** Що дасть реверс рядка через стек?

```js
(() => { const s = [...'abc'], o = []; while (s.length) o.push(s.pop()); return o.join(''); })()
```

**9.** Реалізуйте клас `Stack` з приватним полем, методами `push` (повертає `this`), `pop`, `peek`, `isEmpty`, `size`. Що дасть послідовність `push(1).push(2).push(3)` і `pop()`?

```js
class Stack {
  #items = []
  push(x) { this.#items.push(x); return this }
  pop() { return this.#items.pop() }
  peek() { return this.#items.at(-1) }
  isEmpty() { return this.#items.length === 0 }
  get size() { return this.#items.length }
}
```

**10.** Що поверне `peek()` на порожньому `Stack` із розв'язку вище?

```js
class Stack {
  #items = []
  push(x) { this.#items.push(x); return this }
  pop() { return this.#items.pop() }
  peek() { return this.#items.at(-1) }
  isEmpty() { return this.#items.length === 0 }
  get size() { return this.#items.length }
}
```

**11.** Напишіть `isBalanced(str)` — перевірка дужок `()[]{}` стеком.

```js
function isBalanced(str) {
  const pairs = { ')': '(', ']': '[', '}': '{' }, st = []
  for (const ch of str) {
    if ('([{'.includes(ch)) st.push(ch)
    else if (ch in pairs && st.pop() !== pairs[ch]) return false
  }
  return st.length === 0
}
```

### Рівень 2. Методи й поведінка

**12.** Напишіть `evalRPN(tokens)` — обчислення зворотного польського запису.

```js
function evalRPN(tokens) {
  const st = []
  for (const t of tokens) {
    if ('+-*/'.includes(t)) {
      const b = st.pop(), a = st.pop()
      st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b)
    } else st.push(Number(t))
  }
  return st[0]
}
```

**13.** Напишіть `reverseString(str)` стеком.

```js
function reverseString(str) {
  const st = [...str], out = []
  while (st.length) out.push(st.pop())
  return out.join('')
}
```

**14.** Напишіть `nextGreater(arr)` — для кожного елемента наступне більше (або `-1`) через монотонний стек.

```js
function nextGreater(arr) {
  const res = new Array(arr.length).fill(-1), st = []
  for (let i = 0; i < arr.length; i++) {
    while (st.length && arr[st.at(-1)] < arr[i]) res[st.pop()] = arr[i]
    st.push(i)
  }
  return res
}
```

**15.** Напишіть `dailyTemperatures(t)` — скільки днів чекати теплішої погоди.

```js
function dailyTemperatures(t) {
  const res = new Array(t.length).fill(0), st = []
  for (let i = 0; i < t.length; i++) {
    while (st.length && t[st.at(-1)] < t[i]) { const j = st.pop(); res[j] = i - j }
    st.push(i)
  }
  return res
}
```

**16.** Реалізуйте `MinStack` з `getMin()` за `O(1)`. Що дасть послідовність?

```js
class MinStack {
  #s = []
  #m = []
  push(x) { this.#s.push(x); this.#m.push(Math.min(x, this.#m.at(-1) ?? x)) }
  pop() { this.#m.pop(); return this.#s.pop() }
  getMin() { return this.#m.at(-1) }
}
```

**17.** Напишіть `simplifyPath(path)` — Unix-шлях через стек.

```js
function simplifyPath(path) {
  const st = []
  for (const p of path.split('/')) {
    if (p === '..') st.pop()
    else if (p && p !== '.') st.push(p)
  }
  return '/' + st.join('/')
}
```

**18.** Напишіть `removeAdjacentDuplicates(str)` стеком.

```js
function removeAdjacentDuplicates(str) {
  const st = []
  for (const ch of str) st.at(-1) === ch ? st.pop() : st.push(ch)
  return st.join('')
}
```

**19.** Напишіть `decodeString(s)` для формату `3[a2[c]]`.

```js
function decodeString(s) {
  const st = []
  let cur = '', num = 0
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') num = num * 10 + +ch
    else if (ch === '[') { st.push([cur, num]); cur = ''; num = 0 }
    else if (ch === ']') { const [prev, n] = st.pop(); cur = prev + cur.repeat(n) }
    else cur += ch
  }
  return cur
}
```

**20.** Напишіть ітеративний `dfs(graph, start)` зі стеком.

```js
function dfs(graph, start) {
  const seen = new Set(), st = [start], out = []
  while (st.length) {
    const v = st.pop()
    if (seen.has(v)) continue
    seen.add(v); out.push(v)
    for (const n of [...graph[v]].reverse()) st.push(n)
  }
  return out
}
```

**21.** Реалізуйте чергу через два стеки і покажіть порядок виймання.

```js
class QueueTwoStacks {
  #in = []
  #out = []
  enqueue(x) { this.#in.push(x) }
  dequeue() {
    if (!this.#out.length) while (this.#in.length) this.#out.push(this.#in.pop())
    return this.#out.pop()
  }
}
```

**22.** Напишіть `undoRedo` із двох стеків: `type(ch)`, `undo()`, `redo()`. Який текст після послідовності?

```js
class Editor {
  text = ''
  #undo = []
  #redo = []
  type(ch) { this.#undo.push(this.text); this.#redo.length = 0; this.text += ch }
  undo() { if (this.#undo.length) { this.#redo.push(this.text); this.text = this.#undo.pop() } }
  redo() { if (this.#redo.length) { this.#undo.push(this.text); this.text = this.#redo.pop() } }
}
```

### Рівень 3. Нюанси та пастки

**23.** Що поверне `JSON.stringify` для стека, реалізованого класом із приватним полем `#items`?

```js
class Stack {
  #items = []
  push(x) { this.#items.push(x); return this }
  pop() { return this.#items.pop() }
  peek() { return this.#items.at(-1) }
  isEmpty() { return this.#items.length === 0 }
  get size() { return this.#items.length }
}
;JSON.stringify(new Stack().push(1))
```

**24.** Який `size` у `Stack` після двох `push` і одного `pop`?

```js
class Stack {
  #items = []
  push(x) { this.#items.push(x); return this }
  pop() { return this.#items.pop() }
  peek() { return this.#items.at(-1) }
  isEmpty() { return this.#items.length === 0 }
  get size() { return this.#items.length }
}
;(() => { const s = new Stack(); s.push(1).push(2); s.pop(); return s.size; })()
```

**25.** Чи змінить зовнішній код вміст стека, якщо поле приватне (`#items`)?

```js
class Stack {
  #items = []
  push(x) { this.#items.push(x); return this }
  pop() { return this.#items.pop() }
  peek() { return this.#items.at(-1) }
  isEmpty() { return this.#items.length === 0 }
  get size() { return this.#items.length }
}
;(() => { const s = new Stack(); s.push(1); s.items = 'x'; return [s.size, s.peek()]; })()
```

**26.** Що станеться при зверненні до `#items` ззовні?

```js
(() => { try { return (0, eval)('class A { #x = 1 }; new A().#x'); } catch (e) { return e.name; } })()
```

**27.** Реалізуйте стек фіксованої ємності, який кидає помилку при переповненні.

```js
class BoundedStack {
  #s = []
  constructor(cap) { this.cap = cap }
  push(x) {
    if (this.#s.length >= this.cap) throw new Error('Stack overflow')
    this.#s.push(x)
  }
  pop() {
    if (!this.#s.length) throw new Error('Stack underflow')
    return this.#s.pop()
  }
}
```

**28.** Напишіть `sortStack(stack)` — відсортувати стек (масив) за допомогою ще одного стека.

```js
function sortStack(s) {
  const t = []
  while (s.length) {
    const x = s.pop()
    while (t.length && t.at(-1) > x) s.push(t.pop())
    t.push(x)
  }
  return t
}
```

**29.** Напишіть `maxHistogramArea(h)` — найбільший прямокутник у гістограмі монотонним стеком.

```js
function maxHistogramArea(h) {
  const st = [], a = [...h, 0]
  let best = 0
  for (let i = 0; i < a.length; i++) {
    while (st.length && a[st.at(-1)] > a[i]) {
      const height = a[st.pop()]
      const left = st.length ? st.at(-1) + 1 : 0
      best = Math.max(best, height * (i - left))
    }
    st.push(i)
  }
  return best
}
```

**30.** Напишіть `validParenthesesLongest(s)` — довжина найдовшої правильної підпослідовності дужок.

```js
function longestValid(s) {
  const st = [-1]
  let best = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') st.push(i)
    else {
      st.pop()
      if (!st.length) st.push(i)
      else best = Math.max(best, i - st.at(-1))
    }
  }
  return best
}
```

**31.** Напишіть `infixToRPN(tokens)` для `+ - * /` без дужок (алгоритм сортувальної станції).

```js
function infixToRPN(tokens) {
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 }, out = [], ops = []
  for (const t of tokens) {
    if (t in prec) {
      while (ops.length && prec[ops.at(-1)] >= prec[t]) out.push(ops.pop())
      ops.push(t)
    } else out.push(t)
  }
  return [...out, ...ops.reverse()]
}
```

**32.** Скільки кадрів на стеку викликів буде під час `fact(3)`, якщо `fact(n) = n <= 1 ? 1 : n * fact(n - 1)`?

```js
(() => { let max = 0, depth = 0; const fact = n => { depth++; max = Math.max(max, depth); const r = n <= 1 ? 1 : n * fact(n - 1); depth--; return r; }; fact(3); return max; })()
```

**33.** Яке максимальне занурення рекурсії, перш ніж виникне `RangeError`, залежить від рушія. Що перехопить `try/catch`?

```js
(() => { const f = () => f(); try { f(); } catch (e) { return [e.name, e instanceof RangeError]; } })()
```

### Рівень 4. Практика й реалізація

**34.** Перепишіть рекурсивне обчислення суми `1..n` у ітеративне зі стеком, щоб уникнути переповнення.

```js
function sumTo(n) {
  const st = []
  let total = 0
  for (let i = 1; i <= n; i++) st.push(i)
  while (st.length) total += st.pop()
  return total
}
```

**35.** Напишіть `flattenIterative(arr)` — розгладити вкладені масиви без рекурсії.

```js
function flattenIterative(arr) {
  const st = [...arr], out = []
  while (st.length) {
    const x = st.pop()
    Array.isArray(x) ? st.push(...x) : out.push(x)
  }
  return out.reverse()
}
```

**36.** Напишіть `asteroidCollision(arr)` — зіткнення астероїдів (додатні вправо, від'ємні вліво) стеком.

```js
function asteroidCollision(arr) {
  const st = []
  for (const a of arr) {
    let alive = true
    while (alive && a < 0 && st.length && st.at(-1) > 0) {
      if (st.at(-1) < -a) st.pop()
      else { if (st.at(-1) === -a) st.pop(); alive = false }
    }
    if (alive) st.push(a)
  }
  return st
}
```

**37.** Напишіть `backspaceCompare(a, b)` — порівняйте рядки, де `#` — backspace.

```js
const build = s => { const st = []; for (const ch of s) ch === '#' ? st.pop() : st.push(ch); return st.join('') }
const backspaceCompare = (a, b) => build(a) === build(b)
```

**38.** Напишіть `stockSpan(prices)` — для кожного дня кількість послідовних попередніх днів із ціною не вищою.

```js
function stockSpan(p) {
  const res = [], st = []
  for (let i = 0; i < p.length; i++) {
    while (st.length && p[st.at(-1)] <= p[i]) st.pop()
    res.push(st.length ? i - st.at(-1) : i + 1)
    st.push(i)
  }
  return res
}
```

**39.** Напишіть `isValidSerialization(preorder)` для дерева в рядку preorder зі `#` для null.

```js
function isValidSerialization(s) {
  let slots = 1
  for (const t of s.split(',')) {
    if (--slots < 0) return false
    if (t !== '#') slots += 2
  }
  return slots === 0
}
```

**40.** Напишіть `minRemoveToMakeValid(s)` — мінімальне видалення дужок, щоб рядок став правильним.

```js
function minRemoveToMakeValid(s) {
  const a = [...s], st = []
  a.forEach((c, i) => {
    if (c === '(') st.push(i)
    else if (c === ')') st.length ? st.pop() : (a[i] = '')
  })
  st.forEach(i => (a[i] = ''))
  return a.join('')
}
```

**41.** Напишіть `calculate(expr)` для `+ - ( )` й цілих без пробілів, через стек.

```js
function calculate(s) {
  const st = []
  let num = 0, sign = 1, res = 0
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') num = num * 10 + +ch
    else if (ch === '+' || ch === '-') { res += sign * num; num = 0; sign = ch === '+' ? 1 : -1 }
    else if (ch === '(') { st.push(res, sign); res = 0; sign = 1 }
    else if (ch === ')') { res += sign * num; num = 0; res = st.pop() * res + st.pop() }
  }
  return res + sign * num
}
```

**42.** Напишіть `largestRectangleStackIndices(h)` — індекси лівої та правої межі кожного стовпчика (де зліва/справа менший) монотонним стеком. Для `[2,1,5]` поверніть `[left, right]`.

```js
function bounds(h) {
  const L = [], R = new Array(h.length).fill(h.length), st = []
  for (let i = 0; i < h.length; i++) {
    while (st.length && h[st.at(-1)] >= h[i]) R[st.pop()] = i
    L[i] = st.length ? st.at(-1) : -1
    st.push(i)
  }
  return [L, R]
}
```

### Відповіді

1. LIFO — «останнім прийшов, першим пішов»; першим вилучається `3`.
2. Усі `O(1)` (амортизовано для `push`).
3. Стек викликів — кадри функцій на стеку; необмежена рекурсія завершується `RangeError: Maximum call stack size exceeded`.
4. `[3, 2, [1, 3]]`
5. `[undefined, 0]`
6. `[1, [2, 3]]`
7. `[3, 2, 1]`
8. `'cba'`
9. Виклик `(() => { const s = new Stack(); s.push(1).push(2).push(3); return [s.pop(), s.peek(), s.size, s.isEmpty()]; })()` → `[3, 2, 2, false]`
10. Виклик `new Stack().peek()` → `undefined`
11. Виклик `['([]{})', '([)]', '((', ''].map(isBalanced)` → `[true, false, false, true]`
12. Виклик `[evalRPN(['2', '1', '+', '3', '*']), evalRPN(['4', '13', '5', '/', '+'])]` → `[9, 6.6]`
13. Виклик `reverseString('hello')` → `'olleh'`
14. Виклик `nextGreater([2, 1, 5, 3, 4])` → `[5, 5, -1, 4, -1]`
15. Виклик `dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73])` → `[1, 1, 4, 2, 1, 1, 0, 0]`
16. Виклик `(() => { const s = new MinStack(); s.push(3); s.push(1); s.push(2); const a = s.getMin(); s.pop(); s.pop(); return [a, s.getMin()]; })()` → `[1, 3]`
17. Виклик `[simplifyPath('/a/./b/../../c/'), simplifyPath('/../')]` → `['/c', '/']`
18. Виклик `[removeAdjacentDuplicates('abbaca'), removeAdjacentDuplicates('azxxzy')]` → `['ca', 'ay']`
19. Виклик `[decodeString('3[a2[c]]'), decodeString('2[ab]c')]` → `['accaccacc', 'ababc']`
20. Виклик `dfs({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] }, 'a')` → `['a', 'b', 'd', 'c']`
21. Виклик `(() => { const q = new QueueTwoStacks(); q.enqueue(1); q.enqueue(2); const a = q.dequeue(); q.enqueue(3); return [a, q.dequeue(), q.dequeue(), q.dequeue()]; })()` → `[1, 2, 3, undefined]`
22. Виклик `(() => { const e = new Editor(); e.type('a'); e.type('b'); e.type('c'); e.undo(); e.undo(); const x = e.text; e.redo(); const y = e.text; e.type('z'); e.redo(); return [x, y, e.text]; })()` → `['a', 'ab', 'abz']`
23. `'{}'`
24. `1`
25. `[1, 1]`
26. `'SyntaxError'`
27. Виклик `(() => { const s = new BoundedStack(2); s.push(1); s.push(2); const r = []; try { s.push(3); } catch (e) { r.push(e.message); } s.pop(); s.pop(); try { s.pop(); } catch (e) { r.push(e.message); } return r; })()` → `['Stack overflow', 'Stack underflow']`
28. Виклик `sortStack([3, 1, 4, 2])` → `[1, 2, 3, 4]`
29. Виклик `[maxHistogramArea([2, 1, 5, 6, 2, 3]), maxHistogramArea([2, 4])]` → `[10, 4]`
30. Виклик `[longestValid('(()'), longestValid(')()())'), longestValid('')]` → `[2, 4, 0]`
31. Виклик `infixToRPN(['3', '+', '4', '*', '2', '-', '1'])` → `['3', '4', '2', '*', '+', '1', '-']`
32. `3`
33. `['RangeError', true]`
34. Виклик `sumTo(100000)` → `5000050000`
35. Виклик `flattenIterative([1, [2, [3, [4]], 5]])` → `[1, 2, 3, 4, 5]`
36. Виклик `[asteroidCollision([5, 10, -5]), asteroidCollision([8, -8]), asteroidCollision([-2, -1, 1, 2])]` → `[[5, 10], [], [-2, -1, 1, 2]]`
37. Виклик `[backspaceCompare('ab#c', 'ad#c'), backspaceCompare('a#c', 'b')]` → `[true, false]`
38. Виклик `stockSpan([100, 80, 60, 70, 60, 75, 85])` → `[1, 1, 1, 2, 1, 4, 6]`
39. Виклик `[isValidSerialization('9,3,4,#,#,1,#,#,2,#,6,#,#'), isValidSerialization('1,#'), isValidSerialization('9,#,#,1')]` → `[true, false, false]`
40. Виклик `[minRemoveToMakeValid('a)b(c)d'), minRemoveToMakeValid('))(('), minRemoveToMakeValid('(a(b)c')]` → `['ab(c)d', '', 'a(b)c']`
41. Виклик `[calculate('1+(2-3)'), calculate('10-(2+3)'), calculate('2-(5-6)')]` → `[0, 5, 3]`
42. Виклик `bounds([2, 1, 5])` → `[[-1, -1, 1], [1, 3, 3]]`
