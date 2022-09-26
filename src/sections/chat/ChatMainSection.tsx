// React + Web3 Essentials
import { useWeb3React } from '@web3-react/core';
import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';

// External Packages
import { ThreeIdConnect } from '@3id/connect';
import { getResolver as threeIDDIDGetResolver } from '@ceramicnetwork/3id-did-resolver';
import { CeramicClient } from '@ceramicnetwork/http-client';
import { ItemHV2, ItemVV2 } from 'components/reusables/SharedStylingV2';
import { DID } from 'dids';
import useToast from 'hooks/useToast';
import { getResolver as keyDIDGetResolver } from 'key-did-resolver';
import { MdCheckCircle, MdError } from 'react-icons/md';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styled, { useTheme } from 'styled-components';

// Internal Compoonents
import * as PushNodeClient from 'api';
import { ConnectedUser, Feeds, User } from 'api';
import ChatBox from 'components/chat/w2wChat/chatBox/chatBox';
import Sidebar from 'components/chat/w2wChat/sidebar/sidebar';
import LoaderSpinner, {
  LOADER_OVERLAY,
  LOADER_TYPE,
  PROGRESS_POSITIONING
} from 'components/reusables/loaders/LoaderSpinner';
import * as w2wHelper from 'helpers/w2w';
import { createCeramic } from 'helpers/w2w/ceramic';
import * as DIDHelper from 'helpers/w2w/did';
import ChatBoxSection from 'sections/chat/ChatBoxSection';
import ChatSidebarSection from 'sections/chat/ChatSidebarSection';

// Internal Configs
import GLOBALS, { device } from 'config/Globals';
import CryptoHelper from 'helpers/CryptoHelper';

export interface InboxChat {
  name: string;
  profilePicture: string;
  timestamp: number;
  fromDID: string;
  toDID: string;
  fromCAIP10: string,
  toCAIP10: string,
  lastMessage: string;
  messageType: string;
  encType: string;
  signature: string;
  signatureType: string;
  encryptedSecret: string;
}

interface BlockedLoadingI {
  enabled: boolean;
  title: string;
  spinnerEnabled?: boolean;
  spinnerSize?: number;
  spinnerCompleted?: boolean;
  progressEnabled?: boolean;
  progress?: number;
  progressNotice?: string;
}

