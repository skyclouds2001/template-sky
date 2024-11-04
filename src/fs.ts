import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * files or dictionaries that should ignore in check and execute
 */
export const IGNORE_CHECK = ['.git', '.vscode', '.idea', '.fleet']

/**
 * files or dictionaries that should ignore in copy
 */
export const IGNORE_COPY = ['.git', 'node_modules', 'dist', '_']

/**
 * check if the target dictionary empty, will ignore those files in ignore list
 * @param dir target dictionary
 * @returns check result
 */
export async function isEmptyDir(dir: string): Promise<boolean> {
  const files = await fs.readdir(dir)

  return files.length === 0 || files.every((file) => IGNORE_CHECK.includes(file))
}

/**
 * clear the target dictionary to empty, will ignore those files in ignore list
 * @param dir target dictionary
 */
export async function clearDir(dir: string): Promise<void> {
  const files = await fs.readdir(dir)

  for (const file of files) {
    if (IGNORE_CHECK.includes(file)) {
      continue
    }

    await fs.rmdir(path.resolve(dir, file), {
      recursive: true,
    })
  }
}

/**
 * copy the file from the source to the target, will ignore those files in ignore list and existed in the target
 * @param src source path
 * @param dest target path
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  const file = await fs.stat(src)

  if (file.isDirectory()) {
    await fs.mkdir(dest, {
      recursive: true,
    })

    for (const file of await fs.readdir(src)) {
      if (IGNORE_COPY.includes(file)) {
        continue
      }

      await copyDir(path.resolve(src, file), path.resolve(dest, file))
    }
  } else {
    await fs.copyFile(src, dest, fs.constants.COPYFILE_FICLONE_FORCE)
  }
}
