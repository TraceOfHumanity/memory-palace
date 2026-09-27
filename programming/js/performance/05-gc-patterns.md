# V8: патерни збирача сміття (GC) та керування пам'яттю

## Загальна ідея

Garbage Collection (GC) у V8 — механізм автоматичного видалення об'єктів з пам'яті, які більше не потрібні. Проблема: GC-паузи можуть повністю зламати 60fps і зробити застосунок «фризким».

Для стабільної продуктивності (особливо в реал-тайм застосунках — іграх, 3D-візуалізації) потрібно мінімізувати GC-паузи шляхом мінімізації нових алокацій у гарячих циклах.

## 1. Як працює garbage collection у V8

### 1.1. Scavenger (young generation GC)

V8 використовує generational GC — об'єкти розділені на «молоді» та «старі»:

```text
┌────────────────────────────────────┐
│ Young Generation (Scavenger)       │ ← часто чиститься
│ (новостворені об'єкти), ~1-2 MB    │
└────────────────────────────────────┘
┌────────────────────────────────────┐
│ Old Generation (Mark & Sweep)      │ ← рідко чиститься
│ (об'єкти, що пережили Scavenger)   │
│ ~100+ MB                            │
└────────────────────────────────────┘
```

### 1.2. Коли запускається GC

**Scavenger GC (Young):** кожного разу, коли Young Generation повна. Young Gen вміщує приблизно кілька мегабайтів; якщо створити об'єкти на понад цей обсяг — V8 запускає Scavenger GC. Пауза залежить від того, скільки об'єктів живі.

**Full GC (Old + Young):** коли Old Generation теж переповнена. Якщо багато об'єктів переживають Scavenger GC — V8 запускає Full GC, помітно довшу паузу.

На 60fps це означає: один кадр триває ~16.67мс. GC-пауза в кілька десятків мілісекунд — це вже кілька пропущених кадрів; пауза Full GC у сотні мілісекунд — це помітна користувачу заморозка.

## 2. Проблема наївного підходу: мільйон частинок на кадр

```js
// ❌ Наївний підхід
class ParticleNaive {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
  }
}
const particlesNaive = [];
function gameLoopNaive() {
  for (let i = 0; i < 1000000; i++) {
    const particle = new ParticleNaive(0, 0, 1, 1); // новий об'єкт!
    particlesNaive.push(particle);
  }
}
```

Що відбувається: перший кадр створює мільйон нових об'єктів (кілька чисел кожен). Young Gen переповнюється — Scavenger GC запускається багато разів за кадр. Наступні кадри: частина об'єктів переживає Scavenger і потрапляє в Old Gen, яка поступово зростає. Через якийсь час Old Gen переповнюється, і Full GC дає паузу в сотні мілісекунд — користувач бачить помітну заморозку.

Візуально на графіку FPS без оптимізації GC:

```text
60 ├─────────────────
   │   ╱╲    ╱╲    ╱╲
   │  ╱  ╲  ╱  ╲  ╱  ╲
40 │╱╲    ╲╱    ╲╱       ← фризи від GC
   │  ╲
20 │   ╲__________________ ← Full GC пауза
 0 └──────────────────────────────
   0    5    10   15   20 (секунди)
```

## 3. Рішення 1: object pool

Ідея: замість створювати нові об'єкти, перевикористовуй уже створені.

- **Ініціалізація (один раз):** пул із фіксованою кількістю об'єктів у пам'яті одразу.
- **Кожен кадр:** візьми об'єкт з пула, переініціалізуй; повтори циклічно → нуль нових алокацій.
- **Результат:** нуль GC-пауз, стабільний frame rate.

```js
class Particle {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.active = false;
    this.lifetime = 0;
  }
  // ініціалізуй об'єкт перед використанням
  init(x, y, vx, vy, lifetime = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.active = true;
    this.lifetime = lifetime;
  }
  // скидай стан при поверненні в пул
  reset() {
    this.active = false;
    this.lifetime = 0;
  }
  // оновлюй позицію in-place
  update(deltaTime) {
    if (!this.active) return;
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
    this.lifetime -= deltaTime;
    if (this.lifetime <= 0) this.reset();
  }
}

class ParticlePool {
  constructor(poolSize = 100000) {
    this.pool = Array.from({ length: poolSize }, () => new Particle()); // один раз
    this.nextIndex = 0;
    this.active = [];
  }
  get() {
    const particle = this.pool[this.nextIndex % this.pool.length];
    this.nextIndex++;
    this.active.push(particle);
    return particle;
  }
  update(deltaTime) {
    for (let i = 0; i < this.active.length; i++) {
      this.active[i].update(deltaTime);
      if (!this.active[i].active) {
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        i--;
      }
    }
  }
  render(ctx) {
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      ctx.fillRect(p.x, p.y, 2, 2);
    }
  }
  clear() {
    this.active.length = 0;
    this.nextIndex = 0;
  }
}
```

