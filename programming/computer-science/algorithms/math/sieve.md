# Sieve of Eratosthenes — решето Ератосфена

**Решето Ератосфена** знаходить **усі прості числа до `n`** за `O(n log log n)` — майже лінійно. Ідея ~2300 років: викреслюємо кратні кожного знайденого простого числа; ті, що лишились, — прості. Це основа задач про прості числа: факторизація, підрахунок дільників, функція Ейлера, криптографічні допоміжні таблиці. Далі — **сегментоване** решето для великих діапазонів, **лінійне решето** і **решето найменших простих дільників** (SPF) для швидкої факторизації.

## 1. Ідея

1. Записати числа `2..n`, усі «потенційно прості».
2. Взяти найменше невикреслене `p` — воно просте. Викреслити `2p, 3p, 4p, …`.
3. Повторювати для наступного невикресленого. Зупинитись, коли `p² > n`.

**Чому достатньо `p ≤ √n`:** складене число `m ≤ n` має простий дільник `≤ √m ≤ √n`, тому вже викреслено. **Чому викреслювати з `p²`:** кратні `p`, менші за `p²`, мають вигляд `p·k`, де `k < p` — у них є менший простий дільник, і вони вже викреслені.

Для `n = 30`: прості `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`.

Трасування викреслення (що викреслює кожне просте `p`):

- p = 2: викреслено 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30
- p = 3: викреслено 9, 15, 21, 27
- p = 5: викреслено 25

## 2. Реалізація

```js
function sieveFlags(n) {
  const isPrime = new Uint8Array(n + 1).fill(1);
  isPrime[0] = 0;
  if (n >= 1) isPrime[1] = 0;
  for (let p = 2; p * p <= n; p++) {
    if (!isPrime[p]) continue;
    for (let m = p * p; m <= n; m += p) isPrime[m] = 0;
  }
  return isPrime;
}

function sieve(n) {
  const flags = sieveFlags(n);
  const primes = [];
  for (let i = 2; i <= n; i++) if (flags[i]) primes.push(i);
  return primes;
}

function sieveTrace(n) {
  const isPrime = new Uint8Array(n + 1).fill(1);
  const out = [];
  for (let p = 2; p * p <= n; p++) {
    if (!isPrime[p]) continue;
    const crossed = [];
    for (let m = p * p; m <= n; m += p) {
      if (isPrime[m]) crossed.push(m);
      isPrime[m] = 0;
    }
    out.push('p = ' + p + ': викреслено ' + (crossed.length ? crossed.join(', ') : 'нічого нового'));
  }
  return out;
}

function countPrimes(n) {
  return sieve(n).length;
}

function sieveOperations(n) {
  const isPrime = new Uint8Array(n + 1).fill(1);
  let ops = 0;
  for (let p = 2; p * p <= n; p++) {
    if (!isPrime[p]) continue;
    for (let m = p * p; m <= n; m += p) { isPrime[m] = 0; ops++; }
  }
  return ops;
}

function isPrimeTrial(n) {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

function trialOperations(n) {
  let ops = 0;
  for (let k = 2; k <= n; k++) {
    for (let d = 2; d * d <= k; d++) {
      ops++;
      if (k % d === 0) break;
    }
  }
  return ops;
}

function smallestPrimeFactors(n) {
  const spf = new Int32Array(n + 1);
  for (let i = 2; i <= n; i++) {
    if (spf[i] === 0) {
      for (let j = i; j <= n; j += i) if (spf[j] === 0) spf[j] = i;
    }
  }
  return spf;
}

function factorize(x, spf) {
  const res = [];
  while (x > 1) {
    const p = spf[x];
    let e = 0;
    while (x % p === 0) { x /= p; e++; }
    res.push([p, e]);
  }
  return res;
}

function factorizeTrial(x) {
  const res = [];
  for (let p = 2; p * p <= x; p++) {
    let e = 0;
    while (x % p === 0) { x /= p; e++; }
    if (e) res.push([p, e]);
  }
  if (x > 1) res.push([x, 1]);
  return res;
}

function linearSieve(n) {
  const primes = [];
  const lp = new Int32Array(n + 1);
  for (let i = 2; i <= n; i++) {
    if (lp[i] === 0) { lp[i] = i; primes.push(i); }
    for (const p of primes) {
      if (p > lp[i] || i * p > n) break;
      lp[i * p] = p;
    }
  }
  return { primes, lp };
}

function segmentedSieve(lo, hi) {
  const limit = Math.floor(Math.sqrt(hi));
  const base = sieve(limit);
  const size = hi - lo + 1;
  const flags = new Uint8Array(size).fill(1);
  for (const p of base) {
    let start = Math.max(p * p, Math.ceil(lo / p) * p);
    for (let m = start; m <= hi; m += p) flags[m - lo] = 0;
  }
  const res = [];
  for (let i = 0; i < size; i++) if (flags[i] && lo + i >= 2) res.push(lo + i);
  return res;
}

function eulerPhiSieve(n) {
  const phi = Array.from({ length: n + 1 }, (_, i) => i);
  for (let p = 2; p <= n; p++) {
    if (phi[p] === p) for (let m = p; m <= n; m += p) phi[m] -= phi[m] / p;
  }
  return phi;
}

function divisorCounts(n) {
  const d = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) for (let j = i; j <= n; j += i) d[j]++;
  return d;
}

function primeGaps(n) {
  const p = sieve(n);
  const gaps = [];
  for (let i = 1; i < p.length; i++) gaps.push(p[i] - p[i - 1]);
  return gaps;
}

function twinPrimes(n) {
  const p = sieve(n);
  const res = [];
  for (let i = 1; i < p.length; i++) if (p[i] - p[i - 1] === 2) res.push([p[i - 1], p[i]]);
  return res;
}

function goldbach(n) {
  const flags = sieveFlags(n);
  for (let p = 2; p <= n / 2; p++) if (flags[p] && flags[n - p]) return [p, n - p];
  return null;
}

function nthPrime(k) {
  let limit = Math.max(20, Math.ceil(k * (Math.log(k) + Math.log(Math.log(k + 1) + 1)) * 1.3));
  let p = sieve(limit);
  while (p.length < k) { limit *= 2; p = sieve(limit); }
  return p[k - 1];
}

function sumOfPrimesBelow(n) {
  return sieve(n - 1).reduce((a, b) => a + b, 0);
}
```

