import type { Command } from './types.js';

export class CommandRegistry {
  private readonly commands = new Map<string, Command>();
  private readonly aliases = new Map<string, string>();

  register(command: Command): this {
    const name = command.name.toLowerCase();
    if (this.commands.has(name) || this.aliases.has(name)) {
      throw new Error(`Comando duplicado: ${name}`);
    }
    this.commands.set(name, command);
    for (const alias of command.aliases ?? []) {
      const key = alias.toLowerCase();
      if (this.commands.has(key) || this.aliases.has(key)) throw new Error(`Alias duplicado: ${key}`);
      this.aliases.set(key, name);
    }
    return this;
  }

  get(nameOrAlias: string): Command | undefined {
    const key = nameOrAlias.toLowerCase();
    return this.commands.get(key) ?? this.commands.get(this.aliases.get(key) ?? '');
  }

  list(): Command[] {
    return [...this.commands.values()];
  }
}
