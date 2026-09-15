import { asClass, asValue, createContainer, InjectionMode, type AwilixContainer } from 'awilix';
import { OpenAiResponsesClient, type LlmClient } from '@/clients/openai-responses.client.js';
import type { AppConfig } from '@/config.js';
import { OrgTreeController } from '@/controllers/org-tree.controller.js';
import { SearchController } from '@/controllers/search.controller.js';
import { OrgTreeChangeBus } from '@/events/org-tree-change-bus.js';
import { LiveUpdatesGateway } from '@/gateways/live-updates.gateway.js';
import { OrgNodeMapper } from '@/mappers/org-node.mapper.js';
import type { OrgNode } from '@/models/org-node.model.js';
import {
  InMemoryOrgNodeRepository,
  type OrgNodeRepository,
} from '@/repositories/org-node.repository.js';
import { orgNodesSeed } from '@/seeds/org-nodes.seed.js';
import { AiSearchService, type AiSearchServiceApi } from '@/services/ai-search.service.js';
import { LiveUpdateSimulator } from '@/services/live-update-simulator.js';
import { OrgTreeService, type OrgTreeServiceApi } from '@/services/org-tree.service.js';

/** Everything the container can resolve. Names are the injection keys. */
export interface Cradle {
  config: AppConfig;
  orgNodesSeed: readonly OrgNode[];
  random: () => number;
  /** Injectable clock keeps time-based live patches deterministic in tests. */
  clock: () => Date;
  orgNodeRepository: OrgNodeRepository;
  orgTreeChangeBus: OrgTreeChangeBus;
  orgNodeMapper: OrgNodeMapper;
  orgTreeService: OrgTreeServiceApi;
  orgTreeController: OrgTreeController;
  liveUpdateSimulator: LiveUpdateSimulator;
  liveUpdatesGateway: LiveUpdatesGateway;
  /** HTTP transport for outbound calls (LLM); replaced by a stub in tests. */
  fetchFn: typeof fetch;
  llmClient: LlmClient;
  aiSearchService: AiSearchServiceApi;
  searchController: SearchController;
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
    random: asValue(Math.random),
    clock: asValue(() => new Date()),
    orgNodeRepository: asClass(InMemoryOrgNodeRepository).singleton(),
    orgTreeChangeBus: asClass(OrgTreeChangeBus).singleton(),
    orgNodeMapper: asClass(OrgNodeMapper).singleton(),
    orgTreeService: asClass(OrgTreeService).singleton(),
    orgTreeController: asClass(OrgTreeController).singleton(),
    liveUpdateSimulator: asClass(LiveUpdateSimulator)
      .singleton()
      .disposer((simulator) => simulator.stop()),
    liveUpdatesGateway: asClass(LiveUpdatesGateway)
      .singleton()
      .disposer((gateway) => gateway.close()),
    fetchFn: asValue(globalThis.fetch),
    llmClient: asClass(OpenAiResponsesClient).singleton(),
    aiSearchService: asClass(AiSearchService).singleton(),
    searchController: asClass(SearchController).singleton(),
  });

  return container;
}
