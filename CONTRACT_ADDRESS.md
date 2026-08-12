# GenClaim Deployed Smart Contract Address & Architecture

## Contract Information

- **Contract Name**: `GenClaim` (Intelligent Contract)
- **Contract Class**: `GenClaim` (inherits from `gl.Contract`)
- **Contract Address**: `0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7`
- **Network**: GenLayer Studionet (`studionet`)
- **GenLayer SDK Version**: `v0.2.16` (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`)
- **Contract Source File**: [`genclaim_contract.py`](./genclaim_contract.py)

---

## Security Architecture & Fixes

1. **Payable & Backed Premiums**:
   - `buy_policy` is decorated with `@gl.public.write.payable`.
   - Requires `gl.message.value > 0`. A policy cannot be registered without transferring actual native tokens (`GEN`) with the transaction.
2. **Immutable Holder-Bound Policies**:
   - Rejects registration if a policy for `flight_id` already exists (`policies[flight_id] > 0`).
   - Immutably binds `policy_holders[flight_id]` to `gl.message.sender_address`.
3. **Authoritative Evidence (Anti-Spoofing)**:
   - `trigger_claim(flight_id: str)` no longer accepts unauthenticated caller-supplied URLs.
   - Authoritative evidence URL `https://www.flightradar24.com/data/flights/{clean_flight}` is constructed deterministically inside `leader_fn`.

---

## Verification & Interaction

### Public State View Methods
1. `get_policy(flight_id: str) -> int`: Returns registered backed premium amount for a given flight ID.
2. `get_insured_user_balance(user: Address) -> int`: Returns total backed premium balance deposited by user address.
3. `get_claim_status(flight_id: str) -> str`: Returns current claim lifecycle status (`"PENDING"`, `"APPROVED"`, `"REJECTED"`).
4. `get_policy_holder(flight_id: str) -> Address`: Returns the policy holder address bound to a flight.

### Public State Write Methods
1. `buy_policy(flight_id: str, premium_amount: int) -> bool`: `@gl.public.write.payable` - Register backed insurance coverage for a flight.
2. `trigger_claim(flight_id: str) -> bool`: `@gl.public.write` - Triggers AI-driven claim adjudication using authoritative Flightradar evidence bound to flight ID.
