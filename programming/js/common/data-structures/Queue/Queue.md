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
