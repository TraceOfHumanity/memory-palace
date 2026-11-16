# Queue — черга: «першим прийшов — першим пішов» (FIFO)

> Черга — дзеркало стека. Як у магазині: хто став першим, того й обслужать першим. У JS окремого класу немає, і **наївна черга на масиві з `shift()` — повільна** (O(n)). Тому правильна реалізація — теж тема для вивчення.

## 1. Ідея

```
  дістаємо (dequeue)                      додаємо (enqueue)
        ▼                                        ▼
     ┌───┬───┬───┬───┐
 ◀── │ 1 │ 2 │ 3 │ 4 │ ◀──
     └───┴───┴───┴───┘
     first             last
```

Додаємо в **кінець** (`last`), забираємо з **початку** (`first`). **FIFO** (First In, First Out).

| Операція | Що робить | Складність |
|---|---|---|
| `enqueue(x)` | додати в кінець | O(1) |
| `dequeue()` | забрати з початку | O(1) |
| `peek()` | подивитись на перший | O(1) |
| `length`, `isEmpty()` | розмір | O(1) |

### Де черги живуть насправді

- **Event loop** JS: черги макро- і мікрозавдань (`setTimeout`, `Promise`);
- **BFS** — обхід графа/дерева вшир;
- принтер, планувальник задач, буфер повідомлень (RabbitMQ, Kafka — це черги у великому масштабі);
- **Rate limiting**, потокова обробка, ігрові ходи;
- кешування (FIFO-кеш), керування запитами.

## 2. Твоя реалізація (`algorithms/src/algorithms/TS/queue.ts`)

```ts
class QueueNode {
  value: number;
  next: QueueNode | null;

  constructor(value: number) {
    this.value = value;
    this.next = null;
  }
}

class Queue {
  first: QueueNode | null;
  last: QueueNode | null;
  length: number;

  constructor(value: number) {
    const newNode = new QueueNode(value);
    this.first = newNode;
    this.last = newNode;
    this.length = 1;
  }

  enqueue(value: number) {
    const newNode = new QueueNode(value);
    if (this.length === 0) {
      this.first = newNode;
      this.last = newNode;
    } else {
      this.last!.next = newNode;
      this.last = newNode;
    }
    this.length++;
    return this;
  }

  dequeue() {
    if (this.length === 0) return undefined;
    const temp = this.first;
    if (this.length === 1) {
      this.first = null;
      this.last = null;
    } else {
      this.first = this.first!.next;
    }
    this.length--;
    return temp;
  }
}
```

### Що добре
- правильна модель: `first`, `last`, `length`; черга на списку — і `enqueue`, і `dequeue` — O(1);
- окремі гілки для порожньої черги та черги з одного елемента;
- `dequeue` на порожній — `undefined`.

### Що виправити

1. **Конструктор вимагає значення** (як і в Stack/LinkedList): порожню чергу створити неможливо.
2. **`dequeue` не відчіплює вузол.** Перевірено: після `enqueue(2)` результат `dequeue()` — це `{value:1, next:{value:2,…}}`: видалений вузол досі тримає посилання на всю чергу. Треба `node.next = null`.
3. **`dequeue` повертає вузол**, а не значення — внутрішній вузол «витікає» назовні.
4. Немає `peek`, `isEmpty`, ітерації; тип лише `number`.
5. Гілку `length === 0` у `dequeue` можна спростити: після `first = first.next` достатньо перевірити `first === null`.

## 3. Виправлена реалізація (варіант 1: черга на зв'язному списку)

```ts
class QNode<T> {
  value: T;
  next: QNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

class Queue<T> implements Iterable<T> {
  private first: QNode<T> | null = null;
  private last: QNode<T> | null = null;
  private size = 0;

  get length(): number {
    return this.size;
  }
  isEmpty(): boolean {
    return this.size === 0;
  }

  // O(1): додати в кінець
  enqueue(value: T): this {
    const node = new QNode(value);
    if (this.last === null) this.first = node;
    else this.last.next = node;
    this.last = node;
    this.size++;
    return this;
  }

  // O(1): забрати з початку
  dequeue(): T | undefined {
    if (this.first === null) return undefined;
    const node = this.first;
    this.first = node.next;
    if (this.first === null) this.last = null;
    node.next = null;
    this.size--;
    return node.value;
  }

  peek(): T | undefined {
    return this.first?.value;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let n = this.first; n; n = n.next) yield n.value;
  }
}
```


