/**
 * Test Document Registry Integration
 * 
 * This script tests the document registry methods to ensure they can
 * successfully interact with the Soroban smart contract on Stellar.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const stellarService = require('../src/services/stellar.service');
const crypto = require('crypto');

// Mock business ID for testing
const TEST_BUSINESS_ID = '507f1f77bcf86cd799439011';

async function testDocumentRegistry() {
  console.log('🧪 Testing Document Registry Integration\n');
  console.log(`Test Business ID: ${TEST_BUSINESS_ID}\n`);
  
  try {
    // Test 1: Register a document
    console.log('📄 Test 1: Register Document');
    const docHash = crypto.createHash('sha256').update('test_document_content').digest('hex');
    console.log(`  Document hash: ${docHash}`);
    
    const registerTxHash = await stellarService.registerDocumentOnChain(
      TEST_BUSINESS_ID,
      'GST',
      docHash,
      'QmTest123456789' // Mock IPFS CID
    );
    console.log(`  ✅ Document registered! TX: ${registerTxHash}\n`);
    
    // Test 2: Add an attestation
    console.log('✓ Test 2: Add Attestation');
    const proofHash = crypto.createHash('sha256').update('gst_verification_proof').digest('hex');
    console.log(`  Proof hash: ${proofHash}`);
    
    const attestationTxHash = await stellarService.addAttestationOnChain(
      TEST_BUSINESS_ID,
      'GST_valid',
      1, // VERIFIED status
      proofHash,
      'api_check'
    );
    console.log(`  ✅ Attestation added! TX: ${attestationTxHash}\n`);
    
    // Test 3: Add a range proof
    console.log('📊 Test 3: Add Range Proof');
    const zkProofHash = crypto.createHash('sha256').update('funding_goal_range_proof').digest('hex');
    console.log(`  ZK Proof hash: ${zkProofHash}`);
    
    const rangeProofTxHash = await stellarService.addRangeProofOnChain(
      TEST_BUSINESS_ID,
      'funding_goal_range',
      100000, // threshold
      true, // is above threshold
      zkProofHash
    );
    console.log(`  ✅ Range proof added! TX: ${rangeProofTxHash}\n`);
    
    // Wait for transactions to finalize (allow 5 seconds)
    console.log('⏳ Waiting 5 seconds for transactions to finalize...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 4: Get attestations
    console.log('📖 Test 4: Get Attestations');
    const attestations = await stellarService.getAttestationsOnChain(TEST_BUSINESS_ID);
    console.log(`  Found ${attestations.length} attestation(s):`);
    attestations.forEach((att, i) => {
      console.log(`    ${i + 1}. ${att.claim || 'N/A'} - Status: ${att.status || 'N/A'}`);
    });
    console.log();
    
    // Test 5: Get range proofs
    console.log('📊 Test 5: Get Range Proofs');
    const rangeProofs = await stellarService.getRangeProofsOnChain(TEST_BUSINESS_ID);
    console.log(`  Found ${rangeProofs.length} range proof(s):`);
    rangeProofs.forEach((proof, i) => {
      console.log(`    ${i + 1}. ${proof.claim || 'N/A'} - Threshold: ${proof.threshold || 'N/A'}`);
    });
    console.log();
    
    // Test 6: Get verification summary
    console.log('📊 Test 6: Get Verification Summary');
    const summary = await stellarService.getVerificationSummaryOnChain(TEST_BUSINESS_ID);
    console.log(`  Summary:`, summary);
    console.log();
    
    console.log('🎉 All tests passed! Document Registry integration is working correctly.\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testDocumentRegistry()
  .then(() => {
    console.log('✅ Test suite completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Test suite failed:', err.message);
    process.exit(1);
  });
