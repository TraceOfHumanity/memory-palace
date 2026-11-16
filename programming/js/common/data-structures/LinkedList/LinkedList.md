# LinkedList — зв'язний список: вузли, що вказують один на одного

> У JavaScript **немає вбудованого** `LinkedList` (на відміну від Java чи C++). Тому його реалізують самі — і саме тому це улюблена тема співбесід: вона перевіряє розуміння **посилань**, **вказівників** і **крайових випадків**.

Цей конспект розбитий на три файли:

- **LinkedList.md** (цей) — ідея, пам'ять, однозв'язний список, розбір твоєї реалізації, виправлена версія;
- [LinkedList-variants.md](LinkedList-variants.md) — інші реалізації: зі сторожовим вузлом, двозв'язний, незмінний (persistent), LRU-кеш;
- [LinkedList-algorithms.md](LinkedList-algorithms.md) — класичні задачі: середина, цикл, злиття, розворот, n-й з кінця, паліндром.

---

## 1. Ідея: список без «індексів»

У масиві елементи лежать **впритул** у пам'яті, тому `arr[i]` — це арифметика: `адреса = початок + i × розмір`.

У зв'язному списку кожен елемент — окремий **вузол** (node), який зберігає два поля:

1. `value` — саме значення;
2. `next` — **посилання** на наступний вузол (або `null`, якщо вузол останній).

Вузли можуть лежати в пам'яті **де завгодно**. Список знає лише, з чого він починається (`head`), а далі йде «по ниточці».

```
  head                                   tail
   │                                      │
   ▼                                      ▼
┌───────┬───┐   ┌───────┬───┐   ┌───────┬───┐
│ value │ ●─┼──▶│ value │ ●─┼──▶│ value │ ∅ │
│  10   │   │   │  20   │   │   │  30   │   │
└───────┴───┘   └───────┴───┘   └───────┴───┘
```

Порівняй з масивом:

```
Array:   │ 10 │ 20 │ 30 │          ← клітинки поруч, доступ за індексом миттєвий
List:    [10|●]──▶[20|●]──▶[30|∅]  ← вузли розкидані, до n-го треба «дійти»
```

### Ключова «суперсила» і ключова «слабкість»

