const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const fileHandleRead = await fs.open(path.join(__dirname, "test.txt"), "r");
  const fileHandleWrite = await fs.open(path.join(__dirname, "dest.txt"), "w");
  const readStream = fileHandleRead.createReadStream({
    highWaterMark: 64 * 1024,
  });
  const writeStream = fileHandleWrite.createWriteStream();

  readStream.on("data", (chunk) => {
    const numbers = chunk.toString("utf-8").split("  ");
    console.log(numbers);
    if (!writeStream.write(chunk)) {
      readStream.pause();
    }
  });

  writeStream.on("drain", () => {
    readStream.resume();
  });
})();
