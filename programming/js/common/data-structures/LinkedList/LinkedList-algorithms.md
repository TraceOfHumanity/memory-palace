# LinkedList — класичні задачі

Продовження [LinkedList.md](LinkedList.md) і [LinkedList-variants.md](LinkedList-variants.md). Тут — прийоми, які повторюються в десятках задач. У кожної: ідея, чому це працює, код (протестований), складність.

У прикладах вузол — простий об'єкт `{value, next}`, а допоміжні `fromArray`/`toArray` будують і виводять список.

## Три головні прийоми

1. **Два вказівники різної швидкості** (slow/fast) — середина, цикл, n-й з кінця.
2. **Фіктивний вузол (dummy)** — коли може змінитись голова.
3. **Розворот стрілок «на місці»** — паліндром, перестановки, перевороти частин.

---

## Повний код

```ts
type N = {value: number; next: N | null};

const fromArray = (items: number[]): N | null => {
  let head: N | null = null;
  for (let i = items.length - 1; i >= 0; i--) head = {value: items[i], next: head};
  return head;
};
const toArray = (head: N | null): number[] => {
  const out: number[] = [];
  for (let n = head; n; n = n.next) out.push(n.value);
  return out;
};

// 1. Середина списку: повільний робить 1 крок, швидкий — 2. Коли швидкий в кінці, повільний посередині.
function middle(head: N | null): N | null {
  let slow = head;
  let fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
  }
  return slow; // для парної довжини — другий із двох середніх
}

// 2. Цикл (алгоритм Флойда «черепаха й заєць»)
function hasCycle(head: N | null): boolean {
  let slow = head;
  let fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

// 2б. Де цикл починається: після зустрічі ставимо один вказівник на head і рухаємо обидва по 1 кроку
function cycleStart(head: N | null): N | null {
  let slow = head;
  let fast = head;
  while (fast?.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) {
      let p = head;
      while (p !== slow) {
        p = p!.next;
        slow = slow!.next;
      }
      return p;
    }
  }
  return null;
}

// 3. Злиття двох відсортованих списків: O(n + m), нові вузли не створюємо
function mergeSorted(a: N | null, b: N | null): N | null {
  const dummy: N = {value: 0, next: null};
  let tail = dummy;
  while (a && b) {
    if (a.value <= b.value) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next;
  }
  tail.next = a ?? b;
  return dummy.next;
}

// 4. Видалити n-й елемент з кінця за один прохід: два вказівники з відступом n
function removeNthFromEnd(head: N | null, n: number): N | null {
  const dummy: N = {value: 0, next: head};
  let fast: N | null = dummy;
  let slow: N = dummy;
  for (let i = 0; i < n; i++) fast = fast!.next;
  while (fast?.next) {
    fast = fast.next;
    slow = slow.next!;
  }
  slow.next = slow.next!.next;
  return dummy.next;
}

// 5. Паліндром: знайти середину, розвернути другу половину, порівняти
function isPalindrome(head: N | null): boolean {
  const mid = middle(head);
  let prev: N | null = null;
  let cur = mid;
  while (cur) {
    const next: N | null = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  for (let a = head, b = prev; b; a = a!.next, b = b.next) {
    if (a!.value !== b.value) return false;
  }
  return true;
}

// 6. Розворот рекурсивно (для розуміння; на довгих списках — переповнення стека)
function reverseRec(head: N | null): N | null {
  if (head === null || head.next === null) return head;
  const newHead = reverseRec(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}

// 7. Розворот ітеративно
function reverse(head: N | null): N | null {
  let prev: N | null = null;
  while (head) {
    const next: N | null = head.next;
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}
```

---

## 1. Середина списку — slow/fast

**Ідея.** Повільний вказівник робить 1 крок, швидкий — 2. Коли швидкий дійшов до кінця, повільний пройшов **рівно половину**.

```
[1] → [2] → [3] → [4] → [5]
 s,f
крок:  s=[2] f=[3]
крок:  s=[3] f=[5]   → f.next === null, стоп. Середина = [3]
```

Для парної довжини (`[1,2,3,4]`) повертається **другий** із двох середніх (`3`); якщо потрібен перший — умова `while (fast.next?.next)`.

- Час O(n), пам'ять O(1), один прохід (без підрахунку довжини).

## 2. Чи є цикл — алгоритм Флойда («черепаха й заєць»)

**Ідея.** Якщо в списку є цикл, швидкий вказівник «наздожене» повільний усередині цикла (як бігун, що доганяє по колу). Якщо цикла немає — швидкий впреться в `null`.

