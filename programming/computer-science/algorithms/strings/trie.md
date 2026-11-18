# Trie — префіксне дерево (бор)

**Trie** (вимовляється «трай», також «префіксне дерево», «бор») — дерево для зберігання **множини рядків**, у якому кожне ребро позначене символом, а шлях від кореня до вузла утворює **префікс**. Вузли, де закінчується слово, позначаються прапором. Trie виконує пошук, вставку, видалення та — головне — **пошук за префіксом** за час `O(L)`, де `L` — довжина рядка, **незалежно від кількості слів**. Це основа автодоповнення, словників, T9, маршрутизації IP-адрес, перевірки правопису, Aho–Corasick.

## 1. Структура

Слова `cat`, `car`, `card`, `dog`:

```text
(root)
 ├─ c ─ a ─ t*        cat
 │       └─ r* ─ d*   car, card
 └─ d ─ o ─ g*        dog
```

`*` — кінець слова. Спільні префікси (`ca`) зберігаються **один раз** — звідси економія пам'яті для словників із повторюваними префіксами.

Кожен вузол містить:

- `children` — відображення «символ → дочірній вузол» (масив на 26 елементів, `Map` або об'єкт);
- `isEnd` — чи закінчується тут слово (часто також лічильник `count`/`pass` для підрахунку).

## 2. Операції

- **`insert(word)`:** йдемо від кореня, створюючи відсутні вузли; у кінці `isEnd = true`. `O(L)`.
- **`search(word)`:** йдемо за символами; якщо шлях обривається — `false`; у кінці перевіряємо `isEnd`. `O(L)`.
- **`startsWith(prefix)`:** як `search`, але `isEnd` не перевіряємо. `O(L)`.
- **`delete(word)`:** рекурсивно знімаємо `isEnd`, а вузли без дітей і без слів видаляємо вгору. `O(L)`.
- **`autocomplete(prefix)`:** дійти до вузла префікса, потім DFS по піддереву, збираючи слова. `O(L + кількість символів у піддереві)`.

Приклад: після вставки `['apple', 'app', 'apt', 'bat']`: `search('app')` = `true`, `search('ap')` = `false`, `startsWith('ap')` = `true`; автодоповнення `ap`: `['app', 'apple', 'apt']`.

## 3. Реалізація

```js
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.pass = 0;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
    this.size = 0;
  }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, new TrieNode());
      node = node.children.get(ch);
      node.pass++;
    }
    if (!node.isEnd) { node.isEnd = true; this.size++; }
  }
  find(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }
  search(word) {
    const n = this.find(word);
    return n !== null && n.isEnd;
  }
  startsWith(prefix) {
    return this.find(prefix) !== null;
  }
  countWithPrefix(prefix) {
    const n = this.find(prefix);
    return n ? n.pass : 0;
  }
  autocomplete(prefix, limit = Infinity) {
    const start = this.find(prefix);
    const res = [];
    if (!start) return res;
    const go = (node, acc) => {
      if (res.length >= limit) return;
      if (node.isEnd) res.push(acc);
      for (const ch of [...node.children.keys()].sort()) go(node.children.get(ch), acc + ch);
    };
    go(start, prefix);
    return res;
  }
  delete(word) {
    const go = (node, i) => {
      if (i === word.length) {
        if (!node.isEnd) return false;
        node.isEnd = false;
        this.size--;
        return true;
      }
      const child = node.children.get(word[i]);
      if (!child) return false;
      const removed = go(child, i + 1);
      if (removed) {
        child.pass--;
        if (child.pass === 0) node.children.delete(word[i]);
      }
      return removed;
    };
    return go(this.root, 0);
  }
  longestCommonPrefix() {
    let node = this.root;
    let prefix = '';
    while (node.children.size === 1 && !node.isEnd) {
      const [ch, next] = [...node.children][0];
      prefix += ch;
      node = next;
    }
    return prefix;
  }
  nodeCount() {
    let c = 0;
    const go = (n) => { c++; for (const ch of n.children.values()) go(ch); };
    go(this.root);
    return c;
  }
}

function buildTrie(words) {
  const t = new Trie();
  for (const w of words) t.insert(w);
  return t;
}

function wildcardSearch(trie, pattern) {
  const go = (node, i) => {
    if (i === pattern.length) return node.isEnd;
    const c = pattern[i];
    if (c === '.') {
      for (const ch of node.children.values()) if (go(ch, i + 1)) return true;
      return false;
    }
    const next = node.children.get(c);
    return next ? go(next, i + 1) : false;
  };
  return go(trie.root, 0);
}

function shortestRoot(dictionary, sentence) {
  const t = buildTrie(dictionary);
  return sentence.split(' ').map((w) => {
    let node = t.root;
    let prefix = '';
    for (const ch of w) {
      if (!node.children.has(ch)) return w;
      node = node.children.get(ch);
      prefix += ch;
      if (node.isEnd) return prefix;
    }
    return w;
  }).join(' ');
}

function longestWordBuiltFromOthers(words) {
  const t = buildTrie(words);
  let best = '';
  for (const w of words) {
    let node = t.root;
    let ok = true;
    for (let i = 0; i < w.length; i++) {
      node = node.children.get(w[i]);
      if (!node.isEnd) { ok = false; break; }
    }
    if (ok && (w.length > best.length || (w.length === best.length && w < best))) best = w;
  }
  return best;
}

function wordSearchII(board, words) {
  const t = buildTrie(words);
  const R = board.length;
  const C = board[0].length;
  const found = new Set();
  const go = (r, c, node, path) => {
    if (r < 0 || c < 0 || r >= R || c >= C) return;
    const ch = board[r][c];
    if (ch === '#' || !node.children.has(ch)) return;
    const next = node.children.get(ch);
    const word = path + ch;
    if (next.isEnd) found.add(word);
    board[r][c] = '#';
    go(r + 1, c, next, word);
    go(r - 1, c, next, word);
    go(r, c + 1, next, word);
    go(r, c - 1, next, word);
    board[r][c] = ch;
  };
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) go(r, c, t.root, '');
  return [...found].sort();
}

function maxXorPair(nums) {
  const root = {};
  const bits = 31;
  for (const x of nums) {
    let node = root;
    for (let b = bits - 1; b >= 0; b--) {
      const bit = (x >> b) & 1;
      node[bit] = node[bit] || {};
      node = node[bit];
    }
  }
  let best = 0;
  for (const x of nums) {
    let node = root;
    let cur = 0;
    for (let b = bits - 1; b >= 0; b--) {
      const bit = (x >> b) & 1;
      const want = 1 - bit;
      if (node[want]) { cur |= 1 << b; node = node[want]; }
      else node = node[bit];
    }
    best = Math.max(best, cur);
  }
  return best;
}

function mapSumPrefix(pairs, prefix) {
  const t = new Trie();
  const vals = new Map();
  for (const [k, v] of pairs) vals.set(k, v);
  for (const k of vals.keys()) t.insert(k);
  let sum = 0;
  for (const w of t.autocomplete(prefix)) sum += vals.get(w);
  return sum;
}

function replaceByPrefixCount(words, prefixes) {
  const t = buildTrie(words);
  return prefixes.map((p) => t.countWithPrefix(p));
}

function compressedNodeCount(words) {
  const t = buildTrie(words);
  let c = 0;
  const go = (n, isRoot) => {
    if (isRoot || n.isEnd || n.children.size !== 1) c++;
    for (const ch of n.children.values()) go(ch, false);
  };
  go(t.root, true);
  return c;
}

function lexicographicallySorted(words) {
  return buildTrie(words).autocomplete('');
}
```

## 4. Складність

| Операція | Trie | Хеш-таблиця | Відсортований масив |
|---|---|---|---|
| Вставка | `O(L)` | `O(L)` | `O(n)` |
| Пошук слова | `O(L)` | `O(L)` | `O(L log n)` |
| Пошук за префіксом | `O(L)` | `O(n·L)` | `O(L log n)` |
| Автодоповнення | `O(L + вихід)` | неможливо без сканування | `O(L log n + вихід)` |
| Відсортований обхід | `O(сума довжин)` | потребує сортування | вже |
| Пам'ять | `O(Σ L)` у найгіршому | `O(Σ L)` | `O(Σ L)` |

`L` — довжина слова. **Пам'ять** — головна вада: кожен вузол може мати до `σ` дітей (алфавіт). Приклад: `buildTrie(['apple', 'app', 'apt', 'bat']).nodeCount()` = `10` (враховуючи корінь) при загальній довжині слів 14.

Економія пам'яті:

- **Стиснене дерево (radix tree, Patricia trie):** ланцюжки вузлів з одним дочірнім зливаються в одне ребро з рядковою міткою: `compressedNodeCount(['apple', 'app', 'apt', 'bat'])` = `6` проти 10 вузлів.
- **Троїчне дерево пошуку (ternary search tree):** кожен вузол має `<`, `=`, `>` — економніше за масив 26 дітей.
- **Подвійний масив (double-array trie), DAWG/мінімальний автомат:** об'єднання спільних суфіксів.

## 5. Задачі та застосування

- **Автодоповнення:** `autocomplete('ap', 2)` — перші дві підказки; у реальних системах вузли зберігають найпопулярніші підказки.
- **Підрахунок слів із префіксом:** `buildTrie(['app', 'apple', 'apt', 'bat']).countWithPrefix('ap')` = `3`.
- **Wildcard-пошук (`.` — довільна літера):** `wildcardSearch(buildTrie(['bad', 'dad', 'mad']), 'b.d')` = `true`, `'..d'` — `true`, `'b..'` — `true`, `'b.'` — `false`.
- **Заміна слів їх коренями:** `shortestRoot(['cat', 'bat', 'rat'], 'the cattle was rattled by the battery')` = `'the cat was rat by the bat'`.
- **Найдовше слово, що складається з інших слів по одній літері:** `longestWordBuiltFromOthers(['w', 'wo', 'wor', 'worl', 'world'])` = `'world'`.
- **Пошук слів на сітці (Word Search II):** DFS по сітці з одночасним рухом по trie — відсікає шляхи, що не є префіксами: `wordSearchII([['o', 'a', 'a', 'n'], ['e', 't', 'a', 'e'], ['i', 'h', 'k', 'r'], ['i', 'f', 'l', 'v']], ['oath', 'pea', 'eat', 'rain'])` = `['eat', 'oath']`.
- **Максимальний XOR двох чисел:** trie за бітами (0/1 — два «символи»): `maxXorPair([3, 10, 5, 25, 2, 8])` = `28` (`5 XOR 25`).
- **Маршрутизація IP (longest prefix match), T9, перевірка правопису, словники.**
- **Aho–Corasick:** trie + суфіксні посилання — пошук багатьох шаблонів за один прохід.
- **Лексикографічне сортування рядків:** `lexicographicallySorted(['banana', 'apple', 'app'])` = `['app', 'apple', 'banana']`.

## 6. Реалізація вузла: масив, Map чи об'єкт

| | Пам'ять на вузол | Швидкість | Коли |
|---|---|---|---|
| Масив `σ` | `σ` посилань | швидкий доступ | малий фіксований алфавіт (26) |
| `Map` | пропорційно дітям | хеш | довільний алфавіт, Unicode |
| Відсортований список | мінімум | `O(log σ)` | рідкі дерева |

Для Unicode кожен «символ» — кодова точка; обходьте рядок `for (const ch of word)`.

## 7. Типові помилки

1. **Не відрізняти слово від префікса:** `search('app')` після вставки лише `apple` має бути `false`.
2. **Видалення слова без очищення порожніх вузлів** — витік пам'яті.
3. **Видалення вузла, що є префіксом іншого слова.**
4. **Пошук `.` без рекурсії/зворотного відстеження.**
5. **Незвичні символи/регістр:** нормалізуйте (`toLowerCase`, NFC).
6. **Порожній рядок:** `insert('')` позначає корінь словом — окремий випадок.
7. **Забути лічильник проходжень** для підрахунку префіксів.
8. **Надмірна пам'ять:** trie для великих словників без стиснення.
9. **Рекурсія автодоповнення на довгих словах** — стек.

## 8. Алгоритм (стисло)

1. Вузол: `children`, `isEnd`.
2. `insert`: пройти/створити вузли за символами, `isEnd = true`.
3. `search`/`startsWith`: пройти за символами; для `search` перевірити `isEnd`.
4. Час `O(L)` на операцію; пам'ять `O(Σ L)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Чи знайде `search('app')` слово в trie зі словами `apple`, `app`, `apt`, `bat`?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).search('app')
```

**2.** А `search('ap')`?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).search('ap')
```

**3.** Що поверне `startsWith('ap')` та `startsWith('ba')` та `startsWith('c')`?

```js
[buildTrie(['apple', 'app', 'apt', 'bat']).startsWith('ap'), buildTrie(['apple', 'app', 'apt', 'bat']).startsWith('ba'), buildTrie(['apple', 'app', 'apt', 'bat']).startsWith('c')]
```

**4.** Яке автодоповнення `autocomplete('ap')`?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).autocomplete('ap')
```

**5.** Яке автодоповнення `autocomplete('')` (усі слова в алфавітному порядку)?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).autocomplete('')
```

