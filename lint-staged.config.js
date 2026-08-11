export default {
  '*.ts': ['biome check --write', 'cspell --no-gitignore'],
  '*.js': ['biome check --write'],
  '*.json': ['biome check --write'],
  '*.md': ['cspell --no-gitignore'],
};
