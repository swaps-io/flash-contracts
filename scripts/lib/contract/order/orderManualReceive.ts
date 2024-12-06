import { evm } from '../../evm';

const MIN_NONCE_VALUE = 0n;
const MAX_NONCE_VALUE = (1n << 94n) - 1n;

const MIN_HASH_VALUE = 0n;
const MAX_HASH_VALUE = (1n << 256n) - 1n;

export const NONCE_POST_HASH_BITS = ((1n << 160n) - 1n) << 96n;
export const NONCE_POST_WITH_SEND_BIT = 1n << 95n;
export const NONCE_POST_ALLOW_FAIL_BIT = 1n << 94n;

export interface ManualReceiveNonceParams {
  nonce?: bigint;
  postData?: string | { hash: string };
  shouldPostWithSend?: boolean;
  shouldPostAllowFail?: boolean;
}

export const calcOrderManualReceiveNonce = async ({
  nonce = 0n,
  postData = '0x',
  shouldPostWithSend = false,
  shouldPostAllowFail = false,
}: ManualReceiveNonceParams = {}): Promise<bigint> => {
  if (nonce < MIN_NONCE_VALUE || nonce > MAX_NONCE_VALUE) {
    throw new Error(
      `Invalid manual receive nonce value. ` +
      `Must be between ${MIN_NONCE_VALUE} and ${MAX_NONCE_VALUE}`
    );
  }

  let postHashHex: string;
  if (typeof postData === 'string') {
    postHashHex = await evm.keccak256(postData);
  } else {
    postHashHex = postData.hash;
  }

  const postHash = BigInt(postHashHex);
  if (postHash < MIN_HASH_VALUE || postHash > MAX_HASH_VALUE) {
    throw new Error(
      `Invalid manual receive nonce post data hash value. ` +
      `Must be between ${MIN_HASH_VALUE} and ${MAX_HASH_VALUE}`
    );
  }

  nonce |= postHash & NONCE_POST_HASH_BITS;
  if (shouldPostWithSend) {
    nonce |= NONCE_POST_WITH_SEND_BIT;
  }
  if (shouldPostAllowFail) {
    nonce |= NONCE_POST_ALLOW_FAIL_BIT;
  }
  return nonce;
};
