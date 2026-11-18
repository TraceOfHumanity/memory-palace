# Fast Exponentiation — швидке піднесення до степеня

Обчислити `aⁿ` послідовним множенням — `n − 1` операцій; для `n = 10¹⁸` це неможливо. **Бінарне піднесення до степеня** (binary exponentiation, exponentiation by squaring) робить лише `O(log n)` множень. Разом із модульною арифметикою воно лежить в основі RSA, Діффі—Геллмана, тесту простоти Міллера—Рабіна, обчислення обернених елементів, швидких лінійних рекуренцій (числа Фібоначчі за `O(log n)`) і комбінаторики за модулем.

## 1. Ідея: розклад показника за двійковою системою

Показник `n` розкладаємо за степенями двійки: `13 = 8 + 4 + 1 = 1101₂`, тоді `a¹³ = a⁸ · a⁴ · a¹`. Степені `a, a², a⁴, a⁸, …` отримуємо послідовним **піднесенням до квадрата**, а потрібні перемножуємо.

Рекурсивно:

- `a⁰ = 1`;
- якщо `n` парне: `aⁿ = (a^{n/2})²`;
- якщо непарне: `aⁿ = a · aⁿ⁻¹`.

Кожні два кроки показник зменшується принаймні вдвічі: не більше `2·⌊log₂ n⌋` множень. Для `n = 10¹⁸` — близько 120 множень замість 10¹⁸.

## 2. Ітеративна версія

```text
result = 1
while n > 0:
    if n & 1: result *= a
    a *= a
    n >>= 1
```

Читаємо біти показника з молодшого: якщо біт `1` — домножуємо результат на поточний степінь `a^{2^k}`; завжди підносимо `a` до квадрата.

Трасування для `3¹³`: - біт 1: base = 3, result = 3
- біт 0: base = 9
- біт 1: base = 81, result = 243
- біт 1: base = 6561, result = 1594323. Результат `1594323`; кількість множень для `n = 13`: 7, для `n = 10⁶` — 27.

## 3. Реалізація

