import { executeSignal as executeSignalAster } from './order-execution-aster.service.js';
import { executeSignal as executeSignalOstium } from './order-execution-ostium.service.js';

/**
 * Routes signal execution to the exchange client selected in bot runtime params.
 */
export async function executeSignal(signalDoc, runtimeParamsInput = {}) {
  const platform = runtimeParamsInput.tradingPlatform === 'ostium' ? 'ostium' : 'aster';
  if (platform === 'ostium') {
    return executeSignalOstium(signalDoc, runtimeParamsInput);
  }
  return executeSignalAster(signalDoc, runtimeParamsInput);
}
