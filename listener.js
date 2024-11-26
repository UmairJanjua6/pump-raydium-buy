const { Connection, PublicKey } = require('@solana/web3.js');
require('dotenv').config();

// Define constants
const CONNECTION_URL = process.env.CONNECTION_URL;
const PUMP_FUN_MIGRATION_ACCOUNT = process.env.PUMP_FUN_MIGRATION_ACCOUNT;

// Initialize connection with support for versioned transactions
const connection = new Connection(CONNECTION_URL, {
  commitment: 'confirmed',
  maxSupportedTransactionVersion: 0,
});

// Subscribe to logs for the migration account
connection.onLogs(
  new PublicKey(PUMP_FUN_MIGRATION_ACCOUNT),
  async (log) => {
    // Get transaction signature from log
    const signature = log.signature;
    if (!signature) {
      console.warn('No transaction signature found in log.');
      return;
    }

    console.log(`Processing transaction signature: ${signature}`);

    // Fetch transaction details and check for `MintTo` log
    const hasMintToLog = await checkForMintToLog(signature);
    if (hasMintToLog) {
      // If `MintTo` log is found, fetch and log the mint address for Account Index: 6
      const mintAddress = await getMintAddressFromAccountIndex6(signature);
      if (mintAddress) {
        console.log(`Mint Address for Account Index 6: ${mintAddress}`);
        console.log(`Signature for Account Index 6: ${signature}`);
      } else {
        console.log('Mint Address not found for Account Index 6.');
      }
    } else {
      console.log(`No MintTo instruction found in transaction ${signature}.`);
    }
  },
  'processed'
);

// Function to check for `MintTo` log in transaction details
async function checkForMintToLog(signature) {
  try {
    // Fetch transaction details with support for versioned transactions
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      console.error('Transaction not found for signature:', signature);
      return false;
    }

    // Inspect log messages for `MintTo`
    const logMessages = transaction.meta.logMessages || [];

    return logMessages.some((message) => message.includes('Instruction: MintTo'));
  } catch (error) {
    console.error('Error fetching transaction details or parsing logs:', error);
    return false;
  }
}

// Function to fetch transaction details and log `mint` address for Account Index: 6
async function getMintAddressFromAccountIndex6(signature) {
  try {
    // Fetch the transaction details
    const transactionDetails = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transactionDetails) {
      console.error(`No transaction found for signature: ${signature}`);
      return null;
    }

    // Extract and log the mint address for Account Index: 6
    return extractMintAddress(transactionDetails, 6); // Account Index: 6
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

// Function to extract `mint` address from the specified account index
const extractMintAddress = (transactionDetails, accountIndex) => {
  if (!transactionDetails?.meta?.postTokenBalances) {
    console.log('No postTokenBalances found in transaction details.');
    return null;
  }

  const accountBalance = transactionDetails.meta.postTokenBalances.find(
    (balance) => balance.accountIndex === accountIndex
  );

  return accountBalance ? accountBalance.mint : null;
};

console.log('Listening for token migrations...');
