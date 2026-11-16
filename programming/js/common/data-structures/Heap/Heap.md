# Heap — купа: найбільший (або найменший) елемент завжди нагорі

> Купа — це структура для відповіді на питання «**який елемент зараз найважливіший?**» за O(1) і для швидкого додавання/видалення за O(log n). На ній будують **черги з пріоритетом**, алгоритм Дейкстри, планувальники задач, «top-K» і **heapsort**. Її вражаюча особливість: це **дерево, що живе у звичайному масиві**.

## 1. Що таке купа

**Двійкова купа** — це **повне** бінарне дерево (усі рівні заповнені, крім, можливо, останнього, який заповнюється зліва направо), у якому виконується **властивість купи**:

- **макс-купа (max-heap):** кожен батько **≥** своїх дітей → найбільший у корені;
- **мін-купа (min-heap):** кожен батько **≤** дітей → найменший у корені.

```
макс-купа:           50
                   ┌──┴──┐
                  30     40
                 ┌─┴─┐  ┌┘
                10  20 35
```

Купа **не відсортована повністю**: між братами й між рівнями порядку немає (30 і 40 можуть бути в будь-якому порядку). Гарантується лише «батько ≥ діти». Саме тому вона швидша за повне сортування.

> Не плутай **купу (heap) як структуру даних** з **купою (heap) пам'яті**, де живуть об'єкти. Збіг назв — випадковий.

## 2. Секрет: дерево в масиві

Оскільки дерево **повне**, його можна записати в масив рівень за рівнем без жодних вказівників:

```
дерево:           50                 індекс:  0   1   2   3   4   5
                ┌──┴──┐              масив:  [50, 30, 40, 10, 20, 35]
               30     40
              ┌─┴─┐  ┌┘
             10  20 35
```

Формули (для індексу `i`):

| Хто | Індекс |
|---|---|
| лівий син | `2i + 1` |
| правий син | `2i + 2` |
| батько | `⌊(i − 1) / 2⌋` |

Перевірка: для `i = 1` (30): діти `3` (10) і `4` (20), батько `⌊0/2⌋ = 0` (50) ✓.

Звідси перевага: **нуль вказівників**, суцільна пам'ять (кеш-дружній), прості формули.

## 3. Твоя реалізація (`algorithms/src/algorithms/TS/heap.ts`)

```ts
class Heap {
    private heap: number[] = [];

    public getHeap() {
        return [...this.heap];
    }

    private leftChild(index: number) {
        return 2 * index + 1;
    }
    private rightChild(index: number) {
        return 2 * index + 2;
    }
    private parent(index: number) {
        return Math.floor((index - 1) / 2);
    }
    private swap(index1: number, index2: number) {
        [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
    }

    insert(value: number) {
        this.heap.push(value);
        let current = this.heap.length - 1;

        while (current > 0 && this.heap[current] > this.heap[this.parent(current)]) {
            this.swap(current, this.parent(current));
            current = this.parent(current);
        }
    }

    remove() {
        if (this.heap.length === 0) return undefined;
        if (this.heap.length === 1) return this.heap.pop();
        const maxValue = this.heap[0];
        this.heap[0] = this.heap.pop()!;
        this.sinkDown(0);
        return maxValue;
    }

    sinkDown(index: number) {
        let maxIndex = index;
        let size = this.heap.length;
        while (true){
            let leftIndex = this.leftChild(index);
            let rightIndex = this.rightChild(index);

            if (leftIndex < size && this.heap[leftIndex] > this.heap[maxIndex]) {
                maxIndex = leftIndex;
            }

            if (rightIndex < size && this.heap[rightIndex] > this.heap[maxIndex]) {
                maxIndex = rightIndex;
            }

            if (maxIndex !== index) {
                this.swap(index, maxIndex);
                index = maxIndex;
            } else {
                break;
            }
            
        }
    }
}
```

