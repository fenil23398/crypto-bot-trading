import * as supertrendStrategy from './supertrend.strategy.js';
import * as macdStrategy from './macd.strategy.js';
import * as rsiEmaStrategy from './rsi-ema.strategy.js';
import * as ma9Strategy from './ma9.strategy.js';
import * as rsiLevelsStrategy from './rsi-levels.strategy.js';

const strategies = new Map();

function register(strategy) {
  strategies.set(strategy.name, strategy);
}

register(supertrendStrategy);
register(macdStrategy);
register(rsiEmaStrategy);
register(ma9Strategy);
register(rsiLevelsStrategy);

export function getStrategy(name) {
  return strategies.get(name) || null;
}

export function getAllStrategies() {
  return Array.from(strategies.values()).map((s) => ({
    name: s.name,
    displayName: s.displayName,
    description: s.description,
    requiredCandles: s.requiredCandles,
  }));
}

export function strategyExists(name) {
  return strategies.has(name);
}
