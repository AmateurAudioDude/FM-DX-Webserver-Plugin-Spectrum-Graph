/*
    Spectrum Graph v1.4.0 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph

    //// Server-side code ////
*/

'use strict';

const pluginVersion = '1.4.0';

const AUTO_RESTART_ON_CONNECTION_ERROR = true;
const FORCE_FALLBACK = false;

const pluginName = "Spectrum Graph";

// Library imports
const express = require('express');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Define paths used for file imports and config
const rootDir = path.dirname(require.main.filename); // Locate directory where index.js is located
const configFolderPath = path.join(rootDir, 'plugins_configs');
const configFilePath = path.join(configFolderPath, 'SpectrumGraph.json');

// File imports
const config = require(rootDir + '/config.json');
const { logInfo, logWarn, logError } = require(rootDir + '/server/console');
const datahandlerReceived = require(rootDir + '/server/datahandler'); // To grab signal strength data
const endpointsRouter = require(rootDir + '/server/endpoints');

// Compatibility detection for hooks
let pluginsApi = null;
let wss, pluginsWss, serverConfig;
let sendPrivilegedCommand;
let useHooks = false;
let usePrivileged = false;
let isInternalScan = false; // fallback
let emitPluginEvent = () => {};

// Fallback WebSocket send
sendPrivilegedCommand = async (command) => {
    if (textSocket && textSocket.readyState === WebSocket.OPEN) {
        textSocket.send(command);
        return true;
    }
    logError(`${pluginName}: No WebSocket for fallback send: ${command}`);
    return false;
};

try {
    pluginsApi = require(rootDir + '/server/plugins_api');

    if (pluginsApi?.emitPluginEvent) {
        emitPluginEvent = pluginsApi.emitPluginEvent;
    }

    wss = pluginsApi.getWss?.();
    pluginsWss = pluginsApi.getPluginsWss?.();
    serverConfig = pluginsApi.getServerConfig?.();

    if (pluginsApi.sendPrivilegedCommand) {
        sendPrivilegedCommand = pluginsApi.sendPrivilegedCommand;
    }

    useHooks = !!(wss && pluginsWss);
    usePrivileged = !!sendPrivilegedCommand && useHooks;

    if (FORCE_FALLBACK) {
        useHooks = false;
        usePrivileged = false;
    }

    if (useHooks && usePrivileged) {
        logInfo(`[${pluginName}] Using plugins_api with WebSocket hooks enabled`);

        // Listen for spectrum scan requests from other plugins
        // and trigger a local scan when received
        pluginsApi.onPluginEvent('spectrum-graph', (msg) => {
            if (msg?.value?.status === 'scan') {
                isInternalScan = true;
                ipAddress = '127.0.0.1';

                clearTimeout(ipTimeout);
                ipTimeout = setTimeout(() => {
                    ipAddress = externalWsUrl;
                }, 5000);

                restartScan('scan');
            }
        });

    } else {
        logWarn(`[${pluginName}] Loaded plugins_api but hooks unavailable, using fallback mode`);
        useHooks = false;
        usePrivileged = false;

        // Fallback WebSocket send
        sendPrivilegedCommand = async (command) => {
            if (textSocket && textSocket.readyState === WebSocket.OPEN) {
                textSocket.send(command);
                return true;
            }
            logError(`[${pluginName}] No WebSocket for fallback send: ${command}`);
            return false;
        };
    }
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        logWarn(`[${pluginName}] Missing plugins_api, using fallback mode, update FM-DX Webserver`);
    } else {
        throw err;
    }

    useHooks = false;
    usePrivileged = false;
}

// const variables
const debug = false;
const validScans = ['scan', 'scan-0', 'scan-1', 'scan-2'];
const webserverPort = config.webserver.webserverPort || 8080;
const externalWsUrl = `ws://127.0.0.1:${webserverPort}`;  // Used for fallback IP, but not for connections

// let variables
let extraSocket, textSocket, textSocketLost, messageParsed, messageParsedTimeout, tuningLowerLimitScan, tuningUpperLimitScan, tuningLowerLimitOffset, tuningUpperLimitOffset, debounceTimer, ipTimeout, intervalSerial, intervalSerialReconnect, serialConnectionLoss;
let restartCounter = 0;
let disableScanBelowFmLowerLimit = false;
let ipAddress = externalWsUrl;
let currentFrequency = 0;
let initialDelay = 0;
let lastRestartTime = 0;
let nowTime = Date.now();
let isFirstRun = true;
let isScanRunning = false;
let hasLoggedUndefined = false;
let scanStatus = { scanStatus: "normal" };
let formattedCustomRanges = [];
let lastScanCommand = null;
let connectionStatusKnown = false;
let isDeviceCompatible = false;
let sigArray = [];

// Check if module or radio firmware
let isModule = true; // TEF668X module
let isFirstFirmwareNotice = false;
let firmwareType = 'unknown';
let BWradio = 0;

// Check device name in config
let deviceName;
let deviceConfig = config?.device || 'tef';

if (deviceConfig === 'tef') {
    deviceName = 'TEF668X';
    isDeviceCompatible = true;
} else if (deviceConfig === 'xdr') {
    deviceName = 'XDR';
    isDeviceCompatible = true;
} else if (deviceConfig === 'sdr') {
    deviceName = 'SDR';
} else if (deviceConfig === 'si47xx') {
    deviceName = 'Si47XX';
} else if (deviceConfig === 'other') {
    deviceName = 'RX device';
} else {
    deviceName = 'TEF668X';
    isDeviceCompatible = true;
}

// Normalise IP address
function normalizeIp(ip) {
    return ip
        ?.replace(/^::ffff:/, '')
        .trim();
}

// Function to create custom router
let spectrumData = {
    sd: null
};

const checkStrictAdmin = (req, res, next) => {
    if (req.session && req.session.isAdminAuthenticated) return next();
    return res.status(401).send('Unauthorised.');
};

