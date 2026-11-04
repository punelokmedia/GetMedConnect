import React, { useCallback, useEffect, useState } from 'react';
import { createRealtimeClient } from '@neon/realtime/client';
import { RealtimeProvider, useLiveQuery } from '@neon/realtime-react';

async function fetchQuery(token, collection, signal) {
  const response = await fetch(`/api/admin/live/${collection}`, { signal, headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(response.status === 503 ? 'Live updates are not configured. Use Refresh.' : 'Live connection unavailable. Use Refresh.');
  return response.json();
}
function LiveCollection({ token, collection, sealedQuery, onRows, onStatus }) {
  const refreshQuery = useCallback(async () => (await fetchQuery(token, collection)).sealedQuery, [token, collection]);
  const { data, status } = useLiveQuery(sealedQuery, { refreshQuery });
  useEffect(() => {
    if (data !== undefined) onRows(previous => ({ ...previous, [collection]: data.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]))) }));
  }, [data, collection, onRows]);
  useEffect(() => { onStatus(previous => ({ ...previous, [collection]: status })); }, [status, collection, onStatus]);
  return null;
}
export function AdminLiveSync({ token, onRows }) {
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState('');
  const [states, setStates] = useState({});
  useEffect(() => {
    const controller = new AbortController();
    let client;
    Promise.all(['leads', 'doctors', 'appointments'].map(async collection => ({ collection, ...await fetchQuery(token, collection, controller.signal) })))
      .then(queries => {
        if (controller.signal.aborted) return;
        client = createRealtimeClient({ url: queries[0].url });
        setConnection({ client, queries });
      }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => { controller.abort(); client?.close(); };
  }, [token]);
  const values = Object.values(states);
  const status = error || (values.some(value => value === 'error') ? 'Live updates interrupted. Use Refresh or sign in again.' : values.length === 3 && values.every(value => value === 'live') ? '● Live updates connected' : 'Connecting live updates…');
  return <div className="live-status" role="status">{status}{connection && <RealtimeProvider client={connection.client}>{connection.queries.map(({ collection, sealedQuery }) => <LiveCollection key={collection} token={token} collection={collection} sealedQuery={sealedQuery} onRows={onRows} onStatus={setStates}/>)}</RealtimeProvider>}</div>;
}
