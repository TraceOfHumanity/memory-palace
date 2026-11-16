# HashTable — хеш-таблиця: ключ → значення за O(1)

> Хеш-таблиця — одна з найважливіших структур у програмуванні. Під капотом вона стоїть за `Map`, `Set`, `Object`, словниками Python, кешами, базами даних. Ідея проста й красива: **перетворити ключ на число — і використати це число як індекс масиву**.

## 1. Проблема і ідея

Масив дає миттєвий доступ за **числовим індексом**: `arr[3]`. А хочеться `prices["bolts"]` — за **рядком**.

Рішення: функція `hash(key)`, яка **перетворює ключ на індекс**:

```
"bolts" ──hash──▶ 4          dataMap[4] = ["bolts", 1400]
"lumber" ──hash──▶ 6         dataMap[6] = ["lumber", 70]
```

Тоді і запис, і читання — одна обчислена адреса: **O(1)** у середньому.

```
індекс:   0    1    2    3    4              5    6
        [   ][   ][   ][   ][ bolts:1400 ][   ][ lumber:70 ]
```

## 2. Хеш-функція

Вимоги до хорошої хеш-функції:

1. **Детермінована:** той самий ключ → завжди той самий індекс;
2. **Швидка;**
3. **Рівномірна:** ключі розподіляються по всіх «відрах» (buckets) приблизно порівну;
4. **Чутлива до порядку символів** (інакше «abc» і «cba» збігаються).

Приклад із твоєї реалізації: `hash = (hash + charCode × 23) % size`. Проблема: це по суті **сума** кодів символів, тому **порядок не має значення**. Перевірено для size = 7:

```
hash("abc") = 0, hash("cba") = 0, hash("bca") = 0   ← усі анаграми в одному відрі!
```

Покращення — множити накопичений хеш перед додаванням (**поліноміальний хеш**):

```ts
h = (h * 31 + charCode) % size
// hash("abc") = 6, hash("cba") = 1, hash("bca") = 2  — різні!
```

(Значення 31 — просте число; Java використовує його в `String.hashCode`.) Ще популярна функція **djb2**: `h = h * 33 + c`, початок `5381`.

> **Чому розмір таблиці — просте число?** Якщо ключі мають спільні дільники з розміром таблиці, вони «слипаються» в кілька відер. Простий розмір (7, 11, 31…) розсіює їх краще.

## 3. Колізії

Різних ключів нескінченно, відер — скінченна кількість, тож **колізії неминучі** (різні ключі → один індекс). У твоєму прикладі для size = 7: `bolts → 4`, `washers → 4`, `lumber → 6` — перша колізія вже на трьох ключах.

Два основні способи розв'язання:

| Спосіб | Як | Плюси | Мінуси |
|---|---|---|---|
| **Ланцюжки (chaining)** | у кожному відрі — список пар | просто, видалення легке, не боїться високого заповнення | додаткова пам'ять, гірший кеш |
| **Відкрита адресація** | шукаємо наступну вільну клітинку (зондування) | компактно, добре для кешу | складніше видалення (надгробки), чутлива до заповнення |

## 4. Твоя реалізація (ланцюжки)

```ts
class HashTable {
  dataMap: any[];
  constructor(size: number = 7) {
    this.dataMap = new Array(size);
  }

  _hash(key: string) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash + key.charCodeAt(i) * 23) % this.dataMap.length;
    }
    return hash;
  }

  set(key: string, value: any) {
    const index = this._hash(key);
    if (!this.dataMap[index]) {
      this.dataMap[index] = [];
    }
    this.dataMap[index].push([key, value]);
  }

  get(key: string) {
    const index = this._hash(key);
    if (this.dataMap[index]) {
      for (let i = 0; i < this.dataMap[index].length; i++) {
        if (this.dataMap[index][i][0] === key) {
          return this.dataMap[index][i][1];
        }
      }
    }
  }

  keys() {
    const allKeys: string[] = [];
    for (let i = 0; i < this.dataMap.length; i++) {
      if (this.dataMap[i]) {
        for (let j = 0; j < this.dataMap[i].length; j++) {
          allKeys.push(this.dataMap[i][j][0]);
        }
      }
    }
    return allKeys;
  }
}
```

