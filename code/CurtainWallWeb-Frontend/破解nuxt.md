1.在Nuxt项目中安装Nuxt Ui和NuxtUiPro

```bash
pnpm install @nuxt/uipnpm install @nuxt/ui-pro
```

2.打开node_modules/@nuxt/ui-pro/modules/pro/index.ts将全部代码替换为如下代码

```js
import { consola } from 'consola'
import { colors } from 'consola/utils'
import { createResolver, defineNuxtModule, addImportsDir, hasNuxtModule, addComponentsDir, addPlugin } from '@nuxt/kit'
import { defu } from 'defu'
import pkg from '../../package.json'

export interface ModuleOptions {
  routerOptions?: boolean
  content?: boolean
  customScrollbars?: boolean
}

export default defineNuxtModule({
  meta: {
    name: 'ui-pro',
    configKey: 'uiPro',
    compatibility: {
      nuxt: '^3.10.0'
    }
  },
  defaults: {
    routerOptions: undefined as boolean | undefined,
    content: false,
    customScrollbars: true
  },
  setup (options, nuxt) {
    const resolver = createResolver(import.meta.url)

    if (options.routerOptions || options.routerOptions === undefined) {
      nuxt.hook('pages:routerOptions', ({ files }: { files: Array<any> }) => {
        const customRouterOptions = files.find(file => /\/app\/router\.options\.(ts|js)$/.exec(file.path))

        if (options.routerOptions === undefined && customRouterOptions) {
          console.warn(`You seem to have a custom router.options file \`${customRouterOptions.path}\`\nThe scrollBehavior will be overriden with ui-pro own router.options unless you set \`uiPro: { routerOptions: false }\` in your nuxt.config\nSet \`uiPro: { routerOptions: true }\` to disable this warning`)
        }

        files.push({
          path: resolver.resolve('runtime/app/router.options.ts'),
          optional: true
        })
      })
    }

    if (options.customScrollbars) {
      addPlugin({ src: resolver.resolve('runtime/plugins/scrollbars.client.ts') })
      nuxt.options.css.push(resolver.resolve('runtime/assets/css/scrollbars.css'))
    }

    if (hasNuxtModule('@nuxt/content') || options.content) {
      addImportsDir(resolver.resolve('runtime/utils'))

      addComponentsDir({ path: resolver.resolve('runtime/components/global'), global: true, prefix: '', pathPrefix: false })
      addComponentsDir({ path: resolver.resolve('runtime/components/content'), prefix: 'U', pathPrefix: false })
      addComponentsDir({ path: resolver.resolve('runtime/components/docs'), prefix: 'U', pathPrefix: false })

      nuxt.options.content = defu(nuxt.options.content, {
        highlight: {
          theme: {
            light: 'material-theme-lighter',
            default: 'material-theme',
            dark: 'material-theme-palenight'
          },
          preload: ['json', 'js', 'ts', 'html', 'css', 'vue', 'diff', 'shell', 'markdown', 'yaml', 'bash', 'ini']
        },
        navigation: {
          fields: ['icon', 'to', 'target']
        }
      })

      nuxt.hook('tailwindcss:config', function (tailwindConfig) {
        tailwindConfig.content = tailwindConfig.content ?? { files: [] };
        (Array.isArray(tailwindConfig.content) ? tailwindConfig.content : tailwindConfig.content.files).push(resolver.resolve('./runtime/components/**/*. {vue,mjs,ts}'))
      })
    }

    consola.box(
      colors.greenBright('Nuxt UI Pro \n') +
      `Remove license by Gua \n` +
      colors.blueBright(`Welcome to https://www.guaplus.com`)
    )
  }
})
```