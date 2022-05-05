import {User} from './user-types';

const headers = {
  'cache-control': 'no-cache',
  'Content-type': 'application/json; charset=UTF-8',
};

export const putUser = async (user: User) => {
  const body = JSON.stringify(user);

  const req = await fetch(
    `https://jsonplaceholder.typicode.com/users/${user.id}`,
    {
      method: 'PUT',
      headers,
      body,
    },
  );

  if (req.status !== 200) {
    throw new Error(`${req.status} ${req.statusText}`);
  }

  return req.json() as Promise<User>;
};

export const getUser = async (id: string) => {
  const res = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`, {
    headers,
  });
  return res.json() as Promise<User>;
};