## 3. Складність

- **Час `O(n log log n)`:** сума `n/2 + n/3 + n/5 + … + n/p` по простих `p ≤ √n` — `n · Σ 1/p ≈ n · ln ln n`. Для `n = 10⁶` викреслень близько 2122048 (замість `n log n ≈ 2·10⁷`).
- **Пам'ять `O(n)`** (байт на число; бітове представлення зменшує вдесятеро; можна зберігати лише непарні — вдвічі менше).
- Порівняння з перевіркою кожного числа пробними діленнями: `trialOperations(10000)` = `117527` проти `16981` для решета.
- **Кількість простих** `π(n)`: `π(100)` = `25`, `π(1000)` = `168`, `π(10⁶)` = `78498` (теорема про розподіл простих: `π(n) ≈ n / ln n`).

## 4. Оптимізації

- **Починати викреслення з `p²`** (вже зроблено).
- **Тільки непарні числа:** вдвічі менше пам'яті й часу.
- **Колесо (wheel factorization):** пропускати кратні 2, 3, 5.
- **Бітові масиви** й **сегментація** (блоки під розмір кеша L1/L2): для `n = 10⁹` — секунди.
- **Лінійне решето** (Ейлера): кожне складене число викреслюється **рівно один раз** своїм найменшим простим дільником — `O(n)`; заодно дає масив `lp[i]` (найменший простий дільник): `linearSieve(30).primes` = `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`.

## 5. Решето найменших простих дільників (SPF) і факторизація

`spf[i]` — найменший простий дільник `i`. Тоді розклад `x` на прості множники — послідовне ділення на `spf[x]` за `O(log x)`. Для багатьох чисел швидше за пробне ділення (`O(√x)`).

`factorize(360, smallestPrimeFactors(360))` = `[[2, 3], [3, 2], [5, 1]]` (`2³·3²·5`); `factorizeTrial(97)` = `[[97, 1]]`.

## 6. Сегментоване решето

Для діапазону `[lo, hi]` при великому `hi` пам'яті на `hi` не вистачить. Знаходимо прості до `√hi`, а для відрізка викреслюємо їхні кратні. `segmentedSieve(90, 120)` = `[97, 101, 103, 107, 109, 113]`. Пам'ять `O(√hi + (hi − lo))`.

