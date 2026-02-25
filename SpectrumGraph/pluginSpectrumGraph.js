/*
    Spectrum Graph v1.3.0 by AAD
    https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph
*/

'use strict';

(() => {

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const BORDERLESS_THEME = true;                  // Background and text colours match FM-DX Webserver theme
const ENABLE_MOUSE_CLICK_TO_TUNE = true;        // Allow the mouse to tune inside the graph
const ENABLE_MOUSE_SCROLL_WHEEL = true;         // Allow the mouse scroll wheel to tune inside the graph
const DECIMAL_MARKER_ROUND_OFF = true;          // Round frequency markers to the nearest integer
const ADJUST_SCALE_TO_OUTLINE = true;           // Adjust auto baseline to hold/relative or clamp outline
const ALLOW_ABOVE_CANVAS = true;                // Displays a button to display above signal graph if there is room
const CORRECT_TOOLTIP_PEAKS = true;             // Corrects inconsistent signal-peak tooltips caused by FM and 50 kHz scan steps
const LAST_ANTENNA_SCAN_NOTICE_MINUTES = 30;    // Periodically displays a notice if last scan of any antenna is outdated
const BACKGROUND_BLUR_PIXELS = 5;               // Canvas background blur in pixels
const SPECTRUM_COLOR_STYLE = 'DEFAULT';         // 'DEFAULT', 'ACCURATE_4', 'ACCURATE_7', 'BALANCED', 'WARM_TOP', 'SMOOTH'

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const pluginVersion = '1.3.0';
const pluginName = "Spectrum Graph";
const pluginHomepageUrl = "https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph";
const pluginUpdateUrl = "https://raw.githubusercontent.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph/refs/heads/main/SpectrumGraph/pluginSpectrumGraph.js";
const pluginSetupOnlyNotify = false;
const CHECK_FOR_UPDATES = true;

// const advanced settings variables
const ANTENNA_SCAN_NOTICE_TIMEOUT_SECONDS = 10;                             // Outdated antenna notify display timeout
const ANTENNA_SCAN_NOTICE_INTERVAL_SECONDS = 180;                           // Outdated antenna notify display interval
const MARKER_TOLERANCE_PX = 3;                                              // Mouse position tolerance in pixels of marker selection
const CAL90000 = 0.0, CAL95500 = 0.0, CAL100500 = 0.0, CAL105500 = 0.0;     // Signal calibration (requires external hardware to set signal strength)
const SCAN_COVERAGE_OPACITY = 0.2;                                          // Scanner plugin 'defaultScannerMode' opacity value
const DEFAULT_LANGUAGE = 'en';                                              // Default language (browser language setting overrides)

// Language translations
const translations = {
  en: {
    __name: 'English (UK)',
    spectrumGraph: `Spectrum Graph`,
    newVersion: `There is a new version of Spectrum Graph available`,
    spectrumScanIncomplete: `Spectrum scan appears incomplete. Perform a manual scan if needed.`,
    spectrumScanInvalid: `Spectrum scan appears invalid. Perform a manual scan if needed.`,
    spectrumScanLocked:  `Scanning is currently locked by the administrator`,
    errorDuringInitialisation: `[${pluginName}] Error initialising graph. The server may need to be restarted.`,
    holdPeaks: `Hold Peaks`,
    smoothGraphEdges: `Smooth Graph Edges`,
    relativeFixedScale: `Relative/Fixed Scale`,
    autoBaseline: `Auto Baseline`,
    performManualScan: `Perform Manual Scan`,
    moveAboveSignalGraph: `Move Above Signal Graph`,
    resolutionTooLowToDisplay: `Resolution too low to display`,
    scanOlderThanXMinutes: `Scan older than {hours}h {minutes}m for {antennas}`,
    noSignal: `[${pluginName}] Error receiving signal data`,
    scanning: `Scanning`,
  },
  en_us: {
    __name: 'English (US)',
    spectrumGraph: `Spectrum Graph`,
    newVersion: `There is a new version of Spectrum Graph available`,
    spectrumScanIncomplete: `Spectrum scan appears incomplete. Run a manual scan if needed.`,
    spectrumScanInvalid: `Spectrum scan appears invalid. Run a manual scan if needed.`,
    spectrumScanLocked:  `Scanning is currently locked by the administrator`,
    errorDuringInitialisation: `[${pluginName}] Error initializing graph. The server may need to be restarted.`,
    holdPeaks: `Hold Peaks`,
    smoothGraphEdges: `Smooth Graph Edges`,
    relativeFixedScale: `Relative/Fixed Scale`,
    autoBaseline: `Auto Baseline`,
    performManualScan: `Run Manual Scan`,
    moveAboveSignalGraph: `Move Above Signal Graph`,
    resolutionTooLowToDisplay: `Resolution too low to display`,
    scanOlderThanXMinutes: `Scan older than {hours}h {minutes}m for {antennas}`,
    noSignal: `[${pluginName}] Error receiving signal data`,
    scanning: `Scanning`,
  },
  es: {
    __name: 'Español',
    spectrumGraph: `Gráfico de espectro`,
    newVersion: `Hay una nueva versión de Spectrum Graph disponible`,
    spectrumScanIncomplete: `El escaneo de espectro parece incompleto. Realice un escaneo manual si es necesario.`,
    spectrumScanInvalid: `El escaneo de espectro parece inválido. Realice un escaneo manual si es necesario.`,
    spectrumScanLocked: `El escaneo está actualmente bloqueado por el administrador`,
    errorDuringInitialisation: `[${pluginName}] Error durante la inicialización del gráfico. Es posible que sea necesario reiniciar el servidor.`,
    holdPeaks: `Mantener Picos`,
    smoothGraphEdges: `Suavizar los Bordes del Gráfico`,
    relativeFixedScale: `Escala Relativa/Fija`,
    autoBaseline: `Línea Base Automática`,
    performManualScan: `Realizar Escaneo Manual`,
    moveAboveSignalGraph: `Mover por Encima del Gráfico de Señales`,
    resolutionTooLowToDisplay: `Resolución demasiado baja para mostrar`,
    scanOlderThanXMinutes: `El escaneo es más antiguo que {hours}h {minutes}m para {antennas}`,
    noSignal: `[${pluginName}] Error al recibir datos de señal`,
    scanning: `Escaneando`,
  },
  fr: {
    __name: 'Français',
    spectrumGraph: `Graphique du spectre`,
    newVersion: `Une nouvelle version de Spectrum Graph est disponible`,
    spectrumScanIncomplete: `L'analyse du spectre semble incomplète. Effectuez un nouveau scan manuel si nécessaire.`,
    spectrumScanInvalid: `L'analyse du spectre semble invalide. Effectuez un scan manuel si nécessaire.`,
    spectrumScanLocked: `Le balayage est actuellement verrouillé par l'administrateur`,
    errorDuringInitialisation: `[${pluginName}] Erreur lors de l'initialisation du graphique. Le serveur pourrait avoir besoin d'être redémarré.`,
    holdPeaks: `Maintenir les Pics`,
    smoothGraphEdges: `Lisser les Bords du Graphique`,
    relativeFixedScale: `Échelle Relative/Fixe`,
    autoBaseline: `Base Automatique`,
    performManualScan: `Effectuer un Scan Manuel`,
    moveAboveSignalGraph: `Déplacer au-dessus du Graphique du Signal`,
    resolutionTooLowToDisplay: `Résolution trop basse pour afficher`,
    scanOlderThanXMinutes: `Le scan est plus ancien que {hours}h {minutes}m pour {antennas}`,
    noSignal: `[${pluginName}] Erreur lors de la réception des données du signal`,
    scanning: `Numérisation`,
  },
  de: {
    __name: 'Deutsch',
    spectrumGraph: `Spektrumanalyse`,
    newVersion: `Eine neue Version von Spectrum Graph ist verfügbar`,
    spectrumScanIncomplete: `Spektrums-Scan scheint unvollständig. Führen Sie bei Bedarf einen manuellen Scan durch.`,
    spectrumScanInvalid: `Spektrums-Scan scheint ungültig. Führen Sie bei Bedarf einen manuellen Scan durch.`,
    spectrumScanLocked: `Das Scannen ist derzeit vom Administrator gesperrt`,
    errorDuringInitialisation: `[${pluginName}] Fehler bei der Initialisierung des Diagramms. Der Server muss möglicherweise neu gestartet werden.`,
    holdPeaks: `Spitzen Halten`,
    smoothGraphEdges: `Diagramm-Kanten Glätten`,
    relativeFixedScale: `Relative/Feste Skala`,
    autoBaseline: `Automatische Basislinie`,
    performManualScan: `Manuellen Scan Durchführen`,
    moveAboveSignalGraph: `Über dem Signal-Diagramm Verschieben`,
    resolutionTooLowToDisplay: `Auflösung zu niedrig zum Anzeigen`,
    scanOlderThanXMinutes: `Scan ist älter als {hours}h {minutes}min für {antennas}`,
    noSignal: `[${pluginName}] Fehler beim Empfangen der Signaldaten`,
    scanning: `Scannen`,
  },
  nl: {
    __name: 'Nederlands',
    spectrumGraph: `Spectrumschaart`,
    newVersion: `Er is een nieuwe versie van Spectrum Graph beschikbaar`,
    spectrumScanIncomplete: `Spectrumscan lijkt onvolledig. Voer indien nodig een handmatige scan uit.`,
    spectrumScanInvalid: `Spectrumscan lijkt ongeldig. Voer indien nodig een handmatige scan uit.`,
    spectrumScanLocked: `Scannen is momenteel vergrendeld door de beheerder`,
    errorDuringInitialisation: `[${pluginName}] Fout tijdens grafiekinitialisatie. De server moet mogelijk opnieuw worden gestart.`,
    holdPeaks: `Pieken vasthouden`,
    smoothGraphEdges: `Grafiekranden gladmaken`,
    relativeFixedScale: `Relatieve/Vaste schaal`,
    autoBaseline: `Automatische basislijn`,
    performManualScan: `Handmatige scan uitvoeren`,
    moveAboveSignalGraph: `Verplaats boven signaalgrafiek`,
    resolutionTooLowToDisplay: `Resolutie te laag om weer te geven`,
    scanOlderThanXMinutes: `Scan is ouder dan {hours}u {minutes}m voor {antennas}`,
    noSignal: `[${pluginName}] Fout bij het ontvangen van signaalgegevens`,
    scanning: `Scannen`,
  },
  ru: {
    __name: 'Русский',
    spectrumGraph: `График спектра`,
    newVersion: `Доступна новая версия Spectrum Graph`,
    spectrumScanIncomplete: `Спектральное сканирование кажется неполным. Выполните ручное сканирование, если необходимо.`,
    spectrumScanInvalid: `Спектральное сканирование кажется недействительным. Выполните ручное сканирование, если необходимо.`,
    spectrumScanLocked: `Сканирование в данный момент заблокировано администратором`,
    errorDuringInitialisation: `[${pluginName}] Ошибка при инициализации графика. Возможно, потребуется перезапустить сервер.`,
    holdPeaks: `Удерживать пики`,
    smoothGraphEdges: `Сгладить края графика`,
    relativeFixedScale: `Относительная/фиксированная шкала`,
    autoBaseline: `Автоматическая базовая линия`,
    performManualScan: `Выполнить ручное сканирование`,
    moveAboveSignalGraph: `Переместить над графиком сигнала`,
    resolutionTooLowToDisplay: `Разрешение слишком низкое для отображения`,
    scanOlderThanXMinutes: `Сканирование старше {hours}ч {minutes}мин для {antennas}`,
    noSignal: `[${pluginName}] Ошибка при получении данных сигнала`,
    scanning: `Сканирование`,
  },
  pl: {
    __name: 'Polski',
    spectrumGraph: `Wykres widma`,
    newVersion: `Dostępna jest nowa wersja Spectrum Graph`,
    spectrumScanIncomplete: `Skanowanie widma wydaje się niekompletne. W razie potrzeby przeprowadź ręczne skanowanie.`,
    spectrumScanInvalid: `Skanowanie widma wydaje się nieprawidłowe. W razie potrzeby przeprowadź ręczne skanowanie.`,
    spectrumScanLocked: `Skanowanie jest obecnie zablokowane przez administratora`,
    errorDuringInitialisation: `[${pluginName}] Błąd podczas inicjalizacji wykresu. Serwer może wymagać ponownego uruchomienia.`,
    holdPeaks: `Zatrzymaj szczyty`,
    smoothGraphEdges: `Wygładź krawędzie wykresu`,
    relativeFixedScale: `Skala względna/stała`,
    autoBaseline: `Automatyczna linia bazowa`,
    performManualScan: `Przeprowadź ręczne skanowanie`,
    moveAboveSignalGraph: `Przenieś nad wykres sygnału`,
    resolutionTooLowToDisplay: `Rozdzielczość zbyt niska do wyświetlenia`,
    scanOlderThanXMinutes: `Skanowanie jest starsze niż {hours}g {minutes}min dla {antennas}`,
    noSignal: `[${pluginName}] Błąd podczas odbierania danych sygnału`,
    scanning: `Skanowanie`,
  },
  cs: {
    __name: 'Čeština',
    spectrumGraph: `Spektrální graf`,
    newVersion: `Je k dispozici nová verze Spectrum Graph`,
    spectrumScanIncomplete: `Skenování spektra se zdá být neúplné. Proveďte ruční skenování, pokud je to nutné.`,
    spectrumScanInvalid: `Skenování spektra se zdá být neplatné. Proveďte ruční skenování, pokud je to nutné.`,
    spectrumScanLocked: `Skenování je momentálně uzamčeno administrátorem`,
    errorDuringInitialisation: `[${pluginName}] Chyba při inicializaci grafu. Server může být nutné restartovat.`,
    holdPeaks: `Udržet vrcholy`,
    smoothGraphEdges: `Hladit okraje grafu`,
    relativeFixedScale: `Relativní/Fixní měřítko`,
    autoBaseline: `Automatická základní čára`,
    performManualScan: `Provést ruční skenování`,
    moveAboveSignalGraph: `Přesunout nad graf signálu`,
    resolutionTooLowToDisplay: `Příliš nízké rozlišení pro zobrazení`,
    scanOlderThanXMinutes: `Skenování je starší než {hours}h {minutes}min pro {antennas}`,
    noSignal: `[${pluginName}] Chyba při přijímání dat signálu`,
    scanning: `Skenování`,
  },
  hu: {
    __name: 'Magyar',
    spectrumGraph: `Spektrum grafikon`,
    newVersion: `A Spectrum Graph új verziója elérhető`,
    spectrumScanIncomplete: `A spektrum szkennelés hiányosnak tűnik. Végezz manuális újraellenőrzést, ha szükséges.`,
    spectrumScanInvalid: `A spektrum szkennelés érvénytelennek tűnik. Végezz manuális újraellenőrzést, ha szükséges.`,
    spectrumScanLocked: `A szkennelés jelenleg az adminisztrátor által zárolt`,
    errorDuringInitialisation: `[${pluginName}] Hiba a grafikon inicializálásakor. Lehet, hogy újra kell indítani a szervert.`,
    holdPeaks: `Csúcsok kiemelése`,
    smoothGraphEdges: `Grafikon élek simítása`,
    relativeFixedScale: `Relatív/Fix skála`,
    autoBaseline: `Automatikus alapvonal`,
    performManualScan: `Kézi szkennelés`,
    moveAboveSignalGraph: `Mozgatás a jelgrafikon fölé`,
    resolutionTooLowToDisplay: `A felbontás túl alacsony a megjelenítéshez`,
    scanOlderThanXMinutes: `A szkennelés régebbi, mint {hours}ó {minutes}p a {antennas}`,
    noSignal: `[${pluginName}] Hiba a jeladatok fogadása közben`,
    scanning: `Szkennelés`,
  }
};

// const variables
const debug = false;
const dataFrequencyElement = document.getElementById('data-frequency');
const drawGraphDelay = 10;
const resizeEdge = 20;
const canvasWidthOffset = 2;
const canvasHeightOffset = 2;
const windowHeight = document.querySelector('.dashboard-panel-plugin-list') ? 720 : 860;
const topValue = BORDERLESS_THEME ? '12px' : '14px';
const lastUpdates = []; // Last update timestamp for 'insertUpdateText' notice
const markedFreqs = new Set();

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
let resizeTimerAboveCanvas;
let resizeTimerAboveCanvasLength = 80;
let quickLaunchValue = 1000;
let dataFrequencyValue;
let graphImageData; // Used to store graph image
let isDecimalMarkerRoundOff = DECIMAL_MARKER_ROUND_OFF;
let isGraphOpen = false;
let isFirstMessage = true;
let isScanComplete = true;
let isScanInitiated = false;
let isPluginInitialized = false;    // Track initialisation status
let isWebSocketReady = false;       // Track connection status
let isInitialDataLoaded = false;    // Track data load status
let isPendingOpen = false;          // Track early button click status
let isAlreadyLaunched = false;
let isLaunchedEarly = false;
let isSpectrumOn = false;
let graphError = false;
let dataError = false;
let currentAntenna = 0;
let canvasFullWidthOffset = 0;
let prevCanvasHeight = canvasFullHeight;
let xOffset = 30;
let outlinePoints = []; // Outline data for localStorage
let outlinePointsSavePermission = false;
let fmButton = null;
let customRanges = [];
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
let buttonTimeoutLocally;
let removeUpdateTextTimeout;
let updateText;
let wsSendSocket;
let antennaScanInterval;
let pendingMessage1;
let pendingMessage2;
let signalMeterDelay = 0;
let cachedAntennaNames = null;
let antennaNamesPromise = null;
let cachedLastUpdates = [null, null, null, null];
let cachedServerTime = 0;
let isUpdating = false;
let scanStatus = "waiting";
let currentLanguage = DEFAULT_LANGUAGE || 'en';
let tuningEnabled = true;           // Affects all clients
let tuningEnabledLocally = true;    // Affects local client

// For outdated antenna scan notice
let isLastUpdateOutdated = false;
let isUsingAntennaSwitch = false;
let outdatedAntennaList = '';

// let variables for right-click
let minFreqForMarkers = null;
let xScaleForMarkers = null;
let lastRemovedFreq = null;

// let variables (Scanner plugin code by Highpoint2000)
let ScannerIsScanning = false;
let ScannerMode = '';
let ScannerModeTemp = '';
let ScannerSensitivity = 0;
let ScannerSpectrumLimiterValue = 0; 
let ScannerLimiterOpacity = SCAN_COVERAGE_OPACITY;

// localStorage variables
//localStorageItem.enableHold located in getCurrentAntenna()
//localStorageItem.highlightedFreqs located in displayHighlightedFreqs()
//localStorageItem.currentLanguage located in getCurrentLanguage()
localStorageItem.enableSmoothing = localStorage.getItem('enableSpectrumGraphSmoothing') === 'true';                 // Smooths the graph edges
localStorageItem.fixedVerticalGraph = localStorage.getItem('enableSpectrumGraphFixedVerticalGraph') === 'true';     // Fixed/dynamic vertical graph based on peak signal
localStorageItem.isAutoBaseline = localStorage.getItem('enableSpectrumGraphAutoBaseline') === 'true';               // Auto baseline
localStorageItem.isAboveSignalCanvas = localStorage.getItem('enableSpectrumGraphAboveSignalCanvas') === 'true';     // Move above signal graph canvas
localStorageItem.disableNoiseFloorLabel = localStorage.getItem('enableSpectrumHideNoiseFloorLabel') === 'true';     // Display noise floor signal label

/* ==================================================
                    ERROR HANDLING
   ================================================== */
function getCallerLine() {
  const error = new Error();
  const stack = error.stack.split("\n");

  const callerLine = stack[2].trim();

  const match = callerLine.match(/(?:\/|\\)([^\/\\]+):(\d+):(\d+)/);

  if (match) {
    const filename = match[1];  // Filename only
    const line = match[2];      // Line number
    const column = match[3];    // Column number
    return `[${filename}:${line}:${column}]`;  // Filename with line:column
  }

  return "unknown";  // Fallback
}

function logInfo(...msg) {
  console.log(`[${pluginName}]`, ...msg);
}

function logWarn(...msg) {
  console.warn(
    `[${pluginName}] ${msg.join(' ')} %c${getCallerLine()}`, 
    'color: #A3C9F6;'
  );
}

function logError(...msg) {
  console.error(
    `[${pluginName}] ${msg.join(' ')} %c${getCallerLine()}`, 
    'color: #A3C9F6;'
  );
}

/* ==================================================
                    LANGUAGE HANDLING
   ================================================== */
if (localStorage.getItem('enableSpectrumCurrentLanguage')) {
  currentLanguage = localStorage.getItem('enableSpectrumCurrentLanguage');
} else {
  const browserLanguage = navigator.language || navigator.userLanguage;
  const languageCode = browserLanguage.split('-')[0];
  const fullLanguageCode = browserLanguage.toLowerCase();

  if (translations[fullLanguageCode]) {
    currentLanguage = fullLanguageCode;
  } else if (translations[languageCode]) {
    currentLanguage = languageCode;
  } else {
    currentLanguage = 'en'; // Fallback
  }
}

function getCurrentLanguage() {
    localStorageItem.currentLanguage = `enableSpectrumCurrentLanguage`;

    // Check if language is saved in localStorage
    const saved = localStorage.getItem(localStorageItem.currentLanguage);

    if (saved) {
        currentLanguage = saved;
    } else {
        // Get browser language
        const browserLanguage = navigator.language || navigator.userLanguage;
        const languageCode = browserLanguage.split('-')[0].replace('-', '_');
        const fullLanguageCode = browserLanguage.toLowerCase().replace('-', '_'); // Convert '-' to '_' for 'translations' variable

        if (translations[fullLanguageCode]) {
          currentLanguage = fullLanguageCode;
        } else if (translations[languageCode]) {
          currentLanguage = languageCode;
        } else {
          currentLanguage = 'en';  // Fallback
        }
    }
}

function getTranslatedText(key) {
  getCurrentLanguage();

  if (translations[currentLanguage] && translations[currentLanguage][key]) {
    return translations[currentLanguage][key];
  } else {
    return translations['en'][key];
  }
}

/* ==================================================
                    LANGUAGE MENU
   ================================================== */
function createLanguageContextMenu(x, y) {
    getCurrentLanguage();

    // Hide tooltips
    function hideTooltip(delay) {
        setTimeout(() => {
            const tooltipWrapper = document.querySelector('.tooltip-wrapper');
            if (tooltipWrapper) {
                tooltipWrapper.style.transition = 'opacity 0.2s';
                tooltipWrapper.style.opacity = 0;

                setTimeout(() => {
                    tooltipWrapper.style.display = 'none';
                }, 200);
            }
        }, delay);
    }

    [0, 200, 400].forEach(hideTooltip);

    $('.language-context-menu').remove();

    const menu = $('<div class="language-context-menu bg-color-4"></div>');

    Object.entries(translations).forEach(([lang, data]) => {
        const label = data.__name || lang;

        menu.append(`
            <div data-lang="${lang}">
                ${label}
            </div>
        `);
    });

    menu.hide();
    $('body').append(menu);
    menu.fadeIn(200);

    // Clamp to viewport
    const menuWidth = 120;
    const menuHeight = 200;
    x = Math.min(x, window.innerWidth - menuWidth);
    y = Math.min(y, window.innerHeight - menuHeight);

    menu.css({
        position: 'fixed',
        top: y,
        left: x,
        background: 'var(--color-1)',
        border: '1px solid var(--color-2)',
        borderRadius: '6px',
        padding: '4px 0',
        zIndex: 10,
        color: 'var(--color-5)',
        fontSize: '13px',
        minWidth: `${menuWidth}px`,
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)'
    });

    menu.find('div').each(function () {
        const lang = $(this).data('lang');

        $(this).css({
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none'
        });

        // Active language
        if (lang === currentLanguage) {
            $(this)
                .addClass('active-language')
                .append('<span>\u2713</span>');
        }
    }).hover(
        function () { $(this).addClass('bg-color-2'); },
        function () { $(this).removeClass('bg-color-2'); }
    );

    // Selection
    menu.on('mouseup', 'div', function (e) {
        if (e.which !== 1) return;

        currentLanguage = $(this).data('lang');
        localStorage.setItem(localStorageItem.currentLanguage, currentLanguage);

        logInfo('Language changed to:', currentLanguage);
        closeMenu();

        // Redraw
        if (isSpectrumOn) displaySdrGraph(false);

        const SpectrumButton = $('#spectrum-graph-button');
        // Update HTML attribute and jQuery cache
        SpectrumButton.attr('data-tooltip', getTranslatedText('spectrumGraph'));
        SpectrumButton.data('tooltip', getTranslatedText('spectrumGraph'));
    });

    function closeMenu() {
        menu.animate({ opacity: 0 }, 200, () => {
            menu.remove();
        });
        $(document).off('keydown.languageMenu');
    }

    // Close on outside click
    setTimeout(() => {
        $(document).one('click', closeMenu);
    }, 0);

    // Close on Esc
    $(document).on('keydown.languageMenu', function (e) {
        if (e.key === 'Escape') {
            closeMenu();
        }
    });
}

/* ==================================================
                    SETUP PLUGIN BUTTON
   ================================================== */

// Function to handle early button click
function setupEarlyClickHandler(buttonId) {
    const buttonObserver = new MutationObserver(() => {
        const pluginButton = document.getElementById(buttonId);
        if (pluginButton) {
            buttonObserver.disconnect();

            // Add click handler that queues the open request
            const earlyClickHandler = function(e) {
                if (!isPluginInitialized) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!isPendingOpen) {
                        isPendingOpen = true;
                        logInfo(`Button click while initialising, queuing open request...`);

                        // Replace icon with spinning icon
                        const iconElement = pluginButton.querySelector('i');
                        if (iconElement) {
                            // Store original icon
                            pluginButton._originalIconClasses = iconElement.className;

                            // Spinning icon
                            iconElement.className = 'fa-solid fa-spinner fa-spin';
                        }

                        // Highlight button
                        if (!localStorageItem.isAboveSignalCanvas) {
                            const highlightStyle = document.createElement('style');
                            highlightStyle.id = 'spectrum-graph-pending-highlight';
                            highlightStyle.textContent = `
                                #spectrum-graph-button {
                                    background-color: var(--color-2) !important;
                                    filter: brightness(120%);
                                }
                            `;
                            document.head.appendChild(highlightStyle);
                        }
                    }
                }
            };

            pluginButton.addEventListener('click', earlyClickHandler, true);

            // Store reference to remove later
            pluginButton._earlyClickHandler = earlyClickHandler;
        }
    });

    buttonObserver.observe(document.body, { childList: true, subtree: true });
}