Швидка перевірка, що пул реально працює (без `canvas`, лише логіка):

```js
const pool = new ParticlePool(10);
const p1 = pool.get();
p1.init(0, 0, 1, 1, 0.05);
console.log(pool.pool.length, pool.active.length); // 10 1

pool.update(1 / 60);
console.log(p1.x.toFixed(3), p1.y.toFixed(3), p1.active); // 0.017 0.017 true

pool.update(1 / 60);
console.log(p1.active, pool.active.length); // true 1 — lifetime ще не вичерпано
```

Використання в реальному game loop (`ctx` тут — умовний canvas 2D-контекст, тому цей фрагмент лише ілюструє форму виклику, без запуску):

```js
const particleSystem = new ParticlePool(100000);
function gameLoop() {
  particleSystem.clear();
  for (let i = 0; i < 1000000; i++) {
    const p = particleSystem.get();
    p.init(Math.random() * 800, Math.random() * 600,
            (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
  }
  particleSystem.update(1 / 60);
  particleSystem.render(ctx);
}
// результат: 0 нових об'єктів на кадр, стабільний frame rate
```

Переваги object pool порівняно з наївним підходом — на порядок менше пам'яті на кадр (перевикористовуються вже виділені об'єкти замість мільйона нових щоразу) і відсутність повторюваних GC-пауз у стійкому стані.

## 4. Рішення 2: typed arrays

Для чисто числових даних typed arrays значно ефективніші. Проблема звичайних об'єктів: об'єкт `{ x, y, vx, vy }` — це структура із заголовком і метаданими, реальний розмір суттєво більший за «голі» 4 числа.

```js
// ✅ Typed array підхід: чистий масив чисел
class ParticleBuffer {
  constructor(maxParticles = 1000000) {
    this.maxParticles = maxParticles;
    this.count = 0;
    this.data = new Float64Array(maxParticles * 4); // x,y,vx,vy для кожної частинки
    this.lifetime = new Float32Array(maxParticles);
  }
  add(x, y, vx, vy, lifetime = 1) {
    if (this.count >= this.maxParticles) return;
    const idx = this.count * 4;
    this.data[idx] = x;
    this.data[idx + 1] = y;
    this.data[idx + 2] = vx;
    this.data[idx + 3] = vy;
    this.lifetime[this.count] = lifetime;
    this.count++;
  }
  update(deltaTime) {
    let writeIdx = 0;
    for (let i = 0; i < this.count; i++) {
      const idx = i * 4;
      this.data[idx] += this.data[idx + 2] * deltaTime;
      this.data[idx + 1] += this.data[idx + 3] * deltaTime;
      this.lifetime[i] -= deltaTime;
      if (this.lifetime[i] > 0) {
        if (writeIdx !== i) {
          this.data[writeIdx * 4] = this.data[idx];
          this.data[writeIdx * 4 + 1] = this.data[idx + 1];
          this.data[writeIdx * 4 + 2] = this.data[idx + 2];
          this.data[writeIdx * 4 + 3] = this.data[idx + 3];
          this.lifetime[writeIdx] = this.lifetime[i];
        }
        writeIdx++;
      }
    }
    this.count = writeIdx;
  }
  render(ctx) {
    for (let i = 0; i < this.count; i++) {
      const idx = i * 4;
      ctx.fillRect(this.data[idx], this.data[idx + 1], 2, 2);
    }
  }
  clear() {
    this.count = 0;
  }
}
```

Швидка перевірка:

```js
const buffer = new ParticleBuffer(5);
buffer.add(0, 0, 1, 1, 0.1);
buffer.add(10, 10, -1, -1, 0.01); // ця частинка "помре" на першому ж update
console.log(buffer.count); // 2

buffer.update(1 / 60);
console.log(buffer.count); // 1 — друга частинка вичерпала lifetime і видалена
console.log(buffer.data[0].toFixed(3), buffer.data[1].toFixed(3)); // 0.017 0.017
```

Використання (той самий умовний `ctx`, не запускається як самостійний фрагмент):

```js
const particleBuffer = new ParticleBuffer(1000000);
function gameLoopBuffer() {
  particleBuffer.clear();
  for (let i = 0; i < 1000000; i++) {
    particleBuffer.add(Math.random() * 800, Math.random() * 600,
               (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
  }
  particleBuffer.update(1 / 60);
  particleBuffer.render(ctx);
}
```

Детально про `Float64Array`/`Float32Array` та типізовані масиви загалом — `common/data-structures/Array/TypedArray.js`. Typed array дає прямий доступ до суцільної ділянки пам'яті без заголовків окремих об'єктів, тому для великих масивів однорідних чисел зазвичай ефективніший за масив об'єктів навіть за наявності object pool — і так само не створює нових алокацій у стійкому стані.

