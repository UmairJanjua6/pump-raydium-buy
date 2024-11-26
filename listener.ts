import { Connection, PublicKey, VersionedTransactionResponse } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Define constants
const CONNECTION_URL = process.env.CONNECTION_URL as string;
const PUMP_FUN_MIGRATION_ACCOUNT = process.env.PUMP_FUN_MIGRATION_ACCOUNT as string;

if (!CONNECTION_URL || !PUMP_FUN_MIGRATION_ACCOUNT) {
  throw new Error('Environment variables CONNECTION_URL or PUMP_FUN_MIGRATION_ACCOUNT are not set.');
}

// Initialize connection
const connection = new Connection(CONNECTION_URL, {
  commitment: 'confirmed'
});

// Subscribe to logs for the migration account
connection.onLogs(
  new PublicKey(PUMP_FUN_MIGRATION_ACCOUNT),
  async (log) => {
    const signature = log.signature;
    if (!signature) {
      console.warn('No transaction signature found in log.');
      return;
    }

    console.log(`Processing transaction signature: ${signature}`);

    const hasMintToLog = await checkForMintToLog(signature);
    if (hasMintToLog) {
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
async function checkForMintToLog(signature: string): Promise<boolean> {
  try {
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      console.error('Transaction not found for signature:', signature);
      return false;
    }

    const logMessages = transaction.meta?.logMessages || [];
    return logMessages.some((message) => message.includes('Instruction: MintTo'));
  } catch (error) {
    console.error('Error fetching transaction details or parsing logs:', error);
    return false;
  }
}

// Function to fetch transaction details and log `mint` address for Account Index: 6
async function getMintAddressFromAccountIndex6(signature: string): Promise<string | null> {
  try {
    const transactionDetails = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!transactionDetails) {
      console.error(`No transaction found for signature: ${signature}`);
      return null;
    }

    // Handle VersionedTransactionResponse properly
    return extractMintAddress(transactionDetails, 6); // Account Index: 6
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    return null;
  }
}

// Function to extract `mint` address from the specified account index
function extractMintAddress(transactionDetails: VersionedTransactionResponse, accountIndex: number): string | null {
  const postTokenBalances = transactionDetails.meta?.postTokenBalances;
  if (!postTokenBalances) {
    console.log('No postTokenBalances found in transaction details.');
    return null;
  }

  const accountBalance = postTokenBalances.find((balance) => balance.accountIndex === accountIndex);
  return accountBalance?.mint || null;
}

console.log('Listening for token migrations...');
