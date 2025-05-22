
import requests
import sys
import time
import json
from datetime import datetime

class CryptoFinancialAppTester:
    def __init__(self, base_url="https://b1f49dc8-5411-4897-9fa0-398b7dedf8b5.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_team_id = None
        self.created_hash_ids = []

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_create_team(self, name, rub_price, usdt_price):
        """Test creating a team"""
        success, response = self.run_test(
            "Create Team",
            "POST",
            "teams",
            200,
            data={
                "name": name,
                "rub_price_per_lot": rub_price,
                "usdt_price_per_lot": usdt_price
            }
        )
        if success and "id" in response:
            self.created_team_id = response["id"]
            print(f"Created team with ID: {self.created_team_id}")
        return success, response

    def test_get_teams(self, search=None):
        """Test getting all teams"""
        endpoint = "teams"
        if search:
            endpoint += f"?search={search}"
        return self.run_test(
            f"Get Teams{' with search' if search else ''}",
            "GET",
            endpoint,
            200
        )

    def test_get_team(self, team_id):
        """Test getting a specific team"""
        return self.run_test(
            "Get Team by ID",
            "GET",
            f"teams/{team_id}",
            200
        )

    def test_update_team(self, team_id, update_data):
        """Test updating a team"""
        return self.run_test(
            "Update Team",
            "PUT",
            f"teams/{team_id}",
            200,
            data=update_data
        )

    def test_create_hash(self, team_id, hash_value, token_amount, currency, exchange_rate=None):
        """Test creating a crypto hash"""
        data = {
            "team_id": team_id,
            "hash_value": hash_value,
            "token_amount": token_amount,
            "currency": currency
        }
        if exchange_rate is not None:
            data["exchange_rate"] = exchange_rate
            
        success, response = self.run_test(
            f"Create {currency} Hash",
            "POST",
            "hashes",
            200,
            data=data
        )
        if success and "id" in response:
            self.created_hash_ids.append(response["id"])
            print(f"Created hash with ID: {response['id']}")
        return success, response

    def test_get_hashes(self, team_id=None):
        """Test getting all hashes or hashes for a specific team"""
        endpoint = "hashes"
        if team_id:
            endpoint += f"?team_id={team_id}"
        return self.run_test(
            f"Get Hashes{' for Team' if team_id else ''}",
            "GET",
            endpoint,
            200
        )

    def test_get_hash(self, hash_id):
        """Test getting a specific hash"""
        return self.run_test(
            "Get Hash by ID",
            "GET",
            f"hashes/{hash_id}",
            200
        )

    def test_update_hash(self, hash_id, update_data):
        """Test updating a hash"""
        return self.run_test(
            "Update Hash",
            "PUT",
            f"hashes/{hash_id}",
            200,
            data=update_data
        )

    def test_get_team_summary(self, team_id):
        """Test getting a team summary"""
        return self.run_test(
            "Get Team Summary",
            "GET",
            f"teams/{team_id}/summary",
            200
        )

    def test_get_all_team_summaries(self):
        """Test getting all team summaries"""
        return self.run_test(
            "Get All Team Summaries",
            "GET",
            "teams/summary",
            200
        )

    def verify_calculations(self, team_id):
        """Verify the calculations for a team"""
        success, summary = self.test_get_team_summary(team_id)
        if not success:
            return False
        
        print("\n🧮 Verifying calculations:")
        print(f"USDT tokens: {summary['usdt_tokens']}")
        print(f"RUB tokens: {summary['rub_tokens']}")
        print(f"USDT lots: {summary['usdt_lots']}")
        print(f"RUB lots: {summary['rub_lots']}")
        print(f"Total lots: {summary['total_lots']}")
        
        return True

    def cleanup(self):
        """Clean up created resources"""
        if self.created_team_id:
            print("\n🧹 Cleaning up resources...")
            self.run_test(
                "Delete Team",
                "DELETE",
                f"teams/{self.created_team_id}",
                200
            )

def main():
    tester = CryptoFinancialAppTester()
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test creating a team
    success, team = tester.test_create_team("Test Team", 1000, 100)
    if not success:
        print("❌ Failed to create team, stopping tests")
        return 1
    
    team_id = tester.created_team_id
    
    # Test getting teams
    tester.test_get_teams()
    
    # Test getting a specific team
    tester.test_get_team(team_id)
    
    # Test creating USDT hash
    success, _ = tester.test_create_hash(team_id, "abc123", 5000, "USDT")
    if not success:
        print("❌ Failed to create USDT hash, stopping tests")
        tester.cleanup()
        return 1
    
    # Test creating RUB hash
    success, _ = tester.test_create_hash(team_id, "def456", 10000, "RUB", 80)
    if not success:
        print("❌ Failed to create RUB hash, stopping tests")
        tester.cleanup()
        return 1
    
    # Test getting hashes for the team
    tester.test_get_hashes(team_id)
    
    # Test getting a specific hash
    if tester.created_hash_ids:
        tester.test_get_hash(tester.created_hash_ids[0])
    
    # Test updating a team
    tester.test_update_team(team_id, {"name": "Updated Test Team"})
    
    # Test updating a hash
    if tester.created_hash_ids:
        tester.test_update_hash(tester.created_hash_ids[0], {"token_amount": 6000})
    
    # Test team search
    tester.test_get_teams(search="Test")
    
    # Verify calculations
    tester.verify_calculations(team_id)
    
    # Test getting all team summaries
    tester.test_get_all_team_summaries()
    
    # Clean up
    tester.cleanup()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
