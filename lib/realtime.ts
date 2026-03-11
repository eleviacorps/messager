export type StreamClient = {
  roomId: string;
  send: (payload: unknown) => void;
  close: () => void;
};

declare global {
  // eslint-disable-next-line no-var
  var roomStreams: Map<string, Set<StreamClient>> | undefined;
}

const streams = global.roomStreams || new Map<string, Set<StreamClient>>();
if (!global.roomStreams) global.roomStreams = streams;

export function addStreamClient(roomId: string, client: StreamClient) {
  if (!streams.has(roomId)) streams.set(roomId, new Set());
  streams.get(roomId)!.add(client);
}

export function removeStreamClient(roomId: string, client: StreamClient) {
  streams.get(roomId)?.delete(client);
}

export function broadcast(roomId: string, payload: unknown) {
  const roomClients = streams.get(roomId);
  if (!roomClients) return;
  roomClients.forEach((client) => client.send(payload));
}
