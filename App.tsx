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
import NetInfo from '@react-native-community/netinfo';

import {
  MutationCache,
  onlineManager,
  QueryClient,
  focusManager,
} from 'react-query';
import {
  PersistQueryClientProvider,
  PersistedClient,
  Persister,
} from 'react-query/persistQueryClient';

// import throttle from 'lodash/throttle';
import {MMKVLoader} from 'react-native-mmkv-storage';

import {useUserMutation, useUserQuery} from './user-queries';

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

const logger = (...args: any[]) => {
  console.log(...args);
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 48,
      retry: 2,
    },
  },
  mutationCache: new MutationCache({
    onSuccess: (data, vars, context, mutation) => {
      logger('onSuccess', data, vars, context, mutation);
    },
    onError: error => {
      logger('onError', error);
    },
  }),
});

if (process.env.NODE_ENV === 'development') {
  import('react-query-native-devtools').then(({addPlugin}) => {
    addPlugin({queryClient});
  });
}

const mmkv = new MMKVLoader().withEncryption().initialize();

const persister: Persister = {
  persistClient: client => {
    mmkv.setString('react-query-client', JSON.stringify(client));
    logger('dehydrated client', client);
  },
  restoreClient: () => {
    const res = JSON.parse(
      mmkv.getString('react-query-client') as string,
    ) as PersistedClient;

    logger('hydrated client', res);
    return res;
  },
  removeClient: () => {
    mmkv.clearStore();
  },
};

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    const isOnline = state.isConnected === null ? undefined : state.isConnected;
    setOnline(isOnline);
  });
});

const Root = () => {
  const query = useUserQuery('1');
  const mutation = useUserMutation('1');

  return (
    <View>
      <Button
        title={'mutate'}
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
        console.log('client restored');
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