### Що добре
- правильна ідея: масив + формули індексів (`leftChild`, `rightChild`, `parent`);
- `insert`: додати в кінець і «спливати» вгору поки більший за батька — вірно;
- `remove`: взяти корінь, на його місце останній елемент і «потонути» (`sinkDown`) — вірно;
- `sinkDown` правильно вибирає більшого з дітей. Перевірено: після вставок 10, 20, 30, 15 масив `[30, 15, 20, 10]` — коректна макс-купа.

### Що покращити
1. **Тільки макс-купа.** Для мін-купи (Дейкстра, «K найменших») треба змінювати порівняння в двох місцях. Краще передавати **компаратор**.
2. **Немає `peek()` і `size`** — подивитись на вершину без видалення.
3. **Немає побудови з масиву за O(n)** (`heapify`) — вставка по одному коштує O(n log n).
4. **`sinkDown` публічний** — внутрішня деталь, що ламає інваріант, якщо викликати ззовні.
5. **Лише `number`.** Для задач потрібні об'єкти з пріоритетом.
6. Немає **черги з пріоритетом** поверх купи (головне застосування).
7. Метод `remove()` називається так, але видаляє лише **корінь** — точніше `pop()`/`extract()`.

## 4. Виправлена реалізація (узагальнена купа з компаратором)

```ts
// Двійкова купа (binary heap) у масиві. Компаратор задає тип: мін-купа чи макс-купа.
class Heap<T> {
  private a: T[] = [];
  // before(x, y) === true, якщо x має бути ближче до кореня, ніж y
  constructor(private before: (x: T, y: T) => boolean) {}

  static from<T>(items: T[], before: (x: T, y: T) => boolean): Heap<T> {
    const heap = new Heap<T>(before);
    heap.a = [...items];
    // побудова купи за O(n): sink від останнього батька до кореня
    for (let i = (heap.a.length >> 1) - 1; i >= 0; i--) heap.sinkDown(i);
    return heap;
  }

  get size(): number {
    return this.a.length;
  }
  peek(): T | undefined {
    return this.a[0];
  }
  toArray(): T[] {
    return [...this.a];
  }

  // індекси: батько (i−1)/2, діти 2i+1 та 2i+2
  private parent = (i: number) => (i - 1) >> 1;
  private left = (i: number) => 2 * i + 1;
  private right = (i: number) => 2 * i + 2;
  private swap(i: number, j: number) {
    [this.a[i], this.a[j]] = [this.a[j], this.a[i]];
  }

  // O(log n): додаємо в кінець і «спливаємо» вгору
  push(value: T): this {
    this.a.push(value);
    this.bubbleUp(this.a.length - 1);
    return this;
  }

  // O(log n): забираємо корінь, на його місце — останній, і «тонемо» вниз
  pop(): T | undefined {
    if (this.a.length === 0) return undefined;
    const top = this.a[0];
    const last = this.a.pop()!;
    if (this.a.length > 0) {
      this.a[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0 && this.before(this.a[i], this.a[this.parent(i)])) {
      this.swap(i, this.parent(i));
      i = this.parent(i);
    }
  }

  private sinkDown(i: number): void {
    const n = this.a.length;
    for (;;) {
      let best = i;
      const l = this.left(i);
      const r = this.right(i);
      if (l < n && this.before(this.a[l], this.a[best])) best = l;
      if (r < n && this.before(this.a[r], this.a[best])) best = r;
      if (best === i) return;
      this.swap(i, best);
      i = best;
    }
  }
}
```


Допоміжні конструктори:

```ts
const minHeap = <T extends number | string>() => new Heap<T>((x, y) => x < y);
const maxHeap = <T extends number | string>() => new Heap<T>((x, y) => x > y);
```


### Як це працює

#### `push(value)` — «спливання» (bubble up) — O(log n)

Додаємо в **кінець** масиву (зберігаємо «повноту» дерева), потім міняємо з батьком, поки новий елемент «важливіший» за батька.

```
макс-купа [30, 15, 20, 10]; push(40):

[30, 15, 20, 10, 40]          40 на індексі 4, батько = ⌊3/2⌋ = 1 (15): 40 > 15 → міняємо
[30, 40, 20, 10, 15]          тепер індекс 1, батько 0 (30): 40 > 30 → міняємо
[40, 30, 20, 10, 15]          індекс 0 — корінь, зупинка
```

