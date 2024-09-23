import { parseEther } from 'ethers';
import { ANOTHER_CHAIN_ID } from './chainId';

export const BITCOIN_TEST_CHAIN_ID = ANOTHER_CHAIN_ID;

export const parseBitcoin = (bitcoin: string): bigint => {
  return parseEther(bitcoin) / 10_000_000_000n; // Remove 10 decimals
};