### Що добре
- класична схема chaining: `dataMap[index]` — масив пар `[key, value]`;
- розмір 7 — просте число;
- `get` перебирає відро, порівнюючи ключі;
- `keys()` проходить усі відра.

### Що виправити

1. **`set` не перевіряє, чи ключ уже є — створюються дублікати.** Перевірено: `set("a",1); set("a",2)` → `keys()` дає `["a","a"]`, а `get("a")` повертає **стару** `1`. Має оновлювати існуючу пару.
2. **Немає `delete`, `has`, `values`, `size`.**
3. **Немає зміни розміру.** При зростанні даних ланцюжки довшають і O(1) перетворюється на O(n). Потрібен **load factor** та **rehash**.
4. **Хеш-функція** порядконезалежна (анаграми, див. вище). Також `dataMap = new Array(size)` створює масив з **дірками**; зручніше одразу заповнити відрами (`Array.from({length}, () => [])`).
5. **`any`** замість узагальнених типів.
6. `get` неявно повертає `undefined` через виконання без `return` — краще писати явно.

## 5. Виправлена реалізація (варіант 1: ланцюжки)

```ts
// Вихідна версія робить set без перевірки існування ключа → дублікати. Тут ключі оновлюються.
class HashTable<V> {
  private buckets: [string, V][][];
  private count = 0;

  constructor(size = 7) {
    this.buckets = Array.from({length: size}, () => []);
  }

  get size(): number {
    return this.count;
  }

  // хеш: перетворює ключ на індекс «відра»
  private hash(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) % this.buckets.length;
    }
    return h;
  }

  set(key: string, value: V): this {
    const bucket = this.buckets[this.hash(key)];
    for (const pair of bucket) {
      if (pair[0] === key) {
        pair[1] = value; // ключ уже є → оновлюємо
        return this;
      }
    }
    bucket.push([key, value]);
    this.count++;
    if (this.count / this.buckets.length > 0.75) this.resize(this.buckets.length * 2 + 1);
    return this;
  }

  get(key: string): V | undefined {
    for (const [k, v] of this.buckets[this.hash(key)]) if (k === key) return v;
    return undefined;
  }

  has(key: string): boolean {
    return this.buckets[this.hash(key)].some(([k]) => k === key);
  }

  delete(key: string): boolean {
    const bucket = this.buckets[this.hash(key)];
    const i = bucket.findIndex(([k]) => k === key);
    if (i === -1) return false;
    bucket.splice(i, 1);
    this.count--;
    return true;
  }

  // збільшення таблиці: усі пари потрібно розкласти заново (хеш залежить від розміру)
  private resize(newSize: number): void {
    const old = this.buckets;
    this.buckets = Array.from({length: newSize}, () => []);
    this.count = 0;
    for (const bucket of old) for (const [k, v] of bucket) this.set(k, v);
  }

  *entries(): Generator<[string, V]> {
    for (const bucket of this.buckets) for (const pair of bucket) yield pair;
  }
  keys(): string[] {
    return [...this.entries()].map(([k]) => k);
  }
  values(): V[] {
    return [...this.entries()].map(([, v]) => v);
  }

  // для демонстрації: скільки елементів у кожному відрі
  bucketSizes(): number[] {
    return this.buckets.map(b => b.length);
  }
}
```


### Як це працює

**`set("bolts", 1400)`:** `hash("bolts")` → індекс відра → шукаємо в ньому пару з таким ключем → якщо знайшли, **оновлюємо**; якщо ні — додаємо `["bolts", 1400]` у кінець відра.

