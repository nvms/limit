// node-redis only reads host/port from the nested socket object and silently
// ignores them at the top level, so lift the documented flat fields into place
export function toClientOptions({ host, port, ...rest } = {}) {
  if (rest.url || (host === undefined && port === undefined)) return rest
  return { ...rest, socket: { host: host ?? '127.0.0.1', port: port ?? 6379, ...rest.socket } }
}
