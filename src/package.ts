/**
 * major package managers
 */
export class PackageManager {
  static readonly PNPM = 'pnpm'
  static readonly YARN = 'yarn'
  static readonly NPM = 'npm'
}

/**
 * get the package manager name of current execute process
 * @param userAgent userAgent of the
 * @returns the name of the package manager
 */
export function getPackageManager(userAgent: string): PackageManager {
  let pkg

  if (userAgent.includes('pnpm')) {
    pkg = PackageManager.PNPM
  } else if (userAgent.includes('yarn')) {
    pkg = PackageManager.YARN
  } else if (userAgent.includes('npm')) {
    pkg = PackageManager.NPM
  } else {
    pkg = PackageManager.NPM
  }

  return pkg
}

/**
 * validate if a package manager name is valid and supported one
 * @param name package manager name
 * @returns validation result
 */
export function isValidPackageManagerName(name: string): boolean {
  return Object.values(PackageManager).includes(name.toLowerCase() as PackageManager)
}
