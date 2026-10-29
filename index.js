(() => {
    const $ = id => document.getElementById(id);
    let socket = null,
        startedAt = null,
        durationTimer = null,
        sent = 0,
        received = 0,
        entries = [],
        nextId = 1;
    const esc = s =>
        String(s).replace(
            /[&<>"']/g,
            c =>
                ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;',
                })[c],
        );
    const bytes = value => new TextEncoder().encode(value).length;
    const stamp = () =>
        new Date().toLocaleTimeString([], {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }) +
        '.' +
        String(new Date().getMilliseconds()).padStart(3, '0');

    function toast(message) {
        const el = $('toast');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => el.classList.remove('show'), 2600);
    }

    function log(source, title, detail = '', kind = 'info') {
        if (!$('lifecycle').checked && source === 'system' && !['error', 'success'].includes(kind)) return;
        entries.push({
            id: nextId++,
            time: stamp(),
            source,
            title,
            detail: String(detail ?? ''),
            kind,
        });
        if (entries.length > 3000) entries = entries.slice(-3000);
        renderLogs();
    }

    function displayDetail(detail) {
        if (!detail) return '';
        let output = detail;
        if ($('prettyJson').checked) {
            try {
                const parsed = JSON.parse(detail);
                output = JSON.stringify(parsed, null, 2);
            } catch {}
        }
        return esc(output);
    }

    function renderLogs() {
        const q = $('logSearch').value.trim().toLowerCase(),
            filter = $('logFilter').value;
        const filtered = entries.filter(
            e =>
                (filter === 'all' || e.source === filter || (filter === 'error' && e.kind === 'error')) &&
                (!q || (e.title + ' ' + e.detail + ' ' + e.source).toLowerCase().includes(q)),
        );
        $('emptyState')?.remove();
        if (!filtered.length) {
            $('logList').innerHTML = '<div class="empty"><strong>No matching events</strong>Try another filter or connect and send a message.</div>';
        } else
            $('logList').innerHTML = filtered
                .map(
                    e =>
                        `<div class="log-entry"><div class="time">${esc(e.time)}</div><div><span class="tag ${esc(e.kind === 'error' ? 'error' : e.kind === 'success' ? 'success' : e.source)}">${esc(e.source)}</span></div><div class="log-content"><div class="log-title">${esc(e.title)}</div>${e.detail ? `<div class="log-detail">${displayDetail(e.detail)}</div>` : ''}</div></div>`,
                )
                .join('');
        $('logSummary').textContent = `${entries.length.toLocaleString()} events · ${filtered.length.toLocaleString()} shown`;
        if ($('autoScroll').checked) $('logList').scrollTop = $('logList').scrollHeight;
    }

    function setStatus(state, sub = '') {
        const connected = state === 'Connected';
        $('statusText').textContent = state;
        $('statusDot').className = 'dot' + (connected ? ' live' : '');
        $('metricState').textContent = state;
        $('metricStateSub').textContent = sub || (connected ? 'WebSocket is open' : 'Waiting to connect');
        $('composerStatus').textContent = connected ? 'Ready to send' : 'Connect to start sending';
        $('composerDot').className = 'dot' + (connected ? ' live' : '');
        $('connectBtn').disabled = !!socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN);
        $('disconnectBtn').disabled = !socket || socket.readyState === WebSocket.CLOSED;
        $('sendBtn').disabled = !socket || socket.readyState !== WebSocket.OPEN;
        $('closeFrameBtn').disabled = !socket || socket.readyState !== WebSocket.OPEN;
    }

    function updateCounters() {
        $('sentCount').textContent = sent.toLocaleString();
        $('receivedCount').textContent = received.toLocaleString();
    }

    function updateDuration() {
        if (!startedAt) {
            $('duration').textContent = '00:00';
            return;
        }
        const sec = Math.floor((Date.now() - startedAt) / 1000);
        $('duration').textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    }

    function buildUrl() {
        let raw = $('url').value.trim();
        if (!raw) throw Error('Enter a WebSocket URL.');
        let url;
        try {
            url = new URL(raw);
        } catch {
            throw Error('That URL is not valid. Include ws:// or wss://.');
        }
        if (!['ws:', 'wss:'].includes(url.protocol)) throw Error('WebSocket URLs must use ws:// or wss://.');
        const params = $('params')
            .value.split(/\r?\n/)
            .map(x => x.trim())
            .filter(Boolean);
        for (const line of params) {
            const i = line.indexOf('=');
            if (i < 1) throw Error(`Invalid query parameter: ${line}. Use key=value.`);
            url.searchParams.set(line.slice(0, i).trim(), line.slice(i + 1).trim());
        }
        return url.toString();
    }

    function connect() {
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            toast('A connection is already active.');
            return;
        }
        let url, protocols;
        try {
            url = buildUrl();
            protocols = $('protocols')
                .value.split(',')
                .map(x => x.trim())
                .filter(Boolean);
            if (new Set(protocols).size !== protocols.length) throw Error('Subprotocols must be unique.');
        } catch (e) {
            toast(e.message);
            log('system', 'Connection setup failed', e.message, 'error');
            return;
        }
        try {
            log('client', 'Connecting', url);
            socket = protocols.length ? new WebSocket(url, protocols) : new WebSocket(url);
            socket.binaryType = $('binaryType').value;
            setStatus('Connecting', 'Opening handshake in progress');
            socket.addEventListener('open', () => {
                startedAt = Date.now();
                clearInterval(durationTimer);
                durationTimer = setInterval(updateDuration, 1000);
                updateDuration();
                setStatus('Connected', `Protocol: ${socket.protocol || 'none selected'}`);
                log(
                    'system',
                    'Connection opened',
                    `URL: ${url}\nProtocol: ${socket.protocol || '(none)'}\nExtensions: ${socket.extensions || '(none)'}`,
                    'success',
                );
            });
            socket.addEventListener('message', async event => {
                received++;
                updateCounters();
                let detail, title;
                if (typeof event.data === 'string') {
                    detail = event.data;
                    title = `Text message · ${bytes(detail)} bytes`;
                } else if (event.data instanceof Blob) {
                    detail = await event.data.text();
                    title = `Binary message · ${event.data.size} bytes`;
                } else if (event.data instanceof ArrayBuffer) {
                    detail = new TextDecoder().decode(event.data);
                    title = `Binary message · ${event.data.byteLength} bytes`;
                } else {
                    detail = String(event.data);
                    title = 'Message received';
                }
                log('server', title, detail, 'info');
            });
            socket.addEventListener('error', () => {
                log(
                    'error',
                    'WebSocket error',
                    'The browser reported a connection error. Check the URL, TLS certificate, server availability, and origin policy.',
                    'error',
                );
            });
            socket.addEventListener('close', event => {
                clearInterval(durationTimer);
                durationTimer = null;
                log(
                    'system',
                    'Connection closed',
                    `Code: ${event.code}\nReason: ${event.reason || '(no reason supplied)'}\nClean close: ${event.wasClean ? 'yes' : 'no'}`,
                    event.wasClean ? 'info' : 'error',
                );
                setStatus('Disconnected', `Close code ${event.code}`);
                startedAt = null;
                updateDuration();
                socket = null;
                setStatus('Disconnected', `Close code ${event.code}`);
            });
        } catch (e) {
            socket = null;
            setStatus('Disconnected');
            log('error', 'Could not create connection', e.message, 'error');
            toast(e.message);
        }
    }

    function send() {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            toast('Connect before sending.');
            return;
        }
        const value = $('message').value,
            format = $('messageFormat').value;
        if (format === 'json') {
            try {
                JSON.parse(value);
            } catch (e) {
                toast('Invalid JSON: ' + e.message);
                return;
            }
        }
        try {
            if (format === 'binary') socket.send(new TextEncoder().encode(value));
            else socket.send(value);
            sent++;
            updateCounters();
            log(
                'client',
                `${format === 'binary' ? 'Binary' : format === 'json' ? 'JSON' : 'Text'} message sent · ${bytes(value)} bytes`,
                value,
                'success',
            );
        } catch (e) {
            log('error', 'Send failed', e.message, 'error');
            toast(e.message);
        }
    }
    $('connectBtn').addEventListener('click', connect);
    $('disconnectBtn').addEventListener('click', () => {
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            log('client', 'Disconnect requested', 'Calling close(1000, "Client disconnect")');
            try {
                socket.close(1000, 'Client disconnect');
            } catch (e) {
                toast(e.message);
            }
        }
    });
    $('closeFrameBtn').addEventListener('click', () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            log('client', 'Close requested', 'Browser sends a WebSocket close control frame (code 1000).');
            socket.close(1000, 'Client requested close');
        }
    });
    $('sendBtn').addEventListener('click', send);
    $('message').addEventListener('input', () => {
        $('payloadSize').textContent = bytes($('message').value).toLocaleString() + ' bytes';
    });
    $('message').addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            send();
        }
    });
    $('sendFormat').addEventListener('change', () => {
        $('messageFormat').value = $('sendFormat').value;
    });
    $('messageFormat').addEventListener('change', () => {
        $('sendFormat').value = $('messageFormat').value;
    });
    $('formatBtn').addEventListener('click', () => {
        try {
            $('message').value = JSON.stringify(JSON.parse($('message').value), null, 2);
            $('messageFormat').value = 'json';
            $('sendFormat').value = 'json';
            $('payloadSize').textContent = bytes($('message').value) + ' bytes';
        } catch (e) {
            toast('Cannot format invalid JSON: ' + e.message);
        }
    });
    $('sampleBtn').addEventListener('click', () => {
        $('message').value = JSON.stringify(
            {
                type: 'ping',
                timestamp: new Date().toISOString(),
                client: 'SocketLab',
            },
            null,
            2,
        );
        $('messageFormat').value = 'json';
        $('sendFormat').value = 'json';
        $('payloadSize').textContent = bytes($('message').value) + ' bytes';
    });
    $('clearComposerBtn').addEventListener('click', () => {
        $('message').value = '';
        $('payloadSize').textContent = '0 bytes';
        $('message').focus();
    });
    $('clearLogsBtn').addEventListener('click', () => {
        entries = [];
        renderLogs();
        toast('Event stream cleared');
    });
    $('logSearch').addEventListener('input', renderLogs);
    $('logFilter').addEventListener('change', renderLogs);
    $('prettyJson').addEventListener('change', renderLogs);
    $('exportBtn').addEventListener('click', () => {
        const data = {
            exportedAt: new Date().toISOString(),
            url: $('url').value,
            events: entries,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json',
            }),
            link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'socketlab-logs-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
        link.click();
        URL.revokeObjectURL(link.href);
        toast('Log export downloaded');
    });
    $('pasteUrl').addEventListener('click', async () => {
        try {
            $('url').value = await navigator.clipboard.readText();
            toast('URL pasted');
        } catch {
            toast('Clipboard access is unavailable. Paste with Ctrl+V.');
        }
    });
    $('binaryType').addEventListener('change', () => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.binaryType = $('binaryType').value;
            log('client', 'Binary receive mode changed', socket.binaryType);
        }
    });
    window.addEventListener('beforeunload', () => {
        if (socket && socket.readyState === WebSocket.OPEN) socket.close(1001, 'Page unloading');
    });
    setStatus('Disconnected');
    updateCounters();
    renderLogs();
})();