function customRouter() {
    endpointsRouter.get('/spectrum-graph-plugin/api/config', (req, res) => {
        const isAdmin = (req.session && req.session.isAdminAuthenticated) || false;
        const response = { isAdmin, config: { fmLowerLimit } };
        if (isAdmin) {
            response.config = {
                fmLowerLimit,
                rescanDelay,
                tuningRange,
                tuningStepSize,
                tuningBandwidth,
                customRanges,
                warnIncompleteData,
                logLocalCommands,
                clearGraphOnScan,
                definedBands,
            };
        }
        res.json(response);
    });

    endpointsRouter.post('/spectrum-graph-plugin/api/config', checkStrictAdmin, express.json(), (req, res) => {
        try {
            const body = req.body;
            const updated = {
                rescanDelay:        !isNaN(Number(body.rescanDelay))        ? Number(body.rescanDelay)        : rescanDelay,
                tuningRange:        !isNaN(Number(body.tuningRange))        ? Number(body.tuningRange)        : tuningRange,
                tuningStepSize:     !isNaN(Number(body.tuningStepSize))     ? Number(body.tuningStepSize)     : tuningStepSize,
                tuningBandwidth:    !isNaN(Number(body.tuningBandwidth))    ? Number(body.tuningBandwidth)    : tuningBandwidth,
                fmLowerLimit:       !isNaN(Number(body.fmLowerLimit))       ? Number(body.fmLowerLimit)       : fmLowerLimit,
                customRanges:       typeof body.customRanges === 'string'   ? body.customRanges               : customRanges,
                warnIncompleteData: typeof body.warnIncompleteData === 'boolean' ? body.warnIncompleteData    : warnIncompleteData,
                logLocalCommands:   typeof body.logLocalCommands === 'boolean'   ? body.logLocalCommands      : logLocalCommands,
                clearGraphOnScan:   typeof body.clearGraphOnScan === 'boolean'   ? body.clearGraphOnScan      : clearGraphOnScan,
                definedBands:       Array.isArray(body.definedBands) && body.definedBands.length > 0 &&
                                    body.definedBands.every(b => b && typeof b.name === 'string' &&
                                        Number.isFinite(b.start) && Number.isFinite(b.end) &&
                                        Number.isFinite(b.step) && Number.isFinite(b.bw))
                                        ? body.definedBands : definedBands,
            };
            suppressNextFileWatchReload = true;
            saveUpdatedConfig(updated);
            loadConfigFile('re');
            res.json({ success: true });
        } catch (err) {
            logError(`[${pluginName}] Error saving config via API: ${err.message}`);
            res.status(500).json({ success: false });
        }
    });

    endpointsRouter.get('/spectrum-graph-plugin/settings', checkStrictAdmin, (req, res) => {
        const cfg = {
            rescanDelay, tuningRange, tuningStepSize, tuningBandwidth,
            fmLowerLimit, customRanges, warnIncompleteData, logLocalCommands, clearGraphOnScan, definedBands,
        };

        const bwOptions = [
            { val: 56, label: '56 kHz (FM narrow)' },
            { val: 64, label: '64 kHz' },
            { val: 72, label: '72 kHz' },
            { val: 84, label: '84 kHz' },
            { val: 97, label: '97 kHz' },
            { val: 114, label: '114 kHz' },
            { val: 133, label: '133 kHz' },
            { val: 151, label: '151 kHz' },
            { val: 168, label: '168 kHz' },
            { val: 184, label: '184 kHz' },
            { val: 200, label: '200 kHz' },
            { val: 217, label: '217 kHz' },
            { val: 236, label: '236 kHz' },
            { val: 254, label: '254 kHz' },
            { val: 287, label: '287 kHz' },
            { val: 311, label: '311 kHz (FM wide)' },
            { val: 3,  label: 'AM 3 kHz (narrow)' },
            { val: 4,  label: 'AM 4 kHz' },
            { val: 6,  label: 'AM 6 kHz' },
            { val: 8,  label: 'AM 8 kHz (wide)' },
        ];

        const bwOptionsHtml = bwOptions.map(o => `<option value="${o.val}">${o.label}</option>`).join('');

        const bandsJson = JSON.stringify(cfg.definedBands);

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spectrum Graph - Settings</title>
    <link rel="icon" href="data:,">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg: #0f0f0f;
            --surface: #181818;
            --surface2: #202020;
            --border: #2a2a2a;
            --border-hover: #444;
            --text: #e8e8e8;
            --muted: #666;
            --accent: #2ec4b6;
            --accent-dim: rgba(46,196,182,0.12);
            --accent-hover: #25a99e;
            --danger: #c0392b;
            --danger-dim: rgba(192,57,43,0.12);
            --success: #1e8c6e;
        }
        body { font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }
        header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; display: flex; align-items: center; justify-content: space-between; height: 56px; flex-shrink: 0; }
        .header-title { font-size: 15px; font-weight: 600; letter-spacing: 0.04em; color: var(--accent); display: flex; align-items: center; gap: 10px; }
        .header-title svg { opacity: 0.85; }
        .btn-save { background: var(--accent); color: #0f0f0f; border: none; padding: 8px 22px; border-radius: 4px; font-size: 13px; font-weight: 700; cursor: pointer; letter-spacing: 0.03em; transition: background 0.15s; }
        .btn-save:hover { background: var(--accent-hover); }
        .btn-save:disabled { opacity: 0.5; cursor: default; }
        .btn-reset { background: none; color: var(--muted); border: 1px solid var(--border); padding: 8px 16px; border-radius: 4px; font-size: 13px; cursor: pointer; letter-spacing: 0.03em; transition: color 0.15s, border-color 0.15s; }
        .btn-reset:hover { color: var(--danger); border-color: var(--danger); }
        nav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 32px; display: flex; gap: 0; flex-shrink: 0; }
        .tab-btn { background: none; border: none; border-bottom: 2px solid transparent; color: var(--muted); padding: 12px 18px; font-size: 13px; cursor: pointer; transition: color 0.15s, border-color 0.15s; letter-spacing: 0.02em; }
        .tab-btn:hover { color: var(--text); }
        .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
        main { flex: 1; padding: 28px 32px; overflow-y: auto; }
        .tab-content { display: none; max-width: 780px; }
        .tab-content.active { display: block; }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px; }
        .field-group { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 24px; }
        .field-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-bottom: 1px solid var(--border); gap: 16px; }
        .field-row:last-child { border-bottom: none; }
        .field-row:hover { background: var(--surface2); }
        .field-label { font-size: 13px; font-weight: 500; }
        .field-hint { font-size: 11px; color: var(--muted); margin-top: 2px; line-height: 1.5; }
        .field-control { flex-shrink: 0; }
        input[type=number], input[type=text], select {
            background: var(--bg); border: 1px solid var(--border); color: var(--text);
            padding: 6px 10px; border-radius: 4px; font-size: 13px; outline: none;
            transition: border-color 0.15s; width: 110px;
        }
        input[type=number]:focus, input[type=text]:focus, select:focus { border-color: var(--accent); }
        select { width: auto; min-width: 110px; }
        textarea {
            background: var(--bg); border: 1px solid var(--border); color: var(--text);
            padding: 8px 10px; border-radius: 4px; font-size: 12px; font-family: monospace;
            outline: none; transition: border-color 0.15s; width: 100%; resize: vertical; min-height: 72px;
        }
        textarea:focus { border-color: var(--accent); }
        .toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; }
        .toggle-track { position: absolute; inset: 0; background: #333; border-radius: 22px; cursor: pointer; transition: background 0.2s; }
        .toggle-track::before { content: ""; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: #888; border-radius: 50%; transition: transform 0.2s, background 0.2s; }
        .toggle input:checked + .toggle-track { background: var(--accent-dim); }
        .toggle input:checked + .toggle-track::before { transform: translateX(18px); background: var(--accent); }
        /* Ranges tab */
        .ranges-hint { font-size: 12px; color: var(--muted); line-height: 1.6; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 16px; }
        .ranges-hint code { color: var(--accent); font-family: monospace; font-size: 11px; }
        /* Bands table */
        .bands-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        thead th { background: var(--surface2); color: var(--muted); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--border); }
        tbody tr { border-bottom: 1px solid var(--border); }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:hover td { background: var(--surface2); }
        td { padding: 5px 6px; }
        .band-input { background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 4px 7px; border-radius: 3px; font-size: 12px; width: 100%; outline: none; }
        .band-input:focus { border-color: var(--accent); }
        .band-input.nm { width: 62px; }
        .btn-del { background: none; border: 1px solid transparent; color: var(--muted); border-radius: 3px; padding: 3px 8px; cursor: pointer; font-size: 11px; transition: all 0.15s; }
        .btn-del:hover { border-color: var(--danger); color: var(--danger); background: var(--danger-dim); }
        .btn-add { background: none; border: 1px solid var(--accent); color: var(--accent); border-radius: 4px; padding: 7px 14px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background 0.15s; }
        .btn-add:hover { background: var(--accent-dim); }
        /* Toast */
        #toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--success); color: #fff; padding: 10px 20px; border-radius: 4px; font-size: 13px; font-weight: 600; opacity: 0; pointer-events: none; transition: opacity 0.25s; z-index: 99; }
        #toast.err { background: var(--danger); }
        #toast.show { opacity: 1; }
    </style>
</head>
<body>
<header>
    <div class="header-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Spectrum Graph v${pluginVersion} - Settings
    </div>
    <div style="display:flex;gap:10px;align-items:center">
        <button class="btn-reset" id="resetBtn">Reset to Defaults</button>
        <button class="btn-save" id="saveBtn">Save Settings</button>
    </div>
</header>
<nav>
    <button class="tab-btn active" data-target="tab-general">General</button>
    <button class="tab-btn" data-target="tab-ranges">Custom Ranges</button>
    <button class="tab-btn" data-target="tab-bands">Band Definitions</button>
</nav>
<main>
    <div id="tab-general" class="tab-content active">
        <div class="section-label" style="margin-top:4px">Scanning</div>
        <div class="field-group">
            <div class="field-row">
                <div><div class="field-label">Rescan Delay</div><div class="field-hint">Number of seconds elapsed since the previous scan before a new scan can be initiated. Set to 0 to disable.<br>Caution: Lowering the value increases the risk of your server being overloaded with scan requests.</div></div>
                <div class="field-control"><input type="number" id="rescanDelay" value="${cfg.rescanDelay}" min="0" step="1"></div>
            </div>
            <div class="field-row">
                <div><div class="field-label">Tuning Range</div><div class="field-hint">Scan radius in MHz around current frequency. Set to 0 for full band scan.</div></div>
                <div class="field-control"><input type="number" id="tuningRange" value="${cfg.tuningRange}" min="0" step="0.1"></div>
            </div>
            <div class="field-row">
                <div><div class="field-label">FM Step Size</div><div class="field-hint">Tuning step size, in kHz. Recommended values are either 50 or 100.</div></div>
                <div class="field-control"><input type="number" id="tuningStepSize" value="${cfg.tuningStepSize}" min="1" step="1"></div>
            </div>
            <div class="field-row">
                <div><div class="field-label">FM Bandwidth</div><div class="field-hint">Filter bandwidth for FM scans in kHz.<br>Supported bandwidth values are 56, 64, 72, 84, 97, 114, 133, 151, 168, 184, 200, 217, 236, 254, 287, and 311.</div></div>
                <div class="field-control"><input type="number" id="tuningBandwidth" value="${cfg.tuningBandwidth}" min="0" step="1"></div>
            </div>
            <div class="field-row">
                <div><div class="field-label">FM Lower Limit</div><div class="field-hint">Lower edge of the FM band in MHz to scan. Default value is 86.</div></div>
                <div class="field-control"><input type="number" id="fmLowerLimit" value="${cfg.fmLowerLimit}" min="64" max="108" step="0.1"></div>
            </div>
        </div>
        <div class="section-label">Diagnostics</div>
        <div class="field-group">
            <div class="field-row">
                <div><div class="field-label">Warn Incomplete Data</div><div class="field-hint">Enable to display console warnings about incomplete/interrupted scans.<br>Note: Some firmware outputs data that always appears to be incomplete.</div></div>
                <div class="field-control">
                    <label class="toggle"><input type="checkbox" id="warnIncompleteData" ${cfg.warnIncompleteData ? 'checked' : ''}><span class="toggle-track"></span></label>
                </div>
            </div>
            <div class="field-row">
                <div><div class="field-label">Log Local Commands</div><div class="field-hint">Disable to hide commands shown in console that have been sent locally, such as from another plugin.</div></div>
                <div class="field-control">
                    <label class="toggle"><input type="checkbox" id="logLocalCommands" ${cfg.logLocalCommands ? 'checked' : ''}><span class="toggle-track"></span></label>
                </div>
            </div>
            <div class="field-row">
                <div><div class="field-label">Clear Graph Data on Scan</div><div class="field-hint">Clear the spectrum graph data when a new scan begins.</div></div>
                <div class="field-control">
                    <label class="toggle"><input type="checkbox" id="clearGraphOnScan" ${cfg.clearGraphOnScan ? 'checked' : ''}><span class="toggle-track"></span></label>
                </div>
            </div>
        </div>
    </div>

    <div id="tab-ranges" class="tab-content">
        <div class="ranges-hint" style="margin-top:4px">
            <strong>Format:</strong> <code>count, Name, lowMHz, highMHz[, stepKHz], ...</code><br>
            <strong>Example:</strong> <code>2, FM1, 65, 74, 56, FM2, 80, 88, 56</code><br>
            Configure up to two custom frequency range buttons. The per-range step (kHz) is optional. An FM button is always prepended automatically.
        </div>
        <div class="section-label">Ranges String</div>
        <div class="field-group" style="padding:14px 16px">
            <textarea id="customRanges" rows="4" spellcheck="false">${cfg.customRanges.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea>
        </div>
    </div>

    <div id="tab-bands" class="tab-content">
        <p style="font-size:12px;color:var(--muted);margin:4px 0 16px">Matched by current frequency for AM/SW scans. All values in kHz. Bands &ge;64&nbsp;MHz use FM demodulator logic.</p>
        <div class="bands-wrap">
            <table>
                <thead><tr><th>Name</th><th>Start (kHz)</th><th>End (kHz)</th><th>Step (kHz)</th><th>BW (kHz)</th><th></th></tr></thead>
                <tbody id="bandsBody"></tbody>
            </table>
        </div>
        <button class="btn-add" id="addBandBtn">+ Add Band</button>
    </div>
</main>
<div id="toast"></div>
<script>
    const bwOptionsHtml = \`${bwOptionsHtml}\`;
    let bands = ${bandsJson};
    const DEFAULTS = ${JSON.stringify({ rescanDelay: defaultConfig.rescanDelay, tuningRange: defaultConfig.tuningRange, tuningStepSize: defaultConfig.tuningStepSize, tuningBandwidth: defaultConfig.tuningBandwidth, fmLowerLimit: defaultConfig.fmLowerLimit, customRanges: defaultConfig.customRanges, warnIncompleteData: defaultConfig.warnIncompleteData, logLocalCommands: defaultConfig.logLocalCommands, clearGraphOnScan: defaultConfig.clearGraphOnScan, definedBands: defaultConfig.definedBands })};

    function renderBands() {
        const tbody = document.getElementById('bandsBody');
        tbody.innerHTML = '';
        bands.forEach((band, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td><input class="band-input nm" data-i="\${i}" data-field="name" value="\${escHtml(band.name)}"></td>
                <td><input class="band-input" type="number" data-i="\${i}" data-field="start" value="\${band.start}"></td>
                <td><input class="band-input" type="number" data-i="\${i}" data-field="end" value="\${band.end}"></td>
                <td><input class="band-input" type="number" data-i="\${i}" data-field="step" value="\${band.step}"></td>
                <td><select class="band-input" data-i="\${i}" data-field="bw">\${bwOptionsHtml}</select></td>
                <td><button class="btn-del" data-i="\${i}">Remove</button></td>
            \`;
            tbody.appendChild(tr);
            tr.querySelector('select[data-field="bw"]').value = band.bw;
        });
        tbody.querySelectorAll('input.band-input').forEach(el => {
            el.addEventListener('input', () => {
                const i = +el.dataset.i, f = el.dataset.field;
                bands[i][f] = f === 'name' ? el.value : Number(el.value);
            });
        });
        tbody.querySelectorAll('select.band-input').forEach(el => {
            el.addEventListener('change', () => { bands[+el.dataset.i].bw = Number(el.value); });
        });
        tbody.querySelectorAll('.btn-del').forEach(el => {
            el.addEventListener('click', () => { bands.splice(+el.dataset.i, 1); renderBands(); });
        });
    }

    function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    document.getElementById('addBandBtn').addEventListener('click', () => {
        bands.push({ name: 'New', start: 0, end: 0, step: 1, bw: 3 });
        renderBands();
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    function showToast(msg, isErr) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.className = isErr ? 'err show' : 'show';
        setTimeout(() => { t.className = t.className.replace('show', '').trim(); }, 2800);
    }

    document.getElementById('resetBtn').addEventListener('click', () => {
        if (!confirm('Reset all settings to their default values?')) return;
        document.getElementById('rescanDelay').value      = DEFAULTS.rescanDelay;
        document.getElementById('tuningRange').value      = DEFAULTS.tuningRange;
        document.getElementById('tuningStepSize').value   = DEFAULTS.tuningStepSize;
        document.getElementById('tuningBandwidth').value  = DEFAULTS.tuningBandwidth;
        document.getElementById('fmLowerLimit').value     = DEFAULTS.fmLowerLimit;
        document.getElementById('customRanges').value     = DEFAULTS.customRanges;
        document.getElementById('clearGraphOnScan').checked   = DEFAULTS.clearGraphOnScan;
        document.getElementById('warnIncompleteData').checked = DEFAULTS.warnIncompleteData;
        document.getElementById('logLocalCommands').checked   = DEFAULTS.logLocalCommands;
        bands = DEFAULTS.definedBands.map(b => ({ ...b }));
        renderBands();
        showToast('Defaults restored. Click Save Settings to apply.', false);
    });

    document.getElementById('saveBtn').addEventListener('click', async () => {
        const btn = document.getElementById('saveBtn');
        btn.disabled = true;
        const payload = {
            rescanDelay:        Number(document.getElementById('rescanDelay').value),
            tuningRange:        Number(document.getElementById('tuningRange').value),
            tuningStepSize:     Number(document.getElementById('tuningStepSize').value),
            tuningBandwidth:    Number(document.getElementById('tuningBandwidth').value),
            fmLowerLimit:       Number(document.getElementById('fmLowerLimit').value),
            customRanges:       document.getElementById('customRanges').value,
            warnIncompleteData: document.getElementById('warnIncompleteData').checked,
            logLocalCommands:   document.getElementById('logLocalCommands').checked,
            clearGraphOnScan:   document.getElementById('clearGraphOnScan').checked,
            definedBands:       bands,
        };
        try {
            const res = await fetch('/spectrum-graph-plugin/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            showToast(res.ok ? 'Settings saved.' : 'Save failed (' + res.status + ').', !res.ok);
        } catch (e) { showToast('Network error.', true); }
        btn.disabled = false;
    });

    renderBands();
</script>
</body>
</html>`;
        res.send(html);
    });

    endpointsRouter.get('/spectrum-graph-plugin', (req, res) => {
        const pluginHeader = req.get('X-Plugin-Name') || 'NoPlugin';

        if (pluginHeader === 'SpectrumGraphPlugin') {
            // Fallback method to get IP address, less reliable
            if (!useHooks) {
                ipAddress = normalizeIp(
                    isInternalScan
                        ? '127.0.0.1'
                        : req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.connection.remoteAddress || '127.0.0.1'
                );

                clearTimeout(ipTimeout);
                ipTimeout = setTimeout(() => { ipAddress = externalWsUrl; }, 5000);
            }

            const serverTime = Math.floor(Date.now() / 1000);
            res.json({ ...spectrumData, serverTime });
        } else {
            res.status(403).json({ error: 'Unauthorised' });
        }
    });

    if (isFirstRun && typeof ipAddress !== 'undefined') logInfo(`[${pluginName}] Custom router added to endpoints router`);
}

