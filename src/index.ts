import kleur from 'kleur'
import minimist from 'minimist'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import prompts from 'prompts'
import { simpleGit } from 'simple-git'
import { clearDir, copy, isEmptyDir, OVERRIDE_FILE } from './fs'
import { PackageManager, getPackageManager, isValidPackageManagerName } from './package'
import { isValidTemplateName, templates, type Template } from './template'
import { isValidPackageName, isValidProjectName } from './validate'

const DEFAULT_NAME = 'template-sky'

const logger = global.console

const cwd = process.cwd()

const args = minimist<{
  template?: string
  'package-manager'?: string
}>(process.argv.slice(2), {
  string: ['_', 'template', 'package-manager'],
  alias: {
    template: 't',
    'package-manager': 'p',
  },
})

const cli = async () => {
  try {
    const argvProjectName = typeof args._[0] === 'string' && isValidProjectName(args._[0]) ? args._.at(0) : null
    const argvPackageName = typeof args._[1] === 'string' && isValidPackageName(args._[1]) ? args._.at(1) : null
    const argvTemplate = typeof args.template === 'string' && isValidTemplateName(args.template) ? args.template : null
    const argvPackageManager = typeof args['package-manager'] === 'string' && isValidPackageManagerName(args['package-manager']) ? args['package-manager'] : null

    let dir = DEFAULT_NAME
    const {
      projectName = argvProjectName,
      packageName = argvPackageName,
      template = argvTemplate,
      packageManager = argvPackageManager,
    } = await prompts(
      [
        {
          type: () => (argvProjectName != null ? null : 'text'),
          name: 'projectName',
          message: 'Project name:',
          initial: DEFAULT_NAME,
          validate: (name) => isValidProjectName(name),
          onState: (data) => {
            dir = data.value
          },
        },
        {
          type: () => (argvPackageName != null ? null : 'text'),
          name: 'packageName',
          message: 'Package name:',
          initial: () => (isValidPackageName(dir) ? dir : DEFAULT_NAME),
          validate: (name) => isValidPackageName(name),
        },
        {
          type: () => (argvTemplate != null ? null : 'select'),
          name: 'template',
          message: 'Select a template:',
          initial: 0,
          choices: templates.map((template) => ({
            title: template.color(template.name),
            value: template.name,
          })),
        },
        {
          type: () => (argvPackageManager != null ? null : 'select'),
          name: 'packageManager',
          message: 'Select a package manager:',
          initial: Math.max(
            Object.values(PackageManager).findIndex((v) => v === getPackageManager(process.env.npm_config_user_agent ?? '')),
            0
          ),
          choices: Object.values(PackageManager).map((packageManager) => ({
            title: packageManager,
            value: packageManager,
          })),
        },
      ],
      {
        onCancel: () => {
          throw new Error(`${kleur.red('✖')} Operation cancelled!`)
        },
      }
    )

    // generate the target dictionary path
    const root = path.join(cwd, projectName)

    // check if the target dictionary is not an empty dictionary
    // if so, prompt to let user decide whether overwrite the target dictionary
    // if user decide to overwrite, clear the target dictionary; if not, exit the process
    if (fs.existsSync(root) && !isEmptyDir(root)) {
      const { overwrite } = await prompts(
        [
          {
            type: 'confirm',
            name: 'overwrite',
            message: `${root === __dirname ? 'Current' : 'Target'} dictionary is not empty, remove existing files and continue?`,
          },
        ],
        {
          onCancel: () => {
            throw new Error(`${kleur.red('✖')} Operation cancelled!`)
          },
        }
      )

      if (overwrite as boolean) {
        clearDir(root)
      } else {
        throw new Error(`${kleur.red('✖')} Operation cancelled!`)
      }
    }

    // create target dictionary if it doesn't existed
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root)
    }

    // get the template dictionary name
    const templateDir = path.resolve(url.fileURLToPath(import.meta.url), '../..', (templates.find((f) => f.name === template) as Template).template)

    // copy template project to target
    copy(templateDir, root)

    // init git instance
    const git = simpleGit({
      baseDir: root,
    })

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
        // read file content
        let content = fs.readFileSync(path.resolve(root, file), 'utf-8')

        // overwrite the project name
        content = content.replaceAll(source, target)

        // write file content
        fs.writeFileSync(path.resolve(root, file), content)
      }
    })

    // init project git config
    await git.init()

    // override package.json file content
    fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))

    // override .all-contributorsrc file content
    const acs = JSON.parse(fs.readFileSync(path.resolve(root, '.all-contributorsrc'), 'utf-8'))
    acs.projectName = packageName
    acs.projectOwner = userName
    acs.contributors = []
    fs.writeFileSync(path.resolve(root, '.all-contributorsrc'), JSON.stringify(acs, null, 2))

    // print prompt message
    logger.log()
    logger.log('Done.')
    logger.log()
    logger.log('Now run:')
    if (cwd !== root) {
      logger.log(`  cd ${projectName}`)
    }
    switch (packageManager) {
      case PackageManager.PNPM:
        logger.log('  pnpm install')
        logger.log('  pnpm dev')
        break
      case PackageManager.YARN:
        logger.log('  yarn')
        logger.log('  yarn dev')
        break
      case PackageManager.NPM:
        logger.log('  npm install')
        logger.log('  npm run dev')
        break
    }
    logger.log()
  } catch (error) {
    if (error instanceof Error) {
      logger.error(error.message)
    } else {
      logger.error(error)
    }
  }
}

cli()
