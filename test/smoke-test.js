/**
 * EACO AI Gateway - Smoke Test
 * Verifies module loading and basic logic without starting the server.
 */

const assert = require('assert');

// Test 1: Config loads
console.log('Test 1: Config loads...');
const config = require('../server/config');
assert(config.PORT > 0, 'PORT should be positive');
assert(config.MODEL_PRICING, 'MODEL_PRICING should exist');
assert(config.FEE_DISTRIBUTION, 'FEE_DISTRIBUTION should exist');
assert.strictEqual(config.FEE_DISTRIBUTION.nodeOperators, 0.5, 'Node operators should be 50%');
assert.strictEqual(config.FEE_DISTRIBUTION.communityOps, 0.2, 'Community ops should be 20%');
assert.strictEqual(config.FEE_DISTRIBUTION.userGrowth, 0.2, 'User growth should be 20%');
assert.strictEqual(config.FEE_DISTRIBUTION.earthVillage, 0.1, 'Earth village should be 10%');
console.log('  ✓ Config OK');

// Test 2: EACO service
console.log('Test 2: EACO service...');
const eaco = require('../server/services/eaco');
eaco.deposit('test_wallet', 10000);
assert.strictEqual(eaco.getBalance('test_wallet'), 10000, 'Balance should be 10000');
const result = eaco.deductPayment('test_wallet', 100, 'eaco');
assert.strictEqual(result.charged, 80, 'Should get 20% discount');
assert(result.distribution.nodeOperators > 0, 'Node operators should get share');
assert(result.distribution.earthVillage > 0, 'Earth village should get share');
console.log('  ✓ EACO service OK');

// Test 3: Staking
console.log('Test 3: Staking...');
const stakeResult = eaco.stake('test_wallet', 1000);
assert.strictEqual(stakeResult.stakedAmount, 1000, 'Staked amount should be 1000');
assert.strictEqual(eaco.getStake('test_wallet').amount, 1000, 'Get stake should return 1000');
console.log('  ✓ Staking OK');

// Test 4: DAO
console.log('Test 4: DAO...');
const proposal = eaco.createProposal('creator1', 'Test Proposal', 'Description', 'simple');
assert(proposal.id, 'Proposal should have ID');
const voteResult = eaco.vote(proposal.id, 'voter1', true);
assert.strictEqual(voteResult.votesFor, 1, 'Should have 1 vote for');
const proposals = eaco.getProposals();
assert(proposals.length > 0, 'Should have proposals');
console.log('  ✓ DAO OK');

// Test 5: Router
console.log('Test 5: Router...');
const router = require('../server/services/router');
const routing = router.routeRequest({ messages: [{ role: 'user', content: 'hello' }] });
assert(routing.model, 'Should select a model');
assert(['light', 'medium', 'heavy'].includes(routing.tier), 'Tier should be valid');
console.log('  ✓ Router OK');

// Test 6: AI providers - calculateCost
console.log('Test 6: AI provider cost calculation...');
const ai = require('../server/services/ai-providers');
const cost = ai.calculateCost('gpt-4o', 1000, 500);
assert(cost > 0, 'Cost should be positive');
console.log('  ✓ AI provider OK');

// Test 7: Distribution pools
console.log('Test 7: Distribution pools...');
const pools = eaco.getDistributionPools();
assert(pools.nodeOperators > 0, 'Node operators pool should be > 0');
assert(pools.communityOps > 0, 'Community ops pool should be > 0');
assert(pools.userGrowth > 0, 'User growth pool should be > 0');
assert(pools.earthVillage > 0, 'Earth village pool should be > 0');
console.log('  ✓ Distribution pools OK');

console.log('\n✅ All 7 tests passed!');

// Test 8: Auth - API key registration
console.log('Test 8: Auth - API key registration...');
const { registerApiKey, isValidApiKey } = require('../server/middleware/auth');
const newKey = registerApiKey('change-me-in-production');
assert(newKey.startsWith('eaco-'), 'Registered key should start with eaco-');
console.log('  ✓ Auth registration OK');

// Test 9: Router case-insensitive
console.log('Test 9: Router case-insensitive match...');
const routingUpper = router.routeRequest({ model: 'GPT-4O', messages: [{ role: 'user', content: 'hello' }] });
assert.strictEqual(routingUpper.model, 'gpt-4o', 'Should match case-insensitively');
assert.strictEqual(routingUpper.tier, 'manual', 'Should be manual tier');
console.log('  ✓ Router case-insensitive OK');

console.log('\n✅ All 9 tests passed!');