// Update endpoint
function updateSpectrumData(newData) {
    spectrumData = { ...spectrumData, ...newData };
}

customRouter();

scanStatus = { scanStatus: "waiting" };
updateSpectrumData(scanStatus);

// Default configuration
let rescanDelay = 3; // seconds
let tuningRange = 0; // MHz
let tuningStepSize = 50; // kHz
let tuningBandwidth = 56; // kHz
let fmLowerLimit = 86; // Match dummyFreqStart value (default: 86)
let customRanges = ""; // Custom ranges
let warnIncompleteData = false; // Warn about incomplete data
let logLocalCommands = true; // Log locally sent commands
let clearGraphOnScan = true; // Clear graph data when a new scan begins

const DEFAULT_DEFINED_BANDS = [
    { name: 'LW',   start: 144,   end: 351,   step: 1,  bw: 3  },
    { name: 'MW',   start: 504,   end: 1710,  step: 3,  bw: 3  },
    { name: '160m', start: 1711,  end: 2000,  step: 1,  bw: 3  },
    { name: '120m', start: 2300,  end: 2500,  step: 1,  bw: 3  },
    { name: '90m',  start: 3200,  end: 3400,  step: 1,  bw: 3  },
    { name: '75m',  start: 3900,  end: 4000,  step: 1,  bw: 3  },
    { name: '60m',  start: 4750,  end: 5060,  step: 2,  bw: 3  },
    { name: '49m',  start: 5900,  end: 6200,  step: 2,  bw: 3  },
    { name: '41m',  start: 7200,  end: 7600,  step: 2,  bw: 3  },
    { name: '31m',  start: 9400,  end: 9900,  step: 2,  bw: 3  },
    { name: '25m',  start: 11600, end: 12100, step: 2,  bw: 3  },
    { name: '22m',  start: 13570, end: 13870, step: 2,  bw: 3  },
    { name: '19m',  start: 15100, end: 15830, step: 2,  bw: 3  },
    { name: '16m',  start: 17480, end: 17900, step: 2,  bw: 3  },
    { name: '15m',  start: 18900, end: 19020, step: 1,  bw: 3  },
    { name: '13m',  start: 21450, end: 21850, step: 2,  bw: 3  },
    { name: '11m',  start: 25670, end: 26100, step: 2,  bw: 3  },
    { name: 'OIRT', start: 65900, end: 74000, step: 30, bw: 56 },
];
let definedBands = DEFAULT_DEFINED_BANDS.map(b => ({ ...b }));

