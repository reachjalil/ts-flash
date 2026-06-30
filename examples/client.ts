import { FlashClient } from "ts-flash";

const client = new FlashClient();
const endpoint = client.endpoint("YOUR_ENDPOINT_ID");

const job = await endpoint.runsync<{ prompt: string }, { text: string }>({
  prompt: "Tell RunPod I write TypeScript now.",
});

console.log(job.output);