// Function to check if plugin is fully initialised
function checkPluginInitialization(buttonId) {
    const maxWaitTime = 60000; // Maximum wait time
    const checkInterval = 100; // Check interval
    let elapsedTime = 0;

    const initCheckInterval = setInterval(() => {
        elapsedTime += checkInterval;

        // Check if both WebSocket and initial data are ready
        if (isWebSocketReady && isInitialDataLoaded) {
            clearInterval(initCheckInterval);
            isPluginInitialized = true;
            logInfo(`Plugin initialised.`);
            enableButtonInteractions(buttonId);

            // Open graph if clicked while waiting
            if (isPendingOpen) {
                isPendingOpen = false;
                isAlreadyLaunched = true;
                logInfo(`Opening graph from queued click.`);

                // Restore original icon
                const pluginButton = document.getElementById(buttonId);
                if (pluginButton) {
                    const iconElement = pluginButton.querySelector('i');
                    if (iconElement && pluginButton._originalIconClasses) {
                        iconElement.className = pluginButton._originalIconClasses;
                        delete pluginButton._originalIconClasses;
                    }

                    // Restore original tooltip
                    if (pluginButton._originalTooltip !== undefined) {
                        if (pluginButton._originalTooltip) {
                            pluginButton.setAttribute('data-tooltip', pluginButton._originalTooltip);
                        } else {
                            pluginButton.removeAttribute('data-tooltip');
                        }
                        delete pluginButton._originalTooltip;
                    }
                }

                // Remove highlight style then open
                setTimeout(() => {
                    const highlightStyle = document.getElementById('spectrum-graph-pending-highlight');
                    if (highlightStyle) {
                        highlightStyle.remove();
                    }
                }, 1200);

                setTimeout(() => {
                    if (!isGraphOpen) toggleSpectrum();
                    isLaunchedEarly = true;
                    setTimeout(() => {
                        isLaunchedEarly = false;
                    }, 500);
                }, 800);
            }
        } else if (elapsedTime >= maxWaitTime) {
            // Timeout, enable anyway
            clearInterval(initCheckInterval);
            isPluginInitialized = true;
            logInfo(`Plugin initialisation timeout, enabling button anyway. WebSocket: ${isWebSocketReady}, Data: ${isInitialDataLoaded}`);
            enableButtonInteractions(buttonId);

            // Open graph if clicked while waiting
            if (isPendingOpen) {
                isPendingOpen = false;
                logInfo(`Opening graph from queued click after timeout.`);

                // Restore original icon
                const pluginButton = document.getElementById(buttonId);
                if (pluginButton) {
                    const iconElement = pluginButton.querySelector('i');
                    if (iconElement && pluginButton._originalIconClasses) {
                        iconElement.className = pluginButton._originalIconClasses;
                        delete pluginButton._originalIconClasses;
                    }

                    // Restore original tooltip
                    if (pluginButton._originalTooltip !== undefined) {
                        if (pluginButton._originalTooltip) {
                            pluginButton.setAttribute('data-tooltip', pluginButton._originalTooltip);
                        } else {
                            pluginButton.removeAttribute('data-tooltip');
                        }
                        delete pluginButton._originalTooltip;
                    }
                }

                // Remove highlight style then open
                setTimeout(() => {
                    const highlightStyle = document.getElementById('spectrum-graph-pending-highlight');
                    if (highlightStyle) {
                        highlightStyle.remove();
                    }
                }, 1200);

                setTimeout(() => {
                    if (!isGraphOpen) toggleSpectrum();
                    isLaunchedEarly = true;
                    setTimeout(() => {
                        isLaunchedEarly = false;
                    }, 500);
                }, 800);
            }
        }
    }, checkInterval);
}

