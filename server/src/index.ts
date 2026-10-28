import { buildApp } from "./app";
import { config, llmEnabled } from "./config";

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(
      `LiberAr API pronta em http://localhost:${config.PORT} (docs em /docs) — assistente: ${
        llmEnabled ? `Claude (${config.ANTHROPIC_MODEL})` : "motor de regras (sem ANTHROPIC_API_KEY)"
      }`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} recebido — encerrando`);
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
