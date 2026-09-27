// ==========================================================================
// UNDERSTANDING STREAMS — pipe() ТА pipeline() ДЕТАЛЬНО
// ==========================================================================

const fs = require("fs");
const fsPromises = require("fs/promises");
const { pipeline } = require("stream/promises"); // Promise-версія pipeline (розділ 4)
const os = require("os");
const path = require("path");

async function main() {
  const srcPath = path.join(os.tmpdir(), "streams-pipe-src.txt");
  const destPath = path.join(os.tmpdir(), "streams-pipe-dest.txt");
  await fsPromises.writeFile(srcPath, "дані для копіювання\n".repeat(5000));


  // ========================================================================
  // 1. pipe() — З'ЄДНАННЯ Readable → Writable "В ОДИН РЯДОК"
  // ========================================================================

  // readable.pipe(writable) РОБИТЬ АВТОМАТИЧНО ВСЕ ТЕ, ЩО ДОВЕЛОСЬ
  // БИ ПИСАТИ ВРУЧНУ В 03-writable-streams.js, розділ 3 (стежити за
  // write()/"drain", ПРИЗУПИНЯТИ Readable, коли Writable "не встигає"):

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(srcPath);
    const writeStream = fs.createWriteStream(destPath);

    readStream.pipe(writeStream); // ОДИН РЯДОК замінює ВЕСЬ ручний backpressure-цикл

    writeStream.on("finish", () => {
      console.log("pipe() завершив копіювання");
      resolve();
    });
    readStream.on("error", reject);
    writeStream.on("error", reject);
  });

  const copiedContent = await fsPromises.readFile(destPath, "utf-8");
  const originalContent = await fsPromises.readFile(srcPath, "utf-8");
  console.log("Вміст ідентичний:", copiedContent === originalContent);


  // ========================================================================
  // 2. ЧОМУ pipe() САМ ПО СОБІ "НЕДОСКОНАЛИЙ" — ПРОБЛЕМА З ПОМИЛКАМИ
  // ========================================================================

  // ГОЛОВНИЙ НЕДОЛІК pipe(): ЯКЩО ПІД ЧАС КОПІЮВАННЯ СТАЄТЬСЯ
  // ПОМИЛКА В ОДНОМУ ЗІ STREAMS, pipe() НЕ АВТОМАТИЧНО "ЗАКРИВАЄ"
  // ІНШИЙ — ТРЕБА ВРУЧНУ ПІДПИСУВАТИСЬ НА "error" НА КОЖНОМУ
  // stream'і ОКРЕМО (ЯК ПОКАЗАНО ВИЩЕ, readStream.on("error", ...) І
  // writeStream.on("error", ...) — ЗАБУТИ ОДИН З НИХ ЛЕГКО, І САМЕ
  // ЦЕ ЧАСТО ПРИЗВОДИТЬ ДО "ПРОТІКАЮЧИХ" (leaked) ФАЙЛОВИХ
  // ДЕСКРИПТОРІВ, ЯКЩО ОДИН STREAM ЗАВЕРШИВСЯ З ПОМИЛКОЮ, А ІНШИЙ
  // ЗАЛИШИВСЯ ВІДКРИТИМ (детально ВИТІК ДЕСКРИПТОРІВ —
  // node/core-concepts/file-system/03-file-handles.md, розділ 5).


  // ========================================================================
  // 3. pipeline() — РЕКОМЕНДОВАНА, СУЧАСНА АЛЬТЕРНАТИВА pipe()
  // ========================================================================

  // pipeline() (з "stream" АБО "stream/promises") РОБИТЬ ТЕ САМЕ,
  // ЩО Й pipe(), АЛЕ ДОДАТКОВО:
  //   - АВТОМАТИЧНО "ЗАКРИВАЄ" (destroy) УСІ stream'и в ЛАНЦЮЖКУ,
  //     ЯКЩО БУДЬ-ДЕ СТАЛАСЯ ПОМИЛКА (жодних "протікаючих" дескрипторів);
  //   - ДОЗВОЛЯЄ З'ЄДНАТИ БІЛЬШЕ ДВОХ stream'ів ОДРАЗУ (Readable →
  //     Transform → Transform → Writable — детально Transform —
  //     05-duplex-and-transform.js);
  //   - ДАЄ ОДИН, ЄДИНИЙ callback/Promise ДЛЯ ВСЬОГО ЛАНЦЮЖКА
  //     ЗАМІСТЬ ОКРЕМОГО "error" НА КОЖНОМУ stream'і:

  const pipelineDestPath = path.join(os.tmpdir(), "streams-pipeline-dest.txt");

  await pipeline(
    fs.createReadStream(srcPath),
    fs.createWriteStream(pipelineDestPath),
  ); // await ЧЕКАЄ ЗАВЕРШЕННЯ ВСЬОГО ЛАНЦЮЖКА, КИДАЄ ПОМИЛКУ, ЯКЩО ЩОСЬ ПІШЛО НЕ ТАК

  console.log("pipeline() завершив копіювання успішно");


  // ========================================================================
  // 4. pipeline() ОБРОБЛЯЄ ПОМИЛКУ АВТОМАТИЧНО — ДЕМОНСТРАЦІЯ
  // ========================================================================

  try {
    await pipeline(
      fs.createReadStream(path.join(os.tmpdir(), "no-such-source-file.txt")), // джерела НЕМАЄ!
      fs.createWriteStream(path.join(os.tmpdir(), "streams-pipeline-broken-dest.txt")),
    );
  } catch (err) {
    console.log("pipeline() ОДРАЗУ обробив помилку:", err.code); // "ENOENT" —
    // і, ВАЖЛИВО, writeStream ТЕЖ БУВ КОРЕКТНО ЗАКРИТИЙ АВТОМАТИЧНО,
    // а НЕ ЗАЛИШИВСЯ "ВІСІТИ" відкритим (детально ЧОМУ ЦЕ ВАЖЛИВО —
    // розділ 2 вище)
  }


  // ========================================================================
  // 5. ЯК pipe()/pipeline() "ВСЕРЕДИНІ" ВИРІШУЮТЬ BACKPRESSURE
  // ========================================================================

  // КОЖЕН РАЗ, КОЛИ writable.write(chunk) ПОВЕРТАЄ false (детально
  // 03-writable-streams.js, розділ 2), pipe()/pipeline() САМІ
  // ВИКЛИКАЮТЬ readable.pause() — ЗУПИНЯЮЧИ ПОДАЛЬШЕ НАДХОДЖЕННЯ
  // ДАНИХ. КОЛИ writable ВИПУСКАЄ ПОДІЮ "drain", ВОНИ САМІ
  // ВИКЛИКАЮТЬ readable.resume() — ВІДНОВЛЮЮЧИ ПОТІК. САМЕ ЦЕЙ
  // АВТОМАТИЧНИЙ ЦИКЛ pause()/resume() ЗАМІНЮЄ РУЧНИЙ КОД ІЗ
  // 03-writable-streams.js, розділ 3 — ТОЙ САМИЙ ПАТЕРН, ЩО
  // ВИКОРИСТОВУЄТЬСЯ В ПРАКТИЧНОМУ ПРИКЛАДІ ЧИТАННЯ ВЕЛИКОГО ФАЙЛУ
  // (колишній node/streams/readBig, видалений з репозиторію — лишився в git-історії) — ТАМ readStream.pause()
  // ВИКЛИКАЄТЬСЯ ВРУЧНУ, КОЛИ writeStream.write() ПОВЕРТАЄ false,
  // САМЕ ТОМУ ЩО ТАМ НЕ ВИКОРИСТАНО pipe()/pipeline()).


  // ========================================================================
  // 6. ЩЕ ОДИН СПОСІБ: STREAM ЯК ASYNC ITERABLE + pipeline
  // ========================================================================

  // pipeline() (з "stream/promises") ТАКОЖ ПРИЙМАЄ ЗВИЧАЙНІ
  // async-функції/генератори МІЖ Readable і Writable — ЦЕ, ПО СУТІ,
  // "ІНЛАЙН Transform" БЕЗ СТВОРЕННЯ ОКРЕМОГО КЛАСУ (детально
  // "СПРАВЖНІ" Transform-класи — 05-duplex-and-transform.js):

  const uppercaseDestPath = path.join(os.tmpdir(), "streams-uppercase-dest.txt");

  await pipeline(
    fs.createReadStream(srcPath, { encoding: "utf-8" }),
    async function* upperCaseTransform(source) {
      for await (const chunk of source) {
        yield chunk.toUpperCase(); // ПЕРЕТВОРЮЄМО КОЖЕН chunk "НА ЛЬОТУ"
      }
    },
    fs.createWriteStream(uppercaseDestPath),
  );

  const uppercaseResult = await fsPromises.readFile(uppercaseDestPath, "utf-8");
  console.log("Перші 30 символів у верхньому регістрі:", uppercaseResult.slice(0, 30));


  // ========================================================================
  // ПРИБИРАННЯ
  // ========================================================================
  await fsPromises.rm(srcPath, { force: true });
  await fsPromises.rm(destPath, { force: true });
  await fsPromises.rm(pipelineDestPath, { force: true });
  await fsPromises.rm(uppercaseDestPath, { force: true });
}

