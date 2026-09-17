import { Router } from 'express';
import * as speechService from '../services/speechService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(speechService.listSpeeches());
});

router.get('/:id', (req, res) => {
  const speech = speechService.getSpeech(req.params.id);
  if (!speech) return res.status(404).json({ error: 'Speech no encontrado' });
  res.json(speech);
});

router.post('/', (req, res) => {
  try {
    const speech = speechService.createSpeech(req.body || {});
    res.status(201).json(speech);
  } catch (err) {
    if (err instanceof speechService.ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.delete('/:id', (req, res) => {
  const deleted = speechService.removeSpeech(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Speech no encontrado' });
  res.status(204).end();
});

export default router;
