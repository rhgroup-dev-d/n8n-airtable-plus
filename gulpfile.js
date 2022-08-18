const path = require('path')
const { dest, src, task } = require('gulp')

function copyIcons () {
  const nodeSource = path.resolve('nodes', '**', '*.{png,svg}')
  const nodeDestination = path.resolve('dist', 'nodes')

  src(nodeSource).pipe(dest(nodeDestination))

  const credSource = path.resolve('credentials', '**', '*.{png,svg}')
  const credDestination = path.resolve('dist', 'credentials')

  return src(credSource).pipe(dest(credDestination))
}

task('build:icons', copyIcons)
