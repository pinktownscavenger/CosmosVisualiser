import { QUERY_ENDPOINT } from '../constants';

export const executeQuery = ({ query, nodeLimit }) => {
  return fetch(QUERY_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, nodeLimit })
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Query request failed with status ${response.status}`);
    }

    return response.json();
  }).then((data) => ({ data }));
};
