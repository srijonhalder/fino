const axios = require('axios');

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_BASE_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

/**
 * Upload JSON data to IPFS via Pinata
 * @param {object} jsonData - JavaScript object to store
 * @param {string} name - Pin name for Pinata dashboard
 * @returns {Promise<{ipfsHash: string, ipfsUrl: string}>}
 */
const uploadJSONToIPFS = async (jsonData, name = 'Fino Document') => {
  try {
    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
      {
        pinataContent: jsonData,
        pinataMetadata: { name },
        pinataOptions: { cidVersion: 1 },
      },
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    return {
      ipfsHash,
      ipfsUrl: `${PINATA_GATEWAY}/${ipfsHash}`,
    };
  } catch (error) {
    console.error('❌ Pinata JSON upload failed:', error.response?.data || error.message);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

/**
 * Upload a file buffer to IPFS via Pinata
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @returns {Promise<{ipfsHash: string, ipfsUrl: string}>}
 */
const uploadFileToIPFS = async (fileBuffer, fileName) => {
  try {
    const FormData = require('form-data');
    const formData = new FormData();

    formData.append('file', fileBuffer, { filename: fileName });
    formData.append(
      'pinataMetadata',
      JSON.stringify({ name: fileName })
    );
    formData.append(
      'pinataOptions',
      JSON.stringify({ cidVersion: 1 })
    );

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    const ipfsHash = response.data.IpfsHash;
    return {
      ipfsHash,
      ipfsUrl: `${PINATA_GATEWAY}/${ipfsHash}`,
    };
  } catch (error) {
    console.error('❌ Pinata file upload failed:', error.response?.data || error.message);
    throw new Error(`IPFS file upload failed: ${error.message}`);
  }
};

/**
 * Build IPFS gateway URL from hash
 * @param {string} ipfsHash
 * @returns {string}
 */
const getIPFSUrl = (ipfsHash) => {
  return `${PINATA_GATEWAY}/${ipfsHash}`;
};

module.exports = {
  uploadJSONToIPFS,
  uploadFileToIPFS,
  getIPFSUrl,
};