## 5. Батч-операції: уникай проміжних об'єктів у циклі

Навіть з object pool, якщо створюєш проміжні об'єкти в циклі, тиск на GC повернеться.

```js
// ❌ Погано: проміжні об'єкти у циклі
function processParticlesBad(particles) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const velocity = { x: p.vx, y: p.vy }; // новий об'єкт!
    const position = { x: p.x, y: p.y };   // новий об'єкт!
    position.x += velocity.x;
    position.y += velocity.y;
    p.x = position.x;
    p.y = position.y;
  }
}
```

```js
// ✅ Добре: in-place батч-операції
function processParticles(particles) {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 9.8; // gravity
    // 0 проміжних об'єктів
  }
}
```

На великій кількості частинок різниця відчутна: без батчингу — по два нових об'єкти на частинку щокадру (тиск на GC), з батчингом — нуль нових об'єктів.

## 6. Реальний приклад: комбінований підхід для 3D-системи

```js
class Particle3D {
  constructor() {
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.lifetime = 0;
    this.active = false;
  }
  init(px, py, pz, vx, vy, vz, lifetime) {
    this.position.x = px;
    this.position.y = py;
    this.position.z = pz;
    this.velocity.x = vx;
    this.velocity.y = vy;
    this.velocity.z = vz;
    this.acceleration.x = 0;
    this.acceleration.y = -9.8;
    this.acceleration.z = 0;
    this.lifetime = lifetime;
    this.active = true;
  }
  update(dt) {
    if (!this.active) return;
    this.velocity.x += this.acceleration.x * dt;
    this.velocity.y += this.acceleration.y * dt;
    this.velocity.z += this.acceleration.z * dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
    this.lifetime -= dt;
    if (this.lifetime <= 0) this.active = false;
  }
}

class ParticleEmitter {
  constructor(poolSize = 50000) {
    this.pool = Array.from({ length: poolSize }, () => new Particle3D());
    this.active = [];
    this.nextIndex = 0;
  }
  emit(x, y, z, count, lifetime) {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.nextIndex % this.pool.length];
      this.nextIndex++;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 10 + 5;
      p.init(x, y, z, Math.cos(angle) * speed, Math.random() * 20 + 10, Math.sin(angle) * speed, lifetime);
      this.active.push(p);
    }
  }
  update(dt) {
    for (let i = 0; i < this.active.length; i++) {
      this.active[i].update(dt);
      if (!this.active[i].active) {
        this.active[i] = this.active[this.active.length - 1];
        this.active.pop();
        i--;
      }
    }
  }
}
```

Швидка перевірка:

```js
const emitter = new ParticleEmitter(100);
emitter.emit(0, 0, 0, 5, 1.0);
console.log(emitter.active.length); // 5
emitter.update(1 / 60);
console.log(emitter.active.length); // 5 — lifetime 1.0 секунда, ще активні
console.log(emitter.active[0].velocity.y); // трохи менше за початкову швидкість — гравітація вже подіяла
```

Використання в реальному застосунку (потребує рушія рендеру, тому не запускається як фрагмент):

```js
const gameEmitter = new ParticleEmitter(50000);
function gameLoop() {
  gameEmitter.emit(0, 0, 0, 10000, 2.0);
  gameEmitter.update(1 / 60);
  // ... render(camera, renderer) ...
}
```

## 7. Профілювання GC

**Chrome DevTools:** вкладка Performance → запиши профіль → дивись на GC events (жовті смуги).

**Node.js:**

```bash
node --trace-gc myfile.js
```

Вихід виглядає приблизно так:

```text
[30824:0x110000000] 451 ms: Scavenger (reduce) 1.9 (2.2) -> 1.9 (2.2) MB
```

## Підсумок: GC best practices

1. Мінімізуй нові алокації у гарячих циклах.
2. Object pool для часто створюваних об'єктів.
3. Typed arrays для числових даних.
4. Батч-операції — модифікуй in-place.
5. Профілюй з DevTools або `--trace-gc`.

**Порівняння підходів для великої кількості частинок за кадр:**

| Підхід | Алокації на кадр | Пам'ять | GC-паузи |
|---|---|---|---|
| Наївний | нові об'єкти щокадру | пропорційна кількості частинок щокадру | регулярні, помітні |
| Object pool | 0 | фіксована, виділяється один раз | відсутні у стійкому стані |
| Typed array | 0 | фіксована, одна суцільна ділянка | відсутні у стійкому стані |

## Чекліст

- [ ] Чи я створюю нові об'єкти у гарячих циклах?
- [ ] Чи можу я перевикористати об'єкти (object pool)?
- [ ] Чи створюю проміжні об'єкти у циклі?
- [ ] Чи можу я використати typed arrays?
- [ ] Чи я профілював GC-паузи?