const defaultConfig = {
    rescanDelay: 3,
    tuningRange: 0,
    tuningStepSize: 50,
    tuningBandwidth: 56,
    fmLowerLimit: 86,
    customRanges: "",
    warnIncompleteData: false,
    logLocalCommands: true,
    clearGraphOnScan: true,
    definedBands: DEFAULT_DEFINED_BANDS,
};

// Order of keys in configuration file
const configKeyOrder = ['rescanDelay', 'tuningRange', 'tuningStepSize', 'tuningBandwidth', 'fmLowerLimit', 'customRanges', 'warnIncompleteData', 'logLocalCommands', 'clearGraphOnScan', 'definedBands'];

// Function to ensure folder and file exist
function checkConfigFile() {
    // Check if plugins_configs folder exists
    if (!fs.existsSync(configFolderPath)) {
        logInfo(`[${pluginName}] Creating plugins_configs folder...`);
        fs.mkdirSync(configFolderPath, { recursive: true }); // Create folder recursively if needed
    }

    // Check if json file exists
    if (!fs.existsSync(configFilePath)) {
        logInfo(`[${pluginName}] Creating default SpectrumGraph.json file...`);
        saveDefaultConfig(); // Save default configuration
    }
}

checkConfigFile();

// Function to load configuration file
function loadConfigFile(isReloaded) {
    try {
        if (fs.existsSync(configFilePath)) {
            const configContent = fs.readFileSync(configFilePath, 'utf-8');
            let config = JSON.parse(configContent);

            let configModified = false;

            // Check and add missing options with default values
            for (let key in defaultConfig) {
                if (!(key in config)) {
                    logInfo(`[${pluginName}] Missing ${key} in config. Adding default value.`);
                    config[key] = defaultConfig[key]; // Add missing keys with default value
                    configModified = true; // Mark as modified
                }
            }

            // Ensure variables are numbers or booleans
            rescanDelay = !isNaN(Number(config.rescanDelay)) ? Number(config.rescanDelay) : defaultConfig.rescanDelay;
            tuningRange = !isNaN(Number(config.tuningRange)) ? Number(config.tuningRange) : defaultConfig.tuningRange;
            tuningStepSize = !isNaN(Number(config.tuningStepSize)) ? Number(config.tuningStepSize) : defaultConfig.tuningStepSize;
            tuningBandwidth = !isNaN(Number(config.tuningBandwidth)) ? Number(config.tuningBandwidth) : defaultConfig.tuningBandwidth;
            fmLowerLimit = !isNaN(Number(config.fmLowerLimit)) ? Number(config.fmLowerLimit) : defaultConfig.fmLowerLimit;
            customRanges = typeof config.customRanges === 'string' ? config.customRanges : '';
            warnIncompleteData = typeof config.warnIncompleteData === 'boolean' ? config.warnIncompleteData : defaultConfig.warnIncompleteData;
            logLocalCommands = typeof config.logLocalCommands === 'boolean' ? config.logLocalCommands : defaultConfig.logLocalCommands;
            clearGraphOnScan = typeof config.clearGraphOnScan === 'boolean' ? config.clearGraphOnScan : defaultConfig.clearGraphOnScan;

            if (Array.isArray(config.definedBands) && config.definedBands.length > 0 &&
                config.definedBands.every(b => b && typeof b.name === 'string' &&
                    Number.isFinite(b.start) && Number.isFinite(b.end) &&
                    Number.isFinite(b.step) && Number.isFinite(b.bw))) {
                definedBands = config.definedBands;
            } else {
                definedBands = DEFAULT_DEFINED_BANDS.map(b => ({ ...b }));
            }

            structureCustomRanges();

            // Save the updated config if there were any modifications
            if (configModified) {
                saveUpdatedConfig(config);
            }

            logInfo(`[${pluginName}] Configuration ${isReloaded || ''}loaded successfully.`);
        } else {
            logInfo(`[${pluginName}] Configuration file not found. Creating default configuration.`);
            saveDefaultConfig();
        }
    } catch (error) {
        logInfo(`[${pluginName}] Error loading configuration file: ${error.message}. Resetting to default.`);
        saveDefaultConfig();
    }
}

function stringifyWithCompactBands(config, indent = 4) {
    const orderedConfig = {};
    configKeyOrder.forEach(key => {
        if (key in config) {
            orderedConfig[key] = config[key];
        }
    });

    let json = JSON.stringify(orderedConfig, null, indent);

    json = json.replace(/"definedBands":\s*\[([\s\S]*?)\]/, () => {
        const bands = config.definedBands || [];

        const compactLines = bands.map(band => {
            // Create formatted compact object with spaces
            const objStr = JSON.stringify(band, null, 0)
                .replace(/":/g, '": ')           // space after colon
                .replace(/,"/g, ', "')           // space after comma
                .replace(/(\d)"/g, '$1"');       // no space before closing quote after numbers

            return ' '.repeat(indent * 2) + objStr;
        });

        return `"definedBands": [\n${compactLines.join(',\n')}\n${' '.repeat(indent)}]`;
    });

    return json;
}

// Function to save default configuration file
function saveDefaultConfig() {
    const formattedConfig = stringifyWithCompactBands(defaultConfig, 4);
    if (!fs.existsSync(configFolderPath)) {
        fs.mkdirSync(configFolderPath, { recursive: true });
    }
    fs.writeFileSync(configFilePath, formattedConfig);
    loadConfigFile();
}

// Function to save updated configuration after modification
function saveUpdatedConfig(config) {
    const formattedConfig = stringifyWithCompactBands(config, 4);
    fs.writeFileSync(configFilePath, formattedConfig);
}

let suppressNextFileWatchReload = false;

// Function to watch configuration file for changes
function watchConfigFile() {
    fs.watch(configFilePath, (eventType) => {
        if (eventType === 'change') {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (suppressNextFileWatchReload) {
                    suppressNextFileWatchReload = false;
                    return;
                }
                loadConfigFile('re');
            }, 800);
        }
    });
}

function structureCustomRanges() {
    // Clear any previous ranges
    formattedCustomRanges = [];
    updateSpectrumData({ 
        fmRangeName: '', 
        fmRangeFreq: '', 
        customRangeNames: '[]', 
        customRangeFreqs: '[]' 
    });

    // Add FM range
    const fmRangeLowerLimit = Number(fmLowerLimit) || 86;
    const fmRangeUpperLimit = Number(config?.webserver?.tuningUpperLimit) || 108;
    let fmRange = null;

    if (!isNaN(fmRangeLowerLimit) && !isNaN(fmRangeUpperLimit)) {
        fmRange = {
            name: 'FM',
            rangeString: `${fmRangeLowerLimit}-${fmRangeUpperLimit} MHz`
        };
    }

    // Parse custom ranges
    if (customRanges && typeof customRanges === 'string') {
        const parts = customRanges.split(',').map(p => p.trim());
        const numRanges = Number(parts[0]) || 0;

        let pos = 1;
        for (let i = 0; i < numRanges; i++) {
            const name = parts[pos];
            const low = Number(parts[pos + 1]);
            const high = Number(parts[pos + 2]);

            const maybeStep = parts[pos + 3];
            const hasStep = maybeStep !== undefined && !isNaN(Number(maybeStep)) && Number(maybeStep) > 0;
            const step = hasStep ? Number(maybeStep) : null;

            if (name && !isNaN(low) && !isNaN(high)) {
                formattedCustomRanges.push({
                    name,
                    low,
                    high,
                    step,
                    rangeString: `${low}-${high} MHz`
                });
            }

            pos += hasStep ? 4 : 3;
        }
    }

    // Separate arrays for client use
    const customRangeNames = formattedCustomRanges.map(r => r.name);
    const customRangeFreqs = formattedCustomRanges.map(r => r.rangeString);

    updateSpectrumData({
        fmRangeName: fmRange?.name || '',
        fmRangeFreq: fmRange?.rangeString || '',
        fmLowerLimit,
        customRangeNames,
        customRangeFreqs
    });

    if (debug) console.log('FM:', fmRange, 'Custom:', formattedCustomRanges);
}

// Initialise configuration system
function initConfigSystem() {
    loadConfigFile(); // Load configuration values initially
    watchConfigFile(); // Monitor for changes
    logInfo(`[${pluginName}] Rescan Delay: ${rescanDelay} sec, Tuning Range: ${tuningRange ? tuningRange + ' MHz' : 'Full MHz'}, Tuning Steps: ${tuningStepSize} kHz, Bandwidth: ${tuningBandwidth} kHz`);
}

initConfigSystem();

// Serialport status variables
let alreadyWarnedMissingSerialportVars = false;
let getSerialportStatus = null;

(function initSerialportStatusSource() {
  if (
    datahandlerReceived?.state &&
    typeof datahandlerReceived.state.isSerialportAlive !== 'undefined' &&
    typeof datahandlerReceived.state.isSerialportRetrying !== 'undefined'
  ) {
    getSerialportStatus = () => ({
      isAlive: datahandlerReceived.state.isSerialportAlive,
      isRetrying: datahandlerReceived.state.isSerialportRetrying
    });
  } else if (
    typeof isSerialportAlive !== 'undefined' &&
    typeof isSerialportRetrying !== 'undefined'
  ) {
    getSerialportStatus = () => ({
      isAlive: isSerialportAlive,
      isRetrying: isSerialportRetrying
    });
    logWarn(`[${pluginName}] Older Serialport status variables found, update FM-DX Webserver`);
  } else {
    if (!alreadyWarnedMissingSerialportVars) {
      alreadyWarnedMissingSerialportVars = true;
      logWarn(`[${pluginName}] Serialport status variables not found.`);
    }
  }
})();

function checkSerialportStatus() {
  if (!getSerialportStatus) return;

  const { isAlive, isRetrying } = getSerialportStatus();

  if (!isAlive || isRetrying) {
    if (!useHooks) {
      if (textSocketLost) {
        clearTimeout(textSocketLost);
      }

      textSocketLost = setTimeout(() => {
        logWarn(`[${pluginName}] Connection lost, creating new WebSocket.`);
        if (textSocket) {
          try {
            textSocket.close(1000, 'Normal closure');
          } catch (error) {
            logWarn(`${pluginName} error closing WebSocket:`, error);
          }
        }
        textSocketLost = null;
      }, 10000);
    } else {
      if (!serialConnectionLoss) {
          serialConnectionLoss = true;
          logWarn(`[${pluginName}] Connection loss detected.`);
      }

      clearInterval(intervalSerialReconnect);
      intervalSerialReconnect = setTimeout(() => {
        logWarn(`[${pluginName}] Connection lost, restarting.`);
        serialConnectionLoss = false;
          try {
            if (restartCounter > 65000) restartCounter = 0;
            restartCounter++;
            startPluginStartup();
          } catch (error) {
            logWarn(`[${pluginName}] Error reconnecting:`, error);
          }
      }, 10000);
    }
  }
}

// Track connected clients for broadcasting (/data_plugins)
const pluginClients = new Set();

// Broadcast function for plugin clients (sigArray)
function broadcastToPluginClients(data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    pluginClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Handler for main WebSocket connections (no message processing needed)
function handleMainConnection(ws, req) {
    if (req.url !== '/text') return;

    ws.on('error', (error) => logError(`${pluginName} WebSocket error:`, error));

    ws.on('close', () => {
        //logInfo(`${pluginName} WebSocket client connection closed (/text)`);
    });
}

let lastLockLogTime = 0;
const LOCK_LOG_INTERVAL = 30000;

// Handler for plugins WebSocket connections
function handlePluginConnection(ws, req) {
    if (req?.url !== '/data_plugins') {
        return;
    }

    pluginClients.add(ws);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());

            // Ignore messages that aren't for spectrum-graph or don't have a status
            if (message.type !== 'spectrum-graph' || !(message.value && 'status' in message.value) || scanStatus.scanStatus === 'scanning') return;

            // Track IP for scan commands
            if (validScans.includes(message.value?.status)) {
                const scanIp = ws._socket?.remoteAddress || '127.0.0.1';
                ipAddress = normalizeIp(scanIp);

                clearTimeout(ipTimeout);
                ipTimeout = setTimeout(() => { ipAddress = externalWsUrl; }, 5000);
            }

            const session = req?.session || {};
            const isAdmin = session.isAdminAuthenticated || session.isTuneAuthenticated;
            const isLocked = !serverConfig.publicTuner || serverConfig.lockToAdmin;

            if (isLocked && !isAdmin) {
                const now = Date.now();
                if (now - lastLockLogTime > LOCK_LOG_INTERVAL) {
                    logInfo(`[${pluginName}] Scan request ignored for non-admin during lock`);
                    lastLockLogTime = now;
                }
                return;
            }

            // Handle valid or unknown messages with debounce
            if (!messageParsedTimeout) {
                const status = message.value?.status;

                if (validScans.includes(status)) {
                    if (!isFirstRun && !isScanRunning) restartScan(status);
                } else {
                    const msgStr = JSON.stringify(message);
                    logError(`${pluginName} unknown command received: ${msgStr.length > 128 ? msgStr.slice(0, 128) + '…' : msgStr}`);
                }

                messageParsedTimeout = true;

                if (messageParsed) clearInterval(messageParsed);
                messageParsed = setTimeout(() => {
                    if (messageParsed) clearInterval(messageParsed);
                    messageParsedTimeout = false;
                }, 150); // Reduce spamming
            }

        } catch (error) {
            logError(`${pluginName}: Failed to handle message:`, error);
        }
    });

    ws.on('error', (error) => {
        logError(`${pluginName} WebSocket error:`, error);
    });

    ws.on('close', () => {
        pluginClients.delete(ws);
        //logInfo(`${pluginName} WebSocket client connection closed (/data_plugins)`);
    });
}