export interface AppContext {
  currentChat: Feeds;
  viewChatBox: boolean;
  receivedIntents: Feeds[];
  setReceivedIntents: (rIntent: Feeds[]) => void;
  // did: DID;
  // setDID: (did: DID) => void;
  setSearchedUser: (searched: string) => void;
  searchedUser: string;
  setChat: (feed: Feeds) => void;
  connectedUser: ConnectedUser;
  setConnectedUser: (user: ConnectedUser) => void;
  intents: Feeds[];
  setIntents: (intents: Feeds[]) => void;
  inbox: Feeds[];
  setInbox: (inbox: Feeds[]) => void;
  pendingRequests: number;
  setPendingRequests: (pending: number) => void;
  hasUserBeenSearched: boolean;
  setHasUserBeenSearched: (searched: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (loadingMessage: string) => void;
  setBlockedLoading: (blockedLoading: BlockedLoadingI) => void;
  activeTab: number;
  setActiveTab: (active: number) => void;
}

export const ToastPosition: ToastOptions = {
  position: 'top-right',
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: 0,
};

export const Context = React.createContext<AppContext | null>(null);

// Chat Sections
// Divided into two, left and right
const ChatMainSection = () => {
  const { connector, account, chainId, library } = useWeb3React<ethers.providers.Web3Provider>();

  const theme = useTheme();

  const [viewChatBox, setViewChatBox] = useState<boolean>(false);
  const [currentChat, setCurrentChat] = useState<Feeds>();
  const [receivedIntents, setReceivedIntents] = useState<Feeds[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [blockedLoading, setBlockedLoading] = useState<BlockedLoadingI>({
    enabled: false,
    title: null,
  });
  const [user, setUser] = useState();
  const [did, setDID] = useState<DID>();
  const [searchedUser, setSearchedUser] = useState<string>('');
  const [connectedUser, setConnectedUser] = useState<ConnectedUser>();
  const [intents, setIntents] = useState<Feeds[]>([]);
  const [inbox, setInbox] = useState<Feeds[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [hasUserBeenSearched, setHasUserBeenSearched] = useState<boolean>(false);
  const [activeTab, setCurrentTab] = useState<number>(0);

  const chatBoxToast = useToast();
  const queryClient = new QueryClient({});

  useEffect(() => {
    if (isLoading) {
      connectUser();
    }
  }, []);

  // const connectAndSetDID = async (): Promise<DID> => {
  //   setBlockedLoading({
  //     enabled: true,
  //     title: 'Step 3/4: Creating DID',
  //     progressEnabled: true,
  //     progress: 75,
  //     progressNotice:
  //       'We use Ceramic to enable multichain and multiwallet experience. You will need to sign two transactions when they appear.',
  //   });

  //   try {
  //     const provider: Promise<any> = await connector.getProvider();
  //     const threeID: ThreeIdConnect = new ThreeIdConnect();
  //     const ceramic: CeramicClient = createCeramic();
  //     const didProvider = await DIDHelper.Get3IDDIDProvider(threeID, provider, account);
  
  //     const did: DID = await DIDHelper.CreateDID(keyDIDGetResolver, threeIDDIDGetResolver, ceramic, didProvider);
  //     setDID(did);
  //     return did;
  //   } catch (error) {
  //     chatBoxToast.showMessageToast({
  //       toastTitle: 'Error fetching your DID',
  //       toastMessage: `Please reload the page`,
  //       toastType: 'ERROR',
  //       getToastIcon: (size) => <MdError size={size} color="red" />,
  //     });
  //   }
  // };

  // const connectToCeramic = async (): Promise<void> => {
  //   // Getting User Info
  //   setBlockedLoading({
  //     enabled: true,
  //     title: 'Step 1/4: Getting Account Info',
  //     progressEnabled: true,
  //     progress: 25,
  //     progressNotice: 'Push Chat is in alpha and might be slow sometimes',
  //   });

  //   const caip10: string = w2wHelper.walletToCAIP10({ account, chainId });
  //   let user: User = await PushNodeClient.getUser({ caip10 });

  //   // TODO: Change this to do verification on ceramic to validate if did is valid
  //   if (user?.did.includes('did:3:')) {
  //     // Getting User Info
  //     setBlockedLoading({
  //       enabled: true,
  //       title: 'Step 2/4: Checking for DID',
  //       progressEnabled: true,
  //       progress: 50,
  //       progressNotice: 'DID enables you to chat multichain with anyone',
  //     });

  //     await connectAndSetDID();
  //   }

  //   if (user) {
  //     if (!user.wallets.includes(caip10)) {
  //       setBlockedLoading({
  //         enabled: true,
  //         title: 'Step 3/4: Syncing your Info',
  //         progressEnabled: true,
  //         progress: 90,
  //         progressNotice: 'Almost done! Please wait while we sync up your info',
  //       });

  //       user = await PushNodeClient.updateUser({ did: did.id, caip10 });
  //     }
  //   } else {
  //     user = {
  //       // We only need to provide this information when it's a new user
  //       name: 'john-snow',
  //       profilePicture:
  //         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAvklEQVR4AcXBsW2FMBiF0Y8r3GQb6jeBxRauYRpo4yGQkMd4A7kg7Z/GUfSKe8703fKDkTATZsJsrr0RlZSJ9r4RLayMvLmJjnQS1d6IhJkwE2bT13U/DBzp5BN73xgRZsJMmM1HOolqb/yWiWpvjJSUiRZWopIykTATZsJs5g+1N6KSMiO1N/5DmAkzYTa9Lh6MhJkwE2ZzSZlo7xvRwson3txERzqJhJkwE2bT6+JhoKTMJ2pvjAgzYSbMfgDlXixqjH6gRgAAAABJRU5ErkJggg==',
  //       wallets: caip10,
  //       ///
  //       about: '',
  //       allowedNumMsg: 0,
  //       did: '',
  //       encryptedPrivateKey: '',
  //       encryptionType: '',
  //       numMsg: 0,
  //       publicKey: '',
  //       sigType: '',
  //       signature: '',
  //       linkedListHash: '',
  //     };
  //   }

  //   setBlockedLoading({
  //     enabled: false,
  //     title: "Step 4/4: Let's Chat ;)",
  //     spinnerCompleted: true,
  //     progressEnabled: true,
  //     progress: 100,
  //   });

  //   setConnectedUser(user);
  //   setIsLoading(false);
  // };


  const connectUser = async (): Promise<void> => {
    // Getting User Info
    setBlockedLoading({
      enabled: true,
      title: "Step 1/4: Getting Account Info",
      progressEnabled: true,
      progress: 25,
      progressNotice: "Reminder: Push Chat is in alpha, you might need to sign a decrypt transaction to continue"
    });

    const caip10: string = w2wHelper.walletToCAIP10({ account, chainId });
    const user: User = await PushNodeClient.getUser({ caip10 });
    let connectedUser: ConnectedUser;

    // TODO: Change this to do verification on ceramic to validate if did is valid
    if (user?.did.includes('did:3:')) {
      throw Error('Invalid DID')
    }

    // new user might not have a private key
    if (user && user.encryptedPrivateKey) {
      if (user.wallets.includes(',') || !user.wallets.includes(caip10)) {
        throw Error('Invalid user')
      }

      const privateKeyArmored: string = await CryptoHelper.decryptWithWalletRPCMethod(library.provider, user.encryptedPrivateKey, account);
      connectedUser = { ...user, privateKey: privateKeyArmored }
    } else {
      connectedUser = {
        // We only need to provide this information when it's a new user
        name: 'john-snow',
        profilePicture:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAvklEQVR4AcXBsW2FMBiF0Y8r3GQb6jeBxRauYRpo4yGQkMd4A7kg7Z/GUfSKe8703fKDkTATZsJsrr0RlZSJ9r4RLayMvLmJjnQS1d6IhJkwE2bT13U/DBzp5BN73xgRZsJMmM1HOolqb/yWiWpvjJSUiRZWopIykTATZsJs5g+1N6KSMiO1N/5DmAkzYTa9Lh6MhJkwE2ZzSZlo7xvRwson3txERzqJhJkwE2bT6+JhoKTMJ2pvjAgzYSbMfgDlXixqjH6gRgAAAABJRU5ErkJggg==',
        wallets: caip10,
        ///
        about: '',
        allowedNumMsg: 0,
        did: caip10,
        encryptedPrivateKey: '',
        encryptionType: '',
        numMsg: 0,
        publicKey: '',
        sigType: '',
        signature: '',
        linkedListHash: '',
        privateKey: ''
      };
    }

    setBlockedLoading({
      enabled: false,
      title: "Step 4/4: Let's Chat ;)",
      spinnerCompleted: true,
      progressEnabled: true,
      progress: 100,
    })

    setConnectedUser(connectedUser);
    setIsLoading(false);
  }


  const setActiveTab = (tab: number): void => {
    if (tab === 1) {
      if(intents.length)
        setChat(intents[0]);
      else
        setChat(null);
        setCurrentTab(tab);
    } else {
        setCurrentTab(tab);
    } 
  };

  const setChat = (feed: Feeds): void => {
    if (feed) {
      setViewChatBox(true);
      setCurrentChat(feed);
    } else {
      setViewChatBox(false);
    }
  };

  // RENDER
  return (
    <ItemHV2>
      {!isLoading ? (
        <QueryClientProvider client={queryClient}>
          <Context.Provider
            value={{
              currentChat,
              receivedIntents,
              setReceivedIntents,
              viewChatBox,
              setChat,
              setSearchedUser,
              searchedUser,
              connectedUser,
              setConnectedUser,
              intents,
              setIntents,
              inbox,
              setInbox,
              pendingRequests,
              setPendingRequests,
              hasUserBeenSearched,
              setHasUserBeenSearched,
              loadingMessage,
              setLoadingMessage,
              setBlockedLoading,
              activeTab,
              setActiveTab
            }}
          >
            <ChatSidebarContainer
              flex="1"
              maxWidth="340px"
              minWidth="280px"
              padding="10px 10px 10px 20px"
              boxSizing="content-box"
              background={theme.default.bg}
              chatActive={viewChatBox}
            >
              <ChatSidebarSection />
            </ChatSidebarContainer>
            <ChatContainer 
              padding="10px 10px 10px 10px"
              chatActive={viewChatBox}
            >
              <ChatBoxSection />
            </ChatContainer>
          </Context.Provider>
          {/* The rest of your application */}
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      ) : (
        <LoaderSpinner type={LOADER_TYPE.SEAMLESS} />
      )}

      {/* This always needs to be last */}
      {blockedLoading.enabled && (
        <LoaderSpinner
          type={LOADER_TYPE.STANDALONE}
          overlay={LOADER_OVERLAY.ONTOP}
          blur={GLOBALS.ADJUSTMENTS.BLUR.DEFAULT}
          title={blockedLoading.title}
          width="50%"
          spinnerEnabled={blockedLoading.spinnerEnabled}
          spinnerSize={blockedLoading.spinnerSize}
          spinnerCompleted={blockedLoading.spinnerCompleted}
          progressEnabled={blockedLoading.progressEnabled}
          progressPositioning={PROGRESS_POSITIONING.BOTTOM}
          progress={blockedLoading.progress}
          progressNotice={blockedLoading.progressNotice}
        />
      )}
    </ItemHV2>
  );
};
export default ChatMainSection;

const ChatSidebarContainer = styled(ItemVV2)`
  @media ${device.tablet} {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 100%;
    margin-right: ${(props) => props.chatActive ? '20%' : '0%'};
    opacity: ${(props) => props.chatActive ? '0' : '1'};
    transition: margin-right 0.25s;
    max-width: initial;
    min-width: auto;
    z-index: 1;
  }
`

const ChatContainer = styled(ItemVV2)`
  @media ${device.tablet} {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    margin-left: ${(props) => props.chatActive ? '0%' : '100%'};
    transition: margin-left 0.25s;
    max-width: initial;
    min-width: auto;
    z-index: 2;
  }
`