**6.** Які перші два доповнення `autocomplete('a', 2)`?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).autocomplete('a', 2)
```

**7.** Скільки слів у trie (`size`) і скільки вузлів (`nodeCount`)?

```js
[buildTrie(['apple', 'app', 'apt', 'bat']).size, buildTrie(['apple', 'app', 'apt', 'bat']).nodeCount()]
```

**8.** Скільки слів починаються з `'ap'`?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).countWithPrefix('ap')
```

**9.** Що поверне `countWithPrefix('x')` для відсутнього префікса?

```js
buildTrie(['apple', 'app', 'apt', 'bat']).countWithPrefix('x')
```

**10.** Що станеться при повторній вставці `'app'`? Подивіться `size`.

```js
(() => { const t = buildTrie(['app']); t.insert('app'); return t.size; })()
```

**11.** Що поверне `search('')` для порожнього trie та після `insert('')`?

```js
(() => { const t = new Trie(); const a = t.search(''); t.insert(''); return [a, t.search('')]; })()
```

**12.** Що поверне `delete('app')` і чи залишиться `apple`?

```js
(() => { const t = buildTrie(['apple', 'app']); const d = t.delete('app'); return [d, t.search('app'), t.search('apple'), t.size]; })()
```

**13.** Що поверне `delete('apple')` і чи залишиться префікс `app` як слово?