Спливання проходить не більше висоти дерева: `⌊log₂ n⌋` кроків.

#### `pop()` — «занурення» (sink down) — O(log n)

Корінь забираємо. Щоб не лишилось дірки, **останній** елемент ставимо в корінь і занурюємо: міняємо з **більшим** (для макс-купи) із синів, поки він не стане ≥ обох.

```
[40, 30, 20, 10, 15]; pop() → 40

1) останній (15) → у корінь:     [15, 30, 20, 10]
2) сини кореня: 30 і 20; більший 30 > 15 → міняємо:   [30, 15, 20, 10]
3) індекс 1: діти 3 (10) — 15 ≥ 10 → зупинка
результат: [30, 15, 20, 10]
```

Чому «більший» з дітей? Інакше менший син став би батьком більшого брата — порушення властивості.

#### `Heap.from(items)` — побудова за O(n)

Замість `n` вставок (O(n log n)) робимо **sinkDown від останнього батька до кореня**:

```
for (let i = (n >> 1) - 1; i >= 0; i--) sinkDown(i)
```

Чому це O(n), а не O(n log n)? Половина вузлів — листки (не потребують роботи), чверть занурюється максимум на 1, і так далі: сума `n/4·1 + n/8·2 + n/16·3 + … = O(n)`.

## 5. Черга з пріоритетом (Priority Queue)

**Черга з пріоритетом:** елементи виходять не в порядку надходження (FIFO), а **за пріоритетом**. Купа — її ідеальна реалізація: `enqueue` = `push`, `dequeue` = `pop`.

```ts
// Черга з пріоритетом поверх купи
class PriorityQueue<T> {
  private heap: Heap<{item: T; priority: number; seq: number}>;
  private seq = 0; // для стабільності: однаковий пріоритет → за порядком додавання
  constructor() {
    this.heap = new Heap((x, y) => x.priority < y.priority || (x.priority === y.priority && x.seq < y.seq));
  }
  enqueue(item: T, priority: number): void {
    this.heap.push({item, priority, seq: this.seq++});
  }
  dequeue(): T | undefined {
    return this.heap.pop()?.item;
  }
  get size(): number {
    return this.heap.size;
  }
}
```


Зверніть увагу на `seq`: купа **нестабільна** — елементи з однаковим пріоритетом можуть вийти в довільному порядку. Лічильник `seq` додається в компаратор як другий ключ і робить порядок передбачуваним (перший доданий — перший вийшов). Перевірено тестом: `urgent` перед `urgent2`.

### Де це потрібно
- **Планувальник задач**, черги повідомлень з пріоритетом;
- **Дейкстра** (найкоротший шлях), **A\***, Прім (мінімальне остовне дерево);
- **Top-K**: K найбільших з потоку — мін-купа розміру K; новий елемент більший за корінь → замінити корінь;
- **Медіана потоку** — дві купи (макс для нижньої половини, мін для верхньої);
- **Heapsort** — побудувати макс-купу, потім по одному забирати максимум: O(n log n), O(1) додаткової пам'яті;
- злиття K відсортованих списків.

## 6. Складність

| Операція | Час |
|---|---|
| `peek` (корінь) | **O(1)** |
| `push` | O(log n) |
| `pop` (видалити корінь) | O(log n) |
| `Heap.from(array)` | **O(n)** |
| пошук довільного елемента | O(n) — купа для цього не призначена |
| пам'ять | O(n), без вказівників |

## 7. Купа чи інші структури?

| Потрібно | Структура |
|---|---|
| завжди брати мінімум/максимум | **купа** |
| відсортований порядок всіх елементів | BST/відсортований масив |
| пошук за ключем | хеш-таблиця |
| звичайний порядок надходження | черга |

## 8. Типові помилки