| | Array | LinkedList |
|---|---|---|
| Доступ `a[i]` | **O(1)** | O(n) — треба пройти i кроків |
| Вставка/видалення **на початку** | O(n) — зсув усіх | **O(1)** — переставити одну стрілку |
| Вставка/видалення **в середині** (маючи вузол) | O(n) — зсув | **O(1)** — переставити стрілки |
| Додати в кінець | O(1) амортизовано | O(1) (якщо тримаємо `tail`) |
| Видалити з кінця | O(1) | O(n) в однозв'язному, O(1) в двозв'язному |
| Пам'ять | лише дані | дані **+ посилання** у кожному вузлі |
| Кеш процесора | дружній (суцільна пам'ять) | **недружній** (вузли розкидані) |

> **Чесна правда для JavaScript.** Звичайні масиви в V8 настільки добре оптимізовані (суцільна пам'ять, кеш процесора), що на практиці вони майже завжди швидші навіть там, де LinkedList «виграє» за теорією. Зв'язний список потрібен, коли:
> - ти **часто вставляєш/видаляєш посередині**, і вже тримаєш посилання на вузол (LRU-кеш, редактор тексту, черги планувальника);
> - потрібні **стабільні посилання** на елементи, які не «зсуваються» при вставках;
> - ти будуєш інші структури (стек, черга, дек, хеш-таблиця з ланцюжками);
> - це **навчання**: той самий принцип «вузли + посилання» лежить в основі дерев, графів, ланцюжків колізій.

---

## 2. Вузол і список: мінімальна модель

```ts
class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;
  constructor(value: T) { this.value = value; }
}
```

Сам список зберігає **три речі**:

- `head` — перший вузол (або `null` для порожнього списку);
- `tail` — останній вузол (щоб `push` працював за O(1));
- `length` — кількість вузлів (щоб не рахувати щоразу).

**Інваріанти** (правила, які мають бути істинними після кожної операції — саме їх порушення дає баги):

1. порожній список: `head === null`, `tail === null`, `length === 0`;
2. якщо `length === 1`: `head === tail`;
3. `tail.next === null` завжди;
4. якщо пройти від `head` по `next`, зустрінемо рівно `length` вузлів і закінчимо на `tail`.

---

## 3. Твоя реалізація (з `algorithms/src/algorithms/TS/linked-list.ts`)

```ts
class LinkedListNode {
  value: number;
  next: LinkedListNode | null;

  constructor(value: number) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  head: LinkedListNode | null;
  tail: LinkedListNode | null;
  length: number;

  constructor(value: number) {
    const newNode = new LinkedListNode(value);
    this.head = newNode;
    this.tail = newNode;
    this.length = 1;
  }

  push(value: number): this {
    const newNode = new LinkedListNode(value);
    if (this.length === 0) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      this.tail!.next = newNode;
      this.tail = newNode;
    }
    this.length++;
    return this;
  }

  pop() {
    if (this.length === 0) return null;
    if (this.length === 1) {
      const node = this.head;
      this.head = null;
      this.tail = null;
      this.length = 0;
      return node;
    }
    let temp = this.head;
    while (temp!.next?.next) temp = temp!.next;
    const removed = temp!.next;
    temp!.next = null;
    this.tail = temp;
    this.length--;
    return removed;
  }

  unshift(value: number): this {
    const newNode = new LinkedListNode(value);
    if (this.length === 0) {
      this.head = newNode;
      this.tail = newNode;
    } else {
      newNode.next = this.head;
      this.head = newNode;
    }
    this.length++;
    return this;
  }

  shift() {
    if (this.length === 0) return null;
    const removed = this.head;
    this.head = this.head!.next;
    this.length--;
    if (this.length === 0) this.tail = null;
    return removed;
  }

  get(index: number) {
    if (index < 0 || index >= this.length) return null;
    let temp = this.head;
    for (let i = 0; i < index; i++) {
      temp = temp?.next || null;
    }
    return temp;
  }

  set(index: number, value: number) {
    const temp = this.get(index);
    if (temp) {
      temp.value = value;
      return true;
    }
    return false;
  }

  insert(index: number, value: number): this {
    if (index < 0 || index > this.length) throw new Error("Invalid index");
    if (index === 0) return this.unshift(value);
    if (index === this.length) return this.push(value);

    const newNode = new LinkedListNode(value);
    const before = this.get(index - 1)!;
    newNode.next = before.next;
    before.next = newNode;
    this.length++;
    return this;
  }
  remove(index: number) {
    if (index < 0 || index > this.length) return false;
    if (index === 0) return this.shift();
    if (index === this.length - 1) return this.pop();

    const before = this.get(index - 1);
    const temp = before!.next;
    before!.next = temp!.next;
    temp!.next = null;
    this.length--;
    return temp;
  }

  reverse() {
    let temp = this.head;
    this.head = this.tail;
    this.tail = temp;
    let prew = null;
    let next = temp?.next;
    for (let i = 0; i < this.length; i++) {
      if (!temp) break;
      next = temp.next;
      temp.next = prew;
      prew = temp;
      temp = next;
    }
    return this;
  }
}
```

Вона робочa і правильно відтворює основні ідеї. Розберемо, що в ній добре і що варто виправити.

### Що добре

- є `head`, `tail`, `length` — правильна модель;
- `push` та `unshift` обробляють порожній список окремо;
- `get` повертає `null` поза межами замість падіння;
- `reverse` розвертає стрілки без додаткової пам'яті (це оптимальний підхід, O(n) часу і O(1) пам'яті);
- ідіоми `while (temp!.next?.next)` — компактно знаходять передостанній вузол у `pop`.

### Що варто виправити

**1. Конструктор вимагає початкове значення.** `new LinkedList(1)` одразу створює вузол, тому **порожній список створити неможливо**. А гілки `if (this.length === 0)` у `push`/`unshift` існують, але досягти їх можна лише після `pop`/`shift`. Правильніше — порожній список за замовчуванням: `new LinkedList()`.

**2. Баг у `remove`: перевірка межі.**

```ts
if (index < 0 || index > this.length) return false;   // ✗ має бути >=
```

При `index === length` умова не спрацьовує, `get(index - 1)` повертає останній вузол, його `next` дорівнює `null`, і наступний рядок `temp!.next` кидає `TypeError: Cannot read properties of null`. Перевірено запуском: `list.remove(list.length)` падає. Має бути `index >= this.length`.

**3. Нестабільні типи повернення.** `pop`/`shift`/`remove` повертають то `null`, то вузол, то `false`, то `undefined`. Наслідок: виклик `list.remove(5)` — це `false | null | Node`, і користувачеві доводиться перевіряти все. Краще один стиль: повертати **значення** або `undefined`.

**4. Повернення вузла замість значення.** `pop()` повертає `ListNode`, який ще тримає `next` (у `shift` — тримає посилання на наступний вузол). Це «протікає» всередину структури: зовнішній код може випадково змінити `removed.next` і зламати чужий список. У `pop`/`shift`/`remove` розривай зв'язок (`node.next = null`) і віддавай лише `value`.

**5. Лише `number`.** Узагальнений тип `LinkedList<T>` робить структуру придатною для будь-яких даних.

**6. Немає ітерації.** Без `[Symbol.iterator]` список неможливо ні розгорнути (`[...list]`), ні перебрати `for…of`, ні вивести зручно в тестах.

**7. `reverse` на порожньому списку** працює (цикл не виконується), але гілка `if (!temp) break` у циклі «страхує» від того, чого не буває. Простіше — цикл `while (curr !== null)`.

**8. `pop` — O(n).** Однозв'язний список не знає передостанній вузол. Це не помилка, а властивість структури (див. двозв'язний варіант у [LinkedList-variants.md](LinkedList-variants.md)).