Порядок присвоєнь у `enqueue`: **спершу** `last.next = node`, **потім** `last = node`. У `dequeue`: після зсуву `first`, якщо черга спорожніла, обов'язково `last = null`.

```
enqueue(4):                     dequeue():
first → [1] → [2] → [3]         node = first ([1])
                 last           first = node.next → [2]
[3].next = [4]; last = [4]      node.next = null     повертаємо 1
first → [1] → [2] → [3] → [4]   first → [2] → [3] → [4]
                         last
```

## 4. Чому не `Array.shift()`?

`arr.shift()` забирає перший елемент, а **усі решта зсуваються** на одну позицію — це O(n). Для черги з мільйоном елементів і мільйоном `shift` — це 10¹² операцій. V8 вміє оптимізувати shift для невеликих масивів, але розраховувати на це не можна.

```js
// ✗ повільно на великих даних
while (queue.length) { const x = queue.shift(); … }

// ✓ індекс голови: нічого не зсуваємо
for (let head = 0; head < queue.length; head++) { const x = queue[head]; … }
```

## 5. Варіант 2: черга на масиві з індексом голови

```ts
class ArrayQueue<T> {
  private items: (T | undefined)[] = [];
  private head = 0;

  get length(): number {
    return this.items.length - this.head;
  }
  enqueue(value: T): this {
    this.items.push(value);
    return this;
  }
  dequeue(): T | undefined {
    if (this.head === this.items.length) return undefined;
    const value = this.items[this.head];
    this.items[this.head] = undefined; // дозволити збирачу сміття прибрати значення
    this.head++;
    // коли «мертвих» клітинок стало більше половини — стискаємо масив (амортизовано O(1))
    if (this.head > 32 && this.head * 2 >= this.items.length) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }
    return value;
  }
  peek(): T | undefined {
    return this.items[this.head];
  }
}
```


- `head` — індекс першого живого елемента; `dequeue` просто збільшує його (O(1));
- «мертві» клітинки занулюємо, щоб збирач сміття звільнив значення;
- коли мертвих більше половини, масив стискається — **амортизована** складність залишається O(1);
- це найпрактичніший варіант для JS.

## 6. Варіант 3: кільцева черга (circular buffer) фіксованої ємності

```ts
class RingQueue<T> {
  private buf: (T | undefined)[];
  private head = 0; // індекс першого елемента
  private size = 0;
  constructor(private capacity: number) {
    this.buf = new Array(capacity);
  }
  get length(): number {
    return this.size;
  }
  isFull(): boolean {
    return this.size === this.capacity;
  }
  enqueue(value: T): boolean {
    if (this.isFull()) return false;
    this.buf[(this.head + this.size) % this.capacity] = value;
    this.size++;
    return true;
  }
  dequeue(): T | undefined {
    if (this.size === 0) return undefined;
    const value = this.buf[this.head];
    this.buf[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this.size--;
    return value;
  }
  peek(): T | undefined {
    return this.size === 0 ? undefined : this.buf[this.head];
  }
}
```


Ідея: масив фіксованого розміру, який «зациклюється». `head` — перший елемент, наступний вільний слот — `(head + size) % capacity`.

```
capacity = 5            enqueue/dequeue «крутять» голову по колу

індекс:   0   1   2   3   4
         [ ] [B] [C] [D] [ ]       head = 1, size = 3
enqueue(E): слот (1+3)%5 = 4        → [ ][B][C][D][E]
enqueue(F): слот (1+4)%5 = 0        → [F][B][C][D][E]  (повна: size = 5)
dequeue():  читаємо [1] = B, head = 2
```