```js
function fastPow(a, n) {
  let result = 1;
  while (n > 0) {
    if (n % 2 === 1) result *= a;
    a *= a;
    n = Math.floor(n / 2);
  }
  return result;
}

function powTrace(a, n) {
  const out = [];
  let result = 1;
  let base = a;
  let k = n;
  while (k > 0) {
    const bit = k % 2;
    if (bit) result *= base;
    out.push('біт ' + bit + ': base = ' + base + (bit ? ', result = ' + result : ''));
    base *= base;
    k = Math.floor(k / 2);
  }
  return out;
}

function powMultiplications(n) {
  let count = 0;
  while (n > 0) {
    if (n % 2 === 1) count++;
    count++;
    n = Math.floor(n / 2);
  }
  return count;
}

function powNaive(a, n) {
  let r = 1;
  for (let i = 0; i < n; i++) r *= a;
  return r;
}

function powRecursive(a, n) {
  if (n === 0) return 1;
  if (n % 2 === 0) {
    const half = powRecursive(a, n / 2);
    return half * half;
  }
  return a * powRecursive(a, n - 1);
}

function myPow(x, n) {
  if (n < 0) return 1 / myPow(x, -n);
  let r = 1;
  while (n > 0) {
    if (n % 2 === 1) r *= x;
    x *= x;
    n = Math.floor(n / 2);
  }
  return r;
}

function modPow(base, exp, mod) {
  let b = BigInt(base) % BigInt(mod);
  let e = BigInt(exp);
  const m = BigInt(mod);
  let r = 1n;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return r;
}

function modPowNumber(base, exp, mod) {
  return Number(modPow(base, exp, mod));
}

function modInverseFermat(a, p) {
  return modPowNumber(a, p - 2, p);
}

function lastDigits(a, n, digits) {
  return String(modPowNumber(a, n, 10 ** digits)).padStart(digits, '0');
}

function matMul(A, B, mod) {
  const n = A.length;
  const C = Array.from({ length: n }, () => new Array(n).fill(0n));
  for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % mod;
  return C;
}

function matPow(M, e, mod) {
  const n = M.length;
  let R = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1n : 0n)));
  let B = M.map((r) => r.map(BigInt));
  const m = BigInt(mod);
  let k = BigInt(e);
  while (k > 0n) {
    if (k & 1n) R = matMul(R, B, m);
    B = matMul(B, B, m);
    k >>= 1n;
  }
  return R;
}

function fibMod(n, mod) {
  if (n === 0) return 0n;
  const R = matPow([[1n, 1n], [1n, 0n]], n - 1, mod);
  return R[0][0];
}

function millerRabin(n, bases = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]) {
  if (n < 2) return false;
  const N = BigInt(n);
  for (const p of bases) {
    const P = BigInt(p);
    if (N === P) return true;
    if (N % P === 0n) return false;
  }
  let d = N - 1n;
  let s = 0;
  while (d % 2n === 0n) { d /= 2n; s++; }
  for (const a of bases) {
    let x = modPow(a, d, N);
    if (x === 1n || x === N - 1n) continue;
    let comp = true;
    for (let i = 1; i < s; i++) {
      x = (x * x) % N;
      if (x === N - 1n) { comp = false; break; }
    }
    if (comp) return false;
  }
  return true;
}

function powerOfTwoCheck(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function superPow(a, digitsOfB, mod = 1337) {
  let result = 1;
  const pow = (x, e) => modPowNumber(x, e, mod);
  for (const d of digitsOfB) result = (pow(result, 10) * pow(a, d)) % mod;
  return result;
}

function binomialMod(n, k, p) {
  if (k < 0 || k > n) return 0;
  let num = 1;
  let den = 1;
  for (let i = 0; i < k; i++) {
    num = Number((BigInt(num) * BigInt(n - i)) % BigInt(p));
    den = Number((BigInt(den) * BigInt(i + 1)) % BigInt(p));
  }
  return Number((BigInt(num) * modPow(den, p - 2, p)) % BigInt(p));
}

function fibFastDoubling(n) {
  const go = (k) => {
    if (k === 0n) return [0n, 1n];
    const [a, b] = go(k >> 1n);
    const c = a * (2n * b - a);
    const d = a * a + b * b;
    return k & 1n ? [d, c + d] : [c, d];
  };
  return go(BigInt(n))[0];
}

function geometricSumMod(a, n, mod) {
  const M = BigInt(mod);
  const go = (k) => {
    if (k === 0n) return 0n;
    if (k % 2n === 1n) return (1n + BigInt(a) * go(k - 1n)) % M;
    const half = go(k / 2n);
    return (half * (1n + modPow(a, k / 2n, M))) % M;
  };
  return go(BigInt(n));
}
```

## 4. Модульне піднесення до степеня

Для великих показників і модуля `M` після кожного множення беремо залишок: `(x·y) mod M = ((x mod M)·(y mod M)) mod M`. Проміжні числа не перевищують `M²`. У JavaScript для `M > 2²⁶` добуток виходить за `2⁵³` і втрачає точність — використовують `BigInt` (як у `modPow`).

`modPow(2, 10, 1000)` = `24n`; `modPow(3, 200, 13)` = `9n`; `modPow(2, 1000000007, 998244353)` = `132727571n`; `lastDigits(7, 1000, 3)` (останні три цифри `7¹⁰⁰⁰`) = `'001'`.

### Обернений елемент за простим модулем

Мала теорема Ферма: для простого `p` і `a` не кратного `p`: `a^{p−1} ≡ 1 (mod p)`, тому `a⁻¹ ≡ a^{p−2}`. `modInverseFermat(3, 11)` = `4`; `modInverseFermat(2, 1000000007)` = `500000004` (півмодуля + 1). Альтернатива — розширений Евклід ([euclid-gcd.md](euclid-gcd.md)), що працює й для складених модулів.

### Біноміальні коефіцієнти за модулем

`C(n, k) mod p = n!/(k!(n−k)!) mod p` — ділення замінюється множенням на обернений: `binomialMod(10, 3, 1000000007)` = `120`.

## 5. Піднесення матриць: лінійні рекурентності за `O(log n)`