---

## 4. Виправлена реалізація (варіант 1: однозв'язний список)

Ідея та сама, що в тебе, але з порожнім стартом, узагальненим типом, єдиними типами повернення, чистими межами та ітератором. Код протестований.

```ts
class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;

  constructor(value: T) {
    this.value = value;
  }
}

class LinkedList<T> {
  head: ListNode<T> | null = null;
  tail: ListNode<T> | null = null;
  length = 0;

  // O(1): додати в кінець
  push(value: T): this {
    const node = new ListNode(value);
    if (this.tail === null) {
      this.head = node;
    } else {
      this.tail.next = node;
    }
    this.tail = node;
    this.length++;
    return this;
  }

  // O(n): треба знайти передостанній вузол
  pop(): T | undefined {
    if (this.head === null) return undefined;
    if (this.head === this.tail) {
      const value = this.head.value;
      this.head = this.tail = null;
      this.length = 0;
      return value;
    }
    let prev = this.head;
    while (prev.next !== this.tail) prev = prev.next!;
    const value = this.tail!.value;
    prev.next = null;
    this.tail = prev;
    this.length--;
    return value;
  }

  // O(1): додати на початок
  unshift(value: T): this {
    const node = new ListNode(value);
    node.next = this.head;
    this.head = node;
    if (this.tail === null) this.tail = node;
    this.length++;
    return this;
  }

  // O(1): забрати з початку
  shift(): T | undefined {
    if (this.head === null) return undefined;
    const node = this.head;
    this.head = node.next;
    if (this.head === null) this.tail = null;
    node.next = null;
    this.length--;
    return node.value;
  }

  // O(n): дійти до індексу
  getNode(index: number): ListNode<T> | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return null;
    let node = this.head;
    for (let i = 0; i < index; i++) node = node!.next;
    return node;
  }

  get(index: number): T | undefined {
    return this.getNode(index)?.value;
  }

  set(index: number, value: T): boolean {
    const node = this.getNode(index);
    if (node === null) return false;
    node.value = value;
    return true;
  }

  // O(n) до знаходження місця, далі O(1)
  insert(index: number, value: T): boolean {
    if (!Number.isInteger(index) || index < 0 || index > this.length) return false;
    if (index === 0) return this.unshift(value), true;
    if (index === this.length) return this.push(value), true;
    const before = this.getNode(index - 1)!;
    const node = new ListNode(value);
    node.next = before.next;
    before.next = node;
    this.length++;
    return true;
  }

  remove(index: number): T | undefined {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return undefined;
    if (index === 0) return this.shift();
    if (index === this.length - 1) return this.pop();
    const before = this.getNode(index - 1)!;
    const node = before.next!;
    before.next = node.next;
    node.next = null;
    this.length--;
    return node.value;
  }

  // O(n), O(1) пам'яті: розвертаємо стрілки
  reverse(): this {
    let prev: ListNode<T> | null = null;
    let curr = this.head;
    this.tail = this.head;
    while (curr !== null) {
      const next: ListNode<T> | null = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    this.head = prev;
    return this;
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let node = this.head; node !== null; node = node.next) yield node.value;
  }

  toArray(): T[] {
    return [...this];
  }
}
```

