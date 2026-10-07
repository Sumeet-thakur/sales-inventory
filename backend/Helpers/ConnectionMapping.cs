using System.Collections.Concurrent;

namespace SalesInventoryAPI.Helpers
    {

    public interface IConnectionMapping<T>
        {
        void Add ( T key, string connectionId );
        void Remove ( T key, string connectionId );
        IReadOnlyCollection<string> GetConnections ( T key );
        }
    public class ConnectionMapping<T> : IConnectionMapping<T>
        {
        private readonly ConcurrentDictionary<T, ConcurrentDictionary<string, byte>> _map =
            new ConcurrentDictionary<T, ConcurrentDictionary<string, byte>>();

        public void Add ( T key, string connectionId )
            {
            var connections = _map.GetOrAdd(key, _ => new ConcurrentDictionary<string, byte>());
            connections[connectionId] = 0;
            }

        public void Remove ( T key, string connectionId )
            {
            if (_map.TryGetValue(key, out var connections))
                {
                connections.TryRemove(connectionId, out _);
                if (connections.IsEmpty)
                    {
                    _map.TryRemove(key, out _);
                    }
                }
            }

        public IReadOnlyCollection<string> GetConnections ( T key )
            {
            if (_map.TryGetValue(key, out var connections))
                return (IReadOnlyCollection<string>)connections.Keys;
            return Array.Empty<string>();
            }
        }
    }
