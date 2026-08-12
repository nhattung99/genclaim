# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class GenClaim(gl.Contract):
    # Storage structures using GenVM's TreeMap with sized integer u256
    policies: TreeMap[str, u256]
    insured_users: TreeMap[Address, u256]
    claim_status: TreeMap[str, str]
    policy_holders: TreeMap[str, Address]

    @gl.public.write.payable
    def buy_policy(self, flight_id: str, premium_amount: int) -> bool:
        # 1. Require payable: policy must be backed by actual native value sent (gl.message.value)
        paid_val = gl.message.value
        if paid_val == u256(0) or premium_amount <= 0:
            return False
            
        # Ensure paid value covers specified premium
        if int(paid_val) < premium_amount:
            return False

        # 2. Immutable policy: cannot overwrite an existing flight policy
        existing_premium = self.policies.get(flight_id, u256(0))
        if existing_premium > u256(0):
            return False

        # 3. Holder-bound policy: bind sender address immutably to flight ID
        user_address = gl.message.sender_address
        self.policies[flight_id] = paid_val
        self.insured_users[user_address] = self.insured_users.get(user_address, u256(0)) + paid_val
        self.policy_holders[flight_id] = user_address
        self.claim_status[flight_id] = "PENDING"
        
        return True

    @gl.public.write
    def trigger_claim(self, flight_id: str) -> bool:
        # Check if policy exists and is holder-bound
        premium_u256 = self.policies.get(flight_id, u256(0))
        premium = int(premium_u256)
        if premium <= 0:
            return False

        holder = self.policy_holders.get(flight_id, Address("0x0000000000000000000000000000000000000000"))
        if holder == Address("0x0000000000000000000000000000000000000000"):
            return False

        # Check if the claim has already been decided
        status = self.claim_status.get(flight_id, "PENDING")
        if status != "PENDING":
            return False

        # Construct authoritative evidence URL internally bound to flight ID (cannot be overridden by caller)
        clean_flight = flight_id.strip().lower()
        authoritative_url = f"https://www.flightradar24.com/data/flights/{clean_flight}"

        # Define non-deterministic leader function
        def leader_fn():
            # Fetch authoritative flight data text with error handling
            try:
                web_data = gl.nondet.web.render(authoritative_url, mode="text")
                if not web_data or len(str(web_data).strip()) < 20:
                    return {"is_valid_claim": False, "reason": "Could not fetch authoritative flight data — insufficient content returned"}
            except Exception as e:
                return {"is_valid_claim": False, "reason": f"Authoritative web render failed: {str(e)}"}
            
            # Define the prompt for the AI Insurance Adjuster
            prompt = f"""
            You are an AI Insurance Adjuster analyzing authoritative flight status data for flight '{flight_id}'.
            Determine if flight '{flight_id}' was delayed by more than 2 hours or cancelled.
            
            Authoritative Flight Status Web Data ({authoritative_url}):
            {web_data}
            
            Based on this information, judge whether the travel insurance claim is valid (i.e. delayed > 2 hours or cancelled).
            
            You MUST return a JSON object with the following fields:
            - "is_valid_claim": boolean (true if delayed > 2 hours or cancelled, false otherwise)
            - "reason": string (a short explanation of the status)
            
            Respond ONLY with the JSON object. Do not include any other markdown, text, or explanations.
            """
            
            # Call the LLM to get structured JSON output
            ai_response = gl.nondet.exec_prompt(prompt, response_format="json")
            return ai_response

        # Define validator function to establish consensus
        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            
            leader_data = leader_result.calldata
            if not isinstance(leader_data, dict):
                return False
                
            if "is_valid_claim" not in leader_data or "reason" not in leader_data:
                return False
                
            if not isinstance(leader_data["is_valid_claim"], bool):
                return False
                
            if not isinstance(leader_data["reason"], str):
                return False
                
            try:
                my_result = leader_fn()
                if not isinstance(my_result, dict):
                    return False
                return my_result.get("is_valid_claim") == leader_data["is_valid_claim"]
            except Exception:
                return False

        # Execute the leader/validator consensus process
        result = gl.vm.run_nondet(leader_fn, validator_fn)
        
        # Process the result outside the non-deterministic environment
        result_data = result.calldata if hasattr(result, 'calldata') else result
        is_valid = result_data.get("is_valid_claim", False)
        
        if is_valid:
            self.claim_status[flight_id] = "APPROVED"
            
            # Payout: 5x the backed premium to the bound policy holder
            payout_amount = premium * 5
            recipient = gl.get_contract_at(holder)
            recipient.emit_transfer(value=u256(payout_amount), on='finalized')
        else:
            self.claim_status[flight_id] = "REJECTED"
            
        return is_valid

    @gl.public.view
    def get_policy(self, flight_id: str) -> int:
        return int(self.policies.get(flight_id, u256(0)))

    @gl.public.view
    def get_insured_user_balance(self, user: Address) -> int:
        return int(self.insured_users.get(user, u256(0)))

    @gl.public.view
    def get_claim_status(self, flight_id: str) -> str:
        return self.claim_status.get(flight_id, "")

    @gl.public.view
    def get_policy_holder(self, flight_id: str) -> Address:
        return self.policy_holders.get(flight_id, Address("0x0000000000000000000000000000000000000000"))
