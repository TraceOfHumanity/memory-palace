# Floyd's Cycle Detection — «черепаха і заєць»

Алгоритм Флойда виявляє **цикл** у послідовності, що задається функцією `x → f(x)` (зв'язний список, ітерація функції, граф із одним вихідним ребром), використовуючи лише **два вказівники** і `O(1)` пам'яті. Повільний (черепаха) робить 1 крок, швидкий (заєць) — 2 кроки. Якщо цикл є, заєць наздожене черепаху. Далі кількома надзвичайно елегантними арифметичними міркуваннями можна знайти **початок циклу** і його **довжину**.

## 1. Задача

Дано зв'язний список (або функцію `f`), де `next` кожного вузла вказує на наступний. Чи є цикл? Якщо так — де він починається?

Підходи:

- **Множина відвіданих вузлів:** `O(n)` часу, `O(n)` пам'яті.
- **Позначити вузли** (змінити структуру): псує дані.
- **Алгоритм Флойда:** `O(n)` часу, `O(1)` пам'яті, дані не змінюються.

Структура списку: «хвіст» довжини `μ` (кількість вузлів до входу в цикл), далі цикл довжини `λ`:

```text
a0 → a1 → … → a(μ-1) → [ aμ → … → a(μ+λ-1) ] → назад до aμ
      хвіст μ              цикл λ
```

## 2. Фаза 1: виявлення циклу

Ставимо `slow` і `fast` на початок. На кожному кроці `slow` йде на 1, `fast` — на 2. Якщо `fast` дійшов до кінця (`null`), цикл відсутній. Інакше обидва зрештою опиняються **в циклі**, і заєць наздоганяє черепаху.

**Чому вони зустрінуться?** Коли обидва в циклі, відстань між ними (за напрямком руху зайця до черепахи) змінюється на `−1` за крок (заєць наближається на 1 вузол за крок). Отже, за скінченну кількість кроків вона стане 0 — вони збігаються. Заєць не може «перестрибнути» через черепаху, бо відстань зменшується рівно на 1: вона пройде через кожне значення, зокрема `0`. (Якби заєць ішов по 3, він міг би «перестрибнути» — при певних довжинах циклу зустріч не гарантована або потребує інших умов; крок 2 — найменший, що гарантує зустріч.)

`hasCycle` для списку з 6 вузлів і циклом назад на вузол 2: `true`; без циклу: `false`.

## 3. Фаза 2: початок циклу

Нехай `slow` і `fast` зустрілись у деякій точці. Вкажемо відстані: `μ` — довжина хвоста, `λ` — довжина циклу, `k` — відстань від входу в цикл до місця зустрічі (в напрямку руху).

Коли `slow` пройшов `μ + k` кроків, `fast` пройшов `2(μ + k)`. Їхня різниця — кратна довжині циклу (заєць зробив ціле число зайвих кіл): `2(μ + k) − (μ + k) = μ + k = m·λ` для деякого цілого `m ≥ 1`.

Тобто `μ = m·λ − k`. Тепер вкажемо **другу** точку: поставимо новий вказівник на початок списку, а `slow` залишимо в місці зустрічі, і рухатимемо обидва **по 1 кроку**. Після `μ` кроків новий вказівник стане на вході в цикл. А `slow` від місця зустрічі (відстань `k` від входу) пройде `μ` кроків: `k + μ = k + mλ − k = mλ` — ціле число кіл, тобто теж опиниться **на вході в цикл**. Вони зустрінуться саме на вході.

Отже: **фаза 2:** `p = head`, `q = meeting`; поки `p !== q`: `p = p.next`, `q = q.next`. Точка зустрічі — початок циклу.

`cycleStart(makeList(6, 2))` повертає вузол із значенням `2` (вузол 2 — вхід у цикл).

## 4. Довжина циклу та параметри `μ`, `λ`

- **Довжина циклу `λ`:** від точки зустрічі рухаємо один вказівник, поки не повернемось у ту саму точку, рахуючи кроки: `cycleLength(makeList(6, 2))` = `4` (вузли 2–5).
- **Довжина хвоста `μ`:** рахуємо кроки фази 2: `2`.

Узагальнення Брента (Brent's algorithm) знаходить `λ` і `μ` швидше (степені двійки), роблячи менше викликів `f` — важливо, коли `f` дорога (хеш-функції в факторизації Полларда).

## 5. Реалізація

```js
function makeList(n, cycleTo) {
  const nodes = Array.from({ length: n }, (_, i) => ({ val: i, next: null }));
  for (let i = 0; i < n - 1; i++) nodes[i].next = nodes[i + 1];
  if (cycleTo >= 0) nodes[n - 1].next = nodes[cycleTo];
  return nodes[0];
}

function hasCycle(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}

function meetingPoint(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return slow;
  }
  return null;
}

function cycleStart(head) {
  const meet = meetingPoint(head);
  if (!meet) return null;
  let p = head;
  let q = meet;
  while (p !== q) {
    p = p.next;
    q = q.next;
  }
  return p;
}

function cycleLength(head) {
  const meet = meetingPoint(head);
  if (!meet) return 0;
  let len = 1;
  for (let p = meet.next; p !== meet; p = p.next) len++;
  return len;
}

function cycleInfo(head) {
  const meet = meetingPoint(head);
  if (!meet) return { mu: null, lambda: 0 };
  let mu = 0;
  let p = head;
  let q = meet;
  while (p !== q) {
    p = p.next;
    q = q.next;
    mu++;
  }
  return { mu, lambda: cycleLength(head) };
}

function middleNode(head) {
  let slow = head;
  let fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  return slow;
}

function findDuplicate(nums) {
  let slow = nums[0];
  let fast = nums[0];
  do {
    slow = nums[slow];
    fast = nums[nums[fast]];
  } while (slow !== fast);
  slow = nums[0];
  while (slow !== fast) {
    slow = nums[slow];
    fast = nums[fast];
  }
  return slow;
}

function isHappy(n) {
  const next = (x) => {
    let s = 0;
    while (x > 0) { const d = x % 10; s += d * d; x = Math.floor(x / 10); }
    return s;
  };
  let slow = n;
  let fast = next(n);
  while (fast !== 1 && slow !== fast) {
    slow = next(slow);
    fast = next(next(fast));
  }
  return fast === 1;
}

function floydFunctional(f, x0) {
  let tortoise = f(x0);
  let hare = f(f(x0));
  while (tortoise !== hare) {
    tortoise = f(tortoise);
    hare = f(f(hare));
  }
  let mu = 0;
  tortoise = x0;
  while (tortoise !== hare) {
    tortoise = f(tortoise);
    hare = f(hare);
    mu++;
  }
  let lambda = 1;
  hare = f(tortoise);
  while (tortoise !== hare) {
    hare = f(hare);
    lambda++;
  }
  return { mu, lambda };
}

function listToArray(head, limit = 20) {
  const out = [];
  for (let p = head; p && out.length < limit; p = p.next) out.push(p.val);
  return out;
}

function hasCycleWithSet(head) {
  const seen = new Set();
  for (let p = head; p; p = p.next) {
    if (seen.has(p)) return true;
    seen.add(p);
  }
  return false;
}
```

## 6. Застосування

- **Дублікат у масиві `1..n`** з `n + 1` елементом: розглядаємо `i → nums[i]` як функцію; дублікат — вхід у цикл. `findDuplicate([1, 3, 4, 2, 2])` = `2`, `findDuplicate([3, 1, 3, 4, 2])` = `3`. `O(n)` часу, `O(1)` пам'яті, масив не змінюється.
- **Середина зв'язного списку:** коли заєць у кінці — черепаха посередині: `middleNode` для 5 вузлів повертає значення `2`, для 6 — `3` (друга з двох середніх).
- **Щасливі числа:** послідовність сум квадратів цифр або досягає 1, або зациклюється. `isHappy(19)` = `true`, `isHappy(2)` = `false`.
- **Генератори псевдовипадкових чисел:** виявлення періоду `λ` послідовності `x_{n+1} = f(x_n)`.
- **Криптографія — ρ-алгоритм Полларда** (факторизація і дискретний логарифм): шукає зіткнення за допомогою циклу в псевдовипадковій послідовності, у середньому `O(√p)` часу й `O(1)` пам'яті. Назва «ро» — від форми `ρ` (хвіст + петля).
- **Виявлення циклу в залежностях** (однозв'язний випадок), у кінцевих автоматах.
- **Функціональний варіант** `floydFunctional(x => (x * x + 1) % 255, 3)` = `{ mu: 2, lambda: 6 }`.

## 7. Складність

- **Час:** `O(μ + λ)` — до зустрічі `slow` пройде не більше `μ + λ` кроків (потрапить у цикл за `μ`, зустрічі треба не більше `λ` додаткових кроків).
- **Пам'ять:** `O(1)`.
- **Порівняння:** множина відвіданих — той самий час, але `O(μ + λ)` пам'яті. Брентів варіант зазвичай виконує помітно менше обчислень `f`.

## 8. Типові помилки

1. **Перевірка тільки `fast`, але не `fast.next`** → `TypeError` на `fast.next.next`.
2. **Початок із `slow = head, fast = head.next`** — тоді зустріч зміщена, і формула фази 2 (початок циклу) вимагає коригування.
3. **Порівнювати значення (`slow.val === fast.val`), а не вузли** — рівні значення в різних вузлах дають хибну зустріч.
4. **Забути, що в фазі 2 обидва вказівники рухаються по 1 кроку** (а не заєць по 2).
5. **Не обробити порожній список/один вузол.**
6. **Крок 3 замість 2** — зустріч може не відбутись при певних довжинах циклу.
7. **`findDuplicate` без умови `1 ≤ nums[i] ≤ n`** — вихід за межі.
8. **Плутанина «вхід у цикл» і «точка зустрічі»** — це різні вузли.

## 9. Алгоритм (стисло)

1. `slow = fast = head`; рухати `slow` на 1, `fast` на 2, поки вони не зустрінуться (або `fast` дійде до `null` → циклу немає).
2. Для початку циклу: `p = head`, `q = meeting`; рухати обидва по 1, до `p === q`.
3. Довжина циклу — один обхід від точки зустрічі.
4. Час `O(μ + λ)`, пам'ять `O(1)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чи має цикл список із 6 вузлів, де останній вказує на вузол 2?

```js
hasCycle(makeList(6, 2))
```

**2.** Чи має цикл список із 6 вузлів без циклу?

```js
hasCycle(makeList(6, -1))
```

**3.** Що поверне `hasCycle(null)` та для одного вузла без циклу?

```js
[hasCycle(null), hasCycle(makeList(1, -1))]
```

**4.** Чи має цикл одновузловий список, що вказує сам на себе (`makeList(1, 0)`)?

```js
hasCycle(makeList(1, 0))
```

**5.** Чи є цикл у двовузловому списку з циклом на початок (`makeList(2, 0)`)?

```js
hasCycle(makeList(2, 0))
```

**6.** Яке значення має вузол — початок циклу в `makeList(6, 2)`?

```js
cycleStart(makeList(6, 2)).val
```

**7.** Що поверне `cycleStart(makeList(6, -1))` для списку без циклу?

```js
cycleStart(makeList(6, -1))
```

**8.** Яке значення початку циклу, якщо цикл замикається на голову (`makeList(5, 0)`)?

```js
cycleStart(makeList(5, 0)).val
```

**9.** Яка довжина циклу в `makeList(6, 2)` та в `makeList(5, 0)`?

```js
[cycleLength(makeList(6, 2)), cycleLength(makeList(5, 0))]
```

**10.** Яка довжина циклу в списку без циклу?

```js
cycleLength(makeList(4, -1))
```

**11.** Що поверне `cycleInfo(makeList(6, 2))`?

```js
cycleInfo(makeList(6, 2))
```

**12.** Що поверне `cycleInfo(makeList(10, 7))` (хвіст 7, цикл 3)?

```js
cycleInfo(makeList(10, 7))
```

**13.** Що поверне `cycleInfo(makeList(4, -1))`?

```js
cycleInfo(makeList(4, -1))
```

### Рівень 2. Робота алгоритму

**14.** Яке значення має вузол у точці зустрічі в `makeList(6, 2)`?

```js
meetingPoint(makeList(6, 2)).val
```

**15.** А в `makeList(8, 3)` (хвіст 3, цикл 5)?

```js
meetingPoint(makeList(8, 3)).val
```

**16.** Яке значення середнього вузла для списку з 5 і з 6 вузлів?

```js
[middleNode(makeList(5, -1)).val, middleNode(makeList(6, -1)).val]
```

**17.** Яке значення середнього вузла для одного вузла та двох?

```js
[middleNode(makeList(1, -1)).val, middleNode(makeList(2, -1)).val]
```

**18.** Що поверне `findDuplicate([1, 3, 4, 2, 2])` та `findDuplicate([3, 1, 3, 4, 2])`?

```js
[findDuplicate([1, 3, 4, 2, 2]), findDuplicate([3, 1, 3, 4, 2])]
```

**19.** Що поверне `findDuplicate([2, 2, 2, 2, 2])`?

```js
findDuplicate([2, 2, 2, 2, 2])
```

**20.** Чи щасливі числа 19 і 2?

```js
[isHappy(19), isHappy(2)]
```

**21.** Які щасливі числа в діапазоні 1..30?

```js
Array.from({ length: 30 }, (_, i) => i + 1).filter(isHappy)
```

**22.** Що поверне `floydFunctional(x => (x * x + 1) % 255, 3)`?

```js
floydFunctional(x => (x * x + 1) % 255, 3)
```

**23.** Що поверне `floydFunctional(x => (x + 3) % 10, 0)` (чистий цикл без хвоста)?

```js
floydFunctional(x => (x + 3) % 10, 0)
```

**24.** Що поверне `floydFunctional(x => Math.min(x + 1, 5), 0)` (нерухома точка, цикл довжини 1)?

```js
floydFunctional(x => Math.min(x + 1, 5), 0)
```

**25.** Що поверне `listToArray(makeList(5, -1))` та обмежений обхід списку з циклом?

```js
[listToArray(makeList(5, -1)), listToArray(makeList(4, 1), 8)]
```

**26.** Чи збігаються `hasCycle` і `hasCycleWithSet` на списках усіх довжин 1..8 і всіх варіантах `cycleTo`?

```js
(() => { let ok = true; for (let n = 1; n <= 8; n++) for (let c = -1; c < n; c++) if (hasCycle(makeList(n, c)) !== hasCycleWithSet(makeList(n, c))) ok = false; return ok; })()
```

### Рівень 3. Складність і нюанси

**27.** Для скількох кроків `slow` у `makeList(1000, 500)` до першої зустрічі? (кроки slow = μ + k)

```js
(() => { let slow = makeList(1000, 500), fast = slow, steps = 0; do { slow = slow.next; fast = fast.next.next; steps++; } while (slow !== fast); return steps; })()
```

**28.** Перевірте формулу `μ + k = m·λ` для списку `makeList(10, 7)`: знайдіть кроки до зустрічі та `λ`.

```js
(() => { let slow = makeList(10, 7), fast = slow, steps = 0; do { slow = slow.next; fast = fast.next.next; steps++; } while (slow !== fast); const lambda = cycleLength(makeList(10, 7)); return { steps, lambda, кратне: steps % lambda === 0 }; })()
```

**29.** Що станеться, якщо перемістити `fast` на 3 кроки в циклі з парною довжиною? Змоделюйте для циклу з 4 вузлів (`makeList(4, 0)`) 100 кроків: чи зустрінуться?

```js
(() => { let slow = makeList(4, 0), fast = slow.next; let met = false; for (let i = 0; i < 100; i++) { slow = slow.next; fast = fast.next.next.next; if (slow === fast) { met = true; break; } } return met; })()
```

**30.** Скільки кроків швидкого вказівника потрібно `hasCycle` для списку без циклу з 1000 вузлів?

```js
(() => { let fast = makeList(1000, -1), steps = 0; while (fast && fast.next) { fast = fast.next.next; steps++; } return steps; })()
```

**31.** Чи зустрінуться вказівники в `makeList(7, 0)`? Подивіться значення в точці зустрічі.

```js
meetingPoint(makeList(7, 0)).val
```

**32.** Що поверне `findDuplicate([1, 1])`?

```js
findDuplicate([1, 1])
```

**33.** Напишіть `detectCycleLength(head)` без `cycleLength`: рахуйте кроки, поки зустрінуться вказівники повторно.

**34.** Напишіть `removeCycle(head)` — розірвіть цикл (останній вузол циклу → `null`) і поверніть довжину отриманого списку.

**35.** Напишіть `isPalindromeList(head)` — паліндромність списку: знайти середину, розвернути другу половину й порівняти.

**36.** Напишіть `intersectionOfCyclic(a, b)`: чи належать два списки одному циклу (вузол циклу одного досягається з вузла циклу іншого).

**37.** Напишіть `cyclePeriod(f, x0, limit)` — довжину періоду послідовності `x_{n+1} = f(x_n)` через `floydFunctional`.

**38.** Напишіть `firstRepeat(f, x0)` — перше значення, що повторюється в послідовності (початок циклу): `x_μ`.

**39.** Напишіть `findDuplicateByHash(nums)` — те саме через множину, для порівняння з Флойдом.

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `kthFromEnd(head, k)` двома вказівниками з відстанню `k` (значення вузла).

**41.** Чому вказівники в циклі обов'язково зустрінуться, якщо швидкий рухається по 2, а повільний по 1?

**42.** Як математично доводиться, що друга фаза знаходить початок циклу?

**43.** Чому порівнювати треба вузли (посилання), а не значення?

**44.** У чому перевага алгоритму Флойда над множиною відвіданих вузлів?

**45.** Як алгоритм Флойда допомагає знайти дублікат у масиві з `n + 1` числом із діапазону `1..n`?

**46.** Чому алгоритм називають «черепаха і заєць» і чим відрізняється Брентів варіант?

**47.** Де в криптографії застосовується виявлення циклу?

**48.** Що станеться, якщо швидкий вказівник рухати по 3 кроки?

**49.** Як знайти середину зв'язного списку за один прохід?

**50.** Чому для списку без циклу алгоритм завершується за `O(n)`?

### Відповіді

1. `true`
2. `false`
3. `[false, false]`
4. `true`
5. `true`
6. `2`
7. `null`
8. `0`
9. `[4, 5]`
10. `0`
11. `{ mu: 2, lambda: 4 }`
12. `{ mu: 7, lambda: 3 }`
13. `{ mu: null, lambda: 0 }`
14. `4`
15. `5`
16. `[2, 3]`
17. `[0, 1]`
18. `[2, 3]`
19. `2`
20. `[true, false]`
21. `[1, 7, 10, 13, 19, 23, 28]`
22. `{ mu: 2, lambda: 6 }`
23. `{ mu: 0, lambda: 10 }`
24. `{ mu: 5, lambda: 1 }`
25. `[[0, 1, 2, 3, 4], [0, 1, 2, 3, 1, 2, 3, 1]]`
26. `true`
27. `500`
28. `{ steps: 9, lambda: 3, 'кратне': true }`
29. `false`
30. `500`
31. `0`
32. `1`
33. Приклад розв'язку:

   ```js
   function detectCycleLength(head) {
     let slow = head, fast = head;
     while (fast && fast.next) {
       slow = slow.next;
       fast = fast.next.next;
       if (slow === fast) {
         let n = 1;
         fast = fast.next;
         while (fast !== slow) {
           fast = fast.next;
           n++;
         }
         return n;
       }
     }
     return 0;
   }
   ```

   Виклик `[detectCycleLength(makeList(6, 2)), detectCycleLength(makeList(6, -1))]` → `[4, 0]`

34. Приклад розв'язку:

   ```js
   function removeCycle(head) {
     const start = cycleStart(head);
     if (!start) return listToArray(head, 100).length;
     let p = start;
     while (p.next !== start) p = p.next;
     p.next = null;
     return listToArray(head, 100).length;
   }
   ```

   Виклик `[removeCycle(makeList(6, 2)), removeCycle(makeList(5, -1))]` → `[6, 5]`

35. Приклад розв'язку:

   ```js
   function isPalindromeList(head) {
     let slow = head, fast = head;
     while (fast && fast.next) {
       slow = slow.next;
       fast = fast.next.next;
     }
     let prev = null;
     while (slow) {
       const nx = slow.next;
       slow.next = prev;
       prev = slow;
       slow = nx;
     }
     for (let a = head, b = prev; b; a = a.next, b = b.next) if (a.val !== b.val) return false;
     return true;
   }
   ```

   Виклик `(() => { const mk = (arr) => { const nodes = arr.map(v => ({ val: v, next: null })); nodes.forEach((n, i) => n.next = nodes[i + 1] || null); return nodes[0]; }; return [isPalindromeList(mk([1, 2, 2, 1])), isPalindromeList(mk([1, 2, 3])), isPalindromeList(mk([7]))]; })()` → `[true, false, true]`

36. Приклад розв'язку:

   ```js
   function intersectionOfCyclic(a, b) {
     const m = meetingPoint(a), n = meetingPoint(b);
     if (!m || !n) return false;
     let p = m;
     do {
       if (p === n) return true;
       p = p.next;
     } while (p !== m);
     return false;
   }
   ```

   Виклик `(() => { const x = makeList(5, 2); const y = { val: 'y', next: x.next.next }; return [intersectionOfCyclic(x, y), intersectionOfCyclic(x, makeList(4, 0))]; })()` → `[true, false]`

37. Приклад розв'язку:

   ```js
   const cyclePeriod = (f, x0) => floydFunctional(f, x0).lambda
   ```

   Виклик `[cyclePeriod(x => (x * 5 + 3) % 16, 1), cyclePeriod(x => (x * x) % 7, 3)]` → `[16, 2]`

38. Приклад розв'язку:

   ```js
   function firstRepeat(f, x0) {
     const { mu } = floydFunctional(f, x0);
     let x = x0;
     for (let i = 0; i < mu; i++) x = f(x);
     return x;
   }
   ```

   Виклик `[firstRepeat(x => (x * x + 1) % 255, 3), firstRepeat(x => (x + 3) % 10, 4)]` → `[101, 4]`

39. Приклад розв'язку:

   ```js
   function findDuplicateByHash(nums) {
     const s = new Set();
     for (const x of nums) {
       if (s.has(x)) return x;
       s.add(x);
     }
     return -1;
   }
   ```

   Виклик `[findDuplicateByHash([1, 3, 4, 2, 2]), findDuplicateByHash([1, 2, 3])]` → `[2, -1]`

40. Приклад розв'язку:

   ```js
   function kthFromEnd(head, k) {
     let fast = head, slow = head;
     for (let i = 0; i < k; i++) fast = fast.next;
     while (fast) {
       fast = fast.next;
       slow = slow.next;
     }
     return slow.val;
   }
   ```

   Виклик `[kthFromEnd(makeList(7, -1), 1), kthFromEnd(makeList(7, -1), 3), kthFromEnd(makeList(7, -1), 7)]` → `[6, 4, 0]`

41. Коли обидва в циклі, відстань від швидкого до повільного (у напрямку руху) змінюється на `−1` за крок: швидкий наближається на одну позицію. Відстань пробігає всі цілі значення до `0`, і вона не може «перестрибнути» нуль, тож вони збігаються за не більше `λ` кроків.
42. Нехай `μ` — довжина хвоста, `k` — відстань від входу в цикл до місця зустрічі. Повільний пройшов `μ + k`, швидкий `2(μ + k)`; різниця `μ + k` кратна довжині циклу `λ`. Тому від місця зустрічі до входу `μ` кроків: `k + μ ≡ 0 (mod λ)`. Новий вказівник від голови й вказівник із місця зустрічі, рухаючись по 1, прийдуть на вхід одночасно.
43. У списку можуть бути різні вузли з однаковими значеннями; рівність значень не означає, що вказівники зустрілись. Цикл існує, коли два вказівники вказують на той самий вузол.
44. Він потребує `O(1)` додаткової пам'яті проти `O(n)` для множини й не змінює структуру даних. Час `O(μ + λ)` такий самий.
45. Індекси й значення утворюють функцію `i → nums[i]`. Оскільки значень у діапазоні `1..n`, а елементів `n + 1`, є два індекси з однаковим значенням — вхід у цикл. Початок циклу — дублікат; пам'ять `O(1)`, масив не змінюється.
46. Повільний вказівник — «черепаха», швидкий — «заєць». Брент рухає швидкий вказівник степенями двійки (подвоює «вікно» і перезапускає черепаху) і потребує менше обчислень функції, що важливо, коли `f` дорога.
47. В ρ-алгоритмі Полларда для факторизації та дискретного логарифма: псевдовипадкова послідовність за модулем рано чи пізно зациклюється, а зіткнення значень за модулем дільника виявляється алгоритмом Флойда або Брента з `O(1)` пам'яті.
48. Відносна швидкість — 2, і відстань у циклі зменшується на 2 за крок: якщо довжина циклу парна, а початкова відстань непарна, вказівники ніколи не зустрінуться (парність зберігається).
49. Швидкий вказівник рухається по 2 вузли, повільний — по 1. Коли швидкий дійшов до кінця, повільний стоїть у середині (для парної довжини — на другому з двох середніх вузлів).
50. Швидкий вказівник проходить список із подвійною швидкістю і досягає `null` після `⌈n/2⌉` ітерацій; кожна ітерація — `O(1)`.
