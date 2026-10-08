import { genesisModule } from "./modules/00-genesis";
import { kernelModule } from "./modules/01-kernel";
import { shellModule } from "./modules/02-shell";
import { branchModule } from "./modules/03-branch";
import { packetModule } from "./modules/04-packet";
import { gatewayModule } from "./modules/05-gateway";
import { containerModule } from "./modules/06-container";
import { nimbusModule } from "./modules/07-nimbus";
import { blueprintModule } from "./modules/08-blueprint";
import { puppeteerModule } from "./modules/09-puppeteer";
import { pipelineModule } from "./modules/10-pipeline";
import { vaultModule } from "./modules/11-vault";
import { helmModule } from "./modules/12-helm";
import { syncModule } from "./modules/13-sync";
import { watchtowerModule } from "./modules/14-watchtower";
import { architectModule } from "./modules/15-architect";
import type { DevOpsModule } from "./types";

/** Un module d'introduction, puis l'ordre de la roadmap DevOps de roadmap.sh (de haut en bas). */
export const CURRICULUM: readonly DevOpsModule[] = [
  genesisModule,
  kernelModule,
  shellModule,
  branchModule,
  packetModule,
  gatewayModule,
  containerModule,
  nimbusModule,
  blueprintModule,
  puppeteerModule,
  pipelineModule,
  vaultModule,
  helmModule,
  syncModule,
  watchtowerModule,
  architectModule,
];

export const ROADMAP_URL = "https://roadmap.sh/devops";
