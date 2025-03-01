import { ethers } from 'ethers';
import { NextRequest, NextResponse } from 'next/server';

// assume an average of 6 sessions per cancer treatment course. https://www.cancerresearchuk.org/about-cancer/treatment/chemotherapy/planning/your-chemotherapy-plan
// a course lasts between 3 - 6 months. Assume 6 months average. https://www.medicalnewstoday.com/articles/158401#what-to-expect
// a 6 month session cost $27000. https://www.medicalnewstoday.com/articles/chemotherapy-cost#typical-cost
// 1 session per month = 27000/6
const AVG_CHEMO_SESSION_COST_USD = 4500

const COINDESK_ETH_PRICE_USD_URL = "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
// low history limit for faster processing.
const HISTORY_LIMIT = 15
const DEFAULT_ETH_PRICE_USD = 2228

const provider = new ethers.providers.EtherscanProvider('mainnet');

export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    const latestBlockNumber = await provider.getBlockNumber();
    const startBlock = latestBlockNumber - HISTORY_LIMIT;

    const history = await provider.getHistory(walletAddress, startBlock, latestBlockNumber);
    const chemoSessions = await calculateChemoSessionsByLoss(history)

    return NextResponse.json({
      averageSessionCostUSD: AVG_CHEMO_SESSION_COST_USD,
      costs: {
        ...chemoSessions
      }
    });
  } catch (error: any) { // eslint-disable-line
    console.error(error);
    return NextResponse.json({ error: error?.message || 'Failed to calculate' }, { status: 500 });
  }
}

async function calculateChemoSessionsByLoss(history: ethers.providers.TransactionResponse[]) {
  const totalLosses = await calculateTxnLosses(history)
  const ethPriceUSD = await (getEthPriceUSD())()
  const totalLossesUSD = totalLosses * ethPriceUSD

  return { totalLossesUSD, chemoSession: Math.floor(totalLossesUSD / AVG_CHEMO_SESSION_COST_USD) }
}


/**
 * In the context of this challenge, I would define a loss as the amount of ETH or 
 * the value of tokens that were sent from the user's wallet 
 * and did not result in a corresponding increase in the wallet's overall value. 
 * This could be due to factors such as:
 * 1. Selling tokens or ETH for a lower price than they were acquired for.
 * 2. Paying gas fees for transactions that did not result in a profitable outcome.
 * 3. Sending tokens or ETH to a contract that did not return any value.
 * @param history 
 * @returns 
 */
async function calculateTxnLosses(history: ethers.providers.TransactionResponse[]): Promise<number> {
  let totalLosses = 0;

  // Filter ETH transfers first
  const ethTransfers = history.filter(tx => !tx.value.isZero());

  for (const tx of ethTransfers) {
    const receipt = await provider.getTransactionReceipt(tx.hash ?? '');

    // Add a delay to avoid rate limiting. wait 200ms
    await new Promise(resolve => setTimeout(resolve, 200));

    const gasCost = tx.gasPrice.mul(receipt?.gasUsed ?? 0);

    // Calculate ETH loss
    const ethLoss = tx.value.add(gasCost);
    totalLosses += parseFloat(ethers.utils.formatEther(ethLoss));
  }

  // For token transfers (simplified - assuming all outgoing token transfers are losses)
  // ideally we would need to track token balances and prices to accurately calculate token transfer losses
  // For simplicity, let's assume a fixed loss for each token transfer
  const FIXED_TOKEN_TRANSFER_LOSS = 100;
  const tokenTransferCount = history.length - ethTransfers.length;
  const tokenTransfersLosses = tokenTransferCount * FIXED_TOKEN_TRANSFER_LOSS;

  totalLosses += tokenTransfersLosses;

  return totalLosses;
}

function getEthPriceUSD() {
  let ethPriceUSD = 0

  return async () => {
    if (ethPriceUSD) return ethPriceUSD

    try {
      const response = await fetch(COINDESK_ETH_PRICE_USD_URL)
      const { USD } = await response.json()

      ethPriceUSD = USD
    } catch (error) {
      console.error("error fetching eth price", error)
      return DEFAULT_ETH_PRICE_USD
    }

    return ethPriceUSD
  }
}
