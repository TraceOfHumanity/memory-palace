# WeakMap — колекція ключ-значення зі «слабкими» ключами-об'єктами (ES6)

## 1. Що таке WeakMap і чим він відрізняється від Map

`WeakMap` — це «родич» `Map`, який зберігає пари ключ-значення, але з трьома фундаментальними обмеженнями, що роблять його спеціальним інструментом, а не просто «полегшеною версією» `Map`:

1. ключами можуть бути лише об'єкти (і, з ES2023, **незареєстровані** symbol'и — створені через `Symbol()`, але **не** через `Symbol.for()`) — жодних рядків, чисел, boolean;
2. посилання на ключ «слабке» (weak reference) — не заважає збирачу сміття (garbage collector) видалити цей об'єкт;
3. `WeakMap` не iterable — немає `keys()`/`values()`/`entries()`/`forEach()`/`size` — вміст неможливо «перелічити».

```js
const weakMap = new WeakMap();
const keyObj1 = { id: 1 };
weakMap.set(keyObj1, "private data for keyObj1");
console.log(weakMap.get(keyObj1)); // "private data for keyObj1"

// weakMap.set("string", "value"); // TypeError: Invalid value used as weak map key
```

## 2. Створення WeakMap

```js
// а) порожній WeakMap
const emptyWeakMap = new WeakMap();

// б) WeakMap одразу з даними — приймає iterable з пар [об'єкт-ключ, значення]
const objKey1 = {};
const objKey2 = {};
const filledWeakMap = new WeakMap([
  [objKey1, "value 1"],
  [objKey2, "value 2"],
]);
console.log(filledWeakMap.get(objKey1)); // "value 1"
```

На відміну від `Map`, `WeakMap` не можна створити «порожнім і подивитись», скільки в ньому елементів, чи скопіювати весь вміст — немає жодного способу отримати повний список записів (це навмисне обмеження).

## 3. weakMap.set(keyObj, value) — додавання / оновлення

```js
const configWeakMap = new WeakMap();
const configOwner = {};
configWeakMap.set(configOwner, { theme: "dark" });
configWeakMap.set(configOwner, { theme: "light" }); // оновлення — той самий ключ
console.log(configWeakMap.get(configOwner)); // { theme: "light" }

// set() повертає сам WeakMap — можна ланцюжком, як і в Map:
const chainedWeakMap = new WeakMap().set(objKey1, 1).set(objKey2, 2);
```

## 4. weakMap.get(keyObj) — отримання значення

```js
console.log(configWeakMap.get(configOwner)); // { theme: "light" }
console.log(configWeakMap.get({})); // undefined — це інший об'єкт у пам'яті!

// важливо: пошук у WeakMap відбувається за посиланням на об'єкт,
// а не за "вмістом" — навіть якщо два об'єкти виглядають однаково,
// це різні ключі:
const lookAlikeKey1 = { tag: "same shape" };
const lookAlikeKey2 = { tag: "same shape" };
const shapeWeakMap = new WeakMap();
shapeWeakMap.set(lookAlikeKey1, "bound to the first object");
console.log(shapeWeakMap.get(lookAlikeKey2)); // undefined — не той самий об'єкт
```

## 5. weakMap.has(keyObj) — перевірка наявності ключа

```js
console.log(configWeakMap.has(configOwner)); // true
console.log(configWeakMap.has({})); // false — новий об'єкт, ключа нема
```

## 6. weakMap.delete(keyObj) — видалення запису

```js
console.log(configWeakMap.delete(configOwner)); // true — видалено
console.log(configWeakMap.delete({})); // false — такого ключа й не було
console.log(configWeakMap.has(configOwner)); // false
```

## 7. Чого в WeakMap немає — і чому саме

Немає: `size`, `keys()`, `values()`, `entries()`, `forEach()`, `for...of`, `clear()`. Причина одна й та сама для всіх: об'єкт-ключ може бути видалений збирачем сміття в будь-який момент, непередбачувано для коду. Якби існував спосіб «перелічити» вміст `WeakMap`, результат залежав би від того, коли саме відпрацював garbage collector — а момент його роботи не визначений специфікацією й непередбачуваний. Тому будь-яка ітерованість `WeakMap` суперечила б самій ідеї «слабкості».

```js
// console.log(configWeakMap.size);      // undefined — властивості просто немає
// for (const pair of configWeakMap) {}  // TypeError: configWeakMap is not iterable
```

## 8. Weak reference — що це означає на практиці