**`get("washers")` при колізії:** обчислили індекс відра (там уже лежить `bolts`), пройшли ланцюжок і порівняли **ключі** (`===`). Саме тому в парі зберігається **і ключ, і значення** — без ключа не відрізнити, чия це пара.

```
відро 4:  [["bolts", 1400]] → [["bolts", 1400], ["washers", 50]]
get("washers"): відро 4 → ключ "bolts" ≠ → ключ "washers" ✓ → 50
```

### Load factor і rehash

`load factor = кількість_елементів / кількість_відер`. Коли він перевищує 0.75, таблиця **збільшується** (тут `size * 2 + 1`) і **всі пари розкладаються заново** — бо `hash` залежить від розміру таблиці. Одна дорога операція O(n) трапляється рідко, тому в середньому `set` лишається **амортизовано O(1)** — те саме, що й у `push` масиву.

## 6. Варіант 2: відкрита адресація (лінійне зондування)

```ts
const EMPTY = Symbol('empty');
const TOMBSTONE = Symbol('tombstone');

class OpenAddressTable<V> {
  private keys_: (string | typeof EMPTY | typeof TOMBSTONE)[];
  private vals: (V | undefined)[];
  private count = 0; // живі елементи
  private used = 0; // живі + надгробки

  constructor(private capacity = 8) {
    this.keys_ = new Array(capacity).fill(EMPTY);
    this.vals = new Array(capacity);
  }

  private hash(key: string): number {
    let h = 5381; // djb2
    for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
    return h % this.capacity;
  }

  get size(): number {
    return this.count;
  }

  set(key: string, value: V): this {
    if ((this.used + 1) / this.capacity > 0.7) this.rehash(this.capacity * 2);
    let i = this.hash(key);
    let firstTomb = -1;
    while (this.keys_[i] !== EMPTY) {
      if (this.keys_[i] === key) {
        this.vals[i] = value;
        return this;
      }
      if (this.keys_[i] === TOMBSTONE && firstTomb === -1) firstTomb = i;
      i = (i + 1) % this.capacity; // лінійне зондування: крок 1
    }
    if (firstTomb !== -1) i = firstTomb;
    else this.used++;
    this.keys_[i] = key;
    this.vals[i] = value;
    this.count++;
    return this;
  }

  get(key: string): V | undefined {
    let i = this.hash(key);
    while (this.keys_[i] !== EMPTY) {
      if (this.keys_[i] === key) return this.vals[i];
      i = (i + 1) % this.capacity;
    }
    return undefined;
  }

  delete(key: string): boolean {
    let i = this.hash(key);
    while (this.keys_[i] !== EMPTY) {
      if (this.keys_[i] === key) {
        this.keys_[i] = TOMBSTONE; // не EMPTY! інакше пошук обірветься
        this.vals[i] = undefined;
        this.count--;
        return true;
      }
      i = (i + 1) % this.capacity;
    }
    return false;
  }

  private rehash(newCap: number): void {
    const oldK = this.keys_;
    const oldV = this.vals;
    this.capacity = newCap;
    this.keys_ = new Array(newCap).fill(EMPTY);
    this.vals = new Array(newCap);
    this.count = 0;
    this.used = 0;
    oldK.forEach((k, i) => {
      if (k !== EMPTY && k !== TOMBSTONE) this.set(k, oldV[i] as V);
    });
  }
}
```


**Ідея:** пари лежать прямо в масиві. Якщо клітинка зайнята — пробуємо **наступну** (`i + 1`, потім `i + 2`, …) по колу. Шукаємо так само: від хеш-індексу вперед, доки не знайдемо ключ або **порожню** клітинку (тоді ключа немає).

```
hash("A") = 2, hash("B") = 2 (колізія!), hash("C") = 3

вставляємо A:  слот 2 вільний            → [ ][ ][A][ ][ ]
вставляємо B:  слот 2 зайнятий → 3       → [ ][ ][A][B][ ]
вставляємо C:  слот 3 зайнятий (B) → 4   → [ ][ ][A][B][C]
шукаємо C:     hash = 3 → там B (не він) → 4 → C знайдено
```