Плюси: **жодних алокацій** після створення, швидко, передбачувана пам'ять. Використовують у буферах аудіо/відео, мережі, логах. Мінус: ємність фіксована (або треба вміти рости).

## 7. Варіант 4: черга з двох стеків

```ts
class TwoStackQueue<T> {
  private inbox: T[] = [];
  private outbox: T[] = [];
  get length(): number {
    return this.inbox.length + this.outbox.length;
  }
  enqueue(value: T): void {
    this.inbox.push(value);
  }
  private shift(): void {
    if (this.outbox.length === 0) while (this.inbox.length) this.outbox.push(this.inbox.pop()!);
  }
  dequeue(): T | undefined {
    this.shift();
    return this.outbox.pop();
  }
  peek(): T | undefined {
    this.shift();
    return this.outbox[this.outbox.length - 1];
  }
}
```


**Ідея:** `inbox` приймає нові елементи (`push`), `outbox` віддає (`pop`). Коли `outbox` порожній — **переливаємо** весь `inbox` в нього: порядок розвертається, і найстаріший опиняється зверху.

```
enqueue 1,2,3:   inbox: 1 2 3 (верх — 3)     outbox: (порожній)
dequeue():       outbox порожній → переливаємо:
                 inbox: (порожній)           outbox: 3 2 1 (верх — 1)
                 pop outbox → 1
enqueue 4:       inbox: 4                    outbox: 3 2
dequeue():       pop outbox → 2
```

Кожен елемент переливається **один раз**, тому `dequeue` — амортизовано O(1). Класична співбесідна задача («реалізуй чергу двома стеками»).

## 8. Дек (Deque) — двостороння черга

Додавати й забирати можна з **обох** кінців: `pushFront`, `pushBack`, `popFront`, `popBack`. Це стек + черга в одному.

```ts
class Deque<T> {
  private buf: (T | undefined)[] = new Array(4);
  private head = 0;
  private size = 0;
  get length(): number {
    return this.size;
  }
  private grow(): void {
    const bigger = new Array(this.buf.length * 2);
    for (let i = 0; i < this.size; i++) bigger[i] = this.buf[(this.head + i) % this.buf.length];
    this.buf = bigger;
    this.head = 0;
  }
  pushBack(v: T): void {
    if (this.size === this.buf.length) this.grow();
    this.buf[(this.head + this.size) % this.buf.length] = v;
    this.size++;
  }
  pushFront(v: T): void {
    if (this.size === this.buf.length) this.grow();
    this.head = (this.head - 1 + this.buf.length) % this.buf.length;
    this.buf[this.head] = v;
    this.size++;
  }
  popFront(): T | undefined {
    if (this.size === 0) return undefined;
    const v = this.buf[this.head];
    this.buf[this.head] = undefined;
    this.head = (this.head + 1) % this.buf.length;
    this.size--;
    return v;
  }
  popBack(): T | undefined {
    if (this.size === 0) return undefined;
    const i = (this.head + this.size - 1) % this.buf.length;
    const v = this.buf[i];
    this.buf[i] = undefined;
    this.size--;
    return v;
  }
}
```


Дек на кільцевому буфері, що **росте вдвічі** при переповненні (як динамічний масив). Альтернатива — двозв'язний список зі сторожами (див. [LinkedList-variants](../LinkedList/LinkedList-variants.md)). Застосування: ковзне вікно (sliding window), палiндроми, алгоритм 0-1 BFS.

## 9. Складність

| Операція | Список | Масив + head | Кільцева | Два стеки |
|---|---|---|---|---|
| enqueue | O(1) | O(1)* | O(1) | O(1) |
| dequeue | O(1) | O(1)* | O(1) | O(1)* |
| peek | O(1) | O(1) | O(1) | O(1)* |
| `Array.shift` | — | **O(n)** | — | — |

\* амортизовано.

## 10. Типові помилки

