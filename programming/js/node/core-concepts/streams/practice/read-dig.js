const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const fileHandleRead = await fs.open(path.join(__dirname, "test.txt"), "r");
  const fileHandleWrite = await fs.open(path.join(__dirname, "dest.txt"), "w");
  const readStream = fileHandleRead.createReadStream({ highWaterMark: 16 });
  const writeStream = fileHandleWrite.createWriteStream({ highWaterMark: 48 });

  let leftover = "";

  readStream.setEncoding("utf-8");
  readStream.on("data", (chunk) => {
    console.log("chunk: ", chunk);
    const numbers = chunk.split("  ");
    console.log("numbers: ", numbers);
    console.log("--------------------------------");
    
    if (Number(numbers[0]) !== Number(numbers[1]) - 1) {
      if (leftover) numbers[0] = leftover.trim() + numbers[0];
    }
    if (
      Number(numbers[numbers.length - 2]) + 1 !==
      Number(numbers[numbers.length - 1])
    ) {
      leftover = numbers.pop();
    }


    numbers.forEach((number) => {
      let n = Number(number);
      console.log("n: ", n);
      if (n % 2 === 0) {
        console.log("writing: ", n);
        if (!writeStream.write(" " + n + " ")) {
          readStream.pause();
        }
      }
    });
  });

  writeStream.on("drain", () => {
    readStream.resume();
  });
})();
