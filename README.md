# template-sky

An opinionated starter template for vite or rollup with a cli to generate template project.

## Usage

Using npm to initialize a project

```sh
npx @sky-fly/template
```

You can pass one CLI option as the project name, which will be used to decide the folder name where the generated project template will be placed.

```sh
npx @sky-fly/template project
```

You can also pass another CLI option as the package name, which will be used to overwrite the default in the project. If not specified, the project name will be used as the package name.

```sh
npx @sky-fly/template project project
```

Available named CLI options are shown below:

| Name                     | Default | Type                    | Description                                            |
| ------------------------ | ------- | ----------------------- | ------------------------------------------------------ |
| _--template_ _-t_        | -       | `'vue'\|'react'`        | decide the template the project is intended to use     |
| _--package-manager_ _-p_ | -       | `'npm'\|'yarn'\|'pnpm'` | decide the package manager the project is going to use |

## Changelog

[Changelog](CHANGELOG.md)

## Contribution

[Contribution](CONTRIBUTING.md)

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## Code of Conduct

[Code of Conduct](CODE_OF_CONDUCT.md)

## License

[MIT](LICENSE) © skyclouds2001