1. **`shift()` у циклі** по великому масиву — квадратична складність.
2. Не відчіпити `next` у `dequeue` — «протікання» зв'язків.
3. Не обнулити `last`, коли черга спорожніла — наступний `enqueue` пише у вже видалений вузол.
4. `while (x = queue.shift())` — зупиниться на хибному значенні (`0`, `""`); перевіряй `length`.
5. Кільцевий буфер: плутанина `head`/`tail` та `size` (повна й порожня черги виглядають однаково, якщо не тримати `size`).
6. Плутати чергу зі стеком (FIFO vs LIFO).
7. Чекати, що `peek` на порожній черзі кине помилку.

## 11. Алгоритм: коли бачиш чергу

1. Порядок обробки = порядок надходження? → черга.
2. Обхід «рівень за рівнем» (BFS)? → черга.
3. Потрібен буфер фіксованого розміру? → кільцева черга.
4. Потрібні обидва кінці? → дек.
5. Потрібен пріоритет, а не порядок надходження? → [Heap/PriorityQueue](../Heap/Heap.md).
6. Реалізація в JS: масив + індекс голови (за замовчуванням), список для навчання.

## Задачі для закріплення

Сорок задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка дисципліна доступу в черги: FIFO чи LIFO? Що вилучиться першим, якщо додати `1, 2, 3`?

**2.** Яка складність `enqueue`, `dequeue`, `peek` у черги на зв'язному списку і на масиві з індексом голови?

**3.** Чому `Array.shift()` як `dequeue` вважається повільним для великих масивів?

**4.** Чим дек (deque) відрізняється від черги?

**5.** У якому порядку вилучаться елементи через `shift` з `[1, 2, 3]`?

```js
(() => { const q = [1, 2, 3], o = []; while (q.length) o.push(q.shift()); return o; })()
```

**6.** Що поверне `shift()` порожнього масиву?

```js
[].shift()
```

**7.** Що поверне послідовність `push(1), push(2), shift(), push(3), shift()` для черги-масиву?

```js
(() => { const q = []; q.push(1); q.push(2); const a = q.shift(); q.push(3); return [a, q.shift(), q]; })()
```

**8.** Що дасть `unshift` і `pop` як реалізація черги з іншого боку?

```js
(() => { const q = []; q.unshift(1); q.unshift(2); return [q.pop(), q]; })()
```

**9.** Що дасть `concat` двох черг-масивів і чи зберігається порядок?

```js
[1, 2].concat([3, 4])
```

**10.** Як отримати перший елемент черги-масиву без вилучення?

```js
[5, 6, 7][0]
```

### Рівень 2. Методи й поведінка

**11.** Який розмір черги-масиву після `enqueue(a), enqueue(b), dequeue()`?

```js
(() => { const q = []; q.push('a'); q.push('b'); q.shift(); return q.length; })()
```

**12.** Що поверне `shift` після того, як чергу очистили `length = 0`?

```js
(() => { const q = [1, 2]; q.length = 0; return q.shift(); })()
```

**13.** Чому черга з індексом голови не міняє індекси елементів при `dequeue`?

```js
(() => { const items = ['a', 'b', 'c']; let head = 0; const x = items[head++]; return [x, items.length, head, items.length - head]; })()
```

**14.** Що дасть вираз `(head + 1) % cap` для кільцевого буфера ємністю 4 при `head = 3`?

```js
(3 + 1) % 4
```

**15.** Як у кільцевій черзі обчислити індекс запису при `head = 2`, `size = 3`, `cap = 4`?

```js
(2 + 3) % 4
```

**16.** Що виведе цикл `for...of` по черзі-масиву під час `push` у процесі обходу?

```js
(() => { const q = [1]; const seen = []; for (const x of q) { seen.push(x); if (x < 3) q.push(x + 1); } return seen; })()
```

**17.** Що поверне `Array.from({ length: 3 }, (_, i) => i).shift()`?

```js
Array.from({ length: 3 }, (_, i) => i).shift()
```

**18.** Чому BFS на черзі знаходить найкоротший шлях за кількістю ребер? Скільки рівнів у шляху `a→b→d→e`?

```js
['a', 'b', 'd', 'e'].length - 1
```

