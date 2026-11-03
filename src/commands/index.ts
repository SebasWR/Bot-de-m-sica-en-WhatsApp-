import { createHelpCommand } from './help.js';
import { historyCommand, topCommand } from './history.js';
import { pingCommand } from './ping.js';
import { playCommand } from './play.js';
import { CommandRegistry } from './registry.js';
import { searchCommand } from './search.js';

export function createRegistry(): CommandRegistry {
  const registry = new CommandRegistry();
  registry
    .register(createHelpCommand(registry))
    .register(pingCommand)
    .register(searchCommand)
    .register(playCommand)
    .register(historyCommand)
    .register(topCommand);
  return registry;
}
