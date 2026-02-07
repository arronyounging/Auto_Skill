/**
 * Configuration loader — reads YAML config files and provides
 * unified access to brand, keywords, categories, and author data.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, '../../config');

function loadYaml(filename) {
  const filepath = resolve(CONFIG_DIR, filename);
  const content = readFileSync(filepath, 'utf-8');
  return yaml.load(content);
}

let _cache = null;

export function loadConfig() {
  if (_cache) return _cache;

  _cache = {
    brand: loadYaml('brand.yaml'),
    keywords: loadYaml('keywords.yaml'),
    categories: loadYaml('categories.yaml'),
    authors: loadYaml('authors.yaml'),
    topics: loadYaml('../topics/topic-pool.yaml'),
  };

  return _cache;
}

export function getBrand() {
  return loadConfig().brand;
}

export function getKeywords() {
  return loadConfig().keywords;
}

export function getCategories() {
  return loadConfig().categories.categories;
}

export function getAuthors() {
  return loadConfig().authors.authors;
}

export function getDefaultAuthor() {
  const authors = getAuthors();
  return authors.find(a => a.default) || authors[0];
}

export function getTopics() {
  return loadConfig().topics.topics;
}

export function getCategoryById(id) {
  return getCategories().find(c => c.id === id);
}

export function getKeywordCluster(name) {
  const config = loadConfig();
  return config.keywords.clusters.find(c => c.name === name);
}
