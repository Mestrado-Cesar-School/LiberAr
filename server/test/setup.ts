// Executa antes de cada arquivo de teste: ambiente de teste e banco liberar_test.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://liberar:liberar@localhost:5434/liberar_test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "segredo-de-teste-com-mais-de-16-chars";
process.env.JWT_ACCESS_TTL = "15m";
// Sem chave de LLM nos testes (os testes do chat mockam o SDK quando preciso).
delete process.env.ANTHROPIC_API_KEY;
delete process.env.SMTP_URL;