// Function to enable button after plugin initialisation
function enableButtonInteractions(buttonId) {
    const quickLaunchDelay = Date.now();
    const pluginButtonOnLaunch = document.getElementById('spectrum-graph-button');

    if (!pluginButtonOnLaunch) {
        logError(`Button not found when trying to enable.`);
        return;
    }

    // Remove early click handler if it exists
    if (pluginButtonOnLaunch._earlyClickHandler) {
        pluginButtonOnLaunch.removeEventListener('click', pluginButtonOnLaunch._earlyClickHandler, true);
        delete pluginButtonOnLaunch._earlyClickHandler;
    }

    function handleClickOnLaunch() {
        if (isAlreadyLaunched || isLaunchedEarly) return;
        logInfo(`Quick launch.`);
        if (!localStorageItem.isAboveSignalCanvas) {
            document.head.appendChild(Object.assign(document.createElement('style'), {
              textContent: `
                #spectrum-graph-button {
                    background-color: var(--color-2) !important;
                    filter: brightness(120%);
                }
              `
            }));
        }
        setTimeout(() => {
            if (!isGraphOpen && !localStorageItem.isAboveSignalCanvas) toggleSpectrum();
            if (!localStorageItem.isAboveSignalCanvas) {
                setTimeout(() => {
                    document.head.appendChild(Object.assign(document.createElement('style'), {
                      textContent: `
                        #spectrum-graph-button {
                            background-color: initial !important;
                            filter: inherit;
                        }
                      `
                    }));
                }, 80);
            }
        }, quickLaunchValue - (Date.now() - quickLaunchDelay));
    }

    pluginButtonOnLaunch.addEventListener('click', handleClickOnLaunch, { once: true });
    setTimeout(() => {
        pluginButtonOnLaunch.removeEventListener('click', handleClickOnLaunch);
    }, quickLaunchValue);

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
            }, quickLaunchValue);
            buttonObserver.disconnect(); // Stop observing once button is found
            // Additional code
            const pluginButton = document.getElementById(`${buttonId}`);
            if (pluginButton && window.innerWidth < 480 && window.innerHeight > window.innerWidth) {
                pluginButton.setAttribute('data-tooltip', getTranslatedText('resolutionTooLowToDisplay'));
            }
        }
    });

    buttonObserver.observe(document.body, { childList: true, subtree: true });
}

// Create Spectrum Graph button
function createButton(buttonId) {
    return new Promise((resolve, reject) => {
        // Remove any existing button
        const existingButton = document.getElementById(buttonId);
        if (existingButton) existingButton.remove();

        const maxWaitTime = 90000;
        let functionFound = false;

        const observer = new MutationObserver((mutationsList, observer) => {
            if (typeof addIconToPluginPanel === 'function') {
                observer.disconnect();

                // Create the button
                addIconToPluginPanel(buttonId, "Spectrum", "solid", "chart-area", getTranslatedText('spectrumGraph'));
                functionFound = true;

                // Add right-click listener
                $(document).on('contextmenu', `#${buttonId}`, function (e) {
                    e.preventDefault();
                    createLanguageContextMenu(e.clientX, e.clientY);
                });

                getCurrentLanguage();

                // Setup early click handler to queue clicks during initialisation
                setupEarlyClickHandler(buttonId);

                // Wait for plugin initialisation before enabling button
                checkPluginInitialization(buttonId);

                // Additional code
                requestAnimationFrame(() => {
                    displaySignalCanvas();
                });

                // Resolve the promise when button is created and listeners are added
                resolve(document.getElementById(buttonId));
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Timeout if it takes too long
        setTimeout(() => {
            observer.disconnect();
            if (!functionFound) {
                logError(`Function addIconToPluginPanel not found after ${maxWaitTime / 1000} seconds.`);
                reject('addIconToPluginPanel not found');
            }
        }, maxWaitTime);

        // Inject the hover CSS
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
    });
}

if (document.querySelector('.dashboard-panel-plugin-list')) {
    createButton('spectrum-graph-button');

    document.head.appendChild(Object.assign(document.createElement('style'), {
      textContent: `
        #spectrum-graph-button.active {
            background-color: var(--color-2) !important;
            filter: brightness(120%);
        }
      `
    }));
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
            if (window.location.pathname !== '/setup') buttonWrapper = createDefaultButtonWrapper();
        }

        if (window.location.pathname !== '/setup' && buttonWrapper.length) {
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
            logError(`Standard button location not found. Unable to add button.`);
            return null;
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        let countdownTime = 800;
        let countdownTimer;
        let isClickRegistered = false;
        let isButtonDisabled = false;

        setTimeout(function() {
            initializeSpectrumButton();

            countdownTimer = setInterval(function() {
                countdownTime -= 100;
                if (countdownTime <= 0) {
                    clearInterval(countdownTimer);
                }
            }, 100);
        }, 200);

        aSpectrumButton.on('click', function() {
            if (isButtonDisabled) {
                return;
            }

            if (!isClickRegistered && countdownTime > 0) {
                isClickRegistered = true;

                isButtonDisabled = true;
                setTimeout(function() {
                    isButtonDisabled = false;
                }, 800);

                setTimeout(function() {
                    toggleSpectrum();
                }, countdownTime);
            } else if (countdownTime <= 0) {
                toggleSpectrum();
            }
        });
    });
}

/* ==================================================
                    SETUP CANVAS
   ================================================== */
function getCurrentDimensions() {
    const signalCanvasDimensions = document.querySelector('.canvas-container');
    if (signalCanvasDimensions) {
        canvasFullWidth = signalCanvasDimensions.offsetWidth || 1160;
        canvasFullHeight = signalCanvasDimensions.offsetHeight || 140;
        canvasHeightSmall = BORDERLESS_THEME ? canvasFullHeight - canvasHeightOffset: canvasFullHeight - canvasHeightOffset;
        canvasHeightLarge = BORDERLESS_THEME ? canvasFullHeight - canvasHeightOffset: canvasFullHeight - canvasHeightOffset;
    }

    prevCanvasHeight = canvasFullHeight;

    clearTimeout(resizeTimerAboveCanvas);
    resizeTimerAboveCanvas = setTimeout(() => {
        if (ALLOW_ABOVE_CANVAS) isDrawAboveCanvas();
    }, resizeTimerAboveCanvasLength);
}

// Function to draw above canvas
function isDrawAboveCanvas() {
    resizeTimerAboveCanvasLength = 800;
    resizeTimerAboveCanvas = setTimeout(() => {
        resizeTimerAboveCanvasLength = 80;
    }, 800);

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
    const targetNode = document.querySelector('.wrapper-outer .canvas-container canvas') || document.querySelector('#wrapper-outer #wrapper .canvas-container');

    // Check if targetNode exists
    if (!targetNode) {
        logWarn('Canvas element not found!'); // Likely an unrecognised FM-DX Webserver version
        return;
    }

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
    if (window.location.pathname !== '/setup') observer.observe(targetNode, config);
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

/* ==================================================
                    WEBSOCKET
   ================================================== */

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
                logInfo(`Connected WebSocket`);
                isWebSocketReady = true; // WebSocket ready

                wsSendSocket.onmessage = function(event) {
                    // Parse incoming JSON data
                    const data = JSON.parse(event.data);
                    const buttonQuery = document.querySelector('#spectrum-scan-button');
                    if (buttonQuery && data.hasOwnProperty('isScanning')) {
                        tuningEnabled = true; // Enable mouse tuning
                        isScanInitiated = false;
                        buttonQuery.style.cursor = 'pointer';
                        buttonQuery.classList.remove('is-grayscale');
                        buttonQuery.disabled = false;

                        const btnQuery = document.querySelectorAll('.spectrum-band-button');
                        if (btnQuery) {
                            btnQuery.forEach(button => {
                                button.style.cursor = 'pointer';
                                button.classList.remove('is-grayscale');
                                button.disabled = false;
                            });
                        }

                        clearTimeout(buttonTimeout);
                    }

                    if (data.type === 'spectrum-graph-scan-success') {
                        const buttonQuery = document.querySelector('#spectrum-scan-button');

                        // Disable mouse tuning 'tuningEnabled' located in 'insertUpdateText' to not affect admins while server is locked

                        isUpdating = true;

                        if (!graphError && isGraphOpen && data.hasOwnProperty('scanSuccess') && data.scanSuccess) {
                            isScanInitiated = true;
                            insertUpdateText(
                                `<div style="text-align:center"><i class="fa-solid fa-arrows-rotate fa-spin" style="margin-top: 5px; font-size: 16px;"></i><br>` + getTranslatedText('scanning') + `...</div>`,
                                5,
                                false,
                                true,
                                ScannerIsScanning ? 56 : 0,
                                true,
                                true
                            );
                        }

                        logInfo(`Command sent`);
                    }

                    // Handle 'sigArray' data
                    if (data.type === 'sigArray') {
                        isUpdating = false;
                        if (!graphError && isGraphOpen) insertUpdateText(false, 5, true);
                        logInfo(`Received sigArray.`);
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
                            }

                            if (CAL90000 || CAL95500 || CAL100500 || CAL105500) logInfo(`Calibrated sigArray.`);
                        }
                        if (debug) {
                            if (Array.isArray(data.value)) {
                                // Process sigArray
                                data.value.forEach(item => {
                                    console.log(`freq: ${item.freq}, sig: ${item.sig}`);
                                });
                            } else {
                                logError(`Expected array for sigArray, but received:`, data.value);
                            }
                        }

                        // Wait for initializeGraph before drawing
                        initializeGraph(undefined, true).then(() => {
                            if (isGraphOpen) setTimeout(drawGraph, drawGraphDelay);
                        });
                    }

                    // Scanner plugin code by Highpoint2000
                    if (data.type === 'Scanner') {
                        const eventData = JSON.parse(event.data);

                        if (eventData === '') {
                            const initialMessage = createMessage('request');
                            if (wsSendSocket && wsSendSocket.readyState === WebSocket.OPEN) {
                                wsSendSocket.send(JSON.stringify(initialMessage));
                            }
                        }

                        if (eventData.value.Scan !== undefined && eventData.value.Scan !== null && eventData.value.Scan !== '') {
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
                isWebSocketReady = false; // WebSocket not ready
                setTimeout(function() {
                    logInfo(`WebSocket closed:`, event);
                }, 400);
                setTimeout(setupSendSocket, 5000); // Reconnect after 5 seconds
            };
        } catch (error) {
            logError(`Failed to setup Send WebSocket:`, error);
            setTimeout(setupSendSocket, 5000); // Retry after 5 seconds
        }
    }
}

