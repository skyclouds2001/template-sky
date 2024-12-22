import fs from 'node:fs/promises'
import path from 'node:path'
import url from 'node:url'
import kleur from 'kleur'
import minimist from 'minimist'
import prompts from 'prompts'
import { simpleGit } from 'simple-git'
import { clearDir, copyDirOrFile, isEmptyDir } from './fs'
import { PackageManager, getPackageManager, isValidPackageManagerName } from './package'
import { rewrite } from './rewrite'
import { isValidTemplateName, Template } from './template'
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
          choices: Object.values(Template).map((template) => ({
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
    try {
      const shouldNotOverwrite = await isEmptyDir(root)

      if (!shouldNotOverwrite) {
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
          await clearDir(root)
        } else {
          throw new Error(`${kleur.red('✖')} Operation cancelled!`)
        }
      }
    } catch {
      // create target dictionary if it doesn't existed
      await fs.mkdir(root, { recursive: true })
    }

    // get the template dictionary name
    const templateDir = path.resolve(url.fileURLToPath(import.meta.url), '../..', Object.values(Template).find((f) => f.name === template)!.template)

    // copy template project to target
    await copyDirOrFile(templateDir, root)

    // init git instance
    const git = simpleGit({
      baseDir: root,
    })

    // init project git config
    await git.init()

    // rewrite some project files
    await rewrite(root, packageName, git)

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
