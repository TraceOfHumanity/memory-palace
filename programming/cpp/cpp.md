# C++: загальна характеристика

## Ключові відомості

| Параметр | Характеристика |
|---|---|
| Автор | Б'ярне Страуструп (Bell Labs) |
| Рік появи | 1979 (як «C with Classes»); назву C++ — з 1983 |
| Стандарти | C++98, C++03, C++11, C++14, C++17, C++20, C++23 (ISO/IEC 14882) |
| Парадигми | мультипарадигмальна: процедурна, об'єктно-орієнтована, узагальнена (generic), елементи функціональної |
| Типізація | статична, сильніша за C |
| Виконання | компіляція в машинний код |
| Керування пам'яттю | ручне та детерміноване (RAII, розумні вказівники) |
| Компілятори | GCC, Clang, MSVC |
| Розширення файлів | `.cpp`, `.hpp`, `.h` |

## 1. Історичний контекст

Роботу над мовою розпочав Б'ярне Страуструп 1979 року в Bell Labs. Метою було поєднати ефективність і низькорівневі можливості [[c]] з механізмами абстракції мови Simula, яку він застосовував у дисертаційній роботі. Початкова назва — «C with Classes»; ім'я C++ (операція інкременту, тобто «наступник C») з'явилося 1983 року, а перший комерційний випуск відбувся 1985 року.

Стандартизація мови розпочалася 1998 року (C++98). Редакція **C++11** стала переломною, тому її прийнято називати «сучасним C++»: семантика переміщення, `auto`, лямбда-вирази, розумні вказівники, потоки. Відтоді редакції виходять кожні три роки. C++20 додав концепти (concepts), модулі, діапазони та співпрограми.

## 2. Принципи дизайну

1. **Принцип нульових накладних витрат (zero-overhead principle).** Те, чим ви не користуєтеся, не має коштувати нічого; те, чим користуєтеся, ви не змогли б реалізувати ефективніше вручну.
2. **Абстракція без втрати продуктивності.** Класи, шаблони й перевантаження компілюються в код, що не поступається написаному вручну.
3. **Підтримка кількох стилів програмування.** Мова не нав'язує єдину парадигму.
4. **Сумісність із C** (значною мірою), що забезпечує використання наявного коду.

## 3. Модель виконання

Як і в C, програма компілюється в машинний код без віртуальної машини. Відмінність полягає в потужніших механізмах часу компіляції: **шаблони** (templates) генерують код для конкретних типів, `constexpr` дозволяє виконувати обчислення під час компіляції. Стандарт визначає й абстрактну машину, що гарантує відповідність поведінки програми незалежно від апаратури.

## 4. Ключова ідея: RAII

**RAII** (Resource Acquisition Is Initialization) — володіння ресурсом пов'язано з часом життя об'єкта: ресурс захоплюється в конструкторі й звільняється в деструкторі, що викликається автоматично при виході з області видимості, зокрема й при винятку. Ця ідея замінила ручні пари «виділити/звільнити» й стала основою безпечного керування ресурсами (пам'ять, файли, м'ютекси).

```cpp
#include <iostream>
#include <memory>
#include <vector>

int main() {
    auto p = std::make_unique<int>(42);   // володіння пам'яттю; delete не потрібен
    std::vector<int> v{1, 2, 3};          // вектор сам керує своєю пам'яттю
    std::cout << *p << ' ' << v.size() << '\n';   // 42 3
}   // тут ресурси звільняються автоматично
```

## 5. Система типів і абстракції

- **Класи та успадкування**, віртуальні функції (динамічний поліморфізм).
- **Шаблони** (статичний поліморфізм): стандартна бібліотека шаблонів (STL) — контейнери, ітератори й алгоритми — приклад узагальненого програмування (детально — [std.md](std.md)).
- **Семантика переміщення** (`std::move`) дозволяє передавати ресурси без копіювання.
- **Перевантаження функцій та операторів**.
- **Винятки** для обробки помилок.

## 6. Керування пам'яттю