**Чому вони обов'язково зустрінуться?** Усередині кола швидкий наближається до повільного на 1 крок за ітерацію (2 − 1), тому «перескочити» його не може — відстань зменшується 3, 2, 1, 0.

### Де цикл починається

Після зустрічі поставимо один вказівник на `head`, а інший лишимо в точці зустрічі й рухатимемо **обидва по 1 кроку** — вони зустрінуться саме на початку циклу. (Доведення: якщо до початку циклу `a` кроків, а в циклі `b` кроків до точки зустрічі, то довжина циклу `c`, і `a = c − b (mod c)`.)

- Час O(n), пам'ять O(1). Альтернатива з `Set` посилань — теж O(n) часу, але O(n) пам'яті.

## 3. Злиття двох відсортованих списків

**Ідея.** Два вказівники на голови; щоразу чіпляємо **менший** вузол до результату і рухаємо відповідний вказівник. Dummy-вузол прибирає окремий випадок «що є головою результату».

```
a: 1 → 4 → 6          b: 2 → 3 → 7
dummy → 1 → 2 → 3 → 4 → 6 → 7
```

- Час O(n + m), пам'ять O(1) (нові вузли не створюються).
- Це серце **merge sort для списків**: розділити за допомогою slow/fast на дві половини, відсортувати рекурсивно, злити. Сортування списку за O(n log n) і O(log n) стека.

## 4. Видалити n-й елемент з кінця за один прохід

**Ідея.** Вказівник `fast` відходить на `n` кроків від `slow`. Далі обидва йдуть разом; коли `fast` в кінці, `slow` стоїть **перед** вузлом, який треба видалити.

```
n = 2:   dummy → 1 → 2 → 3 → 4 → 5
                  slow           fast(після n кроків біля [2])
  …рухаємо разом…   slow=[3], fast=[5]  → видаляємо slow.next ([4])
```

Dummy потрібен для випадку, коли видаляється **сама голова** (`n === length`).

## 5. Розворот списку — двома способами

**Ітеративно** (основний спосіб): три вказівники `prev`, `curr`, `next`; на кожному кроці розвертаємо одну стрілку. O(n), O(1) пам'яті.

**Рекурсивно:** розвернути решту списку, потім зробити так, щоб наступний вузол вказував на поточний:

```
reverseRec([1 → 2 → 3]):
  reverseRec([2 → 3]) = [3 → 2]       ← розвернули хвіст
  head.next.next = head               ← [2].next = [1]
  head.next = null                    ← [1] тепер кінець
  результат [3 → 2 → 1]
```

Рекурсивна версія красива, але займає O(n) стека і переповниться на довгих списках (десятки тисяч вузлів).

## 6. Паліндром

