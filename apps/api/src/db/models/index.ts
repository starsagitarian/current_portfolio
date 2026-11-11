import type { Sequelize } from "sequelize";
import { initContactMessageModel } from "./contact-message";
import { initContentModels } from "./content";

export * from "./contact-message";
export * from "./content";

let boundTo: Sequelize | undefined;

/**
 * Binds every model (and its associations) to a Sequelize instance.
 * Models are module-level classes, so only one instance is active at a time.
 */
export function initModels(sequelize: Sequelize): void {
  if (boundTo === sequelize) return;
  initContentModels(sequelize);
  initContactMessageModel(sequelize);
  boundTo = sequelize;
}
