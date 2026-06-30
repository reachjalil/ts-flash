import type { PythonSymbol, PythonSymbolKind } from "./types.js";

function symbol<TKind extends PythonSymbolKind>(kind: TKind, name: string): PythonSymbol<TKind> {
  return Object.freeze({ __tsFlashPythonSymbol: kind, name });
}

function enumObject<TKind extends PythonSymbolKind, TName extends string>(
  kind: TKind,
  names: readonly TName[],
): Record<TName, PythonSymbol<TKind>> {
  return Object.fromEntries(names.map((name) => [name, symbol(kind, name)])) as Record<TName, PythonSymbol<TKind>>;
}

export const gpuType = (name: string): PythonSymbol<"GpuType"> => symbol("GpuType", name);
export const gpuGroup = (name: string): PythonSymbol<"GpuGroup"> => symbol("GpuGroup", name);
export const cpuType = (name: string): PythonSymbol<"CpuInstanceType"> => symbol("CpuInstanceType", name);
export const dataCenter = (name: string): PythonSymbol<"DataCenter"> => symbol("DataCenter", name);
export const cudaVersion = (name: string): PythonSymbol<"CudaVersion"> => symbol("CudaVersion", name);
export const scalerType = (name: string): PythonSymbol<"ServerlessScalerType"> => symbol("ServerlessScalerType", name);

export const GpuGroup = enumObject("GpuGroup", [
  "ANY",
  "ADA_24",
  "ADA_32_PRO",
  "ADA_48_PRO",
  "ADA_80_PRO",
  "AMPERE_16",
  "AMPERE_24",
  "AMPERE_48",
  "AMPERE_80",
  "HOPPER_141",
  "BLACKWELL_96",
  "BLACKWELL_180",
] as const);

export const GpuType = enumObject("GpuType", [
  "ANY",
  "NVIDIA_GEFORCE_RTX_4090",
  "NVIDIA_GEFORCE_RTX_5090",
  "NVIDIA_RTX_6000_ADA_GENERATION",
  "NVIDIA_RTX_PRO_6000_BLACKWELL_SERVER_EDITION",
  "NVIDIA_RTX_PRO_6000_BLACKWELL_WORKSTATION_EDITION",
  "NVIDIA_RTX_PRO_6000_BLACKWELL_MAX_Q_WORKSTATION_EDITION",
  "NVIDIA_H100_80GB_HBM3",
  "NVIDIA_RTX_A4000",
  "NVIDIA_RTX_A4500",
  "NVIDIA_RTX_4000_ADA_GENERATION",
  "NVIDIA_RTX_2000_ADA_GENERATION",
  "NVIDIA_RTX_A5000",
  "NVIDIA_L4",
  "NVIDIA_GEFORCE_RTX_3090",
  "NVIDIA_A40",
  "NVIDIA_RTX_A6000",
  "NVIDIA_A100_80GB_PCIe",
  "NVIDIA_A100_SXM4_80GB",
  "NVIDIA_H200",
  "NVIDIA_B200",
] as const);

export const CpuInstanceType = enumObject("CpuInstanceType", [
  "CPU3G_1_4",
  "CPU3G_2_8",
  "CPU3G_4_16",
  "CPU3G_8_32",
  "CPU3C_1_2",
  "CPU3C_2_4",
  "CPU3C_4_8",
  "CPU3C_8_16",
  "CPU5C_1_2",
  "CPU5C_2_4",
  "CPU5C_4_8",
  "CPU5C_8_16",
] as const);

export const DataCenter = enumObject("DataCenter", [
  "US_CA_2",
  "US_IL_1",
  "US_KS_2",
  "US_MO_1",
  "US_MO_2",
  "US_NC_2",
  "US_NE_1",
  "US_WA_1",
  "EU_CZ_1",
  "EU_RO_1",
  "EUR_NO_1",
] as const);

export const ServerlessScalerType = enumObject("ServerlessScalerType", [
  "QUEUE_DELAY",
  "REQUEST_COUNT",
  "CONCURRENCY",
] as const);

export const CudaVersion = enumObject("CudaVersion", [
  "V12_8",
  "V12_6",
  "V12_4",
  "V12_2",
  "V12_1",
  "V11_8",
] as const);
