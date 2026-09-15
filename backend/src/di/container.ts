import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import type { AppConfig } from '@/config.js';
import { OrgTreeController } from '@/controllers/org-tree.controller.js';
import { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import type { OrgNode } from '@/models/org-node.model.js';
import {
  InMemoryOrgNodeRepository,
  type OrgNodeRepository,
} from '@/repositories/org-node.repository.js';
import { orgNodesSeed } from '@/seeds/org-nodes.seed.js';
import { OrgTreeService, type OrgTreeReader } from '@/services/org-tree.service.js';

/** Everything the container can resolve. Names are the injection keys. */
export interface Cradle {
  config: AppConfig;
  orgNodesSeed: readonly OrgNode[];
  orgNodeRepository: OrgNodeRepository;
  orgNodeMapper: OrgNodeMapper;
  orgTreeService: OrgTreeReader;
  orgTreeController: OrgTreeController;
}

export type AppContainer = AwilixContainer<Cradle>;

/**
 * Composition root. PROXY mode: each class receives the cradle as a single
 * destructured object, so no decorators, reflect-metadata or name parsing is needed.
 * strict mode rejects lifetime leaks (e.g. a singleton depending on a scoped service).
 */
export function createAppContainer(config: AppConfig): AppContainer {
  const container = createContainer<Cradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  container.register({
    config: asValue(config),
    orgNodesSeed: asValue(orgNodesSeed),
    orgNodeRepository: asClass(InMemoryOrgNodeRepository).singleton(),
    orgNodeMapper: asClass(OrgNodeMapper).singleton(),
    orgTreeService: asClass(OrgTreeService).singleton(),
    orgTreeController: asClass(OrgTreeController).singleton(),
  });

  return container;
}
