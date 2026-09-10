import { completion, LLAMA_3_2_1B_INST_Q4_0, loadModel, close } from "@qvac/sdk";

const providerPublicKey = process.argv[2];
if (!providerPublicKey) {
  console.error("uso: node delegate-consumer.mjs <provider-public-key>");
  process.exit(1);
}

console.log("delegate SIN fallback local");
console.log("provider:", providerPublicKey);

const modelId = await loadModel({
  modelSrc: LLAMA_3_2_1B_INST_Q4_0,
  delegate: {
    providerPublicKey,
    timeout: 60_000,
    fallbackToLocal: false,
  },
});
console.log("modelId:", modelId);

const response = completion({
  modelId,
  history: [{ role: "user", content: "Hello!" }],
  stream: true,
});
for await (const token of response.tokenStream) process.stdout.write(token);
console.log("\nstats:", await response.stats);
void close();
