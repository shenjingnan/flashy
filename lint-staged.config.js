export default {
  '*.ts': ['biome check --write', 'cspell --no-gitignore'],
  '*.js': ['biome check --write'],
  '*.json': ['biome check --write'],
  '*.css': ['biome check --write'],
  '*.html': ['biome check --write'],
  '*.md': ['cspell --no-gitignore'],
};
