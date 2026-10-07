const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const fileHandleRead = await fs.open(path.join(__dirname, "test.txt"), "r");
  const fileHandleWrite = await fs.open(path.join(__dirname, "dest.txt"), "w");
  const readStream = fileHandleRead.createReadStream();
  const writeStream = fileHandleWrite.createWriteStream();

  let leftover = "";

  readStream.on("data", (chunk) => {
    const numbers = chunk.toString("utf-8").split("  ");

    if (
      Number(numbers[numbers.length - 2]) + 1 !==
      Number(numbers[numbers.length - 1])
    ) {
      leftover = numbers.pop();
    }

    if (Number(numbers[0]) !== Number(numbers[1]) - 1) {
      if (leftover) numbers[0] = leftover.trim() + numbers[0];
    }

    if (!writeStream.write(chunk)) {
      readStream.pause();
    }
  });

  writeStream.on("drain", () => {
    readStream.resume();
  });
})();
