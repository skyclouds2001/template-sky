import fs from 'node:fs'
import path from 'node:path'
import kleur from 'kleur'
import type { SimpleGit } from 'simple-git'
import { OVERRIDE_FILE } from './fs'

/**
 * rewrite template files
 * @param root generated template root path
 * @param packageName generated template's package name
 * @param git the initilized git instance
 */
export async function rewrite(root: string, packageName: string, git: SimpleGit) {
  const userName = (await git.getConfig('user.name')).value ?? ''
  const userEmail = (await git.getConfig('user.email')).value ?? ''
  const projectRepo = userName && userEmail ? `https://github.com/${userName}/${packageName}` : ''

  // read package.json file content to get infos and do some edits
  const pkg = JSON.parse(fs.readFileSync(path.resolve(root, 'package.json'), 'utf-8'))

  // cache some fields of package.json
  const _packageName = pkg.name
  const _userName = pkg.author.name
  const _userEmail = pkg.author.email
  const _projectRepo = `https://github.com/${_userName}/${_packageName}`
  const _projectDesc = pkg.description
  const _projectKeywords = pkg.keywords.join(',')

  // overwrite some fields of package.json
  pkg.name = packageName
  pkg.version = '0.0.0'
  pkg.description = ''
  pkg.keywords = []
  pkg.repository.url = `git+${projectRepo}.git`
  pkg.homepage = `${projectRepo}#readme`
  pkg.bugs.url = `${projectRepo}/issues`
  pkg.bugs.email = userEmail
  pkg.author.name = userName
  pkg.author.email = userEmail
  pkg.author.url = `https://${userName}.github.io/`
  pkg.contributors = [userName]

  Object.entries(OVERRIDE_FILE).forEach(([key, files]) => {
    let source: string, target: string
    switch (key) {
      case 'packageName':
        source = _packageName
        target = packageName
        break
      case 'userName':
        source = _userName
        target = userName
        break
      case 'userEmail':
        source = _userEmail
        target = userEmail
        break
      case 'repository':
        source = _projectRepo
        target = projectRepo
        break
      case 'description':
        source = _projectDesc
        target = ''
        break
      case 'keywords':
        source = _projectKeywords
        target = ''
        break
      default:
        throw new Error(`${kleur.red('✖')} Unhandled key "${key}" in OVERRIDE_FILE.`)
    }

    // travel each file that need to update package name
    for (const file of files) {
      try {
        // read file content
        let content = fs.readFileSync(path.resolve(root, file), 'utf-8')

        // overwrite the project name
        content = content.replaceAll(source, target)

        // write file content
        fs.writeFileSync(path.resolve(root, file), content)
      } catch {}
    }
  })

  // override package.json file content
  fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))

  // override .all-contributorsrc file content
  const acs = JSON.parse(fs.readFileSync(path.resolve(root, '.all-contributorsrc'), 'utf-8'))
  acs.projectName = packageName
  acs.projectOwner = userName
  acs.contributors = []
  fs.writeFileSync(path.resolve(root, '.all-contributorsrc'), JSON.stringify(acs, null, 2))
}