Зверни увагу: C не мав колізії зі «своїм» слотом 3 — його витіснив B. Так колізії «розповзаються».

### Видалення і «надгробки» (tombstones)

Не можна просто зробити клітинку порожньою: пошук **обірветься** на ній і не дійде до елементів, що лежать далі. Тому видалена клітинка позначається спеціальним маркером **TOMBSTONE** — «тут щось було». Пошук проходить повз надгробок, а вставка може його перевикористати. Надгробки накопичуються → періодичний rehash.

### Кластеризація

При лінійному зондуванні заповнені клітинки утворюють **кластери**, що ростуть і сповільнюють пошук. Тому таблицю тримають заповненою не більше ~70%. (Інші схеми: квадратичне зондування, подвійне хешування.)

## 7. `Map` та `Object` у JavaScript

- **`Map`** — повноцінна хеш-таблиця: ключі **будь-якого типу**, зберігає **порядок вставки**, швидкий `size`, оптимізована під часті додавання/видалення. Має `get/set/has/delete`. Це правильний вибір для словника.
- **`Object`** — теж хеш-таблиця під капотом, але ключі лише рядки/символи, є прототип (`"constructor" in {}`), порядок ключів має правила (цілі ключі спочатку).
- **`Set`** — хеш-таблиця без значень.

Твоя реалізація потрібна, щоб **розуміти**, що робить `Map`. У реальному коді використовуй `Map`.

## 8. Складність

| Операція | У середньому | У гіршому |
|---|---|---|
| `set`, `get`, `has`, `delete` | **O(1)** | O(n) — усі ключі в одному відрі |
| `keys`, `values`, `entries` | O(n + розмір таблиці) | — |
| rehash | O(n), рідко | — |

Гірший випадок виникає при поганій хеш-функції або навмисних атаках (HashDoS): тому сучасні рушії використовують рандомізовані хеші.

## 9. Типові помилки

1. **Дублікати ключів** — `push` у відро без перевірки.
2. **Поганий хеш**: сума кодів (анаграми), `key.length`, константа.
3. **Не змінювати розмір** при зростанні.
4. **Порожня клітинка замість надгробка** при видаленні у відкритій адресації.
5. **Від'ємний індекс** при `% size` з від'ємним хешем (у JS `-5 % 7 = -5`).
6. Використовувати **об'єкти як ключі** в `{}`: вони перетворюються на `"[object Object]"` → усі колізії; для цього є `Map`.
7. Порівнювати значення замість ключів при пошуку у відрі.
8. Забути, що **порядок** обходу хеш-таблиці довільний (у власній реалізації).

## 10. Алгоритм: як працює хеш-таблиця

1. `index = hash(key) % size` (хеш — детермінований і рівномірний).
2. Записати/знайти пару у відрі `index`.
3. При колізії — ланцюжок або зондування.
4. Слідкувати за load factor; перевищив — збільшити і rehash.
5. Для реального коду → `Map`/`Set`.

## Задачі для закріплення

29 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Яка ідея хеш-таблиці і яка середня складність `set`/`get`/`delete`?

**2.** Що таке колізія і які два основні способи її розв'язати?

**3.** Що таке коефіцієнт завантаження (load factor) і навіщо потрібен ресайз?

**4.** Які властивості має хороша хеш-функція?

**5.** Що дасть хеш рядка `'ab'` за формулою `h = h * 31 + code` по модулю 8?

```js
(() => { let h = 0; for (const ch of 'ab') h = (h * 31 + ch.charCodeAt(0)) >>> 0; return [h, h % 8]; })()
```

**6.** Чи завжди однакові ключі дають однаковий хеш?