## 7. Інші таблиці за аналогічною схемою

- **Функція Ейлера:** `eulerPhiSieve(12)` = `[0, 1, 1, 2, 2, 4, 2, 6, 4, 6, 4, 10, 4]` (`φ(1..12)` з нуля).
- **Кількість дільників:** `divisorCounts(12)` = `[0, 1, 2, 2, 3, 2, 4, 2, 4, 3, 4, 2, 6]` — `O(n log n)` («решето дільників», гармонічна сума).
- **Функція Мебіуса, сума дільників, НСД-таблиці.**
- **Прості близнюки:** `twinPrimes(50)` = `[[3, 5], [5, 7], [11, 13], [17, 19], [29, 31], [41, 43]]`. **Прогалини між простими:** `primeGaps(30)` = `[1, 2, 2, 4, 2, 4, 2, 4, 6]`.
- **Гіпотеза Гольдбаха** (кожне парне `> 2` — сума двох простих): `goldbach(28)` = `[5, 23]`.
- **k-те просте:** `nthPrime(100)` = `541`, сума простих `< 100`: `sumOfPrimesBelow(100)` = `1060`.

## 8. Перевірка одного числа

Для одного числа `n` решето недоцільне: пробне ділення до `√n` (`isPrimeTrial`, `O(√n)`) або імовірнісний тест **Міллера—Рабіна** (`O(k log³ n)`, див. [fast-exponentiation.md](fast-exponentiation.md)) для великих `n`. `isPrimeTrial(1000000007)` = `true`.

## 9. Типові помилки

1. **Викреслювати від `2p`, а не `p²`** — працює, але повільніше.
2. **Цикл `p ≤ n`, а не `p·p ≤ n`** — зайва робота.
3. **Не обнулити `0` і `1`** — вони не прості.
4. **Переповнення `p * p`** при великих `n` (`> 2³¹` у мовах з 32-бітними `int`): використовуйте `p ≤ n / p`.
5. **Пам'ять для `n = 10⁹`:** потрібна сегментація/бітові масиви.
6. **Сегментоване решето:** забути початок `max(p², ⌈lo/p⌉·p)` — викреслить саме просте `p`.
7. **Використовувати решето для одного числа** замість пробних ділень чи Міллера—Рабіна.
8. **Масив об'єктів/булів у JS замість `Uint8Array`** — повільніше й більше пам'яті.
9. **Плутанина між кількістю простих `π(n)` і `n`-м простим.**

## 10. Алгоритм (стисло)

1. `isPrime[2..n] = true`.
2. Для `p` від 2, поки `p² ≤ n`: якщо `isPrime[p]` — викреслити `p², p² + p, …, ≤ n`.
3. Прості — решта. Час `O(n log log n)`, пам'ять `O(n)`.

## Задачі для закріплення

П'ятдесят задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Функції й дані з розділу «Реалізація» вважайте оголошеними; кожен фрагмент виконується окремо, на свіжих копіях цих оголошень. Код виконуйте в консолі браузера чи в Node.js 24.

### Рівень 1. Основи

**1.** Які прості числа до 30 знаходить `sieve(30)`?

```js
sieve(30)
```

**2.** Що поверне `sieve(1)`, `sieve(2)`, `sieve(0)`?

```js
[sieve(1), sieve(2), sieve(0)]
```

**3.** Які кроки виконує `sieveTrace(30)`?

```js
sieveTrace(30)
```

**4.** Скільки простих до 100, 1000, 10⁶?

```js
[countPrimes(100), countPrimes(1000), countPrimes(1000000)]
```

**5.** Скільки викреслень робить решето для `n = 10⁶` і `n = 10⁴`?

```js
[sieveOperations(1000000), sieveOperations(10000)]
```

**6.** Скільки операцій потрібно пробним діленням для всіх чисел до 10⁴?

```js
trialOperations(10000)
```

**7.** Чи є прості `isPrimeTrial` для `1`, `2`, `97`, `100`, `1000000007`?

```js
[1, 2, 97, 100, 1000000007].map(isPrimeTrial)
```

**8.** Чи збігаються `sieve` і `isPrimeTrial` для всіх `n ≤ 500`?

```js
(() => { const f = sieveFlags(500); let ok = true; for (let i = 0; i <= 500; i++) if (Boolean(f[i]) !== isPrimeTrial(i)) ok = false; return ok; })()
```

