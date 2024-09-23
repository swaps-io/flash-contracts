import { expect } from 'chai';

import { ANY_BITCOIN_ADDRESS } from '../../scripts/lib/contract/order-bitcoin/anyBitcoinAddress';

describe('BitcoinAnyAddressConstTest', function () {
  it('Should use "Any address, one transaction" as Bitcoin library const', async function () {
    expect(ANY_BITCOIN_ADDRESS).to.be.equal('Any address, one transaction');
  });
});