```js
(() => { const f = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }; return f('abc') === f('abc'); })()
```

**7.** Які колізії дає `key % 4` для ключів `1, 5, 9, 2`?

```js
[1, 5, 9, 2].map(k => k % 4)
```

**8.** Що поверне `'Aa'` і `'BB'` у Java-подібному хеші `h * 31 + code`?

```js
(() => { const f = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }; return [f('Aa'), f('BB')]; })()
```

### Рівень 2. Методи й поведінка

**9.** Реалізуйте `HashTable` із ланцюжками (`set`, `get`, `has`, `delete`). Що дасть послідовність?

```js
class HashTable {
  constructor(size = 8) { this.buckets = Array.from({ length: size }, () => []); this.count = 0 }
  #hash(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % this.buckets.length }
  set(key, value) {
    const b = this.buckets[this.#hash(key)]
    const e = b.find(p => p[0] === key)
    if (e) e[1] = value; else { b.push([key, value]); this.count++ }
    return this
  }
  get(key) { return this.buckets[this.#hash(key)].find(p => p[0] === key)?.[1] }
  has(key) { return this.buckets[this.#hash(key)].some(p => p[0] === key) }
  delete(key) {
    const b = this.buckets[this.#hash(key)]
    const i = b.findIndex(p => p[0] === key)
    if (i < 0) return false
    b.splice(i, 1); this.count--; return true
  }
}
```

**10.** Скільки елементів у кошиках після вставки 5 ключів у таблицю з 4 кошиками (довжини кошиків)?

```js
class HashTable {
  constructor(size = 8) { this.buckets = Array.from({ length: size }, () => []); this.count = 0 }
  #hash(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % this.buckets.length }
  set(key, value) {
    const b = this.buckets[this.#hash(key)]
    const e = b.find(p => p[0] === key)
    if (e) e[1] = value; else { b.push([key, value]); this.count++ }
    return this
  }
  get(key) { return this.buckets[this.#hash(key)].find(p => p[0] === key)?.[1] }
  has(key) { return this.buckets[this.#hash(key)].some(p => p[0] === key) }
  delete(key) {
    const b = this.buckets[this.#hash(key)]
    const i = b.findIndex(p => p[0] === key)
    if (i < 0) return false
    b.splice(i, 1); this.count--; return true
  }
}
```

**11.** Напишіть `resize(table)`, що подвоює кількість кошиків і перехешовує елементи.

```js
class HashTable {
  constructor(size = 8) { this.buckets = Array.from({ length: size }, () => []); this.count = 0 }
  #hash(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % this.buckets.length }
  set(key, value) {
    const b = this.buckets[this.#hash(key)]
    const e = b.find(p => p[0] === key)
    if (e) e[1] = value; else { b.push([key, value]); this.count++ }
    return this
  }
  get(key) { return this.buckets[this.#hash(key)].find(p => p[0] === key)?.[1] }
  has(key) { return this.buckets[this.#hash(key)].some(p => p[0] === key) }
  delete(key) {
    const b = this.buckets[this.#hash(key)]
    const i = b.findIndex(p => p[0] === key)
    if (i < 0) return false
    b.splice(i, 1); this.count--; return true
  }
}
function resize(t) {
  const old = t.buckets.flat()
  const n = new HashTable(t.buckets.length * 2)
  old.forEach(([k, v]) => n.set(k, v))
  return n
}
```

**12.** Напишіть `loadFactor(table)`.

```js
class HashTable {
  constructor(size = 8) { this.buckets = Array.from({ length: size }, () => []); this.count = 0 }
  #hash(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % this.buckets.length }
  set(key, value) {
    const b = this.buckets[this.#hash(key)]
    const e = b.find(p => p[0] === key)
    if (e) e[1] = value; else { b.push([key, value]); this.count++ }
    return this
  }
  get(key) { return this.buckets[this.#hash(key)].find(p => p[0] === key)?.[1] }
  has(key) { return this.buckets[this.#hash(key)].some(p => p[0] === key) }
  delete(key) {
    const b = this.buckets[this.#hash(key)]
    const i = b.findIndex(p => p[0] === key)
    if (i < 0) return false
    b.splice(i, 1); this.count--; return true
  }
}
const loadFactor = t => t.count / t.buckets.length
```

