export function ensureInteractive(commandName: string): void {
  if (!process.stdout.isTTY) {
    console.error(
      `Error: "${commandName}" requires an interactive terminal.\n` +
        `If running in CI or piped mode, use --yes (and --preset for init).`
    );
    process.exit(1);
  }
}
