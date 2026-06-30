import type {
  EchoHandler,
  FlashEndpointConfig,
  JsonHandler,
  JsonValue,
  LoadBalancedEndpointConfig,
  PythonHandler,
  QueueEndpointConfig,
  RouteConfig,
  TsFlashConfig,
} from "./types.js";

export function defineConfig(config: TsFlashConfig): TsFlashConfig {
  return config;
}

export const handler = {
  python(body: string, args: readonly string[] = ["input"]): PythonHandler {
    return { kind: "python", args, body };
  },

  json<TOutput extends JsonValue>(value: TOutput): JsonHandler<TOutput> {
    return { kind: "json", value };
  },

  echo(): EchoHandler {
    return { kind: "echo" };
  },
};

export const endpoint = {
  queue<TInput = JsonValue, TOutput extends JsonValue = JsonValue>(
    config: Omit<QueueEndpointConfig<TInput, TOutput>, "kind">,
  ): QueueEndpointConfig<TInput, TOutput> {
    return { ...config, kind: "queue" };
  },

  loadBalanced(config: Omit<LoadBalancedEndpointConfig, "kind">): LoadBalancedEndpointConfig {
    return { ...config, kind: "load-balanced" };
  },

  externalImage(config: Omit<FlashEndpointConfig & { kind: "external-image" }, "kind">): FlashEndpointConfig {
    return { ...config, kind: "external-image" };
  },
};

export const route = {
  get(path: `/${string}`, body: RouteConfig["handler"]): RouteConfig {
    return { method: "get", path, handler: body };
  },
  post(path: `/${string}`, body: RouteConfig["handler"]): RouteConfig {
    return { method: "post", path, handler: body };
  },
  put(path: `/${string}`, body: RouteConfig["handler"]): RouteConfig {
    return { method: "put", path, handler: body };
  },
  delete(path: `/${string}`, body: RouteConfig["handler"]): RouteConfig {
    return { method: "delete", path, handler: body };
  },
  patch(path: `/${string}`, body: RouteConfig["handler"]): RouteConfig {
    return { method: "patch", path, handler: body };
  },
};
