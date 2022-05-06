import {useQuery, useMutation} from 'react-query';
import {getUser, putUser} from './user-api';
import {User} from './user-types';
import {queryClient as qq} from './App';

export const userKeys = {
  all: () => ['user'],
  useUserQuery: (id: string) => [...userKeys.all(), 'use-user-query', id],
  useUserMutation: (id: string) => [...userKeys.all(), 'use-user-mutation', id],
};

export const useUserQuery = (id: string) => {
  return useQuery({
    queryKey: userKeys.useUserQuery(id),
    queryFn: async () => getUser(id),
  });
};

export const useUserMutation = (id: string) => {
  const key = userKeys.useUserMutation(id);
  return useMutation(putUser, {
    mutationKey: userKeys.useUserMutation(id),
    onMutate: async (reqData: User) => {
      // prevent collisions
      await qq.cancelQueries(key);

      // create rollback
      const snapshot = (await qq.getQueryData(key)) as User;

      // optimistic update
      qq.setQueryData(key, {...snapshot, ...reqData});

      // return rollback
      return () => qq.setQueryData(key, snapshot);
    },
    onSettled: async (resData, error, reqData, ctx) => {
      if (error) {
        ctx?.();
      }

      await qq.invalidateQueries(userKeys.all());
    },
  });
};

// rehydrated offline mutations are piped through here
qq.setMutationDefaults(userKeys.all(), {
  mutationFn: async (user: User) => {
    // prevent collisions
    qq.cancelQueries(userKeys.useUserMutation(user.id));

    return putUser(user);
  },
});
