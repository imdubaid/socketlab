# SocketLab

SocketLab is a lightweight, browser-native WebSocket developer toolkit for testing, debugging, and inspecting real-time connections. It helps developers connect to `ws://` and `wss://` endpoints, send and receive messages, inspect lifecycle events, and troubleshoot protocol behavior without needing a separate backend or heavy desktop app.

This project is intentionally simple: a single-page HTML app with a JavaScript client that uses the browser's native `WebSocket` API. It is designed for fast debugging of realtime services, message payloads, subprotocol negotiation, close codes, and client-side connection behavior.

## Why SocketLab exists

WebSocket debugging is often painful because developers need to:

- test a socket endpoint manually,
- inspect live message traffic,
- verify whether authentication or query parameters are working,
- confirm whether binary payloads and JSON messages are correct,
- debug close behavior and connection lifecycle events,
- export logs for later review.

SocketLab gives you a focused, local developer workspace to do all of that directly in the browser.

## What SocketLab does

SocketLab covers the full developer workflow for experimenting with WebSocket connections. It can:

- connect to any valid WebSocket URL using `ws://` or `wss://`,
- add query string parameters to the connection URL,
- negotiate optional subprotocols,
- open and close socket connections cleanly,
- send plain text, JSON, and UTF-8 binary payloads,
- receive text and binary messages from the server,
- capture connection lifecycle events such as open, error, and close,
- log every meaningful event in a searchable event stream,
- display message size and session timing,
- pretty-print JSON payloads automatically,
- filter event logs by source or error state,
- export the event log as a JSON file,
- provide a sample JSON payload for quick testing.

The application is especially useful when debugging:

- chat systems,
- realtime dashboards,
- backend event streaming,
- WebSocket auth flows,
- client/server protocol behavior,
- server push notifications,
- binary protocol testing,
- realtime API integration.

## Core features

### 1. Connection setup

SocketLab allows you to configure a connection with:

- WebSocket URL
- optional subprotocols
- query parameters
- binary receive mode (`Blob` or `ArrayBuffer`)

You can paste a URL, enter query parameters one-per-line as `key=value`, and define subprotocols as a comma-separated list.

### 2. Live connection state

The UI displays:

- current connection status,
- session duration,
- messages sent,
- messages received,
- active protocol information.

This gives immediate feedback for whether the socket is healthy and how long it remains open.

### 3. Message composer

The composer supports:

- plain text payloads,
- JSON payloads,
- UTF-8 binary payloads,
- formatting JSON before sending,
- sample JSON generation,
- payload byte size display,
- keyboard shortcut `Ctrl/Cmd + Enter` to send quickly.

The default send format can be changed to match the type of message you want to test.

### 4. Event stream and debugging

The app records a timeline of events, including:

- client-generated actions,
- server messages,
- system events,
- connection errors,
- close events.

You can:

- search logs,
- filter by source,
- pretty-print JSON,
- auto-scroll as new messages arrive,
- clear the stream,
- export logs to JSON.

### 5. Close frame support

The browser WebSocket API does not expose raw ping/pong frames, but SocketLab supports sending a normal WebSocket close frame by calling `socket.close()`. This is useful for testing clean shutdown behavior and verifying server-side close handling.

### 6. Client-side constraints and limitations

SocketLab is honest about browser limitations:

- browsers do not allow arbitrary custom HTTP headers on WebSocket handshakes,
- raw ping/pong frames are not exposed by the browser API,
- server-side logs are not available from the browser itself,
- the app observes only the client-side WebSocket events.

This is important when testing real backend behavior or debugging server internals.

## WebSocket developer toolkit

SocketLab is effectively a WebSocket developer toolkit for the browser. It is useful for:

- validating new WebSocket server endpoints,
- verifying auth tokens through query strings or protocol negotiation,
- checking message payload compatibility,
- debugging browser-to-server realtime communication,
- reviewing close codes and connection failures,
- comparing raw message flow during live app development,
- performing quick protocol testing before writing broader integration coverage.

### Typical toolkit workflow

1. Open the app in a browser.
2. Connect to a WebSocket endpoint.
3. Add required query parameters or subprotocols.
4. Send JSON or text messages.
5. Watch the event stream for lifecycle and message frames.
6. Inspect close codes and errors.
7. Export logs if needed for debugging or handoff.

## Project structure

The repository is intentionally minimal:

- `client.html` — the main user interface for the WebSocket client
- `index.js` — client logic for connection, sending, receiving, and event tracking
- `style.css` — app styling
- `README.md` — project documentation
- `LICENSE` — project license

## Quick start

Because this project is a static frontend app, you do not need a package manager or server framework.

### Option 1: Open directly in a browser

Open `client.html` in a browser.

### Option 2: Serve locally

If you want a local development server, run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/client.html
```

This is recommended when clipboard access or browser security policies require localhost.

## Example usage

Connect to a public echo service such as:

```text
wss://echo.websocket.events
```

Then send:

```json
{
    "type": "ping",
    "timestamp": "2026-10-29T12:00:00.000Z",
    "client": "SocketLab"
}
```

You can then inspect:

- whether the server echoes the message,
- frame timing,
- session status,
- any connection error or close code,
- payload formatting and message size.

## Browser support

SocketLab uses the browser-native `WebSocket` API and works in modern desktop browsers that support WebSockets, including:

- Chrome
- Edge
- Firefox
- Safari

For best results, use the latest version of a modern browser.

## Security and privacy notes

SocketLab is a local debugging utility. It does not send your socket traffic to a remote service; it runs in the browser and interacts directly with the target WebSocket server.

Important caveats:

- your browser still connects directly to the target server,
- you must ensure the destination endpoint is trusted,
- do not expose private credentials or tokens in public debugging tools,
- use proper security practices when testing production endpoints.

## Best practices for using SocketLab

- always test against a non-production endpoint first when possible,
- use query parameters for demo tokens or client identifiers, if supported by the server,
- format JSON before sending to reduce payload mistakes,
- inspect close codes when debugging disconnects,
- export logs when reproducing issues for teammates or backend engineers,
- remember that browser APIs cannot show raw server internals.

## Contributing

Contributions are welcome if you want to expand the tool with features such as:

- reconnect retry logic,
- custom authentication flows,
- message templates,
- import/export of saved sessions,
- charting or performance metrics,
- dark/light theme enhancements,
- more advanced protocol debugging tools.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Summary

SocketLab is a clean, practical WebSocket debugging tool for developers who need a fast, browser-based way to test realtime connections. It does not replace a production-grade WebSocket server implementation, but it is an excellent developer toolkit for validating, inspecting, and troubleshooting websocket behavior in real time.
