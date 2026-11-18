# LRU Cache — кеш із витісненням найдавніше використаного

**LRU (Least Recently Used)** — політика кешування: коли кеш повний, видаляється запис, до якого **найдавніше зверталися**. Припущення — **локальність звернень у часі**: що використовували недавно, скоріше знадобиться знову. LRU застосовується в процесорних кешах, ОС (сторінки пам'яті), базах даних (buffer pool), CDN, браузерах, memoization. Класична задача інтерв'ю: реалізувати `get(key)` і `put(key, value)` за **`O(1)`**.

## 1. Вимоги

- `get(key)`: повернути значення або `-1`/`undefined`; запис стає **найсвіжішим**.
- `put(key, value)`: вставити/оновити; запис стає найсвіжішим; якщо ємність перевищено — видалити **найдавніший**.
- Обидві операції — `O(1)`.

## 2. Чому потрібні дві структури

- **Хеш-таблиця** `key → вузол` — пошук за `O(1)`.
- **Двозв'язний список** вузлів у порядку «свіжості»: голова — найсвіжіший, хвіст — найдавніший. Переміщення вузла в голову, видалення хвоста — `O(1)`, бо маємо вказівник на вузол і сусідів (`prev`, `next`).

Окремо жодна не достатня: масив/відсортований список — `O(n)` на переміщення; лише хеш-таблиця — не знає порядку.

```text
 head ⇄ [найсвіжіший] ⇄ … ⇄ [найдавніший] ⇄ tail
          ↑ map: key → вузол
```

Використовують **фіктивні** (sentinel) вузли `head` і `tail`, щоб не обробляти порожній список окремо.

## 3. Операції

- **`get(k)`:** якщо немає в `map` — `-1`; інакше **витягти** вузол зі списку та **вставити після `head`**; повернути значення.
- **`put(k, v)`:** якщо ключ є — оновити значення й перемістити в голову. Інакше створити вузол, вставити після `head`, додати в `map`; якщо `size > capacity` — видалити вузол перед `tail` і запис у `map`.

## 4. Реалізація (хеш + двозв'язний список)

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = { key: null, value: null, prev: null, next: null };
    this.tail = { key: null, value: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
    this.hits = 0;
    this.misses = 0;
  }
  remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
  addFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }
  get(key) {
    const node = this.map.get(key);
    if (!node) { this.misses++; return -1; }
    this.hits++;
    this.remove(node);
    this.addFront(node);
    return node.value;
  }
  put(key, value) {
    if (this.capacity <= 0) return;
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.remove(existing);
      this.addFront(existing);
      return;
    }
    const node = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addFront(node);
    if (this.map.size > this.capacity) {
      const last = this.tail.prev;
      this.remove(last);
      this.map.delete(last.key);
    }
  }
  keys() {
    const out = [];
    for (let n = this.head.next; n !== this.tail; n = n.next) out.push(n.key);
    return out;
  }
  get size() {
    return this.map.size;
  }
}

class LRUCacheMap {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  put(key, value) {
    if (this.capacity <= 0) return;
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value);
  }
  keys() {
    return [...this.map.keys()].reverse();
  }
}

class LFUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.vals = new Map();
    this.freq = new Map();
    this.order = new Map();
    this.time = 0;
  }
  touch(key) {
    this.freq.set(key, (this.freq.get(key) || 0) + 1);
    this.order.set(key, this.time++);
  }
  get(key) {
    if (!this.vals.has(key)) return -1;
    this.touch(key);
    return this.vals.get(key);
  }
  put(key, value) {
    if (this.capacity <= 0) return;
    if (!this.vals.has(key) && this.vals.size >= this.capacity) {
      let victim = null;
      for (const k of this.vals.keys()) {
        if (victim === null || this.freq.get(k) < this.freq.get(victim) || (this.freq.get(k) === this.freq.get(victim) && this.order.get(k) < this.order.get(victim))) victim = k;
      }
      this.vals.delete(victim);
      this.freq.delete(victim);
      this.order.delete(victim);
    }
    this.vals.set(key, value);
    this.touch(key);
  }
  keys() {
    return [...this.vals.keys()];
  }
}

