const fs = require("node:fs/promises");
const path = require("node:path");

(async () => {
  const souceFile = await fs.open((path.join(__dirname, "test.txt")), "r");
  const destFile = await fs.open((path.join(__dirname, "dest.txt")), "w");

  const readStream = souceFile.createReadStream();
  const writeStream = destFile.createWriteStream();

  readStream.pipe(writeStream);
})();
