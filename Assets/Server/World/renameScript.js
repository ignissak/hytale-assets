/*
 * Script to fix worldgen based on renames made on Items/Blocks.
 * (a script exists to easily rename Items/Blocks in HytaleAssets/Scripts/renameItems.js)
 *
 * Use --dry-run as an argument to make a dry run
 * Use --log-migration to write the migration to a file
 */

const fs = require("fs");
const path = require("path");

let args = {};
for (var i = process.argv.length - 1; i >= 2; i--) {
  let arg = process.argv[i];
  if (arg.startsWith("--")) {
    arg = arg.substring(2);
    process.argv.splice(i, 1);
    let index = arg.indexOf("=");
    let key = index > 0 ? arg.substring(0, index) : arg;
    let value = index > 0 ? arg.substring(index + 1) : true;
    args[key] = value;
  }
}
console.log(`Args: `);
console.log(args);

const renameFileName = "renames.json";

let renamePaths = process.argv.slice(2);
if (renamePaths.length === 0) renamePaths = [ 'Default/Zones' ];

let wordsToRename;
try {
  wordsToRename = JSON.parse(fs.readFileSync(path.join(__dirname, renameFileName), { encoding: "utf8" }));
}
catch (e) {
  console.log(`Failed to read words to rename from ${renameFileName} file.`);
  console.log(e.message);
  return;
}

console.log(`Renaming...`);
console.log(wordsToRename);

let replaced = {};

for (renamePath of renamePaths) {
  console.log(`Renaming in path ` + renamePath);
  renameFolder(path.join(__dirname, renamePath));
  console.log();
}

function renameFolder(folderPath) {
  if (folderPath.endsWith(".json")) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`Converting ${folderPath}`);

    let itemFile = fs.readFileSync(folderPath, { encoding: "utf8" });

    // Direct migrations
    for (const oldWord in (wordsToRename.DirectMigrations)) {
      const newWord = wordsToRename.DirectMigrations[oldWord];
      if (newWord === "Empty") continue;

      if (args[`log-migration`]) {
        let regexp = new RegExp(oldWord, "g");
        itemFile = itemFile.replace(regexp, function (s) {
          // TODO: This doubles the amount of regexp work
          let result = s.replace(regexp, newWord);
          {
            let r = result;
            if (s.startsWith("\"")) s = s.substring(1);
            if (s.endsWith("\"")) s = s.substring(0, s.length - 1);
            if (r.startsWith("\"")) r = r.substring(1);
            if (r.endsWith("\"")) r = r.substring(0, r.length - 1);
            replaced[s] = r;
          }

          return result;
        });
      } else {
        itemFile = itemFile.replace(new RegExp("\"" + RegExp.escape(oldWord) + "\"", "g"), "\"" + newWord + "\"");
      }
    }

    // Name migrations
    for (const oldWord in (wordsToRename.NameMigrations)) {
      const newWord = wordsToRename.NameMigrations[oldWord];
      if (newWord === "Empty") continue;

      itemFile = itemFile.replace(new RegExp(`${oldWord}"`, "g"), `${newWord}"`);
      itemFile = itemFile.replace(new RegExp(`${oldWord}:`, "g"), `${newWord}:`);
      itemFile = itemFile.replace(new RegExp(`${oldWord}\\|`, "g"), `${newWord}|`);
    }

    if (!args[`dry-run`]) fs.writeFileSync(folderPath, itemFile, { encoding: "utf8" });
    return;
  }

  for (const item of fs.readdirSync(folderPath)) {
    const itemPath = path.join(folderPath, item);

    if (fs.statSync(itemPath).isDirectory()) {
      renameFolder(itemPath);
    } else if (itemPath.endsWith(".json") && item != renameFileName) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`Converting ${itemPath}`);

      let itemFile = fs.readFileSync(itemPath, { encoding: "utf8" });

      // Direct migrations
      for (const oldWord in (wordsToRename.DirectMigrations)) {
        const newWord = wordsToRename.DirectMigrations[oldWord];
        if (newWord === "Empty") continue;

        if (args[`log-migration`]) {
          let regexp = new RegExp(oldWord, "g");
          itemFile = itemFile.replace(regexp, function (s) {
            // TODO: This doubles the amount of regexp work
            let result = s.replace(regexp, newWord);
            {
              let r = result;
              if (s.startsWith("\"")) s = s.substring(1);
              if (s.endsWith("\"")) s = s.substring(0, s.length - 1);
              if (r.startsWith("\"")) r = r.substring(1);
              if (r.endsWith("\"")) r = r.substring(0, r.length - 1);
              replaced[s] = r;
            }

            return result;
          });
        } else {
          itemFile = itemFile.replace(new RegExp("\"" + RegExp.escape(oldWord) + "(\"|\\|)", "g"), "\"" + newWord + "$1");
        }
      }

      // Name migrations
      for (const oldWord in (wordsToRename.NameMigrations)) {
        const newWord = wordsToRename.NameMigrations[oldWord];
        if (newWord === "Empty") continue;

        itemFile = itemFile.replace(new RegExp(`${oldWord}"`, "g"), `${newWord}"`);
        itemFile = itemFile.replace(new RegExp(`${oldWord}:`, "g"), `${newWord}:`);
        itemFile = itemFile.replace(new RegExp(`${oldWord}\\|`, "g"), `${newWord}|`);
      }

      if (!args[`dry-run`]) fs.writeFileSync(itemPath, itemFile, { encoding: "utf8" });
    }
  }
}

let migrationPath = args[`log-migration`];
if (migrationPath) {
  let fileName = path.basename(migrationPath);
  let id = parseInt(fileName.substring(0, fileName.indexOf(".json")));
  fs.writeFileSync(migrationPath,  JSON.stringify({ "Id": id, "DirectMigrations": replaced }, null, 2), { encoding: "utf8" });
  console.log(`Wrote migration to ` + migrationPath);
}

console.log(`\nRenaming finished.`);