**13.** Напишіть `keys(table)` — усі ключі.

```js
class HashTable {
  constructor(size = 8) { this.buckets = Array.from({ length: size }, () => []); this.count = 0 }
  #hash(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % this.buckets.length }
  set(key, value) {
    const b = this.buckets[this.#hash(key)]
    const e = b.find(p => p[0] === key)
    if (e) e[1] = value; else { b.push([key, value]); this.count++ }
    return this
  }
  get(key) { return this.buckets[this.#hash(key)].find(p => p[0] === key)?.[1] }
  has(key) { return this.buckets[this.#hash(key)].some(p => p[0] === key) }
  delete(key) {
    const b = this.buckets[this.#hash(key)]
    const i = b.findIndex(p => p[0] === key)
    if (i < 0) return false
    b.splice(i, 1); this.count--; return true
  }
}
const keys = t => t.buckets.flat().map(p => p[0])
```

**14.** Реалізуйте таблицю з відкритою адресацією (лінійне зондування) на `set`/`get`. Що поверне `get` після колізій?

```js
class OpenTable {
  constructor(size = 8) { this.k = new Array(size).fill(undefined); this.v = new Array(size) }
  #h(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % this.k.length }
  set(key, val) {
    let i = this.#h(key)
    for (let n = 0; n < this.k.length; n++, i = (i + 1) % this.k.length) {
      if (this.k[i] === undefined || this.k[i] === key) { this.k[i] = key; this.v[i] = val; return true }
    }
    return false
  }
  get(key) {
    let i = this.#h(key)
    for (let n = 0; n < this.k.length; n++, i = (i + 1) % this.k.length) {
      if (this.k[i] === undefined) return undefined
      if (this.k[i] === key) return this.v[i]
    }
  }
}
```

**15.** Що станеться, якщо в таблиці з відкритою адресацією просто обнулити комірку при видаленні? Що поверне пошук ключа, що стояв далі в ланцюжку?

```js
(() => { const keys = ['a', 'b', 'c']; const idx = () => keys.findIndex(k => k === 'c'); keys[1] = undefined; let found = -1; for (let i = 0; i < keys.length; i++) { if (keys[i] === undefined) break; if (keys[i] === 'c') found = i; } return found; })()
```

**16.** Напишіть `twoSum(nums, target)` через хеш-таблицю (`Map`).

```js
function twoSum(nums, target) {
  const seen = new Map()
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i]
    seen.set(nums[i], i)
  }
  return null
}
```

### Рівень 3. Нюанси та пастки

**17.** Напишіть `groupAnagrams(words)` через `Map`.

```js
function groupAnagrams(words) {
  const m = new Map()
  for (const w of words) { const k = [...w].sort().join(''); m.set(k, [...(m.get(k) ?? []), w]) }
  return [...m.values()]
}
```

**18.** Напишіть `firstDuplicate(arr)`.

```js
function firstDuplicate(a) { const s = new Set(); for (const x of a) { if (s.has(x)) return x; s.add(x) } return null }
```

**19.** Напишіть `subarraySum(nums, k)` — кількість підмасивів із сумою `k` (префіксні суми й `Map`).

```js
function subarraySum(nums, k) {
  const m = new Map([[0, 1]]); let sum = 0, cnt = 0
  for (const x of nums) { sum += x; cnt += m.get(sum - k) ?? 0; m.set(sum, (m.get(sum) ?? 0) + 1) }
  return cnt
}
```

**20.** Напишіть `longestConsecutive(nums)` — довжина найдовшої послідовності підряд (через `Set`).

