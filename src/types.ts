export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonRecord = { [key: string]: JsonValue };

export type Workers = number | readonly [min: number, max: number];

export type PythonSymbolKind =
  | "CpuInstanceType"
  | "CudaVersion"
  | "DataCenter"
  | "GpuGroup"
  | "GpuType"
  | "ServerlessScalerType";

export type PythonSymbol<TKind extends PythonSymbolKind = PythonSymbolKind> = {
  readonly __tsFlashPythonSymbol: TKind;
  readonly name: string;
};

export type PythonResourceValue =
  | string
  | PythonSymbol
  | readonly (string | PythonSymbol)[];

export type NetworkVolumeConfig = {
  readonly name?: string;
  readonly id?: string;
  readonly size?: number;
  readonly dataCenterId?: string | PythonSymbol<"DataCenter">;
};

export type PodTemplateConfig = {
  readonly containerDiskInGb?: number;
  readonly dockerArgs?: string;
  readonly ports?: string;
  readonly volumeMountPath?: string;
};

export type BaseEndpointConfig = {
  readonly name: string;
  readonly gpu?: PythonResourceValue;
  readonly cpu?: PythonResourceValue;
  readonly workers?: Workers;
  readonly idleTimeout?: number;
  readonly dependencies?: readonly string[];
  readonly systemDependencies?: readonly string[];
  readonly accelerateDownloads?: boolean;
  readonly volume?: NetworkVolumeConfig | readonly NetworkVolumeConfig[];
  readonly datacenter?: PythonResourceValue;
  readonly env?: Readonly<Record<string, string>>;
  readonly gpuCount?: number;
  readonly executionTimeoutMs?: number;
  readonly flashboot?: boolean;
  readonly scalerType?: PythonSymbol<"ServerlessScalerType"> | string;
  readonly scalerValue?: number;
  readonly template?: PodTemplateConfig;
  readonly minCudaVersion?: PythonSymbol<"CudaVersion"> | string;
  readonly maxConcurrency?: number;
  readonly pythonVersion?: "3.10" | "3.11" | "3.12" | "3.13";
};

export type PythonHandler = {
  readonly kind: "python";
  readonly args?: readonly string[];
  readonly body: string;
};

export type JsonHandler<TOutput extends JsonValue = JsonValue> = {
  readonly kind: "json";
  readonly value: TOutput;
};

export type EchoHandler = {
  readonly kind: "echo";
};

export type QueueHandler<TOutput extends JsonValue = JsonValue> =
  | PythonHandler
  | JsonHandler<TOutput>
  | EchoHandler;

export type QueueEndpointConfig<TInput = JsonValue, TOutput extends JsonValue = JsonValue> = BaseEndpointConfig & {
  readonly kind: "queue";
  readonly handler: QueueHandler<TOutput>;
  readonly input?: TInput;
};

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export type RouteConfig<TOutput extends JsonValue = JsonValue> = {
  readonly method: HttpMethod;
  readonly path: `/${string}`;
  readonly handler: QueueHandler<TOutput>;
};

export type LoadBalancedEndpointConfig = BaseEndpointConfig & {
  readonly kind: "load-balanced";
  readonly routes: readonly RouteConfig[];
};

export type ExternalImageEndpointConfig = BaseEndpointConfig & {
  readonly kind: "external-image";
  readonly image: string;
};

export type FlashEndpointConfig =
  | QueueEndpointConfig
  | LoadBalancedEndpointConfig
  | ExternalImageEndpointConfig;

export type FlashpodConfig = {
  readonly app?: string;
  readonly bridgeFile?: string;
  readonly endpoints: readonly FlashEndpointConfig[];
};

/** @deprecated Use FlashpodConfig. */
export type TsFlashConfig = FlashpodConfig;

export type GenerateOptions = {
  readonly banner?: string;
};

export type LoadedConfig = {
  readonly path: string;
  readonly config: FlashpodConfig;
};

export type FlashClientOptions = {
  readonly apiKey?: string;
  readonly fetch?: typeof fetch;
  readonly queueBaseUrl?: string;
  readonly loadBalancedBaseDomain?: string;
};

export type EndpointJobData<TOutput = unknown> = {
  readonly id: string;
  readonly status?: string;
  readonly output?: TOutput;
  readonly error?: string;
  readonly [key: string]: unknown;
};
