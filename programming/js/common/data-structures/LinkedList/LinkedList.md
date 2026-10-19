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