Керування залишається ручним, але сучасний стиль уникає «голих» `new`/`delete`. Рекомендовані інструменти: `std::unique_ptr` (єдине володіння), `std::shared_ptr` (спільне володіння з лічильником посилань), контейнери стандартної бібліотеки. Невизначена поведінка, як і в C, можлива (вихід за межі масиву, звернення до висячого посилання).

## 7. Сфери застосування

- ігрові рушії та графіка (Unreal Engine);
- браузери й системне ПЗ (Chromium, компоненти операційних систем);
- бази даних, високопродуктивні обчислення, фінансові системи з низькою затримкою;
- вбудовані системи, зокрема критичні до безпеки, автомобільна електроніка.

## 8. Сильні сторони та обмеження

| Сильні сторони | Обмеження |
|---|---|
| Висока продуктивність та контроль | Висока складність мови |
| Потужні абстракції без накладних витрат | Тривала компіляція, складні повідомлення про помилки |
| Багата екосистема і зворотна сумісність | Невизначена поведінка, спадок C |
| Детермінований час життя ресурсів | Різні «діалекти» залежно від версії стандарту |

## 9. Поширені хибні уявлення

1. «C++ — це C з класами». Це було вірно лише на початку; сучасна мова принципово відмінна.
2. «Розумні вказівники роблять C++ таким самим безпечним, як мови зі збирачем сміття». Вони знімають один клас помилок, але не всі.
3. «C++ завжди швидший». Швидкодія залежить від коду й розуміння моделі пам'яті, а не лише від мови.


## 10. Рекомендована література

- Stroustrup B. *A Tour of C++*, 3rd ed. Addison-Wesley, 2022.
- Stroustrup B. *The C++ Programming Language*, 4th ed. Addison-Wesley, 2013.
- Meyers S. *Effective Modern C++*. O'Reilly, 2014.
- Довідник cppreference.com та ISO/IEC 14882.

## Задачі для закріплення

Тридцять задач від простих до складних. Спробуйте відповісти самостійно, потім звіряйтесь із відповідями в кінці розділу. Код компілюйте командою `clang++ -std=c++20 -Wall`.

### Рівень 1. Основи

**1.** Що виведе `std::cout` для різних типів та `endl`?

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    std::cout << 42 << ' ' << 3.5 << ' ' << true << ' ' << "s" << std::endl;
}

```

**2.** `std::boolalpha` та `std::fixed`.

```cpp
#include <iostream>
int main() {
    std::cout << std::boolalpha << true << ' ' << std::fixed;
    std::cout.precision(2);
    std::cout << 3.14159 << '\n';
}

```

**3.** Різниця між посиланням і вказівником: зміна через посилання.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    int x = 1;
    int& r = x;
    r = 10;
    int* p = &x;
    *p += 5;
    std::cout << x << ' ' << r << '\n';
}

```

**4.** Передача за значенням, посиланням та константним посиланням.

```cpp
#include <iostream>
void f1(int x) { x = 99; }
void f2(int& x) { x = 99; }
void f3(const int& x) { (void)x; }
int main() {
    int a = 1, b = 1, c = 1;
    f1(a); f2(b); f3(c);
    std::cout << a << ' ' << b << ' ' << c << '\n';
}

```

**5.** RAII: порядок виклику конструкторів та деструкторів.

```cpp
#include <iostream>
#include <string>
struct Guard {
    std::string n;
    explicit Guard(std::string s) : n(std::move(s)) { std::cout << "ctor " << n << '\n'; }
    ~Guard() { std::cout << "dtor " << n << '\n'; }
};
int main() {
    Guard a("a");
    {
        Guard b("b");
    }
    Guard c("c");
}

```

**6.** RAII та винятки: деструктор викликається при розкрутці стека.

```cpp
#include <iostream>
#include <stdexcept>
#include <string>
struct Guard {
    std::string n;
    explicit Guard(std::string s) : n(std::move(s)) {}
    ~Guard() { std::cout << "dtor " << n << '\n'; }
};
int main() {
    try {
        Guard g("g");
        throw std::runtime_error("boom");
    } catch (const std::exception& e) {
        std::cout << "caught " << e.what() << '\n';
    }
}

```