```js
(() => { const t = buildTrie(['apple', 'app']); const d = t.delete('apple'); return [d, t.search('apple'), t.search('app'), t.nodeCount()]; })()
```

### Рівень 2. Робота алгоритму

**14.** Що поверне `delete` для відсутнього слова?

```js
buildTrie(['cat']).delete('dog')
```

**15.** Скільки вузлів лишилося після видалення єдиного слова `'cat'`?

```js
(() => { const t = buildTrie(['cat']); t.delete('cat'); return t.nodeCount(); })()
```

**16.** Яка найдовша спільна префіксна частина `longestCommonPrefix()` для `['flower', 'flow', 'flight']`?

```js
buildTrie(['flower', 'flow', 'flight']).longestCommonPrefix()
```

**17.** А для `['dog', 'racecar', 'car']`?

```js
buildTrie(['dog', 'racecar', 'car']).longestCommonPrefix()
```

**18.** Що поверне wildcard-пошук `'b.d'`, `'..d'`, `'b..'`, `'b.'` у `['bad', 'dad', 'mad']`?

```js
['b.d', '..d', 'b..', 'b.'].map(p => wildcardSearch(buildTrie(['bad', 'dad', 'mad']), p))
```

**19.** Що поверне `wildcardSearch` для шаблону з самих крапок `'...'` та `'....'`?