// WebSocket and scanner button initialisation
(function() {
    if (window.socket) setupSendSocket();
    else if (window.socketPromise) window.socketPromise.then(setupSendSocket);
})();

// Function for update notification in /setup
function checkUpdate(e,t,n,o,i){if(e&&"/setup"!==location.pathname)return;async function r(){try{const e=await fetch(i);if(!e.ok)throw new Error("["+n+"] update check HTTP error! status: "+e.status);const t=(await e.text()).split("\n");let o;if(t.length>2){const e=t.find(e=>e.includes("const pluginVersion =")||e.includes("const plugin_version ="));if(e){const t=e.match(/const\s+plugin[_vV]ersion\s*=\s*['"]([^'"]+)['"]/);t&&(o=t[1])}}return o||(o=t[0]),o}catch(e){return logError("Error fetching file:",e),null}}function a(e,t,n,o){if("/setup"===location.pathname){const i=document.getElementById("plugin-settings");if(i){const r=i.textContent.trim(),a=`<a href="${o}" target="_blank">[${n}] Update available: ${e} --> ${t}</a><br>`;"No plugin settings are available."===r?i.innerHTML=a:i.innerHTML+=" "+a}const r=document.querySelector(".wrapper-outer #navigation .sidenav-content .fa-puzzle-piece")||document.querySelector(".wrapper-outer .sidenav-content")||document.querySelector(".sidenav-content"),a=document.createElement("span");a.style.cssText="display:block;width:12px;height:12px;border-radius:50%;background:#FE0830;margin-left:82px;margin-top:-12px",r.appendChild(a)}}r().then(e=>{e&&e!==t&&(updateText=getTranslatedText('newVersion') || `There is a new version of Spectrum Graph available`,logInfo(updateText),a(t,e,n,o))})}CHECK_FOR_UPDATES&&checkUpdate(pluginSetupOnlyNotify,pluginVersion,pluginName,pluginHomepageUrl,pluginUpdateUrl);

/* ==================================================
                    SIGNAL UNITS
   ================================================== */
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
        logInfo(`Signal unit changed.`);
    }
    prevSignalText = signalText;
}

setTimeout(() => {
  signalUnits();
  setInterval(signalUnits, 2000);
}, 400);

// Function to apply fade effect and transition styles
function applyFadeEffect(buttonId, opacity, scale) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.style.opacity = opacity;
        button.style.transition = 'opacity 0.4s ease-in-out, transform 0.4s ease-in-out';
        button.style.transform = `scale(${scale})`;
    }
}

/* ==================================================
                    CREATE BUTTONS
   ================================================== */

// Functions to assist button fade when mouse leaves canvas
const ButtonFadeManager = {
    isHoveringCanvas: false,
    hasEnteredCanvas: false,
    buttonsFaded: false,
    fadeTimeout: null,
    resetTimeout: null,
    fadeDelay: 5000, // ms
    fadeDelayInitial: 30000, // ms

    getButtons() {
        return document.querySelectorAll('#sdr-graph-button-container button');
    },

    updateButtonOpacity() {
        const buttons = this.getButtons();

        // Ensure all buttons have smooth transition
        buttons.forEach(button => {
            button.style.transition = 'opacity 1s ease';
        });

        if (!this.hasEnteredCanvas || this.isHoveringCanvas) {
            buttons.forEach(button => (button.style.opacity = '0.8'));
            this.buttonsFaded = false;

            // Cancel any pending fade
            if (this.fadeTimeout) {
                clearTimeout(this.fadeTimeout);
                this.fadeTimeout = null;
            }
        } else {
            if (this.buttonsFaded) {
                buttons.forEach(button => {
                    button.style.opacity = button.classList.contains('button-on') ? '0.6' : '0.5';
                });
            } else {
                // Schedule fade if not already pending
                if (!this.fadeTimeout) {
                    this.fadeTimeout = setTimeout(() => {
                        const allButtons = this.getButtons();
                        allButtons.forEach(button => {
                            button.style.opacity = button.classList.contains('button-on') ? '0.6' : '0.5';
                        });
                        this.buttonsFaded = true;
                        this.fadeTimeout = null;
                    }, this.fadeDelay);
                }
            }
        }
    },

    onMouseEnter() {
        this.isHoveringCanvas = true;
        this.hasEnteredCanvas = true;
        this.updateButtonOpacity();
    },

    onMouseLeave() {
        this.isHoveringCanvas = false;
        this.updateButtonOpacity();
    },

    refresh() {
        this.updateButtonOpacity();
    },

    attach(canvasSelector) {
        const canvas = document.querySelector(canvasSelector);
        canvas.addEventListener('mouseenter', () => this.onMouseEnter());
        canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    },

    // External function to set hasEnteredCanvas to true after timeout
    setHasEnteredCanvasAfterDelay() {
        if (!this.hasEnteredCanvas) {
            this.resetTimeout = setTimeout(() => {
                this.hasEnteredCanvas = true;
                this.updateButtonOpacity();
            }, this.fadeDelayInitial);
        }
    }
};

// Create scan button to refresh graph
function ScanButton(customRangesOnly, applyFade = true) {

    // Override tooltip for custom ranges
    function initCustomRangeTooltips(target = null) {
        // Define scope: all tooltips or specific one if target is provided
        const tooltips = target ? $(target) : $('.custom-tooltip');
        
        // Unbind existing event handlers before rebinding to avoid duplication
        tooltips.off('mouseenter mouseleave');
        
        // Fixed position based on scan button
        const $scanBtn = $('#spectrum-scan-button');
        let tooltipTop = 0, tooltipLeft = 0;
        if ($scanBtn.length) {
            const scanOffset = $scanBtn.offset();
            const scanWidth = $scanBtn.outerWidth();
            tooltipTop = scanOffset.top - 45; // fixed above scan button
            tooltipLeft = scanOffset.left + scanWidth / 2; // center horizontally
        }
        
        tooltips.hover(function () {
            if ($(this).closest('.popup-content').length) {
                return;
            }        

            const tooltipText = $(this).attr('data-tooltip');

            // Clear existing timeout
            clearTimeout($(this).data('timeout'));

            // Show tooltip after short delay
            $(this).data('timeout', setTimeout(() => {
                $('.tooltip-wrapper').remove();

                const tooltip = $(`
                    <div class="tooltip-wrapper">
                        <div class="tooltiptext">${tooltipText}</div>
                    </div>
                `);
                $('body').append(tooltip);

                const tooltipEl = $('.tooltiptext');

                // Apply fixed position
                tooltipEl.css({
                    top: tooltipTop,
                    left: tooltipLeft,
                    transform: 'translateX(-50%)',
                    opacity: 1,
                    position: 'absolute',
                    pointerEvents: 'none'
                });

            }, 300));
        }, function () {
            clearTimeout($(this).data('timeout'));

            setTimeout(() => {
                $('.tooltip-wrapper').fadeOut(300, function () { $(this).remove(); });
            }, 100); 
        });
        
        $('.popup-content').off('mouseenter').on('mouseenter', function () {
            clearTimeout($('.custom-tooltip').data('timeout'));
            $('.tooltip-wrapper').fadeOut(300, function () { $(this).remove(); });
        });
    }

    if (customRangesOnly) {
        if (fmButton) {
            const fmBtn = document.querySelector('.spectrum-band-button[data-scan="scan-0"]');
            if (fmBtn && fmButton.tooltip) {
                $(fmBtn).removeData('custom-tooltip');
                fmBtn.setAttribute('data-tooltip', fmButton.tooltip);
            }
        }

        if (Array.isArray(customRanges)) {
            customRanges.forEach((r, i) => {
                const btn = document.querySelector(`.spectrum-band-button[data-scan="scan-${i + 1}"]`);
                if (btn && r.tooltip) {
                    $(btn).removeData('custom-tooltip');
                    btn.setAttribute('data-tooltip', r.tooltip);
                }
            });
        }

        return;
    }

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
    spectrumButton.setAttribute('aria-label', 'Perform manual spectrum graph scan');
    spectrumButton.classList.add('rectangular-spectrum-button', 'tooltip');
    spectrumButton.setAttribute('data-tooltip', getTranslatedText('performManualScan'));
    spectrumButton.innerHTML = '<span><i class="fa-solid fa-rotate"></i></span>';
    spectrumButton.addEventListener('contextmenu', e => e.preventDefault());

    // Add event listener
    let canSendMessage = true;
    spectrumButton.addEventListener('click', () => {
        tuningEnabledLocally = false;

        buttonTimeoutLocally = setTimeout(function() {
            tuningEnabledLocally = true;
        }, 1000);

        if (!isTuningAllowed) {
            logWarn("Tuning is currently locked by the administrator");
            insertUpdateText(getTranslatedText('spectrumScanLocked'));
            return;
        }

        if (canSendMessage) initializeGraph();
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

    // Set container position to relative
    const canvasSdrGraph = document.getElementById('sdr-graph');
    if (canvasSdrGraph) {
        const canvasContainer = canvasSdrGraph.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
            canvasContainer.style.position = 'relative';
        } else {
            logError(`Parent container is not .canvas-container`);
        }
    } else {
        logError(`#sdr-graph not found`);
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
            logError(`Parent container for button not found`);
        }
    } else {
        logError(`#sdr-graph-button-container not found`);
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
        filter: grayscale(0);
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.8);
        z-index: 8;
    }

    .rectangular-spectrum-button span {
        align-items: center;
        justify-content: center;
    }

    .rectangular-spectrum-button.is-grayscale {
        filter: grayscale(1);
        opacity: 0.5 !important;
    }