### Як це працює — крок за кроком

Домовленість для малюнків: `[v]` — вузол, `→` — `next`, `∅` — `null`.

#### `push(value)` — O(1)

Було: `head → [1] → [2] ← tail`. Додаємо 3.

```
1) створили вузол:           [3|∅]
2) tail.next = newNode:      [1] → [2] → [3]      (tail ще вказує на [2])
3) tail = newNode:           [1] → [2] → [3]
                                           ▲ tail
```

Порядок важливий: спершу чіпляємо до старого `tail`, потім пересуваємо `tail`. Якщо їх переплутати — загубимо старий кінець.

Порожній список: `tail === null` → `head = node`, потім `tail = node`.

#### `unshift(value)` — O(1)

```
head → [1] → [2]        додаємо [0]

1) node.next = head:    [0] → [1] → [2]    (head ще на [1])
2) head = node:         head → [0] → [1] → [2]
```

Знову порядок: якщо спершу зробити `head = node`, ми втратимо старий `head`, і нікуди буде чіпляти `node.next`.

#### `shift()` — O(1)

```
head → [1] → [2] → [3]
1) node = head
2) head = node.next          head → [2] → [3]
3) node.next = null          [1] відчеплено
```

Якщо після цього `head === null` — список спорожнів, обов'язково скинь `tail = null` (інваріант 1).

#### `pop()` — O(n)

Щоб видалити останній, треба змінити `next` у **передостаннього**, а до нього можна дійти лише з початку:

```
head → [1] → [2] → [3]
            prev     tail
1) йдемо, поки prev.next !== tail
2) prev.next = null          head → [1] → [2]
3) tail = prev
```

#### `getNode(index)` — O(n)

Просто `index` разів робимо `node = node.next`. Це і є головний мінус: **немає прямого доступу**.

#### `insert(index, value)` — O(n) пошуку + O(1) вставки

```
head → [1] → [2] → [3]        insert(2, 9)
1) before = getNode(1) = [2]
2) node = [9], node.next = before.next      [9] → [3]
3) before.next = node                         [1] → [2] → [9] → [3]
```

Порядок знову критичний: `node.next = before.next` **перед** `before.next = node`.

#### `remove(index)` — O(n) пошуку + O(1) видалення

```
head → [1] → [2] → [3]        remove(1)
before = [1], node = [2]
before.next = node.next        [1] → [3]
node.next = null               [2] повністю відчеплено
```

#### `reverse()` — O(n), O(1) пам'яті

Три вказівники: `prev`, `curr`, `next`. На кожному кроці розвертаємо **одну стрілку**:

```
∅   [1] → [2] → [3]
prev curr

крок 1:  next = [2];  [1].next = ∅;   prev = [1];  curr = [2]
         ∅ ← [1]   [2] → [3]
крок 2:  next = [3];  [2].next = [1]; prev = [2];  curr = [3]
         ∅ ← [1] ← [2]   [3]
крок 3:  next = ∅;    [3].next = [2]; prev = [3];  curr = ∅
         ∅ ← [1] ← [2] ← [3]
кінець:  head = prev = [3];  tail = старий head = [1]
```

Заздалегідь збережений `next` — єдиний спосіб не загубити решту списку.

### Складність

| Операція | Час | Пам'ять |
|---|---|---|
| `push`, `unshift`, `shift` | O(1) | O(1) |
| `pop` | **O(n)** | O(1) |
| `get`, `set`, `getNode` | O(n) | O(1) |
| `insert`, `remove` | O(n) (пошук) + O(1) | O(1) |
| `reverse` | O(n) | O(1) |
| пошук за значенням | O(n) | O(1) |

---

## 5. Типові помилки