**9.** Який `smallestPrimeFactors(20)` (SPF для 0…20)?

```js
Array.from(smallestPrimeFactors(20))
```

**10.** Який розклад `factorize(360, smallestPrimeFactors(360))`?

```js
factorize(360, smallestPrimeFactors(360))
```

**11.** Розклади `factorize(97, …)`, `factorize(1024, …)`, `factorize(1, …)`.

```js
(() => { const spf = smallestPrimeFactors(1024); return [factorize(97, spf), factorize(1024, spf), factorize(1, spf)]; })()
```

**12.** Що поверне `factorizeTrial(360)` та `factorizeTrial(97)`?

```js
[factorizeTrial(360), factorizeTrial(97)]
```

**13.** Що поверне `factorizeTrial(2 * 3 * 5 * 7 * 11 * 13)`?

```js
factorizeTrial(30030)
```

### Рівень 2. Робота алгоритму

**14.** Які прості повертає `linearSieve(30).primes`?

```js
linearSieve(30).primes
```

**15.** Який масив найменших простих дільників `Array.from(linearSieve(20).lp)`?

```js
Array.from(linearSieve(20).lp)
```

**16.** Чи збігаються `linearSieve` та `sieve` для `n = 1000`?

```js
JSON.stringify(linearSieve(1000).primes) === JSON.stringify(sieve(1000))
```

**17.** Які прості дає `segmentedSieve(90, 120)`?

```js
segmentedSieve(90, 120)
```

**18.** Що поверне `segmentedSieve(1, 10)` та `segmentedSieve(0, 1)`?

```js
[segmentedSieve(1, 10), segmentedSieve(0, 1)]
```

**19.** Чи збігається `segmentedSieve(1000, 2000)` з відфільтрованим `sieve(2000)`?

```js
JSON.stringify(segmentedSieve(1000, 2000)) === JSON.stringify(sieve(2000).filter(p => p >= 1000))
```

**20.** Яка функція Ейлера `eulerPhiSieve(12)`?

```js
eulerPhiSieve(12)
```

**21.** Які кількості дільників `divisorCounts(12)`?

```js
divisorCounts(12)
```

**22.** Які прості близнюки до 50?

```js
twinPrimes(50)
```

**23.** Які прогалини між простими до 30?

```js
primeGaps(30)
```

**24.** Яка найбільша прогалина між простими до 1000?

```js
Math.max(...primeGaps(1000))
```

**25.** Яка пара Гольдбаха для 28, 100, 4?

```js
[goldbach(28), goldbach(100), goldbach(4)]
```

**26.** Яке 100-е і 1000-е просте?

```js
[nthPrime(100), nthPrime(1000)]
```

### Рівень 3. Складність і нюанси

**27.** Яка сума простих менших за 100 та за 2 000 000 (Project Euler 10)?

```js
[sumOfPrimesBelow(100), sumOfPrimesBelow(2000000)]
```

**28.** Скільки простих між 10⁶ і 10⁶ + 100?

```js
segmentedSieve(1000000, 1000100).length
```

**29.** Скільки простих формату `4k + 1` та `4k + 3` до 100?

```js
(() => { const p = sieve(100).filter(x => x > 2); return [p.filter(x => x % 4 === 1).length, p.filter(x => x % 4 === 3).length]; })()
```

**30.** Скільки пам'яті (байтів) займає `Uint8Array` для `n = 10⁸` і в бітовому представленні?

```js
[1e8, Math.ceil(1e8 / 8)]
```

**31.** Напишіть `primeFactorsDistinct(n)` — різні прості дільники (за SPF).

**32.** Напишіть `numberOfDivisors(n)` — кількість дільників за розкладом (добуток `e + 1`).

**33.** Напишіть `sumOfDivisors(n)` — суму дільників (формула `Π (p^{e+1} − 1)/(p − 1)`).

**34.** Напишіть `isPerfect(n)` — чи число досконале (сума власних дільників дорівнює `n`).

**35.** Напишіть `semiprimesUpTo(n)` — кількість напівпростих (добуток двох простих) до `n`.

**36.** Напишіть `rad(n)` — радикал числа (добуток різних простих дільників).

**37.** Напишіть `mobius(n)` — функцію Мебіуса (0, якщо є квадрат; інакше `(−1)^k`).

