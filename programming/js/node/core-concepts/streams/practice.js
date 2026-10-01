// const fs = require("node:fs/promises");

// // memory: 76,1 MB
// // cpu: 100% (100% of 1 core)
// // time: 12-13 seconds
// (async () => {
//   console.time("write");
//   const fileHandle = await fs.open("test.txt", "w");

//   for (let i = 0; i < 1000000; i++) {
//     await fileHandle.write(` ${i} `);
//   }

//   await fileHandle.close();
//   console.timeEnd("write");
// })();

// ---

// const fs = require("node:fs");

// // memory: 14 MB
// // cpu: 100% (100% of 1 core)
// // time: 2-2.5 seconds
// (async () => {
//   console.time("write");
//   fs.open("test.txt", "w", (err, fd) => {
//     for (let i = 0; i < 1000000; i++) {
//       fs.writeSync(fd, ` ${i} `);
//     }

//     console.timeEnd("write");
//   });
// })();

// ---

const fs = require("node:fs/promises");

// memory: 200mb
// cpu: 100% (100% of 1 core)
// time: 180ms
(async () => {
  console.time("write");
  const fileHandle = await fs.open("test.txt", "w");
  const writeStream = fileHandle.createWriteStream();

  for (let i = 0; i < 1000000; i++) {
    const buffer = Buffer.from(` ${i} `, "utf-8");
    writeStream.write(buffer);
  }

  console.timeEnd("write");
})();