**Ідея** (O(1) пам'яті): знайти середину → розвернути **другу** половину → порівняти з першою.

```
1 → 2 → 3 → 2 → 1
середина = [3]; розвернута друга половина: 1 → 2 → 3
порівнюємо 1=1, 2=2, 3=3 (достатньо до кінця розвернутої)
```

Нюанс: функція **псує** список (друга половина розвернена). У реальному коді після перевірки розвертай назад, або копіюй значення в масив (O(n) пам'яті, але просто).

---

## Типові помилки в задачах

1. **Забути `dummy`** і писати купу `if (head === null)`.
2. **`while (fast.next.next)`** замість `while (fast?.next)` → `TypeError` на списку з 1–2 вузлів.
3. **Не зберегти `next` до зміни стрілки** при розвороті — втрата решти списку.
4. **Забути розірвати старі зв'язки** (`node.next = null`) → випадкові цикли або «висячі» хвости.
5. **Порівнювати значення замість посилань** при виявленні циклу (`slow.value === fast.value`) — значення можуть збігатись і без циклу.
6. **Не перевірити крайові випадки:** `null`, один вузол, два вузли, `n === length`.
7. **Рекурсія на довгому списку** → переповнення стека; для великих даних — цикл.

## Шпаргалка прийомів

| Задача | Прийом | Час / пам'ять |
|---|---|---|
| середина | slow / fast | O(n) / O(1) |
| цикл, початок циклу | Флойд | O(n) / O(1) |
| n-й з кінця | два вказівники з відступом | O(n) / O(1) |
| злиття відсортованих | dummy + два вказівники | O(n+m) / O(1) |
| розворот | prev / curr / next | O(n) / O(1) |
| паліндром | середина + розворот половини | O(n) / O(1) |
| видалення голови, дублікатів | dummy | O(n) / O(1) |
| LRU-кеш | Map + двозв'язний список | O(1) операція |

## Задачі для закріплення

25 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Назвіть три головні прийоми в задачах на зв'язні списки.

**2.** Чому `slow/fast` знаходить середину списку за один прохід?

**3.** У чому ідея алгоритму Флойда для пошуку циклу?

**4.** Навіщо `dummy` вузол перед `head`?

**5.** Яка складність за часом і пам'яттю в ітеративного розвороту списку?

**6.** Що поверне `middle` для списку з 6 елементів — перший чи другий середній?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
;(() => { let s = fromArray([1, 2, 3, 4, 5, 6]), f = s; while (f && f.next) { s = s.next; f = f.next.next; } return s.v; })()
```

**7.** Скільки кроків зробить `slow` у списку з 9 вузлів, поки `fast` дійде до кінця?

```js
(() => { let n = 9, fast = 0, slow = 0, steps = 0; while (fast + 1 < n) { fast += 2; slow++; steps++; } return steps; })()
```

### Рівень 2. Методи й поведінка

**8.** Напишіть `middle(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function middle(h) { let s = h, f = h; while (f && f.next) { s = s.next; f = f.next.next } return s }
```

**9.** Напишіть `hasCycle(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function hasCycle(h) { let s = h, f = h; while (f && f.next) { s = s.next; f = f.next.next; if (s === f) return true } return false }
```

**10.** Напишіть `cycleLength(head)` — довжина циклу або `0`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function cycleLength(h) {
  let s = h, f = h
  while (f && f.next) {
    s = s.next; f = f.next.next
    if (s === f) { let n = 1; for (let c = s.next; c !== s; c = c.next) n++; return n }
  }
  return 0
}
```

**11.** Напишіть `mergeSorted(a, b)` із dummy-вузлом.

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

**12.** Напишіть `removeNthFromEnd(head, n)`.

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

**13.** Напишіть ітеративний `reverse(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function reverse(h) { let p = null; while (h) { const n = h.next; h.next = p; p = h; h = n } return p }
```

**14.** Напишіть рекурсивний `reverseRec(head)`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function reverseRec(h) {
  if (!h || !h.next) return h
  const r = reverseRec(h.next)
  h.next.next = h
  h.next = null
  return r
}
```

### Рівень 3. Нюанси та пастки

**15.** Напишіть `isPalindrome(head)` за `O(1)` пам'яті (розворот другої половини).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function isPalindrome(h) {
  let s = h, f = h
  while (f && f.next) { s = s.next; f = f.next.next }
  let p = null
  while (s) { const n = s.next; s.next = p; p = s; s = n }
  for (let a = h, b = p; b; a = a.next, b = b.next) if (a.v !== b.v) return false
  return true
}
```

**16.** Напишіть `getIntersection(a, b)` — спільний вузол двох списків.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function getIntersection(a, b) { let p = a, q = b; while (p !== q) { p = p ? p.next : b; q = q ? q.next : a } return p }
```

**17.** Напишіть `deleteNode(node)` — видалити вузол, маючи лише його (не хвіст).

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function deleteNode(n) { n.v = n.next.v; n.next = n.next.next }
```

**18.** Напишіть `splitInHalf(head)` — два списки: перша й друга половини.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function splitInHalf(h) {
  let s = h, f = h, prev = null
  while (f && f.next) { prev = s; s = s.next; f = f.next.next }
  if (prev) prev.next = null
  return [h, s]
}
```

**19.** Напишіть `reorderList(head)` — `L0→Ln→L1→Ln-1→…`.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function reorderList(h) {
  const a = toArray(h), out = []
  for (let i = 0, j = a.length - 1; i <= j; i++, j--) { out.push(a[i]); if (i !== j) out.push(a[j]) }
  return fromArray(out)
}
```

**20.** Напишіть `removeElements(head, val)` — видалити всі вузли зі значенням `val` через dummy.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function removeElements(h, val) {
  const d = new Node(0, h); let c = d
  while (c.next) c.next.v === val ? (c.next = c.next.next) : (c = c.next)
  return d.next
}
```

**21.** Напишіть `countNodesInCycle`-перевірку: скільки кроків до зустрічі `slow` і `fast` у циклі з 3 вузлів після входу?

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function meetSteps(h) { let s = h, f = h, n = 0; while (f && f.next) { s = s.next; f = f.next.next; n++; if (s === f) return n } return -1 }
```

### Рівень 4. Практика й реалізація

**22.** Напишіть `pairSum(head)` — максимальна сума пар «перший + останній» для списку парної довжини.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function pairSum(h) {
  const a = toArray(h); let best = 0
  for (let i = 0; i < a.length / 2; i++) best = Math.max(best, a[i] + a[a.length - 1 - i])
  return best
}
```

**23.** Напишіть `toBinary(head)` — список бітів (старший першим) у число.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const toBinary = h => toArray(h).reduce((n, b) => (n << 1) | b, 0)
```

**24.** Напишіть `mergeNodesBetweenZeros(head)` — суми між нулями.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
function mergeNodes(h) {
  const out = []; let s = 0
  for (let c = h.next; c; c = c.next) c.v === 0 ? (out.push(s), (s = 0)) : (s += c.v)
  return fromArray(out)
}
```

**25.** Напишіть `sumList(head)` рекурсивно.

```js
class Node { constructor(v, next = null) { this.v = v; this.next = next } }
const fromArray = a => a.reduceRight((n, v) => new Node(v, n), null)
const toArray = h => { const o = []; for (; h; h = h.next) o.push(h.v); return o }
const sumList = h => (h ? h.v + sumList(h.next) : 0)
```

### Відповіді

1. Швидкий і повільний вказівники (slow/fast), фіктивний головний вузол (dummy head) і розворот частини списку.
2. Швидкий рухається на 2 кроки, повільний — на 1; коли швидкий дійде до кінця, повільний буде посередині.
3. Якщо цикл є, швидкий вказівник наздожене повільний усередині циклу; якщо `fast` дійшов до `null` — циклу немає.
4. Щоб не розглядати окремо видалення чи вставку на початку: `dummy.next` завжди вказує на актуальну голову.
5. `O(n)` за часом і `O(1)` додаткової пам'яті.
6. `4`
7. `4`
8. Виклик `[middle(fromArray([1, 2, 3, 4, 5])).v, middle(fromArray([1])).v]` → `[3, 1]`
9. Виклик `(() => { const a = fromArray([1, 2, 3]); a.next.next.next = a; return [hasCycle(a), hasCycle(null)]; })()` → `[true, false]`
10. Виклик `(() => { const a = fromArray([1, 2, 3, 4]); a.next.next.next.next = a.next; return [cycleLength(a), cycleLength(fromArray([1, 2]))]; })()` → `[3, 0]`
11. Виклик `toArray(mergeSorted(fromArray([1, 2, 4]), fromArray([1, 3, 4])))` → `[1, 1, 2, 3, 4, 4]`
12. Виклик `toArray(removeNthFromEnd(fromArray([1, 2, 3, 4, 5]), 2))` → `[1, 2, 3, 5]`
13. Виклик `toArray(reverse(fromArray([1, 2, 3])))` → `[3, 2, 1]`
14. Виклик `toArray(reverseRec(fromArray([1, 2, 3, 4])))` → `[4, 3, 2, 1]`
15. Виклик `[isPalindrome(fromArray([1, 2, 3, 2, 1])), isPalindrome(fromArray([1, 2, 3, 1]))]` → `[true, false]`
16. Виклик `(() => { const t = fromArray([8, 9]); const a = new Node(1, t); const b = new Node(2, new Node(3, t)); return getIntersection(a, b) === t; })()` → `true`
17. Виклик `(() => { const h = fromArray([1, 2, 3, 4]); deleteNode(h.next); return toArray(h); })()` → `[1, 3, 4]`
18. Виклик `(() => { const [a, b] = splitInHalf(fromArray([1, 2, 3, 4, 5])); return [toArray(a), toArray(b)]; })()` → `[[1, 2], [3, 4, 5]]`
19. Виклик `[toArray(reorderList(fromArray([1, 2, 3, 4]))), toArray(reorderList(fromArray([1, 2, 3, 4, 5])))]` → `[[1, 4, 2, 3], [1, 5, 2, 4, 3]]`
20. Виклик `toArray(removeElements(fromArray([1, 2, 6, 3, 4, 5, 6]), 6))` → `[1, 2, 3, 4, 5]`
21. Виклик `(() => { const a = fromArray([1, 2, 3]); a.next.next.next = a; return meetSteps(a); })()` → `3`
22. Виклик `[pairSum(fromArray([5, 4, 2, 1])), pairSum(fromArray([4, 2, 2, 3]))]` → `[6, 7]`
23. Виклик `[toBinary(fromArray([1, 0, 1])), toBinary(fromArray([0]))]` → `[5, 0]`
24. Виклик `toArray(mergeNodes(fromArray([0, 3, 1, 0, 4, 5, 2, 0])))` → `[4, 11]`
25. Виклик `sumList(fromArray([1, 2, 3, 4]))` → `10`