```js
function longestConsecutive(nums) {
  const s = new Set(nums); let best = 0
  for (const x of s) if (!s.has(x - 1)) { let y = x; while (s.has(y + 1)) y++; best = Math.max(best, y - x + 1) }
  return best
}
```

**21.** Напишіть `isIsomorphic(a, b)` для рядків.

```js
function isIsomorphic(a, b) {
  const m = new Map(), used = new Set()
  for (let i = 0; i < a.length; i++) {
    if (m.has(a[i])) { if (m.get(a[i]) !== b[i]) return false }
    else { if (used.has(b[i])) return false; m.set(a[i], b[i]); used.add(b[i]) }
  }
  return true
}
```

**22.** Напишіть `topKFrequent(nums, k)`.

```js
const topKFrequent = (nums, k) => { const m = new Map(); nums.forEach(x => m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).slice(0, k).map(p => p[0]) }
```

**23.** Напишіть `intersect(a, b)` — перетин двох масивів з урахуванням кратності.

```js
function intersect(a, b) {
  const m = new Map(); a.forEach(x => m.set(x, (m.get(x) ?? 0) + 1))
  const out = []
  for (const x of b) if (m.get(x) > 0) { out.push(x); m.set(x, m.get(x) - 1) }
  return out
}
```

**24.** Напишіть `wordPattern(pattern, s)`.

```js
function wordPattern(p, s) {
  const w = s.split(' ')
  if (w.length !== p.length) return false
  const a = new Map(), b = new Map()
  for (let i = 0; i < p.length; i++) {
    if ((a.has(p[i]) && a.get(p[i]) !== w[i]) || (b.has(w[i]) && b.get(w[i]) !== p[i])) return false
    a.set(p[i], w[i]); b.set(w[i], p[i])
  }
  return true
}
```

### Рівень 4. Практика й реалізація

**25.** Напишіть `containsNearbyDuplicate(nums, k)`.

```js
function containsNearbyDuplicate(nums, k) {
  const m = new Map()
  for (let i = 0; i < nums.length; i++) { if (m.has(nums[i]) && i - m.get(nums[i]) <= k) return true; m.set(nums[i], i) }
  return false
}
```

**26.** Напишіть `fourSumCount(a, b, c, d)` — кількість четвірок із нульовою сумою (через `Map` сум пар).

```js
function fourSumCount(a, b, c, d) {
  const m = new Map()
  for (const x of a) for (const y of b) m.set(x + y, (m.get(x + y) ?? 0) + 1)
  let n = 0
  for (const x of c) for (const y of d) n += m.get(-(x + y)) ?? 0
  return n
}
```

**27.** Напишіть `validAnagram(s, t)` через лічильник.

```js
function validAnagram(s, t) {
  if (s.length !== t.length) return false
  const m = new Map()
  for (const c of s) m.set(c, (m.get(c) ?? 0) + 1)
  for (const c of t) { if (!m.get(c)) return false; m.set(c, m.get(c) - 1) }
  return true
}
```

**28.** Напишіть `majorityElement(nums)` через `Map`.

```js
function majorityElement(nums) {
  const m = new Map(); let best, bc = 0
  for (const x of nums) { const c = (m.get(x) ?? 0) + 1; m.set(x, c); if (c > bc) { bc = c; best = x } }
  return best
}
```

**29.** Напишіть `happy(n)` — число щасливе, якщо послідовність сум квадратів цифр доходить до 1 (виявлення циклу через `Set`).

```js
function happy(n) {
  const seen = new Set()
  while (n !== 1 && !seen.has(n)) { seen.add(n); n = [...String(n)].reduce((s, d) => s + d * d, 0) }
  return n === 1
}
```

### Відповіді

