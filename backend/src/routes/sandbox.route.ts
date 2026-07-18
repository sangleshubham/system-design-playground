/**
 * Free-form sandbox designs (US5): CRUD over `designs` rows with `level_id NULL`. Same
 * graph invariants as level designs; no missions, scoring, or unlock side effects.
 * See contracts/api.md § Sandbox.
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { SandboxCreateRequestSchema, SandboxUpsertRequestSchema } from '../models/index.js';
import { badRequest, notFound } from '../http/http-error.js';
import { validateDesignGraph } from '../services/design-validation.js';

export function sandboxRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/sandbox/designs', (_req, res) => {
    res.json(deps.db.designs.listSandbox());
  });

  router.post('/sandbox/designs', (req, res) => {
    const parsed = SandboxCreateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        `Invalid sandbox payload: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    const design = deps.db.designs.createSandbox(parsed.data.name.trim());
    res.status(201).json(design);
  });

  router.get('/sandbox/designs/:id', (req, res) => {
    const design = deps.db.designs.getSandboxById(req.params.id);
    if (!design) throw notFound(`Unknown sandbox design "${req.params.id}".`);
    res.json(design);
  });

  router.put('/sandbox/designs/:id', (req, res) => {
    const parsed = SandboxUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        `Invalid sandbox payload: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    const { nodes, edges, notes, name } = parsed.data;
    validateDesignGraph({ nodes, edges, notes }, deps.content);

    const result = deps.db.designs.updateSandbox(req.params.id, { nodes, edges, notes }, name?.trim());
    if (!result) throw notFound(`Unknown sandbox design "${req.params.id}".`);
    res.json(result);
  });

  router.delete('/sandbox/designs/:id', (req, res) => {
    const removed = deps.db.designs.deleteSandbox(req.params.id);
    if (!removed) throw notFound(`Unknown sandbox design "${req.params.id}".`);
    res.status(204).end();
  });

  return router;
}