`;

    const styleElement = document.createElement('style');
    styleElement.innerHTML = rectangularButtonStyle;
    document.head.appendChild(styleElement);

    /*
    ToggleAddButton(Id,                             Tooltip,                    FontAwesomeIcon,    localStorageVariable,   localStorageKey,                ButtonPosition)
    */
    ToggleAddButton('hold-button',                  getTranslatedText('holdPeaks'),               'pause',            'enableHold',           `HoldPeaks${currentAntenna}`,   '56',   'Hold peaks'); // ToggleAddButton 'hold-button' located in getCurrentAntenna(), added here only to keep buttons in order
    ToggleAddButton('smoothing-on-off-button',      getTranslatedText('smoothGraphEdges'),       'chart-area',       'enableSmoothing',      'Smoothing',                    '96',   'Visually smooth graph edges');
    ToggleAddButton('fixed-dynamic-on-off-button',  getTranslatedText('relativeFixedScale'),     'arrows-up-down',   'fixedVerticalGraph',   'FixedVerticalGraph',           '136',  'Toggle between relative or fixed scale');
    ToggleAddButton('auto-baseline-on-off-button',  getTranslatedText('autoBaseline'),            'a',                'isAutoBaseline',       'AutoBaseline',                 '176',  'Auto baseline (adjust graph for noise floor)');
    if (drawAboveCanvasIsPossible) {
    ToggleAddButton('draw-above-canvas',            getTranslatedText('moveAboveSignalGraph'), 
                                              drawAboveCanvasOverridePosition ? 'turn-down' : 
                                                                                'turn-up',          'isAboveSignalCanvas',  'AboveSignalCanvas',            '216',  'Move spectrum graph above signal graph');

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
    if (applyFade) {
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
    }

    // Fade all buttons on canvas hover
    const sdrGraphCSS = document.querySelector('.canvas-container');
    const sdrGraphButtonContainer = document.getElementById('sdr-graph-button-container');

    sdrGraphButtonContainer.style.opacity = 0.8;
    sdrGraphButtonContainer.style.transition = 'opacity 0.5s ease';

    const handleMouseEnter = () => {
      sdrGraphButtonContainer.style.transition = 'opacity 0.5s ease';
      sdrGraphButtonContainer.style.opacity = 1;

      // Remove listener after it runs once
      sdrGraphCSS.removeEventListener('mouseenter', handleMouseEnter);
    };

    sdrGraphCSS.addEventListener('mouseenter', handleMouseEnter);

    // Attach button handler to canvas
    ButtonFadeManager.attach('.canvas-container');

    // ─────────────────────────────────────────────
    // Additional custom ranges
    // ─────────────────────────────────────────────
    let bandMenuTimeout;
    let canSendCustomMessage = true;
    let recentlyClicked = false;

    const bandMenu = document.createElement('div');
    bandMenu.id = 'spectrum-band-menu';
    bandMenu.style.position = 'absolute';
    bandMenu.style.top = `${parseInt(topValue) + 26}px`;
    bandMenu.style.right = '16px';
    bandMenu.style.display = 'none';
    bandMenu.style.flexDirection = 'column';
    bandMenu.style.gap = '2px';
    bandMenu.style.zIndex = '9';
    bandMenu.style.pointerEvents = 'auto';
    bandMenu.style.alignItems = 'stretch';
    buttonContainer.appendChild(bandMenu);

    // Use a small invisible hover bridge below the scan button
    const hoverBridge = document.createElement('div');
    hoverBridge.style.position = 'absolute';
    hoverBridge.style.top = '0';
    hoverBridge.style.left = '0';
    hoverBridge.style.width = '100%';
    hoverBridge.style.height = 'calc(100% + 4px)'; // in theory 2px is enough
    hoverBridge.style.pointerEvents = 'auto';
    hoverBridge.style.background = 'transparent';
    spectrumButton.appendChild(hoverBridge);

    // Show menu when hovering button or hover bridge
    [spectrumButton, hoverBridge, bandMenu].forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (recentlyClicked) return;
            clearTimeout(bandMenuTimeout);
            bandMenu.style.display = 'flex';
        });
        el.addEventListener('mouseleave', () => {
            clearTimeout(bandMenuTimeout);
            bandMenuTimeout = setTimeout(() => {
                bandMenu.style.display = 'none';
            }, 400);
        });
    });

    function sendScan(mode) {
        if (!isTuningAllowed || !wsSendSocket) return;

        initializeGraph();

        if (!canSendCustomMessage) return;

        wsSendSocket.send(JSON.stringify({
            type: 'spectrum-graph',
            value: { status: mode }
        }));
        logInfo('Sent scan command:', mode); // debug

        canSendCustomMessage = false;
        setTimeout(() => { canSendCustomMessage = true; }, 1000); // cooldown
    }

    function addBandButton(label, scanMode, tooltip) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.classList.add('spectrum-band-button');

        btn.style.width = '32px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';

        if (tooltip) {
            btn.classList.add('custom-tooltip');
            btn.setAttribute('data-tooltip', tooltip);
            btn.setAttribute('data-scan', scanMode);
        }

        // Adjust font size based on character count
        const dynamicFontSize = true;
        const maxChars = 4; // approximate max characters for full size
        const baseFontSize = 13; // default font size
        const fontSize = label.length > maxChars ? Math.floor(baseFontSize * (maxChars / (label.length + 0.25))) : baseFontSize;
        if (dynamicFontSize) btn.style.fontSize = `${fontSize}px`;

        btn.addEventListener('click', (e) => {
            tuningEnabledLocally = false;

            buttonTimeoutLocally = setTimeout(function() {
                tuningEnabledLocally = true;
            }, 1000);

            e.stopPropagation();
            bandMenu.style.display = 'none';
            recentlyClicked = true;
            const resetOnMove = () => {
                recentlyClicked = false;
                document.removeEventListener('mousemove', resetOnMove);
            };
            document.addEventListener('mousemove', resetOnMove, { once: true });
            sendScan(scanMode);
        });

        bandMenu.appendChild(btn);
        initCustomRangeTooltips();
    }

    // Default FM button
    if (customRanges.length > 0) {
        if (fmButton) {
            addBandButton(fmButton.label, 'scan-0', fmButton.tooltip);
        }

        // Custom ranges
        customRanges.forEach((r, i) => {
            addBandButton(r.label, `scan-${i+1}`, r.tooltip);
        });
    }

    // Button styles
    const bandButtonStyle = `
    .spectrum-band-button {
        width: 32px;
        height: 24px;
        padding: 0;
        border-radius: 5px;
        cursor: pointer;
        opacity: 0.9;
        font-weight: 600;
        font-size: 13px;
        filter: grayscale(0);
        box-shadow: 0px 2px 5px rgba(0,0,0,0.8);
    }

    .spectrum-band-button.is-grayscale {
        filter: grayscale(1);
        opacity: 0.5 !important;
        transition: all 0.25s cubic-bezier(.4,0,.2,1);
    }

    .spectrum-band-button:hover {
        opacity: 1.6;
    }
    `;
    const bandStyleEl = document.createElement('style');
    bandStyleEl.innerHTML = bandButtonStyle;
    document.head.appendChild(bandStyleEl);
}

// Create button
function ToggleAddButton(Id, Tooltip, FontAwesomeIcon, localStorageVariable, localStorageKey, ButtonPosition, ariaLabel) {
    // Remove any existing instances of button
    const existingButtons = document.querySelectorAll(`.${Id}`);
    existingButtons.forEach(button => button.remove());

    // Create new button
    const toggleButton = document.createElement('button');
    toggleButton.id = `${Id}`;
    toggleButton.setAttribute('aria-label', `${ariaLabel}`);
    toggleButton.classList.add(`${Id}`, 'tooltip');
    toggleButton.setAttribute('data-tooltip', `${Tooltip}`);
    toggleButton.innerHTML = `<span><i class="fa-solid fa-${FontAwesomeIcon}"></i></span>`;
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
            logError(`Parent container is not .canvas-container`);
        }
    } else {
        logError(`#sdr-graph not found`);
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

    .${Id} span {
        align-items: center;
        justify-content: center;
    }

    .${Id} i {
        font-size: 14px;
    }

    .${Id}.button-on {
        filter: brightness(150%) contrast(110%);
        box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.5), 0 0 10px var(--color-5);
    }

    .wrapper-outer #wrapper .canvas-container #sdr-graph-button-container button:hover:active {
        opacity: 1.6;
        filter: brightness(1.7);
    }
