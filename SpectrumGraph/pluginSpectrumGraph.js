/*
    Spectrum Graph v1.2.4 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph
*/

(() => {

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const CHECK_FOR_UPDATES = true;                 // Checks online if a new version is available
const BORDERLESS_THEME = true;                  // Background and text colours match FM-DX Webserver theme
const ENABLE_MOUSE_CLICK_TO_TUNE = true;        // Allow the mouse to tune inside the graph
const ENABLE_MOUSE_SCROLL_WHEEL = true;         // Allow the mouse scroll wheel to tune inside the graph
const DECIMAL_MARKER_ROUND_OFF = true;          // Round frequency markers to the nearest integer
const ADJUST_SCALE_TO_OUTLINE = true;           // Adjust auto baseline to hold/relative or clamp outline
const ALLOW_ABOVE_CANVAS = false;               // Displays a button to display above signal graph if there is room
const BACKGROUND_BLUR_PIXELS = 5;               // Canvas background blur in pixels

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const pluginVersion = '1.2.4';

// const variables
const pluginName = "Spectrum Graph";
const debug = false;
const CAL90000 = 0.0, CAL95500 = 0.0, CAL100500 = 0.0, CAL105500 = 0.0; // Signal calibration
const dataFrequencyElement = document.getElementById('data-frequency');
const drawGraphDelay = 10;
const canvasWidthOffset = 2;
const canvasHeightOffset = 2;
const windowHeight = document.querySelector('.dashboard-panel-plugin-list') ? 720 : 860;
const topValue = BORDERLESS_THEME ? '12px' : '14px';

// let variables
let canvasFullWidth = 1160; // Initial value
let canvasFullHeight = 140; // Initial value
let canvasHeightSmall = BORDERLESS_THEME ? canvasFullHeight - canvasHeightOffset: canvasFullHeight - canvasHeightOffset; // Initial value
let canvasHeightLarge = BORDERLESS_THEME ? canvasFullHeight - canvasHeightOffset: canvasFullHeight - canvasHeightOffset; // Initial value
let hideContainerRotator = false; // Setting for PST Rotator plugin
let drawAboveCanvasIsPossible = false;
let drawAboveCanvasOverridePosition = false;
let drawAboveCanvasPreviousStatus = false;
let drawAboveCanvasTimeout;
let drawAboveCanvasTimeoutSignalMeter;
let drawAboveCanvasTimeoutStyle;
let dataFrequencyValue;
let graphImageData; // Used to store graph image
let isDecimalMarkerRoundOff = DECIMAL_MARKER_ROUND_OFF;
let isGraphOpen = false;
let isSpectrumOn = false;
let currentAntenna = 0;
let canvasFullWidthOffset = 0;
let prevCanvasHeight = canvasFullHeight;
let xOffset = 30;
let outlinePoints = []; // Outline data for localStorage
let outlinePointsSavePermission = false;
let sigArray = [];
let minSig; // Graph value
let maxSig; // Graph value
let minSigOutline; // Outline value
let maxSigOutline; // Outline value
let dynamicPadding = 1;
let localStorageItem = {};
let signalText = localStorage.getItem('signalUnit') || 'dbf';
let sigOffset, xSigOffset, sigDesc, prevSignalText;
let buttonTimeout;
let removeUpdateTextTimeout;
let updateText;
let wsSendSocket;
let signalMeterDelay = 0;

// let variables (Scanner plugin code by Highpoint)
let ScannerIsScanning = false;
let ScannerMode = '';
let ScannerModeTemp = '';
let ScannerSensitivity = 0;
let ScannerSpectrumLimiterValue = 0; 
let ScannerLimiterOpacity = 0.2;

// localStorage variables
//localStorageItem.enableHold located in getCurrentAntenna()
localStorageItem.enableSmoothing = localStorage.getItem('enableSpectrumGraphSmoothing') === 'true';                 // Smooths the graph edges
localStorageItem.fixedVerticalGraph = localStorage.getItem('enableSpectrumGraphFixedVerticalGraph') === 'true';     // Fixed/dynamic vertical graph based on peak signal
localStorageItem.isAutoBaseline = localStorage.getItem('enableSpectrumGraphAutoBaseline') === 'true';               // Auto baseline
localStorageItem.isAboveSignalCanvas = localStorage.getItem('enableSpectrumGraphAboveSignalCanvas') === 'true';          // Move above signal graph canvas

// Create Spectrum Graph button
function createButton(buttonId) {
    (function waitForFunction() {
        const maxWaitTime = 30000;
        let functionFound = false;

        const observer = new MutationObserver((mutationsList, observer) => {
            if (typeof addIconToPluginPanel === 'function') {
                observer.disconnect();
                addIconToPluginPanel(buttonId, "Spectrum", "solid", "chart-area", "Spectrum Graph");
                functionFound = true;

                const buttonObserver = new MutationObserver(() => {
                    const $pluginButton = $(`#${buttonId}`);
                    if ($pluginButton.length > 0) {
                        setTimeout(() => {
                            $pluginButton.on('click', function() {
                                // Code to execute on click
                                if (drawAboveCanvasOverridePosition) {
                                    signalMeterDelay = 800;
                                    getCurrentDimensions();
                                }
                                toggleSpectrum();
                            });
                        }, 400);
                        buttonObserver.disconnect(); // Stop observing once button is found
                        // Additional code
                        const pluginButton = document.getElementById(`${buttonId}`);
                        if (pluginButton && window.innerWidth < 480 && window.innerHeight > window.innerWidth) {
                            pluginButton.setAttribute('data-tooltip', 'Resolution too low to display');
                        }
                    }
                });

                buttonObserver.observe(document.body, { childList: true, subtree: true });
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            if (!functionFound) {
                console.error(`${pluginName}: Function addIconToPluginPanel not found after ${maxWaitTime / 1000} seconds.`);
            }
        }, maxWaitTime);
    })();

    const aSpectrumCss = `
#${buttonId}:hover {
    color: var(--color-5);
    filter: brightness(120%);
}
`;

    $("<style>")
        .prop("type", "text/css")
        .html(aSpectrumCss)
        .appendTo("head");

    // Additional code
    $(window).on('load', function() {
        setTimeout(displaySignalCanvas, 200);
    });
}

if (document.querySelector('.dashboard-panel-plugin-list')) {
    createButton('spectrum-graph-button');

    const style = document.createElement('style');
    style.textContent = `
#spectrum-graph-button.active {
    background-color: var(--color-2) !important;
    filter: brightness(120%);
}
`;
    document.head.appendChild(style);
} else {
    // FM-DX Webserver v1.3.4 compatibility
    const useLegacyButtonSpacingBetweenCanvas = true;
    const SPECTRUM_BUTTON_NAME = 'SPECTRUM';
    const aSpectrumCss = `
    #spectrum-graph-button {
    border-radius: 0px;
    width: 100px;
    height: 22px;
    position: relative;
    margin-top: 16px;
    margin-left: 5px;
    right: 0px;
    }
    `
    $("<style>")
        .prop("type", "text/css")
        .html(aSpectrumCss)
        .appendTo("head");

    const aSpectrumText = $('<strong>', {
        class: 'aspectrum-text',
        html: SPECTRUM_BUTTON_NAME
    });

    const aSpectrumButton = $('<button>', {
        id: 'spectrum-graph-button',
    });

    aSpectrumButton.append(aSpectrumText);

    function initializeSpectrumButton() {

        let buttonWrapper = $('#button-wrapper');
        if (buttonWrapper.length < 1) {
            buttonWrapper = createDefaultButtonWrapper();
        }

        if (buttonWrapper.length) {
            aSpectrumButton.addClass('hide-phone bg-color-2')
            buttonWrapper.append(aSpectrumButton);
        }
        displaySignalCanvas();
    }

    // Create a default button wrapper if it does not exist
    function createDefaultButtonWrapper() {
        const wrapperElement = $('.tuner-info');
        if (wrapperElement.length) {
            const buttonWrapper = $('<div>', {
                id: 'button-wrapper'
            });
            buttonWrapper.addClass('button-wrapper');
            wrapperElement.append(buttonWrapper);
            if (useLegacyButtonSpacingBetweenCanvas) wrapperElement.append(document.createElement('br'));
            return buttonWrapper;
        } else {
            console.error(`${pluginName}: Standard button location not found. Unable to add button.`);
            return null;
        }
    }

    $(window).on('load', function() {
        setTimeout(initializeSpectrumButton, 200);

        aSpectrumButton.on('click', function() {
            toggleSpectrum();
        });
    });
}

function getCurrentDimensions() {
    const signalCanvasDimensions = document.querySelector('.canvas-container');
    if (signalCanvasDimensions) {
        canvasFullWidth = signalCanvasDimensions.offsetWidth || 1160;
        canvasFullHeight = signalCanvasDimensions.offsetHeight || 140;
        canvasHeightSmall = BORDERLESS_THEME ? canvasFullHeight - canvasHeightOffset: canvasFullHeight - canvasHeightOffset;
        canvasHeightLarge = BORDERLESS_THEME ? canvasFullHeight - canvasHeightOffset: canvasFullHeight - canvasHeightOffset;
    }

    prevCanvasHeight = canvasFullHeight;

    if (ALLOW_ABOVE_CANVAS) isDrawAboveCanvas();
}

// Function to draw above canvas (BETA)
function isDrawAboveCanvas() {
    // Style elements
    let styleCanvas = document.getElementById('style-canvas') || createStyleElement('style-canvas');
    let styleSignalMeter = document.getElementById('style-signal-meter') || createStyleElement('style-signal-meter');

    const panel1 = document.querySelector('.wrapper-outer.dashboard-panel');
    const panel2 = document.querySelector('.wrapper-outer .canvas-container.hide-phone');

    if (!panel1 || !panel2) return;

    const newPosition = calculateNewCanvasPosition(panel1, panel2);
    const newMargin = calculateSignalMeterMargin(panel1, panel2);

    if (newPosition !== drawAboveCanvasOverridePosition) {
        drawAboveCanvasOverridePosition = newPosition;

        // Toggle button twice
        if (isGraphOpen) {
            signalMeterDelay = 800;
            toggleSpectrum();
            clearTimeout(drawAboveCanvasTimeout);
            drawAboveCanvasTimeout = setTimeout(() => {
                setTimeout(() => {
                    toggleSpectrum();
                }, 40);
            }, 400);
        }

        const newCanvasStyle = `
            .canvas-container { overflow: ${newPosition ? 'visible' : 'hidden'}; }
            #sdr-graph, #spectrum-scan-button, #hold-button, #smoothing-on-off-button, #fixed-dynamic-on-off-button, #auto-baseline-on-off-button, #draw-above-canvas {
                margin-top: ${newPosition ? -canvasFullHeight - 2 : 0}px;
            }
        `;
        clearTimeout(drawAboveCanvasTimeoutStyle);
        drawAboveCanvasTimeoutStyle = setTimeout(() => {
            if (styleCanvas.textContent !== newCanvasStyle) {
                styleCanvas.textContent = newCanvasStyle;
            }
        }, 400);
    }

    if (drawAboveCanvasPreviousStatus !== drawAboveCanvasIsPossible && isGraphOpen) ScanButton();

    function createStyleElement(id) {
        let style = document.createElement('style');
        style.id = id;
        document.head.appendChild(style);
        return style;
    }

    function calculateNewCanvasPosition(panel1, panel2) {
        const availableDistance = parseInt(Math.abs(panel1.getBoundingClientRect().top - panel2.getBoundingClientRect().top));
        drawAboveCanvasPreviousStatus = drawAboveCanvasIsPossible;
        drawAboveCanvasIsPossible = (availableDistance - 86 - canvasFullHeight > 0); // Check if space is available for placing graph above signal graph canvas
        return (availableDistance - 86) - canvasFullHeight > 0 && localStorageItem.isAboveSignalCanvas === true;
    }

    function calculateSignalMeterMargin(panel1, panel2) {
        const availableDistance = Math.abs(panel1.getBoundingClientRect().top - panel2.getBoundingClientRect().top);
        return (availableDistance - 86) - canvasFullHeight > 0 && localStorageItem.isAboveSignalCanvas === true
            ? `#signal-meter-small-canvas, #signal-meter-small-marker-canvas { margin-top: ${-canvasFullHeight - 2}px !important; }`
            : `#signal-meter-small-canvas, #signal-meter-small-marker-canvas { margin-top: 4px !important; }`;
    }

    function visibilitySignalMeter(display) {
        // Signal meter plugin visibiliy
        let styleElement = document.createElement('style');
        styleElement.textContent = `
        #signal-meter-small-canvas, #signal-meter-small-marker-canvas {
            display: ${display} !important;
        }
        `;
        document.head.appendChild(styleElement);
    }

    visibilitySignalMeter('none');

    clearTimeout(drawAboveCanvasTimeoutSignalMeter);
    drawAboveCanvasTimeoutSignalMeter = setTimeout(() => {
        visibilitySignalMeter('inline');

        if (localStorageItem.isAboveSignalCanvas === true) {
            styleSignalMeter.textContent = newMargin;
        } else if (styleSignalMeter.textContent !== `#signal-meter-small-canvas, #signal-meter-small-marker-canvas { margin-top: 4px !important; }`) {
            styleSignalMeter.textContent = `#signal-meter-small-canvas, #signal-meter-small-marker-canvas { margin-top: 4px !important; }`;
        }

        if (localStorageItem.isAboveSignalCanvas === false || !isGraphOpen) styleSignalMeter.textContent = `#signal-meter-small-canvas, #signal-meter-small-marker-canvas { margin-top: 4px !important; }`;
        signalMeterDelay = 0;
    }, signalMeterDelay);
}

function monitorCanvasHeight() {
    const targetNode = document.querySelector('.wrapper-outer .canvas-container canvas');
    const config = { attributes: true, attributeFilter: ['style'], childList: false, subtree: false };
    const callback = (mutationsList, observer) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style' && targetNode.height !== prevCanvasHeight) {
                // Check if height has changed (targetNode.offsetHeight)
                setTimeout(() => {
                    resizeCanvas();
                    prevCanvasHeight = targetNode.height;
                }, 100);
            }
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
}

setTimeout(monitorCanvasHeight, 2000);

// Move RDS-Logger plugin if ALLOW_ABOVE_CANVAS enabled
if (ALLOW_ABOVE_CANVAS) {
    document.addEventListener('DOMContentLoaded', function() {
        const loggingCanvas = document.getElementById('logging-canvas');
        const sdrGraph = document.getElementById('sdr-graph');
        const downloadButtonsContainer = document.querySelector('.download-buttons-container');

        if (loggingCanvas && sdrGraph && downloadButtonsContainer) {
            if (loggingCanvas.compareDocumentPosition(sdrGraph) & Node.DOCUMENT_POSITION_FOLLOWING) {
                sdrGraph.parentNode.insertBefore(loggingCanvas, sdrGraph.nextSibling);
            }
            
            if (downloadButtonsContainer.compareDocumentPosition(loggingCanvas) & Node.DOCUMENT_POSITION_FOLLOWING) {
                loggingCanvas.parentNode.insertBefore(downloadButtonsContainer, loggingCanvas.nextSibling);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    getCurrentDimensions();
});

// Create the WebSocket connection
const currentURL = new URL(window.location.href);
const WebserverURL = currentURL.hostname;
const WebserverPath = currentURL.pathname.replace(/setup/g, '');
const WebserverPORT = currentURL.port || (currentURL.protocol === 'https:' ? '443' : '80');
const protocol = currentURL.protocol === 'https:' ? 'wss:' : 'ws:';
const WEBSOCKET_URL = `${protocol}//${WebserverURL}:${WebserverPORT}${WebserverPath}data_plugins`;

// WebSocket to send request and receive response
async function setupSendSocket() {
    if (!wsSendSocket || wsSendSocket.readyState === WebSocket.CLOSED) {
        try {
            wsSendSocket = new WebSocket(WEBSOCKET_URL);
            wsSendSocket.onopen = () => {
                console.log(`${pluginName} connected WebSocket`);

                wsSendSocket.onmessage = function(event) {
                    // Parse incoming JSON data
                    const data = JSON.parse(event.data);
                    const buttonQuery = document.querySelector('#spectrum-scan-button');
                    if (buttonQuery && data.hasOwnProperty('isScanning')) {
                        buttonQuery.style.cursor = 'pointer';
                        clearTimeout(buttonTimeout);
                    }

                    if (data.type === 'spectrum-graph') {
                        const buttonQuery = document.querySelector('#spectrum-scan-button');
                        if (buttonQuery) buttonQuery.style.cursor = 'wait';
                        clearTimeout(buttonTimeout);
                        buttonTimeout = setTimeout(function() {
                            if (buttonQuery) buttonQuery.style.cursor = 'pointer';
                        }, 3000);
                        console.log(`${pluginName} command sent`);
                    }

                    // Handle 'sigArray' data
                    if (data.type === 'sigArray') {
                        console.log(`${pluginName} received sigArray.`);
                        sigArray = data.value;
                        if (sigArray.length > 0) {
                            // Signal calibration
                            if (CAL90000 || CAL95500 || CAL100500 || CAL105500) {
                                sigArray.forEach(item => {
                                    const _f = parseFloat(item.freq);
                                    let adjustment = (_f >= 87 && _f < 93) ? CAL90000 : (_f >= 93 && _f < 98) ? CAL95500 : (_f >= 98 && _f < 103) ? CAL100500 : (_f >= 103 && _f <= 108) ? CAL105500 : 0;
                                    let sig = parseFloat(item.sig);
                                    if (sig > 15) sig += adjustment * ((sig <= 20 ? (sig - 15) / 5 : 1));
                                    item.sig = sig.toFixed(2);
                                });
                                console.log(`${pluginName} calibrated sigArray.`);
                            }

                            if (isGraphOpen) setTimeout(drawGraph, drawGraphDelay);
                        }
                        if (debug) {
                            if (Array.isArray(data.value)) {
                                // Process sigArray
                                data.value.forEach(item => {
                                    console.log(`freq: ${item.freq}, sig: ${item.sig}`);
                                });
                            } else {
                                console.error(`${pluginName} expected array for sigArray, but received:`, data.value);
                            }
                        }
                        getCurrentAntenna();
                    }

                    // Scanner plugin code by Highpoint
                    if (data.type === 'Scanner') {
                        const eventData = JSON.parse(event.data);

                        if (eventData === '') {
                            const initialMessage = createMessage('request');
                            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                                wsSendSocket.send(JSON.stringify(initialMessage));
                            }
                        }

                        if (eventData.value.Scan !== undefined && eventData.value.Scan !== null) {
                            if (eventData.value.Scan === 'on') {
                                ScannerIsScanning = true;
                            } else {
                                ScannerIsScanning = false;
                            }
                            if (isGraphOpen) setTimeout(drawGraph, drawGraphDelay);
                        }

                        if (eventData.value.Sensitivity !== undefined && eventData.value.Sensitivity !== null) {
                            const parsedScannerSensitivity = parseFloat(eventData.value.Sensitivity);
                            if (!isNaN(parsedScannerSensitivity)) {
                                ScannerSensitivity = parsedScannerSensitivity;
                            }
                        }

                        if (eventData.value.SpectrumLimiterValue !== undefined && eventData.value.SpectrumLimiterValue !== null) {
                            const parsedScannerSpectrumLimiterValue = parseFloat(eventData.value.SpectrumLimiterValue);
                            if (!isNaN(parsedScannerSpectrumLimiterValue)) {
                                ScannerSpectrumLimiterValue = parsedScannerSpectrumLimiterValue;
                            }
                        }

                        if (eventData.value.ScannerMode !== undefined && eventData.value.ScannerMode !== null && eventData.value.ScannerMode !== '') {
                            ScannerMode = eventData.value.ScannerMode;
                        }
                    } // **
                };
            };

            wsSendSocket.onclose = (event) => {
                setTimeout(function() {
                    console.log(`${pluginName}: WebSocket closed:`, event);
                }, 400);
                setTimeout(setupSendSocket, 5000); // Reconnect after 5 seconds
            };
        } catch (error) {
            console.error(`${pluginName} failed to setup Send WebSocket:`, error);
            setTimeout(setupSendSocket, 5000); // Retry after 5 seconds
        }
    }
}
// WebSocket and scanner button initialisation
setupSendSocket();

// Function to check for updates
async function fetchFirstLine() {
    if (CHECK_FOR_UPDATES) {
        const urlCheckForUpdate = 'https://raw.githubusercontent.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph/refs/heads/main/version'

        try {
            const response = await fetch(urlCheckForUpdate);
            if (!response.ok) {
                throw new Error(`${pluginName} update check HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const firstLine = text.split('\n')[0]; // Extract first line

            const version = firstLine;

            return version;
        } catch (error) {
            console.error(`${pluginName} error fetching file:`, error);
            return null;
        }
    }
}

// Check for updates
fetchFirstLine().then(version => {
    if (CHECK_FOR_UPDATES && version) {
        if (version !== pluginVersion) {
            updateText = "There is a new version of this plugin available";
            console.log(`${pluginName}: ${updateText}`);
        }
    }
});

// Signal units
prevSignalText = signalText;

function signalUnits() {
    signalText = localStorage.getItem('signalUnit') || 'dbf';
    switch (signalText) {
        case 'dbuv':
            sigOffset = 11.25;
            xOffset = 30;
            xSigOffset = 20;
            sigDesc = 'dBµV';
            break;
        case 'dbm':
            sigOffset = 120;
            xOffset = 36;
            xSigOffset = 32;
            sigDesc = 'dBm';
            break;
        default:
            sigOffset = 0;
            xOffset = 30;
            xSigOffset = 20;
            sigDesc = 'dBf';
    }
    if (signalText !== prevSignalText) {
        setTimeout(drawGraph, drawGraphDelay);
        console.log(`${pluginName}: Signal unit changed.`);
    }
    prevSignalText = signalText;
}

setInterval(signalUnits, 3000);

// Function to apply fade effect and transition styles
function applyFadeEffect(buttonId, opacity, scale) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.opacity = opacity;
        button.style.transition = 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out';
        button.style.transform = `scale(${scale})`;
    }
}

// Create scan button to refresh graph
function ScanButton() {
    // Remove any existing instances of button
    const existingButtons = document.querySelectorAll('.rectangular-spectrum-button');
    existingButtons.forEach(button => button.remove());

    const existingButtonContainer = document.querySelectorAll('.sdr-graph-button-container-main');
    existingButtonContainer.forEach(button => button.remove());

    // Create div that will contain the buttons
    const buttonContainer = document.createElement('div');
    const sdrGraph = document.querySelector('.canvas-container');
    buttonContainer.id = 'sdr-graph-button-container';
    buttonContainer.classList.add('sdr-graph-button-container-main');
    buttonContainer.style.opacity = '1';
    if (sdrGraph) sdrGraph.appendChild(buttonContainer);

    // Create new button for controlling spectrum
    const spectrumButton = document.createElement('button');
    spectrumButton.id = 'spectrum-scan-button';
    spectrumButton.setAttribute('aria-label', 'Spectrum Graph Scan');
    spectrumButton.classList.add('rectangular-spectrum-button', 'tooltip');
    spectrumButton.setAttribute('data-tooltip', 'Perform Manual Scan');
    spectrumButton.innerHTML = '<i class="fa-solid fa-rotate"></i>';
    spectrumButton.addEventListener('contextmenu', e => e.preventDefault());

    // Add event listener
    let canSendMessage = true;
    if (isTuningAllowed) {
        spectrumButton.addEventListener('click', () => {
            initializeGraph();
            const message = JSON.stringify({
                type: 'spectrum-graph',
                value: {
                    status: 'scan'
                },
            });
            function sendMessage(message) {
                if (!canSendMessage || !wsSendSocket) return;

                if (wsSendSocket) wsSendSocket.send(message);
                canSendMessage = false;

                // Cooldown
                setTimeout(() => {
                    canSendMessage = true;
                }, 1000);
            }
            sendMessage(message);
        });
    }

    // Set container position to relative
    const canvasSdrGraph = document.getElementById('sdr-graph');
    if (canvasSdrGraph) {
        const canvasContainer = canvasSdrGraph.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
            canvasContainer.style.position = 'relative';
        } else {
            console.error(`${pluginName}: Parent container is not .canvas-container`);
        }
    } else {
        console.error(`${pluginName}: #sdr-graph not found`);
    }

    // Locate canvas and its parent container
    const canvas = document.getElementById('sdr-graph-button-container');
    if (canvas) {
        const canvasContainer = canvas;
        if (canvasContainer && canvasContainer.classList.contains('sdr-graph-button-container-main')) {
            canvasContainer.style.position = 'relative';
            canvas.style.cursor = 'crosshair';
            canvasContainer.appendChild(spectrumButton);
        } else {
            console.error(`${pluginName}: Parent container for button not found`);
        }
    } else {
        console.error(`${pluginName}: #sdr-graph-button-container not found`);
    }

    // Add styles
    const rectangularButtonStyle = `
    .rectangular-spectrum-button {
        position: absolute;
        top: ${topValue};
        right: 16px;
        opacity: 0.8;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
        width: 32px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.8);
        z-index: 8;
    }
`;

    const styleElement = document.createElement('style');
    styleElement.innerHTML = rectangularButtonStyle;
    document.head.appendChild(styleElement);

    /*
    ToggleAddButton(Id,                             Tooltip,                    FontAwesomeIcon,    localStorageVariable,   localStorageKey,        ButtonPosition)
    */
    //ToggleAddButton 'hold-button' located in getCurrentAntenna(), added here only to keep buttons in order
    ToggleAddButton('hold-button',                  'Hold Peaks',               'pause',            'enableHold',           `HoldPeaks${currentAntenna}`,   '56');
    ToggleAddButton('smoothing-on-off-button',      'Smooth Graph Edges',       'chart-area',       'enableSmoothing',      'Smoothing',                    '96');
    ToggleAddButton('fixed-dynamic-on-off-button',  'Relative/Fixed Scale',     'arrows-up-down',   'fixedVerticalGraph',   'FixedVerticalGraph',           '136');
    ToggleAddButton('auto-baseline-on-off-button',  'Auto Baseline',            'a',                'isAutoBaseline',       'AutoBaseline',                 '176');
    if (drawAboveCanvasIsPossible) {
    ToggleAddButton('draw-above-canvas',            'Move Above Signal Graph',  drawAboveCanvasOverridePosition ? 'turn-down' : 'turn-up',       'isAboveSignalCanvas',  'AboveSignalCanvas',            '216');
        const drawAboveSignalCanvasButton = document.getElementById('draw-above-canvas');
        drawAboveSignalCanvasButton.addEventListener('click', function() {
            signalMeterDelay = 800;
            getCurrentDimensions();
        });
    } else {
        const sdrCanvasDrawAboveCanvas = document.getElementById('draw-above-canvas');
        if (sdrCanvasDrawAboveCanvas) {
            sdrCanvasDrawAboveCanvas.style.display = 'none';
        }
    }
    if (typeof initTooltips === 'function') initTooltips();
    if (updateText) insertUpdateText(updateText);

    // Fade effect for buttons
    applyFadeEffect('spectrum-scan-button', 0, 0.96);
    applyFadeEffect('hold-button', 0, 0.96);
    applyFadeEffect('smoothing-on-off-button', 0, 0.96);
    applyFadeEffect('fixed-dynamic-on-off-button', 0, 0.96);
    applyFadeEffect('auto-baseline-on-off-button', 0, 0.96);
    applyFadeEffect('draw-above-canvas', 0, 0.96);

    setTimeout(() => {
        // Fade in effect for buttons
        applyFadeEffect('spectrum-scan-button', 0.8, 1);
        applyFadeEffect('hold-button', 0.8, 1);
        applyFadeEffect('smoothing-on-off-button', 0.8, 1);
        applyFadeEffect('fixed-dynamic-on-off-button', 0.8, 1);
        applyFadeEffect('auto-baseline-on-off-button', 0.8, 1);
        applyFadeEffect('draw-above-canvas', 0.8, 1);
    }, 40);

    // Fade all buttons on canvas hover
    const sdrGraphCSS = document.querySelector('.canvas-container');
    const sdrGraphButtonContainer = document.getElementById('sdr-graph-button-container');

    sdrGraphButtonContainer.style.opacity = 0.8;
    sdrGraphButtonContainer.style.transition = 'opacity 0.5s ease';

    sdrGraphCSS.addEventListener('mouseover', () => {
      sdrGraphButtonContainer.style.transition = 'opacity 0.5s ease';
      sdrGraphButtonContainer.style.opacity = 1;
    });

    sdrGraphCSS.addEventListener('mouseout', () => {
      sdrGraphButtonContainer.style.transition = 'opacity 1s ease 3s';
      sdrGraphButtonContainer.style.opacity = 0.8;
    });
}

// Create button
function ToggleAddButton(Id, Tooltip, FontAwesomeIcon, localStorageVariable, localStorageKey, ButtonPosition) {
    // Remove any existing instances of button
    const existingButtons = document.querySelectorAll(`.${Id}`);
    existingButtons.forEach(button => button.remove());

    // Create new button
    const toggleButton = document.createElement('button');
    toggleButton.id = `${Id}`;
    toggleButton.setAttribute('aria-label', 'Toggle On/Off');
    toggleButton.classList.add(`${Id}`, 'tooltip');
    toggleButton.setAttribute('data-tooltip', `${Tooltip}`);
    toggleButton.innerHTML = `<i class="fa-solid fa-${FontAwesomeIcon}"></i>`;
    toggleButton.addEventListener('contextmenu', e => e.preventDefault());

    // Button state (off by default)
    let isOn = false;

    if (localStorageItem[localStorageVariable]) {
        isOn = true;
        toggleButton.classList.toggle('button-on', isOn);
    }

    // Add event listener for toggle functionality
    toggleButton.addEventListener('click', () => {
        isOn = !isOn; // Toggle state
        toggleButton.classList.toggle('button-on', isOn); // Highlight if "on"

        if (isOn) {
            localStorageItem[localStorageVariable] = true;
            localStorage.setItem(`enableSpectrumGraph${localStorageKey}`, 'true');
        } else {
            localStorageItem[localStorageVariable] = false;
            localStorage.setItem(`enableSpectrumGraph${localStorageKey}`, 'false');
        }
        setTimeout(drawGraph, drawGraphDelay);
    });

    // Locate the canvas and its parent container
    const canvas = document.getElementById('sdr-graph-button-container');
    if (canvas) {
        canvas.style.backdropFilter = `blur(${BACKGROUND_BLUR_PIXELS}px)`;
        canvas.style.borderRadius = '8px';
        const canvasContainer = canvas;
        if (canvasContainer && canvasContainer.classList.contains('sdr-graph-button-container-main')) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(toggleButton);

            // Adjust position to be left of spectrum button if it exists
            const spectrumButton = document.getElementById('spectrum-scan-button');
            if (spectrumButton) {
                toggleButton.style.right = `${parseInt(spectrumButton.style.right, 10) + 40}px`; // 40px offset
            }
        } else {
            console.error(`${pluginName}: Parent container is not .canvas-container`);
        }
    } else {
        console.error(`${pluginName}: #sdr-graph not found`);
    }

    // Add styles
    const buttonStyle = `
    .${Id} {
        position: absolute;
        top: ${topValue};
        right: ${ButtonPosition}px;
        opacity: 0.8;
        border-radius: 5px;
        padding: 5px 10px;
        cursor: pointer;
        transition: background-color 0.3s, color 0.3s, border-color 0.3s;
        width: 32px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.8);
        transform: scale(1);
        z-index: 8;
    }
    .${Id} i {
        font-size: 14px;
    }
    .${Id}.button-on {
        filter: brightness(150%) contrast(110%);
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.5), 0 0 10px var(--color-5);
    }
`;

    const styleElement = document.createElement('style');
    styleElement.innerHTML = buttonStyle;
    document.head.appendChild(styleElement);
}

// Function to display update text
function insertUpdateText(updateText) {
    // Remove any existing update text
    const existingText = document.querySelector('.spectrum-graph-update-text');
    if (existingText) existingText.remove();

    // Create new text element
    const updateTextElement = document.createElement('div');
    updateTextElement.classList.add('spectrum-graph-update-text');
    updateTextElement.textContent = updateText;

    // Style the text
    updateTextElement.style.position = 'absolute';
    updateTextElement.style.top = '32px';
    updateTextElement.style.left = '40px';
    updateTextElement.style.zIndex = '10';
    updateTextElement.style.color = 'var(--color-5-transparent)';
    updateTextElement.style.fontSize = '14px';
    updateTextElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    updateTextElement.style.padding = '4px 8px';
    updateTextElement.style.borderRadius = '5px';
    updateTextElement.style.opacity = '1';
    updateTextElement.style.zIndex = '8';
    updateTextElement.addEventListener('mouseenter', () => { updateTextElement.style.opacity = '0.1'; });

    // Locate canvas container
    const canvas = document.getElementById('sdr-graph');
    if (canvas) {
        const canvasContainer = canvas.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
            canvasContainer.style.position = 'relative';
            canvasContainer.appendChild(updateTextElement);
        } else {
            console.error(`${pluginName}: Parent container is not .canvas-container`);
        }
    } else {
        console.error(`${pluginName}: #sdr-graph not found`);
    }

    function resetUpdateTextTimeout() {
        // Clear any existing timeout
        clearTimeout(removeUpdateTextTimeout);

        // Begin new timeout
        removeUpdateTextTimeout = setTimeout(() => {
            const sdrCanvasUpdateText = document.querySelector('.spectrum-graph-update-text');
            if (sdrCanvasUpdateText) {
                sdrCanvasUpdateText.remove();
            }
        }, 10000);
    }
    resetUpdateTextTimeout();
}

// Check if administrator code
var isTuneAuthenticated = false;
var isTunerLocked = false;
var isTuningAllowed = false;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminMode();
});

// Is the user administrator?
function checkAdminMode() {
    const bodyText = document.body.textContent || document.body.innerText;
    isTunerLocked = !!document.querySelector('.fa-solid.fa-key.pointer.tooltip') || !!document.querySelector('.fa-solid.fa-lock.pointer.tooltip');
    isTuneAuthenticated = bodyText.includes("You are logged in as an administrator.") || bodyText.includes("You are logged in as an adminstrator.") || bodyText.includes("You are logged in and can control the receiver.");
    if (isTuneAuthenticated || (isTunerLocked && isTuneAuthenticated) || (!isTunerLocked && !isTuneAuthenticated)) isTuningAllowed = true;
    if (isTuneAuthenticated) {
        console.log(`${pluginName}: Logged in as administrator`);
    }
}

// Fetch any available data on page load
async function initializeGraph() {
    try {
        // Fetch the initial data from endpoint
        const basePath = window.location.pathname.replace(/\/?$/, '/');
        const apiPath = `${basePath}spectrum-graph-plugin`.replace(/\/+/g, '/');

        const response = await fetch(apiPath, {
            method: 'GET',
            headers: {
                'X-Plugin-Name': 'SpectrumGraphPlugin'
            }
        });

        if (!response.ok) {
            throw new Error(`${pluginName} failed to fetch data: ${response.status}`);
        }

        const data = await response.json();

        // Switch to data of current antenna
        if (data.ad && data.sd && (data.sd0 || data.sd1)) {
            data.sd = data[`sd${data.ad}`];
            currentAntenna = data.ad;
        }

        // Check if `sd` exists
        if (data.sd && data.sd.trim() !== '') {
            if (data.sd.length > 0) {

                // Remove trailing comma and space in TEF radio firmware
                if (data.sd && data.sd.endsWith(', ')) {
                    data.sd = data.sd.slice(0, -2);
                }

                // Split the response into pairs and process each one (as it normally does server-side)
                sigArray = data.sd.split(',').map(pair => {
                    let [freq, sig] = pair.split('=');
                    // Signal calibration
                    if (CAL90000 || CAL95500 || CAL100500 || CAL105500) {
                        const _f = parseFloat(freq) / 1000;
                        let adjustment = (_f >= 87 && _f < 93) ? CAL90000 : (_f >= 93 && _f < 98) ? CAL95500 : (_f >= 98 && _f < 103) ? CAL100500 : (_f >= 103 && _f <= 108) ? CAL105500 : 0;
                        sig = parseFloat(sig);
                        if (sig > 15) sig += adjustment * ((sig <= 20 ? (sig - 15) / 5 : 1));
                        console.log(`${pluginName} calibrated sigArray.`);
                    }

                    return { freq: (freq / 1000).toFixed(2), sig: parseFloat(sig).toFixed(1) };
                });
            }

            if (debug) {
                if (Array.isArray(sigArray)) {
                    // Process sigArray
                    sigArray.forEach(item => {
                        console.log(`freq: ${item.freq}, sig: ${item.sig}`);
                    });
                } else {
                    console.error(`${pluginName} expected array for sigArray, but received:`, sigArray);
                }
            }
        } else {
            console.log(`${pluginName} found no data available at page load.`);
            getDummyData();
        }
    } catch (error) {
        console.error(`${pluginName} error during graph initialisation.`);
        getDummyData();
    }
    getCurrentAntenna();
}

function getDummyData() {
    let dummyFreqStart = 86;
    let dummyFreqEnd = 108;
    const element = document.querySelector("#dashboard-panel-description.hidden-panel .flex-container .tuner-desc .text-small .color-4");
    if (element) {
      const text = element.textContent;
      const regex = /(\d+(\.\d+)?)\s*MHz\s*-\s*(\d+(\.\d+)?)/;
      const match = text.match(regex);
      if (match && dummyFreqStart >= 0 && dummyFreqEnd <= 200) {
          dummyFreqStart = Math.max(Number(match[1]), 86); // Match fmLowerLimit value (default: 86)
          dummyFreqEnd = Number(match[3]);
      }
    }
    // Dummy data
    if (!sigArray || sigArray.length === 0) {
        sigArray = [{ freq: `${dummyFreqStart}`, sig: "0.00" }];
        sigArray.push({ freq: (dummyFreqStart + dummyFreqEnd) / 2, sig: "0.00" });
        sigArray.push({ freq: `${dummyFreqEnd}`, sig: "0.00" });
    }
}

// Call function on page load
window.addEventListener('load', initializeGraph);

// Fetch current antenna
async function getCurrentAntenna() {
    try {
        // Fetch the initial data from api
        const basePath = window.location.pathname.replace(/\/?$/, '/');
        const apiPath = `${basePath}api`.replace(/\/+/g, '/');
        fetch(apiPath)
            .then(response => response.json())
            .then(data => {
                // Data of current antenna
                if (data.ant) {
                    currentAntenna = data.ant;
                    console.log(`${pluginName} data found for antenna ${data.ant}.`);
                }

                // Hold peaks antenna localStorage
                localStorageItem.enableHold = localStorage.getItem(`enableSpectrumGraphHoldPeaks${currentAntenna}`) === 'true';     // Holds peaks
                if (isGraphOpen) ToggleAddButton('hold-button',                  'Hold Peaks',               'pause',            'enableHold',           `HoldPeaks${currentAntenna}`,   '56');
                if (typeof initTooltips === 'function') initTooltips();
                outlinePointsSavePermission = !localStorageItem.enableHold;
                if (isGraphOpen) setTimeout(drawGraph, drawGraphDelay);
            })
            .catch(error => {
                console.error(`${pluginName} error fetching api data:`, error);
            });
    } catch (error) {
        console.error(`${pluginName} error fetching current antenna:`, error);
    }
}

// Display signal canvas (default)
function displaySignalCanvas() {
    // Lock button
    const pluginButton = document.getElementById('spectrum-graph-button');
    if (pluginButton) {
        pluginButton.classList.remove('active');
        pluginButton.disabled = true;
        setTimeout(() => {
            pluginButton.disabled = false;
        }, 400);
    } else {
        console.warn(`${pluginName}: Function 'addIconToPluginPanel' not found or resolution too low to display.`);
    }

    const sdrCanvas = document.getElementById('sdr-graph');
    if (sdrCanvas) {
        sdrCanvas.style.display = 'block';
        // Fade effect
        setTimeout(() => {
            sdrCanvas.style.visibility = 'hidden';
            sdrCanvas.style.position = 'absolute';
        }, 300);
        sdrCanvas.style.opacity = 0;
        sdrCanvas.style.transition = 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out';
        sdrCanvas.style.transform = 'scale(0.96)';
        isGraphOpen = false;
    }

    setTimeout(() => {
        applyFadeEffect('spectrum-scan-button', 0, 0.96);
        applyFadeEffect('hold-button', 0, 0.96);
        applyFadeEffect('smoothing-on-off-button', 0, 0.96);
        applyFadeEffect('fixed-dynamic-on-off-button', 0, 0.96);
        applyFadeEffect('auto-baseline-on-off-button', 0, 0.96);
        applyFadeEffect('draw-above-canvas', 0, 0.96);
    }, 10);

    setTimeout(() => {
        const sdrCanvasButtonContainer = document.getElementById('sdr-graph-button-container');
        if (sdrCanvasButtonContainer) {
            sdrCanvasButtonContainer.style.display = 'none';
        }
        const sdrCanvasScanButton = document.getElementById('spectrum-scan-button');
        if (sdrCanvasScanButton) {
            sdrCanvasScanButton.style.display = 'none';
        }
        const sdrCanvasHoldButton = document.getElementById('hold-button');
        if (sdrCanvasHoldButton) {
            sdrCanvasHoldButton.style.display = 'none';
        }
        const sdrCanvasSmoothingButton = document.getElementById('smoothing-on-off-button');
        if (sdrCanvasSmoothingButton) {
            sdrCanvasSmoothingButton.style.display = 'none';
        }
        const sdrCanvasFixedDynamicButton = document.getElementById('fixed-dynamic-on-off-button');
        if (sdrCanvasFixedDynamicButton) {
            sdrCanvasFixedDynamicButton.style.display = 'none';
        }
        const sdrCanvasAutoBaselineButton = document.getElementById('auto-baseline-on-off-button');
        if (sdrCanvasAutoBaselineButton) {
            sdrCanvasAutoBaselineButton.style.display = 'none';
        }
        const sdrCanvasDrawAboveCanvas = document.getElementById('draw-above-canvas');
        if (sdrCanvasDrawAboveCanvas) {
            sdrCanvasDrawAboveCanvas.style.display = 'none';
        }
        const sdrCanvasUpdateText = document.querySelector('.spectrum-graph-update-text');
        if (sdrCanvasUpdateText) {
            sdrCanvasUpdateText.remove();
        }
        // Hide canvas
        const sdrGraph = document.getElementById('sdr-graph');
        if (sdrGraph) sdrGraph.style.display = 'none';
    }, 400);

    const loggingCanvas = document.getElementById('logging-canvas');
    if (loggingCanvas) {
        loggingCanvas.style.display = 'none';
    }
    const ContainerRotator = document.getElementById('containerRotator');
    if (ContainerRotator) {
        ContainerRotator.style.display = 'block';
    }
    const ContainerAntenna = document.getElementById('Antenna');
    if (ContainerAntenna) {
        ContainerAntenna.style.display = 'block';
    }
    const signalCanvas = document.getElementById('signal-canvas');
    if (signalCanvas) {
        signalCanvas.style.display = 'block';
        setTimeout(() => {
            // Fade in effect
            signalCanvas.style.visibility = 'visible';
            signalCanvas.style.opacity = 1;
            signalCanvas.style.transition = 'opacity 0.3s ease-in-out, transform 0.5s ease-in-out';
            signalCanvas.style.transform = 'scale(1)';
        }, 40);
    }
}

// Display SDR graph output
function displaySdrGraph() {
    // Show canvas
    const sdrGraph = document.getElementById('sdr-graph');
    if (sdrGraph) sdrGraph.style.display = 'block';

    setTimeout(() => {
        // Lock button
        const pluginButton = document.getElementById('spectrum-graph-button');
        pluginButton.classList.add('active');
        pluginButton.disabled = true;
        setTimeout(() => {
            pluginButton.disabled = false;
        }, 400);

        const sdrCanvas = document.getElementById('sdr-graph');
        if (sdrCanvas) {
            sdrCanvas.style.display = 'block';
            // Fade in effect
            sdrCanvas.style.visibility = 'visible';
            sdrCanvas.style.opacity = 1;
            sdrCanvas.style.transform = 'scale(1)';
            isGraphOpen = true;
            if (!BORDERLESS_THEME) canvas.style.border = "1px solid var(--color-3)";
            setTimeout(drawGraph, drawGraphDelay);
            const signalCanvas = document.getElementById('signal-canvas');
            if (signalCanvas) {
                signalCanvas.style.position = 'absolute';
                if (!drawAboveCanvasOverridePosition) {
                    setTimeout(() => {
                        signalCanvas.style.display = 'none';
                    }, 300);
                    // Fade effect
                    signalCanvas.style.opacity = 0;
                    signalCanvas.style.transition = 'opacity 0.4s ease-in-out, transform 0.5s ease-in-out';
                    signalCanvas.style.transform = 'scale(0.98)';
                }
            }
        }
        const loggingCanvas = document.getElementById('logging-canvas');
        if (loggingCanvas) {
            loggingCanvas.style.display = 'none';
        }
        const loggingCanvasButtons = document.querySelector('.download-buttons-container');
        if (loggingCanvasButtons) {
            loggingCanvasButtons.style.display = 'none';
        }
        const ContainerRotator = document.getElementById('containerRotator');
        if (ContainerRotator) {
            if (hideContainerRotator) {
                ContainerRotator.style.display = 'none';
                canvasFullWidthOffset = 0;
            } else {
                canvasFullWidthOffset = 204;
                const style = document.createElement('style');
                style.textContent = `
                    #sdr-graph {
                        width: 82%;
                        margin-left: 200px;
                        margin-top: 0px;
                    }
                `;
                document.head.appendChild(style);
                resizeCanvas();
            }
        }
        const ContainerAntenna = document.getElementById('Antenna');
        if (ContainerAntenna) {
            ContainerAntenna.style.display = 'none';
        }
        ScanButton();
    }, 40);
}

// Adjust dataCanvas height based on window height
function adjustSdrGraphCanvasHeight() {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.matchMedia("(orientation: portrait)").matches && window.innerWidth <= 480) {
        displaySignalCanvas(); // Ensure it doesn't appear in portrait mode
    } else {
        if (window.innerHeight <= windowHeight && window.innerWidth > 480) {
            canvas.height = canvasHeightSmall;
        } else {
            canvas.height = canvasHeightLarge;
        }
        drawGraph();
    }
}

// Toggle spectrum state and update UI accordingly
function toggleSpectrum() {
    // Do not proceed to open canvas if signal canvas is hidden
    if (!document.querySelector("#signal-canvas")?.offsetParent && !isSpectrumOn) return;

    signalText = localStorage.getItem('signalUnit');

    const SpectrumButton = document.getElementById('spectrum-graph-button');
    const ButtonsContainer = document.querySelector('.download-buttons-container');
    const antennaImage = document.querySelector('#antenna'); // Ensure ID 'antenna' is correct
    isSpectrumOn = !isSpectrumOn;

    const loggingCanvas = document.getElementById('logging-canvas');
    if (loggingCanvas) {
        loggingCanvas.style.display = 'none';
    }

    if (isSpectrumOn) {
        // Update button appearance
        SpectrumButton.classList.remove('bg-color-2');
        SpectrumButton.classList.add('bg-color-4');

        // Perform when spectrum is on
        displaySdrGraph();

        // Hide antenna image
        if (antennaImage) {
            antennaImage.style.visibility = 'hidden';
        }

        // Set initial height with delay
        setTimeout(adjustSdrGraphCanvasHeight, 400);
    } else {
        // Update button appearance
        SpectrumButton.classList.remove('bg-color-4');
        SpectrumButton.classList.add('bg-color-2');

        // Perform when spectrum is off
        displaySignalCanvas();

        // Hide download buttons
        if (ButtonsContainer) {
            ButtonsContainer.style.display = 'none';
        }

        // Show antenna image
        if (antennaImage) {
            antennaImage.style.visibility = 'visible';
        }
    }
    signalUnits();
}

// Observe any frequency changes
function observeFrequency() {
    if (dataFrequencyElement) {
        // Create MutationObserver
        const observer = new MutationObserver((mutationsList, observer) => {
            // Loop through mutations that were triggered
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    const dataFrequencyValue = dataFrequencyElement.textContent;
                    if (isGraphOpen) setTimeout(drawGraph, drawGraphDelay);
                }
            }
        });

        const config = { childList: true, subtree: true };

        observer.observe(dataFrequencyElement, config);
    } else {
        console.log(`${pluginName}: #data-frequency missing`);
    }
}
observeFrequency();