```js
['...', '....'].map(p => wildcardSearch(buildTrie(['bad', 'dad', 'mad']), p))
```

**20.** Що поверне `shortestRoot(['cat', 'bat', 'rat'], 'the cattle was rattled by the battery')`?

```js
shortestRoot(['cat', 'bat', 'rat'], 'the cattle was rattled by the battery')
```

**21.** А `shortestRoot(['a', 'b', 'c'], 'aadsfasf absbs bbab cadsfafs')`?

```js
shortestRoot(['a', 'b', 'c'], 'aadsfasf absbs bbab cadsfafs')
```

**22.** Яке найдовше слово, що будується по одній літері: `['w', 'wo', 'wor', 'worl', 'world']`?

```js
longestWordBuiltFromOthers(['w', 'wo', 'wor', 'worl', 'world'])
```

**23.** А `['a', 'banana', 'app', 'appl', 'ap', 'apply', 'apple']`?

```js
longestWordBuiltFromOthers(['a', 'banana', 'app', 'appl', 'ap', 'apply', 'apple'])
```

**24.** Що поверне `wordSearchII` для дошки `[['o','a','a','n'],['e','t','a','e'],['i','h','k','r'],['i','f','l','v']]` і слів `oath`, `pea`, `eat`, `rain`?

```js
wordSearchII([['o', 'a', 'a', 'n'], ['e', 't', 'a', 'e'], ['i', 'h', 'k', 'r'], ['i', 'f', 'l', 'v']], ['oath', 'pea', 'eat', 'rain'])
```