`;

    const styleElement = document.createElement('style');
    styleElement.innerHTML = buttonStyle;
    document.head.appendChild(styleElement);
}

/* ==================================================
                    SETUP ALERTS
   ================================================== */

// Function to display update text
function insertUpdateText(updateText, timeout = 10, forceFadeOut = false, isHtml = false, leftMargin, isInstant, onlyIfScanning) {
    if (!isGraphOpen) return;

    // Remove and fade out existing text if forced
    if (forceFadeOut === true) {
        document.querySelectorAll('.spectrum-graph-update-text').forEach(existingText => {
            clearTimeout(existingText._removeTimeout); // clear its own timeout
            existingText.style.opacity = '0';
            existingText.style.transform = 'scale(0.92)';
            const transitionDuration = parseFloat(getComputedStyle(existingText).transitionDuration) * 1000;
            setTimeout(() => {
                if (existingText.parentElement) existingText.remove();
            }, transitionDuration);
        });
        return;
    }

    // Remove any existing update text (without fade, because new scan will overwrite)
    document.querySelectorAll('.spectrum-graph-update-text').forEach(existingText => {
        clearTimeout(existingText._removeTimeout);
        existingText.remove();
    });

    // Create new text element
    const updateTextElement = document.createElement('div');
    updateTextElement.classList.add('spectrum-graph-update-text');
    if (isHtml) updateTextElement.innerHTML = updateText;
    else updateTextElement.textContent = updateText;

    // Vertical position
    let textTop = 34;
    if (localStorageItem.isAboveSignalCanvas === true) textTop = 34 - canvasFullHeight - 2;

    // Style
    const color1 = getComputedStyle(document.documentElement).getPropertyValue('--color-1').trim();
    const rgbColor1 = color1.match(/\d+/g);

    const backgroundColor = rgbColor1 
        ? `rgba(${rgbColor1[0]}, ${rgbColor1[1]}, ${rgbColor1[2]}, 0.9)`
        : 'rgba(16, 16, 16, 0.5)';

    Object.assign(updateTextElement.style, {
        position: 'absolute',
        top: `${textTop}px`,
        left: ((leftMargin || 0) + 44) + 'px',
        color: 'var(--color-5-transparent)',
        filter: 'brightness(125%)',
        fontSize: '14px',
        textShadow: '0 0 1px rgba(64, 64, 64, 0.4)',
        transform: 'scale(0.96)',
        opacity: '0',
        backgroundColor: backgroundColor,
        padding: '4px 8px',
        borderRadius: '5px',
        zIndex: '3',
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 1, 1), transform 0.2s cubic-bezier(0.4, 0, 1, 1)'
    });

    updateTextElement.addEventListener('mouseenter', () => { 
        updateTextElement.style.opacity = '0';
        updateTextElement.style.transform = 'scale(0.92)';
    });

    // Append
    const canvas = document.getElementById('sdr-graph');
    if (canvas) {
        const canvasContainer = canvas.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
            canvasContainer.style.position = 'relative';
            clearTimeout(pendingMessage1);
            pendingMessage1 = setTimeout(() => canvasContainer.appendChild(updateTextElement), ((isFirstMessage && !isHtml) || isInstant ? 60 : 300));
        }
    }

    // Fade in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            clearTimeout(pendingMessage2);
            pendingMessage2 = setTimeout(() => {

                // Only show "Scanning..." if scanning status is confirmed
                if (!onlyIfScanning || isScanInitiated) {
                    if (isScanInitiated) {
                        tuningEnabled = false; // Disable mouse tuning
                        const buttonQuery = document.querySelector('#spectrum-scan-button');
                        if (buttonQuery) {
                            buttonQuery.style.cursor = 'wait';
                            buttonQuery.classList.add('is-grayscale');
                            buttonQuery.disabled = true;
                        }

                        const btnQuery = document.querySelectorAll('.spectrum-band-button');
                        if (btnQuery) {
                            btnQuery.forEach(button => {
                                button.style.cursor = 'wait';
                                button.classList.add('is-grayscale');
                                button.disabled = true;
                            });
                        }

                        clearTimeout(buttonTimeout);

                        buttonTimeout = setTimeout(function() {
                            tuningEnabled = true; // Enable mouse tuning
                            if (buttonQuery) {
                                buttonQuery.style.cursor = 'pointer';
                                buttonQuery.classList.remove('is-grayscale');
                                buttonQuery.disabled = false;
                            }
                            if (btnQuery) {
                                btnQuery.forEach(button => {
                                    button.style.cursor = 'pointer';
                                    button.classList.remove('is-grayscale');
                                    button.disabled = false;
                                });
                            }
                            isUpdating = false;
                        }, 5000);
                    }
                    updateTextElement.style.opacity = '1';
                    updateTextElement.style.transform = 'scale(1.02)';
                }

            }, ((isFirstMessage && !isHtml) || isInstant ? 80 : 400));
            if (isFirstMessage) isFirstMessage = false;
        });
    });

    // Per-element fade-out
    updateTextElement._removeTimeout = setTimeout(() => {
        updateTextElement.style.opacity = '0';
        updateTextElement.style.transform = 'scale(0.92)';
        const transitionDuration = parseFloat(getComputedStyle(updateTextElement).transitionDuration) * 1000;
        setTimeout(() => {
            if (updateTextElement.parentElement) updateTextElement.remove();
        }, transitionDuration);
    }, timeout * 1000);
}

/* ==================================================
                    ADMIN CHECK
   ================================================== */

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
    if (!isTunerLocked || isTuneAuthenticated) isTuningAllowed = true;
    if (isTuneAuthenticated) logInfo(`Logged in as administrator`);
    if (!isTuningAllowed) {
        // Unlock after timeout, server-side rejects non-admin regardless
        setTimeout(() => {
            isTuningAllowed = true;
        }, 30000);
    }
}

/* ==================================================
                    CHECK ANTENNA SETUP
                            &
                    CHECK OUTDATED SCANS
   ================================================== */
async function getAntennaNames() {
    if (cachedAntennaNames) return cachedAntennaNames;
    if (antennaNamesPromise) return antennaNamesPromise;

    antennaNamesPromise = (async () => {
        try {
            const res = await fetch('./static_data');
            const json = await res.json();

            const ant = json.ant || {};
            const names = [];

            for (let i = 1; i <= 4; i++) {
                const antKey = `ant${i}`;
                if (json?.ant?.enabled) {
                    names[i - 1] = ant[antKey]?.enabled
                    ? ant[antKey].name
                    : null;
                } else {
                    names[i - 1] = null;
                }
            }

            cachedAntennaNames = names;
            return names;

        } catch (e) {
            // Hard fallback
            cachedAntennaNames = [
                'Antenna 1',
                'Antenna 2',
                'Antenna 3',
                'Antenna 4'
            ];
            return cachedAntennaNames;
        } finally {
            antennaNamesPromise = null;
        }
    })();

    return antennaNamesPromise;
}

function updateCachedTimestamps(data) {
    cachedServerTime = data.serverTime ?? cachedServerTime;
    for (let i = 0; i < 4; i++) {
        cachedLastUpdates[i] = data[`lastUpdate${i}`] ?? cachedLastUpdates[i];
    }

    cachedLastUpdates[0] = data.lastUpdate ?? cachedLastUpdates[0];
}

// Fetch any available data on page load
async function initializeGraph(checkIfScanningOnly = false, returnAfterAntennaCheck) {
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
            throw new Error(`[${pluginName}] failed to fetch data: ${response.status}`);
        }

        const data = await response.json();

        if (checkIfScanningOnly === true) {
            if (debug) logInfo(`Returning scanStatus only: ${data.scanStatus}`);
            return data.scanStatus;
        }

        if (data.sd && data.isScanComplete === false) isScanComplete = false;

        // Switch to data of current antenna
        if (data.ad && data.sd && (data.sd0 || data.sd1)) {
            data.sd = data[`sd${data.ad}`];
            currentAntenna = data.ad;
            isUsingAntennaSwitch = true;
        } else {
            isUsingAntennaSwitch = false;
        }

        if (data.scanStatus) scanStatus = data.scanStatus;

        // --- FM button data ---
        if (data && typeof data.fmRangeName === 'string' && data.fmRangeName.trim() !== '' &&
            typeof data.fmRangeFreq === 'string' && data.fmRangeFreq.trim() !== '') {
            fmButton = {
                label: data.fmRangeName,
                tooltip: data.fmRangeFreq
            };
        }

        // --- Custom ranges array ---
        if (data && Array.isArray(data.customRangeNames) && data.customRangeNames.length > 0) {
            customRanges = data.customRangeNames.map((name, i) => ({
                label: typeof name === 'string' ? name : '',
                tooltip: Array.isArray(data.customRangeFreqs) && typeof data.customRangeFreqs[i] === 'string'
                    ? data.customRangeFreqs[i]
                    : ''
            }));
        }

        if (isGraphOpen) ScanButton(true);

        async function isOutdatedScans() {
            // Notice if last antenna scan is outdated
            if (LAST_ANTENNA_SCAN_NOTICE_MINUTES) {

                setTimeout(() => {
                    outdatedAntennaScanInterval();
                }, 1000);

                // Update cached timestamps whenever new data arrives
                updateCachedTimestamps(data);

                const antennaNames = await getAntennaNames();

                const maxAntennas = 4;
                const serverTime = data.serverTime || 0;
                const now = Math.floor(serverTime); // Requires server time to ensure accuracy
                const thresholdSeconds = LAST_ANTENNA_SCAN_NOTICE_MINUTES * 60;

                const allNamesNull = !antennaNames || antennaNames.every(name => !name);

                // Fallback to lastUpdate check if all antenna names are null
                if (allNamesNull) {
                    const lastUpdate = data.lastUpdate ?? null;

                    if (
                        lastUpdate !== null &&
                        now - lastUpdate > thresholdSeconds
                    ) {
                        if (!isUpdating) isLastUpdateOutdated = true;
                    } else {
                        isLastUpdateOutdated = false;
                    }

                    return;
                }

                // Per-antenna
                const lastUpdates = [];
                const outdatedAntennas = [];

                for (let i = 0; i < maxAntennas; i++) {
                    if (!antennaNames[i]) continue;

                    if (data[`sd${i}`] || (i === 0 && data.sd)) {
                        lastUpdates[i] = data[`lastUpdate${i}`] ?? data.lastUpdate ?? null;
                    } else {
                        lastUpdates[i] = null;
                    }

                    outdatedAntennas[i] =
                        lastUpdates[i] !== null &&
                        now - lastUpdates[i] > thresholdSeconds;
                }

                // Map outdated antennas to names
                const outdatedList = outdatedAntennas
                    .map((isOld, idx) => isOld ? antennaNames[idx] : null)
                    .filter(Boolean);

                if (outdatedList.length > 0) {
                    outdatedAntennaList = outdatedList.join(', ');
                    if (!isUpdating) isLastUpdateOutdated = true;
                } else {
                    isLastUpdateOutdated = false;
                }
            }
        }

        await isOutdatedScans();

        if (returnAfterAntennaCheck === true) {
            if (debug) logInfo(`Returning after isOutdatedScans`);
            getCurrentAntenna();
            return;
        }

        // Check if `sd` exists
        if (data.sd && data.sd.trim() !== '') {
            if (data.sd.length > 0) {

                // Remove trailing comma and space in TEF radio firmware
                if (data.sd && data.sd.endsWith(', ')) {
                    data.sd = data.sd.slice(0, -2);
                }

                // Handle 'sigArray' data
                sigArray = data.sd.split(',').map(pair => {
                    let [freq, sig] = pair.split('=');
                    // Signal calibration
                    if (CAL90000 || CAL95500 || CAL100500 || CAL105500) {
                        const _f = parseFloat(freq) / 1000;
                        let adjustment = (_f >= 87 && _f < 93) ? CAL90000 : (_f >= 93 && _f < 98) ? CAL95500 : (_f >= 98 && _f < 103) ? CAL100500 : (_f >= 103 && _f <= 108) ? CAL105500 : 0;
                        sig = parseFloat(sig);
                        if (sig > 15) sig += adjustment * ((sig <= 20 ? (sig - 15) / 5 : 1));
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
                    logError(`Expected array for sigArray, but received:`, sigArray);
                }
            }

            dataError = false;
        } else {
            getDummyData();
            logInfo(`Found no data available at page load.`);
        }
    } catch (error) {
        graphError = true;
        getDummyData();
        logError(`Error during graph initialisation.`);
    }

    getCurrentAntenna();

    // Initial data loaded
    isInitialDataLoaded = true;
    if (debug) logInfo(`initial data loaded.`);
}

function createdOutdatedNotice() {
    const t = translations[currentLanguage];

    const agoMin = LAST_ANTENNA_SCAN_NOTICE_MINUTES;
    const hours = Math.floor(agoMin / 60);
    const minutes = agoMin % 60;

    let message = t.scanOlderThanXMinutes;

    if (hours > 0) {
        message = message.replace('{hours}', hours);
    } else {
        message = message.replace(/\{hours\}[^\s]+ /, '');
    }

    if (minutes > 0 || agoMin === 0) {
        message = message.replace('{minutes}', minutes);
    } else {
        message = message.replace(/ \{minutes\}[^\s]+/, '');
    }

    if (outdatedAntennaList !== '' && isUsingAntennaSwitch) {
        message = message.replace('{antennas}', outdatedAntennaList);
    } else {
        message = message.replace(/ [^\s]+ \{antennas\}/, '');
    }

    return message + '.';
}

// Periodically check for outdated antenna scans
function checkCachedOutdatedAntennaScans() {
    if (!LAST_ANTENNA_SCAN_NOTICE_MINUTES) return;

    try {
        const antennaNames = cachedAntennaNames; // previously set once via getAntennaNames()
        if (!antennaNames || antennaNames.length === 0) return;

        const now = Math.floor(Date.now() / 1000); // use local time
        const threshold = LAST_ANTENNA_SCAN_NOTICE_MINUTES * 60;

        const allNamesNull = antennaNames.every(name => !name);

        // Fallback if all antenna names are null
        if (allNamesNull) {
            const last = cachedLastUpdates?.[0] ?? null;

            if (last && (now - last > threshold)) {
                isLastUpdateOutdated = true;
            } else {
                isLastUpdateOutdated = false;
            }

            // Trigger message if needed
            if (!isUpdating && isGraphOpen && !graphError && isLastUpdateOutdated) {
                isLastUpdateOutdated = false;
                const msg = createdOutdatedNotice();
                insertUpdateText(msg, ANTENNA_SCAN_NOTICE_TIMEOUT_SECONDS);
            }

            return;
        }

        // Per-antenna
        const outdated = [];

        for (let i = 0; i < 4; i++) {
            if (!antennaNames[i]) continue;

            const last = cachedLastUpdates[i] ?? (i === 0 ? cachedLastUpdates[0] : null);

            if (last && (now - last > threshold)) {
                outdated.push(antennaNames[i]);
            }
        }

        if (outdated.length) {
            outdatedAntennaList = outdated.join(', ');
            isLastUpdateOutdated = true;
        } else {
            isLastUpdateOutdated = false;
        }

        if (!isUpdating && isGraphOpen && !graphError && isLastUpdateOutdated) {
            isLastUpdateOutdated = false;
            const msg = createdOutdatedNotice();
            insertUpdateText(msg, ANTENNA_SCAN_NOTICE_TIMEOUT_SECONDS);
        }
    } catch (err) {
        logError('checkCachedOutdatedAntennaScans error:', err);
    }
}

function outdatedAntennaScanInterval() {
    if (LAST_ANTENNA_SCAN_NOTICE_MINUTES) {
        clearInterval(antennaScanInterval);
        antennaScanInterval = setInterval(checkCachedOutdatedAntennaScans, ANTENNA_SCAN_NOTICE_INTERVAL_SECONDS * 1000);
    }
}

function getDummyData() {
    if (scanStatus !== 'scanning' && scanStatus !== 'rejected') dataError = true;
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
if (window.location.pathname !== '/setup') document.addEventListener('DOMContentLoaded', initializeGraph);

// Fetch current antenna
async function getCurrentAntenna(draw = true) {
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
                    logInfo(`Data found for antenna ${data.ant}.`);
                }

                displayHighlightedFreqs(); // Used for right-click

                // Hold peaks antenna localStorage
                localStorageItem.enableHold = localStorage.getItem(`enableSpectrumGraphHoldPeaks${currentAntenna}`) === 'true';     // Holds peaks
                if (isGraphOpen) {
                    ToggleAddButton('hold-button',                  'Hold Peaks',               'pause',            'enableHold',           `HoldPeaks${currentAntenna}`,   '56',  'Hold peaks');
                    ButtonFadeManager.refresh(); // Called after a button redraw
                }
                if (typeof initTooltips === 'function') initTooltips();
                outlinePointsSavePermission = !localStorageItem.enableHold;
                if (draw) if (isGraphOpen) setTimeout(drawGraph, drawGraphDelay);
            })
            .catch(error => {
                logError(`Error fetching api data:`, error);
            });
    } catch (error) {
        logError(`Error fetching current antenna:`, error);
    }
}

/* ==================================================
                    CANVAS DISPLAY
   ================================================== */

// Display signal canvas (default)
function displaySignalCanvas() {
    // Lock button
    const pluginButton = document.getElementById('spectrum-graph-button');
    if (pluginButton) {
        pluginButton.classList.remove('active');
        if (isGraphOpen) pluginButton.disabled = true;
        setTimeout(() => {
            pluginButton.disabled = false;
        }, 400);
    } else {
        if (window.location.pathname !== '/setup') {
            if (typeof addIconToPluginPanel === 'function') {
                console.warn(`[${pluginName}] Function 'addIconToPluginPanel' not found.`);
            } else {
                console.warn(`[${pluginName}] Resolution too low to display.`);
            }
        }
    }

    const sdrCanvas = document.getElementById('sdr-graph');

    if (!graphError && isGraphOpen && sdrCanvas) insertUpdateText(false, 5, true); // Fade out any notices

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
        sdrCanvas.style.cursor = 'crosshair';
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
function displaySdrGraph(applyFade = true) {
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
            ButtonFadeManager.setHasEnteredCanvasAfterDelay();
            if (!BORDERLESS_THEME) {
                canvas.style.border = "1px solid var(--color-3)";
                canvas.style.borderRadius = "16px";
            }
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
        ScanButton(false, applyFade);
    }, 40);
}

// Adjust dataCanvas height based on window height
function adjustSdrGraphCanvasHeight(draw = true) {
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && window.matchMedia("(orientation: portrait)").matches && window.innerWidth <= 480) {
        displaySignalCanvas(); // Ensure it doesn't appear in portrait mode
    } else {
        if (window.innerHeight <= windowHeight && window.innerWidth > 480) {
            canvas.height = canvasHeightSmall;
        } else {
            canvas.height = canvasHeightLarge;
        }
        if (draw) drawGraph();
    }
}

// Toggle spectrum state and update UI accordingly
function toggleSpectrum() {
    if (isLaunchedEarly) return;
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
        setTimeout(adjustSdrGraphCanvasHeight(false), 400);
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

/* ==================================================
                    FREQUENCY OBSERVER
   ================================================== */

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
        logInfo(`#data-frequency missing`);
    }
}

observeFrequency();

