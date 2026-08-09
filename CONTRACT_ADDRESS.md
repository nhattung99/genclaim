# GenClaim Deployed Smart Contract Address

## Deployed Contract Information

- **Contract Name**: `GenClaim` (Intelligent Contract)
- **Contract Class**: `GenClaim` (inherits from `gl.Contract`)
- **Deployed Contract Address**: `0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7`
- **Network**: GenLayer Studionet / Testnet (`studionet`)
- **GenLayer SDK Version**: `v0.2.16` (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`)
- **Contract Source File**: [`genclaim_contract.py`](./genclaim_contract.py)

---

## Environment Variable Configuration

To connect client applications or scripts to this contract, set the following environment variable:

```env
VITE_GENCLAIM_CONTRACT_ADDRESS=0x17f66D5426f3CeEcB664504d3dCbF773B528FDD7
```

---

## Verification & Interaction

### Public State View Methods
1. `get_policy(flight_id: str) -> int`: Returns registered policy premium amount for a given flight ID.
2. `get_insured_user_balance(user: Address) -> int`: Returns insured deposit coverage balance for a user address.
3. `get_claim_status(flight_id: str) -> str`: Returns current claim lifecycle status (`"PENDING"`, `"APPROVED"`, `"REJECTED"`).
4. `get_policy_holder(flight_id: str) -> Address`: Returns the policy holder address for a flight.

### Public State Write Methods
1. `buy_policy(flight_id: str, premium_amount: int) -> bool`: Register insurance coverage for a specified flight code.
2. `trigger_claim(flight_id: str, flight_radar_url: str) -> bool`: Triggers AI-driven claim adjudication using `gl.vm.run_nondet_unsafe`.