Те саме піднесення працює для будь-якої **асоціативної** операції: матриць, поліномів, перестановок. Рекурентність Фібоначчі `F(n) = F(n−1) + F(n−2)` записується матрицею:

`[F(n+1), F(n)]ᵀ = [[1, 1], [1, 0]]ⁿ · [F(1), F(0)]ᵀ`.

`fibMod(100, 1000000007)` = `687995182n`; `fibFastDoubling(100)` = `354224848179261915075n` (точно, `BigInt`). Загалом лінійна рекурентність порядку `k` обчислюється за `O(k³ log n)`.

Приклад застосування: кількість шляхів довжини `n` у графі — це елемент `Aⁿ` матриці суміжності.

## 6. Миллер—Рабін: тест простоти

Для непарного `n = d·2^s + 1`: `n` просте ⇒ для будь-якого `a` або `a^d ≡ 1`, або `a^{d·2^r} ≡ −1 (mod n)` для деякого `0 ≤ r < s`. Складені числа проходять тест для не більше чверті основ `a`. Фіксований набір основ `{2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37}` **детерміновано** працює для `n < 3,3·10²⁴`. `millerRabin(1000000007)` = `true`, `millerRabin(1000000011)` = `false`, число Кармайкла `561` — `false` (прості тести Ферма його «проходять», Міллер—Рабін — ні).

Складність `O(k log³ n)`: десятки основ × логарифмічне піднесення — перевіряє числа з сотнями цифр за мілісекунди (на відміну від пробного ділення `O(√n)`).

## 7. Складність

- **Кількість множень:** `⌊log₂ n⌋ + (кількість одиниць у двійковому записі n)` ≤ `2·⌊log₂ n⌋`.
- **Час:** `O(log n)` множень (для `d`-бітових чисел кожне — `O(d²)` наївно).
- Порівняння: наївне піднесення `a¹⁰⁰⁰⁰⁰⁰` — `10⁶` множень; бінарне — 27.
- **Пам'ять:** `O(1)`.
- Для матриць `k×k`: `O(k³ log n)`.

## 8. Прийоми й варіації

- **Від'ємний показник:** `a⁻ⁿ = 1/aⁿ`: `myPow(2, -3)` = `0.125`; `myPow(2.1, 3)` = `9.261000000000001` (похибка `double`).
- **Перевірка степеня двійки** — побітово: `powerOfTwoCheck(64)` = `true`.
- **Дуже великий показник як масив цифр:** `a^{[1,0]}` = `(a¹)¹⁰ · a⁰`: `superPow(2, [1, 0])` = `1024` (`2¹⁰ mod 1337`).
- **Сума геометричної прогресії** `1 + a + … + aⁿ⁻¹ mod M` без ділення: `geometricSumMod(2, 10, 1000007)` = `1023n` (`2¹⁰ − 1 = 1023`).
- **Зниження показника** за теоремою Ейлера: `a^n ≡ a^{n mod φ(m)} (mod m)` для `gcd(a, m) = 1`.
- **«Піднесення» за довільною асоціативною операцією** (композиція перестановок, степінь поліному за модулем, застосування кроку `k` разів у симуляції).
- **Швидке множення** (Каратсуба, FFT) прискорює великі числа; бінарне піднесення дає лише кількість множень.

## 9. Типові помилки

1. **Переповнення `a * a`** без модуля: для `Number` > `2⁵³` — втрата точності; `BigInt` або модульна арифметика.
2. **Не брати модуль після кожного множення.**
3. **`n & 1` та `n >>= 1` для `n ≥ 2³¹`** — перетворення в 32 біти; `Math.floor(n / 2)` або `BigInt`.
4. **Від'ємна основа/залишок:** у JS `%` може бути від'ємним — нормалізуйте `((x % m) + m) % m`.
5. **Нульовий показник:** `a⁰ = 1` навіть для `a = 0` за домовленістю.
6. **Обернений елемент за складеним модулем** через Ферма — хибно.
7. **Розмір матриці та одиничної матриці** (одинична — на діагоналі 1).
8. **Плутанина порядку множення матриць** (некомутативність).
9. **Для `double`-піднесення** помилки округлення накопичуються — для точних результатів використовуйте цілі/раціональні типи.