// Tooltip and frequency highlighter
function initializeCanvasInteractions() {
    const canvas = document.getElementById('sdr-graph');
    const canvasContainer = document.querySelector('.canvas-container');
    const tooltip = document.createElement('div');

    const colorBackground = getComputedStyle(document.documentElement).getPropertyValue('--color-1-transparent').trim();

    // Style tooltip
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'var(--color-3-transparent)';
    tooltip.style.border = '1px solid var(--color-3)';
    tooltip.style.color = 'var(--color-main-2)';
    tooltip.style.padding = '4px 8px 4px 8px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.visibility = 'hidden';
    tooltip.style.zIndex = '9';

    // Append tooltip inside the canvas-container
    canvasContainer.appendChild(tooltip);

    // Scaling factors and bounds
    let xScale, minFreq, freqRange, yScale;

    // Function to draw circle and tooltips
    function updateTooltip(event) {
        const ctx = canvas.getContext('2d');

        if (graphImageData) ctx.putImageData(graphImageData, 0, 0);

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Calculate frequency
        const freq = minFreq + (mouseX - xOffset) / xScale;

        if (freq < minFreq || freq > minFreq + freqRange) {
            tooltip.style.visibility = 'hidden';
            return;
        }

        // Find closest point in sigArray to the frequency under the cursor
        let closestPoint = null;
        let minDistance = Infinity;
        for (let point of sigArray) {
            const distance = Math.abs(point.freq - freq.toFixed(1));
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        if (closestPoint) {
            const signalValue = Number(closestPoint.sig);

            // Calculate tooltip content
            const freqText = `${freq.toFixed(1)} MHz`;
            const signalText = `, ${Math.round(signalValue.toFixed(2) - sigOffset).toFixed(0)} ${sigDesc}`;

            // Style HTML
            tooltip.innerHTML = `
                <span style="font-weight: 600;">${freqText}</span>
                <span style="font-weight: 400;">${signalText}</span>
            `;

            // Calculate position of circle
            const adjustedSignalValue = signalValue - minSig;
            const circleX = xOffset + (closestPoint.freq - minFreq) * xScale;
            const circleY = canvas.height - (adjustedSignalValue * yScale) - 20;

            // Draw circle at tip of the signal
            ctx.beginPath();
            ctx.arc(circleX, circleY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = 'var(--color-5-transparent)';
            ctx.fill();
            ctx.strokeStyle = 'var(--color-main-bright)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Tooltip positioning
            let tooltipX = ((xOffset + 10) + (closestPoint.freq - minFreq) * xScale) + canvasFullWidthOffset;
            let tooltipY = parseInt(canvas.height - 20 - signalValue * yScale);
            const tooltipWidth = tooltip.offsetWidth;
            const tooltipHeight = tooltip.offsetHeight;

            // Limit tooltip width location
            if (tooltipX + tooltipWidth > (canvas.width + canvasFullWidthOffset)) {
                tooltipX = (mouseX - tooltip.offsetWidth - 10) + canvasFullWidthOffset;
            }

            // Limit tooltip height location
            if (tooltipY - tooltipHeight < 10) {
                tooltipY = (tooltipY - (tooltipY - tooltipHeight)) + 1;
            }

            tooltip.style.left = `${tooltipX}px`;
            tooltip.style.top = `${(tooltipY - 30) - (drawAboveCanvasOverridePosition ? canvasFullHeight : 0)}px`;
            tooltip.style.visibility = 'visible';
        }
    }

    function handleClick(event) {
        if (!ENABLE_MOUSE_CLICK_TO_TUNE) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;

        // Calculate frequency
        const freq = minFreq + (mouseX - xOffset) / xScale;

        if (freq < minFreq || freq > minFreq + freqRange) return;

        // Send WebSocket command
        const command = `T${Math.round(freq.toFixed(1) * 1000)}`;
        console.log(`${pluginName}: Sending command "${command}"`);
        socket.send(command);
        setTimeout(() => {
            setTimeout(drawGraph, drawGraphDelay);
        }, 40);
    }

    // Function to control frequency via mouse wheel
    function handleWheelScroll(event) {
        if (ENABLE_MOUSE_SCROLL_WHEEL) {
            event.preventDefault(); // Prevent webpage scrolling

            // Normalize deltaY value for cross-browser consistency
            const delta = event.deltaY || event.detail || -event.wheelDelta;

            if (delta < 0) {
                // Scroll up
                tuneUp();
            } else {
                // Scroll down
                tuneDown();
            }
        }
    }

    // Add event listeners
    let lastTimeThrottled = 0;
    const throttleDelay = 20; // ms

    function updateTooltipThrottled(event) {
        const currentTimeThrottled = Date.now();
        const timeDiffThrottled = currentTimeThrottled - lastTimeThrottled;

        if (timeDiffThrottled >= throttleDelay) {
            lastTimeThrottled = currentTimeThrottled;
            updateTooltip(event);
        }
    }

    // Use throttled mousemove
    canvas.addEventListener('mousemove', updateTooltipThrottled);
    canvas.addEventListener('mouseleave', () => {
        tooltip.style.visibility = 'hidden';
        setTimeout(() => {
            setTimeout(drawGraph, drawGraphDelay);
        }, 400);
    });
    canvas.addEventListener('wheel', handleWheelScroll);
    canvas.addEventListener('click', handleClick);

    // Called after graph is drawn
    return function updateBounds(newXScale, newMinFreq, newFreqRange, newYScale) {
        xScale = newXScale;
        minFreq = newMinFreq;
        freqRange = newFreqRange;
        yScale = newYScale;
    };
}

// Select container where canvas should be added
const container = document.querySelector('.canvas-container');

// Create a new canvas element
const canvas = document.createElement('canvas');

// Set canvas attributes
canvas.id = 'sdr-graph';
canvas.position = 'relative';

function resizeCanvas() {
    getCurrentDimensions();
    let fixedWidth = (canvasFullWidth - canvasWidthOffset) - canvasFullWidthOffset;
    let paddingWidth = 10;
    if (window.innerWidth < fixedWidth + paddingWidth) canvas.width = window.innerWidth - paddingWidth; else canvas.width = fixedWidth;
    adjustSdrGraphCanvasHeight();
}

document.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
});