// Function for 'text' WebSocket
async function TextWebSocket(messageData) {
    if (!textSocket || textSocket.readyState === WebSocket.CLOSED) {
        try {
            textSocket = new WebSocket(`${externalWsUrl}/text`);

            textSocket.onopen = () => {
                // Spectrum Graph connected to WebSocket

                // Launch startup antenna sequence 

                startPluginStartup();

                textSocket.onmessage = (event) => {
                    try {
                        // Parse incoming message data
                        const messageData = JSON.parse(event.data);
                        // console.log(messageData);

                        if (messageData.freq !== undefined && !isNaN(messageData.freq)) {
                            currentFrequency = Number(messageData.freq); // Used when fallback is used, unless 'datahandlerReceived.handleData' receives it first
                        }

                        checkSerialportStatus();

                    } catch (error) {
                        logError(`${pluginName} failed to parse WebSocket message:`, error);
                    }
                };
            };

            textSocket.onerror = (error) => logError(`${pluginName} WebSocket error:`, error);

            textSocket.onclose = () => {
                logInfo(`[${pluginName}] WebSocket closed (/text)`);
                textSocket = null;
                setTimeout(() => TextWebSocket(messageData), 2000); // Pass messageData when reconnecting
            };

        } catch (error) {
            logError(`${pluginName} failed to set up WebSocket:`, error);
            textSocket = null;
            setTimeout(() => TextWebSocket(messageData), 2000); // Pass messageData when reconnecting
        }
    }
}

// Function for 'data_plugins' WebSocket
async function ExtraWebSocket() {
    if (!extraSocket || extraSocket.readyState === WebSocket.CLOSED) {
        try {
            extraSocket = new WebSocket(`${externalWsUrl}/data_plugins`);

            extraSocket.onopen = () => {
                // Spectrum Graph connected to '/data_plugins'
            };

            extraSocket.onerror = (error) => {
                logError(`${pluginName} WebSocket error:`, error);
            };

            extraSocket.onclose = () => {
                logInfo(`[${pluginName}] WebSocket closed (/data_plugins)`);
                setTimeout(ExtraWebSocket, 2000); // Reconnect after delay
            };

            extraSocket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    //logInfo(JSON.stringify(message));

                    // Ignore messages that aren't for spectrum-graph or don't have a status
                    if (message.type !== 'spectrum-graph' || !(message.value && 'status' in message.value)) return;

                    if (!messageParsedTimeout) {
                        const status = message.value?.status;

                        if (validScans.includes(status)) {
                            if (!isFirstRun && !isScanRunning) restartScan(status);
                        } else {
                            const msgStr = JSON.stringify(message);
                            logError(`${pluginName} unknown command received: ${msgStr.length > 128 ? msgStr.slice(0, 128) + '…' : msgStr}`);
                        }

                        messageParsedTimeout = true;

                        if (messageParsed) clearInterval(messageParsed);
                        messageParsed = setTimeout(() => {
                            if (messageParsed) clearInterval(messageParsed);
                            messageParsedTimeout = false;
                        }, 150); // Reduce spamming
                    }

                } catch (error) {
                    logError(`${pluginName}: Failed to handle message:`, error);
                }
            };
        } catch (error) {
            logError(`${pluginName}: Failed to set up WebSocket:`, error);
            setTimeout(ExtraWebSocket, 2000); // Reconnect on failure
        }
    }
}

if (useHooks && wss && pluginsWss) {
    wss.on('connection', handleMainConnection);
    pluginsWss.on('connection', handlePluginConnection);
    logInfo(`[${pluginName}] WebSocket servers hooked`);

    startPluginStartup();

    if (AUTO_RESTART_ON_CONNECTION_ERROR) {
        clearInterval(intervalSerial);
        intervalSerial = setInterval(() => {
                checkSerialportStatus();
        }, 2000);
    }
} else {
    // Legacy fallback clients
    TextWebSocket();
    ExtraWebSocket();
}

// Intercepted data storage
let interceptedUData = null;
let interceptedZData = null;

// Wrapper to intercept 'U' data
const originalHandleData = datahandlerReceived.handleData;

