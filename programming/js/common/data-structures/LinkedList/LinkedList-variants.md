# LinkedList — інші реалізації

Продовження [LinkedList.md](LinkedList.md). Там розібрана базова однозв'язна реалізація. Тут — три альтернативи, що показують різні **компроміси** та техніки. Увесь код протестований.

Порівняння одразу:

| Варіант | Головна ідея | Що спрощує | Ціна |
|---|---|---|---|
| 1. Однозв'язний (`head`/`tail`) | базова модель | пояснення, мінімум пам'яті | `pop` O(n), багато `if` для країв |
| 2. Однозв'язний зі **сторожем** (dummy) | фіктивний вузол перед першим | вставка/видалення без гілок для `head` | один зайвий вузол |
| 3. **Двозв'язний** зі сторожами | `prev` + `next`, сторожі з обох боків | `pop` O(1), хід з обох кінців, нуль `null`-перевірок | +1 вказівник на вузол |
| 4. **Незмінний** (persistent) | вузли ніколи не змінюються | безпечний обмін хвостами, історія версій | O(n) копіювання при змінах «в середині» |

---

## Варіант 2: однозв'язний список зі сторожовим вузлом

### Проблема, яку він розв'язує

У варіанті 1 кожна операція має окремі гілки: «а чи не порожній список?», «а чи не перший елемент?», «а чи не останній?». Усе тому, що у **першого** вузла немає попередника — його `next` лежить не в іншому вузлі, а в полі `list.head`.

### Ідея

Поставимо перед першим елементом **фіктивний вузол** `dummy` (значення в ньому нікому не потрібне). Тоді в кожного реального вузла є попередник, і **вставка/видалення на початку — це той самий код, що й у середині**.

```
звичайний:   head → [1] → [2] → [3]
зі сторожем: dummy → [1] → [2] → [3]       (dummy.next — це «голова»)
порожній:    dummy → ∅
```

Ключова допоміжна функція — `nodeBefore(index)`: повертає вузол **перед** потрібним індексом. Для `index = 0` це `dummy`. Далі вставка — це завжди `before.next = new Node(value, before.next)`, а видалення — `before.next = before.next.next`.

```ts
class Node2<T> {
  constructor(
    public value: T,
    public next: Node2<T> | null = null,
  ) {}
}

// Однозв'язний список зі «сторожовим» (dummy) вузлом.
// head завжди існує, тому вставка/видалення на початку — той самий код, що й у середині.
class SentinelList<T> implements Iterable<T> {
  private readonly dummy = new Node2<T>(undefined as T);
  private tail: Node2<T> = this.dummy;
  length = 0;

  static from<T>(items: Iterable<T>): SentinelList<T> {
    const list = new SentinelList<T>();
    for (const item of items) list.push(item);
    return list;
  }

  // вузол ПЕРЕД індексом: для index = 0 це dummy
  private nodeBefore(index: number): Node2<T> {
    let node = this.dummy;
    for (let i = 0; i < index; i++) node = node.next!;
    return node;
  }

  push(value: T): this {
    this.tail = this.tail.next = new Node2(value);
    this.length++;
    return this;
  }

  insert(index: number, value: T): boolean {
    if (!Number.isInteger(index) || index < 0 || index > this.length) return false;
    const before = this.nodeBefore(index);
    before.next = new Node2(value, before.next);
    if (before === this.tail) this.tail = before.next;
    this.length++;
    return true;
  }

  remove(index: number): T | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return undefined;
    const before = this.nodeBefore(index);
    const node = before.next!;
    before.next = node.next;
    if (node === this.tail) this.tail = before;
    this.length--;
    return node.value;
  }

  get(index: number): T | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return undefined;
    return this.nodeBefore(index).next!.value;
  }

  // видалити перше входження значення
  removeValue(value: T): boolean {
    for (let before = this.dummy; before.next; before = before.next) {
      if (before.next.value === value) {
        if (before.next === this.tail) this.tail = before;
        before.next = before.next.next;
        this.length--;
        return true;
      }
    }
    return false;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let n = this.dummy.next; n; n = n.next) yield n.value;
  }
}
```

### Що змінилось