1. **Не оновити `tail`.** Після `pop`, `shift`, `remove` останнього елемента або `reverse` `tail` лишається вказувати на «мертвий» вузол — наступний `push` пишеться в нікуди.
2. **Не обнулити `head`/`tail` при спорожненні.** Список із `length === 0`, але `head !== null` — «привид».
3. **Переплутати порядок присвоєнь** при вставці (`before.next = node` до `node.next = before.next` → втрата хвоста).
4. **Забути про порожній список і список з одного елемента** — у них `head === tail` і більшість операцій має окрему гілку.
5. **Нескінченний цикл** при обході списку з циклом (`A → B → C → B`): `while (node)` ніколи не закінчиться.
6. **Втрата даних при `reverse`:** не зберегти `next` до перестановки стрілки.
7. **`index > length` замість `index >= length`** — класичний off-by-one.
8. **Повертати внутрішній вузол назовні** — зовнішній код може порушити інваріанти.

## 6. Як розв'язувати задачі на списки — алгоритм

1. Намалюй 3–4 вузли стрілками на папері.
2. Запиши, які **вказівники** тобі потрібні (`prev`, `curr`, `next`, `slow`, `fast`).
3. Для кожної операції визнач **порядок** присвоєнь так, щоб ніколи не губити посилання.
4. Додай **фіктивний вузол (dummy)**, якщо змінюється голова — менше `if`.
5. Перевір на трьох випадках: **порожній**, **1 елемент**, **2 елементи**.
6. Перевір, що інваріанти (`head`, `tail`, `length`) відновлені.

Далі: [LinkedList-variants.md](LinkedList-variants.md) — як ті самі операції стають простішими зі сторожовими вузлами, двозв'язними посиланнями та незмінністю.

## Задачі для закріплення

37 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чому в однозв'язному списку немає індексів і яка складність доступу за позицією `i`?

**2.** Скільки коштує вставка на початок списку з `head` і скільки — в кінець без вказівника `tail`?

**3.** Порівняйте масив і зв'язний список за `access`, `insert at head`, `delete by reference`.

**4.** Що дасть перетворення списку `1→2→3` на масив?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
;toArray(fromArray([1, 2, 3]))
```

**5.** Який `head.next.v` у списку `[1, 2, 3]`?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
;fromArray([1, 2, 3]).next.v
```

**6.** Що дасть `fromArray([])`?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
;fromArray([])
```

**7.** Скільки вузлів у списку після вставки на початок?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
;toArray(new Node(0, fromArray([1, 2])))
```

**8.** Напишіть `length(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const length = h => { let n = 0; for (; h; h = h.next) n++; return n }
```

**9.** Напишіть `append(head, v)` — додати в кінець (повертає head).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function append(head, v) {
  const n = new Node(v)
  if (!head) return n
  let c = head
  while (c.next) c = c.next
  c.next = n
  return head
}
```

**10.** Напишіть `prepend(head, v)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const prepend = (head, v) => new Node(v, head)
```

### Рівень 2. Методи й поведінка

**11.** Напишіть `find(head, v)` — повертає вузол або `null`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function find(h, v) {
  for (; h; h = h.next) if (h.v === v) return h
  return null
}
```

**12.** Напишіть `removeValue(head, v)` — видалити перше входження.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function removeValue(h, v) {
  if (!h) return null
  if (h.v === v) return h.next
  let c = h
  while (c.next && c.next.v !== v) c = c.next
  if (c.next) c.next = c.next.next
  return h
}
```

**13.** Напишіть `insertAt(head, i, v)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function insertAt(h, i, v) {
  if (i === 0) return new Node(v, h)
  let c = h
  for (let k = 0; k < i - 1 && c; k++) c = c.next
  if (!c) throw new RangeError('index out of range')
  c.next = new Node(v, c.next)
  return h
}
```

**14.** Напишіть `reverse(head)` ітеративно.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function reverse(h) {
  let prev = null
  while (h) { const n = h.next; h.next = prev; prev = h; h = n }
  return prev
}
```

**15.** Напишіть `middle(head)` — середній вузол (для парної довжини — другий).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function middle(h) {
  let s = h, f = h
  while (f && f.next) { s = s.next; f = f.next.next }
  return s
}
```

**16.** Напишіть `hasCycle(head)` (Флойд).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function hasCycle(h) {
  let s = h, f = h
  while (f && f.next) { s = s.next; f = f.next.next; if (s === f) return true }
  return false
}
```

