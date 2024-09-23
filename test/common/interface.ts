import { Interface } from 'ethers';

export const getFunctionSelectors = (iface: Interface): string[] => {
  const selectors: string[] = [];
  iface.forEachFunction((func) => selectors.push(func.selector));
  return selectors;
};