function simulate(Cache, capacity, accesses) {
  const c = new Cache(capacity);
  let hits = 0;
  for (const k of accesses) {
    if (c.get(k) === -1) c.put(k, k);
    else hits++;
  }
  return { hits, misses: accesses.length - hits, keys: c.keys() };
}

function fifoSimulate(capacity, accesses) {
  const q = [];
  let hits = 0;
  for (const k of accesses) {
    if (q.includes(k)) hits++;
    else {
      q.push(k);
      if (q.length > capacity) q.shift();
    }
  }
  return { hits, misses: accesses.length - hits, keys: q.slice() };
}

function optimalSimulate(capacity, accesses) {
  const cache = new Set();
  let hits = 0;
  for (let i = 0; i < accesses.length; i++) {
    const k = accesses[i];
    if (cache.has(k)) { hits++; continue; }
    if (cache.size >= capacity) {
      let victim = null;
      let far = -1;
      for (const c of cache) {
        const next = accesses.indexOf(c, i + 1);
        const dist = next === -1 ? Infinity : next;
        if (dist > far) { far = dist; victim = c; }
      }
      cache.delete(victim);
    }
    cache.add(k);
  }
  return { hits, misses: accesses.length - hits };
}

function hitRatio(r) {
  return +(r.hits / (r.hits + r.misses)).toFixed(3);
}

function memoizeLru(fn, capacity) {
  const cache = new LRUCacheMap(capacity);
  let calls = 0;
  const wrapped = (x) => {
    const v = cache.get(x);
    if (v !== -1) return v;
    calls++;
    const r = fn(x);
    cache.put(x, r);
    return r;
  };
  wrapped.calls = () => calls;
  return wrapped;
}

function lruSequence(capacity, ops) {
  const c = new LRUCache(capacity);
  const out = [];
  for (const [op, k, v] of ops) {
    if (op === 'put') c.put(k, v);
    else out.push(c.get(k));
  }
  return out;
}