1. Плутати **індекси дітей**: `2i + 1` і `2i + 2` (а не `2i` і `2i + 1` — це для нумерації з 1).
2. Формула батька: `(i - 1) >> 1`; для нуля — корінь, батька немає.
3. При `sinkDown` порівнювати з **обома** дітьми й вибирати **кращого**.
4. Забути перевірити межі (`l < n`, `r < n`).
5. У `pop` не обробити випадки порожньої купи й купи з одного елемента (`pop` останнього, а потім присвоєння).
6. Вважати купу відсортованим масивом (тільки корінь гарантовано кращий).
7. Очікувати стабільності для однакових пріоритетів.
8. Шукати/видаляти довільний елемент — це O(n); для цього потрібна додаткова мапа індексів.

## 9. Алгоритм

1. Купа = масив; діти `2i+1`, `2i+2`; батько `(i−1)>>1`.
2. **push:** в кінець → спливання, поки кращий за батька.
3. **pop:** взяти корінь → останній у корінь → занурення до кращого з дітей.
4. **Побудова:** sinkDown від останнього батька до 0.
5. Тип купи визначає компаратор (`<` для мін, `>` для макс).
6. Потрібен пріоритет → черга з пріоритетом поверх купи.

## Задачі для закріплення

26 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яку властивість має мін-купа і чим вона відрізняється від бінарного дерева пошуку?

**2.** Як у масиві знайти батька й дітей елемента з індексом `i`?

**3.** Яка складність `push`, `pop`, `peek` і побудови купи з `n` елементів?

**4.** Чому купа не підходить для швидкого пошуку довільного елемента?

**5.** Який індекс батька для елементів з індексами 1, 2, 5, 6?

```js
[1, 2, 5, 6].map(i => (i - 1) >> 1)
```

**6.** Які індекси дітей у вузла `i = 3`?

```js
[2 * 3 + 1, 2 * 3 + 2]
```

**7.** Чи є масив `[1, 3, 2, 7, 4, 5]` мін-купою? Перевірте кожну пару батько-дитина.

```js
(() => { const a = [1, 3, 2, 7, 4, 5]; return a.every((x, i) => i === 0 || a[(i - 1) >> 1] <= x); })()
```

### Рівень 2. Методи й поведінка

**8.** Чи є масив `[1, 3, 2, 0, 4]` мін-купою?

```js
(() => { const a = [1, 3, 2, 0, 4]; return a.every((x, i) => i === 0 || a[(i - 1) >> 1] <= x); })()
```

**9.** Скільки рівнів у купі з 15 елементів?

```js
Math.floor(Math.log2(15)) + 1
```

**10.** Реалізуйте `MinHeap` (`push`, `pop`, `peek`). У якому порядку вилучаться `5, 3, 8, 1, 9, 2`?

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
```

**11.** Який вигляд масиву `a` у купі після вставки `5, 3, 8, 1`?

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
```

**12.** Зробіть макс-купу через компаратор. Що вилучиться першим із `[4, 9, 1]`?

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
```

**13.** Напишіть `heapSort(arr)` через `MinHeap`.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function heapSort(arr) { const h = new MinHeap(); arr.forEach(x => h.push(x)); const o = []; while (h.size) o.push(h.pop()); return o }
```

**14.** Напишіть `kSmallest(arr, k)` через `MinHeap`.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function kSmallest(arr, k) { const h = new MinHeap(); arr.forEach(x => h.push(x)); return Array.from({ length: k }, () => h.pop()) }
```

### Рівень 3. Нюанси та пастки

**15.** Напишіть `kLargest(arr, k)` через мін-купу розміром `k`.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function kLargest(arr, k) {
  const h = new MinHeap()
  for (const x of arr) { h.push(x); if (h.size > k) h.pop() }
  return [...h.a].sort((a, b) => b - a)
}
```

**16.** Напишіть `kthLargest(arr, k)`.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function kthLargest(arr, k) { const h = new MinHeap(); for (const x of arr) { h.push(x); if (h.size > k) h.pop() } return h.peek() }
```

**17.** Напишіть `mergeKSorted(lists)` через купу кортежів `[значення, список, індекс]`.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function mergeKSorted(lists) {
  const h = new MinHeap((a, b) => a[0] - b[0]), out = []
  lists.forEach((l, i) => l.length && h.push([l[0], i, 0]))
  while (h.size) {
    const [v, i, j] = h.pop(); out.push(v)
    if (j + 1 < lists[i].length) h.push([lists[i][j + 1], i, j + 1])
  }
  return out
}
```