**25.** Що поверне `wordSearchII([['a', 'b'], ['c', 'd']], ['abcb'])`?

```js
wordSearchII([['a', 'b'], ['c', 'd']], ['abcb'])
```

**26.** Що поверне `maxXorPair([3, 10, 5, 25, 2, 8])`?

```js
maxXorPair([3, 10, 5, 25, 2, 8])
```

### Рівень 3. Складність і нюанси

**27.** Що поверне `maxXorPair([0])` та `maxXorPair([14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70])`?

```js
[maxXorPair([0]), maxXorPair([14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70])]
```

**28.** Що поверне `mapSumPrefix([['apple', 3], ['app', 2]], 'ap')` та після оновлення `['apple', 5]`?

```js
[mapSumPrefix([['apple', 3], ['app', 2]], 'ap'), mapSumPrefix([['apple', 3], ['app', 2], ['apple', 5]], 'ap')]
```

**29.** Скільки вузлів у стисненому trie `compressedNodeCount(['apple', 'app', 'apt', 'bat'])` проти звичайного?

```js
[compressedNodeCount(['apple', 'app', 'apt', 'bat']), buildTrie(['apple', 'app', 'apt', 'bat']).nodeCount()]
```

**30.** Яке лексикографічне сортування `['banana', 'apple', 'app']`?

```js
lexicographicallySorted(['banana', 'apple', 'app'])
```

**31.** Скільки вузлів має trie слів `['a', 'ab', 'abc']`?

```js
buildTrie(['a', 'ab', 'abc']).nodeCount()
```

**32.** Скільки вузлів має trie для слів без спільних префіксів `['abc', 'def', 'ghi']`?

```js
buildTrie(['abc', 'def', 'ghi']).nodeCount()
```

**33.** Що поверне `replaceByPrefixCount(['apple', 'apply', 'ape', 'bat'], ['ap', 'app', 'b', 'z'])`?

```js
replaceByPrefixCount(['apple', 'apply', 'ape', 'bat'], ['ap', 'app', 'b', 'z'])
```

**34.** Напишіть `countWordsEqualTo(trie, word)` — скільки разів слово вставлялось (додайте лічильник кінців у вузлі: використайте `pass` різниці дітей).

**35.** Напишіть `topKAutocomplete(words, prefix, k)` — `k` найчастіших слів із префіксом (при рівності — за алфавітом); слова можуть повторюватись у списку.