main().catch((err) => console.error("Помилка в демонстрації:", err));


// ==========================================================================
// ПІДСУМОК
// ==========================================================================
// - readable.pipe(writable) АВТОМАТИЧНО ВИРІШУЄ backpressure (сам
//   викликає pause()/resume() Readable, залежно від того, що
//   повертає write() Writable) — замінює ГРОМІЗДКИЙ ручний код
// - ГОЛОВНИЙ НЕДОЛІК pipe(): ПОМИЛКИ ТРЕБА ЛОВИТИ ОКРЕМО НА
//   КОЖНОМУ stream'і — забутий обробник "error" легко призводить
//   до "протікаючих" файлових дескрипторів
// - pipeline() (stream/promises) — РЕКОМЕНДОВАНА, СУЧАСНА
//   альтернатива: ОДИН await/callback на ВЕСЬ ланцюжок, АВТОМАТИЧНЕ
//   закриття УСІХ streams при будь-якій помилці, ПІДТРИМКА
//   БІЛЬШЕ ДВОХ streams (включно з Transform-функціями/генераторами
//   прямо "інлайн", без окремого класу)
// - практичний приклад читання великого файлу
//   (колишній node/streams/readBig, видалений з репозиторію — лишився в git-історії) РУЧНИМИ pause()/resume() РОБИВ
//   САМЕ ТЕ, ЩО pipe()/pipeline() РОБЛЯТЬ АВТОМАТИЧНО "ПІД КАПОТОМ"