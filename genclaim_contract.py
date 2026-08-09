# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class GenClaim(gl.Contract):
    # Storage structures using GenVM's TreeMap with sized integer u256
    policies: TreeMap[str, u256]
    insured_users: TreeMap[Address, u256]
    claim_status: TreeMap[str, str]
    policy_holders: TreeMap[str, Address]

    @gl.public.write
    def buy_policy(self, flight_id: str, premium_amount: int) -> bool:
        # Validate parameters
        if premium_amount <= 0:
            return False
        
        # Track sender's address
        user_address = gl.message.sender_address
        
        # Register flight policies and user premium/coverage deposits using u256
        self.policies[flight_id] = u256(premium_amount)
        self.insured_users[user_address] = u256(premium_amount)
        self.policy_holders[flight_id] = user_address
        self.claim_status[flight_id] = "PENDING"
        
        return True

    @gl.public.write
    def trigger_claim(self, flight_id: str, flight_radar_url: str) -> bool:
        # Check if the policy exists for this flight_id
        premium_u256 = self.policies.get(flight_id, u256(0))
        premium = int(premium_u256)
        if premium <= 0:
            return False
            
        # Check if the claim has already been processed/decided
        status = self.claim_status.get(flight_id, "PENDING")
        if status != "PENDING":
            return False

        # Define non-deterministic leader function
        def leader_fn():
            # 1. Fetch flight data as raw text
            web_data = gl.nondet.web.render(flight_radar_url, mode="text")
            
            # 2. Define the prompt for the AI Insurance Adjuster
            prompt = f"""
            You are an AI Insurance Adjuster analyzing flight status data.
            Determine if the flight '{flight_id}' was delayed by more than 2 hours or if it was cancelled.
            
            Flight Status Web Data:
            {web_data}
            
            Based on this information, judge whether the travel insurance claim is valid (i.e. delayed > 2 hours or cancelled).
            
            You MUST return a JSON object with the following fields:
            - "is_valid_claim": boolean (true if delayed > 2 hours or cancelled, false otherwise)
            - "reason": string (a short explanation of the status)
            
            Respond ONLY with the JSON object. Do not include any other markdown, text, or explanations.
            """
            
            # 3. Call the LLM to get structured JSON output
            ai_response = gl.nondet.exec_prompt(prompt, response_format="json")
            return ai_response

        # Define validator function to establish consensus
        def validator_fn(leader_result) -> bool:
            # Check if leader succeeded
            if not isinstance(leader_result, gl.vm.Return):
                return False
            
            # Extract leader's data
            leader_data = leader_result.calldata
            if not isinstance(leader_data, dict):
                return False
                
            if "is_valid_claim" not in leader_data or "reason" not in leader_data:
                return False
                
            if not isinstance(leader_data["is_valid_claim"], bool):
                return False
                
            if not isinstance(leader_data["reason"], str):
                return False
                
            # Run our own leader_fn and check if the outcome matches
            try:
                my_result = leader_fn()
                if not isinstance(my_result, dict):
                    return False
                # Validators must agree on the core decision to reach consensus
                return my_result.get("is_valid_claim") == leader_data["is_valid_claim"]
            except Exception:
                return False

        # Execute the leader/validator consensus process
        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        # Process the result outside the non-deterministic environment (deterministic updates)
        is_valid = result.get("is_valid_claim", False)
        
        if is_valid:
            self.claim_status[flight_id] = "APPROVED"
            
            # Retrieve policy holder address
            holder = self.policy_holders.get(flight_id, Address("0x0000000000000000000000000000000000000000"))
            if holder != Address("0x0000000000000000000000000000000000000000"):
                # Payout: 5x the premium as the parametric insurance payout coverage
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
