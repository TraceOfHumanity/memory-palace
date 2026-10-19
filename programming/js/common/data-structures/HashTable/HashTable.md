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