**7.** `std::unique_ptr`: єдина власність та `move`.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    auto a = std::make_unique<int>(5);
    auto b = std::move(a);
    std::cout << (a == nullptr) << ' ' << *b << '\n';
}

```

**8.** `std::shared_ptr`: лічильник посилань.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    auto a = std::make_shared<int>(1);
    std::cout << a.use_count();
    {
        auto b = a;
        std::cout << ' ' << a.use_count();
    }
    std::cout << ' ' << a.use_count() << '\n';
}

```

### Рівень 2. Деталі й поведінка

**9.** `weak_ptr` і розрив циклів.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    std::weak_ptr<int> w;
    {
        auto s = std::make_shared<int>(7);
        w = s;
        std::cout << w.expired() << ' ';
    }
    std::cout << w.expired() << '\n';
}

```

**10.** Правило п'яти: копіювання та переміщення об'єкта.

```cpp
#include <iostream>
#include <utility>
struct Tracer {
    Tracer() { std::cout << "default\n"; }
    Tracer(const Tracer&) { std::cout << "copy\n"; }
    Tracer(Tracer&&) noexcept { std::cout << "move\n"; }
};
int main() {
    Tracer a;
    Tracer b = a;
    Tracer c = std::move(a);
}

```

**11.** Шаблон функції та виведення типу.

```cpp
#include <iostream>
#include <string>
template <typename T>
T maxOf(T a, T b) { return a > b ? a : b; }
int main() {
    std::cout << maxOf(3, 7) << ' ' << maxOf(2.5, 1.5) << ' ' << maxOf<std::string>("a", "b") << '\n';
}

```

**12.** `auto`, `decltype` та діапазонний `for`.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    std::vector<int> v{1, 2, 3};
    int sum = 0;
    for (auto x : v) sum += x;
    decltype(sum) twice = sum * 2;
    std::cout << sum << ' ' << twice << '\n';
}

```

**13.** `constexpr`: обчислення під час компіляції.

```cpp
#include <iostream>
constexpr int fact(int n) { return n <= 1 ? 1 : n * fact(n - 1); }
int main() {
    constexpr int f = fact(5);
    static_assert(f == 120);
    std::cout << f << '\n';
}

```

**14.** Лямбди та захоплення: за значенням і за посиланням.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    int x = 1;
    auto byVal = [x]() { return x; };
    auto byRef = [&x]() { return x; };
    x = 10;
    std::cout << byVal() << ' ' << byRef() << '\n';
}

```

**15.** `std::move` не переміщує сам по собі: стан рядка після переміщення.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    std::string a = "hello";
    std::string b = std::move(a);
    std::cout << b << ' ' << a.size() << '\n';
}

```

**16.** Віртуальні функції та поліморфізм.

```cpp
#include <iostream>
#include <memory>
#include <string>
struct Animal { virtual ~Animal() = default; virtual std::string name() const { return "animal"; } };
struct Dog : Animal { std::string name() const override { return "dog"; } };
int main() {
    std::unique_ptr<Animal> a = std::make_unique<Dog>();
    std::cout << a->name() << '\n';
}

```

### Рівень 3. Нюанси та пастки

**17.** Без `virtual`: «зрізання» і статичний виклик.

```cpp
#include <iostream>
struct Base { const char* who() const { return "base"; } };
struct Derived : Base { const char* who() const { return "derived"; } };
int main() {
    Derived d;
    Base* p = &d;
    std::cout << p->who() << '\n';
}

```

**18.** Порядок конструкторів у наслідуванні.

```cpp
#include <iostream>
struct B { B() { std::cout << "B "; } ~B() { std::cout << "~B "; } };
struct D : B { D() { std::cout << "D "; } ~D() { std::cout << "~D\n"; } };
int main() {
    D d;
}

```

**19.** `explicit` та неявні перетворення.