window.addEventListener("resize", resizeCanvas);

if (window.innerHeight <= windowHeight && window.innerWidth > 480) {
    canvas.height = canvasHeightSmall;
} else {
    canvas.height = canvasHeightLarge;
}

// Append the canvas to the container
container.appendChild(canvas);

// Get background colour
function getBackgroundColor(element) {
    return window.getComputedStyle(element).backgroundColor;
}
const wrapperOuter = document.getElementById('wrapper');

$(window).on('load', function() {
    setTimeout(() => {
        let currentBackgroundColor = getBackgroundColor(wrapperOuter);
        const observer = new MutationObserver(() => {
            const newColor = getBackgroundColor(wrapperOuter);
            if (newColor !== currentBackgroundColor) {
                setTimeout(() => {
                    console.log(`${pluginName} new background colour.`);
                    setTimeout(drawGraph, drawGraphDelay);
                }, 400);
            }
        });
        const config = { attributes: true };
        observer.observe(wrapperOuter, config);
    }, 1000);
});

// Draw graph
function drawGraph() {
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Check if sigArray has data
    if (!sigArray || sigArray.length === 0) {
        //console.error("sigArray is empty or not defined");
        return;
    }

    dataFrequencyValue = dataFrequencyElement.textContent;

    let savedOutline;

    if (!localStorageItem.enableHold) outlinePointsSavePermission = true;

    // Store outline data
    if (localStorageItem.enableHold) {
        outlinePoints = [];

        for (let i = 0; i < sigArray.length; i++) {
            const sig = sigArray[i];
            outlinePoints.push({ freq: sig.freq, sig: sig.sig });
        }

        // Save current graph outline
        if (outlinePointsSavePermission) {
            if (!Array.isArray(outlinePoints)) {
                console.error(`${pluginName}: Invalid outline points. Must be an array.`);
                return;
            }

            try {
                localStorage.setItem(`enableSpectrumGraphOutline${currentAntenna}`, JSON.stringify(outlinePoints));
                console.log(`${pluginName}: Graph outline saved for antenna ${currentAntenna}.`);
            } catch (error) {
                console.error(`${pluginName} failed to save graph outline:`, error);
            }

            outlinePointsSavePermission = false;
        }

        // Load saved graph outline
        const savedData = localStorage.getItem(`enableSpectrumGraphOutline${currentAntenna}`);
        if (!savedData) {
            //console.log(`${pluginName}: No saved graph outline found.`);
            return;
        }

        try {
            savedOutline = JSON.parse(savedData);
        } catch (error) {
            console.error(`${pluginName}: Failed to parse saved graph outline:`, error);
            return;
        }

        if (!Array.isArray(savedOutline) || savedOutline.length === 0) {
            console.log(`${pluginName}: Saved graph outline is empty or invalid.`);
            return;
        }

        if (ADJUST_SCALE_TO_OUTLINE) {
            minSigOutline = Math.max(Math.min(...savedOutline.map(p => p.sig)) - dynamicPadding, -1);
            maxSigOutline = Math.min(Math.max(...savedOutline.map(p => p.sig)) + dynamicPadding, canvas.height);
        }
    }

    // Determine min signal value dynamically
    if (localStorageItem.isAutoBaseline) {
        minSig = Math.max(Math.min(...sigArray.map(d => d.sig)) - dynamicPadding, -1); // Dynamic vertical graph
        if (ADJUST_SCALE_TO_OUTLINE && localStorageItem.enableHold && (minSigOutline < minSig)) minSig = minSigOutline;
    } else {
        minSig = 0; // Fixed min vertical graph
    }

    // Determine max signal value dynamically
    if (!localStorageItem.fixedVerticalGraph) {
        maxSig = (Math.max(...sigArray.map(d => d.sig)) - minSig) + dynamicPadding || 0.01; // Dynamic vertical graph
        if (ADJUST_SCALE_TO_OUTLINE && localStorageItem.enableHold && (maxSigOutline > maxSig)) maxSig = (maxSigOutline - minSig);
    } else {
        maxSig = 80 - minSig; // Fixed max vertical graph
    }

    const minFreq = Math.max(Math.min(...sigArray.map(d => d.freq)) || 88, 0);
    const maxFreq = Math.min(Math.max(...sigArray.map(d => d.freq)) || 108, 200);

    if (maxFreq - minFreq <= 12) isDecimalMarkerRoundOff = false;

    // Determine frequency step dynamically
    const freqRange = (maxFreq - minFreq).toFixed(2);
    const approxSpacing = width / freqRange; // Approx spacing per frequency
    let freqStep;
    if (approxSpacing < 20) {
        freqStep = 5;
    } else if (approxSpacing < 40) {
        freqStep = 2;
    } else if (approxSpacing < 64) {
        freqStep = 1;
    } else if (approxSpacing < 80) {
        freqStep = 0.5;
    } else if (approxSpacing < 160) {
        if (isDecimalMarkerRoundOff) {
            freqStep = 0.5;
        } else {
            freqStep = 0.4;
        }
    } else if (approxSpacing < 320) {
        if (isDecimalMarkerRoundOff) {
            freqStep = 0.5;
        } else {
            freqStep = 0.2;
        }
    } else {
        freqStep = 0.1;
    }

    // Scaling factors
    const xScale = (width - xOffset) / freqRange;
    const yScale = (height - 30) / maxSig;

    const colorText = getComputedStyle(document.documentElement).getPropertyValue('--color-5').trim();
    const colorBackground = getComputedStyle(document.documentElement).getPropertyValue('--color-1-transparent').trim();

    // Draw background
    if (!BORDERLESS_THEME) {
        ctx.fillStyle = colorBackground; // Background
        ctx.fillRect(0, 0, width, height);
    }

    // Reset line style for grid lines and graph
    ctx.setLineDash([]);

    // Draw frequency labels and tick marks
    if (BORDERLESS_THEME) {
        ctx.fillStyle = colorText;
        ctx.font = `12px Titillium Web, Helvetica, Calibri, Arial, Monospace, sans-serif`;
    } else {
        ctx.fillStyle = '#f0f0fe';
        ctx.font = `12px Helvetica, Calibri, Arial, Monospace, sans-serif`;
    }
    ctx.strokeStyle = '#ccc';

    // Round minFreq if setting is enabled
    let minFreqRounded = minFreq;
    minFreqRounded = isDecimalMarkerRoundOff ? Math.ceil(minFreqRounded) : minFreqRounded;

    for (let freq = minFreqRounded; freq <= maxFreq; freq += freqStep) {
        const x = xOffset + (freq - minFreq) * xScale;
        if (freq !== minFreq && freq !== maxFreq) ctx.fillText(freq.toFixed(1), x - 10, height - 5);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        for (let freq = minFreqRounded; freq <= maxFreq; freq += freqStep) {
            const x = xOffset + (freq - minFreq) * xScale;

            // Draw tick mark only if it's not the first or last frequency
            if (freq !== minFreq && freq !== maxFreq) {
                ctx.beginPath();
                ctx.moveTo(x, height - 20); // Start at x-axis
                ctx.lineTo(x, height - 18); // Extend slightly upwards
                ctx.stroke();
            }
        }
    }

    // Draw signal labels
    let sigLabelStep;
    if (canvas.height === canvasHeightLarge) {
        sigLabelStep = maxSig / 8; // Increase the number of labels
    } else {
        sigLabelStep = maxSig / 4;
    }
    let labels = [];
    for (let sig = 0; sig <= (maxSig + 0.01); sig += sigLabelStep) { // IEEE 754 workaround for maxSig
        const y = height - 20.5 - sig * yScale;
        if (signalText === 'dbm') {
            // dBm spacing
            let tempDbfSig = ((sig - sigOffset) + minSig).toFixed(0);
            // dBm
            if (sig && tempDbfSig > -100) ctx.fillText(tempDbfSig, ((xOffset - xSigOffset) + 8), y + 3);
            if (sig && tempDbfSig <= -100) ctx.fillText(tempDbfSig, ((xOffset - xSigOffset)) + 1.5, y + 3);
        } else if (signalText === 'dbuv') {
            // dBuV number spacing
            let tempDbuvSig = (((sig - sigOffset) + 1) + minSig).toFixed(0);
            if (tempDbuvSig == -0) tempDbuvSig = 0;
            // dBuV using +1 for even numbering
            if (sig && tempDbuvSig >= 10) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset), y + 3);
            if (sig && tempDbuvSig > 0 && tempDbuvSig < 10) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset) + 6.5, y + 3);
            if (sig && tempDbuvSig == 0) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset) + 5.5, y + 3);
            if (sig && tempDbuvSig < 0 && tempDbuvSig > -10) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset) + 1.5, y + 3);
            if (sig && tempDbuvSig <= -10) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset) - 5.5, y + 3);
        } else if (signalText === 'dbf') {
            let tempDbfSig = ((sig - sigOffset) + minSig).toFixed(0);
            // dBf
            if (tempDbfSig == -0) tempDbfSig = 0;
            if (sig && tempDbfSig >= 10) ctx.fillText(tempDbfSig, (xOffset - xSigOffset), y + 3);
            if (sig && tempDbfSig > 0 && tempDbfSig < 10) ctx.fillText(tempDbfSig, (xOffset - xSigOffset) + 6.5, y + 3);
            if (sig && tempDbfSig == 0) ctx.fillText(tempDbfSig, (xOffset - xSigOffset) + 5.5, y + 3);
            if (sig && tempDbfSig < 0) ctx.fillText(tempDbfSig, (xOffset - xSigOffset) + 1.5, y + 3);
        }
        labels.push(sig); // Store labeled values
    }

    // Draw dotted grid lines (horizontal)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 2]); // Dotted lines
    ctx.beginPath(); // Start a new path for all horizontal lines

    for (let sig of labels) {
        const y = (height - 20 - sig * yScale) - 1;
        ctx.moveTo(xOffset, y);
        ctx.lineTo(width, y);
    }

    // Draw all lines in one stroke call to prevent overlaps
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    for (let sig = 0; sig <= maxSig; sig += sigLabelStep) {
        const y = height - 20 - sig * yScale; // Calculate vertical position

        // Draw tick mark only if it's not the first or last value
        if (sig !== 0) {
            ctx.beginPath();
            ctx.moveTo(xOffset - 2, y - 1); // Start just to the left of the axis
            ctx.lineTo(xOffset, y - 1); // Extend slightly outwards
            ctx.stroke();
        }
    }

    // Fill graph area
    const gradient = ctx.createLinearGradient(0, height - 20, 0, 0);

    // Add colour stops
    gradient.addColorStop(0, "#0030E0");        // Blue
    gradient.addColorStop(0.25, "#10C838");     // Green
    gradient.addColorStop(0.5, "#C0D000");      // Yellow
    gradient.addColorStop(0.75, "#FF0040");     // Red

    // Set fill style and draw a rectangle
    ctx.fillStyle = gradient;

    // Draw graph with smoothed points
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xOffset, height - 20); // Start from bottom-left corner

    // Draw graph line
    sigArray.forEach((point, index) => {
        if (point.sig < 0) point.sig = 0;
        const x = xOffset + (point.freq - minFreq) * xScale;
        const y = height - (point.sig - minSig) * yScale;
        if (index === 0) {
            ctx.lineTo(x, y - 20);
        } else {
            ctx.lineTo(x, y - 20);
        }
    });

    if (localStorageItem.enableSmoothing) {
        ctx.fillStyle = gradient;
        ctx.strokeStyle = gradient;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2; // Smoothing
        ctx.stroke();
    }

    // Restore to not affect the rest of the graph
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    // Return to the x-axis under the last data point
    const lastPointX = xOffset + (sigArray[sigArray.length - 1].freq - minFreq) * xScale;
    ctx.lineTo(lastPointX, height - 20);

    ctx.fill();

    // Draw grid lines (vertical)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([1, 2]); // Dotted lines

    // Vertical grid lines (for each frequency step)
    for (let freq = minFreqRounded; freq.toFixed(2) <= maxFreq; freq += freqStep) {
        const x = xOffset + (freq - minFreq) * xScale;
        if (freq !== minFreq) {
            ctx.beginPath();
            ctx.moveTo(x, 8);
            ctx.lineTo(x, height - 20);
            ctx.stroke();
        }
    }

    // Scanner plugin code by Highpoint
    if (ScannerIsScanning) {
        if (ScannerSpectrumLimiterValue !== 100 && ScannerSpectrumLimiterValue !== 0 && (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL')) {
            if (ScannerModeTemp !== ScannerMode) {
                ScannerModeTemp = ScannerMode;
                console.log(`${pluginName}: Scanner plugin mode changed to '${ScannerMode}'`);
            }
            const yPositionLimiterValue = height - 20 - ((ScannerSpectrumLimiterValue - minSig) * yScale);

            // Draw a semi-transparent red area to the top
            ctx.fillStyle = `rgba(226, 61, 1, ${ScannerLimiterOpacity})`;
            ctx.fillRect(xOffset, 8, width - xOffset, yPositionLimiterValue - 8);

            // Draw a contrasting red line
            ctx.strokeStyle = 'rgba(226, 61, 1, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xOffset, yPositionLimiterValue);
            ctx.lineTo(width, yPositionLimiterValue);
            ctx.stroke();

            // Write the SpectrumLimiterValue below the line
            ctx.fillStyle = 'rgba(226, 61, 1, 1.0)';
            ctx.font = '12px Arial, Titillium Web, Helvetica';
            ctx.textAlign = 'left';
            let ScannerSpectrumLimiterValueOffset = 0;
            if (ScannerSpectrumLimiterValue && ScannerSensitivity && ScannerSpectrumLimiterValue - ScannerSensitivity > 5 && ScannerSpectrumLimiterValue - ScannerSensitivity < 20) ScannerSpectrumLimiterValueOffset = 50;
            ctx.fillText(`${Math.round(Number(ScannerSpectrumLimiterValue.toFixed(1)) - sigOffset)} ${sigDesc}`, xOffset + (5 + ScannerSpectrumLimiterValueOffset), yPositionLimiterValue + 15);
        }

        if (ScannerSensitivity !== 0 && ScannerSensitivity !== 100 && ScannerMode !== '') {
            const yPositionScannerSensitivityValue = height - 20 - ((ScannerSensitivity - minSig) * yScale);

            // Draw a semi-transparent blue area to the bottom
            ctx.fillStyle = `rgba(4, 56, 215, ${ScannerLimiterOpacity})`;
            ctx.fillRect(xOffset, yPositionScannerSensitivityValue, width - xOffset, height - 20 - yPositionScannerSensitivityValue);

            // Draw a contrasting blue line
            ctx.strokeStyle = 'rgba(4, 56, 215, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xOffset, yPositionScannerSensitivityValue);
            ctx.lineTo(width, yPositionScannerSensitivityValue);
            ctx.stroke();

            // Write the Sensitivity value above the line
            ctx.fillStyle = 'rgba(4, 56, 215, 1.0)';
            ctx.font = '12px Arial, Titillium Web, Helvetica';
            ctx.textAlign = 'left';
            ctx.fillText(`${Math.round(Number(ScannerSensitivity.toFixed(1)) - sigOffset)} ${sigDesc}`, xOffset + 5, yPositionScannerSensitivityValue - 5);
        }
    } // **

    // Draw graph line
    let leftX, rightX;
    sigArray.forEach((point, index) => {
        if (point.sig < 0) point.sig = 0;
        const x = xOffset + (point.freq - minFreq) * xScale;
        const y = height - 20 - point.sig * yScale;

        // Draw current frequency line
        if (Number(dataFrequencyValue).toFixed(1) == Number(point.freq).toFixed(1)) {
            // Calculate the x-coordinates for the white vertical line
            let highlightBandwidthLow = 0.1;
            let highlightBandwidthHigh = 0.1;
            const highlightFreq = Number(dataFrequencyValue);
            if (highlightFreq === minFreq) highlightBandwidthLow = 0.0;
            if (highlightFreq === minFreq) highlightBandwidthHigh = 0.1;
            leftX = xOffset + (highlightFreq - highlightBandwidthLow - minFreq) * xScale; // 0.1 MHz to the left
            rightX = xOffset + (highlightFreq + highlightBandwidthHigh - minFreq) * xScale; // 0.1 MHz to the right
        }
    });

    // Set style for white line
    ctx.fillStyle = 'rgba(224, 224, 240, 0.3)';

    // Draw vertical highlight region
    ctx.fillRect(leftX, 8, rightX - leftX, height - 28); // From top to bottom of graph

    const colorLines = getComputedStyle(document.documentElement).getPropertyValue('--color-5').trim();

    ctx.setLineDash([]);
    if (BORDERLESS_THEME) {
        ctx.strokeStyle = colorLines;
    } else {
        ctx.strokeStyle = '#98989f';
    }
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo((xOffset - 0.5), height - 19.5); // X-axis
    ctx.lineTo(width + 0.5, height - 19.5);
    ctx.moveTo((xOffset - 0.5), 8.5); // Y-axis
    ctx.lineTo((xOffset - 0.5), height - 19.5);
    ctx.stroke();

    // Draw saved graph outline
    if (localStorageItem.enableHold) {
        // Outline style
        ctx.strokeStyle = 'rgb(240, 240, 240)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();

        for (let i = 0; i < savedOutline.length; i++) {
            const point = savedOutline[i];

            const x = Math.round(xOffset + (point.freq - minFreq) * xScale);
            let y = Math.round(canvas.height - (point.sig - minSig) * yScale);

            // Clamp y value if it's below the graph
            if (!ADJUST_SCALE_TO_OUTLINE) y = Math.max(0, Math.min(canvas.height, y));

            if (i === 0) {
                ctx.moveTo(x, y - 20);
            } else {
                ctx.lineTo(x, y - 20);
            }
        }

        if (localStorageItem.enableSmoothing) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 1.5; // Smoothing
        }

        ctx.stroke();

        // Restore to not affect the rest of the graph
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
    }

    graphImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('mousedown', e => (e.button === 1) && e.preventDefault());

    return updateBounds(xScale, minFreq, freqRange, yScale);
}
const updateBounds = initializeCanvasInteractions();

})();
