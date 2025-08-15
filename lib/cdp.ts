import { CdpClient } from '@coinbase/cdp-sdk';

let cdpClient: CdpClient | null = null;

export function initializeCDP() {
  if (!cdpClient) {
    try {
      cdpClient = new CdpClient({
        apiKeyId: process.env.CDP_API_KEY_NAME!,
        apiKeySecret: process.env.CDP_API_KEY_PRIVATE_KEY!,
        debugging: process.env.NODE_ENV === 'development',
      });
      console.log('CDP SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CDP SDK:', error);
      throw error;
    }
  }
  return cdpClient;
}

export async function createAccount(name?: string) {
  const client = initializeCDP();
  try {
    const account = await client.evm.createAccount({ name });
    console.log('Account created:', account.address);
    return account;
  } catch (error) {
    console.error('Failed to create account:', error);
    throw error;
  }
}

export function getCDPClient() {
  return initializeCDP();
}