**19.** Що буде, якщо в BFS не позначати вузли як відвідані, а граф має цикл? Які перші елементи черги для `a↔b`?

```js
(() => { const g = { a: ['b'], b: ['a'] }; const q = ['a'], out = []; for (let i = 0; i < 6; i++) { const v = q[i]; out.push(v); q.push(...g[v]); } return out; })()
```

**20.** Реалізуйте `Queue` на масиві з індексом голови (`enqueue`, `dequeue`, `peek`, `size`). Що дасть послідовність?

```js
class Queue {
  #head = 0
  #items = []
  enqueue(x) { this.#items.push(x); return this }
  dequeue() {
    if (this.#head >= this.#items.length) return undefined
    const x = this.#items[this.#head]
    this.#items[this.#head++] = undefined
    if (this.#head > 16 && this.#head * 2 >= this.#items.length) { this.#items = this.#items.slice(this.#head); this.#head = 0 }
    return x
  }
  peek() { return this.#items[this.#head] }
  get size() { return this.#items.length - this.#head }
}
```

### Рівень 3. Нюанси та пастки

**21.** Реалізуйте чергу на зв'язному списку з вказівниками `head` і `tail`. Що дасть послідовність?

```js
class LQueue {
  head = null
  tail = null
  size = 0
  enqueue(v) {
    const n = { v, next: null }
    this.tail ? (this.tail.next = n) : (this.head = n)
    this.tail = n
    this.size++
  }
  dequeue() {
    if (!this.head) return undefined
    const v = this.head.v
    this.head = this.head.next
    if (!this.head) this.tail = null
    this.size--
    return v
  }
}
```

**22.** Реалізуйте кільцеву чергу фіксованої ємності. Що дасть послідовність із переповненням?

```js
class RingQueue {
  #buf
  #head = 0
  #size = 0
  constructor(cap) { this.#buf = new Array(cap) }
  enqueue(x) {
    if (this.#size === this.#buf.length) return false
    this.#buf[(this.#head + this.#size++) % this.#buf.length] = x
    return true
  }
  dequeue() {
    if (!this.#size) return undefined
    const x = this.#buf[this.#head]
    this.#head = (this.#head + 1) % this.#buf.length
    this.#size--
    return x
  }
}
```

**23.** Реалізуйте чергу з двох стеків. Що дасть послідовність?

```js
class TwoStackQueue {
  #in = []
  #out = []
  enqueue(x) { this.#in.push(x) }
  dequeue() {
    if (!this.#out.length) while (this.#in.length) this.#out.push(this.#in.pop())
    return this.#out.pop()
  }
}
```

**24.** Реалізуйте `Deque` із `pushFront`, `pushBack`, `popFront`, `popBack` (на масиві). Що дасть послідовність?

```js
class Deque {
  #a = []
  pushFront(x) { this.#a.unshift(x) }
  pushBack(x) { this.#a.push(x) }
  popFront() { return this.#a.shift() }
  popBack() { return this.#a.pop() }
  toArray() { return [...this.#a] }
}
```

**25.** Напишіть `bfs(graph, start)` через чергу.

```js
function bfs(graph, start) {
  const seen = new Set([start]), q = [start], out = []
  for (let i = 0; i < q.length; i++) {
    const v = q[i]
    out.push(v)
    for (const n of graph[v]) if (!seen.has(n)) { seen.add(n); q.push(n) }
  }
  return out
}
```

**26.** Напишіть `shortestPath(graph, from, to)` — найкоротший шлях у неваговому графі (BFS).

```js
function shortestPath(g, from, to) {
  const prev = new Map([[from, null]]), q = [from]
  for (let i = 0; i < q.length; i++) {
    const v = q[i]
    if (v === to) break
    for (const n of g[v]) if (!prev.has(n)) { prev.set(n, v); q.push(n) }
  }
  if (!prev.has(to)) return null
  const path = []
  for (let v = to; v !== null; v = prev.get(v)) path.push(v)
  return path.reverse()
}
```

**27.** Напишіть `levelOrder(root)` — обхід дерева по рівнях (BFS) з поділом на рівні.

