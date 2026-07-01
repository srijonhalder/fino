const crypto = require('crypto');
const { getDocumentRegistryContract } = require('../config/governance');

/**
 * Compute SHA-256 hash of a file buffer
 * @param {Buffer} buffer - File content
 * @returns {string} Hex-encoded SHA-256 hash (without 0x prefix)
 */
const hashDocument = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Convert a hex string to bytes32 for Solidity
 * @param {string} hexString - 64-char hex string (without 0x prefix)
 * @returns {string} 0x-prefixed bytes32
 */
const toBytes32 = (hexString) => {
  // Ensure it's 64 chars (32 bytes)
  const padded = hexString.padStart(64, '0');
  return `0x${padded}`;
};

/**
 * Register a document hash on the DocumentRegistry contract
 * @param {string} businessId - MongoDB business ID
 * @param {string} docType - Document type ('gst', 'pan', etc.)
 * @param {Buffer} fileBuffer - The file content buffer
 * @param {string} encryptedCid - IPFS CID (or empty string)
 * @returns {Promise<{hash: string, txHash: string}>}
 */
const registerDocumentOnChain = async (businessId, docType, fileBuffer, encryptedCid = '') => {
  try {
    const hexHash = hashDocument(fileBuffer);
    const docHashBytes32 = toBytes32(hexHash);

    const registry = getDocumentRegistryContract();
    const tx = await registry.registerDocument(
      businessId,
      docType,
      docHashBytes32,
      encryptedCid
    );
    await tx.wait();

    console.log(`✅ Document registered on-chain: ${docType} for business ${businessId} — tx: ${tx.hash}`);
    return {
      hash: hexHash,
      txHash: tx.hash,
      registeredAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Document registration failed for ${docType}:`, error.message);
    throw error;
  }
};

/**
 * Register multiple documents at once
 * @param {string} businessId - MongoDB business ID
 * @param {Array<{docType: string, buffer: Buffer, cid: string}>} documents
 * @returns {Promise<Object>} Map of docType → {hash, txHash, registeredAt}
 */
const registerMultipleDocuments = async (businessId, documents) => {
  const results = {};

  for (const doc of documents) {
    try {
      results[doc.docType] = await registerDocumentOnChain(
        businessId,
        doc.docType,
        doc.buffer,
        doc.cid || ''
      );
    } catch (error) {
      console.error(`Failed to register ${doc.docType}:`, error.message);
      results[doc.docType] = { hash: null, txHash: null, error: error.message };
    }
  }

  return results;
};

/**
 * Verify a document's integrity against on-chain hash
 * @param {string} businessId - MongoDB business ID
 * @param {string} docType - Document type
 * @param {Buffer} fileBuffer - File to verify
 * @returns {Promise<boolean>}
 */
const verifyDocumentIntegrity = async (businessId, docType, fileBuffer) => {
  try {
    const { getDocumentRegistryReadOnly } = require('../config/governance');
    const registry = getDocumentRegistryReadOnly();
    const hexHash = hashDocument(fileBuffer);
    const hashBytes32 = toBytes32(hexHash);
    return await registry.verifyDocumentIntegrity(businessId, docType, hashBytes32);
  } catch (error) {
    console.error('Document integrity check failed:', error.message);
    return false;
  }
};

module.exports = {
  hashDocument,
  toBytes32,
  registerDocumentOnChain,
  registerMultipleDocuments,
  verifyDocumentIntegrity,
};
