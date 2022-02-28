const doczPluginNetlify = require('docz-plugin-netlify');
const {css} = require('styled-components');

module.exports = {
  title: 'HZ Core',
  description: "HZ's internal library of React Components",
  src: './packages',
  public: './static',
  files: '**/*.{md,mdx}',
  codeSandbox: false,
  typescript: true,
  ignore: ['**/changelog.*', '**/{animations,simple-actions}/**'],
  menu: [
    'About',
    'Headless Components',
    'Hooks',
    'Styled Components',
    'Utilities',
    'UI Components',
    'Conventional Commits',
    'Deprecated',
  ],
  htmlContext: {
    favicon: 'public/favicon.ico',
  },
  themeConfig: {
    showPlaygroundEditor: false,
    logo: {
      src: 'public/logo.svg',
      width: 150,
    },
    colors: {
      primary: 'rgb(243,130,48)',
      text: 'rgb(67,69,77)',
      link: 'rgb(243,130,48)',
      sidebarText: 'rgb(127,129,134)',
      blockquoteBorder: 'rgb(190,141,190)',
    },
    styles: {
      logo: css`
        align-items: center;
      `,
      playground: css`
        padding: 0;
        min-height: 100%;
        display: flex;

        & > div:only-child {
          flex: 1;
        }
      `,
    },
  },
  plugins: [doczPluginNetlify()],
};
