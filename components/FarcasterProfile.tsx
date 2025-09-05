'use client';

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { Avatar } from '@coinbase/onchainkit/identity';
import Image from 'next/image';

interface FarcasterProfileProps {
  className?: string;
  showAvatar?: boolean;
  showName?: boolean;
  avatarSize?: string;
}

export function FarcasterProfile({ 
  className = '', 
  showAvatar = true, 
  showName = true,
  avatarSize = 'h-8 w-8'
}: FarcasterProfileProps) {
  const { context } = useMiniKit();
  const { address } = useAccount();

  // Get Farcaster user data from context
  const farcasterUser = context?.user;
  const displayName = farcasterUser?.displayName;
  const username = farcasterUser?.username;
  const pfpUrl = farcasterUser?.pfpUrl;
  const fid = farcasterUser?.fid;

  // Determine what to display
  const nameToShow = displayName || username || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown');
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showAvatar && (
        <div className={`${avatarSize} rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center`}>
          {pfpUrl ? (
            <Image 
              src={pfpUrl} 
              alt={displayName || username || 'User avatar'}
              width={32}
              height={32}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to OnchainKit Avatar if Farcaster PFP fails
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={pfpUrl ? 'hidden' : ''}>
            <Avatar className={`${avatarSize}`} address={address} />
          </div>
        </div>
      )}
      
      {showName && (
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-neutral-900 max-w-32 truncate">
            {nameToShow}
          </span>
          {username && displayName && (
            <span className="text-xs text-neutral-500 max-w-32 truncate">
              @{username}
            </span>
          )}
          {fid && (
            <span className="text-xs text-neutral-400">
              FID: {fid}
            </span>
          )}
        </div>
      )}
    </div>
  );
}