## 10. Алгоритм (стисло)

1. `result = 1`.
2. Поки `n > 0`: якщо `n` непарне — `result *= a`; `a *= a`; `n = ⌊n/2⌋`.
3. Для модуля — брати залишок після кожного множення.
4. Час `O(log n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Що поверне `fastPow(3, 13)`?

```js
fastPow(3, 13)
```

**2.** Які кроки виконує `powTrace(3, 13)`?

```js
powTrace(3, 13)
```

**3.** Що поверне `fastPow(2, 10)`, `fastPow(5, 0)`, `fastPow(0, 0)`, `fastPow(0, 5)`?

```js
[fastPow(2, 10), fastPow(5, 0), fastPow(0, 0), fastPow(0, 5)]
```

**4.** Скільки множень потрібно для `n = 13`, `n = 10⁶`, `n = 2⁶⁰`?

```js
[powMultiplications(13), powMultiplications(1000000), powMultiplications(2 ** 60)]
```

**5.** Скільки множень робить наївне піднесення до `n = 10⁶` і бінарне?

```js
[1000000 - 1, powMultiplications(1000000)]
```

**6.** Чи збігаються `fastPow`, `powNaive` та `powRecursive` для `a = 1…6`, `n = 0…12`?

```js
(() => { let ok = true; for (let a = 1; a <= 6; a++) for (let n = 0; n <= 12; n++) if (fastPow(a, n) !== powNaive(a, n) || fastPow(a, n) !== powRecursive(a, n)) ok = false; return ok; })()
```

**7.** Що поверне `myPow(2, -3)`, `myPow(2, 0)`, `myPow(0.5, 4)`?

```js
[myPow(2, -3), myPow(2, 0), myPow(0.5, 4)]
```

**8.** Що поверне `myPow(2.1, 3)` і чи збігається з точним `9.261`?

```js
[myPow(2.1, 3), myPow(2.1, 3) === 9.261]
```

**9.** Що поверне `fastPow(2, 53)` та `fastPow(2, 54) + 1`? (межа точності double)

```js
[fastPow(2, 53), fastPow(2, 54) + 1 === fastPow(2, 54)]
```

**10.** Що поверне `modPow(2, 10, 1000)`, `modPow(3, 200, 13)`, `modPow(5, 0, 7)`?

```js
[modPow(2, 10, 1000), modPow(3, 200, 13), modPow(5, 0, 7)]
```

**11.** Що поверне `modPow(2, 1000000007, 998244353)`?

```js
modPow(2, 1000000007, 998244353)
```

**12.** Що поверне `modPowNumber(7, 100, 13)`?

```js
modPowNumber(7, 100, 13)
```

**13.** Що поверне `modPow` для `mod = 1`?

```js
modPow(5, 3, 1)
```

### Рівень 2. Робота алгоритму

**14.** Останні три цифри `7¹⁰⁰⁰` та останні дві цифри `2²⁰²⁶`?

```js
[lastDigits(7, 1000, 3), lastDigits(2, 2026, 2)]
```

**15.** Що поверне `modInverseFermat(3, 11)` та `modInverseFermat(2, 1000000007)`?

```js
[modInverseFermat(3, 11), modInverseFermat(2, 1000000007)]
```

**16.** Чи `3 · modInverseFermat(3, 11) ≡ 1 (mod 11)`?

```js
(3 * modInverseFermat(3, 11)) % 11
```

**17.** Чи виконується мала теорема Ферма `a^{p−1} mod p = 1` для `p = 101` і `a = 2…10`?

```js
[2, 3, 4, 5, 6, 7, 8, 9, 10].map(a => modPowNumber(a, 100, 101))
```

**18.** Що поверне `binomialMod(10, 3, 1000000007)` та `binomialMod(50, 25, 1000000007)`?

```js
[binomialMod(10, 3, 1000000007), binomialMod(50, 25, 1000000007)]
```

**19.** Що поверне `binomialMod(5, 7, 13)`?

```js
binomialMod(5, 7, 13)
```

**20.** Яка матриця `matPow([[1, 1], [1, 0]], 10, 1000000007)` (як числа)?

```js
matPow([[1, 1], [1, 0]], 10, 1000000007).map(r => r.map(Number))
```

**21.** Що поверне `fibMod(10, 1000000007)` та `fibMod(100, 1000000007)`?

```js
[fibMod(10, 1000000007), fibMod(100, 1000000007)]
```

**22.** Що поверне `fibFastDoubling(100)` (точно)?

```js
String(fibFastDoubling(100))
```

**23.** Чи збігаються `fibMod(n, 10**9+7)` і `fibFastDoubling(n) % (10**9+7)` для `n = 0…60`?

```js
Array.from({ length: 61 }, (_, n) => n).every(n => fibMod(n, 1000000007) === fibFastDoubling(n) % 1000000007n)
```

**24.** Які значення `millerRabin` для `1000000007`, `1000000011`, `561`, `2`, `1`?

```js
[1000000007, 1000000011, 561, 2, 1].map(n => millerRabin(n))
```

**25.** Скільки простих серед чисел `10⁹ … 10⁹ + 100` (Міллер—Рабін)?

```js
Array.from({ length: 101 }, (_, i) => 1000000000 + i).filter(n => millerRabin(n)).length
```

**26.** Чи `millerRabin(2147483647)` (число Мерсенна 2³¹ − 1) просте?

```js
millerRabin(2147483647)
```

### Рівень 3. Складність і нюанси

**27.** Чи збігається `millerRabin` з пробним діленням для всіх `n ≤ 2000`?

```js
(() => { const trial = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; }; let ok = true; for (let n = 0; n <= 2000; n++) if (millerRabin(n) !== trial(n)) ok = false; return ok; })()
```

**28.** Що поверне `superPow(2, [1, 0])` та `superPow(2147483647, [2, 0, 0])`?

```js
[superPow(2, [1, 0]), superPow(2147483647, [2, 0, 0])]
```

**29.** Що поверне `geometricSumMod(2, 10, 1000007)` та `geometricSumMod(3, 4, 1000)`?

```js
[String(geometricSumMod(2, 10, 1000007)), String(geometricSumMod(3, 4, 1000))]
```

**30.** Які значення `powerOfTwoCheck` для `1, 2, 3, 64, 0, 96`?

```js
[1, 2, 3, 64, 0, 96].map(powerOfTwoCheck)
```

**31.** Напишіть `powMod2(a, n, m)` на Number для малого модуля (`m < 2²⁶`), без BigInt.

**32.** Напишіть `isPerfectPowerOf(n, base)` — чи є `n` степенем `base` (повторне ділення).

**33.** Напишіть `integerRoot(x, k)` — цілу частину `k`-го кореня бінарним пошуком із швидким піднесенням.

**34.** Напишіть `modPowByDigits(a, digits, m)` — `a^{число}` mod `m`, де показник заданий масивом десяткових цифр.

**35.** Напишіть `matrixPowerPaths(adj, k)` — кількість шляхів довжини `k` між усіма парами за матрицею суміжності (`BigInt`-піднесення; повертайте числа).

**36.** Напишіть `cycleOfPowers(a, m)` — період послідовності `a^k mod m` (мультиплікативний порядок), якщо `gcd(a, m) = 1`, інакше `null`.

**37.** Напишіть `fermatTest(n, a)` — тест Ферма `a^{n−1} ≡ 1 (mod n)`; поверніть для `561` з основою 2 (число Кармайкла).

**38.** Напишіть `squareAndMultiplyCount(n)` — кількість піднесень до квадрата та множень на основу в алгоритмі (за двійковими розрядами).

**39.** Напишіть `powerTowerLastDigit(a, b)` — остання цифра `a^b` (використайте цикл останніх цифр).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `modularDivision(a, b, p)` — `a / b mod p` для простого `p` через обернений елемент Ферма.

**41.** Яка ідея бінарного піднесення до степеня?

**42.** Чому кількість множень не перевищує `2·⌊log₂ n⌋`?

**43.** Навіщо брати модуль після кожного множення?

**44.** Як за допомогою піднесення знайти обернений елемент за простим модулем?

**45.** Як піднесення матриць прискорює числа Фібоначчі?

**46.** Як працює тест Міллера—Рабіна?

**47.** Чому для `Number` у JavaScript модульне піднесення краще робити на `BigInt`?

**48.** Чому піднесення до степеня застосовне до матриць і не лише до чисел?

**49.** Чим тест Ферма гірший за Міллера—Рабіна?

**50.** Як обчислити останні `k` цифр великого степеня?

### Відповіді

1. `1594323`
2. `['біт 1: base = 3, result = 3', 'біт 0: base = 9', 'біт 1: base = 81, result = 243', 'біт 1: base = 6561, result = 1594323']`
3. `[1024, 1, 1, 0]`
4. `[7, 27, 62]`
5. `[999999, 27]`
6. `true`
7. `[0.125, 1, 0.0625]`
8. `[9.261000000000001, false]`
9. `[9007199254740992, true]`
10. `[24n, 9n, 1n]`
11. `132727571n`
12. `9`
13. `0n`
14. `['001', '64']`
15. `[4, 500000004]`
16. `1`
17. `[1, 1, 1, 1, 1, 1, 1, 1, 1]`
18. `[120, 605552882]`
19. `0`
20. `[[89, 55], [55, 34]]`
21. `[55n, 687995182n]`
22. `'354224848179261915075'`
23. `true`
24. `[true, false, false, true, false]`
25. `7`
26. `true`
27. `true`
28. `[1024, 1198]`
29. `['1023', '40']`
30. `[true, true, false, true, false, false]`
31. Приклад розв'язку:

   ```js
   function powMod2(a, n, m) {
     let r = 1 % m;
     a %= m;
     while (n > 0) {
       if (n % 2 === 1) r = (r * a) % m;
       a = (a * a) % m;
       n = Math.floor(n / 2);
     }
     return r;
   }
   ```

   Виклик `[powMod2(2, 10, 1000), powMod2(3, 200, 13), powMod2(7, 1000, 1000)]` → `[24, 9, 1]`

32. Приклад розв'язку:

   ```js
   function isPerfectPowerOf(n, base) {
     if (n < 1) return false;
     while (n % base === 0) n /= base;
     return n === 1;
   }
   ```

   Виклик `[isPerfectPowerOf(81, 3), isPerfectPowerOf(80, 3), isPerfectPowerOf(1, 5)]` → `[true, false, true]`

33. Приклад розв'язку:

   ```js
   function integerRoot(x, k) {
     let lo = 0, hi = x;
     while (lo < hi) {
       const mid = Math.floor((lo + hi + 1) / 2);
       if (fastPow(mid, k) <= x) lo = mid;
       else hi = mid - 1;
     }
     return lo;
   }
   ```

   Виклик `[integerRoot(27, 3), integerRoot(80, 4), integerRoot(1000000, 2)]` → `[3, 2, 1000]`

34. Приклад розв'язку:

   ```js
   function modPowByDigits(a, digits, m) {
     let r = 1n;
     const M = BigInt(m);
     for (const d of digits) r = (modPow(r, 10, M) * modPow(a, d, M)) % M;
     return Number(r);
   }
   ```

   Виклик `[modPowByDigits(2, [1, 0], 1000), modPowByDigits(3, [2, 0, 0], 13)]` → `[24, 9]`

35. Приклад розв'язку:

   ```js
   function matrixPowerPaths(adj, k) {
     return matPow(adj, k, 1000000007).map(r => r.map(Number));
   }
   ```

   Виклик `matrixPowerPaths([[0, 1, 1], [1, 0, 0], [0, 1, 0]], 3)` → `[[1, 1, 1], [1, 1, 0], [0, 1, 1]]`

36. Приклад розв'язку:

   ```js
   function cycleOfPowers(a, m) {
     const g = (x, y) => y === 0 ? x : g(y, x % y);
     if (g(a, m) !== 1) return null;
     let x = a % m, k = 1;
     while (x !== 1 % m) {
       x = (x * a) % m;
       k++;
     }
     return k;
   }
   ```

   Виклик `[cycleOfPowers(2, 7), cycleOfPowers(3, 7), cycleOfPowers(2, 8), cycleOfPowers(10, 13)]` → `[3, 6, null, 6]`

37. Приклад розв'язку:

   ```js
   const fermatTest = (n, a) => modPowNumber(a, n - 1, n) === 1
   ```

   Виклик `[fermatTest(561, 2), fermatTest(561, 3), fermatTest(97, 2), fermatTest(91, 2)]` → `[true, false, true, false]`

38. Приклад розв'язку:

   ```js
   function squareAndMultiplyCount(n) {
     const bits = n.toString(2);
     return { squares: bits.length - 1, multiplies: bits.split('').filter(b => b === '1').length - 1 };
   }
   ```

   Виклик `[squareAndMultiplyCount(13), squareAndMultiplyCount(16), squareAndMultiplyCount(1)]` → `[{ squares: 3, multiplies: 2 }, { squares: 4, multiplies: 0 }, { squares: 0, multiplies: 0 }]`

39. Приклад розв'язку:

   ```js
   function powerTowerLastDigit(a, b) {
     return modPowNumber(a % 10, b, 10);
   }
   ```

   Виклик `[powerTowerLastDigit(2, 100), powerTowerLastDigit(7, 2026), powerTowerLastDigit(9, 3)]` → `[6, 9, 9]`

40. Приклад розв'язку:

   ```js
   const modularDivision = (a, b, p) => (a * modInverseFermat(b, p)) % p
   ```

   Виклик `[modularDivision(10, 5, 13), modularDivision(1, 3, 11), modularDivision(7, 2, 1000000007)]` → `[2, 4, 500000007]`

41. Розкласти показник за двійковою системою й обчислити `a, a², a⁴, a⁸, …` послідовним піднесенням до квадрата, перемножуючи ті, що відповідають одиничним бітам. Це `O(log n)` множень замість `n − 1`.
42. Кожна ітерація зменшує показник удвічі й виконує одне піднесення до квадрата та, можливо, одне множення на результат. Ітерацій `⌊log₂ n⌋ + 1`, тому множень не більше двох на кожну.
43. Залишок за модулем зберігає результат, а проміжні числа лишаються меншими за `M²`. Без цього степені швидко виходять за межі пам'яті або точності (`2^53` у Number).
44. За малою теоремою Ферма `a^{p−1} ≡ 1 (mod p)`, тому `a⁻¹ ≡ a^{p−2} (mod p)`. Це працює лише для простого модуля й `a`, не кратного `p`.
45. Рекурентність записується матрицею `[[1,1],[1,0]]`, а `F(n)` — елемент її `n`-го степеня. Піднесення за двійковим методом дає `O(log n)` матричних множень замість `O(n)` додавань.
46. Для непарного `n = d·2^s + 1` перевіряють для кількох основ `a`, що або `a^d ≡ 1`, або `a^{d·2^r} ≡ −1 (mod n)` для деякого `r < s`. Складені числа не проходять для принаймні трьох чвертей основ; з фіксованим набором основ тест детермінований для `n < 3,3·10²⁴`.
47. Добуток двох чисел порядку `10⁹` перевищує `2⁵³`, і `double` втрачає молодші біти; `BigInt` зберігає всі цифри. Альтернатива — множення за модулем частинами або малий модуль (`< 2²⁶`).
48. Алгоритм використовує лише асоціативність множення й наявність одиниці. Матриці, поліноми, перестановки задовольняють ці умови, тому для них теж можна швидко обчислювати степені.
49. Числа Кармайкла (наприклад, 561) складені, але проходять тест Ферма для всіх основ, взаємно простих із ними. Міллер—Рабін додатково перевіряє послідовність квадратних коренів з одиниці й виявляє такі числа.
50. Піднести за модулем `10^k` бінарним методом: `a^n mod 10^k` дає останні `k` цифр (з ведучими нулями, якщо їх менше).