```js
function levelOrder(root) {
  if (!root) return []
  const out = [], q = [root]
  while (q.length) {
    const level = []
    for (let n = q.length; n > 0; n--) {
      const node = q.shift()
      level.push(node.v)
      if (node.l) q.push(node.l)
      if (node.r) q.push(node.r)
    }
    out.push(level)
  }
  return out
}
```

**28.** Напишіть `slidingWindowMax(nums, k)` — максимум у вікні через дек індексів.

```js
function slidingWindowMax(nums, k) {
  const dq = [], out = []
  nums.forEach((x, i) => {
    while (dq.length && nums[dq.at(-1)] <= x) dq.pop()
    dq.push(i)
    if (dq[0] <= i - k) dq.shift()
    if (i >= k - 1) out.push(nums[dq[0]])
  })
  return out
}
```

**29.** Напишіть `RecentCounter` — скільки запитів за останні 3000 мс (черга).

```js
class RecentCounter {
  q = []
  ping(t) {
    this.q.push(t)
    while (this.q[0] < t - 3000) this.q.shift()
    return this.q.length
  }
}
```

**30.** Напишіть `josephus(n, k)` — хто лишиться, якщо кожного `k`-го викреслювати з кола (черга).

```js
function josephus(n, k) {
  const q = Array.from({ length: n }, (_, i) => i + 1)
  while (q.length > 1) {
    for (let i = 1; i < k; i++) q.push(q.shift())
    q.shift()
  }
  return q[0]
}
```

### Рівень 4. Практика й реалізація

**31.** Напишіть `hotPotato(names, k)` — хто вибув останнім після `k` передач за раз.

```js
function hotPotato(names, k) {
  const q = [...names], out = []
  while (q.length) {
    for (let i = 1; i < k; i++) q.push(q.shift())
    out.push(q.shift())
  }
  return out
}
```

**32.** Напишіть `taskScheduler` — виконує завдання з пріоритетами `high` перед `low`, зберігаючи FIFO всередині пріоритету (дві черги).

```js
class Scheduler {
  high = []
  low = []
  add(t, p) { (p === 'high' ? this.high : this.low).push(t) }
  next() { return this.high.length ? this.high.shift() : this.low.shift() }
}
```

**33.** Напишіть `binaryNumbers(n)` — перші `n` двійкових чисел через чергу (`1`, `10`, `11`, …).

```js
function binaryNumbers(n) {
  const q = ['1'], out = []
  while (out.length < n) {
    const s = q.shift()
    out.push(s)
    q.push(s + '0', s + '1')
  }
  return out
}
```

**34.** Напишіть `rottingOranges(grid)` — хвилин, поки всі апельсини зігнилі (BFS по сітці; 0 порожньо, 1 свіжий, 2 гнилий). `-1`, якщо неможливо.

```js
function rottingOranges(g) {
  const q = [], rows = g.length, cols = g[0].length
  let fresh = 0
  g = g.map(r => [...r])
  g.forEach((r, i) => r.forEach((v, j) => { if (v === 2) q.push([i, j, 0]); if (v === 1) fresh++ }))
  let t = 0
  for (let h = 0; h < q.length; h++) {
    const [i, j, d] = q[h]
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj
      if (a >= 0 && b >= 0 && a < rows && b < cols && g[a][b] === 1) { g[a][b] = 2; fresh--; q.push([a, b, d + 1]); t = d + 1 }
    }
  }
  return fresh ? -1 : t
}
```

**35.** Напишіть `numIslands(grid)` — кількість островів `'1'` (BFS).

```js
function numIslands(grid) {
  const g = grid.map(r => [...r]); let n = 0
  for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) {
    if (g[i][j] !== '1') continue
    n++; g[i][j] = '0'
    const q = [[i, j]]
    for (let h = 0; h < q.length; h++) {
      const [x, y] = q[h]
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = x + dx, b = y + dy
        if (g[a]?.[b] === '1') { g[a][b] = '0'; q.push([a, b]) }
      }
    }
  }
  return n
}
```