// datahandler code
datahandlerReceived.handleData = function(wss, receivedData, rdsWss) {
    const receivedLines = receivedData.split('\n');

    for (const receivedLine of receivedLines) {
        if (receivedLine.startsWith('T')) {
            // If found via command sent
            const freqStr = receivedLine.substring(1);
            currentFrequency = parseInt(freqStr, 10) / 1000;
            if (debug) logInfo(`[${pluginName}] Frequency updated: ${currentFrequency}`); // Debug
        } else if (datahandlerReceived.dataToSend?.freq) {
            // If found via dataToSend (datahandler.js)
            const freqStr = datahandlerReceived.dataToSend.freq.replace(/^0+/, '');
            currentFrequency = Number(freqStr);
            //logInfo(`[${pluginName}] Frequency updated from dataToSend: ${currentFrequency}`); // Debug
        }

        if (receivedLine.startsWith('U')) {
            interceptedUData = receivedLine.substring(1); // Store 'U' data

            // Remove trailing comma and space in TEF668X radio firmware
            if (interceptedUData && interceptedUData.endsWith(', ')) {
                interceptedUData = interceptedUData.slice(0, -2);
                isModule = false; // Firmware now detected as TEF668X radio
                firmwareType = "TEF668X radio";
            } else {
                isModule = true;
                firmwareType = "TEF668X module";
            }

            interceptedUData = interceptedUData.replaceAll(" ", ""); // Remove any spaces regardless of firmware

            // Remove any further erroneous data if found
            if (interceptedUData && /Z.$/.test(interceptedUData)) { // Remove any 'Z' antenna commands
                interceptedUData = interceptedUData.slice(0, -2);
            }
            let scanIsComplete = true;
            if (interceptedUData && interceptedUData.endsWith(',')) { // Some firmware might still have a trailing comma
                interceptedUData = interceptedUData.slice(0, -1);
                scanIsComplete = false;
                if (warnIncompleteData) {
                    logWarn(`[${pluginName}] Spectrum scan appears incomplete.`);
                    scanStatus = { scanStatus: "incomplete" };
                    updateSpectrumData(scanStatus);
                }
            }
            if (interceptedUData) { // Remove any non-digit characters at the end
                interceptedUData = interceptedUData.replace(/\D+$/, '');
            }

            // Update endpoint
            const lastUpdate = Math.floor(Date.now() / 1000);
            const newData = { sd: interceptedUData, lastUpdate: lastUpdate, isScanComplete: scanIsComplete };
            updateSpectrumData(newData);

            if (antennaSwitch) {
                // Update endpoint
                const newData = { [`sd${antennaCurrent}`]: interceptedUData, [`lastUpdate${antennaCurrent}`]: lastUpdate };
                updateSpectrumData(newData);
            }
            break;
        }
        if (receivedLine.startsWith('Z')) {
            interceptedZData = receivedLine.substring(1); // Store 'Z' data
            // Update endpoint
            const newData = { ad: interceptedZData };
            updateSpectrumData(newData);

            if (antennaSwitch) antennaCurrent = Number(interceptedZData);

            let uValueNew = null;

            if (antennaSwitch && spectrumData[`sd${antennaCurrent}`]) {
                uValueNew = spectrumData[`sd${antennaCurrent}`];
            }

            if (uValueNew !== null) {
                let uValue = uValueNew;

                // Possibly interrupted, but should never execute, as trailing commas should have already been removed
                if (uValue && uValue.endsWith(',')) {
                    isScanHalted(true);
                    uValue = null;
                    setTimeout(() => {
                        // Update endpoint
                        const newData = { [`sd${antennaCurrent}`]: uValue }; // uValue or null
                        updateSpectrumData(newData);
                        logWarn(`[${pluginName}] Spectrum scan appears incomplete.`);
                        scanStatus = { scanStatus: "incomplete" };
                        updateSpectrumData(scanStatus);
                    }, 200);
                }

                if (uValue !== null) { // Ensure uValue is not null before splitting
                    // Split the response into pairs and process each one
                    sigArray = uValue.split(',').map(pair => {
                        const [freq, sig] = pair.split('=');
                        return { freq: (freq / 1000).toFixed(3), sig: parseFloat(sig).toFixed(1) };
                    });

                    const messageClient = JSON.stringify({
                        type: 'sigArray',
                        value: sigArray,
                        isScanning: isScanRunning
                    });

                    sendSigArray(sigArray, { pluginBroadcast: false }); // Send data

                } else {
                    logWarn(`${pluginName}: Invalid 'uValue' for Ant. ${antennaCurrent}, clearing incomplete data.`);
                }
                isScanHalted(true);
            }
            break;
        }
    }

    // Call original handleData function
    originalHandleData(wss, receivedData, rdsWss);
};

// Configure antennas
let antennaCurrent; // Will remain 'undefined' if antenna switch is disabled
let antennaSwitch = false;
let antennaResponse = { enabled: false };
if (config.antennas) antennaResponse = config.antennas;

if (antennaResponse.enabled) { // Continue if 'enabled' is true
    antennaSwitch = true;
    antennaCurrent = Number(config.antennaStartup) || 0; // Default antenna from config
    const antennas = ['ant1', 'ant2', 'ant3', 'ant4'];

    let antennaStatus = {};

    antennas.forEach(ant => {
        antennaStatus[ant] = antennaResponse[ant].enabled; // antennaResponse.antX.enabled set to true or false
    });

    // Assign null to antennas enabled
    [1, 2, 3, 4].forEach((i) => {
        if (antennaResponse[`ant${i}`].enabled) {
            // Update endpoint
            const newData = { [`sd${i - 1}`]: null };
            updateSpectrumData(newData);
        }
    });
}

function waitForAntenna(expectedAntenna, timeout = 5000, interval = 20) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        const timer = setInterval(() => {
            if (String(interceptedZData) === String(expectedAntenna)) {
                clearInterval(timer);
                resolve(true);
                return;
            }

            if (Date.now() - start >= timeout) {
                clearInterval(timer);
                reject(new Error(`Timeout waiting for Ant. ${expectedAntenna}, last seen Z=${interceptedZData ?? 'none'}`));
            }
        }, interval);
    });
}

// Function for first run on startup
function startPluginStartup() {
    logInfo(`[${pluginName}] Waiting for ${deviceName}...`);
    // First run begins once default frequency is detected	
    isFirstRun = true;
    isFirstFirmwareNotice = false;
    isModule = true;

    // If default frequency is enabled in config
    if (config.enableDefaultFreq) {
        const checkFrequencyInterval = 100;
        const timeoutDuration = 30000;

        let isFrequencyMatched = false;

        let intervalId = setInterval(() => {
            if (Number(config.defaultFreq).toFixed(2) === Number(currentFrequency).toFixed(2)) {
                isFrequencyMatched = true;
                connectionStatusKnown = true;
                clearInterval(intervalId);
                initialDelay = 2000;
                firstRun();
            }
        }, checkFrequencyInterval);

        setTimeout(() => {
            if (!isFrequencyMatched) {
                clearInterval(intervalId);
                logError(`[${pluginName}] Default Frequency does not match current frequency, continuing anyway.`);
                initialDelay = 30000;
                connectionStatusKnown = false;
                firstRun();
            }
        }, timeoutDuration);
    } else {
        // If default frequency is disabled in config
        async function waitForFrequency(timeout = 30000) { // First run begins once frequency is detected
            const checkInterval = 100;

            return new Promise((resolve, reject) => {
                const startTime = Date.now();

                const checkFrequency = setInterval(() => {
                    const freq = Number(currentFrequency).toFixed(2);

                    if (freq > 0.00) {
                        clearInterval(checkFrequency);
                        initialDelay = 3000;
                        connectionStatusKnown = true;
                        firstRun();
                        resolve();
                    }

                    if (Date.now() - startTime >= timeout) {
                        clearInterval(checkFrequency);
                        logWarn(`[${pluginName}] No frequency detected after ${timeout/1000}s, using default ${config.defaultFreq || 87.5} MHz.`);
                        currentFrequency = config.defaultFreq || 87.5;
                        initialDelay = 3000;
                        connectionStatusKnown = false;
                        firstRun();
                        resolve();
                    }
                }, checkInterval);
            });
        }

        waitForFrequency()
            .then(() => {
                if (debug) {
                    logInfo(`[${pluginName}] Frequency detected or default used.`);
                }
            })
            .catch(error => logError(error));
    }

    async function firstRun() {
        if (connectionStatusKnown) {
            const connectionMsg = `${deviceName}${!useHooks ? ' and WebSocket' : ''} connected`;
            logInfo(`[${pluginName}] ${connectionMsg}${!restartCounter ? ', preparing first run...' : `... (${restartCounter} ${restartCounter === 1 ? 'restart' : 'restarts'})`}`);
            if (!isDeviceCompatible) logInfo(`[${pluginName}] Notice: Compatibility with device ${deviceName} might be limited.`);
            connectionStatusKnown = false; // prepare for any reconnections
        } else {
            logInfo(`[${pluginName}] ${deviceName} connection status unknown,${!useHooks ? ' WebSocket connected,' : ''} preparing first run...`);
        }

        await new Promise(resolve => setTimeout(resolve, initialDelay));

        // Remember startup antenna to restore after scanning
        const startupAntenna = antennaCurrent ?? 0;

        // Confirm startup antenna before first scan
        if (antennaSwitch) {
            try {
                interceptedZData = null;
                await sendCommandToClient(`Z${startupAntenna}`);
                if (debug) logInfo(`[${pluginName}] Waiting for Ant. ${startupAntenna} confirmation...`);
                await waitForAntenna(startupAntenna, 5000);
                logInfo(`[${pluginName}] Ant. ${startupAntenna} found, starting first scan.`);
            } catch (error) {
                logWarn(`[${pluginName}] Ant. ${startupAntenna} confirmation failed before first scan: ${error.message}`);
            }
        }

        // First scan
        await startScan('scan');

        // Scan additional antennas sequentially
        if (antennaResponse.enabled) {
            const antennas = [
                { enabled: antennaResponse.ant1.enabled, command: 'Z0', number: 0 },
                { enabled: antennaResponse.ant2.enabled, command: 'Z1', number: 1 },
                { enabled: antennaResponse.ant3.enabled, command: 'Z2', number: 2 },
                { enabled: antennaResponse.ant4.enabled, command: 'Z3', number: 3 }
            ];

            for (const antenna of antennas) {
                // Skip disabled antennas and startup antenna
                if (!antenna.enabled || antenna.number === startupAntenna) continue;

                try {
                    // Delay before switching antenna
                    await new Promise(resolve => setTimeout(resolve, 400));

                    interceptedZData = null;
                    await sendCommandToClient(antenna.command);
                    if (debug) logInfo(`[${pluginName}] Waiting for Ant. ${startupAntenna} confirmation...`);
                    await waitForAntenna(antenna.number, 5000);
                    logInfo(`[${pluginName}] Ant. ${antenna.number} found, starting scan.`);

                    // Delay as a precaution for UI and hardware switching
                    await new Promise(resolve => setTimeout(resolve, 600));

                    await startScan('scan');
                } catch (error) {
                    logWarn(`[${pluginName}] Ant. ${antenna.number} scan failed: ${error.message}`);
                }
            }

            // Return to startup antenna
            await new Promise(resolve => setTimeout(resolve, 600));
            await sendCommandToClient(`Z${startupAntenna}`);
        }

        // First run complete
        if (isFirstRun && !isFirstFirmwareNotice) {
            isFirstFirmwareNotice = true;
            logInfo(`[${pluginName}] Firmware detected as ${firmwareType}.`);
        }

        isFirstRun = false;
        logInfo(`[${pluginName}] Scan button unlocked${!restartCounter ? ', first run complete' : ''}.`);
    }
}