«Звичайне» (сильне) посилання не дає збирачу сміття видалити об'єкт з пам'яті, поки на нього хтось посилається. `WeakMap` зберігає ключ інакше — це посилання не рахується під час пошуку «чи потрібен ще цей об'єкт комусь».

```js
let temporaryUser = { name: "temporary user" };
const sessionDataWeakMap = new WeakMap();
sessionDataWeakMap.set(temporaryUser, { lastLogin: "2026-09-04" });

console.log(sessionDataWeakMap.get(temporaryUser)); // { lastLogin: "2026-09-04" }

// коли єдине "звичайне" посилання на об'єкт зникає (обнуляється
// або виходить зі scope) — об'єкт стає недосяжним для решти коду,
// і при наступному циклі збирача сміття видаляється з пам'яті разом
// із відповідним записом у WeakMap. Це відбувається автоматично,
// без явного delete() з боку розробника:
temporaryUser = null;
// у майбутньому (непередбачувано коли саме) garbage collector звільнить
// і сам об'єкт, і запис sessionDataWeakMap → { lastLogin: ... }
```

## 9. Головне застосування: «приватні» дані без витоку пам'яті

Класичний патерн до появи приватних полів класу (`#field`) — зберігати «приватний» стан об'єкта окремо, в `WeakMap`, ключем до якого є сам публічний екземпляр:

```js
const _privateData = new WeakMap();

class BankAccount {
  constructor(owner, initialBalance) {
    this.owner = owner; // публічне поле
    _privateData.set(this, { balance: initialBalance }); // приватне — недоступне ззовні напряму
  }

  deposit(amount) {
    const data = _privateData.get(this);
    data.balance += amount;
    return data.balance;
  }

  getBalance() {
    return _privateData.get(this).balance;
  }
}

const account = new BankAccount("Maria", 1000);
console.log(account.deposit(500)); // 1500
console.log(account.getBalance()); // 1500
console.log(account.balance); // undefined — ззовні "приватні" дані недоступні
console.log(Object.keys(account)); // ["owner"] — balance взагалі не видно на об'єкті
```

Коли `account` стане недосяжним (наприклад, вийде зі scope), і сам об'єкт, і його приватні дані в `_privateData` звільняться разом — на відміну від звичайного `Map`, де запис лишився б «висіти» назавжди, поки хтось явно не викличе `map.delete()`.

Сучасна альтернатива для приватності — `#privateField` у класах:

```js
class ModernBankAccount {
  #balance; // справжнє приватне поле, WeakMap для цього більше не обов'язковий
  constructor(initialBalance) {
    this.#balance = initialBalance;
  }
  getBalance() {
    return this.#balance;
  }
}
```

`WeakMap` і сьогодні залишається корисним для метаданих про об'єкти, якими розробник не керує напряму (наприклад, DOM-елементи в браузері).

## 10. Застосування: кешування результатів для об'єктів

`WeakMap` ідеально підходить для кешу «результат обчислення для конкретного об'єкта» — коли об'єкт видаляється, кеш для нього звільняється сам, без ручного очищення й без ризику витоку пам'яті.

```js
const computationCache = new WeakMap();

function expensiveComputation(dataObj) {
  if (computationCache.has(dataObj)) {
    console.log("from cache");
    return computationCache.get(dataObj);
  }
  console.log("computing from scratch...");
  const result = dataObj.values.reduce((sum, n) => sum + n, 0); // умовно "дорога" операція
  computationCache.set(dataObj, result);
  return result;
}

const dataset = { values: [1, 2, 3, 4, 5] };
console.log(expensiveComputation(dataset)); // "computing from scratch..." → 15
console.log(expensiveComputation(dataset)); // "from cache" → 15
```

## 11. Застосування: позначення DOM-елементів без витоку пам'яті (у браузері)

Класичний приклад з реального світу: прив'язати метадані до DOM-елемента (наприклад, «чи вже ініціалізований обробник подій»), не боячись, що ці дані завадять елементу бути видаленим зі сторінки й звільненим з пам'яті, коли він видаляється з DOM.

```js
// const domElementMetadata = new WeakMap();
// function initOnce(element) {
//   if (domElementMetadata.has(element)) return; // вже ініціалізований
//   domElementMetadata.set(element, { initialized: true });
//   element.addEventListener("click", () => console.log("click!"));
// }
// коли element видаляється з DOM і на нього більше немає посилань,
// запис у domElementMetadata теж автоматично зникає
```

