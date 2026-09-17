import crypto from 'crypto';
import * as speechRepository from '../repositories/speechRepository.js';

const TITLE_MAX_LENGTH = 80;

export class ValidationError extends Error {}

export function listSpeeches() {
  return speechRepository.findAll();
}

export function getSpeech(id) {
  return speechRepository.findById(id);
}

export function createSpeech({ title, text }) {
  const cleanTitle = (title || '').trim();
  const cleanText = (text || '').trim();

  if (!cleanTitle) throw new ValidationError('El titulo es obligatorio');
  if (cleanTitle.length > TITLE_MAX_LENGTH) {
    throw new ValidationError(`El titulo no puede superar los ${TITLE_MAX_LENGTH} caracteres`);
  }
  if (!cleanText) throw new ValidationError('El texto del speech no puede estar vacio');

  const speech = {
    id: crypto.randomUUID(),
    title: cleanTitle,
    text: cleanText,
    createdAt: new Date().toISOString(),
  };

  return speechRepository.insert(speech);
}

export function removeSpeech(id) {
  return speechRepository.deleteById(id);
}