```cpp
#include <iostream>
struct Meters { double v; explicit Meters(double x) : v(x) {} };
int main() {
    Meters m(5);
    std::cout << m.v << '\n';
}

```

**20.** Простори імен та `using`.

```cpp
#include <iostream>
namespace geo { int area(int w, int h) { return w * h; } }
namespace util { int area(int s) { return s * s; } }
int main() {
    std::cout << geo::area(2, 3) << ' ' << util::area(2) << '\n';
}

```

**21.** `std::optional` для відсутнього значення.

```cpp
#include <iostream>
#include <optional>
std::optional<int> find(int x) { if (x > 0) return x * 10; return std::nullopt; }
int main() {
    auto a = find(3);
    auto b = find(-1);
    std::cout << a.value_or(0) << ' ' << b.value_or(0) << ' ' << b.has_value() << '\n';
}

```

**22.** Структуровані прив'язки (C++17).

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    std::pair<int, std::string> p{1, "one"};
    auto [n, s] = p;
    std::cout << n << ' ' << s << '\n';
}

```

**23.** `std::variant` та `std::visit`.

```cpp
#include <iostream>
#include <string>
#include <variant>
int main() {
    std::variant<int, std::string> v = std::string("hi");
    std::visit([](auto&& x) { std::cout << x << '\n'; }, v);
    v = 5;
    std::cout << v.index() << '\n';
}

```

**24.** Виняток і `noexcept`.

```cpp
#include <iostream>
#include <stdexcept>
void f() { throw std::logic_error("bad"); }
int main() {
    try { f(); } catch (const std::logic_error& e) { std::cout << e.what() << '\n'; }
}

```

### Рівень 4. Практика

**25.** Розмір об'єктів і `alignof`.

```cpp
#include <iostream>
struct S { char c; double d; };
int main() {
    std::cout << sizeof(S) << ' ' << alignof(S) << ' ' << sizeof(int*) << '\n';
}

```

**26.** Помилка компіляції: присвоєння `const`.

```cpp
#include <iostream>
int main() {
    const int x = 1;
    x = 2;
}

```

**27.** Помилка компіляції: використання `unique_ptr` копіюванням.

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>
int main() {
    auto a = std::make_unique<int>(1);
    auto b = a;
}

```

**28.** Що таке RAII?

**29.** Чим посилання відрізняється від вказівника?

**30.** Для чого `virtual` деструктор у базовому класі?

### Відповіді

1. `42 3.5 1 s`
2. `true 3.14`
3. `15 15`
4. `1 99 1`
5. Вивід:

   ```text
   ctor a
   ctor b
   dtor b
   ctor c
   dtor c
   dtor a
   ```

6. Вивід:

   ```text
   dtor g
   caught boom
   ```

7. `1 5`
8. `1 2 1`
9. `0 1`
10. Вивід:

   ```text
   default
   copy
   move
   ```

11. `7 2.5 b`
12. `6 12`
13. `120`
14. `1 10`
15. `hello 0`
16. `dog`
17. `base`
18. Вивід:

   ```text
   B D ~D
   ~B 
   ```

19. `5`
20. `6 4`
21. `30 0 0`
22. `1 one`
23. Вивід:

   ```text
   hi
   0
   ```

24. `bad`
25. `16 8 8`
26. Помилка компіляції:

   ```text
   error: cannot assign to variable 'x' with const-qualified type 'const int'
   ```

27. Помилка компіляції:

   ```text
   error: call to implicitly-deleted copy constructor of 'unique_ptr<int>'
   ```

28. Ресурс (пам'ять, файл, м'ютекс) захоплюється в конструкторі об'єкта й звільняється в його деструкторі, тому звільнення відбувається автоматично, навіть при винятках
29. Посилання — псевдонім існуючого об'єкта: має бути ініціалізоване, не може бути `null` і не перепризначається; вказівник може бути null і вказувати на різні об'єкти
30. Щоб `delete` через вказівник на базовий клас викликав деструктор похідного, інакше поведінка не визначена й ресурси течуть