## 12. WeakMap vs Map — коли що обирати

| Критерій | Map | WeakMap |
|---|---|---|
| Тип ключа | будь-який | лише об'єкти (+ незареєстровані symbol) |
| Керування пам'яттю | ручне (`map.delete()`/`clear()`) | автоматичне (garbage collection) |
| Ітерованість | так (`keys`/`values`/`entries`/`forEach`) | ні — жодного способу перелічити |
| `size` | є | немає |
| Типове застосування | звичайні колекції даних | приватні/додаткові метадані для об'єктів, кеш «прив'язаний» до об'єкта |

Правило вибору: якщо потрібно зберігати дані, поки існує пов'язаний з ними об'єкт, і не думати про ручне очищення — `WeakMap`. Якщо потрібна повноцінна, передбачувана колекція з ітерацією — `Map` ([Map.md](../Map/Map.md)).

## 13. Основа: збирач сміття і «досяжність»

Щоб зрозуміти `WeakMap`, потрібно розуміти, як JavaScript вирішує, що об'єкт можна видалити з пам'яті.

**Досяжність (reachability).** Рушій має набір **коренів (roots)**: глобальні змінні, локальні змінні активних функцій, стек викликів. Об'єкт **досяжний**, якщо до нього можна дійти від якогось кореня **по ланцюжку посилань**. Недосяжні об'єкти — сміття.

```
 корінь ──▶ A ──▶ B           A і B досяжні
            │
            └──▶ C            C досяжний

            D ──▶ E           D і E недосяжні (на D ніхто не посилається) → сміття
```

Збирач сміття (mark-and-sweep) **позначає** усе досяжне від коренів, а решту **видаляє**. Звичайне посилання — **сильне**: воно робить об'єкт досяжним. **Слабке** посилання — ні: воно не продовжує життя об'єкта.

Поведінка колекцій:

| Колекція | Посилання на ключ/значення |
|---|---|
| `Map`, `Set`, масив, об'єкт | **сильні** — утримують елементи в пам'яті |
| `WeakMap` (ключ), `WeakSet` (елемент) | **слабкі** — не утримують |
| `WeakRef` | слабке посилання на один об'єкт |

## 14. Перевірка: `Map` утримує, `WeakMap` ні

Запуск із `node --expose-gc` та `WeakRef` для спостереження дає (перевірено):

```js
const strong = new Map();
const weak = new WeakMap();
let refStrong, refWeak;

(function () {
  const k1 = {};
  const k2 = {};
  strong.set(k1, "x");
  weak.set(k2, "y");
  refStrong = new WeakRef(k1);
  refWeak = new WeakRef(k2);
})();   // k1 і k2 вийшли зі scope: ніхто, крім колекцій, на них не посилається

gc();   // примусове збирання (лише з --expose-gc, для експерименту)

refStrong.deref();  // { }       — Map утримує ключ: він живий (витік пам'яті)
refWeak.deref();    // undefined — WeakMap не утримує: об'єкт зібрано
```

Саме це і є **витік пам'яті**: об'єкт у звичайному `Map` не зникне, доки хтось явно не викличе `delete`.

## 15. Ефемерони: значення не утримує ключ

Цікавий випадок: якщо **значення** посилається на власний **ключ**, чи не утримає воно ключ у пам'яті? Ні. `WeakMap` — це **ефемерон**: значення досяжне лише поки досяжний ключ. Перевірено:

```js
const wm = new WeakMap();
(function () {
  const key = {};
  wm.set(key, { back: key });   // значення посилається на ключ
  ref = new WeakRef(key);
})();
gc();
ref.deref();   // undefined — зібрано разом із записом, цикл «ключ ↔ значення» не заважає
```

Якби `WeakMap` був просто «слабкими ключами, сильними значеннями», такий цикл утримував би запис вічно.

## 16. Ключі-символи (ES2023)

Ключем може бути **незареєстрований** символ (створений через `Symbol()`), а також well-known символи (`Symbol.iterator`). Зареєстровані через `Symbol.for()` — **ні**, бо реєстр тримає їх назавжди (слабкість була б неможливою). Перевірено:

```js
const wm = new WeakMap();
wm.set(Symbol("local"), 1);     // ок
wm.set(Symbol.for("shared"), 1); // TypeError: Invalid value used as weak map key
```

## 17. `WeakRef` та `FinalizationRegistry`

