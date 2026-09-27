// // promise api
// const fs = require("fs/promises");

// (async () => {
//   try {
//     await fs.copyFile("file.txt", "file-copy.txt");
//   } catch (error) {
//     console.log(error);
//   }
// })();

// ---

// // callback api
// const fs = require("fs");

// fs.copyFile("file.txt", "file-copy.txt", (err) => {
//   if (err) {
//     console.log(err);
//   }
// });

// ---

// // synchronous api
// const fs = require("fs");

// fs.copyFileSync("file.txt", "file-copy.txt");

// ---

const fs = require("fs/promises");
const { Buffer } = require("buffer");

(async () => {
  const commandFileHandler = await fs.open("./commands.txt", "r");

  const commands = {
    create: "create the file",
    delete: "delete the file",
    rename: "rename the file",
    addToFile: "add to the file",
  };

  const createFile = async (path) => {
    try {
      const existingFile = await fs.open(path, "r");
      existingFile.close();
      return console.log(`File ${path} already exists`);
    } catch (error) {
      const newFile = await fs.open(path, "w");
      console.log(`File ${path} created`);
      newFile.close();
    }
  };

  const deleteFile = async (path) => {
    console.log(`Deleting file ${path}`);
  };

  const renameFile = async (oldPath, newPath) => {
    console.log(`Renaming file ${oldPath} to ${newPath}`);
  };

  const addToFile = async (path, content) => {
    console.log(`Adding content to file ${path}: ${content}`);
  };

  commandFileHandler.on("change", async () => {
    const bufferSize = (await commandFileHandler.stat()).size;
    const buffer = Buffer.alloc(bufferSize);
    const offset = 0;
    const length = bufferSize;
    const position = 0;

    await commandFileHandler.read(buffer, offset, length, position);
    // console.log(buffer.toString());
    const command = buffer.toString("utf-8");

    if (command.includes(commands.create)) {
      const path = command.substring(commands.create.length + 1);
      createFile(path);
    }
    if (command.includes(commands.delete)) {
      const path = command.substring(commands.delete.length + 1);
      deleteFile(path);
    }
    if (command.includes(commands.rename)) {
      const [oldPath, newPath] = command
        .substring(commands.rename.length + 1)
        .split(" to ");
      console.log(oldPath, newPath);
      renameFile(oldPath.trim(), newPath.trim());
    }
    if (command.includes(commands.addToFile)) {
      const [path, content] = command
        .substring(commands.addToFile.length + 1)
        .split(" content: ");
      addToFile(path.trim(), content.trim());
    }
  });

  const watcher = await fs.watch("./commands.txt");
  for await (const event of watcher) {
    if (event.eventType === "change") {
      commandFileHandler.emit("change");
    }
  }
  await commandFileHandler.close();
})();