/* ==================================================
                    CANVAS INTERACTIONS
   ================================================== */

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
    tooltip.style.filter = 'contrast(110%)';
    tooltip.style.padding = '4px 8px 4px 8px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.fontSize = '12px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.visibility = 'hidden';
    tooltip.style.zIndex = '9';

    // Append tooltip inside the canvas-container
    if (window.location.pathname !== '/setup') canvasContainer.appendChild(tooltip);

    // Scaling factors and bounds
    let xScale, minFreq, freqRange, yScale;

    // Function to draw circle and tooltips
    function updateTooltip(event) {
        const ctx = canvas.getContext('2d');

        if (graphImageData) ctx.putImageData(graphImageData, 0, 0);

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Hide tooltip in resize area
        if (mouseY > rect.height - resizeEdge) {
            tooltip.style.visibility = 'hidden';
            return;
        }

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
            const originalSignalValue = Number(closestPoint.sig);

            let signalValue;
            if (!CORRECT_TOOLTIP_PEAKS) {
                signalValue = Number(closestPoint.sig);
            } else {
                const idx = sigArray.indexOf(closestPoint);
                const base = Number(closestPoint.sig);

                let left = null, right = null;

                if (idx > 0) left = Number(sigArray[idx - 1].sig);
                if (idx < sigArray.length - 1) right = Number(sigArray[idx + 1].sig);

                let maxSignal = base;

                // ====================================
                // Parameters for CORRECT_TOOLTIP_PEAKS
                // ====================================
                const BASE_THRESHOLD = 33;
                const STRONG_SIGNAL_FACTOR = 0.26;
                const MIN_SIGNAL_FRACTION = 0.75;

                if (left !== null && right !== null) {
                    const neighbourDiff = Math.abs(left - right);
                    const maxNeighbour = Math.max(left, right);

                    // Adaptive threshold for SAME_PEAK_THRESHOLD
                    const dynamicThreshold = Math.max(BASE_THRESHOLD, maxNeighbour * STRONG_SIGNAL_FACTOR);

                    // Smooth adaptive minimum signal to allow boosting
                    const minSignalToBoost = maxNeighbour * MIN_SIGNAL_FRACTION;

                    // Only boost if neighbours are close enough AND current signal is strong enough
                    if (neighbourDiff <= dynamicThreshold && base >= minSignalToBoost) {
                        maxSignal = Math.max(base, left, right);
                    }

                } else if (left !== null || right !== null) {
                    const neighbour = left !== null ? left : right;

                    const dynamicThreshold = Math.max(BASE_THRESHOLD, neighbour * STRONG_SIGNAL_FACTOR);
                    const minSignalToBoost = neighbour * MIN_SIGNAL_FRACTION;

                    if (Math.abs(neighbour - base) <= dynamicThreshold && base >= minSignalToBoost) {
                        maxSignal = Math.max(base, neighbour);
                    }
                }

                signalValue = maxSignal;
            }

            // Calculate tooltip content
            const freqText = `${freq.toFixed(1)} MHz`;
            const signalText = `, ${Math.round(signalValue.toFixed(2) - sigOffset).toFixed(0)} ${sigDesc}`;
            const originalSignalValueTooltip = Math.round(originalSignalValue.toFixed(2) - sigOffset).toFixed(0);

            // Style HTML
            const tooltipCorrectionDebugLevel = 0; // 0, 1, or 2

            tooltip.innerHTML = `
                <span style="font-weight: 600;">${freqText}</span>
                <span style="font-weight: 400;">
                    ${tooltipCorrectionDebugLevel === 0 ? signalText :
                      tooltipCorrectionDebugLevel === 1 ? signalText + (Math.round(signalValue) - Math.round(originalSignalValue) > 1 ? " *" : "") :
                      tooltipCorrectionDebugLevel === 2 ? signalText + (Math.round(signalValue) - Math.round(originalSignalValue) > 1 ? ` (${parseInt(originalSignalValueTooltip)})` : "") :
                      signalText // fallback
                    }
                </span>
            `;

            // Calculate position of circle
            const adjustedSignalValue = signalValue - minSig;
            const circleX = xOffset + (closestPoint.freq - minFreq) * xScale;
            const circleY = canvas.height - (Math.max(0, adjustedSignalValue) * yScale) - 20;

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
            let tooltipY;
            if (!localStorageItem.isAutoBaseline) {
                tooltipY = parseInt(canvas.height - 20 - (Math.max(0, signalValue) - minSig) * yScale); // If below 0 dBf
            } else {
                tooltipY = parseInt(canvas.height - 20 - (signalValue - minSig) * yScale);
            }
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

    // Track mouse movement to distinguish clicks from drags
    let mouseDownPos = null;
    let wasDragging = false;

    function handleClick(event) {
        if (!ENABLE_MOUSE_CLICK_TO_TUNE || !tuningEnabled || !tuningEnabledLocally) return;

        // Prevent frequency selection if is was a drag operation
        if (wasDragging) {
            wasDragging = false;
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Exclude bottom area from frequency selection
        if (mouseY > rect.height - resizeEdge) return;

        // Calculate frequency
        const freq = minFreq + (mouseX - xOffset) / xScale;

        if (freq < minFreq || freq > minFreq + freqRange) return;

        // Send WebSocket command
        const command = `T${Math.round(freq.toFixed(1) * 1000)}`;
        logInfo(`Sending command "${command}"`);
        socket.send(command);
        setTimeout(() => {
            setTimeout(drawGraph, drawGraphDelay);
        }, 40);
    }

    // Function to control frequency via mouse wheel
    function handleWheelScroll(event) {
        if (ENABLE_MOUSE_SCROLL_WHEEL && tuningEnabled && tuningEnabledLocally) {
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
    const throttleDelay = 16.667; // ms

    function updateTooltipThrottled(event) {
        const currentTimeThrottled = performance.now();
        const timeDiffThrottled = currentTimeThrottled - lastTimeThrottled;

        if (timeDiffThrottled >= throttleDelay) {
            lastTimeThrottled = currentTimeThrottled;
            updateTooltip(event);
        }
    }

    // Track mouse events to detect dragging vs clicking
    canvas.addEventListener('mousedown', function(event) {
        mouseDownPos = { x: event.clientX, y: event.clientY };
        wasDragging = false;
    });

    canvas.addEventListener('mousemove', function(event) {
        if (mouseDownPos) {
            const deltaX = Math.abs(event.clientX - mouseDownPos.x);
            const deltaY = Math.abs(event.clientY - mouseDownPos.y);
            if (deltaX > 5 || deltaY > 3) {
                wasDragging = true;
            }
        }
    });

    canvas.addEventListener('mouseup', function(event) {
        mouseDownPos = null;
        // wasDragging flag will be checked and reset in handleClick
    });

    // Use throttled mousemove
    if (window.location.pathname !== '/setup') {
        canvas.addEventListener('mousemove', updateTooltipThrottled);
        canvas.addEventListener('mouseleave', () => {
            tooltip.style.visibility = 'hidden';
            setTimeout(() => {
                setTimeout(drawGraph, drawGraphDelay);
            }, 400);
        });
        canvas.addEventListener('wheel', handleWheelScroll);
        canvas.addEventListener('click', handleClick);
    }

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
if (window.location.pathname !== '/setup') container.appendChild(canvas);

// Get background colour
function getBackgroundColor(element) {
    return window.getComputedStyle(element).backgroundColor;
}

const wrapperOuter = document.querySelector('.wrapper-outer.main-content') || document.querySelector('#wrapper-outer');

document.addEventListener('DOMContentLoaded', function () {
    setTimeout(() => {
        if (wrapperOuter) {
            let currentBackgroundColor = getBackgroundColor(wrapperOuter);
            const observer = new MutationObserver(() => {
                const newColor = getBackgroundColor(wrapperOuter);
                if (newColor !== currentBackgroundColor) {
                    setTimeout(() => {
                        logInfo(`Detected new background colour.`);
                        setTimeout(drawGraph, drawGraphDelay);
                    }, 400);
                }
            });
            const config = { attributes: true };
            observer.observe(wrapperOuter, config);
        } else {
            logWarn('Wrapper element not found!'); // Likely an unrecognised FM-DX Webserver version
        }
    }, 1000);
});

// Action on click on left side of canvas
const clickCanvas = document.getElementById('sdr-graph');

// Update cursor style on mouse move
clickCanvas.addEventListener('mousemove', function(event) {
    const rect = clickCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    const canvasWidth = clickCanvas.width;

    const leftSideThreshold = (signalText === 'dbm' ? 35 : 29);
    const isInBottomArea = clickY > rect.height - resizeEdge;

    // Change cursor based on position
    if (isInBottomArea) {
        clickCanvas.style.cursor = '';
    } else if (clickX <= leftSideThreshold) {
        clickCanvas.style.cursor = 'help'; // Left side of canvas
    } else {
        clickCanvas.style.cursor = 'crosshair'; // Rest of canvas
    }
});

clickCanvas.addEventListener('click', function(event) {
    const rect = clickCanvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const canvasWidth = clickCanvas.width;

    if (clickX <= canvasWidth * 0.025 || clickX <= 26 || (signalText === 'dbm' && clickX <= 34)) {
        const newStorageValue = !localStorageItem.disableNoiseFloorLabel;
        localStorage.setItem('enableSpectrumHideNoiseFloorLabel', newStorageValue.toString());
        localStorageItem.disableNoiseFloorLabel = newStorageValue;
        setTimeout(drawGraph, drawGraphDelay);
    }
});

/* ==================================================
                    USER GRID LINES
   ================================================== */

// Store highlighted vertical grid lines by frequency for right-click
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (xScaleForMarkers === null) return;

    localStorageItem.highlightedFreqs = `enableSpectrumGraphHighlightedFreqs${currentAntenna}`;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (mouseX < xOffset) return;

    let closestKey = null;
    let closestDist = Infinity;

    // Find nearest existing marker
    markedFreqs.forEach(freqStr => {
        const freq = Number(freqStr);
        const x = xOffset + (freq - minFreqForMarkers) * xScaleForMarkers;

        const dist = Math.abs(x - mouseX);
        if (dist < closestDist) {
            closestDist = dist;
            closestKey = freqStr;
        }
    });

    // Remove if close enough
    if (closestDist <= MARKER_TOLERANCE_PX) {
        lastRemovedFreq = closestKey;
        markedFreqs.delete(closestKey);
    } else {
        const freq =
            minFreqForMarkers + (mouseX - xOffset) / xScaleForMarkers;

        markedFreqs.add(freq.toFixed(2));
    }

    setTimeout(drawGraph, drawGraphDelay);

    try {
        localStorage.setItem(localStorageItem.highlightedFreqs, JSON.stringify([...markedFreqs]));
    } catch (err) {
        logError("Failed to save highlighted markers:", err);
    }
});

// Display highlighted vertical grid lines by frequency for right-click
function displayHighlightedFreqs() {
    // Clear all previous markers
    markedFreqs.clear();

    localStorageItem.highlightedFreqs = `enableSpectrumGraphHighlightedFreqs${currentAntenna}`;

    const saved = localStorage.getItem(localStorageItem.highlightedFreqs);
    if (saved) {
        try {
            const arr = JSON.parse(saved);
            if (Array.isArray(arr)) {
                arr.forEach(f => markedFreqs.add(f));
            }
        } catch (err) {
            logWarn("Failed to load highlighted markers:", err);
        }
    }
}

/* ==================================================
                    DRAW GRAPH
   ================================================== */
function drawGraph() {
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Truncate sigArray if any data is invalid
    let prevFreq = -Infinity;
    let truncatedDueToError = false;

    const stopIndex = sigArray.findIndex(point => {
        const freq = Number(point.freq);
        const sig = Number(point.sig);
        if (!Number.isFinite(freq) || !Number.isFinite(sig) || freq < prevFreq) {
            truncatedDueToError = true;
            return true;
        }
        prevFreq = freq;
        return false;
    });

    // Only truncate if an invalid point was found
    if (stopIndex !== -1) {
        sigArray = sigArray.slice(0, stopIndex);
    }

    // Check if sigArray has data
    if (!sigArray || sigArray.length === 0) {
        //logError(`sigArray is empty or not defined`);
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
                logError(`Invalid outline points. Must be an array.`);
                return;
            }

            try {
                localStorage.setItem(`enableSpectrumGraphOutline${currentAntenna}`, JSON.stringify(outlinePoints));
                logInfo(`Graph outline saved for antenna ${currentAntenna}.`);
            } catch (error) {
                logError(`Failed to save graph outline:`, error);
            }

            outlinePointsSavePermission = false;
        }

        // Load saved graph outline
        const savedData = localStorage.getItem(`enableSpectrumGraphOutline${currentAntenna}`);
        if (!savedData) {
            logInfo(`No saved graph outline found.`);
            return;
        }

        try {
            savedOutline = JSON.parse(savedData);
        } catch (error) {
            logError(`Failed to parse saved graph outline:`, error);
            return;
        }

        if (!Array.isArray(savedOutline) || savedOutline.length === 0) {
            logInfo(`Saved graph outline is empty or invalid.`);
            return;
        }

        if (ADJUST_SCALE_TO_OUTLINE) {
            minSigOutline = Math.max(Math.min(...savedOutline.map(p => p.sig)) - dynamicPadding, -1);
            maxSigOutline = Math.min(Math.max(...savedOutline.map(p => p.sig)) + dynamicPadding, canvas.height);
        }
    }

    // Determine min signal value dynamically
    if (localStorageItem.isAutoBaseline) {
        minSig = Number(Math.max(Math.min(...sigArray.map(d => d.sig)) - dynamicPadding, -30).toFixed(3)); // Dynamic vertical graph
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

    // Used for right-click
    minFreqForMarkers = minFreq;
    xScaleForMarkers = xScale;

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
        const x = Math.round(xOffset + (freq - minFreq) * xScale) - 0.5;
        if (freq !== minFreq && freq !== maxFreq) ctx.fillText(freq.toFixed(1), x - 10, height - 5);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        for (let freq = minFreqRounded; freq <= maxFreq; freq += freqStep) {
            const x = Math.round(xOffset + (freq - minFreq) * xScale) - 0.5;

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
        const y = Math.round(height - 20.5 - (sig + 0.01) * yScale) + 0.5;
        if (signalText === 'dbm') {
            // dBm spacing
            let tempDbmSig = ((sig - sigOffset) + minSig).toFixed(0);
            // dBm
            if (sig && tempDbmSig > -100) ctx.fillText(tempDbmSig, ((xOffset - xSigOffset) + 8), y + 3);
            if (sig && tempDbmSig <= -100) ctx.fillText(tempDbmSig, ((xOffset - xSigOffset)) + 1.5, y + 3);
        } else if (signalText === 'dbuv') {
            // dBuV number spacing
            let tempDbuvSig = (((sig - sigOffset) + 1) + minSig).toFixed(0);
            if (tempDbuvSig == -0) tempDbuvSig = 0;
            // dBuV using +1 for even numbering
            if (sig && tempDbuvSig >= 10) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset), y + 3);
            if (sig && tempDbuvSig > 0 && tempDbuvSig < 10) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset) + 6.5, y + 3);
            if (sig && tempDbuvSig == 0) ctx.fillText(tempDbuvSig, (xOffset - xSigOffset) + 6.5, y + 3);
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

    // Draw noise floor signal label
    const disableNoiseFloorLabel = localStorageItem.disableNoiseFloorLabel;
    if (!disableNoiseFloorLabel) {
        let drawLabelMin = (Math.max(Math.min(...sigArray.map(d => d.sig)) - dynamicPadding, -30)).toFixed(1) || 0;
        drawLabelMin = (drawLabelMin - 0.1) - sigOffset;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(localStorageItem.isAutoBaseline ? '--color-5' : '--color-3').trim();
        let yScaleFixed = Math.round(height - 20.5 - (0 + 0.01) * yScale) + 0.5;
        if (signalText === 'dbm') {
            // dBm
            if (drawLabelMin > -100) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 8, yScaleFixed + 3);
            if (drawLabelMin <= -100) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 1.5, yScaleFixed + 3);
        } else if (signalText === 'dbuv') {
            // dBuV
            if (drawLabelMin >= 10) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset), yScaleFixed + 3);
            if (drawLabelMin > 0 && drawLabelMin < 10) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 6.5, yScaleFixed + 3);
            if (drawLabelMin == 0) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 5.5, yScaleFixed + 3);
            if (drawLabelMin < 0 && drawLabelMin > -10) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 1.5, yScaleFixed + 3);
            if (drawLabelMin <= -10) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) - 5.5, yScaleFixed + 3);
        } else if (signalText === 'dbf') {
            // dBf
            if (drawLabelMin >= 10) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset), yScaleFixed + 3);
            if (drawLabelMin > 0 && drawLabelMin < 10) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 6.5, yScaleFixed + 3);
            if (drawLabelMin == 0) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 5.5, yScaleFixed + 3);
            if (drawLabelMin < 0) ctx.fillText(parseInt(drawLabelMin), (xOffset - xSigOffset) + 1.5, yScaleFixed + 3);
        }
    }

    // Draw dotted grid lines (horizontal)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([1, 2]); // Dotted lines
    ctx.beginPath(); // Start a new path for all horizontal lines

    for (let sig of labels) {
        const y = Math.round(height - 20 - (sig - 0.001) * yScale) - 0.5;
        ctx.moveTo(xOffset, y);
        ctx.lineTo(width, y);
    }

    // Draw all lines in one stroke call to prevent overlaps
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    for (let sig = 0; sig <= (maxSig + 0.001); sig += sigLabelStep) {
        const y = Math.round(height - 20 - (sig - 0.001) * yScale) - 0.5; // Calculate vertical position

        // Draw tick mark only if it's not the first or last value
        if (sig !== 0) {
            ctx.beginPath();
            ctx.moveTo(xOffset - 2, y); // Start just to the left of the axis
            ctx.lineTo(xOffset, y); // Extend slightly outwards
            ctx.stroke();
        }
    }

    // Fill graph area
    const gradient = ctx.createLinearGradient(0, height - 20, 0, 0);

    // Add colour stops
    switch (SPECTRUM_COLOR_STYLE) {

        // Default
        // Evenly spaced UI gradient
        // General-purpose spectrum, not RF-accurate
        case "DEFAULT":
            gradient.addColorStop(0.0,  "#0030E0"); // Blue
            gradient.addColorStop(0.25, "#18CC38"); // Green
            gradient.addColorStop(0.5,  "#C8D800"); // Yellow
            gradient.addColorStop(0.75, "#FF1000"); // Red
            break;

        // Accurate4
        // Perceptually closer to visible-spectrum spacing using 4 colours
        // Red reserved for peak values only
        case "ACCURATE_4":
            gradient.addColorStop(0.0,  "#0030E0"); // Blue
            gradient.addColorStop(0.38, "#11C838"); // Green
            gradient.addColorStop(0.62, "#C0D000"); // Yellow
            gradient.addColorStop(0.95, "#FF0400"); // Red
            gradient.addColorStop(1.0,  "#FF0400"); // Red
            break;

        // Accurate7
        // Full visible-light style spectrum
        // Best for demonstration displays
        case "ACCURATE_7":
            gradient.addColorStop(0.0,  "#2A00FF"); // Violet
            gradient.addColorStop(0.17, "#005BFF"); // Blue
            gradient.addColorStop(0.33, "#00FFEA"); // Cyan
            gradient.addColorStop(0.5,  "#00FF00"); // Green
            gradient.addColorStop(0.67, "#FFFF00"); // Yellow
            gradient.addColorStop(0.83, "#FF7A00"); // Orange
            gradient.addColorStop(0.95, "#FF0000"); // Red
            gradient.addColorStop(1.0,  "#FF0000"); // Red
            break;

        // Balanced
        // Perceptually balanced for RF spectrum reading
        // Red represents a range, not a single max point
        case "BALANCED":
            gradient.addColorStop(0.0,  "#0030E0"); // Blue
            gradient.addColorStop(0.3,  "#11C838"); // Green
            gradient.addColorStop(0.55, "#C1D000"); // Yellow
            gradient.addColorStop(0.85, "#FF0400"); // Red
            gradient.addColorStop(1.0,  "#FF0400"); // Red
            break;

        // Warm top
        // Emphasizes strong signals and dense RF regions
        // Aggressively highlights strong FM carriers and dense regions
        case "WARM_TOP":
            gradient.addColorStop(0.0,  "#0030E0"); // Blue
            gradient.addColorStop(0.2,  "#10C838"); // Green
            gradient.addColorStop(0.45, "#C0D000"); // Yellow
            gradient.addColorStop(0.6,  "#FF0310"); // Red
            gradient.addColorStop(1.0,  "#FF0310"); // Red
            break;

        // Smooth
        // Same colours as Default, but with softened transitions
        // Red occupies a range for RF realism
        case "SMOOTH":
            gradient.addColorStop(0.0,  "#0030E0"); // Blue
            gradient.addColorStop(0.32, "#10C838"); // Green
            gradient.addColorStop(0.45, "#10C838"); // Green
            gradient.addColorStop(0.6,  "#C0D000"); // Yellow
            gradient.addColorStop(0.75, "#C0D000"); // Yellow
            gradient.addColorStop(0.9,  "#FF0400"); // Red
            gradient.addColorStop(1.0,  "#FF0400"); // Red
            break;
    }

    // Set fill style and draw a rectangle
    ctx.fillStyle = gradient;

    // Draw graph with smoothed points
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xOffset, height - 20); // Start from bottom-left corner

    // Reset screen reader variables
    let ariaLabelMin = (Math.max(Math.min(...sigArray.map(d => d.sig)) - dynamicPadding, -30)).toFixed(1) || 0;
    let ariaLabelStationCount = 0;

    // Draw graph line
    sigArray.forEach((point, index) => {
        const x = xOffset + (point.freq - minFreq) * xScale;
        let y;
        if (!localStorageItem.isAutoBaseline && point.sig < 0) {
            y = Math.round(height - (0 - minSig) * yScale); // If below 0 dBf
        } else {
            y = Math.round(height - (point.sig - minSig) * yScale);
        }
        if (index === 0) {
            ctx.lineTo(x, y - 20);
        } else {
            ctx.lineTo(x, y - 20);
            if ((point.sig - ariaLabelMin) > 15) ariaLabelStationCount++;
        }
    });

    // For screen readers
    const sdrGraph = document.querySelector('.canvas-container');
    if (sdrGraph) sdrGraph.setAttribute('role', 'img');
    if (sdrGraph) sdrGraph.setAttribute('aria-label', `Signal graph showing ${parseInt(ariaLabelStationCount / 3)} possibly detected stations across the frequency spectrum from ${minFreq} to ${maxFreq} MHz`);

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
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([1, 2]); // Dotted lines

    // Vertical grid lines (for each frequency step)
    for (let freq = minFreqRounded; freq.toFixed(2) <= maxFreq; freq += freqStep) {
        const x = Math.round(xOffset + (freq - minFreq) * xScale) - 0.5;
        if (freq !== minFreq) {
            ctx.beginPath();
            ctx.moveTo(x, 9.5);
            ctx.lineTo(x, height - 20);
            ctx.stroke();
        }
    }

    // Draw user-defined highlighted vertical grid lines when using right-click
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(224, 224, 224, 0.5)';

    markedFreqs.forEach(freqStr => {
        const freq = Number(freqStr);

        // Skip frequencies outside the visible range
        if (freq < minFreq || freq > maxFreq) return;

        const x = Math.round(xOffset + (freq - minFreq) * xScale) - 0.5;

        ctx.beginPath();
        ctx.moveTo(x, 9.5);
        ctx.lineTo(x, height - 20);
        ctx.stroke();
    });

    ctx.setLineDash([1, 2]); // Revert back to dotted lines

    // Scanner plugin code by Highpoint2000
    if (ScannerIsScanning) {
        if (ScannerSpectrumLimiterValue !== 100 && ScannerSpectrumLimiterValue !== 0 && (ScannerMode === 'spectrum' || ScannerMode === 'spectrumBL' || ScannerMode === 'difference' || ScannerMode === 'differenceBL')) {
            if (ScannerModeTemp !== ScannerMode) {
                ScannerModeTemp = ScannerMode;
                logInfo(`Scanner plugin mode changed to '${ScannerMode}'`);
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
            ctx.fillStyle = 'rgba(232, 64, 4, 1.0)';
            ctx.font = '12px Arial, Titillium Web, Helvetica';
            ctx.textAlign = 'left';
            ctx.filter = 'drop-shadow(0.25px 0.25px 0px rgba(0, 0, 0, 0.5))';
            let ScannerSpectrumLimiterValueOffset = 0;
            if (ScannerSpectrumLimiterValue && ScannerSensitivity && ScannerSpectrumLimiterValue - ScannerSensitivity > 5 && ScannerSpectrumLimiterValue - ScannerSensitivity < 20) ScannerSpectrumLimiterValueOffset = 50;
            ctx.fillText(`${Math.round(Number(ScannerSpectrumLimiterValue.toFixed(1)) - sigOffset)} ${sigDesc}`, xOffset + (5 + ScannerSpectrumLimiterValueOffset), yPositionLimiterValue + 15);
            ctx.filter = 'none';
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
            ctx.fillStyle = 'rgba(60, 104, 248, 1.0)';
            ctx.font = '12px Arial, Titillium Web, Helvetica';
            ctx.textAlign = 'left';
            ctx.filter = 'drop-shadow(0.25px 0.25px 0px rgba(0, 0, 0, 0.5))';
            ctx.fillText(`${Math.round(Number(ScannerSensitivity.toFixed(1)) - sigOffset)} ${sigDesc}`, xOffset + 5, yPositionScannerSensitivityValue - 5);
            ctx.filter = 'none';
        }
    } // **

    // Draw graph line
    let leftX, rightX;
    sigArray.forEach((point, index) => {
        const x = xOffset + (point.freq - minFreq) * xScale;
        let y;
        if (!localStorageItem.isAutoBaseline && point.sig < 0) {
            y = height - 20 - 0 * yScale; // If below 0 dBf
        } else {
            y = height - 20 - point.sig * yScale;
        }
    });

    // Draw current frequency line
    const highlightFreq = Number(dataFrequencyValue);
    // Only draw if the frequency is within or near the graph range
    if (highlightFreq >= minFreq - 0.1 && highlightFreq <= maxFreq + 0.1) {
        // Calculate the x-coordinates for the white vertical line
        let highlightBandwidthLow = 0.1;
        let highlightBandwidthHigh = 0.1;

        // Adjust bandwidth if at the edge
        if (highlightFreq < minFreq) {
            highlightBandwidthLow = 0.0;
            highlightBandwidthHigh = 0.1;
        }

        // Left and right X calculations for the highlight region
        leftX = xOffset + (highlightFreq - highlightBandwidthLow - minFreq) * xScale;
        rightX = xOffset + (highlightFreq + highlightBandwidthHigh - minFreq) * xScale;

        // Ensure that leftX doesn't overflow to the left
        leftX = Math.max(leftX, xOffset);  // Prevent going past the left edge

        // Ensure that rightX doesn't overflow past the right edge
        rightX = Math.min(rightX, xOffset + (maxFreq - minFreq) * xScale);  // Prevent going past the right edge
    } else {
        // Don't draw if frequency is completely out of range
        leftX = undefined;
        rightX = undefined;
    }

    // Set style for white line
    ctx.fillStyle = 'rgba(224, 224, 240, 0.3)';

    // Draw vertical highlight region
    if (leftX !== undefined && rightX !== undefined) {
        ctx.fillRect(leftX, 9, rightX - leftX, height - 29); // From top to bottom of graph
    }

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
    ctx.moveTo((xOffset - 0.5), 9); // Y-axis
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

            // Skip points outside the visible frequency range
            if (point.freq < minFreq || point.freq > maxFreq) continue;

            const x = Math.round(xOffset + (point.freq - minFreq) * xScale);
            let y = Math.round(canvas.height - (point.sig - minSig) * yScale);

            // Clamp y value if it's below the graph
            if (!ADJUST_SCALE_TO_OUTLINE) y = Math.max(0, Math.min(canvas.height, y));

            if (!localStorageItem.isAutoBaseline && point.sig < 0) y = Math.max(0, Math.min(canvas.height, y)); // If below 0 dBf

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

    if (!isUpdating) {
        if (!graphError && isLastUpdateOutdated) {
            isLastUpdateOutdated = false;
            const msg = createdOutdatedNotice();
            insertUpdateText(msg, 8, undefined, undefined, undefined, !ScannerIsScanning);
        }

        if (!graphError && truncatedDueToError) {
            truncatedDueToError = false;
            insertUpdateText(getTranslatedText('spectrumScanInvalid'));
        }

        if (!graphError && !isScanComplete) {
            insertUpdateText(getTranslatedText('spectrumScanIncomplete'));
        }

        if (graphError) {
            graphError = false;
            dataError = false;
            insertUpdateText(getTranslatedText('errorDuringInitialisation'));
        } else if (!graphError && dataError) {
            dataError = false;
            graphError = false;
            if (sigArray?.length < 8) insertUpdateText(getTranslatedText('noSignal'));
        }
    }

    isScanComplete = true;

    return updateBounds(xScale, minFreq, freqRange, yScale);
}

const updateBounds = initializeCanvasInteractions();

})();
