import fs from 'node:fs/promises'
import path from 'node:path'
import kleur from 'kleur'
import type { SimpleGit } from 'simple-git'

/**
 * files that should override project information (exclude package.json as it requires additional tasks to execute and README.md as it is not intended to edit)
 */
export const OVERRIDE_FILE = {
  repository: ['.github/workflows/release.yml'],
  userEmail: ['CODE_OF_CONDUCT.md', 'Dockerfile', 'index.html', 'SECURITY.md'],
  description: ['index.html', 'public/site.webmanifest'],
  keywords: ['index.html'],
  userName: ['Dockerfile', 'index.html', 'LICENSE', '.changeset/config.json', '.github/dependabot.yml', '.github/ISSUE_TEMPLATE/bug-report.md', '.github/ISSUE_TEMPLATE/feature-request.md', '.github/ISSUE_TEMPLATE/other.md', '.github/workflows/ci.yml', '.github/workflows/labeler.yml', '.github/workflows/new-contributor.yml', '.github/workflows/project-automate.yml', '.github/workflows/release.yml', '.github/workflows/stale.yml'],
  packageName: ['CHANGELOG.md', 'CONTRIBUTING.md', 'index.html', '.changeset/config.json', '.github/workflows/ci.yml', '.github/workflows/labeler.yml', '.github/workflows/new-contributor.yml', '.github/workflows/project-automate.yml', '.github/workflows/release.yml', '.github/workflows/stale.yml', 'public/site.webmanifest', 'tests/e2e/index.spec.ts'],
}

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
  const pkg = JSON.parse(
    await fs.readFile(path.resolve(root, 'package.json'), {
      encoding: 'utf8',
    })
  )

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

  // override package.json file content
  await fs.writeFile(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2), {
    encoding: 'utf-8',
    flush: true,
  })

  await Promise.allSettled(
    Object.entries(OVERRIDE_FILE).map(async ([key, files]) => {
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
          let content = await fs.readFile(path.resolve(root, file), {
            encoding: 'utf8',
          })

          // overwrite the project name
          content = content.replaceAll(source, target)

          // write file content
          await fs.writeFile(path.resolve(root, file), content, {
            encoding: 'utf-8',
            flush: true,
          })
        } catch {}
      }
    })
  )

  // override .all-contributorsrc file content
  const acs = JSON.parse(
    await fs.readFile(path.resolve(root, '.all-contributorsrc'), {
      encoding: 'utf8',
    })
  )
  acs.projectName = packageName
  acs.projectOwner = userName
  acs.contributors = []
  await fs.writeFile(path.resolve(root, '.all-contributorsrc'), JSON.stringify(acs, null, 2), {
    encoding: 'utf-8',
    flush: true,
  })
}
