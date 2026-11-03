import { measureCommand, chooseCommand, coinCommand, diceCommand, eightBallCommand, rpsCommand, loveCommand } from './fun.js';
import {
  acceptCommand,
  connect4Command,
  declineCommand,
  guessCommand,
  hangmanCommand,
  quitCommand,
  scoresCommand,
  tatetiCommand,
  triviaCommand,
} from './games.js';
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
    // Música
    .register(searchCommand)
    .register(playCommand)
    .register(historyCommand)
    .register(topCommand)
    // Juegos
    .register(tatetiCommand)
    .register(connect4Command)
    .register(hangmanCommand)
    .register(triviaCommand)
    .register(guessCommand)
    .register(rpsCommand)
    .register(acceptCommand)
    .register(declineCommand)
    .register(quitCommand)
    .register(scoresCommand)
    // Diversión
    .register(diceCommand)
    .register(coinCommand)
    .register(eightBallCommand)
    .register(chooseCommand)
    .register(loveCommand)
    .register(measureCommand);
  return registry;
}