function ttlSimulate(ops, ttl) {
  const store = new Map();
  const out = [];
  for (const [op, k, v, t] of ops) {
    if (op === 'put') store.set(k, { v, exp: t + ttl });
    else {
      const e = store.get(k);
      out.push(e && e.exp > t ? e.v : -1);
    }
  }
  return out;
}
```

## 5. Приклад

`capacity = 2`: `put(1, 1)`, `put(2, 2)`, `get(1)` → `1`; `put(3, 3)` витісняє ключ `2` (найдавніший — після `get(1)` свіжіший `1`); `get(2)` → `-1`; `put(4, 4)` витісняє `1`; `get(1)` → `-1`, `get(3)` → `3`, `get(4)` → `4`. Результат: `[1, -1, -1, 3, 4]`.

Порядок ключів (від найсвіжішого) після послідовності `put(1), put(2), put(3), get(1)` при `capacity = 3`: `[1, 3, 2]`.

## 6. Реалізація на `Map` в JavaScript

`Map` у JS **зберігає порядок вставки**. Тому LRU можна зробити без власного списку: при `get` видаляємо запис і вставляємо знову (він стає «найновішим»), а при переповненні видаляємо **перший** ключ (`map.keys().next().value`) — найдавніший (`LRUCacheMap`). Операції `O(1)` амортизовано. `simulate(LRUCacheMap, 3, [1, 2, 3, 1, 4, 2, 5, 1, 2, 3])` = `{ hits: 2, misses: 8, keys: [3, 2, 1] }`.

## 7. Складність

- **`get`, `put` — `O(1)`** (хеш + посилання списку).
- **Пам'ять `O(capacity)`** (вузли + записи `Map`).
- Мінус: накладні витрати на вказівники й хеш; у багатопотоковому середовищі потрібне блокування (або шардування, наближений LRU — **CLOCK**, **Segmented LRU**, **TinyLFU**).

## 8. Порівняння політик витіснення

| Політика | Витісняє | Плюси | Мінуси |
|---|---|---|---|
| **LRU** | найдавніше використане | проста, враховує недавність | «сканування» (одноразовий прохід) вимиває корисне |
| **FIFO** | найстаріше додане | простіша | ігнорує використання |
| **LFU** | найрідше використовуване | враховує частоту | старі популярні записи «застрягають» |
| **Random** | випадкове | `O(1)`, без метаданих | непередбачувана |
| **Belady (OPT)** | те, що знадобиться найпізніше | теоретичний оптимум | потребує знання майбутнього |

На послідовності `[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]` при `capacity = 3`: LRU — `{ hits: 2, misses: 10, keys: [5, 4, 3] }`, FIFO — `{ hits: 3, misses: 9, keys: [5, 3, 4] }`, оптимальний — `{ hits: 5, misses: 7 }`. **Аномалія Біледі** (FIFO): збільшення ємності може *погіршити* кількість промахів — LRU цього не має (властивість стека).

## 9. Застосування й розширення

- **Memoization з обмеженням пам'яті:** `memoizeLru(f, 2)`: при послідовності викликів із повтором кількість реальних обчислень менша.
- **CDN, DNS-кеш, кеш запитів БД, кеш сторінок ОС, браузерний кеш.**
- **TTL-кеш:** додатково до LRU записи мають час життя: `ttlSimulate([['put', 'a', 1, 0], ['get', 'a', null, 5], ['get', 'a', null, 11]], 10)` = `[1, -1]`.
- **LFU** (O(1)-варіант із групами за частотою), **2Q**, **ARC** — складніші політики, стійкі до сканувань.
- **Системний дизайн:** LRU як локальний кеш + Redis (`maxmemory-policy allkeys-lru`) як розподілений.

## 10. Типові помилки

1. **Не оновлювати свіжість при `get`** — це звичайний FIFO.
2. **Не оновлювати значення й порядок при `put` існуючого ключа** — дублікати.
3. **Забути видаляти ключ із `map` при витісненні** — витік.
4. **Витіснення до вставки замість після** (або наоборот) — розмір тимчасово `capacity + 1`; важливо порядок.
5. **Список без сентинелів** — зайві перевірки `null`.
6. **Односпрямований список** — видалення вузла за `O(n)`.
7. **Ємність 0** — обробити окремо.
8. **Використання `Object` для ключів** — перетворення ключів у рядки; `Map` зберігає типи.
9. **Конкурентний доступ** без синхронізації.

## 11. Алгоритм (стисло)

1. `Map: key → вузол`; двозв'язний список із `head`/`tail` (найсвіжіший ближче до `head`).
2. `get`: перемістити вузол у голову.
3. `put`: оновити/вставити в голову; при переповненні видалити вузол перед `tail` і ключ із `Map`.
4. Час `O(1)` на операцію.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що повернуть операції `get` у класичній послідовності для `capacity = 2`?

```js
lruSequence(2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]])
```

**2.** Те саме для `LRUCacheMap`? Чи збігається результат?

```js
(() => { const c = new LRUCacheMap(2); const out = []; for (const [op, k, v] of [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['get', 2], ['put', 4, 4], ['get', 1], ['get', 3], ['get', 4]]) { if (op === 'put') c.put(k, v); else out.push(c.get(k)); } return out; })()
```

**3.** Який порядок ключів (від найсвіжішого) після `put 1, 2, 3` і `get 1` при `capacity = 3`?

```js
(() => { const c = new LRUCache(3); c.put(1, 1); c.put(2, 2); c.put(3, 3); c.get(1); return c.keys(); })()
```

**4.** Який вміст після `put 1, 2, 3, 4` при `capacity = 3`?

```js
(() => { const c = new LRUCache(3); [1, 2, 3, 4].forEach(k => c.put(k, k)); return [c.keys(), c.size]; })()
```

**5.** Що поверне `get` відсутнього ключа та скільки промахів зафіксовано?

```js
(() => { const c = new LRUCache(2); const v = c.get(9); return [v, c.misses, c.hits]; })()
```

**6.** Що станеться при оновленні існуючого ключа `put(1, 10)`: значення й позиція?

```js
(() => { const c = new LRUCache(2); c.put(1, 1); c.put(2, 2); c.put(1, 10); return [c.get(1), c.keys()]; })()
```

**7.** Чи збільшується розмір при оновленні існуючого ключа?

```js
(() => { const c = new LRUCache(2); c.put(1, 1); c.put(1, 2); c.put(1, 3); return c.size; })()
```

**8.** Що поверне кеш із `capacity = 0`?

```js
(() => { const c = new LRUCache(0); c.put(1, 1); return [c.get(1), c.size]; })()
```

**9.** Що поверне кеш із `capacity = 1` на послідовності `put 1, put 2, get 1, get 2`?

```js
lruSequence(1, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['get', 2]])
```

**10.** Яке значення `0` (falsy) для `put(1, 0)` — чи відрізняється від `-1`?

```js
lruSequence(2, [['put', 1, 0], ['get', 1], ['get', 2]])
```

**11.** Результат симуляції LRU `simulate(LRUCache, 3, [1, 2, 3, 1, 4, 2, 5, 1, 2, 3])`?

```js
simulate(LRUCache, 3, [1, 2, 3, 1, 4, 2, 5, 1, 2, 3])
```

**12.** Те саме для `LRUCacheMap` — чи збігаються?

```js
JSON.stringify(simulate(LRUCache, 3, [1, 2, 3, 1, 4, 2, 5, 1, 2, 3])) === JSON.stringify(simulate(LRUCacheMap, 3, [1, 2, 3, 1, 4, 2, 5, 1, 2, 3]))
```

**13.** Чи збігаються дві реалізації LRU на 100 «псевдовипадкових» послідовностях звернень?

```js
(() => { let ok = true; for (let t = 1; t <= 100; t++) { const acc = Array.from({ length: 30 }, (_, i) => (t * 7 + i * i * 3 + i) % 6); if (JSON.stringify(simulate(LRUCache, 3, acc)) !== JSON.stringify(simulate(LRUCacheMap, 3, acc))) ok = false; } return ok; })()
```

### Рівень 2. Робота алгоритму

**14.** Порівняйте LRU, FIFO та оптимальну політику на `[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]`, `capacity = 3` (кількість влучань).

```js
[simulate(LRUCache, 3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits, fifoSimulate(3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits, optimalSimulate(3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits]
```

**15.** Аномалія Біледі для FIFO: влучання при `capacity = 3` та `4` на `[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]`.

```js
[fifoSimulate(3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits, fifoSimulate(4, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits]
```

**16.** А для LRU при тих самих ємностях?

```js
[simulate(LRUCache, 3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits, simulate(LRUCache, 4, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]).hits]
```

**17.** Яка частка влучань (`hitRatio`) для LRU на послідовності з попереднього завдання при ємності 3?

```js
hitRatio(simulate(LRUCache, 3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]))
```

**18.** Сканування: чи вимиває цикл `1..5` кеш ємності 4 для LRU? Влучання на циклічному доступі `[1, 2, 3, 4, 5]` ×4.

```js
simulate(LRUCache, 4, [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]).hits
```

**19.** А для LFU на тому ж циклічному доступі?

```js
simulate(LFUCache, 4, [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]).hits
```

**20.** Що кешує LFU: який ключ витіснить `put 3` для `capacity = 2` після `put 1, put 2, get 1`?

```js
(() => { const c = new LFUCache(2); c.put(1, 1); c.put(2, 2); c.get(1); c.put(3, 3); return c.keys(); })()
```

**21.** Скільки реальних обчислень робить `memoizeLru(x => x * x, 2)` на викликах `1, 2, 1, 3, 1, 2`?

```js
(() => { const f = memoizeLru(x => x * x, 2); [1, 2, 1, 3, 1, 2].forEach(f); return f.calls(); })()
```

**22.** А з ємністю 3?

```js
(() => { const f = memoizeLru(x => x * x, 3); [1, 2, 1, 3, 1, 2].forEach(f); return f.calls(); })()
```

**23.** Що поверне `ttlSimulate([['put', 'a', 1, 0], ['get', 'a', null, 5], ['get', 'a', null, 11]], 10)`?

```js
ttlSimulate([['put', 'a', 1, 0], ['get', 'a', null, 5], ['get', 'a', null, 11]], 10)
```

**24.** Скільки операцій `Map` виконує `get` у `LRUCacheMap` (видалення + вставка)?

```js
2
```

**25.** Яка складність операцій і пам'ять: скільки вузлів зберігає LRU ємності 1000 (плюс 2 сентинели)?

```js
1000 + 2
```

**26.** Скільки різних порядків можливих станів LRU ємності 3 з ключів `1..4` (вибір 3 із 4 і порядок)?

```js
4 * 3 * 2
```

### Рівень 3. Складність і нюанси

**27.** Напишіть `lruWithEvictionLog(capacity, ops)` — послідовність витіснених ключів у порядку витіснення.

**28.** Напишіть `countMisses(capacity, accesses)` — кількість промахів LRU (через `simulate`).

**29.** Напишіть `minCapacityForAllHits(accesses)` — найменша ємність, при якій LRU не має промахів після першого звернення до кожного ключа (кількість різних ключів).

**30.** Напишіть `mostRecentKeys(cache, n)` — `n` найсвіжіших ключів.

**31.** Напишіть `lruPeekOldest(cache)` — найдавніший ключ без зміни порядку.

**32.** Напишіть `simulateTwoLevel(l1, l2, accesses)` — дворівневий кеш: промах L1 перевіряє L2; повернути `[L1 hits, L2 hits, повні промахи]`.

**33.** Напишіть `fifoVsLruWinner(capacity, accesses)` — `'lru'`, `'fifo'` або `'tie'` за кількістю влучань.

**34.** Напишіть `warmCache(capacity, keys)` — кеш, заповнений ключами по порядку; повертає ключі від найсвіжішого.

**35.** Напишіть `reuseDistances(accesses)` — для кожного звернення кількість різних ключів між попереднім зверненням до нього та поточним (`Infinity` для першого).

**36.** Напишіть `hitIfDistanceBelow(accesses, capacity)` — кількість влучань LRU за правилом «зворотна відстань < ємності».

**37.** Яка ідея LRU-кешу і яке припущення вона робить?

**38.** Чому для `O(1)` потрібні хеш-таблиця й двозв'язний список?

**39.** Навіщо фіктивні вузли `head` і `tail`?

### Рівень 4. Задачі з інтерв'ю

**40.** Як реалізувати LRU на `Map` у JavaScript?

**41.** Чим LRU відрізняється від FIFO та LFU?

**42.** Що таке аномалія Біледі і чи є вона в LRU?

**43.** Яка слабкість LRU?

**44.** Що таке політика Belady (OPT)?

**45.** Як додати TTL до LRU-кешу?

**46.** Які проблеми виникають у багатопотоковому LRU?

**47.** Скільки влучань у LRU ємності 2 на `[1, 2, 1, 3, 1, 2, 1, 3]`?

```js
simulate(LRUCache, 2, [1, 2, 1, 3, 1, 2, 1, 3]).hits
```

**48.** Скільки влучань у LRU ємності 2 на `[1, 2, 3, 1, 2, 3]` (цикл довший за кеш)?

```js
simulate(LRUCache, 2, [1, 2, 3, 1, 2, 3]).hits
```

**49.** Яка частка влучань для звернень `[1, 1, 1, 1]` при ємності 1?

```js
hitRatio(simulate(LRUCache, 1, [1, 1, 1, 1]))
```

**50.** Що містить кеш після `simulate(LRUCache, 2, [1, 2, 3])`?

```js
simulate(LRUCache, 2, [1, 2, 3]).keys
```

### Відповіді

1. `[1, -1, -1, 3, 4]`
2. `[1, -1, -1, 3, 4]`
3. `[1, 3, 2]`
4. `[[4, 3, 2], 3]`
5. `[-1, 1, 0]`
6. `[10, [1, 2]]`
7. `1`
8. `[-1, 0]`
9. `[-1, 2]`
10. `[0, -1]`
11. `{ hits: 2, misses: 8, keys: [3, 2, 1] }`
12. `true`
13. `true`
14. `[2, 3, 5]`
15. `[3, 2]`
16. `[2, 4]`
17. `0.167`
18. `0`
19. `0`
20. `[1, 3]`
21. `4`
22. `3`
23. `[1, -1]`
24. `2`
25. `1002`
26. `24`
27. Приклад розв'язку:

   ```js
   function lruWithEvictionLog(cap, ops) {
     const m = new Map();
     const ev = [];
     for (const [op, k, v] of ops) {
       if (op === 'get') {
         if (m.has(k)) {
           const x = m.get(k);
           m.delete(k);
           m.set(k, x);
         }
       } else {
         if (m.has(k)) m.delete(k);
         m.set(k, v);
         if (m.size > cap) {
           const old = m.keys().next().value;
           m.delete(old);
           ev.push(old);
         }
       }
     }
     return ev;
   }
   ```

   Виклик `lruWithEvictionLog(2, [['put', 1, 1], ['put', 2, 2], ['get', 1], ['put', 3, 3], ['put', 4, 4]])` → `[2, 1]`

28. Приклад розв'язку:

   ```js
   const countMisses = (c, a) => simulate(LRUCache, c, a).misses
   ```

   Виклик `[countMisses(3, [1, 2, 3, 1, 4, 2, 5, 1, 2, 3]), countMisses(1, [1, 1, 1])]` → `[8, 1]`

29. Приклад розв'язку:

   ```js
   const minCapacityForAllHits = (a) => new Set(a).size
   ```

   Виклик `[minCapacityForAllHits([1, 2, 3, 1, 2]), minCapacityForAllHits([5, 5, 5])]` → `[3, 1]`

30. Приклад розв'язку:

   ```js
   const mostRecentKeys = (c, n) => c.keys().slice(0, n)
   ```

   Виклик `(() => { const c = new LRUCache(4); [1, 2, 3, 4].forEach(k => c.put(k, k)); c.get(2); return mostRecentKeys(c, 2); })()` → `[2, 4]`

31. Приклад розв'язку:

   ```js
   const lruPeekOldest = (c) => {
     const k = c.keys();
     return k[k.length - 1];
   }
   ```

   Виклик `(() => { const c = new LRUCache(3); [1, 2, 3].forEach(k => c.put(k, k)); c.get(1); return lruPeekOldest(c); })()` → `2`

32. Приклад розв'язку:

   ```js
   function simulateTwoLevel(l1, l2, acc) {
     const a = new LRUCache(l1), b = new LRUCache(l2);
     let h1 = 0, h2 = 0, miss = 0;
     for (const k of acc) {
       if (a.get(k) !== -1) {
         h1++;
         continue;
       }
       if (b.get(k) !== -1) {
         h2++;
         a.put(k, k);
         continue;
       }
       miss++;
       a.put(k, k);
       b.put(k, k);
     }
     return [h1, h2, miss];
   }
   ```

   Виклик `simulateTwoLevel(2, 4, [1, 2, 3, 1, 2, 4, 5, 1])` → `[0, 3, 5]`

33. Приклад розв'язку:

   ```js
   function fifoVsLruWinner(c, a) {
     const l = simulate(LRUCache, c, a).hits, f = fifoSimulate(c, a).hits;
     return l > f ? 'lru' : f > l ? 'fifo' : 'tie';
   }
   ```

   Виклик `[fifoVsLruWinner(3, [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]), fifoVsLruWinner(2, [1, 2, 1, 3, 1, 2, 1, 3]), fifoVsLruWinner(2, [1, 1, 1])]` → `['fifo', 'lru', 'tie']`

34. Приклад розв'язку:

   ```js
   function warmCache(cap, keys) {
     const c = new LRUCache(cap);
     keys.forEach(k => c.put(k, k));
     return c.keys();
   }
   ```

   Виклик `[warmCache(3, [1, 2, 3, 4, 5]), warmCache(5, [1, 2])]` → `[[5, 4, 3], [2, 1]]`

35. Приклад розв'язку:

   ```js
   function reuseDistances(a) {
     return a.map((k, i) => { let j = i - 1; while (j >= 0 && a[j] !== k) j--; if (j < 0) return Infinity; return new Set(a.slice(j + 1, i)).size; });
   }
   ```

   Виклик `reuseDistances([1, 2, 3, 1, 2, 2])` → `[Infinity, Infinity, Infinity, 2, 2, 0]`

36. Приклад розв'язку:

   ```js
   function hitIfDistanceBelow(a, cap) {
     return reuseDistances(a).filter(d => d < cap).length;
   }
   function reuseDistances(a) {
     return a.map((k, i) => { let j = i - 1; while (j >= 0 && a[j] !== k) j--; if (j < 0) return Infinity; return new Set(a.slice(j + 1, i)).size; });
   }
   ```

   Виклик `[hitIfDistanceBelow([1, 2, 3, 1, 2, 3, 1], 3), simulate(LRUCache, 3, [1, 2, 3, 1, 2, 3, 1]).hits]` → `[4, 4]`

37. Видаляти запис, до якого найдавніше зверталися, припускаючи часову локальність: недавно використане, ймовірно, знадобиться знову.
38. Хеш-таблиця знаходить вузол за ключем за `O(1)`, а двозв'язний список дозволяє видалити вузол і вставити його в голову за `O(1)`, бо відомі його сусіди. Окремо жодна структура не дає обох властивостей.
39. Вони усувають граничні випадки порожнього списку й видалення першого/останнього елемента: будь-який реальний вузол завжди має `prev` і `next`.
40. `Map` зберігає порядок вставки: при `get` видаляємо ключ і вставляємо знову (він стає найновішим), при переповненні видаляємо перший ключ `map.keys().next().value` — найдавніший.
41. FIFO витісняє найраніше додане незалежно від використання, LFU — найрідше використовуване, LRU — найдавніше використане. LRU враховує недавність, LFU частоту, FIFO — лише порядок додавання.
42. Для FIFO збільшення ємності кешу може збільшити кількість промахів. LRU має властивість стека (набір у меншому кеші є підмножиною набору в більшому), тому такої аномалії не має.
43. Сканування: одноразовий прохід по великому набору даних витісняє корисні записи, що використовуються часто. Від цього захищають 2Q, ARC, TinyLFU, сегментований LRU.
44. Теоретично оптимальна політика: витісняти запис, що знадобиться найпізніше в майбутньому. Потребує знання майбутніх звернень, тому служить еталоном для порівняння.
45. Зберігати з кожним записом час закінчення; при `get` перевіряти термін і видаляти прострочені записи (лінива очистка) та/або періодично очищувати; витіснення за LRU залишається для обмеження розміру.
46. Кожен `get` змінює структуру (переміщення в голову), тому потрібне блокування або шардування; наближені алгоритми (CLOCK, TinyLFU) зменшують конкуренцію, жертвуючи точністю порядку.
47. `3`
48. `0`
49. `0.75`
50. `[3, 2]`
