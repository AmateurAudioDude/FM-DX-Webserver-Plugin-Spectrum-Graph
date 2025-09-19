# Spectrum Graph plugin for FM-DX Webserver

This plugin scans the FM radio band in under 1.5 seconds, then displayed in a spectrum window.

![spectrum_graph](https://github.com/user-attachments/assets/e1383c27-2e29-4231-b8d3-a9d70c469944)

## Instructions

* [Download the latest zip file](https://github.com/AmateurAudioDude/FM-DX-Webserver-Plugin-Spectrum-Graph/archive/refs/heads/main.zip)
* Extract `SpectrumGraph` folder, and `SpectrumGraph.js` to **FM-DX Webserver** `plugins` folder
* Restart **FM-DX Webserver** if required
* Login to **Adminstrator Panel** and enable plugin
* Restart **FM-DX Webserver** again if required
* Server-side configuration options stored in `/plugins_configs/SpectrumGraph.json`
* Client-side configuration options located in `pluginSpectrumGraph.js`

> [!IMPORTANT]
> For full compatibility, **TEF668X radio** requires **TEF6686_ESP32 v2.20** or newer firmware, available from the FMDX.org Discord server, [PE5PVB's GitHub](https://github.com/PE5PVB/TEF6686_ESP32), or alternatively, download my latest personal fork [here](https://github.com/AmateurAudioDude/TEF6686_ESP32). It is strongly recommended that radios with older firmware be upgraded for optimal performance.

## SpectrumGraph.json
 
- **`rescanDelay`**: Number of seconds elapsed since the previous scan before a new scan can be initiated.   
- **`tuningRange`**: Side frequencies to scan, in MHz. A value of 0 scans the entire FM/OIRT band.   
- **`tuningStepSize`**: Tuning step size, in kHz. Recommended values are either 100 or 50.   
- **`tuningBandwidth`**: Supported bandwidth values are 0, 56, 64, 72, 84, 97, 114, 133, 151, 168, 184, 200, 217, 236, 254, 287, and 311.   
- **`warnIncompleteData`**: Enable to display console warnings about incomplete/interrupted scans. Note: Some firmware outputs data that always appears to be incomplete.
- **`logLocalCommands`**: Disable to hide commands shown in console that have been sent locally, such as from another plugin.   

> [!TIP]
> The granular control by **`tuningStepSize`** allows the graph's step size to be adjusted from 100 kHz to 50 kHz, enabling more precise RF signal analysis. This will, however, increase the time it takes to perform a scan.

> [!CAUTION]
> Lowering the value of **`rescanDelay`** increases the risk of your server being overloaded with scan requests.

### Known issues
* The plugin currently doesn't function if tuning is locked.

v1.2.6
------
* Added noise floor value to bottom-left corner of graph (click to show/hide)
* Added notice for incomplete scans and initialisation errors
* Improved `aria-label` attributes
* Improved handling of blocking scan attempts below 64 MHz
* Improved handling of Signal Meter plugin integration
* Minor visual changes
* Minor 'Move Above Signal Graph' fixes

v1.2.5
------
* Fixed blurry gridlines
* Fixed displaying values below 0 dBf
* Added button to show spectrum graph above signal graph if screen space allows
* Fix for FM-DX Webserver v1.3.7 compatibility issue
* Minor fixes

v1.2.4
------
* Spectrum Graph matches canvas container size

v1.2.3
------
* Minor visual improvements and fixes

v1.2.2
------
* Minor fixes

v1.2.1
------
* Fixed compatibility issues with FM-DX Webserver v1.3.5
* Added visual animation effects
* Minor fixes

v1.2.0
------
* Added 'Hold' button
* Implementation of Scanner plugin code by Highpoint
* Minor visual fixes and changes

v1.1.7
------
* Added `SpectrumGraph.json` option to display incomplete/invalid data
* Changed handling of incomplete data

v1.1.6
------
* Added mouse click to tune option
* Relocated JSON data to reduce FM-DX Webserver excessive data usage

v1.1.5
------
* Slight graph height increase
* Graph width adjusts dynamically
* Fixed graph not loading on page load for servers using a subpath

v1.1.4
------
* Added 'Auto Baseline' button
* Repositioned graph peak
* Reduced browser CPU usage on mouse movement

v1.1.3
------
* Added frequency marker decimal round off setting
* Fixed signal unit not being displayed in some cases
* Minor visual tweaks

v1.1.2
------
* Added bandwidth setting
* Backend TEF module/radio firmware detection for bandwidth setting
* Improved startup antenna sequence
* Minor bug fixes

v1.1.1
------
* Improved handling of incomplete scans
* Minor visual improvements

v1.1.0
------
* Individual band scans stored for each antenna
* Signal unit matches user preference
* Missing options in `SpectrumGraph.json` are automatically added
* Fixed backend code that was sending commands multiple times

v1.0.0
------
* Official release

<details>
  <summary>BETA history</summary>

v1.0.0b10
------
* Added tooltips
* Backend code improvements

v1.0.0b9
--------
* Fixed webpage movement while using mouse scroll wheel
* Fixed tooltip element alignment

v1.0.0b8
--------
* Added fixed/dynamic vertical graph button
* Added ability to use mouse scroll wheel to tune
* Fixed tooltip causing scrollbars

v1.0.0b7
--------
* Added user configurable graph smoothing option
* Added retry delay option to configuration
* Added check for update option
* Configured plugin to not open while signal graph is hidden
* Minor visual fixes

v1.0.0b6
--------
* Added configuration file
* Visual improvements and fixes

v1.0.0b5
--------
* Create graph on page load if data exists
* Minor fixes

v1.0.0b4
--------
* Fixed slight flicker that might occur

v1.0.0b3
--------
* Added configurable graph smoothing option

v1.0.0b2
--------
* Graph output fix for TEF radio firmware

v1.0.0b1
--------
* First beta release

</details>