1. Ключ через хеш-функцію перетворюється на індекс масиву; середня складність `O(1)`, у найгіршому випадку (усі ключі в одному кошику) — `O(n)`.
2. Колізія — коли різні ключі мають однаковий індекс. Способи: ланцюжки (кожен кошик — список) і відкрита адресація (пошук наступної вільної комірки).
3. `load = count / buckets`; коли він перевищує поріг (наприклад 0.75), таблицю збільшують і перехешують ключі, щоб ланцюжки лишались короткими.
4. Детермінована, швидка, рівномірно розподіляє ключі, малу зміну ключа перетворює на велику зміну хеша.
5. `[3105, 1]`
6. `true`
7. `[1, 1, 1, 2]`
8. `[2112, 2112]`
9. Виклик `(() => { const t = new HashTable(); t.set('a', 1).set('b', 2).set('a', 3); return [t.get('a'), t.get('z'), t.has('b'), t.count, t.delete('b'), t.delete('b'), t.count]; })()` → `[3, undefined, true, 2, true, false, 1]`
10. Виклик `(() => { const t = new HashTable(4); ['a', 'b', 'c', 'd', 'e'].forEach(k => t.set(k, 1)); return [t.buckets.map(b => b.length), t.count]; })()` → `[[1, 2, 1, 1], 5]`
11. Виклик `(() => { const t = new HashTable(2); ['a', 'b', 'c', 'd'].forEach((k, i) => t.set(k, i)); const r = resize(t); return [r.buckets.length, r.count, r.get('c')]; })()` → `[4, 4, 2]`
12. Виклик `(() => { const t = new HashTable(4); t.set('a', 1).set('b', 2); return loadFactor(t); })()` → `0.5`
13. Виклик `(() => { const t = new HashTable(4); t.set('x', 1).set('y', 2); return keys(t).sort(); })()` → `['x', 'y']`
14. Виклик `(() => { const t = new OpenTable(4); const r = ['a', 'e', 'i', 'm', 'q'].map((k, i) => t.set(k, i)); return [r, t.get('i'), t.get('zz')]; })()` → `[[true, true, true, true, false], 2, undefined]`
15. `-1`
16. Виклик `[twoSum([3, 2, 4], 6), twoSum([1, 2], 9)]` → `[[1, 2], null]`
17. Виклик `groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat'])` → `[['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]`
18. Виклик `[firstDuplicate([2, 1, 3, 5, 3, 2]), firstDuplicate([1, 2])]` → `[3, null]`
19. Виклик `[subarraySum([1, 1, 1], 2), subarraySum([1, 2, 3], 3)]` → `[2, 2]`
20. Виклик `[longestConsecutive([100, 4, 200, 1, 3, 2]), longestConsecutive([])]` → `[4, 0]`
21. Виклик `[isIsomorphic('egg', 'add'), isIsomorphic('foo', 'bar'), isIsomorphic('ab', 'aa')]` → `[true, false, false]`
22. Виклик `topKFrequent([1, 1, 1, 2, 2, 3], 2)` → `[1, 2]`
23. Виклик `intersect([1, 2, 2, 1], [2, 2, 3])` → `[2, 2]`
24. Виклик `[wordPattern('abba', 'dog cat cat dog'), wordPattern('abba', 'dog cat cat fish')]` → `[true, false]`
25. Виклик `[containsNearbyDuplicate([1, 2, 3, 1], 3), containsNearbyDuplicate([1, 0, 1, 1], 1), containsNearbyDuplicate([1, 2, 3, 1, 2, 3], 2)]` → `[true, true, false]`
26. Виклик `fourSumCount([1, 2], [-2, -1], [-1, 2], [0, 2])` → `2`
27. Виклик `[validAnagram('anagram', 'nagaram'), validAnagram('rat', 'car')]` → `[true, false]`
28. Виклик `[majorityElement([3, 2, 3]), majorityElement([2, 2, 1, 1, 1, 2, 2])]` → `[3, 2]`
29. Виклик `[happy(19), happy(2)]` → `[true, false]`