**36.** Напишіть `longestCommonPrefixOfWords(words)` через trie.

**37.** Напишіть `suggestedProducts(products, searchWord)` — після кожної введеної літери до трьох найменших за алфавітом продуктів із цим префіксом.

**38.** Напишіть `hasPrefixPair(words)` — чи є слово, що є префіксом іншого (через trie: вузол слова з дітьми).

**39.** Напишіть `distinctSubstringsCountTrie(s)` — кількість різних підрядків, вставляючи всі суфікси в trie (кількість вузлів мінус корінь).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `phoneKeypadPrefix(words, digits)` — слова, що відповідають префіксу набору цифр T9 (`2` = abc, `3` = def, ...).

**41.** Яка структура trie і чому пошук за префіксом працює за `O(L)`?

**42.** Чим `search` відрізняється від `startsWith`?

**43.** Як виконується видалення слова з trie?

**44.** Які переваги trie перед хеш-таблицею?

**45.** Як зменшити споживання пам'яті trie?

**46.** Як реалізується wildcard-пошук у trie?

**47.** Як trie допомагає знайти максимальний XOR пари чисел?

**48.** Навіщо в Word Search II використовують trie?

**49.** Як Aho–Corasick пов'язаний із trie?

**50.** Чим відрізняється подвійний масив чи DAWG від звичайного trie?

### Відповіді

1. `true`
2. `false`
3. `[true, true, false]`
4. `['app', 'apple', 'apt']`
5. `['app', 'apple', 'apt', 'bat']`
6. `['app', 'apple']`
7. `[4, 10]`
8. `3`
9. `0`
10. `1`
11. `[false, true]`
12. `[true, false, true, 1]`
13. `[true, false, true, 4]`
14. `false`
15. `1`
16. `'fl'`
17. `''`
18. `[true, true, true, false]`
19. `[true, false]`
20. `'the cat was rat by the bat'`
21. `'a a b c'`
22. `'world'`
23. `'apple'`
24. `['eat', 'oath']`
25. `[]`
26. `28`
27. `[0, 127]`
28. `[5, 7]`
29. `[6, 10]`
30. `['app', 'apple', 'banana']`
31. `4`
32. `10`
33. `[3, 2, 1, 0]`
34. Приклад розв'язку:

   ```js
   function countWordsEqualTo(trie, word) {
     const n = trie.find(word);
     if (!n) return 0;
     let childPass = 0;
     for (const c of n.children.values()) childPass += c.pass;
     return n.pass - childPass;
   }
   ```

   Виклик `(() => { const t = new Trie(); ['a', 'a', 'ab'].forEach(w => t.insert(w)); return [countWordsEqualTo(t, 'a'), countWordsEqualTo(t, 'ab'), countWordsEqualTo(t, 'x')]; })()` → `[2, 1, 0]`

35. Приклад розв'язку:

   ```js
   function topKAutocomplete(words, prefix, k) {
     const cnt = new Map();
     words.forEach(w => cnt.set(w, (cnt.get(w) || 0) + 1));
     const t = buildTrie([...cnt.keys()]);
     return t.autocomplete(prefix).sort((a, b) => cnt.get(b) - cnt.get(a) || (a < b ? -1 : 1)).slice(0, k);
   }
   ```

   Виклик `topKAutocomplete(['i love you', 'island', 'iroman', 'i love leetcode', 'i love you', 'island', 'i love you'], 'i', 3)` → `['i love you', 'island', 'i love leetcode']`

36. Приклад розв'язку:

   ```js
   const longestCommonPrefixOfWords = (w) => w.length ? buildTrie(w).longestCommonPrefix() : ''
   ```

   Виклик `[longestCommonPrefixOfWords(['flower', 'flow', 'flight']), longestCommonPrefixOfWords([]), longestCommonPrefixOfWords(['abc'])]` → `['fl', '', 'abc']`

