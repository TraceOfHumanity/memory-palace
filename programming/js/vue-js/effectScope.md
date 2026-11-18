# Vue 3: `effectScope`, `onScopeDispose`, `getCurrentScope`

Виміряно на Vue 3.5.44.

## 1. Проблема

Кожен `watch`, `watchEffect`, `computed` — це **ефект**, який треба зупиняти. У компоненті Vue робить це автоматично при розмонтуванні. Поза компонентом (у композаблі, плагіні, тесті) їх зупиняти доводиться вручну — легко забути й отримати **витік**.

## 2. `effectScope`

Створює **групу ефектів**, яку можна зупинити одним викликом:
```js
const scope = effectScope();
scope.run(() => {
  watchEffect(() => console.log(x.value));
  watch(x, () => …);
  const double = computed(() => x.value * 2);
});
scope.stop();             // зупинить ВСІ ефекти, створені всередині run
```
Виміряно: зміна `x` до `stop()` → `e0 | e1 | w`; після `scope.stop()` зміна `x = 2` → **нічого** (усі зупинено).

## 3. `onScopeDispose(fn)`

Реєструє колбек очищення, що викликається при **знищенні поточного scope**. У компоненті scope = життя компонента, тому `onScopeDispose` спрацьовує при розмонтуванні (виміряно: `scope disposed`). Це «`onUnmounted`, що працює і в композаблах поза компонентом».
```js
function useEventListener(target, name, handler) {
  target.addEventListener(name, handler);
  onScopeDispose(() => target.removeEventListener(name, handler));
}
```

## 4. Як це пов'язано з компонентом

- Кожен компонент має **свій scope**; ефекти, створені **синхронно** в `setup()`, до нього прив'язані й зупиняються автоматично (виміряно: після `app.unmount()` `watchEffect` не запускається).
- Ефекти, створені **асинхронно** (`setTimeout`, після `await` у `async setup`), в scope компонента **не потрапляють** → витік. Рішення: зупиняти вручну або створювати власний `effectScope`.

## 5. Вкладені scope

`effectScope(true)` — **відокремлений** (detached) scope, що не зупиняється разом із батьківським. За замовчуванням дочірній scope зупиняється з батьком.

## 6. `getCurrentScope()`

Повертає активний scope або `undefined`. Використовується бібліотеками (VueUse `tryOnScopeDispose`) для умовної реєстрації очищення: `if (getCurrentScope()) onScopeDispose(stop)`.

## 7. Типове застосування

- **Спільні композабли** (один екземпляр логіки на багатьох споживачів): `createSharedComposable` — ефекти живуть, доки є хоч один споживач.
- **Тести**: скинути всі ефекти після тесту.
- **Динамічне створення/знищення ефектів** (плагіни, віджети).

## 8. Типові помилки

1. Створити `watch` в асинхронному колбеку без зупинки.
2. Забути `scope.stop()` для самостійно створеного scope.
3. Викликати `onScopeDispose` поза активним scope (попередження).
4. Очікувати, що `computed` у scope «прибереться» без `stop()` — він теж ефект, і повинен знищуватись разом зі scope.
5. Вважати, що вкладений scope переживе батька (за замовчуванням ні).

## 9. Алгоритм

1. У компоненті — нічого не роби: `setup` синхронно.
2. У композаблі прибирай ресурси через `onScopeDispose`.
3. Поза компонентом — `const scope = effectScope(); scope.run(…); scope.stop()`.
4. Асинхронні ефекти — власний scope або `stop()`.

## Задачі для закріплення

12 задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Кожен фрагмент — тіло асинхронної функції, відповідь — значення, яке воно повертає. У прикладах `mount(Component)` монтує компонент у тестове дерево без DOM, `html(r)` серіалізує його, `click(node)` викликає `onClick`, `tick()` — це `nextTick`, `sleep(ms)` — пауза; API Vue (`ref`, `watch`, `h` та інші) імпортуються з `vue`.

### Рівень 1. Основи

**1.** Зупинка всіх ефектів області через `scope.stop()`.

```js
const n = ref(0); let a = 0, b = 0; const scope = effectScope(); scope.run(() => { watchEffect(() => { n.value; a++; }); watchEffect(() => { n.value; b++; }); }); n.value = 1; await tick(); scope.stop(); n.value = 2; await tick(); return [a, b];
```

**2.** `scope.run` повертає значення колбека.

```js
const scope = effectScope(); const r = scope.run(() => 42); return [r, scope.active];
```

**3.** Після `stop` `run` повертає `undefined`.

```js
const scope = effectScope(); scope.stop(); return [scope.run(() => 1), scope.active];
```

### Рівень 2. Деталі й поведінка

**4.** `onScopeDispose` викликається при зупинці області.

```js
const log = []; const scope = effectScope(); scope.run(() => { onScopeDispose(() => log.push('disposed')); }); log.push('before'); scope.stop(); return log;
```

**5.** Computed усередині scope зупиняється разом із областю.

```js
const a = ref(1); const scope = effectScope(); let d; scope.run(() => { d = computed(() => a.value * 2); watchEffect(() => d.value); }); a.value = 2; scope.stop(); a.value = 3; return d.value;
```

**6.** Вкладені області: батьківський `stop` зупиняє дочірні.

```js
const n = ref(0); let inner = 0; const outer = effectScope(); outer.run(() => { const s = effectScope(); s.run(() => { watchEffect(() => { n.value; inner++; }); }); }); outer.stop(); n.value = 1; await tick(); return inner;
```

### Рівень 3. Нюанси та пастки

**7.** Незалежна (detached) область переживає батьківську.

```js
const n = ref(0); let runs = 0; const outer = effectScope(); let inner; outer.run(() => { inner = effectScope(true); inner.run(() => { watchEffect(() => { n.value; runs++; }); }); }); outer.stop(); n.value = 1; await tick(); return runs;
```

**8.** `getCurrentScope`.

```js
const scope = effectScope(); let inside, outside = getCurrentScope(); scope.run(() => { inside = getCurrentScope() === scope; }); return [inside, outside === undefined];
```

**9.** Ефект, створений поза областю, не зупиняється `scope.stop()`.

```js
const n = ref(0); let runs = 0; watchEffect(() => { n.value; runs++; }); const scope = effectScope(); scope.stop(); n.value = 1; await tick(); return runs;
```

### Рівень 4. Практика

**10.** `scope.pause()` / `resume()` (3.5+).

```js
const n = ref(0); let runs = 0; const scope = effectScope(); scope.run(() => { watchEffect(() => { n.value; runs++; }); }); scope.pause(); n.value = 1; await tick(); const paused = runs; scope.resume(); await tick(); return [paused, runs];
```

**11.** Навіщо `effectScope`?

**12.** Що робить `onScopeDispose`?

### Відповіді

1. `[2, 2]`
2. `[42, true]`
3. `[undefined, false]`
4. `['before', 'disposed']`
5. `6`
6. `1`
7. `2`
8. `[true, true]`
9. `2`
10. `[1, 2]`
11. Групує реактивні ефекти (watch, computed) для спільного знищення, наприклад у композаблах поза компонентом або у спільних сторах
12. Реєструє функцію очищення, що виконується при зупинці активної області (аналог `onUnmounted` для scope)