**18.** Напишіть `RunningMedian` на двох купах. Медіана після потоку `5, 15, 1, 3`?

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
class RunningMedian {
  lo = new MinHeap((a, b) => b - a)
  hi = new MinHeap()
  add(x) {
    this.lo.push(x); this.hi.push(this.lo.pop())
    if (this.hi.size > this.lo.size) this.lo.push(this.hi.pop())
  }
  median() { return this.lo.size > this.hi.size ? this.lo.peek() : (this.lo.peek() + this.hi.peek()) / 2 }
}
```

**19.** Напишіть `PriorityQueue` із пріоритетом: менше число — раніше. Порядок завдань?

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
class PriorityQueue {
  h = new MinHeap((a, b) => a.p - b.p)
  enqueue(task, p) { this.h.push({ task, p }) }
  dequeue() { return this.h.pop()?.task }
}
```

**20.** Напишіть `lastStoneWeight(stones)` через макс-купу (розбити два найважчі).

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function lastStoneWeight(s) {
  const h = new MinHeap((a, b) => b - a)
  s.forEach(x => h.push(x))
  while (h.size > 1) { const a = h.pop(), b = h.pop(); if (a !== b) h.push(a - b) }
  return h.peek() ?? 0
}
```

**21.** Напишіть `connectRopes(ropes)` — мінімальна вартість з'єднання мотузок.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function connectRopes(r) {
  const h = new MinHeap(); r.forEach(x => h.push(x)); let cost = 0
  while (h.size > 1) { const s = h.pop() + h.pop(); cost += s; h.push(s) }
  return cost
}
```

### Рівень 4. Практика й реалізація

**22.** Напишіть `topKFrequentWords(words, k)` через сортування за частотою й алфавітом.

```js
function topKFrequentWords(words, k) {
  const m = new Map(); words.forEach(w => m.set(w, (m.get(w) ?? 0) + 1))
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k).map(p => p[0])
}
```

