<!-- omit in toc -->
# Flash Contracts

<!-- omit in toc -->
### Table of Contents

- [Description](#description)
  - [Actors](#actors)
  - [Order Types](#order-types)
  - [`Order`](#order)
    - [`Order` Flow](#order-flow)
    - [`Order` Structure](#order-structure)
  - [`OrderBitcoin`](#orderbitcoin)
    - [`OrderBitcoin` Flow](#orderbitcoin-flow)
    - [`OrderBitcoin` Structure](#orderbitcoin-structure)
  - [Contracts](#contracts)
    - [`OrderReceiverFacet`](#orderreceiverfacet)
    - [`OrderSenderFacet`](#ordersenderfacet)
    - [`OrderSenderNativeFacet`](#ordersendernativefacet)
    - [`OrderResolverFacet`](#orderresolverfacet)
    - [`OrderBitcoinReserverFacet`](#orderbitcoinreserverfacet)
    - [`OrderBitcoinReceiverFacet`](#orderbitcoinreceiverfacet)
    - [`OrderSenderBitcoinFacet`](#ordersenderbitcoinfacet)
    - [`OrderBitcoinSenderNativeFacet`](#orderbitcoinsendernativefacet)
    - [`OrderBitcoinResolverFacet`](#orderbitcoinresolverfacet)
    - [`MulticallFacet`](#multicallfacet)
    - [`TokenPermitterFacet`](#tokenpermitterfacet)
    - [`BitStorageFacet`](#bitstoragefacet)
    - [`NativeTokenFacet`](#nativetokenfacet)
- [Development](#development)
  - [Stack](#stack)
  - [Setup](#setup)
  - [Build](#build)
  - [Test](#test)

## Description

__Flash__ is a cross-chain asset swap system based on contracts presented in this project.

### Actors

The system has four primary actors:

- _User_ - wants to swap one asset (i.e. any ERC-20 token or native currency in some cases) to another
- _Resolver_ - offers swap terms for user and then executes user-confirmed orders
- _Service_ - connects users and resolvers
- _Liquidator_ - optionally closes orders failed by resolver

The system has no admin roles on the contract level at the moment.
Some contracts accept other contract addresses or some sort of security configuration in their
constructors, that is designed to be immutable, i.e. cannot be changed by anyone once deployed.

### Order Types

Flash supports multiple order structure types:

- [`Order`](#order) - order for swapping one EVM asset to another EVM asset
- [`OrderBitcoin`](#orderbitcoin) - order for swapping EVM asset to Bitcoin

### `Order`

Order that allows _user_ to swap one EVM asset to another EVM asset with _resolver_.

#### `Order` Flow

The swap process is initiated by _user_. They enter parameters of the swap they are interested in
and pass them to the _service_. The service queries registered _resolvers_ for suitable swap
orders they can provide. _User_ reviews collected orders and picks satisfying one (or not).

Once _user_ is satisfied with an order, they sign it with the private key associated with the
address they hold asset to swap on. The required signature is of EIP-712 standard for the
[Order](./contracts/order/interfaces/Order.sol) typed data structure. Note that _user_ is "from"
actor with "from" asset, swapping to "to" asset of "to" actor, i.e. _resolver_. See the
["`Order` Structure"](#order-structure) section for more details on order structure.

After that, the signature is passed to _resolver_ so it can execute the order via the contracts.
In general, good acting _resolver_ does the following:

- receives _user_'s "from" asset on the "from" chain
- sends "to" asset on the "to" chain to _user_

If receive is not performed by _resolver_ (within deadline specified in the order), the swap is
considered cancelled. If _resolver_ receives _user_'s "from" asset, but doesn't send "to" asset
back (within another deadline) - _resolver_'s collateral becomes a subject to be slashed.

The collateral servers as insurance for orders. _Resolver_ deposits allowed collateral asset
(ERC-20 stablecoin token) into collateral manager contract. It's deposited for a specific receive
chain. Both chains keep track of collateral usage:

- "locked" counter in the receive chain: increased by collateral amount specified in the executed
  order. Order must not be executed if locked amount exceeds unlocked amount passed as field of
  _user_-signed order thus considered verified by them
- "unlocked" counter in the collateral chain: increased each time successful order execution is
  confirmed by _resolver_ by providing corresponding proofs

In order to withdraw collateral, _resolver_ must provide another proof that verifies counter value
in receive chain and that the desired withdraw amount of the collateral asset can be safely
returned without hanging any orders uninsured.

_Proof_ verifies that a certain EVM-event with specific data has indeed occurred on some chain.
The proof events are used for all swap scenarios are produced on chains where assets are received
and sent, and consumed by collateral manager.

To confirm order execution, _resolver_ must provide two proofs:

- order asset received on "from" chain
- order asset sent on "to" chain

When _resolver_ fails to send asset to _user_, the liquidation flow is first activated. In this
flow, a _liquidator_ may send their own "to" asset instead of _resolver_ to _user_. This allows
to slash collateral in favor of _liquidator_ when two proofs are provided:

- order asset received on "from" chain
- order asset sent on "to" chain by _liquidator_

When neither _resolver_ nor _liquidator_ send "to" asset, slash by _user_ is activated. In this
flow, _user_ gets _resolver_'s collateral instead of "to" asset. For doing that, "no-send" event
must be reported on "to" chain (by user or arbitrary _liquidator_) by calling corresponding method.
This allows collateral slash in favor of _user_ when two proofs are provided:

- order asset received on "from" chain
- order asset sent not sent on "to" chain

Note that _liquidator_ in this flow may call both report and slash methods. The main share of
the order collateral still goes to _user_ in this case, _liquidator_ gets rewarded for performing
two transaction with smaller collateral share as specified in the order.

For more order execution details, see info of the following contracts:

- [`OrderReceiverFacet`](#orderreceiverfacet)
- [`OrderSenderFacet`](#ordersenderfacet)
- [`OrderSenderNativeFacet`](#ordersendernativefacet)
- [`OrderResolverFacet`](#orderresolverfacet)

#### `Order` Structure

The [`Order`](./contracts/order/interfaces/Order.sol) structure has the following fields (that
must be validated in accordance with their descriptions below at least by _user_):

- `fromActor` (`address`) - _user_ address that holds the "from" asset
- `fromActorReceiver` (`address`) - _user_ address that will receive "to" asset from _resolver_
- `fromChain` (`uint256`) - [EVM chain ID](https://chainlist.org) (i.e. `block.chainid`) where
  "from" asset is
- `fromToken` (`address`) - ERC-20 token address of the "from" asset
- `fromAmount` (`uint256`) - amount of the "from" asset _user_ is giving to _resolver_
- `toActor` (`address`) - _resolver_ address that will send "to" asset to _user_ and receive
  "from" asset
- `toChain` (`uint256`) - EVM chain ID where "to" asset is
- `toToken` (`address`) - ERC-20 token address of the "to" asset
- `toAmount` (`uint256`) - amount of the "to" asset _resolver_ is giving to _user_
- `collateralReceiver` (`address`) - _user_ address that will receive "collateral" asset from
  _resolver_ in case of slash
- `collateralChain` (`uint256`) - EVM chain ID where "collateral" asset is
- `collateralAmount` (`uint256`) - amount of the "collateral" asset allocated for the swap
- `collateralRewardable` (`uint256`) - amount of the "collateral" asset that is allowed to be
  used from `collateralAmount` amount as reward for "no-send" report _liquidator_. Logically
  expected to be significantly less than `collateralAmount`, but technically can be as large
  (which sends 100% of order collateral to "no-send" _liquidator_ - unlikely desired by _user_)
- `deadline` (`uint256`) - timestamp in seconds (i.e. `block.timestamp`) after which _user_'s
  "from" asset can no longer be received by _resolver_ using this order
- `timeToSend` (`uint256`) - time in seconds that is added to `deadline` to get send deadline.
  After the send deadline _resolver_ will not be able to send "to" asset to _user_ using method
  exclusive to them - asset send becomes subject to liquidation by arbitrary _liquidator_
- `timeToLiqSend` (`uint256`) - time in seconds that is added to `deadline` and `timeToSend`
  to get liquidation send deadline. After the liquidation send deadline no _liquidator_ will be
  able to send "to" asset to _user_ - order collateral becomes subject to be slashed by _user_
- `nonce` (`uint256`) - a _resolver_-assigned value that:
  - makes every order hash (and hence EIP-712 signature) unique
  - prevents order from executing twice - nonce usage is tracked in "from", "to", and "collateral"
    chains
  - must be unique per `toActor` - prevents nonce conflicts between _resolvers_ thus allowing each
    of them to assign nonces sequentially (which has gas benefits due to how nonce usage info is
    stored)

### `OrderBitcoin`

Order that allows _user_ to swap their EVM asset to Bitcoin with _resolver_ or vise versa.

#### `OrderBitcoin` Flow

Similarly to [`Order` flow](#order-flow), swap process is initiated by _user_ entering params and
_resolvers_ are queried by the _service_. For activating the Bitcoin flow, _user_ should select
"from" or "to" asset to be Bitcoin, which returns `OrderBitcoin` structure instead of `Order` to
review by _user_ and provide their EIP-712 signature.

The `OrderBitcoin` structure extends `Order`, but some of the fields reflect the Bitcoin part.
Bitcoin chain is assigned to a specific constant which is selected during deployment (doesn't
conflict with other EVM chain IDs) and number of amount decimals (which is `8` for Bitcoin).
This applies to:

- `fromChain`, `fromToken`, `fromAmount` - when Bitcoin is sent by _user_ in exchange for
  _resolver_'s EVM asset
- `toChain`, `toToken`, `toAmount` - when Bitcoin is sent by _resolver_ in exchange for
  _user_'s EVM asset
- `collateralAmount`, `collateralRewardable` - when WBTC token-based collateral manager
  is used for the swap (which is currently always true for Bitcoin orders)

When "send" part of the order should be performed on Bitcoin chain (i.e. Bitcoin is "to" asset),
related fields should be configured accordingly:

- `timeToSend` - deadline to send Bitcoin starting at `createdAtBitcoin` time
- `timeToLiqSend` - unused, since send by _liquidator_ is not supported on Bitcoin chain.
  Preferred to be `0` for explicitness

When "receive" part of the order is on Bitcoin chain (Bitcoin is "from"), `timeToSend` role
is taken by new `timeToReceiveBitcoin` field (starting from `createdAtBitcoin` as well).
Note that Bitcoin transactions must be exactly between start and deadline of the period,
otherwise they are not possible to submit to proofer and may be considered non-existent.

Last two new fields added to order are `fromActorBitcoin` and `toActorBitcoin`. Depending on
the order direction, these have the following meanings and rules:

- _User's Bitcoin "from" <-> Resolver's EVM "to"_
  - `fromActorBitcoin` - Bitcoin address of _user_ (`fromActor`). Can be a special constant
    indicating that send from any address is allowed for _user_
  - `toActorBitcoin` - Bitcoin address of the _resolver_ (`toActor`). When `fromActorBitcoin`
    is the "any" address constant, _resolver_'s address is required to be unique among other orders

- _User's EVM "from" <-> Resolver's Bitcoin "to"_
  - `fromActorBitcoin` - Bitcoin address of the _user_ (`fromActor`). "Any" address is not allowed
  - `toActorBitcoin` - Bitcoin address of the _resolver_ (`toActor`). Not required to be unique
    among other orders

After order formation, the order execution steps depend on the swap direction:

- _User's Bitcoin "from" <-> Resolver's EVM "to"_

  Before _user_ send their Bitcoin, it's important to ensure there is sufficient collateral
  reserved for the order on _resolver_ side. To do that, _user_ (at least) monitors collateral
  chain for collateral lock status by _resolver_ in the Bitcoin reserver sub-contract (facet of
  the main contract). This is done via querying view method with the current order hash as param.
  Once state changed to "locked", _user_ is safe to send their Bitcoin to _resolver_.

  Note that locking collateral for Bitcoin order requires signature of the order by _user_,
  which is used to verify unlocked collateral amount (included into the signed order).

  After _resolver_ received Bitcoin from _user_, they call send method specialized for `OrderBitcoin`
  orders on "to" chain exactly like it's done for "to" part of `Order` flow. Note that send by
  _liquidator_ is available in this case too, as well as "no-send" reporting. The "send" event
  proofs are delivered to order resolver in order to unlock collateral.

  In order to proof receive event, _resolver_ or any other actor should submit transfer data to
  Bitcoin proof verifier contract. If not submitted, then "no-receive" is considered to be true
  after time specified by `createdAtBitcoin` + `timeToReceiveBitcoin` + `timeToSubmitBitcoin`
  elapsed. With "no-receive" proof on their hands, _resolver_ can unlock previously locked
  collateral, essentially cancelling the order due to inaction on _user_ part.

  If _resolver_ decides to receive _user_'s Bitcoin and don't perform any send nor report the
  transfer by _user_, they risk a third party actor to still report the transfer. It may be at
  least the _user_ themself (should be warned about "time dependent _transaction_ may be needed"
  in advance). In case of such a report situation the _resolver_ becomes subject to collateral
  slash ("receive" + "no-send" proofs available).

  At the same time, _resolver_ is interested in reporting _user_'s Bitcoin transfer on their own
  when they are conscientious and going to send "to" asset to _user_. This is due to the fact that
  otherwise no "receive" proof will be available to successfully unlock order collateral.

- _User's EVM "from" <-> Resolver's Bitcoin "to"_

  Reverse Bitcoin flow starts in the same way as for `Order`, except _resolver_ is using
  `OrderBitcoin`-dedicated method for receiving _user_ asset on "from" EVM chain. Once the
  asset is received, _resolver_ sends their Bitcoin.

  Here _resolver_ is interested in reporting their Bitcoin send transfer on the Bitcoin collateral
  chain as soon as possible. If time specified by `createdAtBitcoin` + `timeToSend` elapsed and
  no transfer reported, "no-send" proof becomes available, making the order collateral slashable
  (_resolver_ did receive _user_'s EVM asset on "from" chain).

  Only "send" and "no-send" proofs are available, the _liquidation_ flow is not possible for this
  direction of the Bitcoin order. All the proofs are delivered to the order resolver sub-contract
  via `OrderBitcoin`-specialized methods.

For more Bitcoin order execution details, see info of the following contracts:

- [`OrderBitcoinReserverFacet`](#orderbitcoinreserverfacet)
- [`OrderBitcoinReceiverFacet`](#orderbitcoinreceiverfacet)
- [`OrderBitcoinSenderFacet`](#orderbitcoinsenderfacet)
- [`OrderBitcoinSenderNativeFacet`](#orderbitcoinsendernativefacet)
- [`OrderBitcoinResolverFacet`](#orderbitcoinresolverfacet)

#### `OrderBitcoin` Structure

The [`OrderBitcoin`](./contracts/order-bitcoin/interfaces/OrderBitcoin.sol) structure is used in
methods for conducting swaps from EVM chain to Bitcoin and vice versa. The structure extends
[`Order`](#order-structure) fields providing several new ones:

- `fromActorBitcoin` (`string`) - _user_ address on Bitcoin chain to send Bitcoin from or receive
  it to (depending on order direction). Can be a special constant indicating that any address is
  allowed for orders where Bitcoin is sent from _user_ to _resolver_
- `toActorBitcoin` (`string`) - _resolver_ address on Bitcoin chain where Bitcoin will be sent
  from or to (depending on order direction). When _user_ Bitcoin address is specified as "any"
  in the order, this address must be unique (otherwise [Bitcoin reserver](#orderbitcoinreserverfacet)
  lock call will fail)
- `createdAtBitcoin` (`uint256`) - creation time of the Bitcoin order. Used in Bitcoin transaction
  verification, not allowing transactions to be earlier than this time. Transactions also have
  end time after which they are considered unfulfilled - `timeToReceiveBitcoin` or `timeToSend` is
  added depending on order direction
- `timeToReceiveBitcoin` (`uint256`) - specifies deadline to receive Bitcoin, i.e. time for _user_
  to send Bitcoin to specified _resolver_ address
- `timeToSubmitBitcoin` (`uint256`) - specifies time to submit Bitcoin transaction by _user_
  after the receive phase, i.e. total time to submit the Bitcoin receive is `createdAtBitcoin` +
  `timeToReceiveBitcoin` + `timeToSubmitBitcoin`

### Contracts

The main contract of Flash project is a [ERC-2535 `Diamond`](https://eips.ethereum.org/EIPS/eip-2535)
proxy based on standard author's [reference implementation](./contracts/diamond/README.md).
Besides cut & ownership facets provided by this implementation, Flash adds own facets
providing various functionality that are added to the diamond, as well as some standalone
contracts that are referenced by the facets. Details for each used contract are down below.

_Note:_ facet contracts can be distinguished by the `Facet` suffix in their name

#### `OrderReceiverFacet`

_Description_

Serves for receiving _user_ assets. References [`ICollateralLocker`](./contracts/collateral/interfaces/ICollateralLocker.sol)
compatible contract for tracking if _resolver_ is eligible for starting the order execution,
i.e. if collateral counter is sufficient.

_Interface_

[`IOrderReceiver.sol`](./contracts/order/interfaces/IOrderReceiver.sol)

_Implementation_

[`OrderReceiverFacet.sol`](./contracts/order/OrderReceiverFacet.sol)

_Write_

- `receiveOrderAsset(Order calldata order, bytes32 fromSigR, bytes32 fromSigVs)`

  Receives _user_'s "from" asset in amount and sends it to the "to" actor address as specified
  in `order`. Can only be called by "to" actor specified in `order`. Cannot be called after
  `deadline` time specified in order exceeded. Requires valid "from" actor compact signature -
  `fromSigR`, `fromSigVs` params. Sufficiency of collateral is checked via referenced collateral
  locker using order's `collateralAmount` & `collateralUnlocked` fields. When execution is
  successful, emits the `AssetReceive` event with first topic being the order hash, which allows
  to proof "from" asset receive for the order. Receive is marked as performed for `order` in
  storage (readable via `orderAssetReceived` view) and the method cannot be called again with it.

  Errors:

  - `OrderReceiveExpired` - receive deadline specified by order exceeded
  - `ReceiveChainMismatch` - receive called on chain that differs from order's "from" chain
  - `ReceiveCallerMismatch` - receive called by account that differs from order's "to" actor
  - `OrderAlreadyReceived` - receive operation has already been called for the order
  - `InvalidSignature` - restored signer of the order signature mismatch the "from" actor
  - `UnauthorizedLockAccess` - "to" actor hasn't approved collateral locker contract on current chain
  - `LockRefusal` - order cannot be executed due to insufficient unlocked collateral
    amount according to order's reported unlocked amount and receive chain locked counter

_Read_

- `orderAssetReceived(bytes32 orderHash)` -> `bool`

  Returns `true` if `receiveOrderAsset` method has been successfully called for order with
  hash specified by `orderHash` parameter, or `false` otherwise.

- `receiverCollateralLocker()` -> [`ICollateralLocker`](./contracts/collateral/interfaces/ICollateralLocker.sol)

  Returns address of `ICollateralLocker`-compatible contract that is being used by this
  `OrderReceiverFacet`.

#### `OrderSenderFacet`

_Description_

Serves for sending assets to _user_. This contract supports both sending by _resolver_ and
_liquidator_, as well as "no-send" reporting in case of complete inaction of both parties.

_Interface_

[`IOrderSender.sol`](./contracts/order/interfaces/IOrderSender.sol)

_Implementation_

[`OrderSenderFacet.sol`](./contracts/order/OrderSenderFacet.sol)

_Write_

- `sendOrderAsset(Order calldata order)`

  Sends _resolver_'s "to" asset in amount and to the "from" actor address as specified in `order`.
  Can only be called by "to" actor specified in the order. The method is not allowed to be called
  after the send deadline, calculated as order's `deadline` + `timeToSend`. When succeeds, the
  `AssetSend` event is emitted, having hash of the swap as first topic for proofing. The _resolver_
  is not interested in modifying the order since otherwise different hash will be produced not
  matching the original swap hash in the receive proof - which is a requirement for swap
  confirmation in collateral unlocker. Send is marked as performed for `order` in storage
  (readable via `orderAssetSent` view) and the method cannot be called again with it (along with
  other send methods).

  Errors:

  - `OrderSendExpired` - send deadline specified by order exceeded
  - `SendChainMismatch` - send called on chain that differs from order's "to" chain
  - `SendCallerMismatch` - send called by account that differs from order's "to" actor
  - `OrderAlreadySent` - send operation has already been called for the order

- `sendOrderLiqAsset(Order calldata order)`

  Sends _liquidator_'s "to" asset in amount and to the "from" actor address as specified in `order`.
  Anyone can be the _liquidator_ caller of this method. The method becomes available once send
  deadline is exceeded and until liquidation send deadline is reached, calculated as order's
  `deadline` + `timeToSend` + `timeToLiqSend` and `sendOrderAsset` has not been called by
  _resolver_. When succeeds, the `AssetLiqSend` event is emitted, having hash of the concatenation
  of the swap hash combined with _liquidator_ address as first topic for proofing. The _liquidator_
  is not interested in modifying the order since otherwise a different hash will be produced not
  matching the original swap hash in the receive proof - which is a requirement for obtaining
  _resolver_'s slashed collateral in collateral unlocker. Send is marked as performed for `order`
  in storage (readable via `orderAssetSent` view) and the method cannot be called again with it.

  Errors:

  - `OrderLiqSendExpired` - liquidation send deadline specified by order exceeded
  - `OrderLiqSendUnreached` - send deadline specified by order is not exceeded yet
  - `SendChainMismatch` - liquidation send called on chain that differs from order's "to" chain
  - `OrderAlreadySent` - send operation has already been called for the order

- `reportOrderNoSend(Order calldata order)`

  Provides proof of the fact that asset has not been sent by any party of the swap flow.
  Becomes available once liquidation send deadline is exceeded and neither `sendOrderAsset` nor
  `sendOrderLiqAsset` has been called. When succeeds, the `AssetNoSend` event is emitted, having
  hash of the concatenation of the swap hash combined with caller ("reporter" _liquidator_)
  address as first topic for proofing. Anyone is allowed to call this method, the calling
  _liquidator_ is not interested in modifying the order since otherwise different hash will be
  produced not matching the original wap hash in the receive proof - which is requirement for
  sending collateral to _user_ and obtaining its reward-designated part for the _liquidator_.

  Errors:

  - `OrderNoSendUnreached` - liquidation send deadline specified by order is not exceeded yet
  - `SendChainMismatch` - no-send report called on chain that differs from order's "to" chain
  - `OrderAlreadySent` - send (or its liquidation variant) operation has already been called
    for the order.

_Read_

- `orderAssetSent(bytes32 orderHash)` -> `bool`

  Returns `true` if `sendOrderAsset` or `sendOrderLiqAsset` method has been successfully called
  for order with hash specified by `orderHash` parameter, or `false` otherwise.

- `orderLiquidator(bytes32 orderHash)` -> `address`

  Returns address of `sendOrderLiqAsset` caller, i.e. _liquidator_. Zero address is returned if
  `sendOrderLiqAsset` has not been called. Note that this value may only change while
  `orderAssetSent` view returns `false` and order liquidation send call deadline
  (i.e. `deadline` + `timeToSend` + `timeToLiqSend` and `sendOrderAsset`) is not reached.

#### `OrderSenderNativeFacet`

_Description_

Extension for [`OrderSenderFacet`](#ordersenderfacet) contract that allows _resolver_ or
_liquidator_ to send native "to" asset to _user_.

_Interface_

[`IOrderSenderNative.sol`](./contracts/order/interfaces/IOrderSenderNative.sol)

_Implementation_

[`OrderSenderNativeFacet.sol`](./contracts/order/OrderSenderNativeFacet.sol)

_Dependencies_

- [`OrderSenderFacet`](#ordersenderfacet)
- [`NativeTokenFacet`](#nativetokenfacet)

_Write_

- `sendOrderAssetNative(Order calldata order)`

  Works in the same way as `sendOrderAsset` method of `OrderSenderFacet`, except adds an extra
  step that unwraps native token received from _resolver_ and sends unwrapped native currency
  to _user_. Note that native token address in use can be obtained via `nativeToken` view method
  of [`NativeTokenFacet`](#nativetokenfacet) dependency.

  Errors:

  - `OrderSendNotNative` - "to" asset address specified in order is not set to special constant
    reserved for native

- `sendOrderLiqAssetNative(Order calldata order)`

  Works in the same way as `sendOrderLiqAsset` method of `OrderSenderFacet`, except adds an extra
  step that unwraps native token received from _liquidator_ and sends unwrapped native currency
  to _user_. Note that native token address in use can be obtained via `nativeToken` view method
  of [`NativeTokenFacet`](#nativetokenfacet) dependency.

  Errors:

  - `OrderSendNotNative` - "to" asset address specified in order is not set to special constant
    reserved for native

#### `OrderResolverFacet`

_Description_

Serves for finalizing order execution and management of collateral associated with it. Primarily
_resolver_ successfully confirms order execution, or its collateral is slashed in favour of order
_liquidator_ or _user_. The collateral management is done via referenced
[`ICollateralUnlocker`](./contracts/collateral/interfaces/ICollateralUnlocker.sol) and
[`IProofVerifier`](./contracts/proof/interfaces/IProofVerifier.sol) contracts.

_Interface_

[`IOrderResolver.sol`](./contracts/order/interfaces/IOrderResolver.sol)

_Implementation_

[`OrderResolverFacet.sol`](./contracts/order/OrderResolverFacet.sol)

_Write_

- `confirmOrderAssetSend(Order calldata order, bytes calldata receiveProof, bytes calldata sendProof)`

  Method primarily used by _resolver_ (but allowed to be called by anyone) to confirm successful
  `order` execution. The confirmation releases `collateralAmount` associated with the order in
  collateral unlocker making it usable for further orders or withdraw. The order hash is calculated
  and expected to be presented in both valid proofs for verifying its integrity: `receiveProof` of
  `AssetReceive` event on "from" chain and `sendProof` of `AssetSend` event on "to" chain.
  Marks order resolution in storage (readable via `orderResolved` view). Emits
  `OrderSendConfirm(bytes32 orderHash)` event on success for informational purposes.

  Errors:

  - `CollateralChainMismatch` - confirm called on chain that differs from order's "collateral" chain
  - `OrderAlreadyResolved` - confirm called for order that has already been resolved
  - `UnauthorizedUnlockAccess` - "to" actor hasn't approved collateral unlocker contract on current chain
  - a proof verifier specific error - when proof is not valid

- `slashOrderLiqCollateral(Order calldata order, address liquidator, bytes calldata receiveProof, bytes calldata liqSendProof)`

  Method used by _liquidator_ (or any other helper account) to slash _resolver_ collateral
  allocated for `order` in _liquidator_'s favor as compensation after sending own "to" asset
  to _user_. The order hash is calculated and expected to be presented in valid `receiveProof`
  of `AssetReceive` event on "from" chain. The hash is then combined with `liquidator` address
  and hashed again - this time expected to be in valid `liqSendProof` of `AssetLiqSend` event on
  "to" chain. Full amount (as specified in order) of collateral asset is sent to `liquidator`
  address. Marks order resolution in storage (readable via `orderResolved` view). Emits
  `OrderCollateralSlash(bytes32 orderHash)` event for informational purposes.

  Errors:

  - `CollateralChainMismatch` - slash called on chain that differs from order's "collateral" chain
  - `OrderAlreadyResolved` - slash called for order that has already been resolved
  - `UnauthorizedUnlockAccess` - "to" actor hasn't approved collateral unlocker contract on current chain
  - a proof verifier specific error - when proof is not valid

- `slashOrderCollateral(Order calldata order, address reporter, bytes calldata receiveProof, bytes calldata noSendProof)`

  Method user by _user_ (or any other account, including _liquidator_ helper) to slash _resolver_
  collateral allocated for `order` in _user_'s favor as compensation after "from" asset was
  received from them and nothing was sent as "to" asset by any party of the flow. The order hash
  is calculated and expected to be presented in valid `receiveProof` of `AssetReceive` event on
  "from" chain. The hash is then combined with `reporter` address (which is _user_ address if user
  called "no-send" report on their own or _liquidator_ helper address if it was their transaction)
  and hashed again - this time expected to be in valid `noSendProof` of `AssetNoSend` event on "to"
  chain. Full amount (as specified in order) of collateral asset is sent to _user_ address if
  `reporter` matches their address or no reward specified in the order, alternatively the
  rewardable share of the collateral is sent to the `reporter`. Marks order resolution in storage
  (readable via `orderResolved` view). Emits `OrderCollateralSlash(bytes32 orderHash)` event for
  informational purposes.

  Errors:

  - `CollateralChainMismatch` - slash called on chain that differs from order's "collateral" chain
  - `OrderAlreadyResolved` - slash called for order that has already been resolved
  - `UnauthorizedUnlockAccess` - "to" actor hasn't approved collateral unlocker contract on current chain
  - a proof verifier specific error - when proof is not valid

_Read_

- `orderResolved(bytes32 orderHash)` -> `bool`

  Returns `true` if order with specified `orderHash` has been resolved, i.e. one of `confirmOrderAssetSend`,
  `slashOrderLiqCollateral`, or `slashOrderCollateral` method has been successfully called for it,
  or `false` otherwise.

- `resolverCollateralUnlocker()` -> [`ICollateralUnlocker`](./contracts/collateral/interfaces/ICollateralUnlocker.sol)

  Returns address of `ICollateralUnlocker`-compatible contract that is being used by this
  `OrderResolverFacet`.

- `resolverProofVerifier()` -> [`IProofVerifier`](./contracts/proof/interfaces/IProofVerifier.sol)

  Returns address of `IProofVerifier`-compatible contract that is being used by this
  `OrderResolverFacet`.

#### `OrderBitcoinReserverFacet`

_Description_

Provides collateral pre-lock functionality for _resolver_ so collateral sufficiency can be
verified by _user_ before transferring their Bitcoin to _resolver_ via referenced
[`ICollateralLocker`](./contracts/collateral/interfaces/ICollateralLocker.sol) contract.
The contract also references [`IProofVerifier`](./contracts/proof/interfaces/IProofVerifier.sol)
for unlocking _resolver_ collateral when _user_ doesn't send Bitcoin.

_Interface_

[`IOrderBitcoinReserver.sol`](./contracts/order-bitcoin/interfaces/IOrderBitcoinReserver.sol)

_Implementation_

[`OrderBitcoinReserverFacet.sol`](./contracts/order-bitcoin/OrderBitcoinReserverFacet.sol)

_Write_

- `lockOrderBitcoinCollateral(OrderBitcoin calldata order, bytes32 fromSigR, bytes32 fromSigVs)`

  Locks _resolver_ collateral for specified `order`, where _user_ sends Bitcoin and receives EVM
  asset from _resolver_. The lock can only be called by _resolver_ on `collateralChain` and
  requires signature (`fromSigR` & `fromSigVs` params) of the order by _user_. When collateral
  sufficiency is verified, the lock state is updated in the storage, which is readable via
  `orderBitcoinCollateralState` view. _User_ must observe this view, and send their Bitcoin to
  _resolver_ only after successful lock detected (view result changes from "pending" to "locked").
  The lock call is restricted on time with `deadline` field of the order. Note that _resolver_
  can unlock the collateral if _user_ didn't send Bitcoin (or it was not reported) with
  `unlockOrderBitcoinCollateral` call. The lock can only be performed once for an order.
  _Resolver_'s "to" address on Bitcoin (i.e. `toActorBitcoin`) will be checked for usage
  uniqueness if _user_ Bitcoin address (`fromActorBitcoin`) is assigned a special constant value
  indicating "transaction from any address". The fact of the address usage will be saved to storage
  and can be checked via `bitcoinAddressUsedOrder` view. Emits `BitcoinCollateralLock(bytes32 orderHash)`
  event on success for informational purposes.

  Errors:

  - `BitcoinLockExpired` - lock deadline specified by order exceeded
  - `BitcoinLockChainMismatch` - lock called on chain that is not the "collateral" one specified
    in the order
  - `BitcoinLockerMismatch` - lock called by actor different from "to" actor of the order
    (i.e. not by _resolver_)
  - `BitcoinLockRefusal` - lock cannot be performed due to incorrect state for the order
    (currently in "locked" or "unlocked" state)
  - `BitcoinAddressUsed` - `toActorBitcoin` address of the order already used but expected to be
    unique due to send from any address specified in `fromActorBitcoin` field
  - `UnauthorizedLockAccess` - "to" actor hasn't approved collateral locker contract on current chain

- `unlockOrderBitcoinCollateral(OrderBitcoin calldata order, bytes calldata noReceiveProof)`

  Unlocks _resolver_ collateral for specified `order` that was locked by `lockOrderBitcoinCollateral`
  before. This method is designed for the case when _user_ didn't send Bitcoin to _resolver_ as the
  fist step of the swap to EVM asset within deadline specified as `createdAtBitcoin` +
  `timeToReceiveBitcoin` (and additional `timeToSubmitBitcoin` time for safety) which is verified
  by checking `noReceiveProof` validity. The method cancels the lock and makes _resolver_
  collateral usable for other orders. The unlock changes state from "locked" to "unlocked" which
  is reflected in `orderBitcoinCollateralState` view. Re-locking for order from "unlocked" state
  is not possible. Emits `BitcoinCollateralUnlock(bytes32 orderHash)` event on success for
  informational purposes.

  Errors:

  - `BitcoinUnlockRefusal` - unlock cannot be performed due to incorrect state for the order
    (currently in "pending" or "unlocked" state)
  - `UnauthorizedLockAccess` - "to" actor hasn't approved collateral locker contract on current chain
  - a proof verifier specific error - when `noReceiveProof` is not a valid proof

_Read_

- `orderBitcoinCollateralState(bytes32 orderHash)` -> [`BitcoinCollateralState`](./contracts/order-bitcoin/interfaces/BitcoinCollateralState.sol)

  Returns state of Bitcoin collateral locking for order corresponding to `orderHash` parameter.
  Each state is an enum member with corresponding meaning:
  - `Pending` - no lock committed for order, may change to `Locked` due to lock call by _resolver_
  - `Locked` - collateral is locked for order, may change to `Unlocked` by _resolver_ if they can
    proof there was no Bitcoin transaction by _user_, otherwise can be considered terminal state
  - `Unlocked` - collateral was locked and then successfully unlocked for order, terminal state

- `bitcoinAddressUsedOrder(string calldata bitcoinAddress)` -> `bytes32`

  Returns order hash that `bitcoinAddress` is used as unique `toActorBitcoin` address for.
  Zero bytes are returned if there is no such associated order with the address.

- `bitcoinReserverCollateralLocker()` -> [`ICollateralLocker`](./contracts/collateral/interfaces/ICollateralLocker.sol)

  Returns address of `ICollateralLocker`-compatible contract that is being used by this
  `OrderBitcoinReserverFacet`.

- `bitcoinReserverProofVerifier()` -> [`IProofVerifier`](./contracts/proof/interfaces/IProofVerifier.sol)

  Returns address of `IProofVerifier`-compatible contract that is being used by this
  `OrderBitcoinReserverFacet`.

#### `OrderBitcoinReceiverFacet`

_Description_

Extends [`OrderReceiverFacet`](#orderreceiverfacet) facet for receiving _user_ "EVM"
assets in Bitcoin orders. References [`ICollateralLocker`](./contracts/collateral/interfaces/ICollateralLocker.sol)
compatible contract for tracking if _resolver_ is eligible for starting the order execution,
i.e. if collateral counter is sufficient.

_Interface_

[`IOrderBitcoinReceiver.sol`](./contracts/order-bitcoin/interfaces/IOrderBitcoinReceiver.sol)

_Implementation_

[`OrderBitcoinReceiverFacet.sol`](./contracts/order-bitcoin/OrderBitcoinReceiverFacet.sol)

_Dependencies_

- [`OrderReceiverFacet`](#orderreceiverfacet)

_Write_

- `receiveOrderBitcoinAsset(OrderBitcoin calldata order, bytes32 fromSigR, bytes32 fromSigVs)`

  Works exactly as `receiveOrderAsset` method of [`OrderReceiverFacet`](#orderreceiverfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter. Expected to be called
  as a first step when _user_'s EVM asset is swapped to _resolver_'s Bitcoin.

_Read_

- `bitcoinReceiverCollateralLocker()` -> [`ICollateralLocker`](./contracts/collateral/interfaces/ICollateralLocker.sol)

  Returns address of `ICollateralLocker`-compatible contract that is being used by this
  `OrderBitcoinReceiverFacet`.

#### `OrderSenderBitcoinFacet`

_Description_

Extends [`OrderSenderFacet`](#ordersenderfacet) facet for sending "EVM" asset to _user_ assets
in Bitcoin orders by _resolver_ and _liquidator_, as well as "no-send" reporting in case of
complete inaction of both parties.

_Interface_

[`IOrderBitcoinSender.sol`](./contracts/order-bitcoin/interfaces/IOrderBitcoinSender.sol)

_Implementation_

[`OrderBitcoinSenderFacet.sol`](./contracts/order-bitcoin/OrderBitcoinSenderFacet.sol)

_Dependencies_

- [`OrderSenderFacet`](#ordersenderfacet)

_Write_

- `sendOrderBitcoinAsset(OrderBitcoin calldata order)`

  Works exactly as `sendOrderAsset` method of [`OrderSenderFacet`](#ordersenderfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter. Expected to be
  called as a second step when _user_'s Bitcoin is swapped to EVM asset of _resolver_.

- `sendOrderBitcoinLiqAsset(OrderBitcoin calldata order)`

  Works exactly as `sendOrderLiqAsset` method of [`OrderSenderFacet`](#ordersenderfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

- `reportOrderBitcoinNoSend(OrderBitcoin calldata order)`

  Works exactly as `reportOrderNoSend` method of [`OrderSenderFacet`](#ordersenderfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

#### `OrderBitcoinSenderNativeFacet`

_Description_

Extension for [`OrderBitcoinSenderFacet`](#orderbitcoinsenderfacet) contract that allows
_resolver_ or _liquidator_ to send native "to" asset to _user_.

_Interface_

[`IOrderBitcoinSenderNative.sol`](./contracts/order-bitcoin/interfaces/IOrderBitcoinSenderNative.sol)

_Implementation_

[`OrderBitcoinSenderNativeFacet.sol`](./contracts/order-bitcoin/OrderBitcoinSenderNativeFacet.sol)

_Dependencies_

- [`OrderBitcoinSenderFacet`](#orderbitcoinsenderfacet)
- [`NativeTokenFacet`](#nativetokenfacet)

_Write_

- `sendOrderBitcoinAssetNative(OrderBitcoin calldata order)`

  Works exactly as `sendOrderAssetNative` method of [`OrderSenderNativeFacet`](#ordersendernativefacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

- `sendOrderBitcoinLiqAssetNative(OrderBitcoin calldata order)`

  Works exactly as `sendOrderLiqAssetNative` method of [`OrderSenderNativeFacet`](#ordersendernativefacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

#### `OrderBitcoinResolverFacet`

_Description_

Extension for [`OrderResolverFacet`](#orderresolverfacet) that supports collateral
resolving for Bitcoin order structure via referenced
[`ICollateralUnlocker`](./contracts/collateral/interfaces/ICollateralUnlocker.sol) and
[`IProofVerifier`](./contracts/proof/interfaces/IProofVerifier.sol) contracts.

_Interface_

[`IOrderBitcoinResolver.sol`](./contracts/order-bitcoin/interfaces/IOrderBitcoinResolver.sol)

_Implementation_

[`OrderBitcoinResolverFacet.sol`](./contracts/order-bitcoin/OrderBitcoinResolverFacet.sol)

_Dependencies_

- [`OrderResolverFacet`](#orderresolverfacet)

_Write_

- `confirmOrderBitcoinAssetSend(OrderBitcoin calldata order, bytes calldata receiveProof, bytes calldata sendProof)`

  Works exactly as `confirmOrderAssetSend` method of [`OrderResolverFacet`](#orderresolverfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

- `slashOrderBitcoinLiqCollateral(OrderBitcoin calldata order, address liquidator, bytes calldata receiveProof, bytes calldata liqSendProof)`

  Works exactly as `slashOrderLiqCollateral` method of [`OrderResolverFacet`](#orderresolverfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

- `slashOrderBitcoinCollateral(OrderBitcoin calldata order, address reporter, bytes calldata receiveProof, bytes calldata noSendProof)`

  Works exactly as `slashOrderCollateral` method of [`OrderResolverFacet`](#orderresolverfacet),
  except accepts `OrderBitcoin` struct instead of `Order` as `order` parameter.

_Read_

- `bitcoinResolverCollateralUnlocker()` -> [`ICollateralUnlocker`](./contracts/collateral/interfaces/ICollateralUnlocker.sol)

  Returns address of `ICollateralUnlocker`-compatible contract that is being used by this
  `OrderBitcoinResolverFacet`.

- `bitcoinResolverProofVerifier()` -> [`IProofVerifier`](./contracts/proof/interfaces/IProofVerifier.sol)

  Returns address of `IProofVerifier`-compatible contract that is being used by this
  `OrderBitcoinResolverFacet`.

#### `MulticallFacet`

_Description_

Provides functionality for calling multiple methods of the main contract in one transaction.

_Implementation_

[`MulticallFacet.sol`](./contracts/utils/MulticallFacet.sol)

_Write_

- `multicall(bytes[] calldata data)` -> `bytes[] memory`

  Performs multiple calls to main contract encoded in `data` param.
  If any of the calls reverts, entire `multicall` method reverts.
  Returns list of corresponding result data.

#### `TokenPermitterFacet`

_Description_

Provides functionality of converting signed permit to main contract allowance. Usually the permit
calls are combined with a primary method the allowance is needed for via multicall.

_Interface_

[`ITokenPermitter.sol`](./contracts/permit/interfaces/ITokenPermitter.sol)

_Implementation_

[`TokenPermitterFacet.sol`](./contracts/permit/TokenPermitterFacet.sol)

_Write_

- `permit(address from, address token, uint256 amount, uint256 deadline, bytes32 r, bytes32 vs)`

  Adds `amount` allowance of `token` to the main contract using default ERC-2612 flow.
  The `r` & `vs` parameters are permit compact signature by `from` account. Permit verification
  is performed by the token, and may fail primarily due to nonce mismatch, `deadline` exceeded, or
  invalid signature provided.

- `permitDai(address from, address token, bool allowed, uint256 deadline, bytes32 r, bytes32 vs)`

  Sets enabled state (`allowed`) of `token` to the main contract using legacy DAI token permit
  implementation flow. The `r` & `vs` parameters are permit compact signature by `from` account.
  Permit verification is performed by the token, and may fail primarily due to nonce mismatch,
  `deadline` exceeded, or invalid signature provided.

- `permitUniswap(address from, address token, uint256 amount, uint256 deadline, bytes calldata signature)`

  Adds `amount` allowance of `token` to the main contract using `permitTransferFrom` of Uniswap's
  [Permit2](https://github.com/Uniswap/permit2) flow. The `signature` must be provided by `from`
  account. Note that nonce is calculated as hash `token`, `from`, `amount`, `deadline`, and main
  contract address, unlike using counters as in other permit flows. Also this flow requires `from`
  account to preliminary approve `token` for the Permit2 contract.

#### `BitStorageFacet`

_Description_

Provides ability to observe presence of hash records in storage of main contract.
These records are created for all important contract events with the hash key of
record being the first topic of the event.

_Interface_

[`IBitStorageFacet.sol`](./contracts/storage/interfaces/IBitStorageFacet.sol)

_Implementation_

[`BitStorageFacet.sol`](./contracts/storage/BitStorageFacet.sol)

_Read_

- `hasHashStore(bytes32 hash)` -> `bool`

  Returns `true` if event with `hash` topic has been emitted in this contract, or `false` if not,
  including possibility of "not yet" - the finalization depends on logic of emitting a specific
  event.

#### `NativeTokenFacet`

_Description_

Provides information on which ERC-20 token is used as native currency wrapper on current chain.

_Interface_

[`INativeTokenFacet.sol`](./contracts/native/interfaces/INativeTokenFacet.sol)

_Implementation_

[`NativeTokenFacet.sol`](./contracts/native/NativeTokenFacet.sol)

_Read_

- `nativeToken()` -> [`IERC20Native`](./contracts/native/interfaces/IERC20Native.sol)

  Returns address of `IERC20Native`-compatible token contract that is used for wrapping/unwrapping
  native currency on current chain.

## Development

### Stack

This project uses the following stack:

- Language: Solidity v0.8.24
- Framework: Hardhat
- Node.js: v22.2
- Yarn: v4.5

Solidity runtime dependencies:

- `@openzeppelin/contracts` v5.0.2

### Setup

Initialize dependencies of the project:

- `yarn install` (or `yarn`)

### Build

Build all smart contracts of the project:

- `yarn build` (or `yarn b`)

### Test

Run smart contract tests:

- `yarn test` (or `yarn t`)

_Note:_ Automatically performs [build](#build) step prior the run