- `insert(0, x)` і `insert(5, x)` — один і той самий рядок коду; ніяких `if (index === 0)`;
- `remove` так само;
- `removeValue` рухається парою `before`/`before.next` — відомий прийом, що дозволяє видалити **будь-який** вузол, не чіпаючи спеціально голову;
- `static from(iterable)` — зручний спосіб побудови;
- залишається лише одна турбота — `tail` (потрібен для O(1) `push`), її оновлюємо у двох місцях: при вставці в кінець і при видаленні останнього.

> Прийом із фіктивним вузлом ти побачиш у майже кожній задачі зі списками: злиття, розбиття, видалення дублікатів (див. [LinkedList-algorithms.md](LinkedList-algorithms.md)).

---

## Варіант 3: двозв'язний список (DoublyLinkedList) зі сторожами

### Ідея

Кожен вузол знає **обидва** сусіди:

```
 head(сторож) ⇄ [10] ⇄ [20] ⇄ [30] ⇄ tail(сторож)
```

Наслідки:

- `pop` стає **O(1)**: передостанній вузол — це просто `tail.prev`, обходити список не треба;
- можна рухатись в **обидва боки** (`reversed()`);
- `get(i)` швидший у середньому: починаємо з **ближчого** кінця (максимум n/2 кроків);
- видалити вузол, маючи на нього посилання, — O(1) (а в однозв'язному потрібен попередник).

Ціна: на кожен вузол **ще одне посилання** (пам'ять) і вдвічі більше стрілок для узгодження при кожній зміні — легко помилитись.

### Два сторожових вузли: нуль `null`-перевірок

Якщо поставити **сторожі і спереду, і ззаду**, у кожного реального вузла завжди є і `prev`, і `next`. Тоді все зводиться до **двох примітивів**:

1. `link(value, prev, next)` — вставити новий вузол **між** двома сусідами;
2. `unlink(node)` — вилучити вузол.

Усі публічні методи (`push`, `unshift`, `insert`, `pop`, `shift`, `remove`) — це виклики цих двох функцій. Саме так влаштований `LinkedList` у Java та Python-`deque`.

```ts
class DNode<T> {
  constructor(
    public value: T,
    public prev: DNode<T> = null as never,
    public next: DNode<T> = null as never,
  ) {}
}

// Двозв'язний список з двома сторожовими вузлами: head ↔ ... ↔ tail.
// Жодних перевірок на null: у кожного реального вузла завжди є prev і next.
class DoublyLinkedList<T> implements Iterable<T> {
  private readonly head = new DNode<T>(undefined as T);
  private readonly tail = new DNode<T>(undefined as T);
  length = 0;

  constructor() {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // вставити новий вузол МІЖ двома сусідами — єдина «примітивна» операція
  private link(value: T, prev: DNode<T>, next: DNode<T>): DNode<T> {
    const node = new DNode(value, prev, next);
    prev.next = node;
    next.prev = node;
    this.length++;
    return node;
  }

  // видалити вузол — друга примітивна операція
  private unlink(node: DNode<T>): T {
    node.prev.next = node.next;
    node.next.prev = node.prev;
    node.prev = node.next = null as never;
    this.length--;
    return node.value;
  }

  push(value: T): this {
    this.link(value, this.tail.prev, this.tail);
    return this;
  }

  unshift(value: T): this {
    this.link(value, this.head, this.head.next);
    return this;
  }

  pop(): T | undefined {
    return this.length === 0 ? undefined : this.unlink(this.tail.prev); // O(1)
  }

  shift(): T | undefined {
    return this.length === 0 ? undefined : this.unlink(this.head.next); // O(1)
  }

  // йдемо з ближчого кінця: максимум n / 2 кроків
  private nodeAt(index: number): DNode<T> | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return null;
    let node: DNode<T>;
    if (index < this.length / 2) {
      node = this.head.next;
      for (let i = 0; i < index; i++) node = node.next;
    } else {
      node = this.tail.prev;
      for (let i = this.length - 1; i > index; i--) node = node.prev;
    }
    return node;
  }

  get(index: number): T | undefined {
    return this.nodeAt(index)?.value;
  }

  insert(index: number, value: T): boolean {
    if (!Number.isInteger(index) || index < 0 || index > this.length) return false;
    const next = index === this.length ? this.tail : this.nodeAt(index)!;
    this.link(value, next.prev, next);
    return true;
  }

  remove(index: number): T | undefined {
    const node = this.nodeAt(index);
    return node ? this.unlink(node) : undefined;
  }

  reverse(): this {
    if (this.length < 2) return this;
    const first = this.head.next;
    const last = this.tail.prev;
    // у кожного реального вузла міняємо prev і next
    for (let n = first; n !== this.tail; ) {
      const next = n.next;
      [n.prev, n.next] = [n.next, n.prev];
      n = next;
    }
    // і лагодимо краї: сторожові вузли тепер дивляться на нові перший/останній
    this.head.next = last;
    last.prev = this.head;
    this.tail.prev = first;
    first.next = this.tail;
    return this;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let n = this.head.next; n !== this.tail; n = n.next) yield n.value;
  }

  *reversed(): Iterable<T> {
    for (let n = this.tail.prev; n !== this.head; n = n.prev) yield n.value;
  }
}
```

### Малюнок `link` (вставка між двома сусідами)

```
до:      A ⇄ B
link(X, A, B):
1) node = {X, prev: A, next: B}
2) A.next = node
3) B.prev = node
після:   A ⇄ X ⇄ B
```

### Малюнок `unlink`

```
до:      A ⇄ X ⇄ B
A.next = B;  B.prev = A;  X.prev = X.next = null
після:   A ⇄ B
```

### `reverse` у двозв'язному

У кожного реального вузла міняємо `prev` і `next` місцями, а потім лагодимо краї — сторожі тепер дивляться на нові перший та останній вузли (див. код). Це O(n), без додаткової пам'яті.

### Складність

| Операція | Час |
|---|---|
| `push`, `pop`, `unshift`, `shift` | **O(1)** |
| `get(i)` | O(n/2) → O(n) |
| `insert`, `remove` за індексом | O(n) пошуку + O(1) |
| `unlink(node)` за готовим вузлом | **O(1)** |
| `reverse` | O(n) |

> У твоїй реалізації `doubly-linked-lists.ts` те саме досягається через `head`, `tail`, `length` та ручні перевірки `length === 0` / `length === 1`. Версія зі сторожами коротша, бо ці перевірки зникають — але вимагає, щоб ти розумів, що «сторож» — це **не елемент списку**.

### Типові помилки у двозв'язному списку

1. **Оновити лише `next`, забувши `prev`** (або навпаки) — список «ламається» в одному напрямку: прямий обхід працює, зворотний — ні.
2. **Не обнулити `prev`/`next` у видаленого вузла** — він тримає сусідів у пам'яті, зовнішній код бачить «привид».
3. **Порядок присвоєнь при `link`:** якщо спершу змінити `A.next`, а потім читати `A.next` для `B` — прочитаєш уже новий.
4. **`pop` з `length === 1`** — потрібно обнулити і `head`, і `tail` (у версії зі сторожами цей випадок зникає).
5. **Не врахувати, що `get` іде з двох боків:** при `index < length / 2` — від голови, інакше — від хвоста (кроки рахуються по-різному).

---

## Практичний приклад: LRU-кеш (двозв'язний список + Map)

**LRU (Least Recently Used)** — кеш фіксованого розміру, який при переповненні викидає **найдавніше використаний** елемент. Потрібні дві операції за O(1):

1. знайти значення за ключем → **Map**;
2. позначити елемент «щойно використаний» (перемістити в кінець) і викинути найстаріший (з початку) → **двозв'язний список**, бо видалити вузол із середини за O(1) можна тільки знаючи обох сусідів.

```
head ⇄ [найстаріший] ⇄ … ⇄ [найновіший] ⇄ tail
Map:  ключ → вузол (O(1) знайти вузол у списку)
```

```ts
// LRU-кеш: Map дає O(1) пошук, двозв'язний список — O(1) «перемістити в кінець» і «видалити найстаріший».
class LNode<K, V> {
  prev: LNode<K, V> | null = null;
  next: LNode<K, V> | null = null;
  constructor(
    public key: K,
    public value: V,
  ) {}
}

class LRUCache<K, V> {
  private map = new Map<K, LNode<K, V>>();
  private head = new LNode<K, V>(undefined as K, undefined as V); // найстаріший після head
  private tail = new LNode<K, V>(undefined as K, undefined as V); // найновіший перед tail

  constructor(private capacity: number) {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  private detach(n: LNode<K, V>) {
    n.prev!.next = n.next;
    n.next!.prev = n.prev;
  }

  private attachLast(n: LNode<K, V>) {
    n.prev = this.tail.prev;
    n.next = this.tail;
    this.tail.prev!.next = n;
    this.tail.prev = n;
  }

  get(key: K): V | undefined {
    const n = this.map.get(key);
    if (!n) return undefined;
    this.detach(n); // «щойно використаний» → у кінець
    this.attachLast(n);
    return n.value;
  }

  set(key: K, value: V): void {
    let n = this.map.get(key);
    if (n) {
      n.value = value;
      this.detach(n);
    } else {
      if (this.map.size === this.capacity) {
        const oldest = this.head.next!; // найстаріший
        this.detach(oldest);
        this.map.delete(oldest.key);
      }
      n = new LNode(key, value);
      this.map.set(key, n);
    }
    this.attachLast(n);
  }
}
```

Це класична співбесідна задача — і найкраща відповідь на питання «навіщо взагалі LinkedList, якщо є масиви».

---

## Варіант 4: незмінний (persistent) список

### Ідея

У функціональних мовах (Haskell, Lisp, Clojure, Elm) список — це **ланцюжок пар** `(head, tail)`, і вузли **ніколи не змінюються**. Кожна «зміна» повертає **новий список**, який **ділить спільний хвіст** зі старим — копіювати нічого не треба.

```
l  = 1 → 2 → 3
l2 = prepend(l, 0)

l2:  0 ─┐
         ▼
l:       1 → 2 → 3          ← l2 і l використовують ті самі вузли 1,2,3
```

- `prepend` — **O(1)** і при цьому **не зачіпає** старий список;
- старий список лишається дійсним — це дає «історію версій» безкоштовно (undo, time-travel debugging);
- безпечно ділитись між потоками/компонентами: ніхто не змінить вузол;
- зміна **в середині** копіює лише те, що **перед** змінюваним місцем (O(i)), а хвіст ділиться.

```ts
// Незмінний (persistent) зв'язний список у функціональному стилі: «cons-список».
// Кожна операція повертає НОВИЙ список, а старий лишається цілим.
// Нові списки ділять спільний «хвіст» зі старими — копіювати нічого не треба.
type List<T> = null | {readonly head: T; readonly tail: List<T>};

const cons = <T>(head: T, tail: List<T>): List<T> => ({head, tail});

const fromArray = <T>(items: readonly T[]): List<T> =>
  items.reduceRight<List<T>>((tail, head) => cons(head, tail), null);

function* iterate<T>(list: List<T>): Generator<T> {
  for (let n = list; n !== null; n = n.tail) yield n.head;
}

const toArray = <T>(list: List<T>): T[] => [...iterate(list)];

// O(1) і без копіювання: старий список стає хвостом нового
const prepend = <T>(list: List<T>, value: T): List<T> => cons(value, list);

// O(1)
const rest = <T>(list: List<T>): List<T> => (list === null ? null : list.tail);

// O(n): копіюємо тільки те, що ПЕРЕД змінюваним місцем; хвіст ділиться
function insertAt<T>(list: List<T>, index: number, value: T): List<T> {
  if (index === 0) return cons(value, list);
  if (list === null) throw new RangeError('index out of range');
  return cons(list.head, insertAt(list.tail, index - 1, value));
}

function removeAt<T>(list: List<T>, index: number): List<T> {
  if (list === null) throw new RangeError('index out of range');
  if (index === 0) return list.tail;
  return cons(list.head, removeAt(list.tail, index - 1));
}

// O(n), O(n) нових вузлів
const map = <T, U>(list: List<T>, fn: (v: T) => U): List<U> =>
  list === null ? null : cons(fn(list.head), map(list.tail, fn));

// ітеративний reverse: O(n), без рекурсії
function reverse<T>(list: List<T>): List<T> {
  let out: List<T> = null;
  for (const v of iterate(list)) out = cons(v, out);
  return out;
}
```

### Як `insertAt` ділить хвіст

```
l = [1] → [2] → [3]
insertAt(l, 1, 99)  →  [1'] → [99] ┐
                                    ▼
                                  [2] → [3]      ← спільні вузли з l
```

Скопійований лише вузол `[1']` (те, що **перед** місцем вставки). Вузли `[2]`, `[3]` — ті самі об'єкти, що й у старому списку (тест перевіряє `l3.tail.tail === l.tail`).

### Коли це корисно

- React/Redux: оновлення стану без мутацій;
- історія змін (undo/redo);
- рекурсивні алгоритми над списками (розбір на `head` і `tail`);
- коли потрібна гарантія, що дані не змінить ніхто інший.

### Мінуси

- доступ до кінця — O(n), `push` у кінець — O(n) (треба скопіювати весь список);
- більше сміття для збирача;
- рекурсивні версії (`map`, `insertAt`) можуть переповнити стек на довгих списках — тоді пишуть ітеративно (як `reverse`).

---

## Інші різновиди (для загального уявлення)

- **Циклічний (circular) список:** `tail.next = head`. Підходить для «кільцевих» задач (round-robin планувальник, гра «Йосип Флавій»). Обхід потребує умови зупинки `node !== start`, інакше цикл нескінченний.
- **Skip list:** кілька рівнів стрілок для швидшого пошуку (O(log n)) — основа деяких баз даних (Redis sorted sets).
- **XOR-список:** замість двох посилань зберігається `prev XOR next` — економія пам'яті; у JS не застосовується (немає прямих адрес).
- **Unrolled list:** у кожному вузлі — невеликий масив значень; компроміс між списком та масивом, краще для кешу процесора.

## Як вибрати

| Потрібно | Обирай |
|---|---|
| вчити базові ідеї | варіант 1 |
| менше `if` для країв | варіант 2 (dummy) |
| швидкий `pop`, LRU, дек, видалення за готовим вузлом | варіант 3 (двозв'язний) |
| історія версій, чиста функціональність | варіант 4 |
| просто зберігати колекцію в JS | **звичайний `Array`** |

## Задачі для закріплення

22 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Навіщо сторожові вузли (sentinel) у списку?

**2.** Яка перевага двозв'язного списку перед однозв'язним при видаленні за посиланням на вузол?

**3.** Скільки пам'яті додатково потрібно на вузол у двозв'язному списку?

**4.** Що таке persistent (незмінний) список і що спільного в двох версій після `prepend`?

**5.** Чому LRU-кеш будують із двозв'язного списку та `Map`?

**6.** Реалізуйте `DList` із сторожами. Що дасть послідовність `addLast(1), addLast(2), addFirst(0)` і видалення кінців?

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
```

### Рівень 2. Методи й поведінка

**7.** Що поверне `removeFirst` для порожнього `DList`?

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
```

**8.** Що станеться з `size` після `addLast` ×3 і `removeLast` ×1?

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
```

**9.** Напишіть `toArrayReverse(list)` для `DList` обходом із хвоста.

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
const toArrayReverse = l => { const o = []; for (let n = l.tail.prev; n !== l.head; n = n.prev) o.push(n.v); return o }
```

**10.** Напишіть `reverse(list)` для `DList` (поміняти `prev`/`next`).

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
function reverse(l) {
  const vals = l.toArray().reverse()
  const r = new DList()
  vals.forEach(v => r.addLast(v))
  return r
}
```

**11.** Реалізуйте `LRUCache(cap)` на `Map` (порядок вставки). Які ключі лишаться?

```js
class LRUCache {
  constructor(cap) { this.cap = cap; this.m = new Map() }
  get(k) {
    if (!this.m.has(k)) return -1
    const v = this.m.get(k); this.m.delete(k); this.m.set(k, v)
    return v
  }
  put(k, v) {
    this.m.delete(k); this.m.set(k, v)
    if (this.m.size > this.cap) this.m.delete(this.m.keys().next().value)
  }
}
```

**12.** Реалізуйте `LRUCache` на двозв'язному списку і `Map` вузлів. Що дасть послідовність?

```js
class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map(); this.h = { next: null }; this.t = { prev: null }; this.h.next = this.t; this.t.prev = this.h }
  #unlink(n) { n.prev.next = n.next; n.next.prev = n.prev }
  #front(n) { n.next = this.h.next; n.prev = this.h; this.h.next.prev = n; this.h.next = n }
  get(k) { const n = this.map.get(k); if (!n) return -1; this.#unlink(n); this.#front(n); return n.v }
  put(k, v) {
    let n = this.map.get(k)
    if (n) { n.v = v; this.#unlink(n) } else { n = { k, v }; this.map.set(k, n); if (this.map.size > this.cap) { const old = this.t.prev; this.#unlink(old); this.map.delete(old.k) } }
    this.#front(n)
  }
}
```

### Рівень 3. Нюанси та пастки

**13.** Реалізуйте незмінний список `prepend`/`toArray`. Чи ділять `a` і `b = prepend(a, 0)` вузли?

```js
const nil = null
const cons = (v, next) => Object.freeze({ v, next })
const toA = l => { const o = []; for (; l; l = l.next) o.push(l.v); return o }
```

**14.** Напишіть `append(list, v)` для незмінного списку (повертає новий список).

```js
const cons = (v, next) => Object.freeze({ v, next })
const toA = l => { const o = []; for (; l; l = l.next) o.push(l.v); return o }
const append = (l, v) => (l ? cons(l.v, append(l.next, v)) : cons(v, null))
```

**15.** Напишіть `map(list, fn)` для незмінного списку.

```js
const cons = (v, next) => Object.freeze({ v, next })
const toA = l => { const o = []; for (; l; l = l.next) o.push(l.v); return o }
const map = (l, fn) => (l ? cons(fn(l.v), map(l.next, fn)) : null)
```

**16.** Що станеться при спробі змінити поле замороженого вузла у суворому режимі?

```js
const cons = (v, next) => Object.freeze({ v, next })
```

**17.** Напишіть `insertSorted(list, v)` у відсортований двозв'язний `DList`.

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
function insertSorted(l, v) {
  let n = l.head.next
  while (n !== l.tail && n.v < v) n = n.next
  const node = new DNode(v)
  node.prev = n.prev; node.next = n; n.prev.next = node; n.prev = node; l.size++
}
```

**18.** Напишіть `moveToFront(list, node)` для `DList`.

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
function moveToFront(l, n) {
  l.remove(n)
  n.prev = l.head; n.next = l.head.next; l.head.next.prev = n; l.head.next = n; l.size++
}
```

### Рівень 4. Практика й реалізація

**19.** Напишіть `rotate(list, k)` для `DList` (перенести `k` елементів із початку в кінець).

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
function rotate(l, k) { for (let i = 0; i < k; i++) l.addLast(l.removeFirst()) }
```

**20.** Напишіть `isPalindromeDList(list)` двома вказівниками з кінців.

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
function isPalindromeDList(l) {
  let a = l.head.next, b = l.tail.prev
  while (a !== b && a.prev !== b) { if (a.v !== b.v) return false; a = a.next; b = b.prev }
  return true
}
```

**21.** Скільки вузлів вилучено, якщо видалити з `DList` усі елементи, більші за 2?

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
function removeIf(l, pred) {
  let removed = 0
  for (let n = l.head.next; n !== l.tail;) { const nx = n.next; if (pred(n.v)) { l.remove(n); removed++ } n = nx }
  return removed
}
```

**22.** Напишіть `deque` через `DList`: `popFront`/`popBack`. Порядок після `[1,2,3]`.

```js
class DNode { constructor(v) { this.v = v; this.prev = null; this.next = null } }
class DList {
  constructor() { this.head = new DNode(null); this.tail = new DNode(null); this.head.next = this.tail; this.tail.prev = this.head; this.size = 0 }
  addFirst(v) { this.#insert(this.head, v) }
  addLast(v) { this.#insert(this.tail.prev, v) }
  #insert(after, v) { const n = new DNode(v); n.prev = after; n.next = after.next; after.next.prev = n; after.next = n; this.size++; return n }
  remove(n) { n.prev.next = n.next; n.next.prev = n.prev; this.size--; return n.v }
  removeFirst() { return this.size ? this.remove(this.head.next) : undefined }
  removeLast() { return this.size ? this.remove(this.tail.prev) : undefined }
  toArray() { const o = []; for (let n = this.head.next; n !== this.tail; n = n.next) o.push(n.v); return o }
}
```

### Відповіді

1. Вони прибирають особливі випадки для порожнього списку, голови й хвоста: вставка й видалення завжди мають сусідів.
2. Вузол знає `prev` і `next`, тому видалення `O(1)` без пошуку попередника.
3. Один додатковий вказівник (`prev`) на кожен вузол.
4. Операції не змінюють старий список, а повертають новий; нова версія ділить із старою всі вузли хвоста (структурне ділення).
5. `Map` дає `O(1)` пошук вузла за ключем, а двозв'язний список — `O(1)` переміщення вузла в голову й видалення з хвоста.
6. Виклик `(() => { const l = new DList(); l.addLast(1); l.addLast(2); l.addFirst(0); const a = l.toArray(); return [a, l.removeFirst(), l.removeLast(), l.toArray(), l.size]; })()` → `[[0, 1, 2], 0, 2, [1], 1]`
7. Виклик `new DList().removeFirst()` → `undefined`
8. Виклик `(() => { const l = new DList(); l.addLast(1); l.addLast(2); l.addLast(3); l.removeLast(); return l.size; })()` → `2`
9. Виклик `(() => { const l = new DList(); [1, 2, 3].forEach(v => l.addLast(v)); return toArrayReverse(l); })()` → `[3, 2, 1]`
10. Виклик `(() => { const l = new DList(); [1, 2, 3].forEach(v => l.addLast(v)); return reverse(l).toArray(); })()` → `[3, 2, 1]`
11. Виклик `(() => { const c = new LRUCache(2); c.put(1, 1); c.put(2, 2); const a = c.get(1); c.put(3, 3); return [a, c.get(2), c.get(3), [...c.m.keys()]]; })()` → `[1, -1, 3, [1, 3]]`
12. Виклик `(() => { const c = new LRU(2); c.put('a', 1); c.put('b', 2); c.get('a'); c.put('c', 3); return [c.get('a'), c.get('b'), c.get('c')]; })()` → `[1, -1, 3]`
13. Виклик `(() => { const a = cons(1, cons(2, nil)); const b = cons(0, a); return [toA(a), toA(b), b.next === a]; })()` → `[[1, 2], [0, 1, 2], true]`
14. Виклик `(() => { const a = cons(1, cons(2, null)); const b = append(a, 3); return [toA(a), toA(b), a.next === b.next]; })()` → `[[1, 2], [1, 2, 3], false]`
15. Виклик `toA(map(cons(1, cons(2, cons(3, null))), x => x * x))` → `[1, 4, 9]`
16. Виклик `(() => { 'use strict'; const n = cons(1, null); try { n.v = 2; } catch (e) { return e.name; } })()` → `'TypeError'`
17. Виклик `(() => { const l = new DList(); [1, 3, 5].forEach(v => l.addLast(v)); insertSorted(l, 4); insertSorted(l, 0); insertSorted(l, 9); return l.toArray(); })()` → `[0, 1, 3, 4, 5, 9]`
18. Виклик `(() => { const l = new DList(); [1, 2, 3].forEach(v => l.addLast(v)); const n = l.tail.prev; moveToFront(l, n); return [l.toArray(), l.size]; })()` → `[[3, 1, 2], 3]`
19. Виклик `(() => { const l = new DList(); [1, 2, 3, 4].forEach(v => l.addLast(v)); rotate(l, 1); return l.toArray(); })()` → `[2, 3, 4, 1]`
20. Виклик `(() => { const mk = arr => { const l = new DList(); arr.forEach(v => l.addLast(v)); return l; }; return [isPalindromeDList(mk([1, 2, 1])), isPalindromeDList(mk([1, 2, 2, 1])), isPalindromeDList(mk([1, 2]))]; })()` → `[true, true, false]`
21. Виклик `(() => { const l = new DList(); [1, 3, 2, 5, 4].forEach(v => l.addLast(v)); return [removeIf(l, v => v > 2), l.toArray()]; })()` → `[3, [1, 2]]`
22. Виклик `(() => { const l = new DList(); [1, 2, 3].forEach(v => l.addLast(v)); return [l.removeFirst(), l.removeLast(), l.removeFirst(), l.removeFirst()]; })()` → `[1, 3, 2, undefined]`