**38.** Напишіть `primesInRangeCount(lo, hi)` — кількість простих у `[lo, hi]` через сегментоване решето.

**39.** Напишіть `largestPrimeFactor(n)` — найбільший простий дільник (пробні ділення).

### Рівень 4. Задачі з інтерв'ю

**40.** Напишіть `nextPrime(n)` — найменше просте, більше за `n`.

**41.** Яка ідея решета Ератосфена?

**42.** Чому достатньо викреслювати кратні лише до `√n`?

**43.** Чому викреслення починають із `p²`?

**44.** Яка складність решета і звідки береться `log log n`?

**45.** Чим лінійне решето відрізняється від класичного?

**46.** Навіщо потрібне сегментоване решето?

**47.** Як SPF прискорює факторизацію?

**48.** Коли решето недоцільне?

**49.** Як розподіл простих чисел описується асимптотично?

**50.** Які типові помилки в реалізації решета?

### Відповіді

1. `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`
2. `[[], [2], []]`
3. `['p = 2: викреслено 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30', 'p = 3: викреслено 9, 15, 21, 27', 'p = 5: викреслено 25']`
4. `[25, 168, 78498]`
5. `[2122048, 16981]`
6. `117527`
7. `[false, true, true, false, true]`
8. `true`
9. `[0, 0, 2, 3, 2, 5, 2, 7, 2, 3, 2, 11, 2, 13, 2, 3, 2, 17, 2, 19, 2]`
10. `[[2, 3], [3, 2], [5, 1]]`
11. `[[[97, 1]], [[2, 10]], []]`
12. `[[[2, 3], [3, 2], [5, 1]], [[97, 1]]]`
13. `[[2, 1], [3, 1], [5, 1], [7, 1], [11, 1], [13, 1]]`
14. `[2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`
15. `[0, 0, 2, 3, 2, 5, 2, 7, 2, 3, 2, 11, 2, 13, 2, 3, 2, 17, 2, 19, 2]`
16. `true`
17. `[97, 101, 103, 107, 109, 113]`
18. `[[2, 3, 5, 7], []]`
19. `true`
20. `[0, 1, 1, 2, 2, 4, 2, 6, 4, 6, 4, 10, 4]`
21. `[0, 1, 2, 2, 3, 2, 4, 2, 4, 3, 4, 2, 6]`
22. `[[3, 5], [5, 7], [11, 13], [17, 19], [29, 31], [41, 43]]`
23. `[1, 2, 2, 4, 2, 4, 2, 4, 6]`
24. `20`
25. `[[5, 23], [3, 97], [2, 2]]`
26. `[541, 7919]`
27. `[1060, 142913828922]`
28. `6`
29. `[11, 13]`
30. `[100000000, 12500000]`
31. Приклад розв'язку:

   ```js
   function primeFactorsDistinct(n) {
     const spf = smallestPrimeFactors(n);
     const res = [];
     while (n > 1) {
       const p = spf[n];
       res.push(p);
       while (n % p === 0) n /= p;
     }
     return res;
   }
   ```

   Виклик `[primeFactorsDistinct(360), primeFactorsDistinct(97), primeFactorsDistinct(2)]` → `[[2, 3, 5], [97], [2]]`

32. Приклад розв'язку:

   ```js
   function numberOfDivisors(n) {
     return factorizeTrial(n).reduce((p, [, e]) => p * (e + 1), 1);
   }
   ```

   Виклик `[numberOfDivisors(360), numberOfDivisors(97), numberOfDivisors(1)]` → `[24, 2, 1]`

33. Приклад розв'язку:

   ```js
   function sumOfDivisors(n) {
     let s = 1;
     for (const [p, e] of factorizeTrial(n)) s *= (p ** (e + 1) - 1) / (p - 1);
     return s;
   }
   ```

   Виклик `[sumOfDivisors(12), sumOfDivisors(28), sumOfDivisors(97)]` → `[28, 56, 98]`

34. Приклад розв'язку:

   ```js
   const isPerfect = (n) => n > 1 && sumOfDivisors(n) - n === n;
   function sumOfDivisors(n) {
     let s = 1;
     for (const [p, e] of factorizeTrial(n)) s *= (p ** (e + 1) - 1) / (p - 1);
     return s;
   }
   ```

   Виклик `[6, 28, 496, 12, 8128].map(isPerfect)` → `[true, true, true, false, true]`

