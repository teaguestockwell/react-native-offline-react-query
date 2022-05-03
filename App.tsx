import React from 'react';
import {Text, View} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import {MutationCache, onlineManager, QueryClient, useQuery} from 'react-query';
import {createAsyncStoragePersister} from 'react-query/createAsyncStoragePersister';
import {PersistQueryClientProvider} from 'react-query/persistQueryClient';

onlineManager.setEventListener(setOnline => {
  return NetInfo.addEventListener(state => {
    const isOnline = state.isConnected === null ? undefined : state.isConnected;
    setOnline(isOnline);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24,
      staleTime: 2000,
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

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'react-query-offline',
});

const Root = () => {
  const [store, setStore] = React.useState<string | null | undefined>();
  AsyncStorage.getItem('react-query-offline').then(setStore);

  const query = useQuery({
    queryKey: ['use-mock-users'],
    queryFn: async () => {
      console.log('fetching users');
      const res = await fetch('https://jsonplaceholder.typicode.com/users');
      const body = await res.json();
      return body as {
        id: string;
        name: string;
      };
    },
  });

  return (
    <View>
      <Text>{JSON.stringify(query)}</Text>
      <Text>{store}</Text>
    </View>
  );
};

const App = () => {
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
    </PersistQueryClientProvider>
  );
};

export default App;
