import type { EndpointJobData, FlashClientOptions, JsonValue } from "./types.js";

const DEFAULT_QUEUE_BASE_URL = "https://api.runpod.ai/v2";
const DEFAULT_LB_BASE_DOMAIN = "api.runpod.ai";

export class FlashClient {
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;
  readonly #queueBaseUrl: string;
  readonly #loadBalancedBaseDomain: string;

  constructor(options: FlashClientOptions = {}) {
    const apiKey = options.apiKey ?? process.env.RUNPOD_API_KEY;
    if (!apiKey) throw new Error("RUNPOD_API_KEY is required.");
    this.#apiKey = apiKey;
    this.#fetch = options.fetch ?? fetch;
    this.#queueBaseUrl = options.queueBaseUrl ?? DEFAULT_QUEUE_BASE_URL;
    this.#loadBalancedBaseDomain = options.loadBalancedBaseDomain ?? DEFAULT_LB_BASE_DOMAIN;
  }

  endpoint(id: string): EndpointClient {
    return new EndpointClient({
      apiKey: this.#apiKey,
      endpointId: id,
      fetch: this.#fetch,
      loadBalancedBaseDomain: this.#loadBalancedBaseDomain,
      queueBaseUrl: this.#queueBaseUrl,
    });
  }
}

export class EndpointClient {
  readonly #apiKey: string;
  readonly #endpointId: string;
  readonly #fetch: typeof fetch;
  readonly #queueBaseUrl: string;
  readonly #loadBalancedBaseDomain: string;

  constructor(options: FlashClientOptions & { endpointId: string }) {
    const apiKey = options.apiKey ?? process.env.RUNPOD_API_KEY;
    if (!apiKey) throw new Error("RUNPOD_API_KEY is required.");
    this.#apiKey = apiKey;
    this.#endpointId = options.endpointId;
    this.#fetch = options.fetch ?? fetch;
    this.#queueBaseUrl = options.queueBaseUrl ?? DEFAULT_QUEUE_BASE_URL;
    this.#loadBalancedBaseDomain = options.loadBalancedBaseDomain ?? DEFAULT_LB_BASE_DOMAIN;
  }

  async run<TInput extends JsonValue, TOutput = unknown>(input: TInput): Promise<EndpointJob<TOutput>> {
    const data = await this.#post<EndpointJobData<TOutput>>(this.#queueUrl("/run"), { input });
    return new EndpointJob<TOutput>(data, this);
  }

  async runsync<TInput extends JsonValue, TOutput = unknown>(input: TInput): Promise<EndpointJob<TOutput>> {
    const data = await this.#post<EndpointJobData<TOutput>>(this.#queueUrl("/runsync"), { input });
    return new EndpointJob<TOutput>(data, this);
  }

  async status<TOutput = unknown>(jobId: string): Promise<EndpointJobData<TOutput>> {
    return await this.#get<EndpointJobData<TOutput>>(this.#queueUrl(`/status/${encodeURIComponent(jobId)}`));
  }

  async cancel<TOutput = unknown>(jobId: string): Promise<EndpointJob<TOutput>> {
    const data = await this.#post<EndpointJobData<TOutput>>(this.#queueUrl(`/cancel/${encodeURIComponent(jobId)}`), undefined);
    return new EndpointJob<TOutput>(data, this);
  }

  async get<TOutput = unknown>(path: `/${string}`): Promise<TOutput> {
    return await this.#request<TOutput>("GET", this.#lbUrl(path));
  }

  async post<TInput extends JsonValue, TOutput = unknown>(path: `/${string}`, data?: TInput): Promise<TOutput> {
    return await this.#request<TOutput>("POST", this.#lbUrl(path), data);
  }

  async put<TInput extends JsonValue, TOutput = unknown>(path: `/${string}`, data?: TInput): Promise<TOutput> {
    return await this.#request<TOutput>("PUT", this.#lbUrl(path), data);
  }

  async delete<TOutput = unknown>(path: `/${string}`): Promise<TOutput> {
    return await this.#request<TOutput>("DELETE", this.#lbUrl(path));
  }

  async patch<TInput extends JsonValue, TOutput = unknown>(path: `/${string}`, data?: TInput): Promise<TOutput> {
    return await this.#request<TOutput>("PATCH", this.#lbUrl(path), data);
  }

  #queueUrl(path: string): string {
    return `${this.#queueBaseUrl}/${this.#endpointId}${path}`;
  }

  #lbUrl(path: `/${string}`): string {
    return `https://${this.#endpointId}.${this.#loadBalancedBaseDomain}${path}`;
  }

  async #get<TOutput>(url: string): Promise<TOutput> {
    return await this.#request<TOutput>("GET", url);
  }

  async #post<TOutput>(url: string, data: unknown): Promise<TOutput> {
    return await this.#request<TOutput>("POST", url, data);
  }

  async #request<TOutput>(method: string, url: string, data?: unknown): Promise<TOutput> {
    const response = await this.#fetch(url, {
      body: data === undefined ? undefined : JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      },
      method,
    });
    const text = await response.text();
    const parsed = text.length > 0 ? safeJson(text) : undefined;
    if (!response.ok) {
      const message = typeof parsed === "object" && parsed && "error" in parsed ? String(parsed.error) : text;
      throw new Error(`RunPod request failed (${response.status} ${response.statusText}): ${message}`);
    }
    return parsed as TOutput;
  }
}

export class EndpointJob<TOutput = unknown> {
  #data: EndpointJobData<TOutput>;
  readonly #endpoint: EndpointClient;

  constructor(data: EndpointJobData<TOutput>, endpoint: EndpointClient) {
    this.#data = data;
    this.#endpoint = endpoint;
  }

  get id(): string {
    return this.#data.id;
  }

  get statusValue(): string | undefined {
    return this.#data.status;
  }

  get output(): TOutput | undefined {
    return this.#data.output;
  }

  get error(): string | undefined {
    return this.#data.error;
  }

  get done(): boolean {
    return ["COMPLETED", "FAILED", "CANCELLED", "TIMED_OUT"].includes(this.#data.status ?? "");
  }

  toJSON(): EndpointJobData<TOutput> {
    return this.#data;
  }

  async refresh(): Promise<this> {
    this.#data = await this.#endpoint.status<TOutput>(this.id);
    return this;
  }

  async cancel(): Promise<this> {
    const cancelled = await this.#endpoint.cancel<TOutput>(this.id);
    this.#data = cancelled.toJSON();
    return this;
  }

  async wait(options: { intervalMs?: number; timeoutMs?: number } = {}): Promise<this> {
    const intervalMs = options.intervalMs ?? 1000;
    const started = Date.now();
    while (!this.done) {
      if (options.timeoutMs !== undefined && Date.now() - started > options.timeoutMs) {
        throw new Error(`Job ${this.id} did not finish within ${options.timeoutMs}ms.`);
      }
      await sleep(intervalMs);
      await this.refresh();
    }
    return this;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