**23.** Напишіть `kClosest(points, k)` — `k` точок, найближчих до початку координат.

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function kClosest(points, k) {
  const h = new MinHeap((a, b) => b.d - a.d)
  for (const p of points) { h.push({ p, d: p[0] ** 2 + p[1] ** 2 }); if (h.size > k) h.pop() }
  return h.a.map(x => x.p).sort((a, b) => a[0] ** 2 + a[1] ** 2 - (b[0] ** 2 + b[1] ** 2))
}
```

**24.** Напишіть `meetingRooms(intervals)` — мінімум кімнат (купа часів закінчення).

```js
class MinHeap {
  constructor(cmp = (a, b) => a - b) { this.a = []; this.cmp = cmp }
  get size() { return this.a.length }
  peek() { return this.a[0] }
  push(x) { this.a.push(x); let i = this.a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (this.cmp(this.a[i], this.a[p]) >= 0) break; [this.a[i], this.a[p]] = [this.a[p], this.a[i]]; i = p } }
  pop() {
    if (!this.a.length) return undefined
    const top = this.a[0], last = this.a.pop()
    if (this.a.length) { this.a[0] = last; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < this.a.length && this.cmp(this.a[l], this.a[m]) < 0) m = l; if (r < this.a.length && this.cmp(this.a[r], this.a[m]) < 0) m = r; if (m === i) break; [this.a[i], this.a[m]] = [this.a[m], this.a[i]]; i = m } }
    return top
  }
}
function meetingRooms(iv) {
  const h = new MinHeap(); let rooms = 0
  for (const [s, e] of [...iv].sort((a, b) => a[0] - b[0])) {
    if (h.size && h.peek() <= s) h.pop()
    h.push(e); rooms = Math.max(rooms, h.size)
  }
  return rooms
}
```

**25.** Напишіть `isMinHeap(arr)`.

```js
const isMinHeap = a => a.every((x, i) => i === 0 || a[(i - 1) >> 1] <= x)
```

**26.** Напишіть `heapify(arr)` — побудова мін-купи на місці за `O(n)` (sift-down від середини). Результат для `[5, 3, 8, 1, 9, 2]`?

```js
function heapify(a) {
  const n = a.length
  for (let s = (n >> 1) - 1; s >= 0; s--) {
    let i = s
    for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < n && a[l] < a[m]) m = l; if (r < n && a[r] < a[m]) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m }
  }
  return a
}
```

### Відповіді

1. У мін-купі кожен батько не більший за дітей (мінімум у корені); порядок між братами не задано, на відміну від BST, де ліве піддерево менше, праве більше.
2. Батько `(i - 1) >> 1`, діти `2i + 1` і `2i + 2`.
3. `push` і `pop` — `O(log n)`, `peek` — `O(1)`, побудова через heapify — `O(n)`.
4. Вона впорядкована лише частково: пошук довільного значення — `O(n)`.
5. `[0, 0, 2, 2]`
6. `[7, 8]`
7. `true`
8. `false`
9. `4`
10. Виклик `(() => { const h = new MinHeap(); [5, 3, 8, 1, 9, 2].forEach(x => h.push(x)); const o = []; while (h.size) o.push(h.pop()); return o; })()` → `[1, 2, 3, 5, 8, 9]`
11. Виклик `(() => { const h = new MinHeap(); [5, 3, 8, 1].forEach(x => h.push(x)); return h.a; })()` → `[1, 3, 8, 5]`
12. Виклик `(() => { const h = new MinHeap((a, b) => b - a); [4, 9, 1].forEach(x => h.push(x)); return [h.pop(), h.pop(), h.pop(), h.pop()]; })()` → `[9, 4, 1, undefined]`
13. Виклик `heapSort([5, 2, 9, 1, 5, 6])` → `[1, 2, 5, 5, 6, 9]`
14. Виклик `kSmallest([7, 10, 4, 3, 20, 15], 3)` → `[3, 4, 7]`
15. Виклик `kLargest([3, 2, 1, 5, 6, 4], 2)` → `[6, 5]`
16. Виклик `[kthLargest([3, 2, 1, 5, 6, 4], 2), kthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4)]` → `[5, 4]`
17. Виклик `mergeKSorted([[1, 4, 7], [2, 5, 8], [3, 6, 9]])` → `[1, 2, 3, 4, 5, 6, 7, 8, 9]`
18. Виклик `(() => { const r = new RunningMedian(); return [5, 15, 1, 3].map(x => (r.add(x), r.median())); })()` → `[5, 10, 5, 4]`
19. Виклик `(() => { const q = new PriorityQueue(); q.enqueue('low', 5); q.enqueue('urgent', 1); q.enqueue('mid', 3); return [q.dequeue(), q.dequeue(), q.dequeue(), q.dequeue()]; })()` → `['urgent', 'mid', 'low', undefined]`
20. Виклик `[lastStoneWeight([2, 7, 4, 1, 8, 1]), lastStoneWeight([1, 1])]` → `[1, 0]`
21. Виклик `connectRopes([4, 3, 2, 6])` → `29`
22. Виклик `topKFrequentWords(['i', 'love', 'leetcode', 'i', 'love', 'coding'], 2)` → `['i', 'love']`
23. Виклик `kClosest([[1, 3], [-2, 2], [5, 8], [0, 1]], 2)` → `[[0, 1], [-2, 2]]`
24. Виклик `[meetingRooms([[0, 30], [5, 10], [15, 20]]), meetingRooms([[7, 10], [2, 4]])]` → `[2, 1]`
25. Виклик `[isMinHeap([1, 3, 2, 7, 4, 5]), isMinHeap([2, 1])]` → `[true, false]`
26. Виклик `heapify([5, 3, 8, 1, 9, 2])` → `[1, 3, 2, 5, 9, 8]`
