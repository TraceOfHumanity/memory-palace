const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const fileHandleRead = await fs.open(path.join(__dirname, "test.txt"), "r");
  const fileHandleWrite = await fs.open(path.join(__dirname, "dest.txt"), "w");
  const readStream = fileHandleRead.createReadStream({ highWaterMark: 16 });
  const writeStream = fileHandleWrite.createWriteStream({ highWaterMark: 16 });

  let leftover = ""; // неповне число з кінця попереднього чанка

  readStream.setEncoding("utf-8");

  readStream.on("data", (chunk) => {
    console.log("chunk:   ", JSON.stringify(chunk));

    const text = leftover + chunk;
    const parts = text.split(/\s+/);
    console.log("parts: ", parts);

    // якщо текст не закінчується пробілом — останній фрагмент неповний
    leftover = text.endsWith(" ") ? "" : parts.pop();
    console.log("leftover:", JSON.stringify(leftover));

    const numbers = parts.filter(Boolean).map(Number);
    console.log("numbers: ", numbers);

    for (const n of numbers) {
      if (n % 2 === 0) {
        console.log("writing: ", n);
        if (!writeStream.write(" " + n + " ")) {
          readStream.pause();
        }
      }
    }

    console.log("--------------------------------");
  });

  readStream.on("end", () => {
    // останній залишок, якщо файл не закінчився пробілом
    if (leftover) {
      const n = Number(leftover);
      console.log("last leftover:", JSON.stringify(leftover), "->", n);
      if (n % 2 === 0) {
        writeStream.write(" " + n + " ");
      }
    }
    writeStream.end();
  });

  writeStream.on("drain", () => {
    readStream.resume();
  });

  writeStream.on("finish", async () => {
    await fileHandleRead.close();
    await fileHandleWrite.close();
    console.log("done");
  });

  readStream.on("error", console.error);
  writeStream.on("error", console.error);
})();
