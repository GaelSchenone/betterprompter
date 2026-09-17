import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'speeches.json');

function readAll() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
  return raw ? JSON.parse(raw) : [];
}

function writeAll(speeches) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(speeches, null, 2));
}

export function findAll() {
  return readAll();
}

export function findById(id) {
  return readAll().find((s) => s.id === id) || null;
}

export function insert(speech) {
  const speeches = readAll();
  speeches.push(speech);
  writeAll(speeches);
  return speech;
}

export function deleteById(id) {
  const speeches = readAll();
  const index = speeches.findIndex((s) => s.id === id);
  if (index === -1) return false;
  speeches.splice(index, 1);
  writeAll(speeches);
  return true;
}
