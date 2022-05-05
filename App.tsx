import React from 'react';
import {
  AppStateStatus,
  Text,
  View,
  Platform,
  AppState,
  Button,
} from 'react-native';

import FlipperAsyncStorage from 'rn-flipper-async-storage-advanced';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {
  MutationCache,
  onlineManager,
  QueryClient,
  focusManager,
} from 'react-query';
import {createAsyncStoragePersister} from 'react-query/createAsyncStoragePersister';
import {PersistQueryClientProvider} from 'react-query/persistQueryClient';
import {useUserMutation, useUserQuery} from './user-queries';

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    const isOnline = state.isConnected === null ? undefined : state.isConnected;
    setOnline(isOnline);
  });
});

const useAppState = (onChange: (appState: AppStateStatus) => void) => {
  React.useEffect(() => {
    AppState.addEventListener('change', onChange);
    return () => {
      AppState.removeEventListener('change', onChange);
    };
  }, [onChange]);
};

const onAppStateChange = (status: AppStateStatus) => {
  const isWEB = Platform.OS === 'web';

  // React Query already supports in web browser refetch on window focus by default
  if (!isWEB) {
    focusManager.setFocused(status === 'active');
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24,
      retry: 0,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: data => {
      console.log('onSuccess', data);
    },
    onError: error => {
      console.log('onError', error);
    },
  }),
});

if (process.env.NODE_ENV === 'development') {
  import('react-query-native-devtools').then(({addPlugin}) => {
    addPlugin({queryClient});
  });
}

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'react-query-offline',
});

const Root = () => {
  const query = useUserQuery('1');
  const mutation = useUserMutation('1');

  return (
    <View>
      <Button
        title={'mutate'}
        disabled={mutation.isLoading}
        onPress={() => mutation.mutate({id: '1', name: 'test'})}
      />
      <Text>{query.status + ' ' + query.data?.name}</Text>
    </View>
  );
};

const App = () => {
  useAppState(onAppStateChange);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{persister, buster: '2'}}
      onSuccess={() => {
        console.log('persist success', Date.now());
        // resume mutations after initial restore from localStorage was successful
        queryClient.resumePausedMutations().then(() => {
          queryClient.invalidateQueries();
        });
      }}>
      <Root />
      <FlipperAsyncStorage />
    </PersistQueryClientProvider>
  );
};

export default App;