- **`WeakRef`** — слабке посилання на **один** об'єкт: `ref.deref()` повертає об'єкт або `undefined`, якщо його зібрано. Корисно для кешів, де запис можна «втратити».
- **`FinalizationRegistry`** — реєструє callback, який викличеться **після** збирання об'єкта (для очищення зовнішніх ресурсів). Перевірено: після `gc()` callback спрацював.

```js
const registry = new FinalizationRegistry((token) => console.log("зібрано:", token));
registry.register(someObject, "token-1");
```

**Важливо:** момент збирання сміття **не детермінований**. Ніколи не будуй логіку, яка залежить від того, **коли** саме зникне запис. `WeakRef`/`FinalizationRegistry` — інструменти для оптимізації та очищення, а не для бізнес-логіки.

## 18. `WeakMap` чи `#private` поля

Приватні поля класу (`#x`) — сучасний спосіб інкапсуляції: швидше, зручніше, є перевірка належності (**brand check**):

```js
class A {
  #x = 1;
  static isA(o) { return #x in o; }   // true лише для справжніх екземплярів A
}
A.isA(new A());  // true
A.isA({});       // false
```

Перевірено запуском. Тому для нових класів — `#private`. `WeakMap` потрібен, коли:

- об'єкти **не твої** (DOM-елементи, об'єкти бібліотек, вбудовані типи) — не можна додати поле в клас;
- метаданих багато/вони тимчасові й прив'язані до **довільних** об'єктів (кеш, лічильники, «вже оброблено»);
- треба зберігати дані про об'єкт **поза** ним (не змінюючи форму об'єкта та не потрапляючи в його `Object.keys`/JSON).

## 19. Типові помилки

1. Використовувати рядки/числа як ключі → `TypeError`.
2. Очікувати `size`, `keys`, `forEach`, `clear` (їх немає).
3. Створювати «новий об'єкт-літерал» як ключ і шукати його (`get({})` → `undefined`: інше посилання).
4. Покладатися на **момент** очищення запису.
5. Зберігати в `WeakMap` значення, на які є **сильні** посилання ззовні, і дивуватись, що вони не зникають (зникає запис, лише коли недосяжний **ключ**).
6. Використовувати `WeakMap` як «обмежений кеш» (він не обмежує розмір; для цього LRU на `Map`).
7. Плутати `WeakMap` і `WeakRef`.
8. Використовувати зареєстровані символи (`Symbol.for`) як ключі.

## 20. Алгоритм: коли брати WeakMap

1. Дані **прив'язані до часу життя** конкретного об'єкта, і ти не хочеш про них турбуватися → `WeakMap`.
2. Чужі об'єкти (DOM, бібліотеки) → `WeakMap`; свої класи → `#private`.
3. Потрібні `size`, перебір, строкові ключі → `Map`.
4. Потрібно обмежити розмір → LRU, а не `WeakMap`.
5. Не залежи від моменту збирання сміття.
6. Лише «є чи нема» для об'єкта → `WeakSet`.

## Підсумок

- `WeakMap`: пари ключ-значення, де ключ — обов'язково об'єкт, а посилання на нього «слабке» (не заважає garbage collection).
- Методи: `set()`/`get()`/`has()`/`delete()` — той самий інтерфейс, що в `Map`.
- Немає `size`, `keys`/`values`/`entries`/`forEach`, не ітерований — навмисно, бо вміст може непередбачувано зникати через збирач сміття.
- Пошук за ключем — за посиланням, а не за вмістом об'єкта.
- Коли об'єкт-ключ стає недосяжним, garbage collector автоматично звільняє і сам об'єкт, і відповідний запис у `WeakMap`.
- Головні застосування: приватні дані об'єктів (до появи `#field`), кешування «прив'язане» до об'єкта, метадані для DOM-елементів.
- Вибирай `WeakMap` замість `Map`, коли потрібне автоматичне «прибирання за собою» пам'яті, а не звичайна, ітерована колекція.
- Модель: збирач сміття видаляє недосяжні об'єкти; `Map`/`Set` утримують елементи (сильні посилання), `WeakMap`/`WeakSet` — ні (перевірено з `gc()` і `WeakRef`).
- Ефемерони: значення, що посилається на свій ключ, не утримує його.
- Ключі-символи: незареєстровані (`Symbol()`), не `Symbol.for()`.
- `WeakRef`/`FinalizationRegistry` — для оптимізації, момент збирання не детермінований.
- Для власних класів краще `#private`; `WeakMap` — для чужих об'єктів і метаданих.