35. Приклад розв'язку:

   ```js
   function semiprimesUpTo(n) {
     let c = 0;
     for (let i = 4; i <= n; i++) if (factorizeTrial(i).reduce((s, [, e]) => s + e, 0) === 2) c++;
     return c;
   }
   ```

   Виклик `[semiprimesUpTo(30), semiprimesUpTo(100)]` → `[10, 34]`

36. Приклад розв'язку:

   ```js
   const rad = (n) => factorizeTrial(n).reduce((p, [q]) => p * q, 1)
   ```

   Виклик `[rad(360), rad(97), rad(1)]` → `[30, 97, 1]`

37. Приклад розв'язку:

   ```js
   function mobius(n) {
     const f = factorizeTrial(n);
     if (f.some(([, e]) => e > 1)) return 0;
     return f.length % 2 ? -1 : 1;
   }
   ```

   Виклик `[mobius(1), mobius(6), mobius(12), mobius(30), mobius(7)]` → `[1, 1, 0, -1, -1]`

38. Приклад розв'язку:

   ```js
   const primesInRangeCount = (lo, hi) => segmentedSieve(lo, hi).length
   ```

   Виклик `[primesInRangeCount(1, 100), primesInRangeCount(100, 200)]` → `[25, 21]`

39. Приклад розв'язку:

   ```js
   function largestPrimeFactor(n) {
     let best = 1;
     for (let p = 2; p * p <= n; p++) while (n % p === 0) {
       best = p;
       n /= p;
     }
     return n > 1 ? n : best;
   }
   ```

   Виклик `[largestPrimeFactor(13195), largestPrimeFactor(600851475143), largestPrimeFactor(97)]` → `[29, 6857, 97]`

40. Приклад розв'язку:

   ```js
   function nextPrime(n) {
     let x = n + 1;
     while (!isPrimeTrial(x)) x++;
     return x;
   }
   ```

   Виклик `[nextPrime(1), nextPrime(13), nextPrime(100), nextPrime(1000000)]` → `[2, 17, 101, 1000003]`

41. Послідовно викреслювати кратні кожного знайденого простого числа: те, що лишилось невикресленим після обробки всіх `p ≤ √n`, — прості числа.
42. Складене число `m ≤ n` має простий дільник не більший за `√m ≤ √n`, тому воно викреслюється одним із простих `p ≤ √n`. Для простих понад `√n` кратні вже викреслено меншими дільниками.
43. Кратні `p·k`, де `k < p`, мають менший простий дільник (дільник `k`) і вже викреслені раніше, тому нових викреслень до `p²` не буде.
44. Кількість викреслень — `n/2 + n/3 + n/5 + …` по простих `p ≤ √n`, тобто `n · Σ 1/p ≈ n · ln ln n` (сума обернених до простих зростає як `ln ln`), тому час `O(n log log n)`.
45. Воно викреслює кожне складене число рівно один раз — через його найменший простий дільник — тому працює за `O(n)` і одночасно будує масив найменших простих дільників; ціною є більша константа.
46. Щоб знаходити прості в діапазоні `[lo, hi]`, коли `hi` завелике для масиву на `hi` елементів: за простими до `√hi` викреслюють кратні лише в блоці довжини `hi − lo`, економлячи пам'ять і краще використовуючи кеш.
47. Масив найменших простих дільників дозволяє розкласти число послідовним діленням на `spf[x]` за `O(log x)`, тоді як пробні ділення вимагають `O(√x)` кроків; це вигідно при багатьох запитах.
48. Коли потрібно перевірити одне або кілька великих чисел: пробні ділення до `√n` або тест Міллера—Рабіна значно дешевші, ніж таблиця розміру `n`.
49. Теорема про розподіл простих: `π(n) ≈ n / ln n`. Наприклад, `π(10⁶) = 78498`, що близько до `10⁶ / 13,8 ≈ 72382` з поправкою на повільну збіжність.
50. Не обнуляти 0 і 1, викреслювати до `p ≤ n` замість `p² ≤ n`, переповнення `p * p` у мовах із 32-бітовими цілими, використання масиву булів замість типізованого масиву, початок викреслення з `2p` у сегментованому варіанті, що викреслює саме просте `p`.
