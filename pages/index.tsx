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
  useChainId,
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
import { ConnectWalletButton } from "../shared/connect-wallet-button";

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
  const chainId = useChainId();
  const [, switchNetwork] = useNetwork();
  const loaded = useRef(false);
  const expectedChainId = ChainId.Rinkeby;
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
      switchNetwork && switchNetwork(expectedChainId);
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

  
  // Enable all queries
  const isEnabled = !!nftDrop && !!address && chainId === expectedChainId;
  if (!isEnabled) {
    return (
      <ConnectWalletButton
        expectedChainId={expectedChainId}
        primaryColor={'blue'}
        secondaryColor={'white'}
      />
    );
  }

  return (
    <Stack spacing={4} align="center" w="100%">
      <Flex w="100%" direction={{ base: "column", sm: "row" }} gap={2}>
        <NumberInput
          inputMode="numeric"
          value={quantity}
          onChange={(stringValue, value) => {
            if (stringValue === "") {
              setQuantity(1);
            } else {
              setQuantity(value);
            }
          }}
          min={1}
          max={lowerMaxClaimable}
          maxW={{ base: "100%", sm: "100px" }}
          bgColor="inputBg"
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        <LightMode>
          <Button
            fontSize={{ base: "label.md", md: "label.lg" }}
            isLoading={claimNFT.isLoading || isLoading}
            isDisabled={!canClaim}
            leftIcon={<IoDiamondOutline />}
            onClick={mint}
            w="100%"
            colorScheme={'blue'}
          >
            {isSoldOut
              ? "Sold out"
              : canClaim
              ? `Mint${quantity > 1 ? ` ${quantity}` : ""}${
                  activeClaimCondition?.price.eq(0)
                    ? " (Free)"
                    : activeClaimCondition?.currencyMetadata.displayValue
                    ? ` (${formatUnits(
                        priceToMint,
                        activeClaimCondition.currencyMetadata.decimals,
                      )} ${activeClaimCondition?.currencyMetadata.symbol})`
                    : ""
                }`
              : claimIneligibilityReasons.data?.length
              ? parseIneligibility(claimIneligibilityReasons.data, quantity)
              : "Minting Unavailable"}
          </Button>
        </LightMode>
      </Flex>
      {claimedSupply && (
        <Text size="label.md" color="green.500">
          {`${claimedSupply?.toString()} / ${(
            claimedSupply?.add(unclaimedSupply || 0) || 0
          ).toString()} claimed`}
        </Text>
      )}
    </Stack>
  );
};

export default Home;