async function sendCommandToClient(command) {
    try {
        // Pass true for plugin-internal bypass
        const privilegedSuccess = await sendPrivilegedCommand(command, true);

        if (privilegedSuccess) {
            return;
        }

        // Fallback only if privileged fails
        logWarn(`${pluginName}: Privileged send failed for: ${command}`);
    } catch (error) {
        logError(`${pluginName}: Failed to send command:`, error);
    }
}

// Begin scan
async function startScan(command) {
    if (debug) console.log(command);

    // Route scan commands and track last explicitly chosen scan
    if (command === 'scan-0') {
        lastScanCommand = 'scan-0';
        command = 'scan-fm';
    } else if (command === 'scan') {
        if (lastScanCommand && lastScanCommand !== 'scan') {
            let matchesLastScan = false;
            if (lastScanCommand === 'scan-0') {
                matchesLastScan = currentFrequency >= fmLowerLimit;
            } else {
                const idx = Number(lastScanCommand.split('-')[1]) - 1;
                const range = formattedCustomRanges[idx];
                if (range) matchesLastScan = currentFrequency >= range.low && currentFrequency <= range.high;
            }
            if (matchesLastScan && lastScanCommand !== 'scan-0') {
                command = lastScanCommand; // redirect to custom range
            }
            // scan-0: fall through to current-band logic so tuningRange is applied
        }
    } else {
        lastScanCommand = command; // scan-1, scan-2
    }

    // Exit if scan is running
    if (isScanRunning) return;

    const SCALE = 1000;
    const HF_LOWER_SCALED = 144;      // 0.144 MHz
    const HF_UPPER_SCALED = 27000;    // 27.0 MHz
    const OIRT_LOWER_SCALED = 64000;  // 64.0 MHz

    // Restrict to config tuning limit, else 0-108 MHz
    let tuningLimit = config.webserver.tuningLimit;
    let tuningLowerLimit = tuningLimit === false ? 0 : config.webserver.tuningLowerLimit;
    let tuningUpperLimit = tuningLimit === false ? 108 : config.webserver.tuningUpperLimit;

    if (isNaN(currentFrequency) || currentFrequency === 0.0) {
        currentFrequency = tuningLowerLimit;
    }

    // Scan started
    isScanHalted(false);

    if (clearGraphOnScan) {
        updateSpectrumData({ sd: null, isScanComplete: true });
    }

    const currentFrequencyScaled = Math.round(currentFrequency * SCALE);
    const fmLowerLimitScaled = fmLowerLimit * SCALE;

    let tuningLowerLimitScan = currentFrequencyScaled;
    let tuningUpperLimitScan = currentFrequencyScaled;

    let activeStepSize = tuningStepSize;
    let activeBandwidth = tuningBandwidth;

    const DEFINED_BANDS = definedBands;

    // DEFINED_BANDS covers LW/MW/SW bands and OIRT
    let foundBand = null;
    for (let b of DEFINED_BANDS) {
        if (currentFrequencyScaled >= b.start && currentFrequencyScaled <= b.end) {
            foundBand = b;
            break;
        }
    }

    if (foundBand) {
        tuningLowerLimitScan = foundBand.start;
        tuningUpperLimitScan = foundBand.end;
        activeStepSize = foundBand.step;
        activeBandwidth = foundBand.bw;
    } else if (currentFrequencyScaled < 64000) {
        tuningLowerLimitScan = Math.max(144, currentFrequencyScaled - 500);
        tuningUpperLimitScan = Math.min(27000, currentFrequencyScaled + 500);
        activeStepSize = 3;
        activeBandwidth = 3;
    } else {
        // 64 MHz+
        const tuningLowerLimitScaled = Math.round(tuningLowerLimit * SCALE);
        const tuningUpperLimitScaled = Math.round(tuningUpperLimit * SCALE);

        tuningLowerLimitScan = tuningLowerLimitScaled;
        tuningUpperLimitScan = tuningUpperLimitScaled;

        if (tuningRange) {
            const tuningRangeScaled = tuningRange * SCALE;
            tuningLowerLimitScan = currentFrequencyScaled - tuningRangeScaled;
            tuningUpperLimitScan = currentFrequencyScaled + tuningRangeScaled;
        }

        if (tuningUpperLimitScan > tuningUpperLimitScaled) tuningUpperLimitScan = tuningUpperLimitScaled;
        if (tuningLowerLimitScan < tuningLowerLimitScaled) tuningLowerLimitScan = tuningLowerLimitScaled;
        if (tuningLowerLimitScan < 64000) tuningLowerLimitScan = 64000;

        // Split at fmLowerLimit, OIRT and FM are separate scans
        if (currentFrequencyScaled < fmLowerLimitScaled && tuningUpperLimitScan > fmLowerLimitScaled) tuningUpperLimitScan = fmLowerLimitScaled;
        if (currentFrequencyScaled >= fmLowerLimitScaled && tuningLowerLimitScan < fmLowerLimitScaled) tuningLowerLimitScan = fmLowerLimitScaled;

        // When tuningRange is clipped by a band boundary, extend the opposite edge
        if (tuningRange) {
            const tuningRangeScaled = tuningRange * SCALE;
            const lowerShortfall = tuningLowerLimitScan - (currentFrequencyScaled - tuningRangeScaled);
            if (lowerShortfall > 0) {
                tuningUpperLimitScan = Math.min(tuningUpperLimitScaled, tuningUpperLimitScan + lowerShortfall);
            }
            const upperShortfall = (currentFrequencyScaled + tuningRangeScaled) - tuningUpperLimitScan;
            if (upperShortfall > 0) {
                const effectiveFloor = Math.max(tuningLowerLimitScaled, currentFrequencyScaled >= fmLowerLimitScaled ? fmLowerLimitScaled : 64000);
                tuningLowerLimitScan = Math.max(effectiveFloor, tuningLowerLimitScan - upperShortfall);
            }
        }

        activeStepSize = tuningStepSize;
        activeBandwidth = tuningBandwidth;
    }


    if (command === 'scan-fm') {
        // FM button always scans the FM band regardless of current frequency
        tuningLowerLimitScan = fmLowerLimitScaled;
        tuningUpperLimitScan = Math.round(tuningUpperLimit * SCALE);
        activeStepSize = tuningStepSize;
        activeBandwidth = tuningBandwidth;
        command = 'scan'; // fall through to the scan send block below
    }

    // The magic happens here
    if (command === 'scan') {
        if (currentFrequency < fmLowerLimit && disableScanBelowFmLowerLimit && currentFrequencyScaled >= 64000) {
            isScanHalted(true);
            logWarn(`${pluginName}: Scanning below ${fmLowerLimit} MHz is disabled.`);
            return;
        } else {
            sendCommandToClient(`Sa${tuningLowerLimitScan}`);
            sendCommandToClient(`Sb${tuningUpperLimitScan}`);
            sendCommandToClient(`Sc${activeStepSize}`);
            
            if (isModule) {
                sendCommandToClient(`Sw${activeBandwidth === 3 ? 3000 : activeBandwidth * 1000}`);
            } else {
                let BWradio = 0;
                if (activeBandwidth === 3) BWradio = 0;
                else {
                    switch (activeBandwidth) {
                        case 56: BWradio = 0; break;
                        case 64: BWradio = 26; break;
                        case 72: BWradio = 1; break;
                        case 84: BWradio = 28; break;
                        case 97: BWradio = 29; break;
                        case 114: BWradio = 3; break;
                        case 133: BWradio = 4; break;
                        case 151: BWradio = 5; break;
                        case 168: BWradio = 7; break;
                        case 184: BWradio = 8; break;
                        case 200: BWradio = 9; break;
                        case 217: BWradio = 10; break;
                        case 236: BWradio = 11; break;
                        case 254: BWradio = 12; break;
                        case 287: BWradio = 13; break;
                        case 311: BWradio = 15; break;
                    }
                }
                sendCommandToClient(`Sf${BWradio}`);
            }
            sendCommandToClient('S');

            structureCustomRanges();

            if (debug) {
                console.log(`Sa${tuningLowerLimitScan}`);
                console.log(`Sb${tuningUpperLimitScan}`);
                console.log(`Sc${activeStepSize}`);
                console.log(isModule ? `Sw${activeBandwidth === 3 ? 3000 : activeBandwidth * 1000}` : `Sf${BWradio}`);
                console.log('S');
            }
        }
    } else if (command === 'scan-1' || command === 'scan-2') {
        const rangeIndex = command === 'scan-1' ? 0 : 1;
        const range = formattedCustomRanges[rangeIndex];

        if (!range) {
            isScanHalted(true);  // halt any ongoing scan
            logWarn(`${pluginName}: Custom range ${command} not defined. Falling back to FM scan.`);
            
            // reset scan state so next scan can run
            isScanRunning = false; 
            lastScanCommand = 'scan'; 

            // optionally restart normal scan automatically
            return startScan('scan');
        }

        // proceed with valid custom range
        let rangeLowerScaled = Math.round(range.low * SCALE);
        let rangeUpperScaled = Math.round(range.high * SCALE);

        if (rangeLowerScaled < 30000) {
            if (rangeLowerScaled < 144) rangeLowerScaled = 144;
            if (rangeUpperScaled > 27000) rangeUpperScaled = 27000;
            if (rangeUpperScaled - rangeLowerScaled > 3000) {
                rangeUpperScaled = rangeLowerScaled + 3000;
                logWarn(`${pluginName}: Custom AM range too large. Clamped to 3 MHz span.`);
            }
            activeStepSize = range.step ?? (rangeLowerScaled <= 1710 ? 1 : 2);
            activeBandwidth = 3;
        } else {
            if (rangeLowerScaled < 64000) rangeLowerScaled = 64000;
            if (rangeUpperScaled > 108000) rangeUpperScaled = 108000;
            activeStepSize = range.step ?? (rangeUpperScaled <= fmLowerLimitScaled ? 30 : tuningStepSize);
            activeBandwidth = rangeUpperScaled <= fmLowerLimitScaled ? 56 : tuningBandwidth;
        }

        sendCommandToClient(`Sa${rangeLowerScaled}`);
        sendCommandToClient(`Sb${rangeUpperScaled}`);
        sendCommandToClient(`Sc${activeStepSize}`);
        
        if (isModule) {
            sendCommandToClient(`Sw${activeBandwidth === 3 ? 3000 : activeBandwidth * 1000}`);
        } else {
            let BWradio = 0;
            if (activeBandwidth === 3) BWradio = 0;
            else {
                switch (activeBandwidth) {
                    case 56: BWradio = 0; break;
                    case 64: BWradio = 26; break;
                    case 72: BWradio = 1; break;
                    case 84: BWradio = 28; break;
                    case 97: BWradio = 29; break;
                    case 114: BWradio = 3; break;
                    case 133: BWradio = 4; break;
                    case 151: BWradio = 5; break;
                    case 168: BWradio = 7; break;
                    case 184: BWradio = 8; break;
                    case 200: BWradio = 9; break;
                    case 217: BWradio = 10; break;
                    case 236: BWradio = 11; break;
                    case 254: BWradio = 12; break;
                    case 287: BWradio = 13; break;
                    case 311: BWradio = 15; break;
                }
            }
            sendCommandToClient(`Sf${BWradio}`);
        }

        sendCommandToClient('S');

        structureCustomRanges();
        isScanRunning = true;
    }

    // Log scan command
    //isInternalScan = false; // used for fallback only

    scanStatus = { scanStatus: "scanning" };
    updateSpectrumData(scanStatus);

    // Notify clients scan was initiated
    const messageClient = {
        type: 'spectrum-graph-scan-success',
        scanSuccess: true
    };

    sendSigArray(null, {}, messageClient);

    if (logLocalCommands || 
        (!logLocalCommands && ipAddress !== '127.0.0.1' && !ipAddress.includes('ws://')) || 
        isFirstRun
    ) {
        logInfo(`[${pluginName}] Spectral commands sent (${ipAddress})`);
    }

    // Reset data before receiving new data
    interceptedUData = null;
    interceptedZData = null;
    sigArray = [];

    // Wait for U value using async
    async function waitForUValue(timeout = 8000 + (isFirstRun ? 22000 : 0), interval = 10) {
        const waitStartTime = process.hrtime(); // Start of waiting period

        while (true) {
            const elapsedTimeInNanoseconds = process.hrtime(waitStartTime);
            const elapsedTimeInMilliseconds = (elapsedTimeInNanoseconds[0] * 1000) + (elapsedTimeInNanoseconds[1] / 1e6); // Convert to milliseconds

            if (elapsedTimeInMilliseconds >= timeout) {
                throw new Error(`${pluginName} timed out`); // Throw error if timed out
            }

            if (interceptedUData !== null && interceptedUData !== undefined) {
                return interceptedUData; // Return when data is fetched
            }

            await new Promise(resolve => setTimeout(resolve, interval)); // Wait for next check
        }
    }

    try {
        const scanStartTime = process.hrtime();
        let uValue = await waitForUValue();

        // Possibly interrupted, but should never execute, as trailing commas should have already been removed
        if (uValue && uValue.endsWith(',')) {
            isScanHalted(true);
            uValue = null;
            setTimeout(() => {
                // Update endpoint
                const newData = { sd: uValue }; // uValue or null
                updateSpectrumData(newData);
                logWarn(`[${pluginName}] Spectrum scan appears incomplete.`);
                scanStatus = { scanStatus: "incomplete" };
                updateSpectrumData(scanStatus);
            }, 200);
        }
        if (debug) console.log(uValue);

        scanStatus = { scanStatus: "normal" };
        updateSpectrumData(scanStatus);

        const completeTimeInNanoseconds = process.hrtime(scanStartTime);
        const completeTime = (completeTimeInNanoseconds[0] + completeTimeInNanoseconds[1] / 1e9).toFixed(1); // Convert to seconds

        if (logLocalCommands ||
            (!logLocalCommands && ipAddress !== '127.0.0.1' && !ipAddress.includes('ws://')) ||
            isFirstRun
        ) {
            // Determine lower/upper frequencies
            let logLower = tuningLowerLimitScan;
            let logUpper = tuningUpperLimitScan;

            // Override with the range values of custom range scan
            if (command.startsWith('scan-') && command !== 'scan-0') {
                const idx = Number(command.split('-')[1]) - 1;
                if (formattedCustomRanges[idx]) {
                    logLower = formattedCustomRanges[idx].low * 1000;
                    logUpper = formattedCustomRanges[idx].high * 1000;
                }
            } else if (command === 'scan-0') {
                // Default FM scan
                logLower = tuningLowerLimitScan;
                logUpper = tuningUpperLimitScan;
            }

            logInfo(`[${pluginName}] Spectrum ${command} (${logLower / 1000}-${logUpper / 1000} MHz, ${activeStepSize} kHz steps, ${activeBandwidth} kHz BW) ${antennaResponse.enabled ? `for Ant. ${antennaCurrent} ` : ''}complete in ${completeTime} seconds.`);
        }

        if (!isFirstRun) lastRestartTime = Date.now();

        // Split response into pairs and process each one
        sigArray = uValue.split(',').map(pair => {
            const [freq, sig] = pair.split('=');
            return { freq: (freq / 1000).toFixed(3), sig: parseFloat(sig).toFixed(1) };
        });

        // if (debug) console.log(sigArray);

        const messageClient = JSON.stringify({
            type: 'sigArray',
            value: sigArray,
            isScanning: isScanRunning
        });

        sendSigArray(sigArray, { pluginBroadcast: true }); // Send data

    } catch (error) {
        scanStatus = { scanStatus: "timeout" };
        updateSpectrumData(scanStatus);
        logError(`${pluginName} scan incomplete, invalid response from device ${deviceName} (invalid 'U' value), error:`, error.message);
    }
    isScanHalted(true);
}

