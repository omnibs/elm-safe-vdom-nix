/*

This file copies elm-kernel-replacements/elm-stuff/ into elm-home/elm-stuff/.

*/

import * as path from "node:path";
import * as fs from "node:fs";

// This will always be called before `elm make`, from the same directory.
// It's required `elm make` runs from the `elm.json` directory.
const ROOT = process.env.PWD;

if (process.argv.length !== 3) {
  console.error('Usage: node replace-kernel-packages.mjs path/to/elm-package-patches');
  process.exit(1);
}
if (!fs.existsSync(process.argv[2])) {
  console.error(`Error: Elm package patches directory "${process.argv[2]}" does not exist.`);
  process.exit(1);
}

const PATCH_DIR = process.argv[2];

if (!process.env.ELM_HOME) {
  console.error(
    "Error: ELM_HOME environment variable is not set. This script must be run with ELM_HOME set to the elm home directory you want to patch."
  );
  process.exit(1);
}

if (!fs.existsSync(process.env.ELM_HOME)) {
  fs.mkdirSync(process.env.ELM_HOME, { recursive: true });
}

const ELM_HOME = process.env.ELM_HOME;

const ELM_HOME_PACKAGES = path.join(ELM_HOME, "0.19.1", "packages");

// The parts of elm-stuff/ that the Elm compiler actually cares about.
// Excludes elm-test and elm-review stuff.
const ELM_STUFF = path.join(ROOT, "elm-stuff", "0.19.1");

/**
 * @returns {void}
 */
export function replaceKernelPackages() {
  let elmJsonDependencies;
  try {
    elmJsonDependencies = parseElmJsonDependencies(path.join(ROOT, "elm.json"));
  } catch (error) {
    throw new Error(
      `Failed to parse elm.json: ${error instanceof Error ? error.message : String(error)
      }`
    );
  }

  let alreadyUpToDate = true;

  for (const user of readDir(PATCH_DIR)) {
    for (const package_ of readDir(user.path)) {
      const versions = readDir(package_.path);

      if (versions.length !== 1) {
        throw new Error(
          `Replace Kernel packages: Found more than one version!\n\nVersions: ${versions
            .map((version) => version.name)
            .join(", ")}\n\nIn: ${package_.path}`
        );
      }

      const [version] = versions;
      const packageIdentifier = `${user.name}/${package_.name}`;
      const elmJsonVersion = elmJsonDependencies[packageIdentifier];

      if (elmJsonVersion !== version.name) {
        throw new Error(
          `Replace Kernel packages: Expected version ${version.name
          } for ${packageIdentifier} in elm.json, but got: ${String(
            elmJsonVersion
          )}`
        );
      }

      const destinationDir = path.join(
        ELM_HOME_PACKAGES,
        user.name,
        package_.name,
        version.name
      );

      // All packages in elm-kernel-replacements/ have a source.txt file showing
      // where the code was taken from. We use that to see if elm-home/ is
      // already patched.
      const sourceFileName = "source.txt";
      if (
        !fs.existsSync(path.join(destinationDir, sourceFileName)) ||
        fs.readFileSync(path.join(destinationDir, sourceFileName), "utf-8") !==
        fs.readFileSync(path.join(version.path, sourceFileName), "utf-8")
      ) {
        alreadyUpToDate = false;
        // Force Elm to use the patched files we’ll copy soon:
        fs.rmSync(path.join(destinationDir, "artifacts.dat"), {
          force: true,
        });
      }
    }
  }

  // This file contains JavaScript code from Elm packages.
  // If it exists, but doesn’t contain code from our elm/virtual-dom
  // package replacement, we must have compiled without the replacements
  // some time. Even if elm-home/ is up-to-date, that won’t be used because
  // of this cache file.
  const oDat = path.join(ELM_STUFF, "o.dat");
  if (
    alreadyUpToDate &&
    fs.existsSync(oDat) &&
    // This is specific to lydell/virtual-dom: Change as needed if you patch other things.
    !fs.readFileSync(oDat, "utf-8").includes("_VirtualDom_createTNode")
  ) {
    alreadyUpToDate = false;
  }

  if (!alreadyUpToDate) {
    fs.cpSync(PATCH_DIR, ELM_HOME_PACKAGES, { recursive: true });
    // Force Elm to recompile everything:
    fs.rmSync(ELM_STUFF, { recursive: true, force: true });
  }
}

/**
 * @param elmJsonPath {string}
 * @returns {Record<string, unknown>}
 */
function parseElmJsonDependencies(elmJsonPath) {
  const elmJson = JSON.parse(fs.readFileSync(elmJsonPath, "utf-8"));
  if (typeof elmJson !== "object" || elmJson === null) {
    throw new Error(`elm.json is not an object.`);
  }
  if (
    typeof elmJson.dependencies !== "object" ||
    elmJson.dependencies === null
  ) {
    throw new Error(`elm.json "dependencies" field is not an object.`);
  }
  if (
    typeof elmJson.dependencies.direct !== "object" ||
    elmJson.dependencies.direct === null
  ) {
    throw new Error(`elm.json "dependencies.direct" field is not an object.`);
  }
  if (
    typeof elmJson.dependencies.indirect !== "object" ||
    elmJson.dependencies.indirect === null
  ) {
    throw new Error(`elm.json "dependencies.indirect" field is not an object.`);
  }
  return { ...elmJson.dependencies.direct, ...elmJson.dependencies.indirect };
}

/**
 * @param dir {string}
 * @returns {Array<{ name: string, path: string }>}
 */
function readDir(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => !name.startsWith(".")) // Ignore files like `.DS_Store`.
    .map((name) => ({ name, path: path.join(dir, name) }));
}