37. Приклад розв'язку:

   ```js
   function suggestedProducts(p, w) {
     const t = buildTrie(p);
     return [...w].map((_, i) => t.autocomplete(w.slice(0, i + 1), 3));
   }
   ```

   Виклик `suggestedProducts(['mobile', 'mouse', 'moneypot', 'monitor', 'mousepad'], 'mouse')` → `[['mobile', 'moneypot', 'monitor'], ['mobile', 'moneypot', 'monitor'], ['mouse', 'mousepad'], ['mouse', 'mousepad'], ['mouse', 'mousepad']]`

38. Приклад розв'язку:

   ```js
   function hasPrefixPair(words) {
     const t = buildTrie(words);
     for (const w of new Set(words)) {
       const n = t.find(w);
       if (n.children.size > 0) return true;
     }
     return words.length !== new Set(words).size;
   }
   ```

   Виклик `[hasPrefixPair(['abc', 'abcd']), hasPrefixPair(['abc', 'abd']), hasPrefixPair(['a', 'a'])]` → `[true, false, true]`

39. Приклад розв'язку:

   ```js
   function distinctSubstringsCountTrie(s) {
     const t = new Trie();
     for (let i = 0; i < s.length; i++) t.insert(s.slice(i));
     return t.nodeCount() - 1;
   }
   ```

   Виклик `[distinctSubstringsCountTrie('abab'), distinctSubstringsCountTrie('aaa'), distinctSubstringsCountTrie('')]` → `[7, 3, 0]`

40. Приклад розв'язку:

   ```js
   function phoneKeypadPrefix(words, digits) {
     const map = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
     return words.filter(w => w.length >= digits.length && [...digits].every((d, i) => map[d].includes(w[i]))).sort();
   }
   ```

   Виклик `phoneKeypadPrefix(['good', 'home', 'gone', 'hood', 'cat'], '466')` → `['gone', 'good', 'home', 'hood']`

41. Кожне ребро — символ, шлях від кореня — префікс. Щоб перевірити префікс довжини `L`, достатньо пройти `L` ребер, незалежно від кількості слів у структурі; для слова додатково перевіряється прапор кінця.
42. `search` вимагає, щоб вузол наприкінці шляху мав прапор `isEnd` (слово повністю вставлено), `startsWith` лише перевіряє існування шляху — тобто те, що рядок є префіксом якогось слова.
43. Знімають прапор `isEnd` у кінцевому вузлі й, рухаючись вгору, видаляють вузли, що не мають дітей і не є кінцем інших слів (наприклад, за лічильником `pass`). Префікси інших слів зберігаються.
44. Пошук за префіксом, автодоповнення, лексикографічний обхід і подібні запити без сканування всіх ключів; немає колізій. Недолік — більша пам'ять, ніж у хеш-таблиці, для розрізнених слів.
45. Стиснути ланцюжки вузлів з однією дитиною в одне ребро з рядковою міткою (radix/Patricia tree), використовувати троїчне дерево пошуку, масив дітей лише для щільних вузлів або мінімальний автомат (DAWG).
46. Для символа-замінника (`.`) рекурсивно пробують усіх дітей вузла, для звичайної літери — одного. У гіршому випадку це експоненційне в кількості крапок обходження, але обмежене розміром trie.
47. Числа вставляють у бінарний trie (від старшого біта). Для кожного числа жадібно намагаються йти по протилежному біту, щоб максимізувати XOR; це `O(n · bits)` замість `O(n²)`.
48. Одночасно проходять сітку DFS і рухаються по trie слів: гілки, що не є префіксами жодного слова, відсікаються одразу, і пошук усіх слів іде за один обхід замість окремого пошуку для кожного слова.
49. Це trie шаблонів, до якого додають «суфіксні посилання» (аналог відкату KMP) і словникові посилання; завдяки цьому один прохід по тексту знаходить усі входження всіх шаблонів за `O(n + кількість входжень)`.
50. Вони компактніше зберігають trie: подвійний масив кодує переходи у двох цілих масивах без вказівників, DAWG зливає однакові піддерева (суфікси), зменшуючи кількість станів і зберігаючи швидкий пошук.
