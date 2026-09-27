# V8: поліморфні call sites — мономорфність самого виклику функції

## Загальна ідея

Нотатки про hidden classes та inline caching розглядали мономорфізм форми об'єкта (`obj.prop`). Але є ще один, окремий вид поліморфізму — поліморфізм самого місця виклику (call site) функції чи методу, коли різні виклики того самого рядка коду фактично викликають різні функції (наприклад, через різні класи з одним і тим самим методом, або через передачу різних колбеків в один і той самий пайплайн).

Це окрема причина деоптимізації, не пов'язана напряму з формою властивостей об'єкта.

## 1. Мономорфний проти поліморфного виклику методу

Коли викликаєш `obj.method()`, V8 кешує не лише offset властивості `"method"`, а й саму функцію, яку знайшов там востаннє. Якщо наступного разу за тим самим call site знаходиться інша функція (навіть з тим самим ім'ям методу, але з іншого класу чи прототипу) — це теж може призводити до polymorphic/megamorphic call site, аналогічно property access.

```js
class Circle {
  constructor(radius) {
    this.radius = radius;
  }
  area() {
    return Math.PI * this.radius ** 2;
  }
}
class Square {
  constructor(side) {
    this.side = side;
  }
  area() {
    return this.side * this.side;
  }
}

function computeArea(shape) {
  return shape.area(); // call site, що бачить різні area() залежно від типу shape
}

const shapes = [new Circle(2), new Square(3), new Circle(4), new Square(5)];
// чергування Circle/Square у одному й тому самому виклику computeArea() —
// класичний приклад поліморфного call site: V8 бачить ≥2 різних
// "цільових" функцій за одним викликом shape.area()
let totalArea = 0;
for (const shape of shapes) {
  totalArea += computeArea(shape);
}
console.log(totalArea.toFixed(2)); // 96.83
```

## 2. Чому це «дешевше», ніж мегаморфний property access, але все одно важливо

На відміну від мегаморфної форми об'єкта (штраф на порядок), поліморфний виклик методу (2–4 різні «цілі») зазвичай дешевший — сучасні рушії добре тримають polymorphic call sites для невеликої кількості варіантів. Але:

- це заважає inlining (V8 не може «вбудувати» тіло методу прямо в місце виклику, якщо не впевнений, який саме метод там опиниться) — а саме inlining відкриває двері для подальших оптимізацій (детально — нотатка про розмір функції);
- якщо кількість варіантів росте (більше приблизно 4 різних класів з тим самим методом, що проходять через один call site) — це деградує до мегаморфного виклику, з тими самими штрафами, що й для властивостей.

## Правила

### Правило 1: групуй однотипні виклики разом, а не чергуй їх

```js
// ❌ Чергування типів через один call site (як у прикладі вище)
function computeTotalMixed(shapes) {
  let total = 0;
  for (const shape of shapes) {
    total += shape.area(); // call site бачить Circle/Square по черзі
  }
  return total;
}
```

```js
// ✅ Розділи за типом — кожен call site бачить один тип
function computeTotalGrouped(circles, squares) {
  let total = 0;
  for (const c of circles) total += c.area(); // цей call site — тільки Circle
  for (const s of squares) total += s.area(); // цей call site — тільки Square
  return total;
}

const circles = shapes.filter((s) => s instanceof Circle);
const squares = shapes.filter((s) => s instanceof Square);
console.log(computeTotalGrouped(circles, squares).toFixed(2)); // 96.83
```

### Правило 2: обережно з callback-параметрами, що постійно змінюються

Кожен виклик `array.map(callback)`/`array.forEach(callback)` — це теж call site. Якщо в одному й тому самому місці коду ти постійно передаєш різні функції (наприклад, різні стрілкові функції, створені щоразу наново, залежно від умови) — V8 бачить це як окремі «цілі» виклику для внутрішнього виклику `callback(item)` усередині `.map()`.

```js
// ❌ Різна функція-колбек залежно від умови, той самий call site всередині pipeline
function transformBad(items, useDouble) {
  const fn = useDouble ? (x) => x * 2 : (x) => x + 1; // різні функції!
  return items.map(fn); // call site всередині map викликає то одну, то іншу
}
```

```js
// ✅ Розділи на дві явні, стабільні функції
function double(x) {
  return x * 2;
}
function incrementByOne(x) {
  return x + 1;
}
function transformDouble(items) {
  return items.map(double); // цей call site завжди бачить одну функцію
}
function transformIncrement(items) {
  return items.map(incrementByOne); // і цей теж
}
```

### Правило 3: уникай «універсальних» диспетчерів з великою кількістю гілок

```js
// ❌ Один диспетчер для багатьох типів команд — call site handlers[cmd.type]()
// стає megamorphic, коли типів команд багато й вони чергуються часто
function executeCommandBad(cmd, handlers) {
  return handlers[cmd.type](cmd.payload); // виклик "невідомо якої" функції з мапи
}
```

Якщо типів мало (2–4) і вони стабільні в межах «гарячого» пайплайна — залиш явний диспетчер через `switch` (передбачувані гілки, детально — нотатка про branch prediction) замість динамічного виклику з таблиці:

```js
// ✅ Явний диспетчер через switch
function executeCommand(cmd) {
  switch (cmd.type) {
    case "move":
      return `move to ${cmd.payload}`;
    case "attack":
      return `attack ${cmd.payload}`;
    default:
      return "unknown command";
  }
}
console.log(executeCommand({ type: "move", payload: "north" })); // move to north
```

## Підсумок

- Поліморфізм стосується не лише форми об'єктів (hidden classes), а й самого місця виклику функції чи методу (call site) — якщо один і той самий рядок коду постійно викликає різні конкретні функції.
- Polymorphic call site (2–4 варіанти) зазвичай дешевший за megamorphic property access, але все одно заважає inlining.
- Якщо кількість варіантів зростає (понад ~4) — деградує до мегаморфного виклику з відповідними штрафами.
- Практичне правило: групуй однотипні виклики разом (окремі цикли/функції для кожного типу), а не чергуй їх в одному гарячому шляху; уникай передачі різних функцій-колбеків в один і той самий call site в гарячому коді.
- Для невеликої, стабільної кількості варіантів команд — явний `switch` часто передбачуваніший за динамічний виклик з таблиці обробників.
