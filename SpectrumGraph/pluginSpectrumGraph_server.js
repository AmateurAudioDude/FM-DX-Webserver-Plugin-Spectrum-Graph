/*
    Spectrum Graph v1.3.0a by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph

    //// Server-side code ////
*/

'use strict';

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
let lastScanCommand = 'scan-0';
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

function customRouter() {
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

const defaultConfig = {
    rescanDelay: 3,
    tuningRange: 0,
    tuningStepSize: 50,
    tuningBandwidth: 56,
    fmLowerLimit: 86,
    customRanges: "",
    warnIncompleteData: false,
    logLocalCommands: true
};

// Order of keys in configuration file
const configKeyOrder = ['rescanDelay', 'tuningRange', 'tuningStepSize', 'tuningBandwidth', 'fmLowerLimit', 'customRanges', 'warnIncompleteData', 'logLocalCommands'];

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

// Function to save default configuration file
function saveDefaultConfig() {
    const formattedConfig = JSON.stringify(defaultConfig, null, 4); // Pretty print with 4 spaces
    if (!fs.existsSync(configFolderPath)) {
        fs.mkdirSync(configFolderPath, { recursive: true });
    }
    fs.writeFileSync(configFilePath, formattedConfig);
    loadConfigFile(); // Reload variables
}

// Function to save updated configuration after modification
function saveUpdatedConfig(config) {
    // Create a new object with keys in specified order
    const orderedConfig = {};
    configKeyOrder.forEach(key => {
        if (key in config) {
            orderedConfig[key] = config[key];
        }
    });

    const formattedConfig = JSON.stringify(orderedConfig, null, 4); // Pretty print with 4 spaces
    fs.writeFileSync(configFilePath, formattedConfig); // Save updated config to file
}

// Function to watch configuration file for changes
function watchConfigFile() {
    fs.watch(configFilePath, (eventType) => {
        if (eventType === 'change') {
            clearTimeout(debounceTimer); // Clear any existing debounce timer
            debounceTimer = setTimeout(() => {
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
    const fmRangeLowerLimit = ((currentFrequency || 87.5) >= fmLowerLimit) 
        ? Number(fmLowerLimit) || 86 
        : Number(config?.webserver?.tuningLowerLimit) || 64;
    const fmRangeUpperLimit = ((currentFrequency || 87.5) > fmLowerLimit) ? Number(config?.webserver?.tuningUpperLimit) || 108 : Number(fmLowerLimit) || 86;
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

        for (let i = 0; i < numRanges; i++) {
            const idx = 1 + i * 3;
            const name = parts[idx];
            const low = Number(parts[idx + 1]);
            const high = Number(parts[idx + 2]);

            if (name && !isNaN(low) && !isNaN(high)) {
                formattedCustomRanges.push({
                    name,
                    low,
                    high,
                    rangeString: `${low}-${high} MHz`
                });
            }
        }
    }

    // Separate arrays for client use
    const customRangeNames = formattedCustomRanges.map(r => r.name);
    const customRangeFreqs = formattedCustomRanges.map(r => r.rangeString);

    updateSpectrumData({
        fmRangeName: fmRange?.name || '',
        fmRangeFreq: fmRange?.rangeString || '',
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
            if (interceptedUData && interceptedUData.endsWith(',')) { // Some firmware might still have a trailing comma
                interceptedUData = interceptedUData.slice(0, -1);
                if (warnIncompleteData) {
                    const completeData = { isScanComplete: false };
                    updateSpectrumData(completeData);
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
            const newData = { sd: interceptedUData, lastUpdate: lastUpdate };
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
                        return { freq: (freq / 1000).toFixed(2), sig: parseFloat(sig).toFixed(1) };
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

    if (command === 'scan') {
        // Rescan the last band
        command = lastScanCommand;
    } else {
        // Update last scanned band
        lastScanCommand = command;
    }

    // Normalise scan-0 to scan
    if (command === 'scan-0') {
        command = 'scan';
    }

    // Exit if scan is running
    if (isScanRunning) return;

    const SCALE = 1000;
    const HF_LOWER = 0.144;
    const HF_UPPER = 27000;
    const OIRT_LOWER = 64000;
    const SCAN_LOWER = OIRT_LOWER / 1000;

    // Update endpoint
    if (currentFrequency >= SCAN_LOWER) {
        const newData = { sd: null, isScanComplete: true };
        updateSpectrumData(newData);
    } else {
        isScanHalted(true);

        scanStatus = { scanStatus: "rejected" };
        updateSpectrumData(scanStatus);

        setTimeout(() => {
            scanStatus = { scanStatus: "normal" };
            updateSpectrumData(scanStatus);
        }, 1000);

        if (currentFrequency > 0) {
            logWarn(`${pluginName}: Hardware is not capable of scanning below ${SCAN_LOWER} MHz.`);
        } else {
            logWarn(`${pluginName}: Scan failed, frequency detected as ${currentFrequency} MHz.`);
        }
        return;
    }

    // Restrict to config tuning limit, else 0-108 MHz
    let tuningLimit = config.webserver.tuningLimit;
    let tuningLowerLimit = tuningLimit === false ? 0 : config.webserver.tuningLowerLimit;
    let tuningUpperLimit = tuningLimit === false ? 108 : config.webserver.tuningUpperLimit;

    if (isNaN(currentFrequency) || currentFrequency === 0.0) {
        currentFrequency = tuningLowerLimit;
    }

    // Scan started
    isScanHalted(false);

    const tuningLowerLimitScaled = tuningLowerLimit * SCALE;
    const tuningUpperLimitScaled = tuningUpperLimit * SCALE;
    const currentFrequencyScaled = currentFrequency * SCALE;
    const fmLowerLimitScaled = fmLowerLimit * SCALE;

    tuningLowerLimitScan = Math.round(tuningLowerLimitScaled);
    tuningUpperLimitScan = Math.round(tuningUpperLimitScaled);

    if (tuningRange) {
        const tuningRangeScaled = tuningRange * SCALE;
        tuningLowerLimitScan = currentFrequencyScaled - tuningRangeScaled;
        tuningUpperLimitScan = currentFrequencyScaled + tuningRangeScaled;
    }

    if (tuningUpperLimitScan > tuningUpperLimitScaled) tuningUpperLimitScan = tuningUpperLimitScaled;
    if (tuningLowerLimitScan < tuningLowerLimitScaled) tuningLowerLimitScan = tuningLowerLimitScaled;

    // Handle frequency limitations
    if (tuningLowerLimitScan < HF_LOWER) tuningLowerLimitScan = HF_LOWER;
    if (tuningLowerLimitScan > HF_UPPER && tuningLowerLimitScan < OIRT_LOWER) tuningLowerLimitScan = OIRT_LOWER;
    if (tuningLowerLimitScan < OIRT_LOWER) tuningLowerLimitScan = OIRT_LOWER; // Doesn't like scanning HF frequencies

    // Keep tuning range consistent for restricted tuning range setting
    if (tuningRange) {
        const tuningRangeScaled = tuningRange * SCALE;
        tuningLowerLimitOffset = tuningRangeScaled - (tuningUpperLimitScan - currentFrequencyScaled);
        tuningUpperLimitOffset = (tuningLowerLimitScan - currentFrequencyScaled) + tuningRangeScaled;

        // Stay within restricted tuning range
        if (tuningLowerLimitScan - tuningLowerLimitOffset < tuningLowerLimitScan) tuningLowerLimitOffset = 0;
        if (tuningUpperLimitScan + tuningUpperLimitOffset < tuningUpperLimitScan) tuningUpperLimitOffset = 0;
    } else {
        tuningLowerLimitOffset = 0;
        tuningUpperLimitOffset = 0;
    }

    // Limit scan to either OIRT band (64-86 MHz) or FM band (86-108 MHz)
    if (currentFrequencyScaled < fmLowerLimitScaled && tuningUpperLimitScan > fmLowerLimitScaled) tuningUpperLimitScan = fmLowerLimitScaled;
    if (currentFrequencyScaled >= fmLowerLimitScaled && tuningLowerLimitScan < fmLowerLimitScaled) tuningLowerLimitScan = fmLowerLimitScaled;

    // The magic happens here
    if (command === 'scan') {
        if (currentFrequency < fmLowerLimit && disableScanBelowFmLowerLimit) {
            isScanHalted(true);
            logWarn(`${pluginName}: Scanning below ${fmLowerLimit} MHz is disabled.`);
            return;
        } else if (currentFrequency >= SCAN_LOWER) {
            sendCommandToClient(`Sa${tuningLowerLimitScan - tuningLowerLimitOffset}`);
            sendCommandToClient(`Sb${tuningUpperLimitScan + tuningUpperLimitOffset}`);
            sendCommandToClient(`Sc${tuningStepSize}`);
            if (isModule) {
                sendCommandToClient(`Sw${tuningBandwidth * 1000}`);
            } else {
                switch (tuningBandwidth) {
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
                    default: BWradio = 0; break;
                }
                sendCommandToClient(`Sf${BWradio}`);
            }
            sendCommandToClient('S');

            structureCustomRanges();

            if (debug) {
                console.log(`Sa${tuningLowerLimitScan - tuningLowerLimitOffset}`);
                console.log(`Sb${tuningUpperLimitScan + tuningUpperLimitOffset}`);
                console.log(`Sc${tuningStepSize}`);
                console.log(isModule ? `Sw${tuningBandwidth * 1000}` : `Sf${BWradio}`);
                console.log('S');
            }
        } else {
            isScanHalted(true);
            logWarn(`${pluginName}: Hardware is not capable of scanning below ${SCAN_LOWER} MHz.`);
            return;
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
        const rangeLowerScaled = Math.round(range.low * SCALE);
        const rangeUpperScaled = Math.round(range.high * SCALE);

        sendCommandToClient(`Sa${rangeLowerScaled}`);
        sendCommandToClient(`Sb${rangeUpperScaled}`);
        sendCommandToClient(`Sc${tuningStepSize}`);
        
        if (isModule) {
            sendCommandToClient(`Sw${tuningBandwidth * 1000}`);
        } else {
            let BWradio;
            switch (tuningBandwidth) {
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
                default: BWradio = 0; break;
            }
            sendCommandToClient(`Sf${BWradio}`);
        }

        sendCommandToClient('S');

        structureCustomRanges();

        if (debug) {
            console.log(`Sa${rangeLowerScaled}`);
            console.log(`Sb${rangeUpperScaled}`);
            console.log(`Sc${tuningStepSize}`);
            console.log(isModule ? `Sw${tuningBandwidth * 1000}` : `Sf${BWradio}`);
            console.log('S');
        }

        // Mark scan as running properly
        isScanRunning = true;
    }

    // Log scan command
    isInternalScan = false; // used for fallback only

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

            logInfo(`[${pluginName}] Spectrum ${command} (${logLower / 1000}-${logUpper / 1000} MHz) ${antennaResponse.enabled ? `for Ant. ${antennaCurrent} ` : ''}complete in ${completeTime} seconds.`);
        }

        if (!isFirstRun) lastRestartTime = Date.now();

        // Split response into pairs and process each one
        sigArray = uValue.split(',').map(pair => {
            const [freq, sig] = pair.split('=');
            return { freq: (freq / 1000).toFixed(2), sig: parseFloat(sig).toFixed(1) };
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