function sendSigArray(sigArray, options = {}, customMessage) {
    // Broadcast server-side if requested
    const messageClient = customMessage
        ? JSON.stringify(customMessage)
        : JSON.stringify({
            type: 'sigArray',
            value: sigArray,
            isScanning: isScanRunning
        });

    // Broadcast server-side if sigArray
    if (!customMessage && options.pluginBroadcast) {
        emitPluginEvent('sigArray', sigArray, { broadcast: false });
    }

    // Broadcast client-side only
    if (useHooks) {
        broadcastToPluginClients(messageClient);
    } else if (extraSocket && extraSocket.readyState === WebSocket.OPEN) {
        extraSocket.send(messageClient);
    } else if (!customMessage) {
        logError(`${pluginName}: No extraSocket for sigArray broadcast`);
    }
}

function isScanHalted(status) {
    if (status) {
        isScanRunning = false;
    } else {
        isScanRunning = true;
    }
}

function restartScan(command) {
    nowTime = Date.now();

    if (!isFirstRun && nowTime - lastRestartTime < (rescanDelay * 1000)) {
        logWarn(`[${pluginName}] Cooldown mode, can retry in ${(((rescanDelay * 1000) - (nowTime - lastRestartTime)) / 1000).toFixed(1)} seconds.`);

        scanStatus = { scanStatus: "rejected" };
        updateSpectrumData(scanStatus);

        setTimeout(() => {
            scanStatus = { scanStatus: "normal" };
            updateSpectrumData(scanStatus);
        }, 1000);

        return;
    }

    lastRestartTime = nowTime;

    // Restart scan
    if (!isScanRunning) setTimeout(() => startScan(command), 80);
}

const getSpectrumData = () => {
    return Object.freeze({ ...spectrumData });
};

module.exports = { getSpectrumData };