**36.** Напишіть `wordLadder(begin, end, words)` — найкоротша довжина перетворення слова зі зміною однієї літери (BFS).

```js
function wordLadder(begin, end, words) {
  const dict = new Set(words)
  if (!dict.has(end)) return 0
  const q = [[begin, 1]]
  for (let h = 0; h < q.length; h++) {
    const [w, d] = q[h]
    if (w === end) return d
    for (let i = 0; i < w.length; i++) for (let c = 97; c < 123; c++) {
      const n = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1)
      if (dict.has(n)) { dict.delete(n); q.push([n, d + 1]) }
    }
  }
  return 0
}
```

**37.** Напишіть `MovingAverage(size)` — ковзне середнє останніх `size` значень (черга).

```js
class MovingAverage {
  q = []
  sum = 0
  constructor(size) { this.size = size }
  next(v) {
    this.q.push(v); this.sum += v
    if (this.q.length > this.size) this.sum -= this.q.shift()
    return this.sum / this.q.length
  }
}
```

**38.** Напишіть `firstNonRepeating(stream)` — перший неповторюваний символ після кожного символу потоку (черга).

```js
function firstNonRepeating(s) {
  const cnt = {}, q = [], out = []
  for (const ch of s) {
    cnt[ch] = (cnt[ch] ?? 0) + 1
    q.push(ch)
    while (q.length && cnt[q[0]] > 1) q.shift()
    out.push(q[0] ?? '#')
  }
  return out.join('')
}
```

**39.** Напишіть `topologicalSort(n, edges)` (алгоритм Кана через чергу). Для циклу поверніть `null`.

```js
function topologicalSort(n, edges) {
  const indeg = Array(n).fill(0), adj = Array.from({ length: n }, () => [])
  for (const [a, b] of edges) { adj[a].push(b); indeg[b]++ }
  const q = indeg.flatMap((d, i) => (d === 0 ? [i] : [])), out = []
  for (let h = 0; h < q.length; h++) {
    out.push(q[h])
    for (const m of adj[q[h]]) if (--indeg[m] === 0) q.push(m)
  }
  return out.length === n ? out : null
}
```

**40.** Напишіть `shortestBridge`-спрощення: `minMoves(grid)` — найкоротший шлях з `(0,0)` до нижнього правого кута по `0` (проходи), `1` — стіна. `-1` якщо немає.

```js
function minMoves(g) {
  const R = g.length, C = g[0].length
  if (g[0][0] || g[R - 1][C - 1]) return -1
  const q = [[0, 0, 0]], seen = new Set(['0,0'])
  for (let h = 0; h < q.length; h++) {
    const [x, y, d] = q[h]
    if (x === R - 1 && y === C - 1) return d
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy, k = a + ',' + b
      if (g[a]?.[b] === 0 && !seen.has(k)) { seen.add(k); q.push([a, b, d + 1]) }
    }
  }
  return -1
}
```

### Відповіді