**17.** Напишіть `mergeSorted(a, b)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function mergeSorted(a, b) {
  const d = new Node(0); let t = d
  while (a && b) { if (a.v <= b.v) { t.next = a; a = a.next } else { t.next = b; b = b.next } t = t.next }
  t.next = a ?? b
  return d.next
}
```

**18.** Напишіть `removeNthFromEnd(head, n)` за один прохід.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function removeNthFromEnd(h, n) {
  const d = new Node(0, h); let f = d, s = d
  for (let i = 0; i < n; i++) f = f.next
  while (f.next) { f = f.next; s = s.next }
  s.next = s.next.next
  return d.next
}
```

**19.** Напишіть `isPalindrome(head)` для списку.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function isPalindrome(h) {
  const a = toArray(h)
  return a.every((v, i) => v === a[a.length - 1 - i])
}
```

**20.** Напишіть `removeDuplicates(head)` у відсортованому списку.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function removeDuplicates(h) {
  for (let c = h; c && c.next;) c.v === c.next.v ? (c.next = c.next.next) : (c = c.next)
  return h
}
```

### Рівень 3. Нюанси та пастки

**21.** Напишіть `addTwoNumbers(a, b)` — числа у вигляді списків цифр у зворотному порядку.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function addTwoNumbers(a, b) {
  const d = new Node(0); let t = d, carry = 0
  while (a || b || carry) {
    const s = (a?.v ?? 0) + (b?.v ?? 0) + carry
    carry = Math.floor(s / 10)
    t.next = new Node(s % 10); t = t.next
    a = a?.next; b = b?.next
  }
  return d.next
}
```

**22.** Напишіть `intersection(a, b)` — перший спільний вузол двох списків.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function intersection(a, b) {
  let p = a, q = b
  while (p !== q) { p = p ? p.next : b; q = q ? q.next : a }
  return p
}
```

**23.** Напишіть `partition(head, x)` — спершу елементи `< x`, потім решта, зі збереженням порядку.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function partition(h, x) {
  const lo = new Node(0), hi = new Node(0); let a = lo, b = hi
  for (; h; h = h.next) h.v < x ? (a = a.next = new Node(h.v)) : (b = b.next = new Node(h.v))
  a.next = hi.next
  return lo.next
}
```

**24.** Напишіть `rotateRight(head, k)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function rotateRight(h, k) {
  const a = toArray(h)
  if (!a.length) return null
  k %= a.length
  return fromArray(k ? [...a.slice(-k), ...a.slice(0, -k)] : a)
}
```

**25.** Напишіть `swapPairs(head)` — міняти сусідні вузли.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function swapPairs(h) {
  const d = new Node(0, h); let p = d
  while (p.next && p.next.next) {
    const a = p.next, b = a.next
    a.next = b.next; b.next = a; p.next = b; p = a
  }
  return d.next
}
```

**26.** Напишіть `cycleStart(head)` — вузол початку циклу.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function cycleStart(h) {
  let s = h, f = h
  while (f && f.next) {
    s = s.next; f = f.next.next
    if (s === f) { s = h; while (s !== f) { s = s.next; f = f.next } return s }
  }
  return null
}
```

**27.** Напишіть `sortList(head)` — сортування злиттям списку.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function sortList(h) {
  if (!h || !h.next) return h
  let s = h, f = h.next
  while (f && f.next) { s = s.next; f = f.next.next }
  const b = s.next; s.next = null
  let a = sortList(h); const c = sortList(b)
  const d = new Node(0); let t = d, x = a, y = c
  while (x && y) x.v <= y.v ? ((t = t.next = x), (x = x.next)) : ((t = t.next = y), (y = y.next))
  t.next = x ?? y
  return d.next
}
```

**28.** Напишіть `reverseBetween(head, m, n)` — розвернути частину списку (позиції з 1).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function reverseBetween(h, m, n) {
  const d = new Node(0, h); let p = d
  for (let i = 1; i < m; i++) p = p.next
  let cur = p.next
  for (let i = 0; i < n - m; i++) { const nx = cur.next; cur.next = nx.next; nx.next = p.next; p.next = nx }
  return d.next
}
```

