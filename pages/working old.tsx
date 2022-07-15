import {
    Button,
    Center,
    ChakraProvider,
    Flex,
    Grid,
    Heading,
    Icon,
    Image,
    LightMode,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Spinner,
    Stack,
    Text,
    useColorMode,
    useToast,
  } from "@chakra-ui/react";
  import {
    ChainId,
    useAddress,
    useActiveClaimCondition,
    useClaimedNFTSupply,
    useClaimIneligibilityReasons,
    useClaimNFT,
    useContractMetadata,
    useNetwork,
    useNetworkMismatch,
    useNFTDrop,
    useSignatureDrop,
    useUnclaimedNFTSupply,
    useMetamask,
    useWalletConnect,
    useCoinbaseWallet,
  } from '@thirdweb-dev/react';
  import { IoDiamondOutline } from "react-icons/io5";
  import { formatUnits, parseUnits } from 'ethers/lib/utils';
  import type { NextPage } from 'next';
  import React, { useEffect, useMemo, useRef, useState } from "react";
  import styles from '../styles/Theme.module.css';
  import { parseIneligibility } from "../utils/parseIneligibility";
  
  // Put Your NFT Drop Contract address from the dashboard here
  //const myNftDropContractAddress = '0xAEb6935cb8B5c1FC766E3EFd91164B04e6aAF259';
  //new 721a
  //const myNftDropContractAddress = '0x39710F4B42B53de6Bae8B298808EaaA020339228';
  //new 721
  const myNftDropContractAddress = '0x715eF8e631b9Cd872Ff02bA2AD33448BB254E922';
  
  const Home: NextPage = () => {
    const nftDrop = useNFTDrop(myNftDropContractAddress);
    const address = useAddress();
    const connectWithMetamask = useMetamask();
    const connectWithWalletConnect = useWalletConnect();
    const connectWithCoinbaseWallet = useCoinbaseWallet();
    const isOnWrongNetwork = useNetworkMismatch();
    const claimNFT = useClaimNFT(nftDrop);
    const [, switchNetwork] = useNetwork();
    const loaded = useRef(false);
  
    // The amount the user claims
    const [quantity, setQuantity] = useState(1); // default to 1
  
    // Load contract metadata
    const { data: contractMetadata } = useContractMetadata(
      myNftDropContractAddress,
    );
  
    // Load claimed supply and unclaimed supply
    const { data: unclaimedSupply } = useUnclaimedNFTSupply(nftDrop);
    const { data: claimedSupply } = useClaimedNFTSupply(nftDrop);
    
    // Load the active claim condition
    const { data: activeClaimCondition } = useActiveClaimCondition(nftDrop);
  
    // Load ineligibility on claim
    const claimIneligibilityReasons = useClaimIneligibilityReasons(nftDrop, { quantity, walletAddress: address, });
  
    // Check if there's NFTs left on the active claim phase
    const isNotReady =
      activeClaimCondition &&
      parseInt(activeClaimCondition?.availableSupply) === 0;
  
    // Check if there's an active claim phase currently
    const noPhase =
      !activeClaimCondition;
  
    // Check if there's any NFTs left
    const isSoldOut = unclaimedSupply?.toNumber() === 0;
  
    // check if loading
    const isLoading = claimIneligibilityReasons.isLoading && !loaded.current;
  
  
    // Not soldout, connected and there are no ineligibility reasons
    const canClaim =
      !isSoldOut && !!address && !claimIneligibilityReasons.data?.length;
  
    // Check price
    const price = parseUnits(
      activeClaimCondition?.currencyMetadata.displayValue || '0',
      activeClaimCondition?.currencyMetadata.decimals,
    );
  
    // Multiply depending on quantity
    const priceToMint = price.mul(quantity);
  
    const quantityLimitPerTransaction =
      activeClaimCondition?.quantityLimitPerTransaction;
    
    const snapshot = activeClaimCondition?.snapshot;
    
    const useDefault = useMemo(
      () =>
        !snapshot ||
        snapshot?.find((user) => user.address === address)?.maxClaimable === "0",
      [snapshot, address],
    );
  
    const maxClaimable = useDefault
      ? isNaN(Number(quantityLimitPerTransaction))
        ? 1000
        : Number(quantityLimitPerTransaction)
      : Number(snapshot?.find((user) => user.address === address)?.maxClaimable);
  
    const lowerMaxClaimable = Math.min(
      maxClaimable,
      unclaimedSupply?.toNumber() || 1000,
    );
  
    // Loading state while we fetch the metadata
    if (!nftDrop || !contractMetadata) {
      return <div className={styles.container}>Loading...</div>;
    }
  
    // Function to mint/claim an NFT
    const mint = async () => {
      if (isOnWrongNetwork) {
        switchNetwork && switchNetwork(ChainId.Rinkeby);
        return;
      }
  
      claimNFT.mutate(
        { to: address as string, quantity },
        {
          onSuccess: () => {
            alert(`Successfully minted NFT${quantity > 1 ? 's' : ''}!`);
          },
          onError: (err: any) => {
            console.error(err);
            alert(err?.message || 'Something went wrong');
          },
        },
      );
    };
  
    return (
      <div className={styles.container}>
        
        <div className={styles.mintInfoContainer}>
          <div className={styles.infoSide}>
            {/* Title of your NFT Collection */}
            <h1>{contractMetadata?.name}</h1>
            {/* Description of your NFT Collection */}
            <p className={styles.description}>{contractMetadata?.description}</p>
          </div>
  
          <div className={styles.imageSide}>
            {/* Image Preview of NFTs */}
            <img
              className={styles.image}
              src={contractMetadata?.image}
              alt={`${contractMetadata?.name} preview image`}
            />
  
            {/* Amount claimed so far */}
            <div className={styles.mintCompletionArea}>
              <div className={styles.mintAreaLeft}>
                <p>Total Minted</p>
              </div>
              <div className={styles.mintAreaRight}>
                {claimedSupply && unclaimedSupply ? (
                  <p>
                    {/* Claimed supply so far */}
                    <b>{claimedSupply?.toNumber()}</b>
                    {' / '}
                    {
                      // Add unclaimed and claimed supply to get the total supply
                      claimedSupply?.toNumber() + unclaimedSupply?.toNumber()
                    }
                  </p>
                ) : (
                  // Show loading state if we're still loading the supply
                  <p>Loading...</p>
                )}
              </div>
            </div>
  
            {/* Show claim button or connect wallet button */}
            {address ? (
              // Sold out or show the claim button
              isSoldOut ? (
                <div>
                  <h2>Sold Out</h2>
                </div>
              ) 
              : noPhase ? (
                <div>
                  <h2>Minting is not live yet</h2>
                </div>
              )
               : isNotReady ? (
                <div>
                  <h2>Not ready to be minted yet</h2>
                </div>
              ) : (
                    canClaim ? (
                    <>
  
                      <p>Quantity</p>
                      <div className={styles.quantityContainer}>
                        <button
                          className={`${styles.quantityControlButton}`}
                          onClick={() => setQuantity(quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
  
                        <h4>{quantity}</h4>
  
                        <button
                          className={`${styles.quantityControlButton}`}
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={
                            quantity >= lowerMaxClaimable
                          }
                        >
                          +
                        </button>
                      </div>
  
                      <button
                        className={`${styles.mainButton} ${styles.spacerTop} ${styles.spacerBottom}`}
                        onClick={mint}
                        disabled={claimNFT.isLoading}
                        
                      >
                        {claimNFT.isLoading
                          ? 'Minting...'
                          : `Mint${quantity > 1 ? ` ${quantity}` : ''}${
                              activeClaimCondition?.price.eq(0)
                                ? ' (Free)'
                                : activeClaimCondition?.currencyMetadata.displayValue
                                ? ` (${formatUnits(
                                    priceToMint,
                                    activeClaimCondition.currencyMetadata.decimals,
                                  )} ${
                                    activeClaimCondition?.currencyMetadata.symbol
                                  })`
                                : ''
                            }`}
                      </button>
                    </>
                    ) : claimIneligibilityReasons.data?.length ? (
                      parseIneligibility(claimIneligibilityReasons.data, quantity)
                    ) :
                    (
                      <>
                        <p>Minting Unavailable</p>
                      </>
                    )
              )
            ) : (
              <div className={styles.buttons}>
                <button
                  className={styles.mainButton}
                  onClick={connectWithMetamask}
                >
                  Connect MetaMask
                </button>
                <button
                  className={styles.mainButton}
                  onClick={connectWithWalletConnect}
                >
                  Connect with Wallet Connect
                </button>
                <button
                  className={styles.mainButton}
                  onClick={connectWithCoinbaseWallet}
                >
                  Connect with Coinbase Wallet
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Powered by thirdweb */}{' '}
        <img
          src="/logo.png"
          alt="thirdweb Logo"
          width={135}
          className={styles.buttonGapTop}
        />
      </div>
    );
  };
  
  export default Home;
  