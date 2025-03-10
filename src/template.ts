import kleur from 'kleur'

/**
 * templates enum
 */
export const Template = {
  'vite-vue': {
    name: 'vite-vue',
    template: 'vite-vue-template-sky',
    color: kleur.green,
  },

  'vite-react': {
    name: 'vite-react',
    template: 'vite-react-template-sky',
    color: kleur.blue,
  },

  rollup: {
    name: 'rollup',
    template: 'rollup-template-sky',
    color: kleur.magenta,
  },
} as const

/**
 * validate if a template name is valid and supported one
 * @param name package manager name
 * @returns validation result
 */
export function isValidTemplateName(name: string): boolean {
  return Object.values(Template).some((template) => template.name === name.toLowerCase())
}