**29.** Напишіть `reverseKGroup(head, k)` — розвертати групи по `k`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function reverseKGroup(h, k) {
  const a = toArray(h), out = []
  for (let i = 0; i < a.length; i += k) { const g = a.slice(i, i + k); out.push(...(g.length === k ? g.reverse() : g)) }
  return fromArray(out)
}
```

**30.** Напишіть `deleteMiddle(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function deleteMiddle(h) {
  if (!h.next) return null
  let s = h, f = h.next.next
  while (f && f.next) { s = s.next; f = f.next.next }
  s.next = s.next.next
  return h
}
```

### Рівень 4. Практика й реалізація

**31.** Напишіть `oddEven(head)` — спочатку вузли з непарними позиціями, потім з парними.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function oddEven(h) {
  if (!h) return h
  let o = h, e = h.next; const ev = e
  while (e && e.next) { o.next = e.next; o = o.next; e.next = o.next; e = e.next }
  o.next = ev
  return h
}
```

**32.** Напишіть `toArrayRecursive(head)` рекурсивно. Який масив для `[1, 2, 3]`?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const toArrayRecursive = h => (h ? [h.v, ...toArrayRecursive(h.next)] : [])
```

**33.** Напишіть `kthFromEnd(head, k)` двома вказівниками.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function kthFromEnd(h, k) {
  let f = h, s = h
  for (let i = 0; i < k; i++) { if (!f) return null; f = f.next }
  while (f) { f = f.next; s = s.next }
  return s?.v
}
```

**34.** Напишіть `mergeKLists(lists)` — злиття `k` відсортованих списків (послідовним злиттям).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function merge2(a, b) {
  const d = new Node(0); let t = d
  while (a && b) a.v <= b.v ? ((t = t.next = a), (a = a.next)) : ((t = t.next = b), (b = b.next))
  t.next = a ?? b
  return d.next
}
const mergeKLists = lists => lists.reduce(merge2, null)
```

**35.** Напишіть `copyRandomList`-спрощення: `cloneList(head)` — глибока копія зі збереженням порядку. Чи вузли копії ті самі об'єкти?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const cloneList = h => (h ? new Node(h.v, cloneList(h.next)) : null)
```

**36.** Напишіть `isSorted(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function isSorted(h) {
  for (; h && h.next; h = h.next) if (h.v > h.next.v) return false
  return true
}
```

**37.** Напишіть `listToNumber(head)` для списку цифр (старший розряд першим).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const listToNumber = h => toArray(h).reduce((n, d) => n * 10 + d, 0)
```

### Відповіді

1. Вузли зв'язані лише вказівниками `next`; щоб дійти до `i`-го, треба пройти `i` кроків — `O(i)`.
2. На початок — `O(1)`; в кінець без `tail` — `O(n)` (потрібен обхід до останнього вузла).
3. Масив: доступ `O(1)`, вставка на початок `O(n)`; список: доступ `O(n)`, вставка на початок `O(1)`, видалення за посиланням у двозв'язному — `O(1)`.
4. `[1, 2, 3]`
5. `2`
6. `null`
7. `[0, 1, 2]`
8. Виклик `[length(fromArray([1, 2, 3])), length(null)]` → `[3, 0]`
9. Виклик `toArray(append(fromArray([1, 2]), 3))` → `[1, 2, 3]`
10. Виклик `toArray(prepend(fromArray([2, 3]), 1))` → `[1, 2, 3]`
11. Виклик `[find(fromArray([1, 2, 3]), 2)?.v, find(fromArray([1]), 9)]` → `[2, null]`
12. Виклик `[toArray(removeValue(fromArray([1, 2, 3]), 2)), toArray(removeValue(fromArray([1, 2, 3]), 1)), toArray(removeValue(fromArray([1]), 5))]` → `[[1, 3], [2, 3], [1]]`
13. Виклик `[toArray(insertAt(fromArray([1, 3]), 1, 2)), toArray(insertAt(fromArray([2, 3]), 0, 1)), toArray(insertAt(fromArray([1]), 1, 2))]` → `[[1, 2, 3], [1, 2, 3], [1, 2]]`
14. Виклик `toArray(reverse(fromArray([1, 2, 3, 4])))` → `[4, 3, 2, 1]`
15. Виклик `[middle(fromArray([1, 2, 3, 4, 5])).v, middle(fromArray([1, 2, 3, 4])).v]` → `[3, 3]`
16. Виклик `(() => { const a = fromArray([1, 2, 3]); const t = a.next.next; t.next = a.next; return [hasCycle(a), hasCycle(fromArray([1, 2, 3]))]; })()` → `[true, false]`
17. Виклик `toArray(mergeSorted(fromArray([1, 3, 5]), fromArray([2, 4, 6])))` → `[1, 2, 3, 4, 5, 6]`
18. Виклик `[toArray(removeNthFromEnd(fromArray([1, 2, 3, 4, 5]), 2)), toArray(removeNthFromEnd(fromArray([1]), 1))]` → `[[1, 2, 3, 5], []]`
19. Виклик `[isPalindrome(fromArray([1, 2, 2, 1])), isPalindrome(fromArray([1, 2]))]` → `[true, false]`
20. Виклик `toArray(removeDuplicates(fromArray([1, 1, 2, 3, 3, 3])))` → `[1, 2, 3]`
21. Виклик `toArray(addTwoNumbers(fromArray([2, 4, 3]), fromArray([5, 6, 4])))` → `[7, 0, 8]`
22. Виклик `(() => { const tail = fromArray([8, 9]); const a = new Node(1, new Node(2, tail)); const b = new Node(5, tail); return [intersection(a, b)?.v, intersection(fromArray([1]), fromArray([2]))]; })()` → `[8, null]`
23. Виклик `toArray(partition(fromArray([1, 4, 3, 2, 5, 2]), 3))` → `[1, 2, 2, 4, 3, 5]`
24. Виклик `toArray(rotateRight(fromArray([1, 2, 3, 4, 5]), 2))` → `[4, 5, 1, 2, 3]`
25. Виклик `toArray(swapPairs(fromArray([1, 2, 3, 4, 5])))` → `[2, 1, 4, 3, 5]`
26. Виклик `(() => { const a = fromArray([1, 2, 3, 4]); a.next.next.next.next = a.next; return [cycleStart(a).v, cycleStart(fromArray([1, 2]))]; })()` → `[2, null]`
27. Виклик `toArray(sortList(fromArray([4, 2, 1, 3, 5, 0])))` → `[0, 1, 2, 3, 4, 5]`
28. Виклик `toArray(reverseBetween(fromArray([1, 2, 3, 4, 5]), 2, 4))` → `[1, 4, 3, 2, 5]`
29. Виклик `toArray(reverseKGroup(fromArray([1, 2, 3, 4, 5]), 2))` → `[2, 1, 4, 3, 5]`
30. Виклик `[toArray(deleteMiddle(fromArray([1, 2, 3, 4, 5]))), toArray(deleteMiddle(fromArray([1, 2, 3, 4]))), deleteMiddle(fromArray([1]))]` → `[[1, 2, 4, 5], [1, 2, 4], null]`
31. Виклик `toArray(oddEven(fromArray([1, 2, 3, 4, 5])))` → `[1, 3, 5, 2, 4]`
32. Виклик `toArrayRecursive(fromArray([1, 2, 3]))` → `[1, 2, 3]`
33. Виклик `[kthFromEnd(fromArray([1, 2, 3, 4, 5]), 2), kthFromEnd(fromArray([1]), 3)]` → `[4, null]`
34. Виклик `toArray(mergeKLists([fromArray([1, 4, 5]), fromArray([1, 3, 4]), fromArray([2, 6])]))` → `[1, 1, 2, 3, 4, 4, 5, 6]`
35. Виклик `(() => { const a = fromArray([1, 2]); const b = cloneList(a); return [toArray(b), a === b, a.next === b.next]; })()` → `[[1, 2], false, false]`
36. Виклик `[isSorted(fromArray([1, 2, 2, 3])), isSorted(fromArray([1, 3, 2]))]` → `[true, false]`
37. Виклик `[listToNumber(fromArray([1, 0, 1])), listToNumber(fromArray([4, 2]))]` → `[101, 42]`