1. FIFO — «першим прийшов, першим пішов»; першим вилучається `1`.
2. Усі `O(1)` (на масиві з індексом голови — амортизовано).
3. `shift` зсуває всі елементи, складність `O(n)`; рушії частково оптимізують, але на великих масивах це все одно дорого.
4. У деку додавати й вилучати можна з обох кінців: `pushFront`, `pushBack`, `popFront`, `popBack`.
5. `[1, 2, 3]`
6. `undefined`
7. `[1, 2, [3]]`
8. `[1, [2]]`
9. `[1, 2, 3, 4]`
10. `5`
11. `1`
12. `undefined`
13. `['a', 3, 1, 2]`
14. `0`
15. `1`
16. `[1, 2, 3]`
17. `0`
18. `3`
19. `['a', 'b', 'a', 'b', 'a', 'b']`
20. Виклик `(() => { const q = new Queue(); q.enqueue(1).enqueue(2).enqueue(3); return [q.dequeue(), q.peek(), q.size, q.dequeue(), q.dequeue(), q.dequeue()]; })()` → `[1, 2, 2, 2, 3, undefined]`
21. Виклик `(() => { const q = new LQueue(); q.enqueue('a'); q.enqueue('b'); return [q.dequeue(), q.dequeue(), q.dequeue(), q.size, q.tail]; })()` → `['a', 'b', undefined, 0, null]`
22. Виклик `(() => { const q = new RingQueue(2); const r = [q.enqueue(1), q.enqueue(2), q.enqueue(3)]; r.push(q.dequeue(), q.enqueue(4), q.dequeue(), q.dequeue(), q.dequeue()); return r; })()` → `[true, true, false, 1, true, 2, 4, undefined]`
23. Виклик `(() => { const q = new TwoStackQueue(); q.enqueue(1); q.enqueue(2); return [q.dequeue(), (q.enqueue(3), q.dequeue()), q.dequeue(), q.dequeue()]; })()` → `[1, 2, 3, undefined]`
24. Виклик `(() => { const d = new Deque(); d.pushBack(1); d.pushBack(2); d.pushFront(0); const r = [d.toArray(), d.popFront(), d.popBack(), d.toArray()]; return r; })()` → `[[0, 1, 2], 0, 2, [1]]`
25. Виклик `bfs({ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] }, 'a')` → `['a', 'b', 'c', 'd']`
26. Виклик `[shortestPath({ a: ['b', 'c'], b: ['d'], c: ['d'], d: ['e'], e: [] }, 'a', 'e'), shortestPath({ a: [], b: [] }, 'a', 'b')]` → `[['a', 'b', 'd', 'e'], null]`
27. Виклик `levelOrder({ v: 1, l: { v: 2, l: { v: 4 }, r: null }, r: { v: 3, r: { v: 5 } } })` → `[[1], [2, 3], [4, 5]]`
28. Виклик `slidingWindowMax([1, 3, -1, -3, 5, 3, 6, 7], 3)` → `[3, 3, 5, 5, 6, 7]`
29. Виклик `(() => { const r = new RecentCounter(); return [r.ping(1), r.ping(100), r.ping(3001), r.ping(3002)]; })()` → `[1, 2, 3, 3]`
30. Виклик `[josephus(7, 3), josephus(5, 2)]` → `[4, 3]`
31. Виклик `hotPotato(['A', 'B', 'C', 'D'], 2)` → `['B', 'D', 'C', 'A']`
32. Виклик `(() => { const s = new Scheduler(); s.add('a', 'low'); s.add('b', 'high'); s.add('c', 'low'); s.add('d', 'high'); return [s.next(), s.next(), s.next(), s.next(), s.next()]; })()` → `['b', 'd', 'a', 'c', undefined]`
33. Виклик `binaryNumbers(6)` → `['1', '10', '11', '100', '101', '110']`
34. Виклик `[rottingOranges([[2, 1, 1], [1, 1, 0], [0, 1, 1]]), rottingOranges([[2, 1, 1], [0, 1, 1], [1, 0, 1]]), rottingOranges([[0, 2]])]` → `[4, -1, 0]`
35. Виклик `numIslands([['1', '1', '0', '0'], ['1', '0', '0', '1'], ['0', '0', '1', '1']])` → `2`
36. Виклик `[wordLadder('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log', 'cog']), wordLadder('hit', 'cog', ['hot', 'dot', 'dog', 'lot', 'log'])]` → `[5, 0]`
37. Виклик `(() => { const m = new MovingAverage(3); return [1, 10, 3, 5].map(v => m.next(v)); })()` → `[1, 5.5, 4.666666666666667, 6]`
38. Виклик `firstNonRepeating('aabc')` → `'a#bb'`
39. Виклик `[topologicalSort(4, [[0, 1], [0, 2], [1, 3], [2, 3]]), topologicalSort(2, [[0, 1], [1, 0]])]` → `[[0, 1, 2, 3], null]`
40. Виклик `[minMoves([[0, 0, 0], [1, 1, 0], [0, 0, 0]]), minMoves([[0, 1], [1, 0]])]` → `[4, -1]`
