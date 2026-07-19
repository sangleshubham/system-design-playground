/**
 * Free-form sandbox designs (US5): CRUD over `designs` rows with `level_id NULL`. Same
 * graph invariants as level designs; no missions, scoring, or unlock side effects.
 * See contracts/api.md § Sandbox.
 */
import { Router } from 'express';
import type { AppDeps } from '../deps.js';
import { SandboxCreateRequestSchema, SandboxUpsertRequestSchema } from '../models/index.js';
import { badRequest, notFound, sendStaleWrite } from '../http/http-error.js';
import { validateDesignGraph } from '../services/design-validation.js';
import { requireWorkspaceId } from '../auth/auth.middleware.js';

export function sandboxRouter(deps: AppDeps): Router {
  const router = Router();

  router.get('/sandbox/designs', (_req, res) => {
    const workspaceId = requireWorkspaceId(res);
    res.json(deps.db.designs.listSandbox(workspaceId));
  });

  router.post('/sandbox/designs', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const parsed = SandboxCreateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        `Invalid sandbox payload: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    const design = deps.db.designs.createSandbox(workspaceId, parsed.data.name.trim());
    res.status(201).json(design);
  });

  router.get('/sandbox/designs/:id', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const design = deps.db.designs.getSandboxById(workspaceId, req.params.id);
    if (!design) throw notFound(`Unknown sandbox design "${req.params.id}".`);
    res.json(design);
  });

  router.put('/sandbox/designs/:id', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const parsed = SandboxUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        `Invalid sandbox payload: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
      );
    }
    const { nodes, edges, notes, name, baseUpdatedAt } = parsed.data;
    validateDesignGraph({ nodes, edges, notes }, deps.content);

    const outcome = deps.db.designs.updateSandbox(
      workspaceId,
      req.params.id,
      { nodes, edges, notes },
      name?.trim(),
      baseUpdatedAt,
    );
    if (outcome.status === 'not_found') throw notFound(`Unknown sandbox design "${req.params.id}".`);
    if (outcome.status === 'stale') {
      sendStaleWrite(res, outcome.current);
      return;
    }
    res.json({ updatedAt: outcome.updatedAt });
  });

  router.delete('/sandbox/designs/:id', (req, res) => {
    const workspaceId = requireWorkspaceId(res);
    const removed = deps.db.designs.deleteSandbox(workspaceId, req.params.id);
    if (!removed) throw notFound(`Unknown sandbox design "${req.params.id}".`);
    res.status(204).end();
  });

  return router;
}
